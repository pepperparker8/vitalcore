// ── TODAY: reason for the score, guided next step, evening reflection ────────
function readinessReasons(){
  const d=S(),out=[],sl=last(d.sleepLogs.filter(s=>s.score)),ci=last(d.checkins.filter(ciFull)),tsb=d.intervalsData.tsb;
  if(sl)out.push([`Sleep ${sl.score}`,sl.score>=75?1:sl.score>=55?0:-1]);
  if(tsb!==null&&tsb!==undefined)out.push([`Freshness ${tsb>0?'+':''}${tsb}`,tsb>=0?1:tsb>-10?0:-1]);
  if(ci){
    const m=ci.mood,e=ci.energy,s=ci.stress;
    out.push([m>=3?'Mood good':m===2?'Mood so-so':'Mood low',m>=3?1:m===2?0:-1]);
    out.push([e>=3?'Energy good':e===2?'Energy so-so':'Energy low',e>=3?1:e===2?0:-1]);
    out.push([s<=1?'Calm':s===2?'Some stress':'Stressed',s<=1?1:s===2?0:-1]);
  }
  d.injuries.filter(i=>i.active).forEach(i=>out.push([`${i.part} −${i.sev*8}`,-1]));
  return out;
}
function renderWhy(){
  const r=readinessReasons(),el=$('heroWhy');
  el.innerHTML=r.length?r.map(([t,g])=>`<span class="why ${g>0?'up':g<0?'down':''}">${g>0?'▲':g<0?'▼':'●'} ${esc(t)}</span>`).join(''):'';
  const missing=[];
  if(!last(S().sleepLogs.filter(s=>s.score)))missing.push('sleep');
  if(!ciFull(todayCI()))missing.push('a check-in');
  $('heroMissing').textContent=r.length&&missing.length?`More accurate with ${missing.join(' and ')}.`:'';
}

// evening reflection: shown from 5pm, or once written
const reflOf=c=>{if(!c?.reflection)return null;try{const o=JSON.parse(c.reflection);return{gave:o.g||'',drained:o.d||''};}catch(e){return{gave:c.reflection,drained:''};}};
function renderReflect(){
  const c=todayCI(),r=reflOf(c),show=!!r||new Date().getHours()>=17;
  $('reflCard').style.display='block';
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

// countdown to the next race or goal (profile.goalName / goalDate) with a phase plan
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
function renderGoal(){
  const p=S().profile,el=$('goalCard');if(!el)return;
  const r=racePhase();
  if(!r||r.n<-3){el.style.display='none';return;}
  const nm=esc(p.goalName||'Your goal');
  let big,sub,extra='';
  if(r.n<0){big='Done';sub='Well done. Set your next goal in Settings.';}
  else if(r.n===0){big='Today';sub='Race day. Trust your training.';}
  else{
    big=r.n+(r.n===1?' day':' days');
    sub=`<b>${r.k}${r.min?' phase':''}.</b> ${r.tip}`;
    extra=`<div class="gl-ph">${RACE_PH.map((x,i)=>`<span class="${i===r.idx?'on':i<r.idx?'past':''}">${x.k}</span>`).join('')}</div>`;
  }
  el.style.display='';
  el.innerHTML=`<div class="gl-row"><div><div class="gl-n">${nm}</div><div class="gl-s">${sub}</div></div><div class="gl-big">${big}</div></div>${extra}`;
}

// ── CHECK-IN REMINDER: strip on Today (and a nav dot) after the chosen time if not checked in ──
function remCfg(){const r=S().profile.remind||{};return{on:r.on!==false,time:/^\d\d:\d\d$/.test(r.time||'')?r.time:'19:00'};}
function remDue(){
  const c=remCfg();if(!c.on||ciFull(todayCI())||isExampleOnly())return false;
  const n=new Date(),[h,m]=c.time.split(':').map(Number);return n.getHours()*60+n.getMinutes()>=h*60+m;
}
function renderRemind(){
  const el=$('remBar'),nav=$('nav-today');if(!el)return;
  const due=remDue();
  if(nav)nav.classList.toggle('dot',due);
  el.style.display=due?'flex':'none';
  if(due){el.innerHTML=`<div><b>Time for your check-in</b><span>Four taps, takes ten seconds.</span></div><button class="btn-gold" style="margin:0" onclick="logGo('lCheckin')">Check in</button>`;remNotify();}
}
function remNotify(){
  try{
    if(!('Notification' in window)||Notification.permission!=='granted')return;
    if(localStorage.getItem('vc-remn')===td())return;
    localStorage.setItem('vc-remn',td());
    navigator.serviceWorker?.getRegistration().then(r=>r&&r.showNotification('VitalCore',{body:'Time for your daily check-in.',icon:'icon-192.png',tag:'vc-checkin'}));
  }catch(e){}
}
function remNoteUI(){
  const b=$('sRemBtn');if(!b)return;
  b.style.display=('Notification' in window&&Notification.permission==='default')?'block':'none';
  const n=$('sRemNote');if(n)n.textContent=('Notification' in window&&Notification.permission==='granted')?'Shows on Today and as a phone notification when you open the app after this time.':'Shows a reminder on Today if you have not checked in by this time.';
}
function askNotify(){try{Notification.requestPermission().then(()=>remNotify_ui());}catch(e){}}
function remNotify_ui(){remNoteUI();showToast(Notification.permission==='granted'?'Notifications on':'Notifications blocked');}
setInterval(()=>{if(!document.hidden)renderRemind();},60000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)renderRemind();});
