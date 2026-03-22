/* ═══════════════════════════════════════════════════════════
   Creative Studio — app.js
   Design Critic (Canvas Analysis) + Brief Generator
   بدون أي API خارجي — يعمل على GitHub Pages مباشرة
   ═══════════════════════════════════════════════════════════ */

'use strict';

/* ══════════════════════════════════════
   TABS
══════════════════════════════════════ */
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
  });
});

/* ══════════════════════════════════════════════════════════
   ██████╗  █████╗ ██████╗ ████████╗   ██╗
   ██╔══██╗██╔══██╗██╔══██╗╚══██╔══╝  ███║
   ██████╔╝███████║██████╔╝   ██║      ██║
   ██╔═══╝ ██╔══██║██╔══██╗   ██║      ██║
   ██║     ██║  ██║██║  ██║   ██║      ██║
   ╚═╝     ╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝      ╚═╝
   DESIGN CRITIC
══════════════════════════════════════════════════════════ */
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

let imgElement = null, criticFilename = '';

const CRITIC_CARDS = [
  { key:'colors',     emoji:'🎨', title:'الألوان',          sub:'Color Analysis',        ca:'#d4ff4e' },
  { key:'balance',    emoji:'🧱', title:'التوازن',          sub:'Balance & Composition', ca:'#4eaaff' },
  { key:'hierarchy',  emoji:'👁️', title:'التسلسل البصري',   sub:'Visual Hierarchy',      ca:'#ff9f4e' },
  { key:'typography', emoji:'🔤', title:'الخطوط',           sub:'Typography',             ca:'#c44eff' },
  { key:'clarity',    emoji:'💡', title:'قابلية الفهم',      sub:'Clarity',               ca:'#4effd4' },
  { key:'marketing',  emoji:'💰', title:'التأثير التسويقي',  sub:'Marketing Impact',      ca:'#ff4e6a' },
];

const show    = el => el.classList.remove('hidden');
const hide    = el => el.classList.add('hidden');
const showErr = msg => { errBox.textContent = msg; errBox.classList.remove('hidden'); };
const hideErr = ()  => errBox.classList.add('hidden');
const clamp   = (v,a,b) => Math.min(Math.max(v,a),b);

/* Upload */
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

function loadFile(file) {
  hideErr();
  if (file.size > 10*1024*1024) { showErr('الملف أكبر من 10MB.'); return; }
  if (!file.type.startsWith('image/')) { showErr('الرجاء رفع صورة فقط.'); return; }
  criticFilename = file.name;
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    imgElement = img;
    prevImg.src = url;
    fnameEl.textContent = file.name;
    uIdle.classList.add('hidden');
    uPrev.classList.remove('hidden');
    analyzeBtn.disabled = false;
  };
  img.src = url;
}

analyzeBtn.addEventListener('click', () => {
  if (!imgElement) return;
  hideErr();
  hide(uploadScr); show(loaderScr);
  animateSteps();
  setTimeout(() => {
    try {
      renderResults(analyzeImage(imgElement));
    } catch(e) {
      console.error(e);
      hide(loaderScr); show(uploadScr);
      showErr('حدث خطأ أثناء التحليل.');
    }
  }, 2800);
});

function animateSteps() {
  stepsEl.forEach(s => s.classList.remove('on','done'));
  let i = 0;
  const iv = setInterval(() => {
    if (i > 0) { stepsEl[i-1].classList.remove('on'); stepsEl[i-1].classList.add('done'); }
    if (i < stepsEl.length) { stepsEl[i].classList.add('on'); i++; }
    else clearInterval(iv);
  }, 700);
}

