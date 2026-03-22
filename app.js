/* ═══════════════════════════════════════════════════════════
   Design Critic — app.js
   يستدعي /api/analyze (Vercel Serverless Function)
   الـ API key محفوظ على السيرفر — مش في المتصفح
   ═══════════════════════════════════════════════════════════ */

'use strict';

/* ── DOM ── */
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

/* ── State ── */
let b64 = null, mime = 'image/jpeg', filename = '';

/* ── Cards config ── */
const CARDS = [
  { key: 'colors',     emoji: '🎨', title: 'الألوان',          sub: 'Color Analysis',        ca: '#d4ff4e' },
  { key: 'balance',    emoji: '🧱', title: 'التوازن',          sub: 'Balance & Composition', ca: '#4eaaff' },
  { key: 'hierarchy',  emoji: '👁️', title: 'التسلسل البصري',   sub: 'Visual Hierarchy',      ca: '#ff9f4e' },
  { key: 'typography', emoji: '🔤', title: 'الخطوط',           sub: 'Typography',             ca: '#c44eff' },
  { key: 'clarity',    emoji: '💡', title: 'قابلية الفهم',      sub: 'Clarity',               ca: '#4effd4' },
  { key: 'marketing',  emoji: '💰', title: 'التأثير التسويقي',  sub: 'Marketing Impact',      ca: '#ff4e6a' },
];

/* ── Helpers ── */
const show = el => el.classList.remove('hidden');
const hide = el => el.classList.add('hidden');
const showErr = msg => { errBox.textContent = msg; errBox.classList.remove('hidden'); };
const hideErr = ()  => errBox.classList.add('hidden');

/* ══════════════════════════════════════
   UPLOAD EVENTS
══════════════════════════════════════ */
trigBtn.addEventListener('click',  e => { e.stopPropagation(); fileInput.click(); });
chgBtn.addEventListener('click',   e => { e.stopPropagation(); fileInput.click(); });
uzone.addEventListener('click',    () => { if (!b64) fileInput.click(); });
fileInput.addEventListener('change', () => { if (fileInput.files[0]) loadFile(fileInput.files[0]); });

uzone.addEventListener('dragover',  e => { e.preventDefault(); uzone.classList.add('drag'); });
uzone.addEventListener('dragleave', () => uzone.classList.remove('drag'));
uzone.addEventListener('drop', e => {
  e.preventDefault(); uzone.classList.remove('drag');
  const f = e.dataTransfer.files[0];
  if (f && f.type.startsWith('image/')) loadFile(f);
});

/* ══════════════════════════════════════
   LOAD FILE — validate + preview
══════════════════════════════════════ */
function loadFile(file) {
  hideErr();
  if (file.size > 10 * 1024 * 1024) { showErr('الملف أكبر من 10MB.'); return; }
  if (!file.type.startsWith('image/')) { showErr('الرجاء رفع صورة فقط.'); return; }

  mime = file.type || 'image/jpeg';
  filename = file.name;

  const reader = new FileReader();
  reader.onload = e => {
    b64 = e.target.result.split(',')[1];
    prevImg.src         = e.target.result;
    fnameEl.textContent = file.name;
    uIdle.classList.add('hidden');
    uPrev.classList.remove('hidden');
    analyzeBtn.disabled = false;
  };
  reader.readAsDataURL(file);
}

/* ══════════════════════════════════════
   ANALYZE
══════════════════════════════════════ */
analyzeBtn.addEventListener('click', async () => {
  if (!b64) return;
  hideErr();
  hide(uploadScr);
  show(loaderScr);
  animateSteps();

  try {
    const report = await fetchReport();
    renderResults(report);
  } catch (err) {
    console.error(err);
    hide(loaderScr);
    show(uploadScr);
    showErr('خطأ في التحليل: ' + (err.message || 'تعذّر الاتصال بالسيرفر.'));
  }
});

/* ── Loader step animation ── */
function animateSteps() {
  stepsEl.forEach(s => s.classList.remove('on', 'done'));
  let i = 0;
  const iv = setInterval(() => {
    if (i > 0) { stepsEl[i-1].classList.remove('on'); stepsEl[i-1].classList.add('done'); }
    if (i < stepsEl.length) { stepsEl[i].classList.add('on'); i++; }
    else clearInterval(iv);
  }, 950);
}

/* ══════════════════════════════════════
   FETCH REPORT
   يستدعي /api/analyze على Vercel
   السيرفر هو اللي يكلّم Anthropic بالـ key
══════════════════════════════════════ */
async function fetchReport() {
  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64: b64, mimeType: mime })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error || `HTTP ${response.status}`);
  }

  return response.json();
}

/* ══════════════════════════════════════
   RENDER RESULTS
══════════════════════════════════════ */
function renderResults(report) {
  resThumb.src           = prevImg.src;
  resName.textContent    = filename;
  resSummary.textContent = report.summary || '';

  const overall = Number(report.overall) || 0;
  oNum.textContent = overall;
  oNum.style.color = scoreColor(overall);

  grid.innerHTML = '';
  CARDS.forEach(cfg => {
    if (report[cfg.key]) grid.appendChild(buildCard(cfg, report[cfg.key]));
  });

  hide(loaderScr);
  show(resultsScr);

  requestAnimationFrame(() => requestAnimationFrame(() => {
    document.querySelectorAll('.bar-fill').forEach(b => b.style.width = b.dataset.w + '%');
  }));
}

/* ── Build single card ── */
function buildCard(cfg, section) {
  const score = Number(section.score) || 0;
  const card  = document.createElement('div');
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
      <div class="c-score" style="color:${scoreColor(score)}">${score}<span class="c-denom">/10</span></div>
    </div>
    <div class="bar-wrap">
      <div class="bar-fill" data-w="${score * 10}" style="background:${cfg.ca}"></div>
    </div>
    <p class="c-obs">${esc(section.observation || '')}</p>
    <div class="c-sug">
      <div class="sug-icon">↗</div>
      <p class="sug-txt">${esc(section.suggestion || '')}</p>
    </div>`;
  return card;
}

/* ══════════════════════════════════════
   RESET
══════════════════════════════════════ */
resetBtn.addEventListener('click', () => {
  b64 = null; mime = 'image/jpeg'; filename = '';
  fileInput.value = ''; prevImg.src = ''; fnameEl.textContent = '';
  uIdle.classList.remove('hidden');
  uPrev.classList.add('hidden');
  analyzeBtn.disabled = true;
  grid.innerHTML = '';
  hideErr();
  hide(resultsScr);
  show(uploadScr);
});

/* ── Utilities ── */
function scoreColor(n) {
  if (n >= 8) return '#d4ff4e';
  if (n >= 6) return '#4eaaff';
  if (n >= 4) return '#ff9f4e';
  return '#ff4e6a';
}
function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
