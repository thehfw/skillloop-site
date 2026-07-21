// ============================================================
// SkillLoop — Shared Supabase Client
// Requires: <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
// loaded BEFORE this file, and config.js loaded before that.
// ============================================================

const { SUPABASE_URL, SUPABASE_ANON_KEY } = window.SKILLLOOP_CONFIG;

if (SUPABASE_URL.includes('YOUR-PROJECT-REF')) {
  console.warn(
    'SkillLoop: js/config.js still has placeholder values. ' +
    'Auth and data will not work until you add your real Supabase project URL and anon key.'
  );
}

window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Redirects to login if no active session. Call at the top of any
 * page that requires authentication (dashboard, modules, etc).
 * Returns the current user object if signed in.
 */
async function requireAuth() {
  const { data: { session }, error } = await window.supabaseClient.auth.getSession();
  if (error || !session) {
    window.location.href = '/login.html';
    return null;
  }
  return session.user;
}

/**
 * Records today as an "active day" for the current user (upsert —
 * safe to call multiple times per day, only ever one row per day).
 * This directly powers the 16-active-day RTM billing tracker.
 */
async function logActiveDay(userId) {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const { error } = await window.supabaseClient
    .from('activity_log')
    .upsert({ user_id: userId, activity_date: today }, { onConflict: 'user_id,activity_date' });
  if (error) console.error('logActiveDay error:', error.message);
}

/** Counts active days in the current rolling 30-day window. */
async function getActiveDaysThisMonth(userId) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const cutoff = thirtyDaysAgo.toISOString().slice(0, 10);

  const { data, error } = await window.supabaseClient
    .from('activity_log')
    .select('activity_date')
    .eq('user_id', userId)
    .gte('activity_date', cutoff);

  if (error) {
    console.error('getActiveDaysThisMonth error:', error.message);
    return 0;
  }
  return data.length;
}

async function signOut() {
  await window.supabaseClient.auth.signOut();
  window.location.href = '/login.html';
}
