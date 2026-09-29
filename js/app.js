// ── NAVIGATION & MISC ────────────────────────────────────────────────────────
function switchTab(tab){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  const pg=$('pg-'+tab);
  if(pg){pg.classList.add('active');pg.classList.remove('page-fade');void pg.offsetWidth;pg.classList.add('page-fade');pg.scrollTop=0;}
  const nv=$('nav-'+tab);if(nv)nv.classList.add('active');
  _tab=tab;refreshActive();
}
let _tab='today';
function refreshActive(){
  const tab=_tab;
  if(tab==='today')recalc();
  if(tab==='wellbeing'){renderWeekBanner();renderBurnout();renderSleepBars();renderHRVSpark();requestAnimationFrame(()=>{renderTrends();renderWtChart();renderStrTrend();});}
  if(tab==='history'){renderCalendar();renderBests();renderWeekSum();}
  if(tab==='log'){renderBloodDisplay();renderInjuryDisplay();updMeasHist();renderSleepBars();}
  if(tab==='insights'){renderInsightHistory();showTodayInsight();}
}
function refreshAll(){recalc();refreshActive();updSyncStatus();}
function go(id){const e=$(id);if(e)e.scrollIntoView({behavior:'smooth',block:'start'});}
function openLog(id){const e=$(id);if(e)e.classList.add('open');}
function tlog(id){$(id).classList.toggle('open');}
function toggleWhy(id){$(id).classList.toggle('open');}
let _toastT=null;
function showToast(msg){const t=$('toast');t.textContent=msg;t.classList.add('show');clearTimeout(_toastT);_toastT=setTimeout(()=>t.classList.remove('show'),3200);}
function recalc(){
  const s=calcReadiness();renderRing(s);renderZone(s);renderGreeting();
  renderHabits();renderStreak();renderMind();renderQuick();renderWeekTrends();renderTLoad();renderActList();updateInsNudge();
}
window.addEventListener('offline',()=>$('offlineBar').classList.add('show'));
window.addEventListener('online',()=>{$('offlineBar').classList.remove('show');if(_auth)pushAll().catch(()=>{});updSyncStatus();});
window.addEventListener('resize',()=>{if(_tab==='wellbeing'){renderTrends();renderWtChart();renderStrTrend();}});

// ── INIT ─────────────────────────────────────────────────────────────────────
function initUI(){
  const now=new Date();
  $('hdrDate').textContent=now.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'}).toUpperCase();
  $('wDate').value=td();$('bmDate').value=td();$('injDate').value=td();
  $('wDate').max=td();
  $('welcome').style.display=S().onboardingDone?'none':'block';
  renderExGrid();fillCI();renderBloodDisplay();updMeasHist();renderInjuryDisplay();renderInsightHistory();
  updSyncStatus();recalc();
}
async function init(){
  await persistLoad();
  loadAuth();
  initUI();
  setTimeout(()=>$('splash').classList.add('gone'),700);
  if(!navigator.onLine)$('offlineBar').classList.add('show');
  await handleAuthHash();
  // background refresh: cloud + Intervals.icu at most once an hour
  const d=S();
  const stale=!d.lastAuto||Date.now()-d.lastAuto>3600e3;
  if((_auth||(d.intervalsKey&&d.intervalsID))&&stale&&navigator.onLine){d.lastAuto=Date.now();save(d);syncAll(false);}
  else if(_auth&&Object.keys(d.pending).length)queuePush();
}
init();
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(e=>console.log('SW:',e.message)));
