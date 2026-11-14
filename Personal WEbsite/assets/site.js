(() => {
'use strict';

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const REDUCED = document.documentElement.classList.contains("rm");
const CAN_HOVER = () => matchMedia("(hover: hover) and (pointer: fine) and (min-width: 769px)").matches;
const rand = (a, b) => Math.random() * (b - a) + a;
const ri = (a, b) => Math.floor(rand(a, b + 1));
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const inquiryForm = $("#inquiryForm");
const inquiryStatus = $("#inquiryStatus");

async function copyInquiryMessage(text){
  try{
    if (navigator.clipboard && window.isSecureContext){
      const copied = await Promise.race([
        navigator.clipboard.writeText(text).then(() => true),
        new Promise(resolve => setTimeout(() => resolve(false), 1200))
      ]);
      if (copied) return true;
    }
  }catch{}

  const field = document.createElement("textarea");
  field.value = text;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.opacity = "0";
  document.body.appendChild(field);
  field.select();
  let copied = false;
  try{ copied = document.execCommand("copy"); }catch{}
  field.remove();
  return copied;
}

function composeInquiry(){
  const f = new FormData(inquiryForm);
  const v = k => String(f.get(k) || "").trim();
  return [
    `Topic: ${v("topic")}`,
    `Name: ${v("name")}`,
    `Email: ${v("email")}`,
    v("company") ? `Company: ${v("company")}` : null,
    v("focus") ? `Service focus: ${v("focus")}` : null,
    "",
    v("message")
  ].filter(line => line !== null).join("\n");
}

inquiryForm.addEventListener("submit", e => e.preventDefault());

$$("[data-topic]").forEach(link => link.addEventListener("click", () => {
  const radio = $(`#inquiryForm input[name="topic"][value="${link.dataset.topic}"]`);
  if (radio) radio.checked = true;
}));

$("#inquirySend").addEventListener("click", e => {
  if (!inquiryForm.reportValidity()){
    e.preventDefault();
    return;
  }
  const message = composeInquiry();
  inquiryStatus.textContent = "Opening Messenger and copying your message…";
  copyInquiryMessage(message).then(copied => {
    inquiryStatus.textContent = copied
      ? "Copied. Paste your message into the Messenger chat and send it."
      : "Messenger opened. Copy your message below and paste it into the chat.";
  });
});

$("#year").textContent = new Date().getFullYear();

/* ================================================================
   AI Creatives player — items with data-src play video, others show a title card
   ================================================================ */
(() => {
  const items = $$(".cr-item");
  if (!items.length) return;
  const video = $("#crVideo"), card = $("#crCard"), bar = $("#crBar"), mute = $("#crMute");
  const CARD_MS = 6000;
  let current = 0, timer = 0;

  const runBar = ms => {
    bar.style.transition = "none";
    bar.style.width = "0%";
    void bar.offsetWidth;
    if (ms) { bar.style.transition = `width ${ms}ms linear`; bar.style.width = "100%"; }
  };

  function show(i, autoplay = true){
    clearTimeout(timer);
    current = (i + items.length) % items.length;
    items.forEach((el, n) => {
      el.classList.toggle("is-active", n === current);
      el.setAttribute("aria-current", n === current ? "true" : "false");
    });
    const item = items[current];
    $("#crTag").textContent = item.dataset.tag;
    $("#crTitle").textContent = item.querySelector(".cr-item-title").textContent;
    card.classList.remove("is-switch"); void card.offsetWidth; card.classList.add("is-switch");

    const src = item.dataset.src;
    if (src){
      card.hidden = true; video.hidden = false; mute.hidden = false;
      video.src = src;
      runBar(0);
      video.play().catch(() => {});
    } else {
      video.pause(); video.removeAttribute("src"); video.hidden = true; mute.hidden = true;
      card.hidden = false;
      if (autoplay && !REDUCED){ runBar(CARD_MS); timer = setTimeout(() => show(current + 1), CARD_MS); }
      else runBar(0);
    }
  }

  video.addEventListener("timeupdate", () => {
    if (video.duration) { bar.style.transition = "none"; bar.style.width = `${(video.currentTime / video.duration) * 100}%`; }
  });
  video.addEventListener("ended", () => show(current + 1));
  mute.addEventListener("click", () => {
    video.muted = !video.muted;
    mute.textContent = video.muted ? "MUTED" : "SOUND ON";
    mute.setAttribute("aria-pressed", String(!video.muted));
    mute.setAttribute("aria-label", video.muted ? "Unmute video" : "Mute video");
  });
  items.forEach((el, n) => el.addEventListener("click", () => show(n)));

  const io = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) show(current);
    else { clearTimeout(timer); video.pause(); runBar(0); }
  }, { threshold: 0.35 });
  io.observe($("#crScreen"));
})();

/* ================================================================
   Data
   ================================================================ */