/* ── Canvas Analysis Engine ── */
function analyzeImage(img) {
  const MAX = 200;
  const canvas = document.createElement('canvas');
  const scale = Math.min(MAX/img.width, MAX/img.height, 1);
  canvas.width = Math.floor(img.width*scale);
  canvas.height = Math.floor(img.height*scale);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const data = ctx.getImageData(0,0,canvas.width,canvas.height).data;

  const stats   = extractStats(data, canvas.width, canvas.height);
  const palette = extractPalette(data);
  const edges   = detectEdges(data, canvas.width, canvas.height);
  const balance = analyzeBalance(data, canvas.width, canvas.height);
  const { avgBrightness:bright, contrast, avgSaturation:sat } = stats;
  const colorCount = palette.uniqueColors;
  const aspectR = img.width / img.height;

  /* Colors */
  let cS=5,cO='',cSug='';
  if(colorCount<3){cS=4;cO='الألوان قليلة جداً مما يجعل التصميم باهتاً.';cSug='أضف لوناً ثانوياً (Accent) لإضفاء حيوية.'}
  else if(colorCount>20){cS=4;cO='فوضى لونية واضحة — عدد الألوان مبالغ فيه.';cSug='قلّل إلى 3-4 ألوان أساسية فقط.'}
  else if(colorCount<=6){cS=sat>0.4?8:7;cO='لوحة الألوان منسجمة ومحدودة باحترافية.';cSug=sat<0.3?'الألوان باهتة، ارفع التشبع.':'حافظ على هذا التناسق.'}
  else{cS=6;cO=`${colorCount} لوناً مختلفاً — مقبول لكن قابل للتبسيط.`;cSug='اعتمد لوحة ألوان موحدة من 3-5 ألوان.'}
  if(contrast<0.2){cS=Math.max(3,cS-2);cO+=' التباين منخفض جداً.';cSug='ارفع التباين بين النص والخلفية.'}
  else if(contrast>0.6){cS=Math.min(10,cS+1)}
  cS=clamp(cS,1,10);

  /* Balance */
  let bS=5,bO='',bSug='';
  const d=balance.diff;
  if(d<0.05){bS=9;bO='توازن بصري ممتاز — عناصر موزعة بتناسق.';bSug='أضف عنصراً بسيطاً لكسر التماثل وإضافة حركة.'}
  else if(d<0.12){bS=7;bO='توازن جيد مع انحراف بسيط.';bSug='وزّع العناصر الثقيلة بشكل أكثر تساوياً.'}
  else if(d<0.25){bS=5;bO='اختلال واضح في توزيع العناصر.';bSug='أعد توزيع العناصر أو أضف وزناً للجانب الخفيف.'}
  else{bS=3;bO='توزيع مختل بشكل ملحوظ — جانب ثقيل جداً.';bSug='أعد تصميم التخطيط مع مراعاة مبدأ التوازن.'}
  bS=clamp(bS,1,10);

  /* Hierarchy */
  let hS=5,hO='',hSug='';
  if(edges>0.15&&contrast>0.35){hS=8;hO='تسلسل بصري واضح — العين تنتقل بسلاسة.';hSug='تأكد أن العنصر الأهم يحظى بأكبر تباين.'}
  else if(edges>0.08){hS=6;hO='تسلسل مقبول يحتاج تحسيناً.';hSug='استخدم الحجم والتباين للتمييز بين الأولويات.'}
  else{hS=4;hO='تسلسل بصري ضعيف — يصعب تحديد أهم عنصر.';hSug='ضع Focal Point واضح يجذب العين أولاً.'}
  hS=clamp(hS,1,10);

  /* Typography */
  let tS=5,tO='',tSug='';
  if(contrast>0.5&&bright>0.3&&bright<0.8){tS=8;tO='تباين جيد يدعم قراءة النصوص بوضوح.';tSug='استخدم خطاً أو اثنين فقط لتجنب الفوضى.'}
  else if(bright<0.2||bright>0.9){tS=4;tO=bright<0.2?'التصميم مظلم — يصعب قراءة النصوص.':'التصميم فاتح جداً — تباين ضعيف.';tSug='اضبط السطوع وتأكد من تباين 4.5:1 على الأقل.'}
  else{tS=6;tO='مستوى وضوح مقبول.';tSug='استخدم أوزاناً مختلفة (Bold/Regular) للتمييز.'}
  tS=clamp(tS,1,10);

  /* Clarity */
  let clS=5,clO='',clSug='';
  const cx=(edges*0.5)+(colorCount/30*0.5);
  if(cx<0.2){clS=9;clO='تصميم بسيط وواضح — الرسالة تصل فوراً.';clSug='أضف تفاصيل خفيفة لمنع الإحساس بالفراغ.'}
  else if(cx<0.4){clS=7;clO='وضوح جيد مع تفاصيل مناسبة.';clSug='أبرز الرسالة الأساسية بشكل أوضح.'}
  else if(cx<0.6){clS=5;clO='تفاصيل كثيرة تشتت الانتباه.';clSug='بسّط وركز على رسالة واحدة.'}
  else{clS=3;clO='التصميم معقد جداً — الرسالة ضائعة.';clSug='أزل 50% من العناصر، "أقل هو أكثر".'}
  clS=clamp(clS,1,10);

  /* Marketing */
  let mS=5,mO='',mSug='';
  const goodRatio=(aspectR>=0.8&&aspectR<=1.2)||(aspectR>=1.7&&aspectR<=2.0)||(aspectR>=0.45&&aspectR<=0.6);
  const avg=(cS+bS+hS+clS)/4;
  if(avg>=7&&goodRatio){mS=8;mO='تصميم قوي بصرياً ومناسب للاستخدام التسويقي.';mSug='أضف CTA واضح لرفع معدل التحويل.'}
  else if(avg>=5){mS=6;mO='مقبول تسويقياً لكن يفتقر لعنصر الجذب.';mSug='أضف Unique Visual Hook يجعل التصميم لا يُنسى.'}
  else{mS=4;mO='تأثير تسويقي ضعيف.';mSug='أعد النظر في الرسالة البصرية الكاملة.'}
  if(!goodRatio){mS=Math.max(3,mS-1);mO+=' نسبة الأبعاد غير مثالية للمنصات الرقمية.';mSug='استخدم 1:1 للسوشيال، 16:9 للبانرات، 9:16 للستوري.'}
  mS=clamp(mS,1,10);

  const overall=Math.round(cS*0.2+bS*0.2+hS*0.2+tS*0.15+clS*0.15+mS*0.1);
  const summary=overall>=7?'تصميم قوي بصرياً مع أسس متينة. تعديلات صغيرة ستجعله احترافياً بالكامل.':overall>=5?'تصميم مقبول يحتاج تحسينات في عدة محاور.':'يحتاج إعادة نظر شاملة — المشاكل الأساسية تؤثر على فاعليته.';

  return {
    overall, summary,
    colors:    {score:cS,  observation:cO,  suggestion:cSug},
    balance:   {score:bS,  observation:bO,  suggestion:bSug},
    hierarchy: {score:hS,  observation:hO,  suggestion:hSug},
    typography:{score:tS,  observation:tO,  suggestion:tSug},
    clarity:   {score:clS, observation:clO, suggestion:clSug},
    marketing: {score:mS,  observation:mO,  suggestion:mSug},
  };
}

