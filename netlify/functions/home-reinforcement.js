// ============================================================
// POST /.netlify/functions/home-reinforcement
// Body: { studentName, weakestModule, recentReflections: [{title, text}] }
// Returns: { suggestions: string[], source: 'ai' | 'fallback' }
//
// Runs on data the PARENT already has legitimate access to (their own
// child's own reflections/progress, fetched client-side under normal
// RLS) — this function does not need privileged cross-user access.
// ============================================================

const FALLBACK_SUGGESTIONS = {
  'Physical Coordination': [
    'Practice standing on one foot for 20-30 seconds while brushing teeth — a natural daily moment to build balance.',
    'Play a short game of catch a few times this week to reinforce hand-eye coordination in a low-pressure way.',
    'Take a slow, focused walk together and narrate each step ("heel, toe") to build body awareness.',
  ],
  'Independence Skills': [
    'Invite your teen to help plan and prepare one simple meal this week, start to finish.',
    'Practice a small budgeting task together, like comparing prices for a grocery list.',
    'Let them handle one daily routine independently and check in only at the end.',
  ],
  'Social Skills': [
    'Role-play a low-stakes conversation starter before a social event.',
    'Watch a short show together and pause to talk about how a character might be feeling.',
    'Encourage one small social interaction this week, like ordering their own food.',
  ],
  'Executive Function': [
    'Break one homework task into 3 written steps together before starting.',
    'Use a visible timer for a 15-minute focus block on one task.',
    'Practice packing a bag the night before using a simple checklist.',
  ],
};

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

  const studentName = body.studentName || 'Your teen';
  const weakestModule = body.weakestModule || 'Physical Coordination';
  const recentReflections = Array.isArray(body.recentReflections) ? body.recentReflections.slice(0, 5) : [];

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return {
      statusCode: 200,
      body: JSON.stringify({ suggestions: FALLBACK_SUGGESTIONS[weakestModule] || FALLBACK_SUGGESTIONS['Physical Coordination'], source: 'fallback' }),
    };
  }

  try {
    const reflectionsSummary = recentReflections.length
      ? recentReflections.map((r, i) => `${i + 1}. "${r.title}": ${r.text.slice(0, 200)}`).join('\n')
      : 'No written reflections yet.';

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 300,
        system:
          'You write short, practical "home reinforcement" suggestions for parents of a teenager using SkillLoop, ' +
          'a life-skills platform. Given the teen\'s current focus module and recent reflection excerpts, suggest ' +
          '3 concrete, low-effort activities a parent can do at home this week to reinforce what the teen is learning. ' +
          'Respond ONLY with a JSON array of exactly 3 short strings, no other text.',
        messages: [
          {
            role: 'user',
            content: `Student: ${studentName}\nCurrent focus module: ${weakestModule}\nRecent reflections:\n${reflectionsSummary}\n\nGive 3 home reinforcement suggestions.`,
          },
        ],
      }),
    });

    if (!res.ok) throw new Error(`Anthropic API ${res.status}`);
    const data = await res.json();
    const raw = (data.content || []).map((c) => c.text || '').join('').trim();
    const cleaned = raw.replace(/```json|```/g, '').trim();
    const suggestions = JSON.parse(cleaned);

    if (!Array.isArray(suggestions) || suggestions.length === 0) throw new Error('Bad AI response shape');

    return { statusCode: 200, body: JSON.stringify({ suggestions: suggestions.slice(0, 3), source: 'ai' }) };
  } catch (err) {
    console.error('home-reinforcement error, using fallback:', err.message);
    return {
      statusCode: 200,
      body: JSON.stringify({ suggestions: FALLBACK_SUGGESTIONS[weakestModule] || FALLBACK_SUGGESTIONS['Physical Coordination'], source: 'fallback' }),
    };
  }
};
