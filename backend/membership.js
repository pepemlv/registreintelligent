import express from 'express';
import admin from 'firebase-admin';
import Stripe from 'stripe';

/**
 * SPS Bill Benefit membership, paid with Stripe subscriptions.
 *
 * - POST /api/billing/membership/checkout  → Stripe Checkout URL for the signed-in member:
 *     { autoPay: true }  (default) monthly subscription charged automatically
 *     { autoPay: false } one-time $10 payment for the next unpaid month
 *     { embedded: true }  Stripe Embedded Checkout shown inside the app → returns { clientSecret }
 *                         (otherwise a hosted Checkout page → returns { url })
 * - POST /api/billing/membership/portal    → Stripe customer portal URL (update card, invoices)
 * - GET  /api/billing/config               → Stripe publishable key for the in-app payment form
 * - POST /api/billing/membership/intent    → client secret for the app's own payment form (Stripe Elements):
 *     { autoPay: true }  incomplete monthly subscription, confirmed by the form (first invoice's PaymentIntent,
 *                        or a SetupIntent when the first charge is deferred to next month)
 *     { autoPay: false } PaymentIntent for one month, recorded by the payment_intent.succeeded webhook
 * - GET  /api/billing/membership/status    → auto pay, next payment date, card on file
 * - POST /api/billing/membership/cancel    → stop auto pay; membership ends at the end of the paid period
 * - POST /api/billing/membership/resume    → undo a pending cancellation
 * - POST /api/stripe/webhook               → Stripe events; the only place paid months are recorded
 *
 * Everything the app shows is saved in Firestore by this module, so the app never waits on Stripe:
 * - profile.bill_benefit   { status, started_at, canceled_at, anchor_date, cycle_start,
 *                            payments: [{ period_start, month, amount, paid_at, stripe_invoice_id }], claims }
 *   Membership periods run one month from the day of the first payment (anchor_date): Oct 9 → Nov 9 → Dec 9…
 * - profile.stripe_billing { status, auto_pay, cancel_at_period_end, current_period_end, amount, card: { brand, last4, exp_month, exp_year },
 *                            last_payment: { amount, month, paid_at, status }, updated_at }
 * - membership_payments/{stripe id}  one document per payment attempt (paid or failed), readable by its owner
 */

const secretKey = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_TEST || '';
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
const priceId = process.env.STRIPE_MEMBERSHIP_PRICE_ID || '';
const monthlyFeeCents = Number(process.env.MEMBERSHIP_MONTHLY_FEE_CENTS || 1000);

const stripe = secretKey ? new Stripe(secretKey) : null;

if (!stripe) console.warn('Stripe is not configured (STRIPE_SECRET_KEY): membership payments are disabled.');
else if (!webhookSecret) console.warn('STRIPE_WEBHOOK_SECRET is missing: paid months will not be recorded.');

/** "YYYY-MM-DD" (UTC). */
function dateKey(date) {
  return date.toISOString().slice(0, 10);
}

function parseDateKey(key) {
  const [year, month, day] = key.slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day || 1));
}

/** Same day `count` months later, clamped to the month's last day (Jan 31 + 1 → Feb 28). */
function addMonthsToDate(key, count) {
  const base = parseDateKey(key);
  const target = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + count, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(base.getUTCDate(), lastDay));
  return dateKey(target);
}

function periodStart(anchor, index) {
  return addMonthsToDate(anchor, index);
}

function periodIndexAt(anchor, key) {
  if (key < anchor) return -1;
  const a = parseDateKey(anchor);
  const k = parseDateKey(key);
  let index = (k.getUTCFullYear() - a.getUTCFullYear()) * 12 + (k.getUTCMonth() - a.getUTCMonth());
  while (index > 0 && periodStart(anchor, index) > key) index -= 1;
  while (periodStart(anchor, index + 1) <= key) index += 1;
  return Math.max(0, index);
}

function emptyMembership() {
  return { status: 'none', started_at: null, canceled_at: null, anchor_date: null, cycle_start: null, payments: [], claims: [] };
}