function extractStats(data,w,h){
  let sumB=0,sumS=0; const arr=[]; const total=w*h;
  for(let i=0;i<data.length;i+=4){
    const r=data[i]/255,g=data[i+1]/255,b=data[i+2]/255;
    const mx=Math.max(r,g,b),mn=Math.min(r,g,b);
    const br=(mx+mn)/2;
    const s=mx===mn?0:(br>0.5?(mx-mn)/(2-mx-mn):(mx-mn)/(mx+mn));
    sumB+=br; sumS+=s; arr.push(br);
  }
  const avgBrightness=sumB/total, avgSaturation=sumS/total;
  const variance=arr.reduce((s,b)=>s+Math.pow(b-avgBrightness,2),0)/total;
  return {avgBrightness, avgSaturation, contrast:Math.sqrt(variance)};
}
function extractPalette(data){
  const s=new Set();
  for(let i=0;i<data.length;i+=4){
    s.add(`${Math.floor(data[i]/32)},${Math.floor(data[i+1]/32)},${Math.floor(data[i+2]/32)}`);
  }
  return {uniqueColors:s.size};
}
function detectEdges(data,w,h){
  let e=0; const total=(w-1)*(h-1);
  for(let y=0;y<h-1;y++){for(let x=0;x<w-1;x++){
    const i=(y*w+x)*4, ir=(y*w+x+1)*4, ib=((y+1)*w+x)*4;
    if(((Math.abs(data[i]-data[ir])+Math.abs(data[i+1]-data[ir+1])+Math.abs(data[i+2]-data[ir+2])+Math.abs(data[i]-data[ib])+Math.abs(data[i+1]-data[ib+1])+Math.abs(data[i+2]-data[ib+2]))/6)>30)e++;
  }}
  return e/total;
}
function analyzeBalance(data,w,h){
  let L=0,R=0; const mid=Math.floor(w/2);
  for(let y=0;y<h;y++){for(let x=0;x<w;x++){
    const i=(y*w+x)*4;
    const wt=1-(data[i]*0.299+data[i+1]*0.587+data[i+2]*0.114)/255;
    x<mid?L+=wt:R+=wt;
  }}
  return {diff:Math.abs(L-R)/((L+R)||1)};
}

function renderResults(report){
  resThumb.src=prevImg.src; resName.textContent=criticFilename;
  resSummary.textContent=report.summary;
  const ov=Number(report.overall)||0;
  oNum.textContent=ov; oNum.style.color=scoreColor(ov);
  grid.innerHTML='';
  CRITIC_CARDS.forEach(cfg=>{if(report[cfg.key])grid.appendChild(buildCard(cfg,report[cfg.key]))});
  hide(loaderScr); show(resultsScr);
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    document.querySelectorAll('.bar-fill').forEach(b=>b.style.width=b.dataset.w+'%');
  }));
}
function buildCard(cfg,section){
  const score=Number(section.score)||0;
  const card=document.createElement('div');
  card.className='card'; card.style.setProperty('--ca',cfg.ca);
  card.innerHTML=`<div class="card-hd"><div class="card-lbl"><span class="c-emoji">${cfg.emoji}</span><div><div class="c-title">${cfg.title}</div><div class="c-sub">${cfg.sub}</div></div></div><div class="c-score" style="color:${scoreColor(score)}">${score}<span class="c-denom">/10</span></div></div><div class="bar-wrap"><div class="bar-fill" data-w="${score*10}" style="background:${cfg.ca}"></div></div><p class="c-obs">${esc(section.observation)}</p><div class="c-sug"><div class="sug-icon">↗</div><p class="sug-txt">${esc(section.suggestion)}</p></div>`;
  return card;
}
resetBtn.addEventListener('click',()=>{
  imgElement=null; criticFilename=''; fileInput.value=''; prevImg.src=''; fnameEl.textContent='';
  uIdle.classList.remove('hidden'); uPrev.classList.add('hidden');
  analyzeBtn.disabled=true; grid.innerHTML=''; hideErr();
  hide(resultsScr); show(uploadScr);
});
function scoreColor(n){return n>=8?'#d4ff4e':n>=6?'#4eaaff':n>=4?'#ff9f4e':'#ff4e6a'}
function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}

