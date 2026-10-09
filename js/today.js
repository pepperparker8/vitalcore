// ── TODAY: the day browser (v129), evening reflection ────────
// Today can show a past day: the gauges, the factor rows, Your day and the sheets opened from them follow it
let _tdView=null;   // null = today; else a date within TH.DAY_BACK days
const tdDay=()=>_tdView&&daysAgo(_tdView)>0&&daysAgo(_tdView)<=TH.DAY_BACK?_tdView:td();
function dayGo(step){
  const n=Math.min(TH.DAY_BACK,Math.max(0,daysAgo(tdDay())-step));
  _tdView=n?dAgo(n):null;
  renderDayBar();renderRing(dayScore(tdDay()));renderGauges();renderYourDay();
}
const dayWd=dt=>new Date(dt+'T12:00:00').toLocaleDateString('en-GB',{weekday:'short'});
// the day bar's two lines: "Today", "Yesterday" or the weekday, and "Fri 9 Oct" (Today and the sheets opened from it)
const dayWords=dt=>{const n=daysAgo(dt);return[n===0?'Today':n===1?'Yesterday':new Date(dt+'T12:00:00').toLocaleDateString('en-GB',{weekday:'long'}),`${dayWd(dt)} ${fmtD(dt)}`];};
function renderDayBar(){
  const dt=tdDay(),n=daysAgo(dt),[a,b]=dayWords(dt);
  $('dayLbl').textContent=a;
  $('dayDate').textContent=b;
  $('dayNext').classList.toggle('off',n===0);$('dayNext').disabled=n===0;
  $('dayPrev').classList.toggle('off',n>=TH.DAY_BACK);$('dayPrev').disabled=n>=TH.DAY_BACK;
}
// the recovery score of a day: today as the hero; a past day worked out again once Body is live (a stored snapshot that differs is corrected, none is added), else the old snapshot
function dayScore(dt){
  if(dt===td())return heroScore();
  if(bodyLive()){
    const sc=calcBody(dt).score,h=S().bodyHist||{};
    if(h[dt]!=null&&sc!=null&&h[dt]!==sc){h[dt]=sc;save(S());}
    return sc;
  }
  const r=(S().readHist||{})[dt];return r==null?null:r;
}
// a gauge, factor row or Your day opens its sheet for the day in view
function tdOpen(k){_dtDay=tdDay()===td()?null:tdDay();openDetail(k);}

// evening reflection: opens at TH.REFL_FROM, or once written
const reflOf=c=>{if(!c?.reflection)return null;try{const o=JSON.parse(c.reflection);return{gave:o.g||'',drained:o.d||''};}catch(e){return{gave:c.reflection,drained:''};}};
function renderReflect(){
  const c=todayCI(),r=reflOf(c),w=$('reflWhen');
  if(w)w.textContent=r?'Saved':new Date().getHours()<TH.REFL_FROM?'From '+String(TH.REFL_FROM).padStart(2,'0')+':00':'Optional';
  if(document.activeElement!==$('reflGave'))$('reflGave').value=r?.gave||'';
  if(document.activeElement!==$('reflDrain'))$('reflDrain').value=r?.drained||'';
  $('reflBtn').textContent=r?'Update reflection':'Save reflection';
}
function saveReflect(){
  const g=$('reflGave').value.trim(),dr=$('reflDrain').value.trim();
  if(!g&&!dr){showToast('Write a few words in either box');return;}
  const rec=ciRec();rec.reflection=JSON.stringify({g,d:dr});
  put('checkins',rec);showToast('Reflection saved');refreshAll();
}

// race phases from profile.goalDate (the goal card was removed in v111; strategy, fuel and the briefing still use these)
const RACE_PH=[
  {k:'Base',min:56,mult:1.0,tip:'Build steady volume. Keep most sessions easy.'},
  {k:'Build',min:28,mult:1.1,tip:'Add quality sessions: one hard day, the rest easy.'},
  {k:'Peak',min:14,mult:1.15,tip:'Your hardest weeks. Protect sleep and do not add extras.'},
  {k:'Taper',min:7,mult:0.7,tip:'Cut volume, keep a little intensity.'},
  {k:'Race week',min:0,mult:0.4,tip:'Rest, sleep and fuel well. Short easy sessions only.'}
];
function racePhase(){
  const p=S().profile;if(!p.goalDate)return null;
  const n=Math.round((new Date(p.goalDate+'T00:00:00')-new Date(td()+'T00:00:00'))/864e5);
  if(n<0)return{n};
  const idx=RACE_PH.findIndex(x=>n>=x.min);
  return{n,idx,...RACE_PH[idx]};
}
// minutes of training per week: mean of the 4 weeks before this one, and this week so far
function raceLoad(){
  const d=S(),m=new Date(td()+'T12:00:00');m.setDate(m.getDate()-((m.getDay()+6)%7));
  const wk=o=>{const a=new Date(m);a.setDate(a.getDate()+o*7);const b=new Date(a);b.setDate(b.getDate()+7);const A=ymd(a),B=ymd(b);
    return d.workouts.filter(w=>w.date>=A&&w.date<B&&!w.isEx).reduce((t,w)=>t+(w.durMin||0),0);};
  const prev=[-4,-3,-2,-1].map(wk).filter(x=>x>0);
  return{base:prev.length>=2?avg(prev):null,now:wk(0)};
}

