/* ═══════════════════════════════════════════════════════════
   Design Critic — app.js
   ─ Upload / drag-drop / preview
   ─ Claude Vision API call (runs inside Claude.ai)
   ─ Screen switching (no page scroll)
   ─ Animated result cards
   ═══════════════════════════════════════════════════════════ */

'use strict';

/* ─────────────────────────────────────
   DOM REFERENCES
───────────────────────────────────── */
const fileInput  = document.getElementById('fileInput');
const uzone      = document.getElementById('uzone');
const uIdle      = document.getElementById('uIdle');
const uPrev      = document.getElementById('uPrev');
const prevImg    = document.getElementById('prevImg');
const fnameEl    = document.getElementById('fnameEl');
const trigBtn    = document.getElementById('trigBtn');
const chgBtn     = document.getElementById('chgBtn');
const analyzeBtn = document.getElementById('analyzeBtn');
const errBox     = document.getElementById('errBox');
const uploadScr  = document.getElementById('uploadScreen');
const loaderScr  = document.getElementById('loaderScreen');
const resultsScr = document.getElementById('resultsScreen');
const resThumb   = document.getElementById('resThumb');
const resName    = document.getElementById('resName');
const resSummary = document.getElementById('resSummary');
const oNum       = document.getElementById('oNum');
const grid       = document.getElementById('grid');
const resetBtn   = document.getElementById('resetBtn');
const stepsEl    = document.querySelectorAll('.stp');

/* ─────────────────────────────────────
   STATE
───────────────────────────────────── */
let b64      = null;
let mime     = 'image/jpeg';
let filename = '';

/* ─────────────────────────────────────
   CARD CONFIG
   Each entry maps to a key in the JSON report
───────────────────────────────────── */
const CARDS = [
  { key: 'colors',     emoji: '🎨', title: 'الألوان',           sub: 'Color Analysis',        ca: '#d4ff4e' },
  { key: 'balance',    emoji: '🧱', title: 'التوازن',           sub: 'Balance & Composition', ca: '#4eaaff' },
  { key: 'hierarchy',  emoji: '👁️', title: 'التسلسل البصري',    sub: 'Visual Hierarchy',      ca: '#ff9f4e' },
  { key: 'typography', emoji: '🔤', title: 'الخطوط',            sub: 'Typography',             ca: '#c44eff' },
  { key: 'clarity',    emoji: '💡', title: 'قابلية الفهم',       sub: 'Clarity',               ca: '#4effd4' },
  { key: 'marketing',  emoji: '💰', title: 'التأثير التسويقي',   sub: 'Marketing Impact',      ca: '#ff4e6a' },
];

/* ─────────────────────────────────────
   SCREEN HELPERS
───────────────────────────────────── */
const show = el => el.classList.remove('hidden');
const hide = el => el.classList.add('hidden');

/* ─────────────────────────────────────
   UPLOAD — events
───────────────────────────────────── */
trigBtn.addEventListener('click',  e => { e.stopPropagation(); fileInput.click(); });
chgBtn.addEventListener('click',   e => { e.stopPropagation(); fileInput.click(); });
uzone.addEventListener('click',    () => { if (!b64) fileInput.click(); });
fileInput.addEventListener('change', () => { if (fileInput.files[0]) loadFile(fileInput.files[0]); });

// Drag & Drop
uzone.addEventListener('dragover',  e => { e.preventDefault(); uzone.classList.add('drag'); });
uzone.addEventListener('dragleave', () => uzone.classList.remove('drag'));
uzone.addEventListener('drop', e => {
  e.preventDefault();
  uzone.classList.remove('drag');
  const f = e.dataTransfer.files[0];
  if (f && f.type.startsWith('image/')) loadFile(f);
});

/* ─────────────────────────────────────
   LOAD FILE — validate + preview
───────────────────────────────────── */
function loadFile(file) {
  hideErr();

  if (file.size > 10 * 1024 * 1024) { showErr('الملف أكبر من 10MB.'); return; }
  if (!file.type.startsWith('image/')) { showErr('الرجاء رفع صورة فقط.'); return; }

  mime     = file.type || 'image/jpeg';
  filename = file.name;

  const reader = new FileReader();
  reader.onload = e => {
    b64 = e.target.result.split(',')[1];   // base64 payload only
    prevImg.src       = e.target.result;
    fnameEl.textContent = file.name;
    uIdle.classList.add('hidden');
    uPrev.classList.remove('hidden');
    analyzeBtn.disabled = false;
  };
  reader.readAsDataURL(file);
}

/* ─────────────────────────────────────
   ERROR HELPERS
───────────────────────────────────── */
function showErr(msg) {
  errBox.textContent = msg;
  errBox.classList.remove('hidden');
}
function hideErr() {
  errBox.classList.add('hidden');
}

/* ─────────────────────────────────────
   ANALYZE BUTTON
───────────────────────────────────── */
analyzeBtn.addEventListener('click', async () => {
  if (!b64) return;
  hideErr();

  // Switch to loader screen
  hide(uploadScr);
  show(loaderScr);
  animateSteps();

  try {
    const report = await fetchReport();
    renderResults(report);
  } catch (err) {
    console.error('Design Critic error:', err);
    hide(loaderScr);
    show(uploadScr);
    showErr('خطأ في التحليل: ' + (err.message || 'تعذّر الاتصال — تأكد من التشغيل داخل Claude.ai'));
  }
});