/* ══════════════════════════════════════════════════════════
   ██████╗  █████╗ ██████╗ ████████╗   ██████╗
   ██╔══██╗██╔══██╗██╔══██╗╚══██╔══╝  ╚════██╗
   ██████╔╝███████║██████╔╝   ██║       █████╔╝
   ██╔═══╝ ██╔══██║██╔══██╗   ██║      ██╔═══╝
   ██║     ██║  ██║██║  ██║   ██║      ███████╗
   ╚═╝     ╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝      ╚══════╝
   BRIEF GENERATOR
══════════════════════════════════════════════════════════ */

/* ── بيانات المجالات والتصنيفات ── */
const DOMAINS = [
  {
    id:'identity', icon:'🎯', name:'هوية بصرية', count:'6 تصنيفات',
    subs:[
      {id:'logo',       icon:'✦', name:'شعار (Logo)'},
      {id:'brandbook',  icon:'📖', name:'دليل الهوية'},
      {id:'business',   icon:'🪪', name:'بطاقة أعمال'},
      {id:'letterhead', icon:'📄', name:'ورق رسمي'},
      {id:'stamp',      icon:'🔏', name:'ختم / طابع'},
      {id:'packaging',  icon:'📦', name:'تغليف منتج'},
    ]
  },
  {
    id:'social', icon:'📱', name:'سوشيال ميديا', count:'7 تصنيفات',
    subs:[
      {id:'post',       icon:'🖼️', name:'بوستر / Post'},
      {id:'story',      icon:'📲', name:'ستوري'},
      {id:'cover',      icon:'🖥️', name:'غلاف صفحة'},
      {id:'reel',       icon:'🎬', name:'ريلز / تيك توك'},
      {id:'highlight',  icon:'⭕', name:'Highlight Cover'},
      {id:'carousel',   icon:'🎠', name:'كاروسيل'},
      {id:'thumbnail',  icon:'🎯', name:'Thumbnail يوتيوب'},
    ]
  },
  {
    id:'branding', icon:'💼', name:'براندينج', count:'5 تصنيفات',
    subs:[
      {id:'campaign',   icon:'📣', name:'حملة إعلانية'},
      {id:'banner',     icon:'🏳️', name:'بانر / لافتة'},
      {id:'outdoor',    icon:'🏙️', name:'إعلان خارجي'},
      {id:'merch',      icon:'👕', name:'مرشنداز'},
      {id:'exhibition', icon:'🏛️', name:'تصميم معرض'},
    ]
  },
  {
    id:'digital', icon:'💻', name:'تصميم رقمي', count:'6 تصنيفات',
    subs:[
      {id:'ui',         icon:'📐', name:'UI تطبيق موبايل'},
      {id:'web',        icon:'🌐', name:'واجهة موقع'},
      {id:'dashboard',  icon:'📊', name:'Dashboard'},
      {id:'landing',    icon:'🎯', name:'Landing Page'},
      {id:'email',      icon:'📧', name:'Email Template'},
      {id:'prototype',  icon:'🔧', name:'Prototype'},
    ]
  },
  {
    id:'dev', icon:'⌨️', name:'برمجة', count:'5 تصنيفات',
    subs:[
      {id:'webapp',     icon:'🌐', name:'Web App'},
      {id:'mobileapp',  icon:'📱', name:'Mobile App'},
      {id:'api',        icon:'🔌', name:'API / Backend'},
      {id:'bot',        icon:'🤖', name:'بوت / أتمتة'},
      {id:'saas',       icon:'☁️', name:'SaaS'},
    ]
  },
  {
    id:'content', icon:'✍️', name:'كتابة محتوى', count:'5 تصنيفات',
    subs:[
      {id:'copywriting', icon:'💬', name:'كوبي رايتينج'},
      {id:'script',      icon:'🎙️', name:'سكريبت فيديو'},
      {id:'newsletter',  icon:'📰', name:'نشرة بريدية'},
      {id:'seo',         icon:'🔍', name:'محتوى SEO'},
      {id:'strategy',    icon:'🗺️', name:'استراتيجية محتوى'},
    ]
  },
  {
    id:'motion', icon:'🎬', name:'موشن وفيديو', count:'4 تصنيفات',
    subs:[
      {id:'motion2d',    icon:'✨', name:'موشن 2D'},
      {id:'motion3d',    icon:'🎲', name:'موشن 3D'},
      {id:'intro',       icon:'🎞️', name:'إنترو / أوترو'},
      {id:'ad',          icon:'📺', name:'إعلان فيديو'},
    ]
  },
  {
    id:'photo', icon:'📸', name:'تصوير', count:'4 تصنيفات',
    subs:[
      {id:'product',     icon:'📦', name:'تصوير منتجات'},
      {id:'portrait',    icon:'👤', name:'بورتريه'},
      {id:'event',       icon:'🎉', name:'تصوير فعاليات'},
      {id:'editing',     icon:'🖌️', name:'تعديل صور'},
    ]
  },
];

