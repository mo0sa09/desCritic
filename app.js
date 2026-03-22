/* ═══════════════════════════════════════════════════════════
   Design Critic — app.js
   محرك تحليل بصري خالص — بدون أي API
   يستخدم Canvas API لاستخراج بيانات الصورة
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
let imgElement = null, filename = '';

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
const show     = el => el.classList.remove('hidden');
const hide     = el => el.classList.add('hidden');
const showErr  = msg => { errBox.textContent = msg; errBox.classList.remove('hidden'); };
const hideErr  = ()  => errBox.classList.add('hidden');
const clamp    = (v, min, max) => Math.min(Math.max(v, min), max);
const round1   = v => Math.round(v * 10) / 10;

/* ══════════════════════════════════════
   UPLOAD EVENTS
══════════════════════════════════════ */
trigBtn.addEventListener('click',  e => { e.stopPropagation(); fileInput.click(); });
chgBtn.addEventListener('click',   e => { e.stopPropagation(); fileInput.click(); });
uzone.addEventListener('click',    () => { if (!imgElement) fileInput.click(); });
fileInput.addEventListener('change', () => { if (fileInput.files[0]) loadFile(fileInput.files[0]); });

uzone.addEventListener('dragover',  e => { e.preventDefault(); uzone.classList.add('drag'); });
uzone.addEventListener('dragleave', () => uzone.classList.remove('drag'));
uzone.addEventListener('drop', e => {
  e.preventDefault(); uzone.classList.remove('drag');
  const f = e.dataTransfer.files[0];
  if (f && f.type.startsWith('image/')) loadFile(f);
});

/* ══════════════════════════════════════
   LOAD FILE
══════════════════════════════════════ */
function loadFile(file) {
  hideErr();
  if (file.size > 10 * 1024 * 1024) { showErr('الملف أكبر من 10MB.'); return; }
  if (!file.type.startsWith('image/')) { showErr('الرجاء رفع صورة فقط.'); return; }

  filename = file.name;
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    imgElement   = img;
    prevImg.src  = url;
    fnameEl.textContent = file.name;
    uIdle.classList.add('hidden');
    uPrev.classList.remove('hidden');
    analyzeBtn.disabled = false;
  };
  img.src = url;
}

/* ══════════════════════════════════════
   ANALYZE BUTTON
══════════════════════════════════════ */
analyzeBtn.addEventListener('click', () => {
  if (!imgElement) return;
  hideErr();
  hide(uploadScr);
  show(loaderScr);
  animateSteps();

  // تأخير بسيط لإظهار الـ loader
  setTimeout(() => {
    try {
      const report = analyzeImage(imgElement);
      renderResults(report);
    } catch (err) {
      console.error(err);
      hide(loaderScr);
      show(uploadScr);
      showErr('حدث خطأ أثناء التحليل.');
    }
  }, 2800);
});

/* ── Loader steps ── */
function animateSteps() {
  stepsEl.forEach(s => s.classList.remove('on', 'done'));
  let i = 0;
  const iv = setInterval(() => {
    if (i > 0) { stepsEl[i-1].classList.remove('on'); stepsEl[i-1].classList.add('done'); }
    if (i < stepsEl.length) { stepsEl[i].classList.add('on'); i++; }
    else clearInterval(iv);
  }, 700);
}

