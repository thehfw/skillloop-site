// ============================================================
// SkillLoop — Get Help widget
// Shared logic for the floating help button and its AI assistant
// chat. Include this script on any page that has the #help-fab /
// #help-panel markup.
// ============================================================

(function () {
  const fab = document.getElementById('help-fab');
  const panel = document.getElementById('help-panel');
  const assistantBtn = document.getElementById('help-assistant-btn');
  const assistantChat = document.getElementById('help-assistant-chat');
  const chatLog = document.getElementById('help-chat-log');
  const chatTyping = document.getElementById('help-chat-typing');
  const chatInput = document.getElementById('help-chat-input');
  const chatSend = document.getElementById('help-chat-send');
  const faqBtn = document.getElementById('help-faq-btn');
  const emailBtn = document.getElementById('help-email-btn');

  if (!fab || !panel) return; // page doesn't include the widget

  let history = [];
  let greeted = false;

  function togglePanel() {
    panel.classList.toggle('open');
    if (!panel.classList.contains('open')) assistantChat.classList.remove('open');
  }

  fab.addEventListener('click', togglePanel);

  document.addEventListener('click', (e) => {
    if (panel.classList.contains('open') && !panel.contains(e.target) && e.target !== fab && !fab.contains(e.target)) {
      panel.classList.remove('open');
      assistantChat.classList.remove('open');
    }
  });

  function addBubble(text, kind) {
    const el = document.createElement('div');
    el.className = 'help-chat-bubble ' + kind;
    el.textContent = text;
    chatLog.appendChild(el);
    chatLog.scrollTop = chatLog.scrollHeight;
  }

  assistantBtn?.addEventListener('click', () => {
    assistantChat.classList.toggle('open');
    if (assistantChat.classList.contains('open') && !greeted) {
      addBubble("Hi! I'm the SkillLoop Assistant. Ask me about modules, stars, your progress wheel, or your subscription.", 'bot');
      greeted = true;
      chatInput?.focus();
    }
  });

  async function sendMessage() {
    const text = chatInput.value.trim();
    if (!text) return;

    addBubble(text, 'user');
    history.push({ role: 'user', content: text });
    chatInput.value = '';
    chatInput.disabled = true;
    chatSend.disabled = true;
    chatTyping.style.display = 'block';
    chatLog.scrollTop = chatLog.scrollHeight;

    try {
      const res = await fetch('/.netlify/functions/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history }),
      });
      const data = await res.json();

      chatTyping.style.display = 'none';
      addBubble(data.reply, data.source === 'crisis' ? 'crisis' : 'bot');
      history.push({ role: 'assistant', content: data.reply });
    } catch (err) {
      chatTyping.style.display = 'none';
      addBubble("Something went wrong on my end. Try again, or email help@skillloop.org.", 'bot');
    }

    chatInput.disabled = false;
    chatSend.disabled = false;
    chatInput.focus();
  }

  chatSend?.addEventListener('click', sendMessage);
  chatInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendMessage();
  });

  faqBtn?.addEventListener('click', () => {
    window.location.href = '/faq.html';
  });

  emailBtn?.addEventListener('click', () => {
    window.location.href = 'mailto:help@skillloop.org';
  });
})();
