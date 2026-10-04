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

// Event types that count as genuine engagement (a real submission),
// not just opening the app. Only these earn "active day" billing credit.
const QUALIFYING_EVENT_TYPES = ['quiz_completed', 'reflection_submitted'];

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
 * Logs one detailed activity event. Unlike the old page-visit tracker,
 * this allows multiple rows per day and records WHAT actually happened
 * (event_type), not just that the user was present.
 *
 * Only 'quiz_completed' and 'reflection_submitted' count toward the
 * 16-active-day RTM billing threshold — everything else (login,
 * lesson_started, video_watched, onboarding_completed) is a genuine
 * engagement signal for the clinician view, but is not billing-qualifying
 * on its own.
 */
async function logEvent(userId, eventType, extra = {}) {
  const { error } = await window.supabaseClient.from('activity_log').insert({
    user_id: userId,
    event_type: eventType,
    module: extra.module || null,
    lesson_number: extra.lessonNumber ?? null,
    assignment_number: extra.assignmentNumber ?? null,
    payload: extra.payload || null,
  });
  if (error) console.error('logEvent error:', eventType, error.message);
}

/** Returns the sorted list of qualifying (real submission) dates in the rolling 30-day window. */
async function getActiveDatesThisMonth(userId) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const cutoff = thirtyDaysAgo.toISOString().slice(0, 10);

  const { data, error } = await window.supabaseClient
    .from('activity_log')
    .select('activity_date')
    .eq('user_id', userId)
    .in('event_type', QUALIFYING_EVENT_TYPES)
    .gte('activity_date', cutoff);

  if (error) {
    console.error('getActiveDatesThisMonth error:', error.message);
    return [];
  }
  return Array.from(new Set(data.map(r => r.activity_date))).sort();
}

/** Counts qualifying active days (real submissions only) in the rolling 30-day window. */
async function getActiveDaysThisMonth(userId) {
  return (await getActiveDatesThisMonth(userId)).length;
}

/**
 * Current consecutive-day streak, counting only days with a qualifying
 * (real submission) event. Counts back from today; if today hasn't
 * qualified yet, counts back from yesterday so an unfinished morning
 * doesn't zero the streak.
 */
async function getStreak(userId) {
  const { data, error } = await window.supabaseClient
    .from('activity_log')
    .select('activity_date')
    .eq('user_id', userId)
    .in('event_type', QUALIFYING_EVENT_TYPES)
    .order('activity_date', { ascending: false })
    .limit(200);

  if (error || !data || data.length === 0) return 0;

  const have = new Set(data.map(r => r.activity_date));
  const day = new Date();
  const iso = d => d.toISOString().slice(0, 10);

  if (!have.has(iso(day))) day.setDate(day.getDate() - 1);
  if (!have.has(iso(day))) return 0;

  let streak = 0;
  while (have.has(iso(day))) {
    streak += 1;
    day.setDate(day.getDate() - 1);
  }
  return streak;
}

async function signOut() {
  await window.supabaseClient.auth.signOut();
  window.location.href = '/login.html';
}