/** Normalises bill_benefit; older per-calendar-month data is anchored on its first payment's date. */
function normalize(raw) {
  const value = raw && typeof raw === 'object' ? raw : {};
  const rawPayments = Array.isArray(value.payments) ? value.payments.filter((p) => p && (p.period_start || p.month)) : [];
  const byPaidDate = [...rawPayments].sort((a, b) => String(a.paid_at).localeCompare(String(b.paid_at)));
  const anchor = value.anchor_date || (byPaidDate[0]?.paid_at ? dateKey(new Date(byPaidDate[0].paid_at)) : null);
  const used = new Set(rawPayments.map((p) => p.period_start).filter(Boolean));
  let legacyIndex = 0;
  const payments = byPaidDate.map((p) => {
    let start = p.period_start;
    if (!start && anchor) {
      while (used.has(periodStart(anchor, legacyIndex))) legacyIndex += 1;
      start = periodStart(anchor, legacyIndex);
      used.add(start);
    }
    start ??= dateKey(new Date(p.paid_at ?? Date.now()));
    return { ...p, period_start: start, month: start.slice(0, 7) };
  });
  const { cycle_start_month: _legacyCycle, ...rest } = value;
  return {
    ...emptyMembership(),
    ...rest,
    anchor_date: anchor,
    cycle_start: value.cycle_start || anchor,
    payments,
    claims: Array.isArray(value.claims) ? value.claims : [],
  };
}

/** Period the next payment covers: starts today for a first payment, else the first unpaid period from now. */
function nextPayablePeriod(membership, now = new Date()) {
  const today = dateKey(now);
  if (!membership.anchor_date) return today;
  const paid = new Set(membership.payments.map((payment) => payment.period_start));
  let index = periodIndexAt(membership.anchor_date, today);
  while (paid.has(periodStart(membership.anchor_date, index)) && index < 1200) index += 1;
  return periodStart(membership.anchor_date, index);
}

/** When auto pay starts while the current period is already paid: Unix time of the next period, else null (charge now). */
function autoPayStart(membership, now = new Date()) {
  if (!membership.anchor_date) return null;
  const next = nextPayablePeriod(membership, now);
  return next > dateKey(now) ? periodTimestamp(next) : null;
}

/** Unix time (noon UTC) of a period start, for Stripe's billing anchor. */
function periodTimestamp(key) {
  return Math.floor(Date.parse(`${key}T12:00:00Z`) / 1000);
}

async function findProfileByOwner(uid) {
  const snapshot = await admin.firestore().collection('profiles').where('owner_id', '==', uid).limit(1).get();
  return snapshot.empty ? null : snapshot.docs[0];
}

async function findProfileByCustomer(customerId) {
  const snapshot = await admin.firestore().collection('profiles').where('stripe_customer_id', '==', customerId).limit(1).get();
  return snapshot.empty ? null : snapshot.docs[0];
}

/** Profile for a Stripe object: by the uid we put in metadata, else by the stored customer id. */
async function resolveProfile({ uid, customerId }) {
  if (uid) {
    const byOwner = await findProfileByOwner(uid);
    if (byOwner) return byOwner;
  }
  return customerId ? findProfileByCustomer(customerId) : null;
}

async function updateMembership(profileRef, update) {
  await admin.firestore().runTransaction(async (tx) => {
    const snapshot = await tx.get(profileRef);
    const current = normalize(snapshot.data()?.bill_benefit);
    const { membership, extra } = update(current);
    tx.update(profileRef, { bill_benefit: membership, ...(extra ?? {}) });
  });
}

/** Only redirect back to origins this backend already trusts. */
function returnBase(req, isAllowedOrigin) {
  const origin = req.headers.origin;
  if (origin && isAllowedOrigin(origin)) return origin.replace(/\/+$/, '');
  return (process.env.APP_URL || 'http://localhost:5173').replace(/\/+$/, '');
}