const PROJECTS = [
  { name: "Leadly", img: "assets/projects/leadly.webp",               url: "https://leadly-KAMTEAM.vercel.app/",           role: "AI lead platform",   stack: "Next.js / Gemini AI", summary: "Leadly — an AI-powered B2B lead generation platform built for KAM Team. Prospectors describe their ideal client profile; Leadly queries live business sources, scores each match 0–100, and drafts personalised outreach emails ready to send from the Campaign Inbox. Settings let the team define their company positioning, target locations, and active products so the AI engine can refine results on every run." },
  { name: "Solvera", img: "assets/projects/solvera.webp",              url: "https://solveraca.com/",                       role: "Client website",     stack: "Next.js / Tailwind", summary: "Solvera CA — business services and corporate site." },
  { name: "Igneo Cafe", img: "assets/projects/igneo-cafe.webp",           url: "https://igneo-cafe.vercel.app/",               role: "Cafe / bar site",    stack: "React / Vite / Tailwind", summary: "Igneo Cafe — Mexican-inspired cafe and bar in Mandaluyong." },
  { name: "Indoor Golf Venture", img: "assets/projects/indoor-golf.webp",  url: "https://indoor-golf-venture.vercel.app/",      role: "Venue landing page", stack: "React / Vercel",     summary: "Indoor golf simulator venue — bookings and info." },
  { name: "7i Audio", img: "assets/projects/7i-audio.webp",             url: "https://7i-audio.vercel.app/",                 role: "Brand / e-commerce", stack: "Next.js / Vercel",   summary: "7i Audio — audio equipment brand site." },
  { name: "Pong District Manila", img: "assets/projects/pong-district.webp", url: "https://pong-district-manila.vercel.app/",     role: "Venue landing page", stack: "Next.js / Tailwind", summary: "Ping-pong bar and lounge in Manila." },
  { name: "1197 Cafe", img: "assets/projects/1197-cafe.webp",            url: "https://1197-cafe.vercel.app/",                role: "Cafe site",          stack: "Next.js / Vercel",   summary: "1197 Cafe — menu, hours and location." },
  { name: "Chaya's Gift Shop", img: "assets/projects/chayas-gift-shop.webp",    url: "https://chayas-gift-shop.vercel.app/",         role: "Storefront",         stack: "Next.js / Vercel",   summary: "Chaya's Gift Shop — a curated gift store." },
  { name: "PC-Mon", img: "assets/projects/pc-mon.webp",               url: "https://pc-mon.vercel.app/",                   role: "Service landing",    stack: "Next.js / Tailwind", summary: "PC-Mon — computer and laptop repair in San Pedro." },
  { name: "Lead Generator (N0%1#3)", label: "Lead generator — client confidential", role: "Lead generation", stack: "Private system", summary: "Confidential internal system — access restricted.", private: true },
  { name: "Payroll System (Q0%5^6$ 50%4!1#3)", label: "Payroll system — client confidential", role: "Payroll & compensation", stack: "Private system", summary: "Internal payroll system built for [REDACTED]. Automates salary computation, deductions, government contributions (SSS, PhilHealth, Pag-IBIG), and net pay calculation per pay period. Generates payslips and payroll summaries for management review — access restricted.", private: true },
  { name: "Inventory (S0%6^4#)", label: "Inventory system — client confidential", role: "Inventory management", stack: "Private system", summary: "Internal inventory system tracking stock levels, item movement, and reorder thresholds across [REDACTED] operations. Records incoming and outgoing items with timestamps and generates inventory reports for auditing — access restricted.", private: true },
  { name: "HRIS System (S0%6^4#)", label: "HRIS system — client confidential", role: "Human resources", stack: "Private system", summary: "Internal HRIS built for [REDACTED]. Centralises employee records, attendance tracking, leave management, and onboarding workflows. Provides HR with a single dashboard to monitor headcount, generate reports, and manage employee data across departments — access restricted.", private: true }
];

const PUBLIC_PROJECTS = PROJECTS.filter(p => !p.private);
const MARQUEE = ["Full-Stack Development", "Web Design", "Graphic Design", "SEO Optimization", "Security Auditing",
                 "Database Administration", "IP CCTV", "Hardware Diagnostics", "Network Monitoring", "Conversational AI",
                 "IT Training", "System Monitoring"];

