// Payments are turned off — SkillLoop is free for now.
// Acknowledge any leftover Stripe events so Stripe stops retrying, and do nothing.
exports.handler = async () => ({
  statusCode: 200,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ received: true, ignored: true }),
});
