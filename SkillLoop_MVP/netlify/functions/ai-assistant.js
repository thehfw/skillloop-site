// ============================================================
// POST /.netlify/functions/ai-assistant
// Body: { message: string, history: [{role, content}, ...] }
// Returns: { reply: string, source: 'ai' | 'fallback' | 'crisis' }
//
// If ANTHROPIC_API_KEY is set in Netlify env vars, questions are
// answered by Claude, grounded in SkillLoop's own FAQ content and
// scoped strictly to platform-help topics. If not, a keyword-matched
// fallback runs so the feature still works end-to-end without a key.
//
// A hard, deterministic safety check runs BEFORE anything else and
// cannot be skipped by prompting: if a message suggests the user may
// be in crisis, we respond with real crisis resources directly,
// regardless of whether the AI provider is configured.
// ============================================================

const CRISIS_PATTERNS = [
  /kill myself/i, /suicid/i, /want to die/i, /end my life/i,
  /hurt myself/i, /self.?harm/i, /don'?t want to (live|be here)/i,
  /no reason to live/i, /better off dead/i,
];

const CRISIS_RESPONSE =
  "I'm really glad you reached out, and I want to take this seriously. " +
  "I'm not able to help with this myself, but you don't have to handle it alone right now. " +
  "If you're in the US, you can call or text 988 (the Suicide & Crisis Lifeline) any time, day or night — " +
  "it's free and confidential. You can also text HOME to 741741 to reach the Crisis Text Line. " +
  "If you're in immediate danger, please call 911 or go to your nearest emergency room. " +
  "Please also tell a parent, guardian, or another trusted adult what you're feeling as soon as you can.";

const FAQ_KNOWLEDGE = `
Q: What is SkillLoop?
A: A structured digital platform helping teenagers build real-world life skills across four areas: physical coordination, independence skills, social skills, and executive function, through video lessons, quizzes, and written reflections.

Q: Which modules are live right now?
A: Physical Coordination is live, with lessons releasing in sequence. Independence Skills, Social Skills, and Executive Function are in development, along with the Avatar Shop and Game Mode.

Q: What are stars?
A: Every completed assignment earns 1 star. Stars bank automatically and will be spendable on avatar outfits and accessories when the Avatar Shop launches.

Q: What does the progress wheel show?
A: Each colored quarter is one module. A quarter only fills when the student actually completes assignments in that module.

Q: Why does the dashboard track active days?
A: Consistent practice builds skills. For families working with a partnered care team, regular engagement also supports the monthly check-ins their team maintains.

Q: How much does SkillLoop cost?
A: Standard is $25/month and Premium is $50/month, cancel anytime. Families participating through a partnered care team may access SkillLoop at no direct cost, depending on their team's coverage.

Q: Is my data private?
A: Yes. No ads, no selling data, per-user access controls, and encryption in transit and at rest.

Q: Who reviews written reflections?
A: Reflections get instant automatic feedback. For families working with a care team, a real clinician can also review them — automatic feedback never replaces human judgment.

Q: How do I get more help?
A: Email help@skillloop.org and the team will get back to you.
`;

function fallbackAnswer(message) {
  const m = message.toLowerCase();
  const rules = [
    [/star/, "Every completed assignment earns 1 star. Stars bank automatically for the Avatar Shop, which is coming soon — nothing you earn now is lost."],
    [/wheel|progress/, "The progress wheel has four colored quarters, one per module. A quarter only fills in as you actually complete real assignments in that module — it starts blank."],
    [/streak|active day/, "Active days count toward consistent practice, and for families working with a care team, they also support the monthly check-ins that team maintains."],
    [/cost|price|subscri|pay/, "Standard is $25/month and Premium is $50/month. Families going through a partnered care team may have no direct cost, depending on coverage."],
    [/module|lesson/, "Physical Coordination is live right now, with lessons releasing in order. The other three modules and the Avatar Shop / Game Mode are in development."],
    [/privacy|data/, "SkillLoop doesn't sell data or show ads. Access is limited per-user with encryption in transit and at rest — see the Privacy Policy for full details."],
    [/reflect|feedback/, "Written reflections get instant feedback automatically. For families with a care team, a real clinician can review them too — automatic feedback never replaces a human."],
  ];
  for (const [pattern, answer] of rules) {
    if (pattern.test(m)) return answer;
  }
  return "I'm not totally sure on that one. Try the FAQ page for more detail, or email help@skillloop.org and a real person on the team will get back to you.";
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

  const message = (body.message || '').trim();
  const history = Array.isArray(body.history) ? body.history.slice(-6) : [];

  if (!message) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Message is required.' }) };
  }

  // Hard safety override — runs before anything else, cannot be bypassed by prompting.
  if (CRISIS_PATTERNS.some((p) => p.test(message))) {
    return { statusCode: 200, body: JSON.stringify({ reply: CRISIS_RESPONSE, source: 'crisis' }) };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return { statusCode: 200, body: JSON.stringify({ reply: fallbackAnswer(message), source: 'fallback' }) };
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
          'You are the SkillLoop Assistant, a friendly help-desk assistant embedded in the SkillLoop app for teenagers. ' +
          'Only answer questions about how to use the SkillLoop platform (modules, stars, the progress wheel, active days, ' +
          'subscriptions, privacy, how reflections are graded) using the reference FAQ below. Keep answers to 2-4 short sentences. ' +
          'Never give medical, clinical, diagnostic, or therapeutic advice of any kind, and never discuss specific insurance billing amounts. ' +
          'If asked something clinical, personal, or outside the FAQ, warmly say you cannot help with that and suggest emailing help@skillloop.org ' +
          'or talking to their care team. Never claim to be a licensed professional or a substitute for one.\n\n' +
          'REFERENCE FAQ:\n' + FAQ_KNOWLEDGE,
        messages: [
          ...history.filter(h => h && h.role && h.content).map(h => ({ role: h.role, content: String(h.content).slice(0, 500) })),
          { role: 'user', content: message },
        ],
      }),
    });

    if (!res.ok) throw new Error(`Anthropic API ${res.status}`);
    const data = await res.json();
    const reply = (data.content || []).map((c) => c.text || '').join('').trim();

    return {
      statusCode: 200,
      body: JSON.stringify({ reply: reply || fallbackAnswer(message), source: reply ? 'ai' : 'fallback' }),
    };
  } catch (err) {
    console.error('ai-assistant error, using fallback:', err.message);
    return { statusCode: 200, body: JSON.stringify({ reply: fallbackAnswer(message), source: 'fallback' }) };
  }
};
