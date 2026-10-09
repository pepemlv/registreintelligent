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
 * - GET  /api/billing/membership/status    → auto pay, next payment date, card on file
 * - POST /api/billing/membership/cancel    → stop auto pay; membership ends at the end of the paid period
 * - POST /api/billing/membership/resume    → undo a pending cancellation
 * - POST /api/stripe/webhook               → Stripe events; the only place paid months are recorded
 *
 * Membership state lives on the member's profile as `bill_benefit` (same shape the web app reads):
 * { status, started_at, canceled_at, cycle_start_month, payments: [{ month, amount, paid_at, stripe_invoice_id }], claims }
 */

const secretKey = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_TEST || '';
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
const priceId = process.env.STRIPE_MEMBERSHIP_PRICE_ID || '';
const monthlyFeeCents = Number(process.env.MEMBERSHIP_MONTHLY_FEE_CENTS || 1000);

const stripe = secretKey ? new Stripe(secretKey) : null;

if (!stripe) console.warn('Stripe is not configured (STRIPE_SECRET_KEY): membership payments are disabled.');
else if (!webhookSecret) console.warn('STRIPE_WEBHOOK_SECRET is missing: paid months will not be recorded.');

function monthKey(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function emptyMembership() {
  return { status: 'none', started_at: null, canceled_at: null, cycle_start_month: null, payments: [], claims: [] };
}

function normalize(raw) {
  const value = raw && typeof raw === 'object' ? raw : {};
  return {
    ...emptyMembership(),
    ...value,
    payments: Array.isArray(value.payments) ? value.payments : [],
    claims: Array.isArray(value.claims) ? value.claims : [],
  };
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

function requireStripe(res) {
  if (stripe) return true;
  res.status(503).json({ error: 'Membership payments are not available right now.' });
  return false;
}

/** Records a paid month (idempotent per month / Stripe reference) and activates the membership. */
async function recordPaidMonth(profileRef, { month, amount, paidAt, reference }) {
  await updateMembership(profileRef, (current) => {
    if (current.payments.some((payment) => payment.month === month || payment.stripe_invoice_id === reference)) return { membership: current };
    const activated = current.status === 'active'
      ? current
      : { ...current, status: 'active', started_at: current.started_at ?? paidAt, canceled_at: null, cycle_start_month: month };
    return {
      membership: {
        ...activated,
        payments: [...current.payments, { month, amount, paid_at: paidAt, stripe_invoice_id: reference }]
          .sort((a, b) => String(a.month).localeCompare(String(b.month))),
      },
    };
  });
}

/** Month a one-time payment covers: this month, or the next one when this month is already paid. */
function nextUnpaidMonth(membership) {
  const now = new Date();
  const current = monthKey(now);
  if (!membership.payments.some((payment) => payment.month === current)) return current;
  return monthKey(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)));
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
      if (session.mode === 'payment' && session.metadata?.membership_month) {
        if (session.payment_status !== 'paid') return;
        const payer = await resolveProfile({ uid: session.client_reference_id || session.metadata?.uid, customerId: session.customer });
        if (!payer) return;
        await recordPaidMonth(payer.ref, {
          month: session.metadata.membership_month,
          amount: (session.amount_total ?? monthlyFeeCents) / 100,
          paidAt: new Date((session.created ?? Date.now() / 1000) * 1000).toISOString(),
          reference: session.payment_intent || session.id,
        });
        return;
      }
      if (session.mode !== 'subscription') return;
      const profile = await resolveProfile({ uid: session.client_reference_id || session.metadata?.uid, customerId: session.customer });
      if (!profile) return;
      const now = new Date();
      await updateMembership(profile.ref, (current) => ({
        membership: current.status === 'active'
          ? current
          : { ...current, status: 'active', started_at: now.toISOString(), canceled_at: null, cycle_start_month: monthKey(now) },
        extra: { stripe_customer_id: session.customer, stripe_subscription_id: session.subscription },
      }));
      return;
    }

    case 'invoice.paid': {
      const invoice = event.data.object;
      if (!invoice.subscription || !invoice.amount_paid) return;
      const profile = await resolveProfile({ uid: invoice.subscription_details?.metadata?.uid, customerId: invoice.customer });
      if (!profile) return;
      const periodStart = invoice.lines?.data?.[0]?.period?.start ?? invoice.period_start;
      const month = monthKey(new Date(periodStart * 1000));
      const paidAt = new Date((invoice.status_transitions?.paid_at ?? invoice.created) * 1000).toISOString();
      await recordPaidMonth(profile.ref, { month, amount: invoice.amount_paid / 100, paidAt, reference: invoice.id });
      await profile.ref.update({ stripe_customer_id: invoice.customer });
      return;
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const subscription = event.data.object;
      const profile = await resolveProfile({ uid: subscription.metadata?.uid, customerId: subscription.customer });
      if (!profile) return;
      await profile.ref.update({ stripe_customer_id: subscription.customer, ...subscriptionFields(subscription) });
      return;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      const profile = await resolveProfile({ uid: subscription.metadata?.uid, customerId: subscription.customer });
      if (!profile) return;
      await updateMembership(profile.ref, (current) => ({
        membership: { ...current, status: 'canceled', canceled_at: new Date().toISOString(), cycle_start_month: null },
        extra: { stripe_subscription_id: null, stripe_subscription_status: 'canceled', stripe_cancel_at_period_end: false, stripe_current_period_end: null },
      }));
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
      const autoPayRunning = Boolean(data.stripe_subscription_id) && data.stripe_subscription_status !== 'canceled';
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
        const month = nextUnpaidMonth(normalize(data.bill_benefit));
        const oneTime = await stripe.checkout.sessions.create({
          mode: 'payment',
          customer: customerId,
          client_reference_id: uid,
          metadata: { uid, membership_month: month },
          payment_intent_data: { metadata: { uid, membership_month: month } },
          line_items: [{
            quantity: 1,
            price_data: {
              currency: 'usd',
              unit_amount: monthlyFeeCents,
              product_data: { name: `SPS Bill Benefit membership — ${month}` },
            },
          }],
          ...presentation,
        });
        return reply(oneTime, { month });
      }

      // This month already paid (e.g. a one-time payment): start charging from the 1st of next month
      // instead of billing the same month twice. Stripe needs a trial end at least 48 hours away.
      const now = new Date();
      const firstOfNextMonth = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1) / 1000;
      const currentMonthPaid = normalize(data.bill_benefit).payments.some((payment) => payment.month === monthKey(now));
      const deferFirstCharge = currentMonthPaid && firstOfNextMonth - now.getTime() / 1000 > 48 * 3600;

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer: customerId,
        client_reference_id: uid,
        metadata: { uid },
        subscription_data: { metadata: { uid }, ...(deferFirstCharge ? { trial_end: Math.floor(firstOfNextMonth) } : {}) },
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
      await profile.ref.update(subscriptionFields(subscription));
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
      await own.profile.ref.update(subscriptionFields(subscription));
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
      await own.profile.ref.update(subscriptionFields(subscription));
      return res.json({ ok: true, ...subscriptionFields(subscription) });
    } catch (error) {
      return stripeFailure(res, next, error);
    }
  });
}