/**
 * Stripe failures (bad key, account not activated, unknown customer…) would otherwise reach the
 * generic error handler as an opaque 500. Send Stripe's own explanation instead.
 */
function stripeFailure(res, next, error) {
  if (!error?.type?.startsWith?.('Stripe')) return next(error);
  console.error('Stripe error', error.type, error.code, error.message);
  const message = error.type === 'StripeAuthenticationError'
    ? 'Online payment is misconfigured on the server (invalid Stripe key). Please contact SPS support.'
    : `Payment provider error: ${error.message}`;
  return res.status(502).json({ error: message });
}

/** Stored Stripe customer, recreated if it no longer exists (deleted, or saved under the other test/live mode). */
async function ensureCustomer(profile, user) {
  const data = profile.data();
  if (data.stripe_customer_id) {
    try {
      const existing = await stripe.customers.retrieve(data.stripe_customer_id);
      if (!existing.deleted) return existing.id;
    } catch (error) {
      if (error?.code !== 'resource_missing') throw error;
    }
  }
  const customer = await stripe.customers.create({
    email: user.email || data.email || undefined,
    name: data.full_name || undefined,
    metadata: { uid: user.uid, profile_id: profile.id },
  });
  await profile.ref.update({ stripe_customer_id: customer.id, stripe_subscription_id: null, stripe_subscription_status: null });
  return customer.id;
}

let cachedProductId = null;
/** Stripe product for the membership (found by metadata, created once). */
async function membershipProductId() {
  if (cachedProductId) return cachedProductId;
  const found = await stripe.products.search({ query: "metadata['sps']:'bill_benefit_membership'" }).catch(() => ({ data: [] }));
  cachedProductId = found.data[0]?.id
    ?? (await stripe.products.create({ name: 'SPS Bill Benefit membership', metadata: { sps: 'bill_benefit_membership' } })).id;
  return cachedProductId;
}

/** Subscription statuses where auto pay is actually charging (incomplete ones are abandoned forms). */
const LIVE_SUBSCRIPTION_STATUSES = new Set(['active', 'trialing', 'past_due']);

function requireStripe(res) {
  if (stripe) return true;
  res.status(503).json({ error: 'Membership payments are not available right now.' });
  return false;
}

/**
 * Records a payment (idempotent per Stripe reference) and activates the membership. The first payment
 * sets the anchor: periods then run one month from that day. `period` is the period the payment was
 * prepared for; if it was paid meanwhile, the next unpaid period is used. Returns the period covered.
 */
async function recordPayment(profileRef, { period, amount, paidAt, reference }) {
  let covered = null;
  await updateMembership(profileRef, (current) => {
    const existing = current.payments.find((payment) => payment.stripe_invoice_id === reference);
    if (existing) {
      covered = existing.period_start;
      return { membership: current };
    }
    const paidDate = new Date(paidAt);
    const anchor = current.anchor_date ?? dateKey(paidDate);
    const withAnchor = { ...current, anchor_date: anchor, cycle_start: current.cycle_start ?? anchor };
    const taken = new Set(current.payments.map((payment) => payment.period_start));
    const start = !current.anchor_date ? anchor : period && !taken.has(period) && period >= anchor ? period : nextPayablePeriod(withAnchor, paidDate);
    covered = start;
    return {
      membership: {
        ...withAnchor,
        status: 'active',
        started_at: current.started_at ?? paidAt,
        canceled_at: null,
        payments: [...current.payments, { period_start: start, month: start.slice(0, 7), amount, paid_at: paidAt, stripe_invoice_id: reference }]
          .sort((a, b) => String(a.period_start).localeCompare(String(b.period_start))),
      },
    };
  });
  return covered;
}

/**
 * Events from an older subscription (e.g. a payment form opened but never completed, which Stripe
 * expires later) must not overwrite the member's current, paying subscription.
 */
function supersededSubscription(profileData, subscription) {
  const storedId = profileData.stripe_subscription_id;
  return Boolean(storedId) && storedId !== subscription.id && LIVE_SUBSCRIPTION_STATUSES.has(profileData.stripe_subscription_status);
}