/* ── أسئلة لكل تصنيف رئيسي ── */
const DOMAIN_QUESTIONS = {
  identity: [
    {id:'brand',    label:'اسم العلامة التجارية',     type:'text',     placeholder:'مثال: Waslak'},
    {id:'activity', label:'طبيعة النشاط التجاري',     type:'text',     placeholder:'مثال: تطبيق توصيل طعام'},
    {id:'target',   label:'الفئة المستهدفة',           type:'text',     placeholder:'مثال: شباب 18-35 سنة'},
    {id:'style',    label:'الأسلوب المطلوب',           type:'select',   options:['حديث وعصري','كلاسيكي وراقٍ','بسيط وأنيق','جريء وجذاب','ودود وحيوي']},
    {id:'colors',   label:'ألوان مفضلة (اختياري)',     type:'text',     placeholder:'مثال: أزرق وأبيض'},
    {id:'notes',    label:'ملاحظات إضافية',            type:'textarea', placeholder:'أي تفاصيل أخرى مهمة...'},
  ],
  social: [
    {id:'brand',    label:'اسم الحساب / العلامة',     type:'text',     placeholder:'مثال: @mystore'},
    {id:'topic',    label:'موضوع المنشور',             type:'text',     placeholder:'مثال: عرض خصم 50%'},
    {id:'platform', label:'المنصة',                   type:'select',   options:['إنستقرام','تويتر/X','فيسبوك','تيك توك','لينكدإن','سناب شات']},
    {id:'tone',     label:'نبرة المحتوى',              type:'select',   options:['احترافي','ودود','مرح','ملهم','تعليمي']},
    {id:'goal',     label:'هدف المنشور',               type:'text',     placeholder:'مثال: زيادة المبيعات'},
    {id:'notes',    label:'ملاحظات',                   type:'textarea', placeholder:'تفاصيل إضافية...'},
  ],
  branding: [
    {id:'brand',    label:'اسم العلامة / الحملة',     type:'text',     placeholder:'مثال: حملة رمضان 2025'},
    {id:'product',  label:'المنتج أو الخدمة',         type:'text',     placeholder:'مثال: مطعم شاورما'},
    {id:'target',   label:'الجمهور المستهدف',         type:'text',     placeholder:'مثال: عائلات في الرياض'},
    {id:'message',  label:'الرسالة الأساسية',         type:'text',     placeholder:'مثال: أفضل شاورما بأقل سعر'},
    {id:'budget',   label:'نطاق الميزانية',           type:'select',   options:['أقل من 1000 ريال','1000-5000','5000-20000','أكثر من 20000']},
    {id:'notes',    label:'ملاحظات',                  type:'textarea', placeholder:'تفاصيل إضافية...'},
  ],
  digital: [
    {id:'app',      label:'اسم التطبيق / الموقع',    type:'text',     placeholder:'مثال: Waslak App'},
    {id:'function', label:'وظيفة التطبيق الأساسية',  type:'text',     placeholder:'مثال: طلب طعام من المطاعم'},
    {id:'users',    label:'المستخدمون المستهدفون',    type:'text',     placeholder:'مثال: مستخدمو الهاتف في الأردن'},
    {id:'screens',  label:'الشاشات المطلوبة',         type:'text',     placeholder:'مثال: تسجيل، رئيسية، سلة، دفع'},
    {id:'style',    label:'أسلوب التصميم',            type:'select',   options:['Minimal','Material Design','Glassmorphism','Neumorphism','Bold & Colorful']},
    {id:'notes',    label:'ملاحظات',                  type:'textarea', placeholder:'تفاصيل إضافية...'},
  ],
  dev: [
    {id:'project',  label:'اسم المشروع',              type:'text',     placeholder:'مثال: Waslak Platform'},
    {id:'function', label:'وظيفة المنصة الأساسية',   type:'text',     placeholder:'مثال: ربط المطاعم بالزبائن'},
    {id:'stack',    label:'تقنيات مفضلة',             type:'text',     placeholder:'مثال: React, Node.js, MongoDB'},
    {id:'users',    label:'عدد المستخدمين المتوقع',   type:'select',   options:['أقل من 100','100-1000','1000-10000','أكثر من 10000']},
    {id:'timeline', label:'المدة الزمنية',             type:'select',   options:['أسبوع','شهر','3 أشهر','6 أشهر','سنة']},
    {id:'notes',    label:'متطلبات خاصة',             type:'textarea', placeholder:'APIs، integrations، قيود...'},
  ],
  content: [
    {id:'brand',    label:'اسم العلامة / الشخص',     type:'text',     placeholder:'مثال: د. محمد الأحمد'},
    {id:'topic',    label:'موضوع المحتوى',            type:'text',     placeholder:'مثال: ريادة الأعمال'},
    {id:'platform', label:'المنصة المستهدفة',         type:'select',   options:['إنستقرام','تويتر/X','يوتيوب','لينكدإن','بودكاست','موقع إلكتروني']},
    {id:'tone',     label:'أسلوب الكتابة',            type:'select',   options:['رسمي','محادثاتي','ملهم','تعليمي','مرح']},
    {id:'goal',     label:'الهدف من المحتوى',         type:'text',     placeholder:'مثال: بناء سلطة معرفية'},
    {id:'notes',    label:'ملاحظات',                  type:'textarea', placeholder:'تفاصيل إضافية...'},
  ],
  motion: [
    {id:'brand',    label:'اسم العلامة',              type:'text',     placeholder:'مثال: Waslak'},
    {id:'message',  label:'الرسالة أو المحتوى',      type:'text',     placeholder:'مثال: إطلاق تطبيق جديد'},
    {id:'duration', label:'مدة الفيديو',              type:'select',   options:['5-10 ثوانٍ','15-30 ثانية','30-60 ثانية','1-2 دقيقة']},
    {id:'style',    label:'أسلوب الحركة',             type:'select',   options:['بسيط وأنيق','ديناميكي وسريع','سينمائي','مرح وكرتوني']},
    {id:'platform', label:'المنصة النهائية',          type:'select',   options:['إنستقرام','يوتيوب','تيك توك','إعلان تلفزيوني','عرض تقديمي']},
    {id:'notes',    label:'ملاحظات',                  type:'textarea', placeholder:'تفاصيل إضافية...'},
  ],
  photo: [
    {id:'brand',    label:'اسم العميل / العلامة',    type:'text',     placeholder:'مثال: مطعم البرج'},
    {id:'subject',  label:'موضوع التصوير',            type:'text',     placeholder:'مثال: منتجات الكافيه'},
    {id:'style',    label:'أسلوب التصوير',            type:'select',   options:['داكن وغامق (Moody)','فاتح ومشرق (Bright)','كلاسيكي','حديث وعصري','طبيعي']},
    {id:'usage',    label:'أين ستستخدم الصور؟',      type:'select',   options:['سوشيال ميديا','موقع إلكتروني','مطبوعات','إعلانات','الكل']},
    {id:'quantity', label:'عدد الصور المطلوبة',       type:'select',   options:['1-5','5-20','20-50','50+']},
    {id:'notes',    label:'ملاحظات',                  type:'textarea', placeholder:'زوايا معينة، إضاءة، خلفية...'},
  ],
};

