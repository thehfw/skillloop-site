// ============================================================
// SkillLoop — Get Help widget
// Shared logic for the floating help button. Include this script
// on any page that has the #help-fab / #help-panel markup.
// ============================================================

(function () {
  const fab = document.getElementById('help-fab');
  const panel = document.getElementById('help-panel');
  const assistantBtn = document.getElementById('help-assistant-btn');
  const assistantNote = document.getElementById('help-assistant-note');
  const faqBtn = document.getElementById('help-faq-btn');
  const emailBtn = document.getElementById('help-email-btn');

  if (!fab || !panel) return; // page doesn't include the widget

  function togglePanel() {
    panel.classList.toggle('open');
    if (!panel.classList.contains('open')) assistantNote.classList.remove('open');
  }

  fab.addEventListener('click', togglePanel);

  document.addEventListener('click', (e) => {
    if (panel.classList.contains('open') && !panel.contains(e.target) && e.target !== fab && !fab.contains(e.target)) {
      panel.classList.remove('open');
      assistantNote.classList.remove('open');
    }
  });

  assistantBtn?.addEventListener('click', () => {
    assistantNote.classList.toggle('open');
  });

  faqBtn?.addEventListener('click', () => {
    window.location.href = '/faq.html';
  });

  emailBtn?.addEventListener('click', () => {
    window.location.href = 'mailto:help@skillloop.org';
  });
})();