/* ══════════════════════════════════════
   محرك التحليل البصري
   يستخرج بيانات حقيقية من الصورة
══════════════════════════════════════ */
function analyzeImage(img) {
  /* ── رسم الصورة على canvas واستخراج pixel data ── */
  const MAX = 200; // نأخذ عينة بحجم 200x200 للسرعة
  const canvas = document.createElement('canvas');
  const scale  = Math.min(MAX / img.width, MAX / img.height, 1);
  canvas.width  = Math.floor(img.width  * scale);
  canvas.height = Math.floor(img.height * scale);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

  /* ── استخراج البيانات الأساسية ── */
  const stats      = extractStats(data, canvas.width, canvas.height);
  const colorPal   = extractPalette(data);
  const edgeScore  = detectEdges(data, canvas.width, canvas.height);
  const balance    = analyzeBalance(data, canvas.width, canvas.height);
  const brightness = stats.avgBrightness;
  const contrast   = stats.contrast;
  const saturation = stats.avgSaturation;
  const colorCount = colorPal.uniqueColors;
  const aspectR    = img.width / img.height;

  /* ══ 1. تحليل الألوان ══ */
  let colorScore = 5;
  let colorObs   = '';
  let colorSug   = '';

  if (colorCount < 3) {
    colorScore = 4;
    colorObs   = 'التصميم يستخدم عدداً قليلاً جداً من الألوان مما يجعله باهتاً.';
    colorSug   = 'أضف لوناً ثانوياً أو accent color لإضافة حيوية للتصميم.';
  } else if (colorCount > 20) {
    colorScore = 4;
    colorObs   = 'عدد الألوان كثير جداً ويخلق فوضى بصرية.';
    colorSug   = 'قلّل الألوان لـ 3-4 ألوان أساسية مع لون واحد للتمييز.';
  } else if (colorCount >= 3 && colorCount <= 6) {
    colorScore = saturation > 0.4 ? 8 : 7;
    colorObs   = 'لوحة الألوان منسجمة ومحدودة بشكل احترافي.';
    colorSug   = saturation < 0.3 ? 'الألوان باهتة قليلاً، ارفع التشبع لإضفاء حيوية.' : 'حافظ على هذا التناسق في باقي مواد التصميم.';
  } else {
    colorScore = 6;
    colorObs   = `التصميم يحتوي على ${colorCount} لوناً مختلفاً، وهو مقبول لكن يمكن تبسيطه.`;
    colorSug   = 'حاول اعتماد لوحة ألوان موحدة من 3-5 ألوان فقط.';
  }

  if (contrast < 0.2) {
    colorScore = Math.max(3, colorScore - 2);
    colorObs  += ' التباين بين الألوان منخفض جداً مما يضعف القراءة.';
    colorSug   = 'ارفع التباين بين النص والخلفية لتحسين وضوح المحتوى.';
  } else if (contrast > 0.6) {
    colorScore = Math.min(10, colorScore + 1);
  }
  colorScore = clamp(colorScore, 1, 10);

  /* ══ 2. التوازن ══ */
  let balanceScore = 5;
  let balanceObs   = '';
  let balanceSug   = '';

  const balDiff = balance.diff; // الفرق بين النصف الأيمن والأيسر
  if (balDiff < 0.05) {
    balanceScore = 9;
    balanceObs   = 'التوازن البصري ممتاز — العناصر موزعة بشكل متناسق.';
    balanceSug   = 'أضف عنصراً بصرياً خفيفاً لكسر التماثل وإضافة حركة.';
  } else if (balDiff < 0.12) {
    balanceScore = 7;
    balanceObs   = 'التوازن جيد مع انحراف بسيط نحو أحد الجانبين.';
    balanceSug   = 'وزّع العناصر الثقيلة بشكل أكثر تساوياً بين الجانبين.';
  } else if (balDiff < 0.25) {
    balanceScore = 5;
    balanceObs   = 'يوجد اختلال واضح في توزيع العناصر البصرية.';
    balanceSug   = 'أعد توزيع العناصر أو أضف وزناً بصرياً للجانب الخفيف.';
  } else {
    balanceScore = 3;
    balanceObs   = 'التوزيع البصري مختل بشكل ملحوظ — جانب ثقيل جداً مقابل الآخر.';
    balanceSug   = 'أعد تصميم تخطيط العناصر من الأساس مع مراعاة مبدأ التوازن.';
  }
  balanceScore = clamp(balanceScore, 1, 10);

  /* ══ 3. التسلسل البصري ══ */
  let hierScore = 5;
  let hierObs   = '';
  let hierSug   = '';

  // نقيّم بناءً على الـ edge density والـ contrast
  const edgeDensity = edgeScore;
  if (edgeDensity > 0.15 && contrast > 0.35) {
    hierScore = 8;
    hierObs   = 'التسلسل البصري واضح — العين تنتقل بسلاسة بين العناصر.';
    hierSug   = 'تأكد إن العنصر الأهم يحظى بأكبر قدر من التباين البصري.';
  } else if (edgeDensity > 0.08) {
    hierScore = 6;
    hierObs   = 'التسلسل البصري مقبول لكن يحتاج تحسيناً في ترتيب الأولويات.';
    hierSug   = 'استخدم الحجم والتباين للتمييز بين العناصر الأولية والثانوية.';
  } else {
    hierScore = 4;
    hierObs   = 'التسلسل البصري ضعيف — صعب تحديد أهم عنصر في التصميم.';
    hierSug   = 'ضع عنصراً رئيسياً واضحاً (Focal Point) يجذب العين أولاً.';
  }
  hierScore = clamp(hierScore, 1, 10);

  /* ══ 4. الخطوط (نقيّم بناءً على التباين والوضوح) ══ */
  let typoScore = 5;
  let typoObs   = '';
  let typoSug   = '';

  if (contrast > 0.5 && brightness > 0.3 && brightness < 0.8) {
    typoScore = 8;
    typoObs   = 'مستوى التباين جيد يدعم قراءة النصوص بوضوح.';
    typoSug   = 'تأكد من استخدام خط واحد أو اثنين فقط لتجنب الفوضى البصرية.';
  } else if (brightness < 0.2 || brightness > 0.9) {
    typoScore = 4;
    typoObs   = brightness < 0.2
      ? 'التصميم مظلم جداً مما يصعّب قراءة النصوص.'
      : 'التصميم فاتح جداً مما يقلل تباين النصوص.';
    typoSug   = 'اضبط سطوع الخلفية وتأكد من تباين كافٍ بين النص والخلفية (4.5:1 على الأقل).';
  } else {
    typoScore = 6;
    typoObs   = 'مستوى الوضوح مقبول لكن يمكن تحسينه.';
    typoSug   = 'استخدم أوزاناً مختلفة للخط (Bold/Regular) للتمييز بين العناوين والنصوص.';
  }
  typoScore = clamp(typoScore, 1, 10);

  /* ══ 5. قابلية الفهم ══ */
  let clarityScore = 5;
  let clarityObs   = '';
  let claritySug   = '';

  const complexityScore = (edgeDensity * 0.5) + (colorCount / 30 * 0.5);
  if (complexityScore < 0.2) {
    clarityScore = 9;
    clarityObs   = 'التصميم بسيط وواضح — الرسالة تصل بسرعة.';
    claritySug   = 'أضف تفاصيل بصرية خفيفة لمنع الإحساس بالفراغ.';
  } else if (complexityScore < 0.4) {
    clarityScore = 7;
    clarityObs   = 'التصميم واضح مع تفاصيل مناسبة.';
    claritySug   = 'احرص على إبراز الرسالة الأساسية بشكل أوضح.';
  } else if (complexityScore < 0.6) {
    clarityScore = 5;
    clarityObs   = 'التصميم فيه تفاصيل كثيرة تشتت الانتباه.';
    claritySug   = 'بسّط التصميم وركز على رسالة واحدة واضحة.';
  } else {
    clarityScore = 3;
    clarityObs   = 'التصميم معقد جداً — الرسالة ضائعة في الفوضى البصرية.';
    claritySug   = 'أزل 50% من العناصر وابدأ بمبدأ "أقل هو أكثر".';
  }
  clarityScore = clamp(clarityScore, 1, 10);

  /* ══ 6. التأثير التسويقي ══ */
  let mktScore = 5;
  let mktObs   = '';
  let mktSug   = '';

  // نسبة الأبعاد + قوة الألوان + الوضوح = تأثير تسويقي
  const isGoodRatio = (aspectR >= 0.8 && aspectR <= 1.2) ||
                      (aspectR >= 1.7 && aspectR <= 2.0) ||
                      (aspectR >= 0.45 && aspectR <= 0.6);

  const avgScore = (colorScore + balanceScore + hierScore + clarityScore) / 4;

  if (avgScore >= 7 && isGoodRatio) {
    mktScore = 8;
    mktObs   = 'التصميم قوي بصرياً ومناسب للاستخدام التسويقي.';
    mktSug   = 'أضف CTA واضح (زر أو نص دعوة للتفاعل) لرفع معدل التحويل.';
  } else if (avgScore >= 5) {
    mktScore = 6;
    mktObs   = 'التصميم مقبول تسويقياً لكن يفتقر لعنصر الجذب القوي.';
    mktSug   = 'أضف عنصراً مميزاً (Unique Visual Hook) يجعل التصميم لا يُنسى.';
  } else {
    mktScore = 4;
    mktObs   = 'التأثير التسويقي ضعيف — التصميم لن يحقق النتائج المطلوبة.';
    mktSug   = 'أعد النظر في الرسالة البصرية الكاملة وابدأ بتحديد الجمهور المستهدف.';
  }

  if (!isGoodRatio) {
    mktScore = Math.max(3, mktScore - 1);
    mktObs  += ' نسبة الأبعاد غير مثالية للمنصات الرقمية.';
    mktSug   = 'استخدم نسب أبعاد قياسية: 1:1 للسوشيال، 16:9 للبانرات، 9:16 للستوري.';
  }
  mktScore = clamp(mktScore, 1, 10);

  /* ══ التقييم العام ══ */
  const overall = Math.round(
    (colorScore * 0.2) +
    (balanceScore * 0.2) +
    (hierScore * 0.2) +
    (typoScore * 0.15) +
    (clarityScore * 0.15) +
    (mktScore * 0.1)
  );

  /* ══ الملخص العام ══ */
  const summaries = {
    high:   'تصميم قوي بصرياً مع أسس متينة. بعض التعديلات الصغيرة ستجعله احترافياً بالكامل.',
    mid:    'تصميم مقبول يحتاج تحسينات في عدة محاور. الأسس موجودة لكن التنفيذ يحتاج مراجعة.',
    low:    'التصميم يحتاج إعادة نظر شاملة. المشاكل الأساسية تؤثر على فاعليته البصرية والتسويقية.',
  };
  const summary = overall >= 7 ? summaries.high : overall >= 5 ? summaries.mid : summaries.low;

  return {
    overall,
    summary,
    colors:     { score: colorScore,   observation: colorObs,   suggestion: colorSug   },
    balance:    { score: balanceScore, observation: balanceObs, suggestion: balanceSug },
    hierarchy:  { score: hierScore,    observation: hierObs,    suggestion: hierSug    },
    typography: { score: typoScore,    observation: typoObs,    suggestion: typoSug    },
    clarity:    { score: clarityScore, observation: clarityObs, suggestion: claritySug },
    marketing:  { score: mktScore,     observation: mktObs,     suggestion: mktSug     },
  };
}

