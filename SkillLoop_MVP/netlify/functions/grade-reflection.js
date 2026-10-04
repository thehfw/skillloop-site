// ============================================================
// POST /.netlify/functions/grade-reflection
// Body: { text: string, lessonTitle: string }
// Returns: { score: 1-5, feedback: string, source: 'ai' | 'auto' }
//
// If ANTHROPIC_API_KEY is set in Netlify env vars, reflections are
// graded by Claude. If not, a structured instant-feedback fallback
// runs so the feature still works end-to-end without a key.
// ============================================================

function countSentences(text) {
  return (text.match(/[.!?]+(\s|$)/g) || []).length;
}

function heuristicGrade(text) {
  const sentences = countSentences(text);
  const words = text.trim().split(/\s+/).length;
  const firstPerson = /\b(i|my|me)\b/i.test(text);

  let score = 3;
  const notes = [];

  if (sentences >= 3) { score += 1; notes.push('You wrote a complete reflection with at least three sentences.'); }
  else { notes.push('Try to write at least three full sentences next time.'); }

  if (words >= 35) { score += 1; notes.push('Good level of detail.'); }
  else { notes.push('Adding one more specific detail about what you tried would make this even stronger.'); }

  if (firstPerson) { notes.push('You talked about your own experience, which is exactly what a reflection is for.'); }

  score = Math.max(1, Math.min(5, score));
  return {
    score,
    feedback: notes.join(' '),
    source: 'auto',
  };
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
  const lessonTitle = body.lessonTitle || 'this lesson';

  if (!text) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Reflection text is required.' }) };
  }
  if (countSentences(text) < 3) {
    return {
      statusCode: 200,
      body: JSON.stringify({
        score: 0,
        feedback: 'Your reflection needs at least three full sentences. Tell us what you tried, what felt hard, and what you will do next time.',
        source: 'auto',
        incomplete: true,
      }),
    };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return { statusCode: 200, body: JSON.stringify(heuristicGrade(text)) };
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
          'You grade short written reflections from teenagers (13-18) practicing life skills. ' +
          'Be warm, encouraging, and specific. Never be harsh. ' +
          'Respond ONLY with JSON in this exact shape, no other text: ' +
          '{"score": <integer 1-5>, "feedback": "<2-3 supportive sentences>"}',
        messages: [
          {
            role: 'user',
            content:
              `The student just completed a lesson called "${lessonTitle}" ` +
              `(a physical coordination / balance exercise). Their written reflection:\n\n` +
              `"${text}"\n\nGrade it now.`,
          },
        ],
      }),
    });

    if (!res.ok) throw new Error(`Anthropic API ${res.status}`);
    const data = await res.json();
    const raw = (data.content || []).map((c) => c.text || '').join('').trim();
    const cleaned = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    const score = Math.max(1, Math.min(5, parseInt(parsed.score, 10) || 3));
    const feedback = String(parsed.feedback || '').slice(0, 600) || heuristicGrade(text).feedback;

    return { statusCode: 200, body: JSON.stringify({ score, feedback, source: 'ai' }) };
  } catch (err) {
    console.error('grade-reflection AI error, using fallback:', err.message);
    return { statusCode: 200, body: JSON.stringify(heuristicGrade(text)) };
  }
};
