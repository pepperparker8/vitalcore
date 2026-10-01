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

// the day as one guided sequence: check-in → mindfulness → workout
function nextStep(){
  const d=S(),t=td(),ci=todayCI(),h=new Date().getHours();
  const steps=[
    {done:ciFull(ci),ico:UI.chat,t:'Check in',s:'Four taps: energy, mood, stress, motivation.',go:"logGo('lCheckin')",btn:'Check in'},
    {done:(ci?.mindfulMin||0)>0,ico:UI.lotus,t:'Breathe for a few minutes',s:'Even 3 minutes counts toward your streak.',go:"startMind(3)",btn:'Start 3 min'},
    {done:d.workouts.some(w=>w.date===t),ico:UI.run,t:'Move',s:readinessAdvice(),go:"logGo('lWorkout')",btn:'Log a workout'}
  ];
  return{steps,next:steps.find(x=>!x.done)};
}
function readinessAdvice(){
  const s=calcReadiness();
  if(s===null)return 'Log anything you do today.';
  return s>=80?'You are ready for a hard session.':s>=65?'Normal training is fine today.':s>=50?'Keep it moderate today.':'A walk, yoga or rest is the smart call.';
}
function renderNext(){
  const el=$('nextCard');if(!el)return;const{steps,next}=nextStep();
  const dots=steps.map(x=>`<span class="nx-dot ${x.done?'done':''}"></span>`).join('');
  if(!next){el.innerHTML=`<div class="nx-row"><div class="nx-ico">${UI.check}</div><div style="flex:1"><div class="nx-t">Today is complete</div><div class="nx-s">Check-in, mindfulness and movement are all done.</div></div><div class="nx-dots">${dots}</div></div>`;return;}
  el.innerHTML=`<div class="nx-lbl">NEXT UP · ${steps.filter(x=>x.done).length} OF 3 DONE</div><div class="nx-row"><div class="nx-ico">${next.ico}</div><div style="flex:1"><div class="nx-t">${next.t}</div><div class="nx-s">${esc(next.s)}</div></div></div><button class="btn-gold" style="margin:12px 0 0" onclick="${next.go}">${next.btn}</button><div class="nx-dots" style="margin-top:10px">${dots}</div>`;
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
    const L=raceLoad();
    if(L.base){
      const tg=Math.round(L.base*r.mult/5)*5,pc=Math.min(100,Math.round(L.now/tg*100));
      extra=`<div class="gl-bar"><div style="width:${pc}%"></div></div><div class="gl-t">This week: ${fmtDur(Math.round(L.now))} of about ${fmtDur(tg)} target${r.mult<1?' (reduced for '+r.k.toLowerCase()+')':''}</div>`;
    }else extra='<div class="gl-t">Log 2 or more full weeks and a weekly time target will appear here.</div>';
    extra+=`<div class="gl-ph">${RACE_PH.map((x,i)=>`<span class="${i===r.idx?'on':i<r.idx?'past':''}">${x.k}</span>`).join('')}</div>`;
  }
  el.style.display='';
  el.innerHTML=`<div class="gl-row"><div><div class="gl-n">${nm}</div><div class="gl-s">${sub}</div></div><div class="gl-big">${big}</div></div>${extra}`;
}

