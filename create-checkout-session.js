// ============================================================
// POST /.netlify/functions/create-checkout-session
// Body: { plan: 'premium' | 'standard', userId: string, email: string }
// Returns: { url } — redirect the browser here to open Stripe Checkout
// ============================================================

const Stripe = require('stripe');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'STRIPE_SECRET_KEY is not configured on the server.' }),
    };
  }
  const stripe = new Stripe(stripeSecretKey);

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body.' }) };
  }

  const { plan, userId, email } = body;
  if (!plan || !userId || !email) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'plan, userId, and email are all required.' }),
    };
  }

  const priceId = plan === 'premium'
    ? process.env.STRIPE_PRICE_PREMIUM
    : plan === 'standard'
    ? process.env.STRIPE_PRICE_STANDARD
    : null;

  if (!priceId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: `Unknown or unconfigured plan: ${plan}` }),
    };
  }

  const siteUrl = process.env.URL || 'http://localhost:8888';

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: email,
      client_reference_id: userId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${siteUrl}/dashboard.html?checkout=success`,
      cancel_url: `${siteUrl}/dashboard.html?checkout=cancelled`,
      metadata: { userId, plan },
      subscription_data: {
        metadata: { userId, plan },
      },
    });

    return { statusCode: 200, body: JSON.stringify({ url: session.url }) };
  } catch (err) {
    console.error('Stripe checkout session error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