/* ── قوائم للاقتراحات ── */
const NAME_PARTS = {
  identity: [['Vex','Nova','Ark','Zyn','Lumi','Aero','Flux','Kira','Solo','Plex'],['ia','ra','on','ex','ix','ly','co','io','al','us']],
  social:   [['Reach','Spark','Glow','Buzz','Hype','Vibe','Wave','Trend'],['Hub','Lab','Zone','Box','Spot','Feed']],
  branding: [['Bold','Prime','Apex','Core','Edge','Peak'],['Brand','Mark','Works','Studio','House','Agency']],
  digital:  [['App','Dash','Flow','Sync','Link','Path'],['ly','ify','io','hub','lab','tech']],
  dev:      [['Dev','Code','Build','Stack','Node','API'],['Pro','Labs','Works','Hub','Base','Core']],
  content:  [['Story','Voice','Write','Create','Media','Content'],['Lab','Studio','Hub','Works','Pro']],
  motion:   [['Motion','Anim','Pixel','Frame','Reel','Clip'],['Studio','Works','Lab','FX','Pro']],
  photo:    [['Lens','Shot','Frame','Click','Focus','Flash'],['Studio','Works','Lab','Pro','Art']],
};

const COLOR_PALETTES = {
  'حديث وعصري':    [{h:'#0F172A',n:'Midnight'},{h:'#6366F1',n:'Indigo'},{h:'#E2E8F0',n:'Silver'},{h:'#F59E0B',n:'Amber'}],
  'كلاسيكي وراقٍ': [{h:'#1C1917',n:'Charcoal'},{h:'#C9A84C',n:'Gold'},{h:'#F5F5F0',n:'Cream'},{h:'#78716C',n:'Stone'}],
  'بسيط وأنيق':    [{h:'#FFFFFF',n:'White'},{h:'#000000',n:'Black'},{h:'#E5E7EB',n:'Light Gray'},{h:'#374151',n:'Dark Gray'}],
  'جريء وجذاب':    [{h:'#DC2626',n:'Red'},{h:'#1D4ED8',n:'Blue'},{h:'#FAFAFA',n:'Off-White'},{h:'#111827',n:'Dark'}],
  'ودود وحيوي':    [{h:'#10B981',n:'Emerald'},{h:'#F59E0B',n:'Yellow'},{h:'#FFFFFF',n:'White'},{h:'#1F2937',n:'Ink'}],
  'default':        [{h:'#6366F1',n:'Indigo'},{h:'#EC4899',n:'Pink'},{h:'#FAFAFA',n:'Off-White'},{h:'#111827',n:'Dark'}],
};

