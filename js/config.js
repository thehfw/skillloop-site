// ============================================================
// SkillLoop — Public Configuration
// ============================================================
// These are PUBLIC keys — safe to ship in frontend code.
// Supabase's "anon"/"publishable" key is protected by Row Level
// Security (RLS), not by secrecy. Stripe's "publishable" key is
// designed to be public.
//
// NEVER put the Supabase service_role / secret key here — that one
// only ever goes into Netlify's Environment Variables, since it
// bypasses all security rules if it reaches the browser.
// ============================================================

window.SKILLLOOP_CONFIG = {
  SUPABASE_URL: 'https://vrnkegfqwaskgzceohbq.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_ioc5pumt7N1L5fnmu8pH8w_z11AyqpH',
  STRIPE_PUBLISHABLE_KEY: 'pk_test_YOUR_STRIPE_PUBLISHABLE_KEY',
};