/* ══════════════════════════════════════
   دوال استخراج البيانات من الصورة
══════════════════════════════════════ */

/** إحصائيات أساسية: سطوع، تباين، تشبع */
function extractStats(data, w, h) {
  let sumBright = 0, sumSat = 0;
  const brightArr = [];
  const total = w * h;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i] / 255, g = data[i+1] / 255, b = data[i+2] / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const bright = (max + min) / 2;
    const sat    = max === min ? 0 : (bright > 0.5 ? (max-min)/(2-max-min) : (max-min)/(max+min));
    sumBright += bright;
    sumSat    += sat;
    brightArr.push(bright);
  }

  const avgBrightness = sumBright / total;
  const avgSaturation = sumSat / total;

  // حساب الـ contrast كانحراف معياري للسطوع
  const variance = brightArr.reduce((s, b) => s + Math.pow(b - avgBrightness, 2), 0) / total;
  const contrast = Math.sqrt(variance);

  return { avgBrightness, avgSaturation, contrast };
}

/** استخراج عدد الألوان الفريدة (بعد التجميع) */
function extractPalette(data) {
  const buckets = new Set();
  for (let i = 0; i < data.length; i += 4) {
    // نقسم كل channel على 32 للتجميع (quantization)
    const r = Math.floor(data[i]   / 32);
    const g = Math.floor(data[i+1] / 32);
    const b = Math.floor(data[i+2] / 32);
    buckets.add(`${r},${g},${b}`);
  }
  return { uniqueColors: buckets.size };
}