const FONTS_MAP = {
  'حديث وعصري':    'Inter أو Satoshi للواجهات، Plus Jakarta Sans للعناوين',
  'كلاسيكي وراقٍ': 'Playfair Display للعناوين، Lora للنص، Cormorant للتفاصيل',
  'بسيط وأنيق':    'Helvetica Neue أو DM Sans، خط واحد بأوزان مختلفة',
  'جريء وجذاب':    'Montserrat Bold للعناوين، Open Sans للنص',
  'ودود وحيوي':    'Nunito أو Poppins، أوزان 400 و700',
  'default':        'Inter للواجهات، Noto Kufi Arabic للعربي',
};

const REFS_MAP = {
  identity:  ['Airbnb Brand Guidelines','Stripe Identity System','Linear App Branding','Notion Visual Identity'],
  social:    ['Apple Social Media Kit','Nike Instagram Feed','Spotify Campaign Graphics','Zara Visual Posts'],
  branding:  ['Coca-Cola Campaign 2024','Tesla Brand Standards','Apple Product Launch','Red Bull Marketing'],
  digital:   ['Linear App UI','Figma Interface Design','Notion App Design','Vercel Dashboard'],
  dev:       ['Stripe API Docs','GitHub Developer Portal','Vercel Platform','Railway.app'],
  content:   ['HubSpot Content Strategy','Buffer Social Content','Neil Patel SEO','Ann Handley Writing'],
  motion:    ['Apple Motion Graphics','Nike Ad Films','Spotify Animated Campaigns','Google Motion Design'],
  photo:     ['Apple Product Photography','Muji Studio Shots','VSCO Editorial Style','Kinfolk Magazine'],
};

/* ── State ── */
let selectedDomain = null, selectedSub = null;

/* ── Step 1: Domain Grid ── */
function renderDomains() {
  const dg = document.getElementById('domainGrid');
  dg.innerHTML = '';
  DOMAINS.forEach(d => {
    const card = document.createElement('div');
    card.className = 'domain-card';
    card.innerHTML = `<div class="domain-icon">${d.icon}</div><div class="domain-name">${d.name}</div><div class="domain-count">${d.count}</div>`;
    card.addEventListener('click', () => { selectedDomain = d; goToStep2(d); });
    dg.appendChild(card);
  });
}

function goToStep2(domain) {
  document.getElementById('step2Sub').textContent = `المجال: ${domain.name}`;
  const sg = document.getElementById('subGrid');
  sg.innerHTML = '';
  domain.subs.forEach(s => {
    const card = document.createElement('div');
    card.className = 'sub-card';
    card.innerHTML = `<div class="sub-icon">${s.icon}</div><div class="sub-name">${s.name}</div>`;
    card.addEventListener('click', () => { selectedSub = s; goToStep3(); });
    sg.appendChild(card);
  });
  hide(document.getElementById('step1'));
  show(document.getElementById('step2'));
}

function goToStep3() {
  const questions = DOMAIN_QUESTIONS[selectedDomain.id] || DOMAIN_QUESTIONS.identity;
  const fg = document.getElementById('formGrid');
  fg.innerHTML = '';
  questions.forEach(q => {
    const field = document.createElement('div');
    field.className = 'form-field';
    let input = '';
    if (q.type === 'text') {
      input = `<input type="text" id="q_${q.id}" placeholder="${q.placeholder||''}"/>`;
    } else if (q.type === 'textarea') {
      input = `<textarea id="q_${q.id}" placeholder="${q.placeholder||''}"></textarea>`;
    } else if (q.type === 'select') {
      input = `<select id="q_${q.id}">${q.options.map(o=>`<option>${o}</option>`).join('')}</select>`;
    }
    field.innerHTML = `<label>${q.label}</label>${input}`;
    fg.appendChild(field);
  });
  hide(document.getElementById('step2'));
  show(document.getElementById('step3'));
}