function iso(seconds) {
  return seconds ? new Date(seconds * 1000).toISOString() : null;
}

function cardInfo(card) {
  return card ? { brand: card.brand, last4: card.last4, exp_month: card.exp_month, exp_year: card.exp_year } : null;
}

/** Card used and receipt link for a PaymentIntent (best effort: the payment is saved even without them). */
async function chargeDetails(paymentIntentId) {
  if (!paymentIntentId) return { card: null, receiptUrl: null };
  try {
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId, { expand: ['latest_charge'] });
    const charge = intent.latest_charge;
    return { card: cardInfo(charge?.payment_method_details?.card), receiptUrl: charge?.receipt_url ?? null };
  } catch (error) {
    console.warn('Could not read payment details', paymentIntentId, error.message);
    return { card: null, receiptUrl: null };
  }
}

async function paymentMethodCard(paymentMethod) {
  if (!paymentMethod) return null;
  if (typeof paymentMethod === 'object') return cardInfo(paymentMethod.card);
  try {
    return cardInfo((await stripe.paymentMethods.retrieve(paymentMethod)).card);
  } catch {
    return null;
  }
}

/**
 * Saves one payment in membership_payments (document id = Stripe id, so retries never duplicate)
 * and the "last payment" / card summary on the profile.
 */
async function savePaymentRecord(profile, payment) {
  const data = profile.data();
  const now = new Date().toISOString();
  await admin.firestore().collection('membership_payments').doc(payment.id).set({
    owner_id: data.owner_id ?? null,
    profile_id: profile.id,
    company_id: data.company_id ?? null,
    period_start: payment.period ?? null,
    month: payment.period ? payment.period.slice(0, 7) : null,
    amount: payment.amount,
    currency: 'usd',
    type: payment.type,
    status: payment.status,
    card_brand: payment.card?.brand ?? null,
    card_last4: payment.card?.last4 ?? null,
    receipt_url: payment.receiptUrl ?? null,
    failure_reason: payment.failureReason ?? null,
    stripe_invoice_id: payment.invoiceId ?? null,
    stripe_payment_intent_id: payment.paymentIntentId ?? null,
    stripe_subscription_id: payment.subscriptionId ?? null,
    paid_at: payment.status === 'paid' ? payment.paidAt : null,
    created_at: payment.paidAt ?? now,
    updated_at: now,
  }, { merge: true });
  await profile.ref.set({
    stripe_billing: {
      last_payment: { amount: payment.amount, period_start: payment.period ?? null, paid_at: payment.paidAt ?? now, status: payment.status },
      ...(payment.card ? { card: payment.card } : {}),
      updated_at: now,
    },
  }, { merge: true });
}

/** Mirrors a subscription on the profile: flat fields (used by the server) + stripe_billing summary (read by the app). */
async function syncSubscription(profileRef, subscription, extra = {}) {
  const card = await paymentMethodCard(subscription.default_payment_method);
  const live = LIVE_SUBSCRIPTION_STATUSES.has(subscription.status);
  await profileRef.set({
    ...subscriptionFields(subscription),
    ...extra,
    stripe_billing: {
      status: subscription.status,
      auto_pay: live && !subscription.cancel_at_period_end,
      cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
      current_period_end: iso(subscription.current_period_end),
      amount: (subscription.items?.data?.[0]?.price?.unit_amount ?? monthlyFeeCents) / 100,
      ...(card ? { card } : {}),
      updated_at: new Date().toISOString(),
    },
  }, { merge: true });
}

/** Subscription fields mirrored on the profile (read-only for the app). */
function subscriptionFields(subscription) {
  return {
    stripe_subscription_id: subscription.id,
    stripe_subscription_status: subscription.status,
    stripe_cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
    stripe_current_period_end: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null,
  };
}

/* ------------------------------------------------------------------ */
/* Webhook (must be registered before express.json)                    */
/* ------------------------------------------------------------------ */