const host = url => url.replace(/^https?:\/\//, "").replace(/\/$/, "");
const projectHost = p => p.private ? "ACCESS RESTRICTED" : host(p.url);
/* Private projects show a scrambled name for effect; screen readers get the clean `label` instead */
const a11yName = p => p.label || p.name;
const nameHTML = p => p.label
  ? `<span aria-hidden="true">${esc(p.name)}</span><span class="sr-only">${esc(p.label)}</span>`
  : esc(p.name);

/* ================================================================
   Render projects
   ================================================================ */
/* The list is pre-rendered in index.html so it's crawlable and works without JS;
   only build it here if that markup is missing. Keep both in sync with PROJECTS. */
const projectList = $("#projectList");
if (!projectList.children.length) projectList.innerHTML = PROJECTS.map((p, i) => {
  const n = String(i + 1).padStart(2, "0");
  return `<li class="reveal" style="--ry:60px;--dur:620ms;--delay:${(i % 2) * 120}ms">
    <article class="venture" data-i="${i}">
      <button type="button" class="proj-screen" aria-label="Preview ${esc(a11yName(p))}">
        ${p.img ? `<img class="ps-shot" src="${esc(p.img)}" alt="" loading="lazy" decoding="async" width="960" height="600">` : ""}
        <span class="ps-bar"><span>tty${n} — ${esc(projectHost(p))}</span><span class="ps-live${p.private ? " is-private" : ""}">${p.private ? "PRIVATE" : "LIVE"}</span></span>
        <span class="ps-num" aria-hidden="true">${n}</span>
        <span class="ps-name" data-final="${esc(p.name)}">${esc(p.name)}</span>
        <span class="ps-meta" aria-hidden="true">ROLE   ${esc(p.role)}\nSTACK  ${esc(p.stack)}\nSTATUS ${p.private ? "RESTRICTED" : "DEPLOYED"}</span>
        <span class="btn ps-cta" aria-hidden="true">${p.private ? "&gt; Restricted_" : "&gt; Mount_"}</span>
      </button>
      <div class="venture-row">
        <div><h3>${nameHTML(p)}</h3><p>${esc(p.summary)}</p></div>
        <div class="venture-meta">
          <p class="venture-year">Project ${n}</p>
          ${p.private
            ? `<button type="button" class="btn venture-outcome private-project-link" data-i="${i}" aria-label="${esc(a11yName(p))}: access restricted, show notice">Restricted</button>`
            : `<a class="btn venture-outcome" href="${esc(p.url)}" target="_blank" rel="noopener noreferrer">Visit ↗</a>`}
        </div>
      </div>
      <p class="venture-cat">${esc(p.role)} · ${esc(p.stack)}</p>
    </article>
  </li>`;
}).join("");

/* ================================================================
   Lenis smooth scroll (dynamic import so the page survives a CDN miss)
   ================================================================ */
let lenis = null;
let preloading = true;
window.scrollTo(0, 0);

import("https://cdn.jsdelivr.net/npm/lenis@1.3.19/dist/lenis.mjs").then(({ default: Lenis }) => {
  lenis = new Lenis({ smoothWheel: true });
  if (preloading) lenis.stop();
  function raf(t){ lenis.raf(t); requestAnimationFrame(raf); }
  requestAnimationFrame(raf);
}).catch(() => {});

function scrollToTarget(el){
  if (lenis) lenis.scrollTo(el, { duration: 1.2, offset: el === 0 ? 0 : -60 });
  else if (typeof el === "number") window.scrollTo({ top: el, behavior: REDUCED ? "auto" : "smooth" });
  else el.scrollIntoView({ behavior: REDUCED ? "auto" : "smooth" });
}
$$('a[href^="#"]').forEach(a => {
  a.addEventListener("click", e => {
    const id = a.getAttribute("href");
    const target = id === "#top" ? $("#top") : $(id);
    if (!target) return;
    e.preventDefault();
    closeMenu();
    scrollToTarget(id === "#top" ? 0 : target);
  });
});

/* ================================================================
   Text scramble (80's UI)
   ================================================================ */
const SCRAMBLE_CHARS = "!<>-_\\/[]{}=+*^?#01";
function scramble(el, finalText, duration = 700){
  if (REDUCED || !duration){ el.textContent = finalText; return; }
  const total = Math.max(finalText.length, 2);
  const start = performance.now();
  (function step(now){
    const p = Math.min(1, (now - start) / duration);
    const revealed = Math.floor(p * total);
    let out = "";
    for (let i = 0; i < total; i++){
      const ch = finalText[i] ?? "";
      out += (i < revealed || ch === " ") ? ch : SCRAMBLE_CHARS[ri(0, SCRAMBLE_CHARS.length - 1)];
    }
    el.textContent = out;
    if (p < 1) requestAnimationFrame(step);
    else el.textContent = finalText;
  })(performance.now());
}
$$(".nav-links a").forEach(a => {
  const t = a.textContent;
  a.addEventListener("mouseenter", () => scramble(a, t, 350));
});

/* ================================================================
   Marquee
   ================================================================ */
const once = MARQUEE.map(w => `<div class="marquee-item"><span class="marquee-word">${esc(w)}</span><span class="marquee-dot" aria-hidden="true">✱</span></div>`).join("");
$("#marqueeTrack").innerHTML = once + once.replace(/class="marquee-item"/g, 'class="marquee-item" aria-hidden="true"');

/* ================================================================
   Hero letters
   ================================================================ */
const REVEAL_DELAY = REDUCED ? 0 : 1700;
$$(".hero-name .nl").forEach(line => {
  const text = line.dataset.letters;
  const li = Number(line.dataset.line);
  line.innerHTML = [...text].map((c, j) =>
    `<span class="ch" style="transition-delay:${REVEAL_DELAY + li * 240 + j * 52}ms">${c}</span>`
  ).join("");
});

/* ================================================================
   Line splitting for section headings
   ================================================================ */
function splitLines(el){
  const text = el.dataset.text || el.textContent.trim().replace(/\s+/g, " ");
  el.dataset.text = text;
  el.textContent = "";
  const words = text.split(" ");
  const spans = words.map((w, i) => {
    const s = document.createElement("span");
    s.textContent = w;
    el.appendChild(s);
    if (i < words.length - 1) el.appendChild(document.createTextNode(" "));
    return s;
  });
  const lines = [];
  let top = null;
  spans.forEach(s => {
    const t = s.offsetTop;
    if (top === null || Math.abs(t - top) > 2){ lines.push([]); top = t; }
    lines[lines.length - 1].push(s.textContent);
  });
  el.textContent = "";
  lines.forEach((ws, i) => {
    const line = document.createElement("span");
    line.className = "line";
    const inner = document.createElement("span");
    inner.className = "line-inner";
    inner.style.transitionDelay = (i * 90) + "ms";
    inner.textContent = ws.join(" ");
    line.appendChild(inner);
    el.appendChild(line);
  });
  el.classList.add("is-split");
}
function restoreText(el){
  el.textContent = el.dataset.text;
  el.classList.add("is-done");
}

/* ================================================================
   KAM quote (word reveal)
   ================================================================ */
const kamQuote = $("#kamQuote");
const kamText = $("#kamText");
(() => {
  const words = kamText.textContent.trim().split(/\s+/);
  kamText.textContent = "";
  words.forEach((w, k) => {
    const s = document.createElement("span");
    s.className = "qw";
    s.textContent = w;
    s.style.transitionDelay = (k * 40) + "ms";
    kamText.appendChild(s);
    if (k < words.length - 1) kamText.appendChild(document.createTextNode(" "));
  });
  if (REDUCED) kamQuote.classList.add("play");
})();

/* ================================================================
   In-view observer (play once)
   ================================================================ */
const io = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const el = entry.target;
    io.unobserve(el);
    el.classList.add("in-view");
    if (el.classList.contains("split") && !REDUCED){
      const n = el.querySelectorAll(".line").length;
      setTimeout(() => restoreText(el), 950 + n * 90 + 100);
    }
    if (el.hasAttribute("data-scramble")) scramble(el, el.dataset.final, 800);
    if (el.hasAttribute("data-count")) scrambleNumber(el);
    if (el === kamQuote) kamQuote.classList.add("play");
  });
}, { threshold: 0 });

