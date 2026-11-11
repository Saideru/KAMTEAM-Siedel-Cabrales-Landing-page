(() => {
  'use strict';

  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const log      = $('#log');
  const sysTime  = $('#sysTime');
  const buttons  = $$('button');
  const channels = $$('.channels .ch:not(.dim)');

  const MAX_LOG = 8;

  const pad = n => String(n).padStart(2, '0');
  const stamp = () => {
    const d = new Date();
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };

  function tickClock() {
    sysTime.textContent = stamp();
  }
  tickClock();
  setInterval(tickClock, 1000);

  function addLog(msg, kind = '') {
    const li = document.createElement('li');
    if (kind) li.className = kind;
    li.textContent = `[${stamp()}] ${msg}`;
    log.prepend(li);
    while (log.children.length > MAX_LOG) log.lastElementChild.remove();
  }

  // Reveal buttons with a staggered slide-in
  buttons.forEach((btn, i) => {
    const label = btn.getAttribute('value') || '';
    if (label && !btn.textContent.trim()) btn.textContent = label;
    btn.style.opacity = '0';
    setTimeout(() => {
      btn.classList.add('slideIn');
      btn.style.opacity = '';
    }, i * 60);
  });

  // Boot sequence
  const boot = [
    ['SAPI KERNEL ONLINE'],
    ['MEMORY CHECK ... 64K OK'],
    ['UPLINK ESTABLISHED'],
    ['AWAITING OPERATOR INPUT', 'warn'],
  ];
  boot.forEach(([msg, kind], i) => setTimeout(() => addLog(msg, kind), 400 + i * 350));

  // Button click handler
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    // Skip buttons that belong to the FX module (popups, modals, status bar, etc.)
    if (btn.closest('.fxWin, .fxFrameWin, .fxProjectsWin, .fxModal, .fxConsole, .statusBar, .fxBoot, .fxIdle')) return;
    const label = (btn.getAttribute('value') || btn.textContent || '').trim();
    if (!label || label === 'x') {
      addLog('SIGNAL REJECTED — CHANNEL LOCKED', 'err');
      return;
    }

    if (btn.classList.contains('ch')) {
      channels.forEach(c => c.classList.remove('on'));
      btn.classList.add('on');
      addLog(`CHANNEL ${label} ACTIVE`);
      return;
    }

    if (btn.classList.contains('danger')) {
      addLog(`${label.toUpperCase()} SEQUENCE ARMED`, 'err');
      return;
    }

    btn.classList.toggle('on');
    const state = btn.classList.contains('on') ? 'ENGAGED' : 'DISENGAGED';
    addLog(`${label.toUpperCase()} ${state}`);
  });

  // Occasional ambient chatter so the terminal feels alive
  const ambient = [
    ['SENSOR SWEEP COMPLETE'],
    ['TELEMETRY NOMINAL'],
    ['COOLING LOOP STABLE'],
    ['CARRIER WAVE DETECTED', 'warn'],
    ['PACKET RECEIVED — 0x7F3A'],
  ];
  setInterval(() => {
    if (document.hidden) return;
    const [msg, kind] = ambient[Math.floor(Math.random() * ambient.length)];
    addLog(msg, kind);
  }, 7000);

  // Expose a tiny API so modules can write to the same log/clock
  window.Terminal = { log: addLog, stamp };
})();