/** كشف الحواف (Edge Detection بسيط) */
function detectEdges(data, w, h) {
  let edgeCount = 0;
  const total = (w-1) * (h-1);

  for (let y = 0; y < h-1; y++) {
    for (let x = 0; x < w-1; x++) {
      const i  = (y * w + x) * 4;
      const ir = (y * w + x + 1) * 4;
      const ib = ((y+1) * w + x) * 4;

      const diffR = Math.abs(data[i] - data[ir]) + Math.abs(data[i] - data[ib]);
      const diffG = Math.abs(data[i+1] - data[ir+1]) + Math.abs(data[i+1] - data[ib+1]);
      const diffB = Math.abs(data[i+2] - data[ir+2]) + Math.abs(data[i+2] - data[ib+2]);

      if ((diffR + diffG + diffB) / 3 > 30) edgeCount++;
    }
  }
  return edgeCount / total;
}

/** تحليل التوازن: مقارنة النصف الأيمن بالأيسر */
function analyzeBalance(data, w, h) {
  let leftWeight = 0, rightWeight = 0;
  const mid = Math.floor(w / 2);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const lum = (data[i] * 0.299 + data[i+1] * 0.587 + data[i+2] * 0.114) / 255;
      // الوزن البصري = عكس السطوع (العناصر الداكنة أثقل بصرياً)
      const weight = 1 - lum;
      if (x < mid) leftWeight += weight;
      else          rightWeight += weight;
    }
  }

  const total = leftWeight + rightWeight;
  const diff  = Math.abs(leftWeight - rightWeight) / (total || 1);
  return { leftWeight, rightWeight, diff };
}

/* ══════════════════════════════════════
   RENDER RESULTS
══════════════════════════════════════ */
function renderResults(report) {
  resThumb.src           = prevImg.src;
  resName.textContent    = filename;
  resSummary.textContent = report.summary;

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
    <p class="c-obs">${esc(section.observation)}</p>
    <div class="c-sug">
      <div class="sug-icon">↗</div>
      <p class="sug-txt">${esc(section.suggestion)}</p>
    </div>`;
  return card;
}

/* ══════════════════════════════════════
   RESET
══════════════════════════════════════ */
resetBtn.addEventListener('click', () => {
  imgElement = null; filename = '';
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
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