// rule-based suggestion for today's session
const LOWER=/knee|ankle|hip|calf|foot|feet|shin|hamstring|quad|achilles|thigh|groin|glute|leg/i;
function suggestWorkout(){
  const d=S(),t=td();
  if(d.workouts.some(w=>w.date===t&&!w.isEx))return null;
  const score=calcReadiness(),tsb=d.intervalsData.tsb;
  if(score===null)return null;
  const inj=d.injuries.filter(i=>i.active),sev=inj.length?Math.max(...inj.map(i=>i.sev)):0;
  const lowerHurt=inj.some(i=>LOWER.test(i.part)&&i.sev>=2);
  const rec=d.workouts.filter(w=>daysAgo(w.date)<=28),wk=rec.filter(w=>daysAgo(w.date)<=7);
  const cnt=ty=>rec.filter(w=>w.type===ty).length;
  const since=ty=>{const w=rec.filter(x=>x.type===ty);return w.length?Math.min(...w.map(x=>daysAgo(x.date))):99;};
  const hardYday=d.workouts.some(w=>daysAgo(w.date)===1&&(w.rpe||0)>=4);
  const gd=d.profile.goalDate?Math.round((new Date(d.profile.goalDate+'T00:00:00')-new Date(t+'T00:00:00'))/864e5):null;
  const taper=gd!==null&&gd>=0&&gd<=7;
  const main=(cnt('Run')>=cnt('Cycle')?'Run':'Cycle');
  const endur=lowerHurt?'Swim':main;
  const med=ty=>{const a=rec.filter(w=>w.type===ty&&w.durMin).map(w=>w.durMin).sort((x,y)=>x-y);return a.length?a[Math.floor(a.length/2)]:45;};
  const r5=n=>Math.round(n/5)*5;
  let type,title,why;
  if(sev>=3||score<45||(tsb!==null&&tsb<-25)){
    type='Yoga';title='Rest or gentle mobility, 20 min';
    why=sev>=3?'A serious injury is active.':'Readiness is low, so recovery is the training today.';
  }else if(taper){
    type=endur;title=`Easy ${endur.toLowerCase()}, ${r5(med(endur)*0.5)} min, a few short pickups`;why='Race week. Keep the legs fresh.';
  }else if(score<65||(tsb!==null&&tsb<-12)||hardYday){
    type=endur;title=`Easy ${endur.toLowerCase()}, ${r5(med(endur)*0.8)} min, conversational pace`;
    why=hardYday?'You trained hard yesterday. Keep it easy.':'Readiness is moderate. Build base without adding stress.';
  }else if(since('Weights')>=5&&wk.length>0&&sev<2&&!lowerHurt){
    type='Weights';title='Strength session, 45 min';why=`No weights for ${since('Weights')>=99?'a while':since('Weights')+' days'}. You are recovered enough to lift.`;
  }else{
    type=endur;title=`Quality ${endur.toLowerCase()}, ${r5(med(endur))} min with harder intervals`;
    why='You are fresh and well slept. A good day to push.';
  }
  // fit the weekly plan: follow it when recovered, otherwise say why the plan is being bent
  const pl=planOf((new Date().getDay()+6)%7);
  if(pl){
    const recover=type==='Yoga',easy=/^Easy/.test(title);
    if(pl.type==='Rest'&&!recover){type='Yoga';title='Planned rest day';why='Your plan says rest. Recovery is when you adapt. Gentle mobility is fine.';}
    else if(pl.type!=='Rest'){
      if(recover)why+=` Your plan says ${pl.type}${pl.note?' ('+pl.note+')':''}. Skip it today and move it a day.`;
      else if(easy){why+=` Plan: ${pl.type}. Keep it easy today.`;if(pl.type!==type&&!lowerHurt){type=pl.type;title=`Easy ${pl.type.toLowerCase()}, ${pl.note||'short and relaxed'}`;}}
      else if(!lowerHurt){type=pl.type;title=`As planned: ${pl.type}${pl.note?', '+pl.note:''}`;why='On your plan, and you are recovered enough to do it well.';}
    }
  }
  if(lowerHurt&&type!=='Yoga')why+=' Low impact because of your leg injury.';
  return{type,title,why};
}
function renderSuggest(){
  const el=$('sugCard');if(!el)return;
  const s=suggestWorkout();
  if(!s){el.style.display='none';return;}
  el.style.display='';
  el.innerHTML=`<div class="sg-lbl">SUGGESTED FOR TODAY</div><div class="sg-row"><div class="sg-ico">${ICON[s.type]||''}</div><div style="flex:1"><div class="sg-t">${esc(s.title)}</div><div class="sg-s">${esc(s.why)}</div></div></div><button class="btn-out sg-btn" onclick="switchTab('log');openLog('lWorkout');selEx('${s.type}');$('exGrid').scrollIntoView({block:'center'})">Log ${s.type} →</button>`;
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