function scrambleNumber(el){
  const final = el.dataset.final;
  if (REDUCED) return;
  const start = performance.now(), dur = 900;
  (function step(now){
    const p = Math.min(1, (now - start) / dur);
    el.textContent = p < 1 ? final.replace(/\d/g, () => ri(0, 9)) : final;
    if (p < 1) requestAnimationFrame(step);
  })(performance.now());
}

$$("[data-scramble], [data-count]").forEach(el => { el.dataset.final = el.textContent.trim(); io.observe(el); });
$$("main .reveal").forEach(el => { if (!el.closest(".hero")) io.observe(el); });
io.observe(kamQuote);

const splitEls = $$(".split");
(document.fonts ? document.fonts.ready : Promise.resolve()).then(() => {
  splitEls.forEach(el => {
    if (REDUCED){ el.classList.add("is-split", "is-done"); return; }
    splitLines(el);
    io.observe(el);
  });
});
let rsT;
addEventListener("resize", () => {
  clearTimeout(rsT);
  rsT = setTimeout(() => {
    if (REDUCED) return;
    splitEls.forEach(el => { if (!el.classList.contains("in-view")) splitLines(el); });
  }, 150);
});

/* ================================================================
   Header glitch (80's UI)
   ================================================================ */
if (!REDUCED){
  const loop = () => {
    if (!document.hidden){
      const targets = $$(".sec-h.is-done, .hero-roles, .sig").filter(el => {
        const r = el.getBoundingClientRect();
        return r.bottom > 0 && r.top < innerHeight;
      });
      const el = targets[ri(0, targets.length - 1)];
      if (el){
        el.classList.add("fx-glitch");
        setTimeout(() => el.classList.remove("fx-glitch"), 320);
      }
    }
    setTimeout(loop, rand(3500, 8000));
  };
  setTimeout(loop, 5000);
}

/* ================================================================
   Matrix rain (80's UI)
   ================================================================ */
(() => {
  const canvas = $("#fxMatrix");
  if (REDUCED || !canvas) return;
  const ctx = canvas.getContext("2d");
  const chars = "01ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿABCDEF0123456789$#@%";
  const size = 14;
  let cols = [], w = 0, h = 0, raf = 0, last = 0;
  function resize(){
    w = canvas.width = innerWidth;
    h = canvas.height = innerHeight;
    cols = Array.from({ length: Math.ceil(w / size) }, () => Math.random() * h);
  }
  function draw(t){
    raf = requestAnimationFrame(draw);
    if (t - last < 50) return;
    last = t;
    ctx.fillStyle = "rgba(2, 10, 18, 0.12)";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#6df1ff";
    ctx.font = `${size}px "Share Tech Mono", monospace`;
    for (let i = 0; i < cols.length; i++){
      ctx.fillText(chars[ri(0, chars.length - 1)], i * size, cols[i]);
      cols[i] = (cols[i] > h && Math.random() > 0.975) ? 0 : cols[i] + size;
    }
  }
  resize();
  addEventListener("resize", resize);
  raf = requestAnimationFrame(draw);
  document.addEventListener("visibilitychange", () => {
    cancelAnimationFrame(raf);
    if (!document.hidden) raf = requestAnimationFrame(draw);
  });
})();

/* ================================================================
   Clock + scrolled header
   ================================================================ */
