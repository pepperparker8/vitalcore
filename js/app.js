// ── NAVIGATION & MISC ────────────────────────────────────────────────────────
function switchTab(tab){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  const pg=$('pg-'+tab);
  if(pg){pg.classList.add('active');pg.classList.remove('page-fade');void pg.offsetWidth;pg.classList.add('page-fade');pg.scrollTop=0;}
  const nv=$('nav-'+tab);if(nv)nv.classList.add('active');
  _tab=tab;refreshActive();if(tab==='log')logAuto();
}
let _tab='today';
function refreshActive(){
  const tab=_tab;
  if(tab==='today')recalc();
  if(tab==='trends')renderTrendsTab();
  if(tab==='health')renderHealth();
  if(tab==='log'){if(ciKey()!==_ciKey)fillCI();renderBloodDisplay();renderInjuryDisplay();updMeasHist();renderFood();renderSleepBars();}
  if(tab==='insights'){renderCoach();renderStrategy();renderDigest();renderInsightHistory();showTodayInsight();}
}
function refreshAll(){recalc();refreshActive();updSyncStatus();}
function logGo(id){switchTab('log');setTimeout(()=>lgOpen(id),80);}
function go(id){const e=$(id);if(e)e.scrollIntoView({behavior:'smooth',block:'start'});}
function openLog(id){const e=$(id);if(e){document.querySelectorAll('.log-sec.open').forEach(x=>x.classList.remove('open'));e.classList.add('open');}}
function tlog(id){const e=$(id),was=e.classList.contains('open');document.querySelectorAll('.log-sec.open').forEach(x=>x.classList.remove('open'));if(!was){e.classList.add('open');setTimeout(()=>e.scrollIntoView({behavior:'smooth',block:'start'}),60);}}
function lgOpen(id){document.querySelectorAll('.log-sec.open').forEach(x=>x.classList.remove('open'));const e=$(id);e.classList.add('open');setTimeout(()=>e.scrollIntoView({behavior:'smooth',block:'start'}),60);}
let _toastT=null;
let _toastAct=null;
function showToast(msg,act){const t=$('toast');_toastAct=act&&act.fn||null;t.innerHTML=esc(msg)+(act?` <button class="toast-act" onclick="toastDo()">${esc(act.label)}</button>`:'');t.classList.toggle('act',!!act);t.classList.add('show');clearTimeout(_toastT);_toastT=setTimeout(()=>t.classList.remove('show','act'),act?7000:3200);}
function toastDo(){const f=_toastAct;_toastAct=null;$('toast').classList.remove('show','act');if(f)f();}
function recalc(){
  // v118 parallel run: the old readiness and Body are both recorded; the hero shows Body once TH.PARALLEL_DAYS of it exist (heroScore)
  recordReadiness(calcReadiness());recordBody(calcBody().score);stSnap();
  const s=heroScore();renderExTag();renderRing(s);renderGauges();renderZone(s);renderGreeting();
  renderWhy();renderPlan();renderSoreSug();renderReflect();renderHabits();renderMind();renderLogHead();renderTLoad();renderActList();updateInsNudge();
}
window.addEventListener('offline',()=>$('offlineBar').classList.add('show'));
window.addEventListener('online',()=>{$('offlineBar').classList.remove('show');if(_auth||(S().intervalsKey&&S().intervalsID)||S().polarKey)syncAll(false);updSyncStatus();});
window.addEventListener('resize',()=>{if(_tab==='trends')renderTrendsTab();});

// ── INIT ─────────────────────────────────────────────────────────────────────
let _day='';
function dayForms(){
  _day=td();
  $('hdrDate').textContent=new Date().toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'}).toUpperCase();
  $('wDate').value=td();$('bmDate').value=td();$('injDate').value=td();
  $('wDate').max=td();$('slDate').max=td();loadSleepFor(td());
}
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&_day&&_day!==td()){dayForms();fillCI();refreshAll();}});
function initUI(){
  dayForms();
  $('welcome').style.display=S().onboardingDone?'none':'flex';
  renderExGrid();fillCI();renderBloodDisplay();updMeasHist();renderFood();renderInjuryDisplay();renderInsightHistory();
  updSyncStatus();recalc();
}
async function init(){
  await persistLoad();
  loadAuth();
  initUI();
  setTimeout(()=>$('splash').classList.add('gone'),700);
  if(!navigator.onLine)$('offlineBar').classList.add('show');
  await handleAuthHash();
  // background refresh: cloud, Intervals.icu and Polar at most once an hour; straight away when back from the Polar sign-in
  const d=S(),back=/[?&]polar=connected/.test(location.search);
  if(back){history.replaceState(null,'',location.pathname);showToast('Polar connected ✓'+(d.polarKey?' — pulling your nights…':'. Enter the app key in Settings to pull your nights.'));}
  const stale=!d.lastAuto||Date.now()-d.lastAuto>3600e3;
  if((_auth||(d.intervalsKey&&d.intervalsID)||d.polarKey)&&(stale||back)&&navigator.onLine){Promise.resolve(syncAll(back)).then(()=>{const x=S();x.lastAuto=Date.now();save(x);
    if(back&&x.polarKey){const n=(x.polarNights||[]).length;showToast(`Polar connected ✓ · ${n?n+' night'+(n>1?'s':'')+' stored':'no nights yet'}`);}}).catch(()=>{});}
  else if(_auth&&Object.keys(d.pending).length)queuePush();
}
init();
if('serviceWorker' in navigator){
  const had=!!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange',()=>{if(had)$('updBar').classList.add('show');});
  window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(e=>console.log('SW:',e.message)));
}

// accessibility: make click-only elements keyboard/screen-reader operable
function a11y(){
  document.querySelectorAll('[onclick]:not(button):not(a):not(input):not(select):not([role])').forEach(e=>{e.setAttribute('role','button');e.tabIndex=0;});
  document.querySelectorAll('.nav-item').forEach(e=>{if(!e.getAttribute('aria-label'))e.setAttribute('aria-label',e.textContent.trim());});
  document.querySelectorAll('.log-hdr').forEach(h=>h.setAttribute('aria-expanded',h.parentElement.classList.contains('open')));
  document.querySelectorAll('.ci-btn:not([aria-label])').forEach(b=>b.setAttribute('aria-label',b.textContent.trim()||'option'));
  document.querySelectorAll('.vc-cv').forEach(c=>{if(!c.getAttribute('role')){c.setAttribute('role','img');}});
}
document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches&&e.target.matches('[role=button]:not(button)')){e.preventDefault();e.target.click();}});
let _a11yT=null;new MutationObserver(()=>{clearTimeout(_a11yT);_a11yT=setTimeout(a11y,250);}).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
a11y();
