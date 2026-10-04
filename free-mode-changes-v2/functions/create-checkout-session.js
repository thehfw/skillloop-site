// Payments are turned off — SkillLoop is free for now.
// (Original Stripe checkout code is in git history; restore it to re-enable billing.)
exports.handler = async () => ({
  statusCode: 410,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ error: 'SkillLoop is free right now. Checkout is disabled.' }),
});
