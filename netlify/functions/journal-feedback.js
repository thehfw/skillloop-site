// ============================================================
// POST /.netlify/functions/journal-feedback
// Body: { text: string }
// Returns: { studentReply: string, triageLevel: string, triageNote: string, source }
//
// This handles free-write emotional journal entries from teenagers, so
// safety comes first: a hard, deterministic crisis check runs BEFORE
// anything else and cannot be bypassed by prompting. triageLevel /
// triageNote are for STAFF use only (surfaced in the clinician roster)
// and are never shown to the student — only studentReply is.
// ============================================================

const CRISIS_PATTERNS = [
  /kill myself/i, /suicid/i, /want to die/i, /end my life/i,
  /hurt myself/i, /self.?harm/i, /don'?t want to (live|be here)/i,
  /no reason to live/i, /better off dead/i,
];

const CRISIS_REPLY =
  "Thank you for trusting this space with something so heavy. I'm not able to help with this myself, but you don't have to carry it alone. " +
  "If you're in the US, call or text 988 (the Suicide & Crisis Lifeline) any time — it's free and confidential. " +
  "You can also text HOME to 741741 to reach the Crisis Text Line. " +
  "If you're in immediate danger, please call 911 or go to your nearest emergency room. " +
  "Please also tell a parent, guardian, or another trusted adult what you're feeling as soon as you can.";

function fallbackReply() {
  return "Thank you for sharing how you're feeling — that takes courage. Writing things down is a great way to process them. Keep going at your own pace.";
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

  const text = (body.text || '').trim();
  if (!text) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Journal entry text is required.' }) };
  }

  // Hard safety override — deterministic, runs before any AI call, cannot be prompted around.
  if (CRISIS_PATTERNS.some((p) => p.test(text))) {
    return {
      statusCode: 200,
      body: JSON.stringify({
        studentReply: CRISIS_REPLY,
        triageLevel: 'crisis',
        triageNote: 'Automatic keyword match suggested possible crisis language. Review immediately.',
        source: 'crisis',
      }),
    };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return {
      statusCode: 200,
      body: JSON.stringify({ studentReply: fallbackReply(), triageLevel: 'none', triageNote: null, source: 'fallback' }),
    };
  }

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 350,
        system:
          'You read a private emotional journal entry from a teenager on SkillLoop, a life-skills platform. ' +
          'You are warm, validating, and brief — 2-3 sentences, never clinical, never diagnostic, never give advice ' +
          'that sounds like therapy. Just make them feel heard.\n\n' +
          'You ALSO privately classify the entry for staff review (the student never sees this part). Pick one: ' +
          '"none" (nothing notable), "check_in" (a staff member should check in personally soon), ' +
          '"refer_clinic" (this seems like something a partner clinic should know about), ' +
          '"billable_resource" (this suggests the family may benefit from a specific covered resource or service). ' +
          'Never pick "crisis" — that is handled separately and automatically.\n\n' +
          'Respond ONLY with JSON in this exact shape, no other text: ' +
          '{"studentReply": "...", "triageLevel": "none|check_in|refer_clinic|billable_resource", "triageNote": "one short internal sentence explaining why, or null"}',
        messages: [{ role: 'user', content: text }],
      }),
    });

    if (!res.ok) throw new Error(`Anthropic API ${res.status}`);
    const data = await res.json();
    const raw = (data.content || []).map((c) => c.text || '').join('').trim();
    const cleaned = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    const validLevels = ['none', 'check_in', 'refer_clinic', 'billable_resource'];
    const triageLevel = validLevels.includes(parsed.triageLevel) ? parsed.triageLevel : 'none';

    return {
      statusCode: 200,
      body: JSON.stringify({
        studentReply: parsed.studentReply || fallbackReply(),
        triageLevel,
        triageNote: parsed.triageNote || null,
        source: 'ai',
      }),
    };
  } catch (err) {
    console.error('journal-feedback error, using fallback:', err.message);
    return {
      statusCode: 200,
      body: JSON.stringify({ studentReply: fallbackReply(), triageLevel: 'none', triageNote: null, source: 'fallback' }),
    };
  }
};
