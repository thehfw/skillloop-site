// ============================================================
// POST /.netlify/functions/clinician-roster
// Body: { password: string }
// Returns: { students: [...] } or { error } with 401 if password is wrong
//
// SECURITY: The password check and the privileged cross-user data
// access both happen HERE, server-side, using the Supabase service
// role key. The password is never present in any browser-visible file —
// it's only compared against a Netlify environment variable, which is
// the only way this is meaningfully protected (a client-side-only
// check could be bypassed by anyone reading the page's JavaScript).
// ============================================================

const { createClient } = require('@supabase/supabase-js');

const MODULE_TOTALS_PER_MODULE = 100; // 20 lessons x 5 assignments
const QUALIFYING_EVENT_TYPES = ['quiz_completed', 'reflection_submitted'];

const CATEGORY_PREFIX = [
  ['pc_', 'Physical Coordination'],
  ['ef_', 'Executive Function'],
  ['ss_', 'Social Skills'],
  ['in_', 'Independence Skills'],
  ['er_', 'Emotional Regulation'],
  ['sp_', 'Supports & Context'],
];
function categoryFor(id) {
  if (id === 'age') return 'Basic Info';
  if (id === 'guardian_email') return 'Contact';
  const hit = CATEGORY_PREFIX.find(([p]) => id.startsWith(p));
  return hit ? hit[1] : 'Other';
}

function computeActiveDaysAndStreak(events) {
  const qualifyingDates = events
    .filter((e) => QUALIFYING_EVENT_TYPES.includes(e.event_type))
    .map((e) => e.activity_date);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const cutoff = thirtyDaysAgo.toISOString().slice(0, 10);
  const activeDates = Array.from(new Set(qualifyingDates.filter((d) => d >= cutoff))).sort();
  const activeDays30d = activeDates.length;

  const haveDates = new Set(qualifyingDates);
  const iso = (d) => d.toISOString().slice(0, 10);
  const day = new Date();
  if (!haveDates.has(iso(day))) day.setDate(day.getDate() - 1);
  let streak = 0;
  if (haveDates.has(iso(day))) {
    while (haveDates.has(iso(day))) {
      streak += 1;
      day.setDate(day.getDate() - 1);
    }
  }

  const lastActive = events.length
    ? events.reduce((max, e) => (e.created_at > max ? e.created_at : max), events[0].created_at)
    : null;

  return { activeDays30d, activeDates, streak, lastActive };
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const providedPassword = body.password || '';
  const realPassword = process.env.CLINICIAN_PASSWORD;

  if (!realPassword) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Clinician access is not configured on the server yet.' }) };
  }
  if (providedPassword !== realPassword) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Incorrect password.' }) };
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    const [
      { data: profiles, error: profilesErr },
      { data: onboarding, error: obErr },
      { data: progress, error: progErr },
      { data: activity, error: actErr },
      { data: reflections, error: reflErr },
      { data: meetingRequests, error: meetErr },
      { data: journalFlags, error: journalErr },
      { data: usersData, error: usersErr },
    ] = await Promise.all([
      supabase.from('profiles').select('id, full_name, stars, birthdate, guardian_email, data_consent_given'),
      supabase.from('onboarding_responses').select('user_id, answers, age_range, completed_at'),
      supabase.from('module_progress').select('user_id, module'),
      supabase.from('activity_log').select('user_id, event_type, activity_date, created_at'),
      supabase.from('reflections').select('user_id, module, lesson_index, assignment_index, reflection_text, reflection_texts, ai_feedback, ai_score, created_at').order('created_at', { ascending: true }),
      supabase.from('meeting_requests').select('user_id, status, created_at').order('created_at', { ascending: false }),
      supabase.from('emotions_journal').select('user_id, triage_level, triage_note, created_at').neq('triage_level', 'none').order('created_at', { ascending: false }),
      supabase.auth.admin.listUsers({ perPage: 1000 }),
    ]);

    const firstError = profilesErr || obErr || progErr || actErr || reflErr || meetErr || journalErr || usersErr;
    if (firstError) throw firstError;

    const emailById = {};
    (usersData?.users || []).forEach((u) => { emailById[u.id] = u.email; });

    const students = (profiles || []).map((p) => {
      const ob = (onboarding || []).find((o) => o.user_id === p.id);
      const userProgress = (progress || []).filter((r) => r.user_id === p.id);
      const userActivity = (activity || []).filter((r) => r.user_id === p.id);
      const userReflections = (reflections || []).filter((r) => r.user_id === p.id);
      const userMeetingRequests = (meetingRequests || []).filter((r) => r.user_id === p.id);
      const userJournalFlags = (journalFlags || []).filter((r) => r.user_id === p.id);

      const moduleCounts = {};
      userProgress.forEach((r) => { moduleCounts[r.module] = (moduleCounts[r.module] || 0) + 1; });
      const modules = ['physical_coordination', 'independence_skills', 'social_skills', 'executive_function'].map((key) => ({
        key,
        done: moduleCounts[key] || 0,
        pct: Math.round(Math.min(1, (moduleCounts[key] || 0) / MODULE_TOTALS_PER_MODULE) * 100),
      }));
      const overallPct = Math.round(
        (modules.reduce((s, m) => s + m.done, 0) / (modules.length * MODULE_TOTALS_PER_MODULE)) * 100
      );

      const { activeDays30d, activeDates, streak, lastActive } = computeActiveDaysAndStreak(userActivity);

      let iepFlag = null, servicesFlag = null;
      const groupedAssessment = {};
      if (ob?.answers) {
        Object.entries(ob.answers).forEach(([id, val]) => {
          const cat = categoryFor(id);
          if (!groupedAssessment[cat]) groupedAssessment[cat] = [];
          groupedAssessment[cat].push(val);
          if (id === 'sp_iep') iepFlag = val.choice;
          if (id === 'sp_services') servicesFlag = val.choice;
        });
      }

      return {
        id: p.id,
        email: emailById[p.id] || null,
        fullName: p.full_name,
        ageRange: ob?.age_range || null,
        guardianEmail: p.guardian_email,
        stars: p.stars || 0,
        activeDays30d,
        activeDates,
        streak,
        lastActive,
        overallPct,
        modules,
        iepFlag,
        servicesFlag,
        dataConsentGiven: !!p.data_consent_given,
        assessment: groupedAssessment,
        reflections: userReflections,
        pendingMeetingRequest: userMeetingRequests.some((r) => r.status === 'pending'),
        journalFlags: userJournalFlags,
      };
    });

    students.sort((a, b) => (b.lastActive || '').localeCompare(a.lastActive || ''));

    return { statusCode: 200, body: JSON.stringify({ students }) };
  } catch (err) {
    console.error('clinician-roster error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
