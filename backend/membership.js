import express from 'express';
import admin from 'firebase-admin';
import Stripe from 'stripe';

/**
 * SPS Bill Benefit membership, paid with Stripe subscriptions.
 *
 * - POST /api/billing/membership/checkout  → Stripe Checkout (subscription) URL for the signed-in member
 * - POST /api/billing/membership/portal    → Stripe customer portal URL (update card, invoices)
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

function requireStripe(res) {
  if (stripe) return true;
  res.status(503).json({ error: 'Membership payments are not available right now.' });
  return false;
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
      await updateMembership(profile.ref, (current) => {
        if (current.payments.some((payment) => payment.month === month || payment.stripe_invoice_id === invoice.id)) return { membership: current };
        const activated = current.status === 'active'
          ? current
          : { ...current, status: 'active', started_at: current.started_at ?? paidAt, canceled_at: null, cycle_start_month: month };
        return {
          membership: {
            ...activated,
            payments: [...current.payments, { month, amount: invoice.amount_paid / 100, paid_at: paidAt, stripe_invoice_id: invoice.id }]
              .sort((a, b) => String(a.month).localeCompare(String(b.month))),
          },
          extra: { stripe_customer_id: invoice.customer },
        };
      });
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
  app.post('/api/billing/membership/checkout', requireFirebaseUser, async (req, res, next) => {
    try {
      if (!requireStripe(res)) return;
      const uid = req.user.uid;
      const profile = await findProfileByOwner(uid);
      if (!profile) return res.status(404).json({ error: 'Your account profile could not be found.' });
      const data = profile.data();
      if (normalize(data.bill_benefit).status === 'active' && data.stripe_subscription_id) {
        return res.status(409).json({ error: 'Your membership is already active.' });
      }

      let customerId = data.stripe_customer_id;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: req.user.email || data.email || undefined,
          name: data.full_name || undefined,
          metadata: { uid, profile_id: profile.id },
        });
        customerId = customer.id;
        await profile.ref.update({ stripe_customer_id: customerId });
      }

      const base = returnBase(req, isAllowedOrigin);
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer: customerId,
        client_reference_id: uid,
        metadata: { uid },
        subscription_data: { metadata: { uid } },
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
        success_url: `${base}/?membership=success`,
        cancel_url: `${base}/?membership=canceled`,
      });
      return res.json({ url: session.url });
    } catch (error) {
      return next(error);
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
      return next(error);
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
      const subscription = await stripe.subscriptions.retrieve(subscriptionId, { expand: ['default_payment_method'] });
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
      return next(error);
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
      return next(error);
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
      return next(error);
    }
  });
}
