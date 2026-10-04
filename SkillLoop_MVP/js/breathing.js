// ============================================================
// SkillLoop — Take a Breather
// Shared logic for the breathing-exercise overlay. Include this
// script on any page that has the #breather-btn / #breather-overlay
// markup in its sidebar.
// ============================================================

(function () {
  const openBtn = document.getElementById('breather-btn');
  const overlay = document.getElementById('breather-overlay');
  const endBtn = document.getElementById('end-break-btn');
  const label = document.getElementById('breath-label');
  const sunGroup = document.getElementById('breath-sun-group');

  if (!openBtn || !overlay) return; // page doesn't include the breather component

  let cycleTimer = null;
  let phase = 'in';
  const CYCLE_MS = 4000;

  function tick() {
    if (phase === 'in') {
      label.textContent = 'Breathe In…';
      sunGroup.style.transform = 'scale(1.14)';
      phase = 'out';
    } else {
      label.textContent = 'Breathe Out…';
      sunGroup.style.transform = 'scale(0.88)';
      phase = 'in';
    }
  }

  function openBreather() {
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    phase = 'in';
    tick();
    cycleTimer = setInterval(tick, CYCLE_MS);
  }

  function closeBreather() {
    overlay.classList.add('flash-close');
    setTimeout(() => {
      clearInterval(cycleTimer);
      overlay.style.display = 'none';
      document.body.style.overflow = '';
      overlay.classList.remove('flash-close');
      sunGroup.style.transform = 'scale(1)';
      label.textContent = '';
    }, 260);
  }

  openBtn.addEventListener('click', openBreather);
  endBtn.addEventListener('click', closeBreather);

  // Escape key also ends the break
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.style.display === 'flex') closeBreather();
  });
})();