export function registerStripeWebhook(app) {
  app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    if (!stripe || !webhookSecret) return res.status(503).send('Stripe webhook is not configured.');

    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], webhookSecret);
    } catch (error) {
      return res.status(400).send(`Webhook signature verification failed: ${error.message}`);
    }

    try {
      await handleEvent(event);
      return res.json({ received: true });
    } catch (error) {
      console.error('Stripe webhook handling failed', event.type, error);
      // 500 makes Stripe retry the event later.
      return res.status(500).send('Webhook handling failed.');
    }
  });
}

async function handleEvent(event) {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      if (session.mode === 'payment' && (session.metadata?.membership_period || session.metadata?.membership_month)) {
        if (session.payment_status !== 'paid') return;
        const payer = await resolveProfile({ uid: session.client_reference_id || session.metadata?.uid, customerId: session.customer });
        if (!payer) return;
        const paidAt = iso(session.created) ?? new Date().toISOString();
        const amount = (session.amount_total ?? monthlyFeeCents) / 100;
        const covered = await recordPayment(payer.ref, { period: session.metadata.membership_period, amount, paidAt, reference: session.payment_intent || session.id });
        const details = await chargeDetails(session.payment_intent);
        await savePaymentRecord(payer, {
          id: session.payment_intent || session.id, type: 'one_time', status: 'paid', period: covered,
          amount, paidAt, paymentIntentId: session.payment_intent, ...details,
        });
        return;
      }
      if (session.mode !== 'subscription') return;
      const profile = await resolveProfile({ uid: session.client_reference_id || session.metadata?.uid, customerId: session.customer });
      if (!profile) return;
      const now = new Date();
      await updateMembership(profile.ref, (current) => ({
        // The anchor (first payment day) is set when the first invoice is recorded.
        membership: current.status === 'active' ? current : { ...current, status: 'active', started_at: now.toISOString(), canceled_at: null },
        extra: { stripe_customer_id: session.customer, stripe_subscription_id: session.subscription },
      }));
      return;
    }

    case 'payment_intent.succeeded': {
      const intent = event.data.object;
      // Subscription invoices are recorded by invoice.paid; this handles one-time membership payments.
      if (intent.metadata?.kind !== 'membership_one_time') return;
      const payer = await resolveProfile({ uid: intent.metadata.uid, customerId: intent.customer });
      if (!payer) return;
      const paidAt = iso(intent.created);
      const amount = intent.amount_received / 100;
      const covered = await recordPayment(payer.ref, { period: intent.metadata.membership_period, amount, paidAt, reference: intent.id });
      await savePaymentRecord(payer, {
        id: intent.id, type: 'one_time', status: 'paid', period: covered, amount, paidAt,
        paymentIntentId: intent.id, ...(await chargeDetails(intent.id)),
      });
      return;
    }

    case 'payment_intent.payment_failed': {
      const intent = event.data.object;
      if (intent.metadata?.kind !== 'membership_one_time') return;
      const payer = await resolveProfile({ uid: intent.metadata.uid, customerId: intent.customer });
      if (!payer) return;
      await savePaymentRecord(payer, {
        id: intent.id, type: 'one_time', status: 'failed', period: intent.metadata.membership_period ?? null, amount: intent.amount / 100,
        paidAt: iso(intent.created), paymentIntentId: intent.id, card: cardInfo(intent.last_payment_error?.payment_method?.card),
        failureReason: intent.last_payment_error?.message ?? null,
      });
      return;
    }

    case 'invoice.paid': {
      const invoice = event.data.object;
      if (!invoice.subscription || !invoice.amount_paid) return;
      const profile = await resolveProfile({ uid: invoice.subscription_details?.metadata?.uid, customerId: invoice.customer });
      if (!profile) return;
      const paidAt = new Date((invoice.status_transitions?.paid_at ?? invoice.created) * 1000).toISOString();
      const covered = await recordPayment(profile.ref, { amount: invoice.amount_paid / 100, paidAt, reference: invoice.id });
      await profile.ref.update({ stripe_customer_id: invoice.customer });
      await savePaymentRecord(profile, {
        id: invoice.id, type: 'subscription', status: 'paid', period: covered, amount: invoice.amount_paid / 100, paidAt,
        invoiceId: invoice.id, paymentIntentId: invoice.payment_intent, subscriptionId: invoice.subscription,
        ...(await chargeDetails(invoice.payment_intent)),
        ...(invoice.hosted_invoice_url ? { receiptUrl: invoice.hosted_invoice_url } : {}),
      });
      return;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      if (!invoice.subscription) return;
      const profile = await resolveProfile({ uid: invoice.subscription_details?.metadata?.uid, customerId: invoice.customer });
      if (!profile) return;
      await savePaymentRecord(profile, {
        id: invoice.id, type: 'subscription', status: 'failed', period: nextPayablePeriod(normalize(profile.data().bill_benefit)),
        amount: invoice.amount_due / 100, paidAt: iso(invoice.created), invoiceId: invoice.id,
        paymentIntentId: invoice.payment_intent, subscriptionId: invoice.subscription,
        failureReason: invoice.last_finalization_error?.message ?? 'The card payment failed.',
      });
      return;
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const subscription = event.data.object;
      const profile = await resolveProfile({ uid: subscription.metadata?.uid, customerId: subscription.customer });
      if (!profile) return;
      if (supersededSubscription(profile.data(), subscription)) return;
      await syncSubscription(profile.ref, subscription, { stripe_customer_id: subscription.customer });
      return;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      const profile = await resolveProfile({ uid: subscription.metadata?.uid, customerId: subscription.customer });
      if (!profile) return;
      if (supersededSubscription(profile.data(), subscription)) return;
      await updateMembership(profile.ref, (current) => ({
        // Progress is lost: the next first payment starts a new count from its own date.
        membership: { ...current, status: 'canceled', canceled_at: new Date().toISOString(), anchor_date: null, cycle_start: null },
        extra: { stripe_subscription_id: null, stripe_subscription_status: 'canceled', stripe_cancel_at_period_end: false, stripe_current_period_end: null },
      }));
      await profile.ref.set({
        stripe_billing: { status: 'canceled', auto_pay: false, cancel_at_period_end: false, current_period_end: null, updated_at: new Date().toISOString() },
      }, { merge: true });
      return;
    }

    default:
  }
}

