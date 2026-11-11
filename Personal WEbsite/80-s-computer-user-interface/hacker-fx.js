/* ============================================================
   hacker-fx.js — overlay effects module.
   All timings, pools and feature toggles live in CONFIG below.
   ============================================================ */
(() => {
  'use strict';

  const CONFIG = {
    reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
    boot:      { enabled: true,  minLineDelay: 40, maxLineDelay: 110 },
    intrusion: {
      enabled: false,   // ambient hacker popups off — only project side-log shows on click
      minOnReturn: 1, maxOnReturn: 3,
      maxOpen: 4,
      spawnGapMs: [120, 220],
      ttlMs: [5000, 9000],
      typeSpeedMs: 18
    },
    title: { enabled: false, interval: 800, messages: [] },
    scramble:  { enabled: true, chars: '!<>-_\\/[]{}=+*^?#01', duration: 700 },
    glitch:    { enabled: true, intervalMs: [4000, 10000] },
    matrix:    { enabled: true, fontSize: 14 },
    console:   { enabled: true },
    idle:      { enabled: true, timeoutMs: 60000 },
    konami:    { enabled: true },
    sound:     { enabled: true, defaultMuted: true, volume: 0.03 },
    liveStats: { enabled: true, tickMs: 1500, uplinkTickMs: 6000 },
    buttonFeedback: { enabled: true }
  };

  if (CONFIG.reducedMotion) {
    CONFIG.glitch.enabled = false;
    CONFIG.matrix.enabled = false;
    CONFIG.scramble.duration = 0;
    CONFIG.intrusion.typeSpeedMs = 0;
  }

  // ---------- Helpers ----------
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const rand  = (a, b) => Math.random() * (b - a) + a;
  const ri    = (a, b) => Math.floor(rand(a, b + 1));
  const pick  = a => a[ri(0, a.length - 1)];
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const log   = (msg, kind) => window.Terminal?.log?.(msg, kind);
  const hex   = n => Array.from({ length: n }, () => ri(0, 15).toString(16).toUpperCase()).join('');

  const state = { bootActive: false, matrixCtl: null, soundCtl: null };

  // ============================================================
  // 1. BOOT SEQUENCE
  // ============================================================
  async function runBoot() {
    if (!CONFIG.boot.enabled) return;
    let seen = false;
    try { seen = sessionStorage.getItem('fx_boot') === '1'; } catch (_) {}
    if (seen) return;

    state.bootActive = true;
    const overlay = document.createElement('div');
    overlay.className = 'fxBoot';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = `<pre class="fxBootText"></pre><div class="skipHint">PRESS ANY KEY TO SKIP</div>`;
    document.body.appendChild(overlay);

    const el = overlay.querySelector('.fxBootText');
    const text = [
      'SAPI BIOS v4.7 (C) 1981-1989',
      'SYNTHETIC ASSISTIVE PROCESSING INTERFACE',
      '',
      'CPU: MOTOROLA 68000 @ 7.16MHz',
      'MEM: 65536 BYTES OK',
      '',
      'DETECTING DEVICES...',
      '  HDD 0: 20MB ST-225  OK',
      '  FDD 0: 5.25" DSDD   OK',
      '  COM1: 2400 BAUD     OK',
      '  COM2: NC',
      '  LPT1: NC',
      '',
      'LOADING SAPI/KERNEL ........... OK',
      'MOUNTING /dev/root ............ OK',
      'STARTING NETWORK STACK ........ OK',
      'VERIFYING CREDENTIALS .........',
      '',
      '>> ACCESS GRANTED — WELCOME TO SAPI'
    ];

    let aborted = false;
    const finish = () => {
      if (aborted) return;
      aborted = true;
      overlay.classList.add('fxFade');
      setTimeout(() => { overlay.remove(); state.bootActive = false; }, 600);
      try { sessionStorage.setItem('fx_boot', '1'); } catch (_) {}
    };
    const skip = () => {
      if (aborted) return;
      el.textContent = text.join('\n');
      setTimeout(finish, 200);
    };
    window.addEventListener('keydown', skip, { once: true, capture: true });
    overlay.addEventListener('click', skip, { once: true });

    for (const line of text) {
      if (aborted) break;
      el.textContent += line + '\n';
      await sleep(line.includes('ACCESS GRANTED') ? 450 : rand(CONFIG.boot.minLineDelay, CONFIG.boot.maxLineDelay));
    }
    await sleep(700);
    finish();
  }

  // ============================================================
  // 2. TEXT SCRAMBLE
  // ============================================================
  function scramble(el, finalText, duration = CONFIG.scramble.duration) {
    if (!duration) { el.textContent = finalText; return; }
    const chars = CONFIG.scramble.chars;
    const total = Math.max(finalText.length, 4);
    const start = performance.now();
    (function step(now) {
      const p = Math.min(1, (now - start) / duration);
      const revealed = Math.floor(p * total);
      let out = '';
      for (let i = 0; i < total; i++) {
        out += (i < revealed) ? (finalText[i] ?? ' ') : chars[ri(0, chars.length - 1)];
      }
      el.textContent = out;
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = finalText;
    })(performance.now());
  }

  function setupScramble() {
    if (!CONFIG.scramble.enabled) return;
    const targets = [...$$('h1, h2'), ...$$('.buttonGroup button[value]')];
    targets.forEach((el, i) => {
      const finalText = (el.textContent || el.getAttribute('value') || '').trim();
      if (!finalText || finalText === 'x') return;
      el.dataset.final = finalText;
      setTimeout(() => scramble(el, finalText), i * 50);
      el.addEventListener('mouseenter', () => scramble(el, el.dataset.final, 350));
    });
  }

  // ============================================================
  // 3. GLITCH on headers
  // ============================================================
  function setupGlitch() {
    if (!CONFIG.glitch.enabled) return;
    const targets = $$('h1, h2');
    const loop = () => {
      if (document.hidden) { setTimeout(loop, 2000); return; }
      const el = pick(targets);
      if (el) {
        el.classList.add('fxGlitch');
        setTimeout(() => el.classList.remove('fxGlitch'), 320);
      }
      setTimeout(loop, rand(...CONFIG.glitch.intervalMs));
    };
    setTimeout(loop, rand(...CONFIG.glitch.intervalMs));
  }

  // ============================================================
  // 4. MATRIX RAIN (canvas inside .crt)
  // ============================================================
  function setupMatrix() {
    if (!CONFIG.matrix.enabled) return null;
    const crt = $('.crt');
    if (!crt) return null;
    const canvas = document.createElement('canvas');
    canvas.className = 'fxMatrix';
    canvas.setAttribute('aria-hidden', 'true');
    crt.prepend(canvas);
    const ctx = canvas.getContext('2d');
    const chars = '01ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿABCDEF0123456789$#@%';
    const size = CONFIG.matrix.fontSize;
    let cols = [], w = 0, h = 0, raf = 0, on = true;

    function resize() {
      const r = canvas.getBoundingClientRect();
      w = canvas.width  = r.width;
      h = canvas.height = r.height;
      const count = Math.max(1, Math.floor(w / size));
      cols = Array.from({ length: count }, () => Math.random() * h);
    }
    new ResizeObserver(resize).observe(canvas);
    resize();

    function draw() {
      if (!on) return;
      ctx.fillStyle = 'rgba(2, 10, 18, 0.1)';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#6df1ff';
      ctx.font = `${size}px "Share Tech Mono", monospace`;
      for (let i = 0; i < cols.length; i++) {
        const c = chars[ri(0, chars.length - 1)];
        ctx.fillText(c, i * size, cols[i]);
        cols[i] = (cols[i] > h && Math.random() > 0.975) ? 0 : cols[i] + size;
      }
      raf = requestAnimationFrame(draw);
    }

    const ctl = {
      start() { if (!on) { on = true; draw(); } },
      stop()  { on = false; cancelAnimationFrame(raf); raf = 0; },
      toggle() { on ? ctl.stop() : ctl.start(); canvas.style.display = on ? '' : 'none'; }
    };
    draw();
    document.addEventListener('visibilitychange', () => {
      document.hidden ? ctl.stop() : ctl.start();
    });
    return ctl;
  }

  // ============================================================
  // 5. INTRUSION POPUPS
  // ============================================================
  function hackerLines(count) {
    const gens = [
      () => ({ text: `TRACE 192.168.${ri(0,255)}.${ri(0,255)} ... ${Math.random() > 0.2 ? 'OK' : 'TIMEOUT'}` }),
      () => {
        const p = ri(5, 100);
        const f = Math.floor(p / 100 * 8);
        return { text: `DECRYPTING 0x${hex(4)} [${'█'.repeat(f)}${'░'.repeat(8 - f)}] ${p}%` };
      },
      () => Math.random() > 0.5
        ? { text: 'ACCESS GRANTED', kind: 'ok'  }
        : { text: 'ACCESS DENIED',  kind: 'err' },
      () => ({ text: `PORT ${pick([21,22,80,443,3389,8080])}: ${pick(['OPEN','FILTERED','CLOSED'])}` }),
      () => ({ text: `CHECKSUM: ${hex(8)}` }),
      () => ({ text: `${hex(4)} ${hex(4)} ${hex(4)} ${hex(4)}  ${hex(2)}:${hex(2)}:${hex(2)}:${hex(2)}` }),
      () => ({ text: `CONN ${pick(['ESTABLISHED','RESET','REFUSED'])} — ${ri(10,999)}ms` }),
      () => ({ text: `KEY 0x${hex(16)}` })
    ];
    const n = count ?? ri(5, 15);
    return Array.from({ length: n }, () => gens[ri(0, gens.length - 1)]());
  }

  function safePosition(w, h) {
    const vw = innerWidth, vh = innerHeight;
    const iframe = $('#iframeVideo');
    const r = iframe?.getBoundingClientRect();
    for (let t = 0; t < 12; t++) {
      const x = rand(10, Math.max(20, vw - w - 20));
      const y = rand(60, Math.max(80, vh - h - 20));
      if (!r) return { x, y };
      const overlap = !(x > r.right || x + w < r.left || y > r.bottom || y + h < r.top);
      if (!overlap) return { x, y };
    }
    return { x: 20, y: 80 };
  }

  function createPopup({ title, lines, small = false, ttl } = {}) {
    if ($$('.fxWin').length >= CONFIG.intrusion.maxOpen) return;

    const win = document.createElement('div');
    win.className = `fxWin${small ? ' fxSmall' : ''}`;
    win.setAttribute('aria-hidden', 'true');
    const pos = safePosition(small ? 230 : 320, small ? 120 : 200);
    win.style.left = pos.x + 'px';
    win.style.top  = pos.y + 'px';
    win.style.zIndex = 100 + $$('.fxWin').length;

    const n = String(ri(1, 9)).padStart(2, '0');
    win.innerHTML = `
      <div class="fxWinBar">
        <span class="fxWinTitle">${title || `tty${n} — sapi@node-${ri(2,9)}`}</span>
        <button type="button" class="fxWinClose" aria-label="Close">x</button>
      </div>
      <pre class="fxWinBody"><span class="fxWinText"></span><span class="fxCursor">▮</span></pre>
    `;
    document.body.appendChild(win);

    const close = () => {
      if (!win.isConnected) return;
      win.classList.add('fxWinClosing');
      setTimeout(() => win.remove(), 250);
    };
    win.querySelector('.fxWinClose').addEventListener('click', close);

    // Drag
    const bar = win.querySelector('.fxWinBar');
    let drag = null;
    const bringFront = () => {
      const max = Math.max(100, ...$$('.fxWin').map(w => +w.style.zIndex || 100));
      win.style.zIndex = max + 1;
    };
    bar.addEventListener('mousedown', e => {
      if (e.target.closest('.fxWinClose')) return;
      const r = win.getBoundingClientRect();
      drag = { x: e.clientX, y: e.clientY, left: r.left, top: r.top };
      bringFront();
      e.preventDefault();
    });
    win.addEventListener('mousedown', bringFront);
    const onMove = e => {
      if (!drag) return;
      win.style.left = (drag.left + e.clientX - drag.x) + 'px';
      win.style.top  = (drag.top  + e.clientY - drag.y) + 'px';
    };
    const onUp = () => { drag = null; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);

    // Type lines
    const body  = win.querySelector('.fxWinBody');
    const cursor = win.querySelector('.fxCursor');
    const data = (lines && lines.length) ? lines : hackerLines(small ? ri(3, 6) : undefined);
    const speed = CONFIG.intrusion.typeSpeedMs;
    let li = 0, ci = 0, cur = null;

    function nextChar() {
      if (!win.isConnected) return;
      if (li >= data.length) return;
      const d = data[li];
      if (ci === 0) {
        cur = document.createElement('span');
        if (d.kind) cur.className = `fx-${d.kind}`;
        body.insertBefore(cur, cursor);
        if (li > 0) body.insertBefore(document.createTextNode('\n'), cur);
      }
      if (ci < d.text.length) {
        const chunk = speed === 0 ? d.text.length : 1;
        cur.textContent += d.text.slice(ci, ci + chunk);
        ci += chunk;
        setTimeout(nextChar, speed + rand(0, 10));
      } else {
        li++; ci = 0;
        setTimeout(nextChar, 80);
      }
    }
    nextChar();

    setTimeout(close, ttl ?? rand(...CONFIG.intrusion.ttlMs));

    // Cleanup listeners when node dies
    const obs = new MutationObserver(() => {
      if (!win.isConnected) {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        obs.disconnect();
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });

    return win;
  }

  // ============================================================
  // 6. TAB VISIBILITY — intrusion mode
  // ============================================================
  function setupVisibility() {
    const origTitle = document.title;
    let away = false, titleTimer = 0, i = 0;

    const go = () => {
      if (away) return;
      away = true;
      if (!CONFIG.title.enabled) return;
      const cycle = [origTitle, ...CONFIG.title.messages];
      titleTimer = setInterval(() => { document.title = cycle[++i % cycle.length]; }, CONFIG.title.interval);
    };
    const back = () => {
      if (!away) return;
      away = false;
      clearInterval(titleTimer); titleTimer = 0;
      document.title = origTitle;
      if (!CONFIG.intrusion.enabled) return;
      const n = ri(CONFIG.intrusion.minOnReturn, CONFIG.intrusion.maxOnReturn);
      log(`SESSION RESUMED — ${n} PACKETS INTERCEPTED`, 'warn');
      for (let k = 0; k < n; k++) {
        setTimeout(() => createPopup(), k * rand(...CONFIG.intrusion.spawnGapMs));
      }
    };

    document.addEventListener('visibilitychange', () => {
      document.hidden ? go() : back();
    });
    window.addEventListener('blur',  go);
    window.addEventListener('focus', back);
  }

  // ============================================================
  // 7. CONSOLE / command terminal
  // ============================================================
  function setupConsole() {
    if (!CONFIG.console.enabled) return;
    const con = document.createElement('div');
    con.className = 'fxConsole';
    con.setAttribute('aria-hidden', 'true');
    con.innerHTML = `
      <div class="fxConHistory" id="fxConHistory" role="log" aria-live="polite"></div>
      <div class="fxConInput">
        <span class="fxConPrompt">sapi@node-7:~# </span>
        <input type="text" class="fxConField" autocomplete="off" spellcheck="false"
               aria-label="Terminal command" />
      </div>
    `;
    document.body.appendChild(con);

    const field = con.querySelector('.fxConField');
    const hist  = con.querySelector('#fxConHistory');
    let open = false, history = [], idx = -1;

    const print = (text, kind = '') => {
      const div = document.createElement('div');
      if (kind) div.className = `fx-${kind}`;
      div.textContent = text;
      hist.appendChild(div);
      hist.scrollTop = hist.scrollHeight;
    };

    const toggle = force => {
      open = (force === undefined) ? !open : !!force;
      con.classList.toggle('fxConOpen', open);
      con.setAttribute('aria-hidden', String(!open));
      if (open) setTimeout(() => field.focus(), 60);
      else field.blur();
    };

    const commands = {
      help: () => print('COMMANDS: help · scan · trace <ip> · destroy · deploy · matrix · fx on|off · clear · whoami · sudo', 'warn'),
      scan: () => {
        print('SCANNING...');
        log('SCAN INITIATED');
      },
      trace: ip => {
        if (!ip) { print('usage: trace <ip>', 'err'); return; }
        print(`TRACING ${ip}...`);
        for (let i = 0; i < 5; i++) {
          setTimeout(() => print(`  hop ${i+1}: 192.168.${ri(0,255)}.${ri(0,255)}  ${ri(1,999)}ms`), i * 220);
        }
      },
      destroy: () => { toggle(false); confirmDestroy(); },
      deploy:  () => { print('DEPLOYMENT CONFIRMED.'); log('DEPLOYMENT CONFIRMED'); },
      matrix:  () => { state.matrixCtl?.toggle?.(); print('MATRIX TOGGLED.'); },
      clear:   () => { hist.innerHTML = ''; },
      whoami:  () => print('sapi — synthetic assistive processing interface'),
      sudo:    () => print("sudo: permission denied. you're not that cool.", 'err'),
      fx: sub => {
        if (sub === 'off')      { document.body.classList.add('fxOff');    print('FX DISABLED.'); }
        else if (sub === 'on')  { document.body.classList.remove('fxOff'); print('FX ENABLED.');  }
        else                    { print('usage: fx on|off', 'err'); }
      }
    };

    field.addEventListener('keydown', e => {
      if (e.key === 'Escape') { toggle(false); return; }
      if (e.key === 'ArrowUp') {
        if (idx < history.length - 1) idx++;
        field.value = history[history.length - 1 - idx] || '';
        e.preventDefault();
      } else if (e.key === 'ArrowDown') {
        if (idx > 0) { idx--; field.value = history[history.length - 1 - idx] || ''; }
        else { idx = -1; field.value = ''; }
        e.preventDefault();
      } else if (e.key === 'Enter') {
        const raw = field.value.trim();
        if (!raw) return;
        history.push(raw); idx = -1;
        print(`sapi@node-7:~# ${raw}`);
        const [cmd, ...args] = raw.split(/\s+/);
        const fn = commands[cmd.toLowerCase()];
        if (fn) fn(...args);
        else print(`${cmd}: command not found`, 'err');
        field.value = '';
      }
    });

    window.addEventListener('keydown', e => {
      if (state.bootActive) return;
      const tgt = e.target;
      const inField = tgt && (tgt.tagName === 'INPUT' || tgt.tagName === 'TEXTAREA');
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        toggle(); e.preventDefault(); return;
      }
      if ((e.key === '`' || e.code === 'Backquote') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (inField && !open) return;
        toggle(); e.preventDefault();
      }
      if (e.key === 'Escape' && open) toggle(false);
    });
  }

  // ============================================================
  // 8. DESTROY MODAL
  // ============================================================
  function confirmDestroy() {
    if ($('.fxModal')) return;
    const modal = document.createElement('div');
    modal.className = 'fxModal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'Confirm self destruct');
    modal.innerHTML = `
      <div class="fxModalBox">
        <div class="fxModalTitle">⚠ WARNING ⚠</div>
        <div class="fxModalMsg">INITIATE SELF-DESTRUCT SEQUENCE?</div>
        <div class="fxModalMsg">ARE YOU SURE? [Y/N]</div>
        <div class="fxModalActions">
          <button type="button" class="danger" data-ans="y">Y</button>
          <button type="button" data-ans="n">N</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    requestAnimationFrame(() => modal.classList.add('fxOpen'));

    const close = () => {
      modal.classList.remove('fxOpen');
      setTimeout(() => modal.remove(), 200);
      window.removeEventListener('keydown', onKey);
    };
    const onKey = e => {
      if (e.key === 'Escape' || e.key.toLowerCase() === 'n') { log('DESTRUCT CANCELLED'); close(); }
      else if (e.key.toLowerCase() === 'y') { countdown(close); }
    };
    window.addEventListener('keydown', onKey);

    modal.addEventListener('click', e => {
      const btn = e.target.closest('[data-ans]');
      if (!btn) return;
      if (btn.dataset.ans === 'n') { log('DESTRUCT CANCELLED'); close(); }
      else countdown(close);
    });
  }

  function countdown(close) {
    const box = $('.fxModalBox');
    if (!box) return;
    box.innerHTML = `
      <div class="fxModalTitle">⚠ SELF DESTRUCT ⚠</div>
      <div class="fxModalMsg">COUNTDOWN</div>
      <div class="fxModalMsg"><span class="fxCountdown fx-err">10</span></div>
    `;
    const c = box.querySelector('.fxCountdown');
    let n = 10;
    const timer = setInterval(() => {
      n--;
      c.textContent = String(n);
      if (n <= 5 && !CONFIG.reducedMotion) document.body.classList.add('fxShake');
      if (n <= 0) {
        clearInterval(timer);
        document.body.classList.remove('fxShake');
        box.querySelector('.fxModalMsg:last-child').textContent = 'ABORTED BY SYSTEM';
        log('ABORTED BY SYSTEM', 'warn');
        setTimeout(close, 1500);
      }
    }, 500);
  }

  // ============================================================
  // 9. IDLE SCREENSAVER
  // ============================================================
  function setupIdle() {
    if (!CONFIG.idle.enabled) return;
    const overlay = document.createElement('div');
    overlay.className = 'fxIdle';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = `<pre class="fxIdleText">SYSTEM IDLE\nPRESS ANY KEY</pre><span class="fxSpinner">|</span>`;
    document.body.appendChild(overlay);

    const spinner = overlay.querySelector('.fxSpinner');
    const spinChars = '|/-\\';
    let t = 0, spinTick = 0, spin = 0;

    const reset = () => {
      clearTimeout(t);
      overlay.classList.remove('fxIdleOn');
      clearInterval(spinTick); spinTick = 0;
      t = setTimeout(activate, CONFIG.idle.timeoutMs);
    };
    const activate = () => {
      overlay.classList.add('fxIdleOn');
      spinTick = setInterval(() => {
        spinner.textContent = spinChars[++spin % spinChars.length];
      }, 120);
    };
    ['keydown','mousemove','mousedown','touchstart'].forEach(ev =>
      window.addEventListener(ev, reset, { passive: true })
    );
    reset();
  }

  // ============================================================
  // 10. KONAMI CODE
  // ============================================================
  function setupKonami() {
    if (!CONFIG.konami.enabled) return;
    const seq = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown',
                 'ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
    let i = 0;
    window.addEventListener('keydown', e => {
      const want = seq[i].toLowerCase();
      const got  = e.key.toLowerCase();
      if (got === want) {
        i++;
        if (i === seq.length) { triggerBreach(); i = 0; }
      } else {
        i = (got === seq[0].toLowerCase()) ? 1 : 0;
      }
    });
  }

  function triggerBreach() {
    if ($('.fxBreach')) return;
    const b = document.createElement('div');
    b.className = 'fxBreach';
    b.setAttribute('aria-hidden', 'true');
    b.innerHTML = `<div class="fxBreachText">SYSTEM BREACH</div>`;
    document.body.appendChild(b);
    log('SYSTEM BREACH DETECTED', 'err');
    setTimeout(() => {
      b.classList.add('fxFade');
      setTimeout(() => b.remove(), 400);
    }, 4600);
  }

  // ============================================================
  // 11. SOUND
  // ============================================================
  function setupSound() {
    if (!CONFIG.sound.enabled) return null;
    let ctx = null, muted = CONFIG.sound.defaultMuted;
    const btn = $('#sndToggle');

    const getCtx = () => {
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) ctx = new AC();
      }
      return ctx;
    };
    const beep = (freq = 440, dur = 0.04, type = 'square') => {
      if (muted || document.hidden) return;
      const c = getCtx(); if (!c) return;
      const o = c.createOscillator(), g = c.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.value = CONFIG.sound.volume;
      o.connect(g); g.connect(c.destination);
      o.start();
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
      o.stop(c.currentTime + dur);
    };
    const setMuted = m => {
      muted = m;
      if (btn) {
        btn.textContent = `SND: ${m ? 'OFF' : 'ON'}`;
        btn.setAttribute('aria-pressed', String(!m));
      }
    };
    setMuted(muted);

    if (btn) btn.addEventListener('click', () => { getCtx(); setMuted(!muted); });

    window.addEventListener('keydown', () => beep(ri(400, 900), 0.025));
    document.addEventListener('click', e => {
      if (e.target.closest('button')) beep(ri(300, 600), 0.04, 'triangle');
    });
    return { beep, setMuted };
  }

  // ============================================================
  // 12. LIVE STATS (status bar)
  // ============================================================
  function setupLiveStats() {
    if (!CONFIG.liveStats.enabled) return;
    const pwr    = $('#sysPwr');
    const uplink = $('#sysUplinkText');
    const pkts   = $('#sysPkts');
    let count = 0;

    setInterval(() => {
      if (document.hidden) return;
      if (pwr)  pwr.textContent  = `${ri(93, 99)}%`;
      count += ri(1, 9);
      if (pkts) pkts.textContent = `0x${count.toString(16).toUpperCase().padStart(4, '0')}`;
    }, CONFIG.liveStats.tickMs);

    setInterval(() => {
      if (document.hidden || !uplink) return;
      if (Math.random() < 0.28) {
        uplink.textContent = 'UNSTABLE';
        uplink.className = 'fx-warn';
        setTimeout(() => {
          uplink.textContent = 'NOMINAL';
          uplink.className = '';
        }, 1800);
      }
    }, CONFIG.liveStats.uplinkTickMs);
  }

  // ============================================================
  // 13. BUTTON INTERCEPTS + flavor + radar popups
  // ============================================================
  function setupButtons() {
    // Capture-phase intercepts: prevent script.js's generic handler from
    // misfiring on FX buttons and reroute DESTROY to the confirm modal.
    document.addEventListener('click', e => {
      const btn = e.target.closest('button');
      if (!btn) return;
      // DESTROY → modal. Only intercept the real dashboard button, not the
      // Y/N confirm buttons inside the modal itself.
      if (btn.classList.contains('danger') && !btn.closest('.fxModal')) {
        e.stopImmediatePropagation();
        e.preventDefault();
        confirmDestroy();
      }
    }, true);

    if (!CONFIG.buttonFeedback.enabled) return;

    const flavor = {
      'Rockets':              ['IGNITION SEQUENCE...', 'THRUST 87%', 'TRAJECTORY LOCKED'],
      'Smoke Screen':         ['DISPERSING AEROSOL...', 'VISIBILITY 0.2km'],
      'Booster Rockets':      ['AUX FUEL LINE OPEN', 'COMBUSTION STABLE'],
      'Science Cannon':       ['CHARGING CAPACITOR...', 'FIRING PARTICLE BEAM'],
      'Retrograde Torpedoes': ['ARMED', 'LOCK ACQUIRED'],
      'Placebo Button':       ['NOTHING HAPPENED. REALLY.'],
      'Deploy':               ['DEPLOYING PAYLOAD...', 'PAYLOAD AWAY']
    };

    // Bubble-phase: fires after script.js so we don't duplicate ENGAGED/DISENGAGED
    document.addEventListener('click', e => {
      const btn = e.target.closest('.buttonGroup button:not(.ch):not(.danger)');
      if (!btn) return;
      const extra = flavor[btn.getAttribute('value')];
      if (extra) extra.forEach((l, i) => setTimeout(() => log(l), 200 + i * 220));
    });

    // Radar tab clicks no longer spawn popups (user prefers a quiet dashboard)
  }

  // ============================================================
  // 14. PROJECTS PANEL
  // ============================================================
  const PROJECTS = [
    {
      name: 'Solvera', path: 'https://solveraca.com/',
      role: 'Client website',  stack: 'Next.js / Tailwind',
      summary: 'Solvera CA — business services / corporate site.'
    },
    {
      name: 'Indoor Golf Venture', path: 'https://indoor-golf-venture.vercel.app/',
      role: 'Venue landing page', stack: 'React / Vercel',
      summary: 'Indoor golf simulator venue — bookings & info.'
    },
    {
      name: '7i Audio', path: 'https://7i-audio.vercel.app/',
      role: 'Brand / e-commerce', stack: 'Next.js / Vercel',
      summary: '7i Audio — audio equipment brand site.'
    },
    {
      name: 'Pong District Manila', path: 'https://pong-district-manila.vercel.app/',
      role: 'Venue landing page', stack: 'Next.js / Tailwind',
      summary: 'Ping-pong bar & lounge in Manila.'
    },
    {
      name: '1197 Cafe', path: 'https://1197-cafe.vercel.app/',
      role: 'Cafe site',        stack: 'Next.js / Vercel',
      summary: '1197 Cafe — menu, hours, location.'
    },
    {
      name: "Chaya's Gift Shop", path: 'https://chayas-gift-shop.vercel.app/',
      role: 'Storefront',       stack: 'Next.js / Vercel',
      summary: "Chaya's Gift Shop — curated gift store."
    },
    {
      name: 'PC-Mon', path: 'https://pc-mon.vercel.app/',
      role: 'Service landing',  stack: 'Next.js / Tailwind',
      summary: 'PC-Mon — computer & laptop repair in San Pedro.'
    }
  ];

  function openProjects() {
    const existing = $('.fxProjectsWin');
    if (existing) { existing.remove(); return; }

    const win = document.createElement('div');
    win.className = 'fxWin fxProjectsWin';
    win.setAttribute('role', 'dialog');
    win.setAttribute('aria-label', 'SAPI projects');

    // Pin to bottom-left
    const w = Math.min(420, innerWidth * 0.92);
    win.style.width  = w + 'px';
    win.style.left   = '20px';
    win.style.bottom = '20px';
    win.style.top    = 'auto';
    win.style.right  = 'auto';
    win.style.zIndex = 200 + $$('.fxWin').length;

    const rows = PROJECTS.map((p, i) => {
      const host = p.path.replace(/^https?:\/\//, '').replace(/\/$/, '');
      const idx = String(i + 1).padStart(2, '0');
      return `<a class="fxProjectLine" href="${p.path}" target="_blank" rel="noopener" style="animation-delay:${i*35}ms"
                 data-name="${p.name}">
                <span class="idx">[${idx}]</span>&gt; ${p.name}
                <span class="host">// ${host}</span>
              </a>`;
    }).join('');

    win.innerHTML = `
      <div class="fxWinBar">
        <span class="fxWinTitle">MY PROJECTS</span>
        <button type="button" class="fxWinClose" aria-label="Close">x</button>
      </div>
      <div class="fxWinBody">${rows}</div>
      <div class="fxProjectsFooter">// ${PROJECTS.length} NODES &middot; CLICK TO MOUNT</div>
    `;

    document.body.appendChild(win);
    log(`PROJECTS INDEX LOADED — ${PROJECTS.length} NODES`);

    const close = () => win.remove();
    win.querySelector('.fxWinClose').addEventListener('click', close);
    win.addEventListener('click', e => {
      const a = e.target.closest('.fxProjectLine');
      if (!a) return;
      e.preventDefault();
      const proj = PROJECTS.find(p => p.name === a.dataset.name);
      log(`MOUNTING ${a.dataset.name.toUpperCase()}...`, 'warn');
      openProjectFrame(a.dataset.name, a.getAttribute('href'));
      openProjectSideLog(proj);
    });

    // Drag support (same logic as the TTY popups)
    const bar = win.querySelector('.fxWinBar');
    let drag = null;
    const bringFront = () => {
      const max = Math.max(200, ...$$('.fxWin').map(w => +w.style.zIndex || 100));
      win.style.zIndex = max + 1;
    };
    bar.addEventListener('mousedown', e => {
      if (e.target.closest('.fxWinClose')) return;
      const r = win.getBoundingClientRect();
      drag = { x: e.clientX, y: e.clientY, left: r.left, top: r.top };
      // swap bottom-anchoring for absolute top on first drag
      win.style.bottom = 'auto';
      win.style.top    = r.top + 'px';
      win.style.left   = r.left + 'px';
      bringFront();
      e.preventDefault();
    });
    win.addEventListener('mousedown', bringFront);
    const onMove = e => {
      if (!drag) return;
      win.style.left = (drag.left + e.clientX - drag.x) + 'px';
      win.style.top  = (drag.top  + e.clientY - drag.y) + 'px';
    };
    const onUp = () => { drag = null; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);

    const esc = e => {
      if (e.key === 'Escape') { close(); window.removeEventListener('keydown', esc); }
    };
    window.addEventListener('keydown', esc);
  }

  function openProjectFrame(name, url) {
    const existing = document.querySelector(`.fxFrameWin[data-url="${url}"]`);
    if (existing) {
      existing.style.zIndex = Math.max(300, ...$$('.fxWin, .fxFrameWin').map(w => +w.style.zIndex || 100)) + 1;
      return;
    }

    const win = document.createElement('div');
    win.className = 'fxWin fxFrameWin';
    win.dataset.url = url;
    win.setAttribute('role', 'dialog');
    win.setAttribute('aria-label', `${name} preview`);

    const w = Math.min(960, Math.max(560, innerWidth * 0.65));
    const h = Math.min(600, Math.max(380, innerHeight * 0.65));
    win.style.width  = w + 'px';
    win.style.height = h + 'px';
    win.style.left   = Math.max(20, (innerWidth  - w) / 2) + 'px';
    win.style.top    = Math.max(40, (innerHeight - h) / 2) + 'px';
    win.style.zIndex = Math.max(300, ...$$('.fxWin, .fxFrameWin').map(w => +w.style.zIndex || 100)) + 1;

    const host = url.replace(/^https?:\/\//, '').replace(/\/$/, '');
    win.innerHTML = `
      <div class="fxWinBar">
        <span class="fxWinTitle">tty — ${name} // ${host}</span>
        <span class="fxWinActions">
          <a class="fxWinNewTab" href="${url}" target="_blank" rel="noopener" title="Open in new tab">↗</a>
          <button type="button" class="fxWinClose" aria-label="Close">x</button>
        </span>
      </div>
      <div class="fxFrameWrap">
        <div class="fxFrameLoading">
          &gt; HANDSHAKE ${host}<br/>
          &gt; NEGOTIATING TLS...<br/>
          &gt; STREAMING<span class="fxCursor">▮</span>
        </div>
        <iframe class="fxFrame" src="${url}" title="${name}"
                referrerpolicy="no-referrer"
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-presentation"></iframe>
        <div class="fxFrameBlocked" hidden>
          &gt; CONNECTION REFUSED<br/>
          &gt; REMOTE HOST BLOCKED EMBED (X-Frame-Options / CSP)<br/><br/>
          <a href="${url}" target="_blank" rel="noopener" class="fxFrameOpenExt">↗ OPEN ${host} IN NEW TAB</a>
        </div>
      </div>
    `;
    document.body.appendChild(win);

    const iframe   = win.querySelector('.fxFrame');
    const loading  = win.querySelector('.fxFrameLoading');
    const blocked  = win.querySelector('.fxFrameBlocked');

    let loaded = false;
    iframe.addEventListener('load', () => {
      loaded = true;
      loading.style.display = 'none';
      // Note: we can't reliably detect X-Frame/CSP blocks cross-origin;
      // some browsers still fire 'load' on an empty error page.
      log(`${name.toUpperCase()} MOUNTED`);
    });
    // If nothing loaded within 8s, assume blocked
    setTimeout(() => {
      if (!loaded) {
        loading.style.display = 'none';
        iframe.style.display  = 'none';
        blocked.hidden = false;
        log(`${name.toUpperCase()} — EMBED BLOCKED`, 'err');
      }
    }, 8000);

    const close = () => {
      win.classList.add('fxWinClosing');
      setTimeout(() => win.remove(), 250);
      // Closing the frame also dismisses its side meta log
      document.querySelectorAll('.fxProjectSide').forEach(el => {
        el.classList.add('fxWinClosing');
        setTimeout(() => el.remove(), 250);
      });
    };
    win.querySelector('.fxWinClose').addEventListener('click', close);

    // Drag
    const bar = win.querySelector('.fxWinBar');
    let drag = null;
    const bringFront = () => {
      const max = Math.max(300, ...$$('.fxWin, .fxFrameWin').map(w => +w.style.zIndex || 100));
      win.style.zIndex = max + 1;
    };
    bar.addEventListener('mousedown', e => {
      if (e.target.closest('.fxWinClose, .fxWinNewTab')) return;
      const r = win.getBoundingClientRect();
      drag = { x: e.clientX, y: e.clientY, left: r.left, top: r.top };
      bringFront();
      // disable iframe during drag so it doesn't steal mouse events
      iframe.style.pointerEvents = 'none';
      e.preventDefault();
    });
    win.addEventListener('mousedown', bringFront);
    const onMove = e => {
      if (!drag) return;
      win.style.left = (drag.left + e.clientX - drag.x) + 'px';
      win.style.top  = (drag.top  + e.clientY - drag.y) + 'px';
    };
    const onUp = () => {
      if (drag) iframe.style.pointerEvents = '';
      drag = null;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  // Side console log describing the currently-opened project
  function openProjectSideLog(proj) {
    if (!proj) return;
    document.querySelectorAll('.fxProjectSide').forEach(el => el.remove());

    const host = proj.path.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const uptime = `${ri(3, 900)}d ${ri(0,23)}h ${ri(0,59)}m`;
    const latency = ri(18, 240);
    const key = hex(16);

    const lines = [
      { text: `[ ${proj.name.toUpperCase()} ]`, kind: 'ok' },
      { text: `HOST   ${host}` },
      { text: `TLS    1.3 · OK` },
      { text: `STATUS DEPLOYED`, kind: 'ok' },
      { text: `ROLE   ${proj.role}` },
      { text: `STACK  ${proj.stack}` },
      { text: `UPTIME ${uptime}` },
      { text: `PING   ${latency} ms` },
      { text: `KEY    0x${key}` },
      { text: `` },
      { text: `// ${proj.summary}` },
      { text: `` },
      { text: `>> READY_`, kind: 'warn' }
    ];

    const side = document.createElement('div');
    side.className = 'fxWin fxProjectSide';
    side.setAttribute('aria-hidden', 'true');

    const w = 300;
    side.style.width  = w + 'px';
    side.style.left   = '20px';
    side.style.bottom = '20px';
    side.style.top    = 'auto';
    side.style.right  = 'auto';
    side.style.zIndex = Math.max(300, ...$$('.fxWin').map(el => +el.style.zIndex || 100)) + 1;

    side.innerHTML = `
      <div class="fxWinBar">
        <span class="fxWinTitle">tty — ${proj.name} // META</span>
        <button type="button" class="fxWinClose" aria-label="Close">x</button>
      </div>
      <pre class="fxWinBody"><span class="fxSideText"></span><span class="fxCursor">▮</span></pre>
    `;
    document.body.appendChild(side);

    const body   = side.querySelector('.fxWinBody');
    const cursor = side.querySelector('.fxCursor');
    const speed  = CONFIG.intrusion.typeSpeedMs;
    let li = 0, ci = 0, cur = null;
    function step() {
      if (!side.isConnected || li >= lines.length) return;
      const d = lines[li];
      if (ci === 0) {
        cur = document.createElement('span');
        if (d.kind) cur.className = `fx-${d.kind}`;
        body.insertBefore(cur, cursor);
        if (li > 0) body.insertBefore(document.createTextNode('\n'), cur);
      }
      if (ci < d.text.length) {
        const chunk = speed === 0 ? d.text.length : 1;
        cur.textContent += d.text.slice(ci, ci + chunk);
        ci += chunk;
        setTimeout(step, speed + rand(0, 8));
      } else {
        li++; ci = 0;
        setTimeout(step, 80);
      }
    }
    step();

    // Close + drag (same pattern as the other popups)
    side.querySelector('.fxWinClose').addEventListener('click', () => side.remove());
    const bar = side.querySelector('.fxWinBar');
    let drag = null;
    bar.addEventListener('mousedown', e => {
      if (e.target.closest('.fxWinClose')) return;
      const r = side.getBoundingClientRect();
      drag = { x: e.clientX, y: e.clientY, left: r.left, top: r.top };
      side.style.right  = 'auto';
      side.style.bottom = 'auto';
      side.style.left   = r.left + 'px';
      side.style.top    = r.top + 'px';
      e.preventDefault();
    });
    window.addEventListener('mousemove', e => {
      if (!drag) return;
      side.style.left = (drag.left + e.clientX - drag.x) + 'px';
      side.style.top  = (drag.top  + e.clientY - drag.y) + 'px';
    });
    window.addEventListener('mouseup', () => { drag = null; });
  }

  function setupProjects() {
    $('#projectsBtn')?.addEventListener('click', openProjects);
    $('#ctrlProjectsBtn')?.addEventListener('click', openProjects);
  }

  // ============================================================
  // INIT
  // ============================================================
  function init() {
    state.matrixCtl = setupMatrix();
    state.soundCtl  = setupSound();
    setupLiveStats();
    setupScramble();
    setupGlitch();
    setupIdle();
    setupKonami();
    setupConsole();
    setupVisibility();
    setupButtons();
    setupProjects();
    runBoot();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.HackerFX = { CONFIG, createPopup, triggerBreach, confirmDestroy };
})();