/* ─────────────────────────────────────
   LOADER STEP ANIMATION
───────────────────────────────────── */
function animateSteps() {
  stepsEl.forEach(s => s.classList.remove('on', 'done'));
  let i = 0;
  const iv = setInterval(() => {
    if (i > 0) {
      stepsEl[i - 1].classList.remove('on');
      stepsEl[i - 1].classList.add('done');
    }
    if (i < stepsEl.length) {
      stepsEl[i].classList.add('on');
      i++;
    } else {
      clearInterval(iv);
    }
  }, 950);
}

/* ─────────────────────────────────────
   CLAUDE API CALL
   Sends image as base64 → receives JSON report
   NOTE: API key is injected automatically inside Claude.ai.
         For external hosting, add: 'x-api-key': 'YOUR_KEY'
───────────────────────────────────── */
async function fetchReport() {
  const systemPrompt = `
أنت ناقد تصميم محترف. أعد JSON فقط بهذا الشكل الدقيق، بدون أي نص خارجه:
{
  "overall": 7,
  "summary": "ملخص التصميم بجملة أو جملتين.",
  "colors":     { "score": 6, "observation": "ملاحظة.", "suggestion": "اقتراح." },
  "balance":    { "score": 7, "observation": "ملاحظة.", "suggestion": "اقتراح." },
  "hierarchy":  { "score": 5, "observation": "ملاحظة.", "suggestion": "اقتراح." },
  "typography": { "score": 6, "observation": "ملاحظة.", "suggestion": "اقتراح." },
  "clarity":    { "score": 8, "observation": "ملاحظة.", "suggestion": "اقتراح." },
  "marketing":  { "score": 7, "observation": "ملاحظة.", "suggestion": "اقتراح." }
}
قواعد النقد: مباشر بدون مجاملة زائدة — اقتراحات عملية وقابلة للتطبيق — التقييم من 10.
  `.trim();

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mime, data: b64 } },
          { type: 'text',  text: 'حلّل هذا التصميم.' }
        ]
      }]
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `HTTP ${response.status}`);
  }

  const data = await response.json();
  const raw  = data.content.filter(x => x.type === 'text').map(x => x.text).join('');
  return JSON.parse(raw.replace(/```json|```/gi, '').trim());
}

/* ─────────────────────────────────────
   RENDER RESULTS
───────────────────────────────────── */
function renderResults(report) {
  // Header bar
  resThumb.src            = prevImg.src;
  resName.textContent     = filename;
  resSummary.textContent  = report.summary || '';

  const overall = Number(report.overall) || 0;
  oNum.textContent  = overall;
  oNum.style.color  = scoreColor(overall);

  // Build cards
  grid.innerHTML = '';
  CARDS.forEach(cfg => {
    const section = report[cfg.key];
    if (section) grid.appendChild(buildCard(cfg, section));
  });

  // Switch screen
  hide(loaderScr);
  show(resultsScr);

  // Trigger bar animations (needs two rAF ticks so CSS transition fires)
  requestAnimationFrame(() => requestAnimationFrame(() => {
    document.querySelectorAll('.bar-fill').forEach(b => {
      b.style.width = b.dataset.w + '%';
    });
  }));
}

/* ─────────────────────────────────────
   BUILD SINGLE CARD
───────────────────────────────────── */
function buildCard(cfg, section) {
  const score = Number(section.score) || 0;
  const color = scoreColor(score);

  const card = document.createElement('div');
  card.className = 'card';
  card.style.setProperty('--ca', cfg.ca);

  card.innerHTML = `
    <div class="card-hd">
      <div class="card-lbl">
        <span class="c-emoji">${cfg.emoji}</span>
        <div>
          <div class="c-title">${cfg.title}</div>
          <div class="c-sub">${cfg.sub}</div>
        </div>
      </div>
      <div class="c-score" style="color:${color}">
        ${score}<span class="c-denom">/10</span>
      </div>
    </div>

    <div class="bar-wrap">
      <div class="bar-fill" data-w="${score * 10}" style="background:${cfg.ca}"></div>
    </div>

    <p class="c-obs">${esc(section.observation || '')}</p>

    <div class="c-sug">
      <div class="sug-icon">↗</div>
      <p class="sug-txt">${esc(section.suggestion || '')}</p>
    </div>
  `;

  return card;
}

/* ─────────────────────────────────────
   RESET — back to upload screen
───────────────────────────────────── */
resetBtn.addEventListener('click', () => {
  b64 = null; mime = 'image/jpeg'; filename = '';

  fileInput.value  = '';
  prevImg.src      = '';
  fnameEl.textContent = '';

  uIdle.classList.remove('hidden');
  uPrev.classList.add('hidden');
  analyzeBtn.disabled = true;

  grid.innerHTML = '';
  hideErr();

  hide(resultsScr);
  show(uploadScr);
});

/* ─────────────────────────────────────
   UTILITIES
───────────────────────────────────── */

/** Map score 1-10 to a color */
function scoreColor(n) {
  if (n >= 8) return '#d4ff4e';   // lime  — excellent
  if (n >= 6) return '#4eaaff';   // blue  — good
  if (n >= 4) return '#ff9f4e';   // orange — average
  return '#ff4e6a';               // red   — poor
}

/** Escape HTML to prevent XSS from API response */
function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