/* ------------------------------------------------------------------ */
/* Member routes                                                       */
/* ------------------------------------------------------------------ */

export function registerMembershipRoutes(app, { requireFirebaseUser, isAllowedOrigin }) {
  // Public: the publishable key (pk_…) is meant for browsers; it lets the app show Stripe's
  // payment form in place without a separate front-end setting.
  app.get('/api/billing/config', (_req, res) => {
    const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY || '';
    res.json({ publishableKey: publishableKey.startsWith('pk_') ? publishableKey : '' });
  });

  app.post('/api/billing/membership/checkout', requireFirebaseUser, async (req, res, next) => {
    try {
      if (!requireStripe(res)) return;
      const uid = req.user.uid;
      const profile = await findProfileByOwner(uid);
      if (!profile) return res.status(404).json({ error: 'Your account profile could not be found.' });
      const data = profile.data();
      const autoPay = req.body?.autoPay !== false;
      const autoPayRunning = Boolean(data.stripe_subscription_id) && LIVE_SUBSCRIPTION_STATUSES.has(data.stripe_subscription_status);
      if (autoPayRunning) {
        return res.status(409).json({ error: autoPay ? 'Auto pay is already on for your membership.' : 'Auto pay already pays your membership every month.' });
      }

      const customerId = await ensureCustomer(profile, req.user);

      const base = returnBase(req, isAllowedOrigin);
      const embedded = req.body?.embedded === true;
      // Embedded: the form lives in the app and completion is handled there (no redirect).
      const presentation = embedded
        ? { ui_mode: 'embedded', redirect_on_completion: 'never' }
        : { success_url: `${base}/?membership=success`, cancel_url: `${base}/?membership=canceled` };
      const reply = (session, extra = {}) => res.json(embedded ? { clientSecret: session.client_secret, ...extra } : { url: session.url, ...extra });

      if (!autoPay) {
        const period = nextPayablePeriod(normalize(data.bill_benefit));
        const oneTime = await stripe.checkout.sessions.create({
          mode: 'payment',
          customer: customerId,
          client_reference_id: uid,
          metadata: { uid, membership_period: period },
          payment_intent_data: { metadata: { uid, membership_period: period } },
          line_items: [{
            quantity: 1,
            price_data: {
              currency: 'usd',
              unit_amount: monthlyFeeCents,
              product_data: { name: `SPS Bill Benefit membership — from ${period}` },
            },
          }],
          ...presentation,
        });
        return reply(oneTime, { period });
      }

      // Current period already paid (e.g. one-time): first automatic charge on the next period's date.
      const firstCharge = autoPayStart(normalize(data.bill_benefit));

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer: customerId,
        client_reference_id: uid,
        metadata: { uid },
        subscription_data: { metadata: { uid }, ...(firstCharge ? { billing_cycle_anchor: firstCharge, proration_behavior: 'none' } : {}) },
        line_items: [priceId
          ? { price: priceId, quantity: 1 }
          : {
            quantity: 1,
            price_data: {
              currency: 'usd',
              unit_amount: monthlyFeeCents,
              recurring: { interval: 'month' },
              product_data: { name: 'SPS Bill Benefit membership' },
            },
          }],
        allow_promotion_codes: true,
        ...presentation,
      });
      return reply(session);
    } catch (error) {
      return stripeFailure(res, next, error);
    }
  });

  app.post('/api/billing/membership/intent', requireFirebaseUser, async (req, res, next) => {
    try {
      if (!requireStripe(res)) return;
      const uid = req.user.uid;
      const profile = await findProfileByOwner(uid);
      if (!profile) return res.status(404).json({ error: 'Your account profile could not be found.' });
      const data = profile.data();
      const membership = normalize(data.bill_benefit);
      const autoPay = req.body?.autoPay !== false;
      if (data.stripe_subscription_id && LIVE_SUBSCRIPTION_STATUSES.has(data.stripe_subscription_status)) {
        return res.status(409).json({ error: autoPay ? 'Auto pay is already on for your membership.' : 'Auto pay already pays your membership every month.' });
      }
      const customerId = await ensureCustomer(profile, req.user);

      if (!autoPay) {
        const period = nextPayablePeriod(membership);
        const intent = await stripe.paymentIntents.create({
          amount: monthlyFeeCents,
          currency: 'usd',
          customer: customerId,
          automatic_payment_methods: { enabled: true },
          description: `SPS Bill Benefit membership — period from ${period}`,
          metadata: { uid, membership_period: period, kind: 'membership_one_time' },
        });
        return res.json({ clientSecret: intent.client_secret, type: 'payment', period, amount: monthlyFeeCents / 100 });
      }

      // Auto pay: an incomplete subscription whose first payment the form confirms. Stripe then bills on
      // the same day every month. If the current period is already paid, the first charge waits until
      // the next period's date (card saved now, nothing due today).
      const firstCharge = autoPayStart(membership);

      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [priceId
          ? { price: priceId }
          : { price_data: { currency: 'usd', unit_amount: monthlyFeeCents, recurring: { interval: 'month' }, product: await membershipProductId() } }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        metadata: { uid },
        ...(firstCharge ? { billing_cycle_anchor: firstCharge, proration_behavior: 'none' } : {}),
        expand: ['latest_invoice.payment_intent', 'pending_setup_intent'],
      });
      const paymentIntent = subscription.latest_invoice?.payment_intent;
      if (paymentIntent?.client_secret) {
        return res.json({ clientSecret: paymentIntent.client_secret, type: 'payment', subscriptionId: subscription.id, amount: monthlyFeeCents / 100 });
      }
      if (subscription.pending_setup_intent?.client_secret) {
        return res.json({ clientSecret: subscription.pending_setup_intent.client_secret, type: 'setup', subscriptionId: subscription.id, amount: monthlyFeeCents / 100 });
      }
      return res.status(500).json({ error: 'The payment could not be prepared. Please try again.' });
    } catch (error) {
      return stripeFailure(res, next, error);
    }
  });

  app.post('/api/billing/membership/portal', requireFirebaseUser, async (req, res, next) => {
    try {
      if (!requireStripe(res)) return;
      const profile = await findProfileByOwner(req.user.uid);
      const customerId = profile?.data().stripe_customer_id;
      if (!customerId) return res.status(404).json({ error: 'No Stripe billing account was found for your membership.' });
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${returnBase(req, isAllowedOrigin)}/?membership=portal`,
      });
      return res.json({ url: session.url });
    } catch (error) {
      return stripeFailure(res, next, error);
    }
  });

  async function ownSubscription(req, res) {
    const profile = await findProfileByOwner(req.user.uid);
    const subscriptionId = profile?.data().stripe_subscription_id;
    if (!profile || !subscriptionId) {
      res.status(404).json({ error: 'You do not have an active Stripe subscription.' });
      return null;
    }
    return { profile, subscriptionId };
  }

  app.get('/api/billing/membership/status', requireFirebaseUser, async (req, res, next) => {
    try {
      if (!requireStripe(res)) return;
      const profile = await findProfileByOwner(req.user.uid);
      const subscriptionId = profile?.data().stripe_subscription_id;
      if (!subscriptionId) return res.json({ subscribed: false });
      let subscription;
      try {
        subscription = await stripe.subscriptions.retrieve(subscriptionId, { expand: ['default_payment_method'] });
      } catch (error) {
        if (error?.code !== 'resource_missing') throw error;
        await profile.ref.update({ stripe_subscription_id: null, stripe_subscription_status: null });
        return res.json({ subscribed: false });
      }
      await syncSubscription(profile.ref, subscription);
      let card = subscription.default_payment_method?.card ?? null;
      if (!card && subscription.customer) {
        const customer = await stripe.customers.retrieve(subscription.customer, { expand: ['invoice_settings.default_payment_method'] });
        card = customer.invoice_settings?.default_payment_method?.card ?? null;
      }
      return res.json({
        subscribed: ['active', 'trialing', 'past_due'].includes(subscription.status),
        status: subscription.status,
        autoPay: subscription.status !== 'canceled' && !subscription.cancel_at_period_end,
        cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
        currentPeriodEnd: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null,
        amount: (subscription.items?.data?.[0]?.price?.unit_amount ?? monthlyFeeCents) / 100,
        card: card ? { brand: card.brand, last4: card.last4, expMonth: card.exp_month, expYear: card.exp_year } : null,
      });
    } catch (error) {
      return stripeFailure(res, next, error);
    }
  });

  app.post('/api/billing/membership/cancel', requireFirebaseUser, async (req, res, next) => {
    try {
      if (!requireStripe(res)) return;
      const own = await ownSubscription(req, res);
      if (!own) return;
      const subscription = await stripe.subscriptions.update(own.subscriptionId, { cancel_at_period_end: true });
      await syncSubscription(own.profile.ref, subscription);
      return res.json({ ok: true, ...subscriptionFields(subscription) });
    } catch (error) {
      return stripeFailure(res, next, error);
    }
  });

  app.post('/api/billing/membership/resume', requireFirebaseUser, async (req, res, next) => {
    try {
      if (!requireStripe(res)) return;
      const own = await ownSubscription(req, res);
      if (!own) return;
      const subscription = await stripe.subscriptions.update(own.subscriptionId, { cancel_at_period_end: false });
      await syncSubscription(own.profile.ref, subscription);
      return res.json({ ok: true, ...subscriptionFields(subscription) });
    } catch (error) {
      return stripeFailure(res, next, error);
    }
  });
}