/* Back buttons */
document.getElementById('backToStep1').addEventListener('click', () => {
  hide(document.getElementById('step2')); show(document.getElementById('step1'));
});
document.getElementById('backToStep2').addEventListener('click', () => {
  hide(document.getElementById('step3')); show(document.getElementById('step2'));
});
document.getElementById('backToStep3').addEventListener('click', () => {
  hide(document.getElementById('step4')); show(document.getElementById('step1'));
});

/* ── Generate Brief ── */
document.getElementById('generateBtn').addEventListener('click', () => {
  const questions = DOMAIN_QUESTIONS[selectedDomain.id] || DOMAIN_QUESTIONS.identity;
  const answers = {};
  questions.forEach(q => {
    const el = document.getElementById('q_' + q.id);
    answers[q.id] = el ? el.value.trim() : '';
  });
  const brief = generateBrief(answers);
  renderBrief(brief);
});

function generateBrief(answers) {
  /* اقتراح اسم */
  const parts = NAME_PARTS[selectedDomain.id] || NAME_PARTS.identity;
  const p1 = parts[0][Math.floor(Math.random()*parts[0].length)];
  const p2 = parts[1][Math.floor(Math.random()*parts[1].length)];
  const brandInput = answers.brand || answers.project || answers.app || '';
  const suggestedName = brandInput || (p1 + p2);

  /* ألوان */
  const styleKey = answers.style || 'default';
  const palette = COLOR_PALETTES[styleKey] || COLOR_PALETTES['default'];

  /* خطوط */
  const fonts = FONTS_MAP[styleKey] || FONTS_MAP['default'];

  /* أمثلة */
  const refs = REFS_MAP[selectedDomain.id] || REFS_MAP.identity;

  /* وصف المشروع */
  const activity = answers.activity || answers.function || answers.topic || answers.message || answers.subject || 'غير محدد';
  const target   = answers.target || answers.users || answers.platform || 'عام';
  const goal     = answers.goal || 'تحقيق الأهداف التجارية';
  const notes    = answers.notes || '—';

  return { suggestedName, activity, target, goal, palette, fonts, refs, notes, styleKey };
}

function renderBrief(b) {
  document.getElementById('briefTypeLabel').textContent = `${selectedDomain.name} ← ${selectedSub.name}`;

  const rows = [
    { icon:'✦', key:'اسم المشروع المقترح', val: null, isName: true, name: b.suggestedName },
    { icon:'📋', key:'نوع العمل',           val: `${selectedDomain.name} — ${selectedSub.name}` },
    { icon:'🎯', key:'طبيعة النشاط',        val: b.activity },
    { icon:'👥', key:'الفئة المستهدفة',     val: b.target },
    { icon:'💡', key:'الهدف من المشروع',    val: b.goal },
    { icon:'🎨', key:'الألوان المقترحة',    val: null, isColors: true, palette: b.palette },
    { icon:'🔤', key:'الخطوط المقترحة',     val: b.fonts },
    { icon:'📌', key:'أمثلة مرجعية',        val: b.refs.join(' · ') },
    { icon:'📝', key:'ملاحظات إضافية',      val: b.notes },
  ];

  const out = document.getElementById('briefOutput');
  out.innerHTML = '';

  rows.forEach(row => {
    const div = document.createElement('div');
    div.className = 'brief-row';
    div.innerHTML = `<div class="brief-row-hd"><span class="brief-icon">${row.icon}</span><span class="brief-key">${row.key}</span></div>`;

    if (row.isName) {
      div.innerHTML += `<div class="proj-name-display">${esc(row.name)}</div>`;
    } else if (row.isColors) {
      const chips = row.palette.map(c =>
        `<div class="chip"><div class="chip-dot" style="background:${c.h}"></div><span class="chip-name">${c.h} · ${c.n}</span></div>`
      ).join('');
      div.innerHTML += `<div class="color-chips">${chips}</div>`;
    } else {
      div.innerHTML += `<div class="brief-val">${esc(row.val)}</div>`;
    }

    out.appendChild(div);
  });

  hide(document.getElementById('step3'));
  show(document.getElementById('step4'));
}

/* Copy & New */
document.getElementById('copyBrief').addEventListener('click', () => {
  const rows = document.querySelectorAll('.brief-row');
  let text = '═══ البريف الكامل ═══\n\n';
  rows.forEach(row => {
    const key = row.querySelector('.brief-key')?.textContent || '';
    const val = row.querySelector('.brief-val')?.textContent || row.querySelector('.proj-name-display')?.textContent || row.querySelector('.color-chips')?.textContent.trim() || '';
    text += `${key}:\n${val}\n\n`;
  });
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById('copyBrief');
    btn.textContent = '✅ تم النسخ!';
    setTimeout(() => btn.textContent = '📋 نسخ البريف', 2000);
  });
});

document.getElementById('newBrief').addEventListener('click', () => {
  selectedDomain = null; selectedSub = null;
  hide(document.getElementById('step4'));
  show(document.getElementById('step1'));
});

/* ── Init ── */
renderDomains();
