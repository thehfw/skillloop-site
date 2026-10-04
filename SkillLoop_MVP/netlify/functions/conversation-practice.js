// ============================================================
// POST /.netlify/functions/conversation-practice
// Body: { scenario, characterName, characterPersona, studentMessage, history }
// Returns: { characterReply, coachingNote, source }
//
// Used only for OPEN-ENDED (Level 2+) conversation scenarios. Level 1
// multiple-choice scenarios are fully pre-authored in content (options,
// reactions, and reasoning are all fixed text) — no AI call needed there,
// which keeps that level predictable and safe by design.
//
// Same hard, deterministic crisis-safety override as the AI assistant
// and Emotions Journal — runs before anything else, cannot be bypassed
// by prompting, since a student could type anything into an open field.
// ============================================================

const CRISIS_PATTERNS = [
  /kill myself/i, /suicid/i, /want to die/i, /end my life/i,
  /hurt myself/i, /self.?harm/i, /don'?t want to (live|be here)/i,
  /no reason to live/i, /better off dead/i,
];

const CRISIS_REPLY =
  "I need to pause the roleplay for a second because that sounded serious. " +
  "If you're in the US, you can call or text 988 (the Suicide & Crisis Lifeline) any time — it's free and confidential. " +
  "You can also text HOME to 741741 to reach the Crisis Text Line. " +
  "If you're in immediate danger, please call 911 or go to your nearest emergency room, and tell a trusted adult what you're feeling.";

function fallbackReply(characterName) {
  return `${characterName || 'They'} smile and nod. "That's cool, thanks for saying that!" (Practice mode is running without AI right now, so this is a placeholder reply — your response was still saved.)`;
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

  const scenario = (body.scenario || '').trim();
  const characterName = body.characterName || 'Your practice partner';
  const characterPersona = body.characterPersona || 'a friendly peer';
  const studentMessage = (body.studentMessage || '').trim();
  const history = Array.isArray(body.history) ? body.history.slice(-6) : [];

  if (!studentMessage) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Message is required.' }) };
  }

  // Hard safety override — deterministic, runs before any AI call.
  if (CRISIS_PATTERNS.some((p) => p.test(studentMessage))) {
    return {
      statusCode: 200,
      body: JSON.stringify({ characterReply: CRISIS_REPLY, coachingNote: null, source: 'crisis' }),
    };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return {
      statusCode: 200,
      body: JSON.stringify({ characterReply: fallbackReply(characterName), coachingNote: null, source: 'fallback' }),
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
        max_tokens: 300,
        system:
          `You are playing "${characterName}", ${characterPersona}, inside a social-skills practice roleplay for a ` +
          `teenager using SkillLoop. The scenario: ${scenario}\n\n` +
          'Stay fully in character. Respond warmly and naturally in 1-3 short sentences, the way a real teen peer would talk. ' +
          'Never break character to grade or lecture the student inside the reply itself. Never discuss anything clinical, ' +
          'romantic, or inappropriate for a school-safe interaction — steer the roleplay back to the scenario if needed.\n\n' +
          'After your in-character reply, on a new line, add one brief out-of-character coaching note (1 sentence, ' +
          'encouraging, noting one thing that worked well or one gentle tip). ' +
          'Respond ONLY with JSON in this exact shape, no other text: ' +
          '{"characterReply": "...", "coachingNote": "..."}',
        messages: [
          ...history.filter(h => h && h.role && h.content).map(h => ({ role: h.role, content: String(h.content).slice(0, 400) })),
          { role: 'user', content: studentMessage },
        ],
      }),
    });

    if (!res.ok) throw new Error(`Anthropic API ${res.status}`);
    const data = await res.json();
    const raw = (data.content || []).map((c) => c.text || '').join('').trim();
    const cleaned = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return {
      statusCode: 200,
      body: JSON.stringify({
        characterReply: parsed.characterReply || fallbackReply(characterName),
        coachingNote: parsed.coachingNote || null,
        source: 'ai',
      }),
    };
  } catch (err) {
    console.error('conversation-practice error, using fallback:', err.message);
    return {
      statusCode: 200,
      body: JSON.stringify({ characterReply: fallbackReply(characterName), coachingNote: null, source: 'fallback' }),
    };
  }
};