const pad = n => String(n).padStart(2, "0");
const sysTime = $("#sysTime");
function tickClock(){
  const d = new Date();
  sysTime.textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
tickClock();
setInterval(tickClock, 1000);

const header = $("#siteHeader");
const onScroll = () => header.classList.toggle("is-scrolled", scrollY > 40);
addEventListener("scroll", onScroll, { passive: true });
onScroll();

/* ================================================================
   Project cards: hover + mount window
   ================================================================ */
$$(".venture").forEach(card => {
  const name = card.querySelector(".ps-name");
  card.addEventListener("pointerenter", () => {
    if (!CAN_HOVER()) return;
    card.classList.add("is-hover");
    scramble(name, name.dataset.final, 420);
  });
  card.addEventListener("pointerleave", () => card.classList.remove("is-hover"));
  card.querySelector(".proj-screen").addEventListener("click", () => {
    mountProject(PROJECTS[Number(card.dataset.i)]);
  });
  const privateLink = card.querySelector(".private-project-link");
  if (privateLink) privateLink.addEventListener("click", () => mountProject(PROJECTS[Number(privateLink.dataset.i)]));
});
$("#heroProjects").addEventListener("click", openProjects);

let topZ = 200;
const bringFront = win => { win.style.zIndex = ++topZ; };

function closeWin(win){
  if (!win || !win.isConnected || win.classList.contains("is-closing")) return;
  win.classList.add("is-closing");
  setTimeout(() => {
    if (win.classList.contains("fx-privacy")) win.parentElement.remove();
    else win.remove();
  }, 250);
}

function makeDraggable(win, { onStart, onEnd } = {}){
  const bar = win.querySelector(".fx-win-bar");
  let drag = null;
  win.addEventListener("pointerdown", () => bringFront(win));
  bar.addEventListener("pointerdown", e => {
    if (e.target.closest("a, button")) return;
    const r = win.getBoundingClientRect();
    drag = { x: e.clientX, y: e.clientY, left: r.left, top: r.top };
    win.style.right = "auto";
    win.style.bottom = "auto";
    win.style.left = r.left + "px";
    win.style.top = r.top + "px";
    if (onStart) onStart();
    bar.setPointerCapture(e.pointerId);
  });
  bar.addEventListener("pointermove", e => {
    if (!drag) return;
    win.style.left = (drag.left + e.clientX - drag.x) + "px";
    win.style.top = Math.max(0, drag.top + e.clientY - drag.y) + "px";
  });
  const end = () => { if (drag && onEnd) onEnd(); drag = null; };
  bar.addEventListener("pointerup", end);
  bar.addEventListener("pointercancel", end);
}

addEventListener("keydown", e => {
  if (e.key !== "Escape") return;
  const top = $$(".fx-win:not(.is-closing)").sort((a, b) => (+b.style.zIndex) - (+a.style.zIndex))[0];
  if (!top) return;
  closeWin(top);
  if (top.classList.contains("fx-frame-win")) $$(".fx-side").forEach(closeWin);
});

function mountProject(p){
  if (p.private){ openPrivacyNotice(p); return; }
  openFrame(p);
  if (innerWidth >= 900) openSideLog(p);
}

function openPrivacyNotice(p){
  const existing = $(".fx-privacy:not(.is-closing)");
  if (existing){ bringFront(existing); return; }

  const backdrop = document.createElement("div");
  backdrop.className = "fx-privacy-backdrop";
  backdrop.style.zIndex = ++topZ;
  const win = document.createElement("div");
  win.className = "fx-win fx-privacy";
  win.setAttribute("role", "dialog");
  win.setAttribute("aria-modal", "true");
  win.setAttribute("aria-labelledby", "privacyNoticeTitle");
  win.setAttribute("data-lenis-prevent", "");
  win.innerHTML = `
    <div class="fx-win-bar">
      <span class="fx-win-title" id="privacyNoticeTitle">CONFIDENTIALITY &amp; PRIVACY NOTICE</span>
      <span class="fx-win-actions"><button type="button" aria-label="Close notice">x</button></span>
    </div>
    <div class="fx-privacy-body">
      <p class="fx-privacy-project">${nameHTML(p)} // PRIVATE NODE</p>
      <p>This program and all its contents are strictly confidential and intended only for authorized personnel. Unauthorized viewing, screen-sharing, recording, or distribution of this system is prohibited. All user activity is monitored to ensure security and compliance.</p>
      <p class="fx-privacy-disclaimer">This portfolio does not authenticate visitors or monitor their activity. Private system links and previews are intentionally omitted.</p>
      <p class="fx-privacy-status">&gt; ACCESS BLOCKED — NO PROJECT LINK OR PREVIEW IS AVAILABLE.</p>
    </div>
    <div class="fx-proj-foot">// RESTRICTED PROJECT · NOTICE ONLY</div>`;
  backdrop.appendChild(win);
  document.body.appendChild(backdrop);
  const closeButton = win.querySelector(".fx-win-actions button");
  closeButton.addEventListener("click", () => closeWin(win));
  backdrop.addEventListener("click", e => {
    if (e.target === backdrop) closeWin(win);
  });
  backdrop.addEventListener("keydown", e => {
    if (e.key === "Tab"){
      e.preventDefault();
      closeButton.focus();
    }
  });
  closeButton.focus({ preventScroll: true });
}

function openProjects(){
  const existing = $(".fx-projects:not(.is-closing)");
  if (existing){ closeWin(existing); return; }

  const win = document.createElement("div");
  win.className = "fx-win fx-projects";
  win.setAttribute("role", "dialog");
  win.setAttribute("aria-label", "Projects console");
  win.setAttribute("data-lenis-prevent", "");
  const edge = innerWidth < 640 ? 12 : 20;
  win.style.width = Math.min(440, innerWidth - edge * 2) + "px";
  win.style.left = edge + "px";
  win.style.bottom = edge + "px";
  bringFront(win);

  const rows = PROJECTS.map((p, i) => {
    const n = String(i + 1).padStart(2, "0");
    if (p.private){
      return `<button type="button" class="fx-proj-line fx-proj-line-button" data-i="${i}" aria-label="${esc(a11yName(p))}, access restricted" style="animation-delay:${i * 60}ms">` +
             `<span class="idx">[${n}]</span>&gt; ${esc(p.name)}<span class="host">// ACCESS RESTRICTED</span></button>`;
    }
    return `<a class="fx-proj-line" href="${esc(p.url)}" target="_blank" rel="noopener noreferrer" data-i="${i}" style="animation-delay:${i * 60}ms">` +
           `<span class="idx">[${n}]</span>&gt; ${esc(p.name)}<span class="host">// ${esc(projectHost(p))}</span></a>`;
  }).join("");

  win.innerHTML = `
    <div class="fx-win-bar">
      <span class="fx-win-title">MY PROJECTS</span>
      <span class="fx-win-actions"><button type="button" aria-label="Close projects">x</button></span>
    </div>
    <div class="fx-proj-body">
      <button type="button" class="fx-proj-cmd" aria-expanded="false" aria-controls="fxProjList">siedel@node-07:~$ <span class="fx-proj-typed"></span><span class="cursor">▮</span><span class="fx-proj-hint">[ click to run ]</span></button>
      <div class="fx-proj-list" id="fxProjList" hidden>${rows}</div>
    </div>
    <div class="fx-proj-foot">// ${PROJECTS.length} PROJECTS &middot; CLICK THE COMMAND TO LIST THEM</div>`;
  document.body.appendChild(win);

  const typed = win.querySelector(".fx-proj-typed");
  const cmdBtn = win.querySelector(".fx-proj-cmd");
  const list = win.querySelector(".fx-proj-list");
  const cmd = "ls /projects";
  [...cmd].forEach((c, i) => setTimeout(() => { typed.textContent += c; }, REDUCED ? 0 : i * 30));

  // Clicking the prompt "runs" ls /projects: toggles the project list open/closed
  cmdBtn.addEventListener("click", () => {
    const open = list.hidden;
    if (open) typed.textContent = cmd;            // finish typing if clicked mid-animation
    list.hidden = !open;
    cmdBtn.setAttribute("aria-expanded", String(open));
    win.classList.toggle("is-listed", open);
    if (open) list.querySelector(".fx-proj-line")?.focus({ preventScroll: true });
  });

  win.querySelector(".fx-win-actions button").addEventListener("click", () => closeWin(win));
  win.addEventListener("click", e => {
    const row = e.target.closest(".fx-proj-line");
    if (!row) return;
    e.preventDefault();
    mountProject(PROJECTS[Number(row.dataset.i)]);
  });
  makeDraggable(win);
  cmdBtn.focus({ preventScroll: true });
}

function openSideLog(p){
  $$(".fx-side").forEach(el => el.remove());
  const hx = n => Array.from({ length: n }, () => ri(0, 15).toString(16).toUpperCase()).join("");
  const lines = [
    { text: `[ ${p.name.toUpperCase()} ]`, kind: "ok" },
    { text: `HOST   ${projectHost(p)}` },
    { text: "TLS    1.3 · OK" },
    { text: "STATUS DEPLOYED", kind: "ok" },
    { text: `ROLE   ${p.role}` },
    { text: `STACK  ${p.stack}` },
    { text: `UPTIME ${ri(3, 900)}d ${ri(0, 23)}h ${ri(0, 59)}m` },
    { text: `PING   ${ri(18, 240)} ms` },
    { text: `KEY    0x${hx(16)}` },
    { text: "" },
    { text: `// ${p.summary}` },
    { text: "" },
    { text: ">> READY_", kind: "warn" }
  ];

  const side = document.createElement("div");
  side.className = "fx-win fx-side";
  side.setAttribute("aria-hidden", "true");
  side.style.width = "300px";
  side.style.right = "20px";
  side.style.bottom = "20px";
  bringFront(side);
  side.innerHTML = `
    <div class="fx-win-bar">
      <span class="fx-win-title">tty — ${esc(p.name)} // META</span>
      <span class="fx-win-actions"><button type="button" aria-label="Close meta log" tabindex="-1">x</button></span>
    </div>
    <pre class="fx-side-body"><span class="cursor">▮</span></pre>`;
  document.body.appendChild(side);
  side.querySelector(".fx-win-actions button").addEventListener("click", () => closeWin(side));
  makeDraggable(side);

  const body = side.querySelector(".fx-side-body");
  const cursor = body.querySelector(".cursor");
  const speed = REDUCED ? 0 : 18;
  let li = 0, ci = 0, cur = null;
  (function step(){
    if (!side.isConnected || li >= lines.length) return;
    const d = lines[li];
    if (ci === 0){
      if (li > 0) body.insertBefore(document.createTextNode("\n"), cursor);
      cur = document.createElement("span");
      if (d.kind) cur.className = `fx-${d.kind}`;
      body.insertBefore(cur, cursor);
    }
    if (ci < d.text.length){
      const chunk = speed ? 1 : d.text.length;
      cur.textContent += d.text.slice(ci, ci + chunk);
      ci += chunk;
      setTimeout(step, speed + rand(0, 8));
    } else {
      li++; ci = 0;
      setTimeout(step, speed ? 80 : 0);
    }
  })();
}

function openFrame(p){
  const existing = $(`.fx-frame-win[data-url="${CSS.escape(p.url)}"]:not(.is-closing)`);
  if (existing){ bringFront(existing); return; }

  const h = host(p.url);
  const win = document.createElement("div");
  win.className = "fx-win fx-frame-win";
  win.dataset.url = p.url;
  win.setAttribute("role", "dialog");
  win.setAttribute("aria-label", `${p.name} preview`);
  win.setAttribute("data-lenis-prevent", "");

  const ww = Math.min(960, innerWidth - 24);
  const wh = Math.min(620, Math.round(innerHeight * 0.78));
  win.style.width = ww + "px";
  win.style.height = wh + "px";
  win.style.left = Math.max(12, (innerWidth - ww) / 2 + ri(-24, 24)) + "px";
  win.style.top = Math.max(12, (innerHeight - wh) / 2 + ri(-16, 16)) + "px";
  win.style.zIndex = ++topZ;

  win.innerHTML = `
    <div class="fx-win-bar">
      <span class="fx-win-title">tty — ${esc(p.name)} // ${esc(h)}</span>
      <span class="fx-win-actions">
        <a href="${esc(p.url)}" target="_blank" rel="noopener noreferrer" title="Open in new tab" aria-label="Open in new tab">↗</a>
        <button type="button" aria-label="Close preview">x</button>
      </span>
    </div>
    <div class="fx-frame-wrap">
      <div class="fx-frame-loading">&gt; HANDSHAKE ${esc(h)}<br>&gt; NEGOTIATING TLS...<br>&gt; STREAMING<span class="cursor">▮</span></div>
      <iframe class="fx-frame" src="${esc(p.url)}" title="${esc(p.name)}" referrerpolicy="no-referrer"
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-presentation"></iframe>
    </div>
    <div class="fx-win-foot">
      <span>${esc(p.role)} · ${esc(p.stack)}</span>
      <a href="${esc(p.url)}" target="_blank" rel="noopener noreferrer">Blank preview? Open ${esc(h)} ↗</a>
    </div>`;
  document.body.appendChild(win);

  const iframe = win.querySelector(".fx-frame");
  iframe.addEventListener("load", () => { win.querySelector(".fx-frame-loading").style.display = "none"; });

  win.querySelector(".fx-win-actions button").addEventListener("click", () => {
    closeWin(win);
    $$(".fx-side").forEach(closeWin);
  });
  makeDraggable(win, {
    onStart: () => { iframe.style.pointerEvents = "none"; },
    onEnd: () => { iframe.style.pointerEvents = ""; }
  });
}

/* ================================================================
   Mobile menu
   ================================================================ */
const burger = $("#burger");
const menu = $("#mobileMenu");
const menuLinks = $$("a", menu);
const staggerMenu = () => menuLinks.forEach((a, i) => { a.style.transitionDelay = (120 + i * 60) + "ms"; });
staggerMenu();
function openMenu(){
  burger.classList.add("is-open"); menu.classList.add("is-open");
  burger.setAttribute("aria-expanded", "true"); burger.setAttribute("aria-label", "Close menu");
  menu.setAttribute("aria-hidden", "false");
  if (lenis) lenis.stop();
}
function closeMenu(){
  if (!menu.classList.contains("is-open")) return;
  burger.classList.remove("is-open"); menu.classList.remove("is-open");
  burger.setAttribute("aria-expanded", "false"); burger.setAttribute("aria-label", "Open menu");
  menu.setAttribute("aria-hidden", "true");
  menuLinks.forEach(a => { a.style.transitionDelay = "0ms"; });
  setTimeout(staggerMenu, 450);
  if (lenis && !preloading) lenis.start();
}
burger.addEventListener("click", () => menu.classList.contains("is-open") ? closeMenu() : openMenu());
addEventListener("keydown", e => { if (e.key === "Escape") closeMenu(); });

/* ================================================================
   Preloader (boot sequence) + hero sequencing
   ================================================================ */
const pre = $("#preloader");
const num = $("#plNum");
const boot = $("#plBoot");
const hero = $("#top");

function startHero(){
  if (hero.classList.contains("in-view")) return;
  // Hero delays are authored relative to page open; subtract time already elapsed so they stay in sync with the intro
  const lag = performance.now();
  const shift = d => Math.max(0, parseFloat(d) - lag) + "ms";
  $$(".line-inner, .ch", hero).forEach(el => { if (el.style.transitionDelay) el.style.transitionDelay = shift(el.style.transitionDelay); });
  $$(".reveal", hero).forEach(el => { const d = el.style.getPropertyValue("--delay"); if (d) el.style.setProperty("--delay", shift(d)); });
  const face = $(".hero-face", hero);
  if (face) face.style.transitionDelay = shift("2000ms");
  hero.classList.add("in-view");
  $$(".reveal", hero).forEach(el => el.classList.add("in-view"));
}
function finishPreload(){
  preloading = false;
  pre.classList.add("is-done");
  pre.setAttribute("aria-hidden", "true");
  document.documentElement.classList.remove("is-loading");
  if (lenis) lenis.start();
}

{
  // Phase A: BIOS boot · Phase B: website info streams + scrolls · Phase C: console pop-up burst
  // Whole intro ≈ 1.85s: 0.45 boot + 0.55 info + 0.3 pop-ups + 0.35 closing + 0.2 fade
  const T_A = 450, T_B = 550, T_C = 300, TOTAL = T_A + T_B + T_C;
  const POPS = 8, CLOSE_GAP = 25, CLOSE_MS = 180, FADE_MS = 200;
  const POP_AT = TOTAL + (POPS - 1) * CLOSE_GAP + CLOSE_MS;

  const BIOS = [
    "SAPI BIOS v4.7 (C) 1981-1989",
    "SYNTHETIC ASSISTIVE PROCESSING INTERFACE",
    "",
    "CPU: MOTOROLA 68000 @ 7.16MHz",
    "MEM: 65536 BYTES <ok>OK</ok>",
    "",
    "DETECTING DEVICES...",
    "  HDD 0: 20MB ST-225  <ok>OK</ok>",
    "  FDD 0: 5.25\" DSDD   <ok>OK</ok>",
    "  COM1: 2400 BAUD     <ok>OK</ok>",
    "  COM2: NC",
    "  LPT1: NC",
    "",
    "LOADING SAPI/KERNEL ........... <ok>OK</ok>",
    "MOUNTING /dev/root ............ <ok>OK</ok>",
    "STARTING NETWORK STACK ........ <ok>OK</ok>",
    "VERIFYING CREDENTIALS .........",
    "",
    ">> ACCESS GRANTED — WELCOME TO SAPI"
  ];

  const roles = $$(".hero-roles .line-inner").map(el => el.textContent.trim().toUpperCase());
  const INFO = [
    "",
    "<ac>&gt; LOADING OPERATOR PROFILE ...</ac>",
    "  NAME     SIEDEL JEREMY CABRALES",
    `  ROLES    ${esc(roles.slice(0, 3).join(" · "))}`,
    `           ${esc(roles.slice(3).join(" · "))}`,
    "  STATUS   <ok>AVAILABLE FOR PROJECTS</ok>",
    "",
    `<ac>&gt; MOUNTING /solve ............. ${String($$("#solveCarousel .solve-card").length).padStart(2, "0")} OK</ac>`
  ];
  $$("#solveCarousel .solve-card").forEach((card, i) => {
    INFO.push(`  [${String(i + 1).padStart(2, "0")}] ${esc(card.querySelector("h3").textContent.toUpperCase())} <ok>RESOLVED</ok>`);
  });
  INFO.push("", `<ac>&gt; MOUNTING /projects .......... ${String(PROJECTS.length).padStart(2, "0")} OK</ac>`);
  PROJECTS.forEach((p, i) => INFO.push(`  [${String(i + 1).padStart(2, "0")}] ${esc(p.name)} // ${esc(projectHost(p))} <ok>${p.private ? "PRIVATE" : "LIVE"}</ok>`));
  INFO.push(
    "",
    "<ac>&gt; LINKING KAM_TEAM ............ OK</ac>",
    "",
    "<ac>&gt; OPENING CHANNELS ...</ac>",
    "  TEL    0969 294 5637",
    "  MAIL   siedel.cabrales@proton.me",
    "  NET    LINKEDIN · FACEBOOK · INSTAGRAM · TIKTOK",
    "",
    "<ok>&gt;&gt; BOOT COMPLETE — LAUNCHING INTERFACE</ok>"
  );

  const LINES = [...BIOS, ...INFO];
  const at = LINES.map((_, i) => i < BIOS.length
    ? (i / BIOS.length) * T_A
    : T_A + ((i - BIOS.length) / INFO.length) * T_B);
  const fmt = l => l.replace(/<ok>(.*?)<\/ok>/g, '<span class="ok">$1</span>').replace(/<ac>(.*?)<\/ac>/g, '<span class="ac">$1</span>');

  boot.innerHTML = '<span class="cursor">▮</span>';
  const bootCursor = boot.firstChild;
  function printLine(l){
    const s = document.createElement("span");
    s.innerHTML = fmt(l) + "\n";
    boot.insertBefore(s, bootCursor);
    boot.scrollTop = boot.scrollHeight;
  }

  function popLines(){
    const p = PUBLIC_PROJECTS[ri(0, PUBLIC_PROJECTS.length - 1)];
    const hx = n => Array.from({ length: n }, () => ri(0, 15).toString(16).toUpperCase()).join("");
    const gens = [
      () => ({ text: `TRACE 192.168.${ri(0, 255)}.${ri(0, 255)} ... ${Math.random() > 0.2 ? "OK" : "TIMEOUT"}` }),
      () => { const v = ri(5, 100), f = Math.floor(v / 100 * 8); return { text: `DECRYPTING 0x${hx(4)} [${"█".repeat(f)}${"░".repeat(8 - f)}] ${v}%` }; },
      () => Math.random() > 0.35 ? { text: "ACCESS GRANTED", kind: "ok" } : { text: "ACCESS DENIED", kind: "err" },
      () => ({ text: `PORT ${[21, 22, 80, 443, 3389, 8080][ri(0, 5)]}: ${["OPEN", "FILTERED", "CLOSED"][ri(0, 2)]}` }),
      () => ({ text: `CHECKSUM: ${hx(8)}` }),
      () => ({ text: `MOUNT ${host(p.url)} ... OK`, kind: "ok" }),
      () => ({ text: `CONN ${["ESTABLISHED", "RESET", "REFUSED"][ri(0, 2)]} — ${ri(10, 999)}ms` }),
      () => ({ text: `KEY 0x${hx(16)}` })
    ];
    return Array.from({ length: ri(5, 9) }, () => gens[ri(0, gens.length - 1)]());
  }
  function bootPopup(k){
    const w = Math.min(innerWidth - 24, ri(250, 340));
    const win = document.createElement("div");
    win.className = "fx-win fx-boot-pop";
    win.setAttribute("aria-hidden", "true");
    win.style.width = w + "px";
    win.style.left = rand(12, Math.max(12, innerWidth - w - 12)) + "px";
    win.style.top = rand(12, Math.max(12, innerHeight - 190)) + "px";
    win.style.zIndex = 10 + k;
    win.innerHTML = `<div class="fx-win-bar"><span class="fx-win-title">tty0${ri(1, 9)} — sapi@node-${ri(2, 9)}</span><span class="fx-pop-x">x</span></div><pre class="fx-pop-body"></pre>`;
    pre.appendChild(win);
    const body = win.querySelector(".fx-pop-body");
    popLines().forEach((d, i) => setTimeout(() => {
      const s = document.createElement("span");
      if (d.kind) s.className = `fx-${d.kind}`;
      s.textContent = d.text + "\n";
      body.appendChild(s);
    }, i * 15));
  }

  const t0 = 0; // measure from navigation start so the intro ends ~2s after the page is opened
  let printed = 0, skipped = false, popsStarted = false;
  const heroTimer = setTimeout(startHero, REDUCED ? Math.max(0, POP_AT - performance.now()) : 0);
  const skip = () => { skipped = true; };
  addEventListener("keydown", skip, { once: true });
  pre.addEventListener("click", skip, { once: true });
  function tick(t){
    const el = skipped ? TOTAL : t - t0;
    num.textContent = Math.round(Math.min(1, el / TOTAL) * 100);
    while (printed < LINES.length && at[printed] <= el) printLine(LINES[printed++]);
    if (!popsStarted && el >= T_A + T_B){
      popsStarted = true;
      for (let k = 0; k < POPS; k++) setTimeout(() => bootPopup(k), skipped ? 0 : k * (T_C / POPS));
    }
    if (el < TOTAL) return requestAnimationFrame(tick);
    removeEventListener("keydown", skip);
    if (skipped){ clearTimeout(heroTimer); startHero(); }
    pre.classList.add("is-fading");
    // Close the console windows one by one, newest first, then pop the front page in
    setTimeout(() => {
      const wins = $$(".fx-boot-pop", pre).reverse();
      const gap = skipped ? 25 : CLOSE_GAP;
      wins.forEach((w, i) => setTimeout(() => w.classList.add("is-closing"), i * gap));
      setTimeout(() => {
        document.documentElement.classList.add("page-pop");
        pre.classList.add("is-popping");
        setTimeout(finishPreload, FADE_MS);
      }, Math.max(0, wins.length - 1) * gap + CLOSE_MS);
    }, skipped ? 60 : 0);
  }
  requestAnimationFrame(tick);
}
})();
