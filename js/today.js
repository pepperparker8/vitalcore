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
    {done:ciFull(ci),ico:'💭',t:'Check in',s:'Four taps: energy, mood, stress, motivation.',go:"go('ciCard')",btn:'Check in'},
    {done:(ci?.mindfulMin||0)>0,ico:'🧘',t:'Breathe for a few minutes',s:'Even 3 minutes counts toward your streak.',go:"startMind(3)",btn:'Start 3 min'},
    {done:d.workouts.some(w=>w.date===t),ico:'🏃',t:'Move',s:readinessAdvice(),go:"go('qwCard')",btn:'Log a workout'}
  ];
  return{steps,next:steps.find(x=>!x.done)};
}
function readinessAdvice(){
  const s=calcReadiness();
  if(s===null)return 'Log anything you do today.';
  return s>=80?'You are ready for a hard session.':s>=65?'Normal training is fine today.':s>=50?'Keep it moderate today.':'A walk, yoga or rest is the smart call.';
}
function renderNext(){
  const{steps,next}=nextStep(),el=$('nextCard');
  const dots=steps.map(x=>`<span class="nx-dot ${x.done?'done':''}"></span>`).join('');
  if(!next){el.innerHTML=`<div class="nx-row"><div class="nx-ico">✅</div><div style="flex:1"><div class="nx-t">Today is complete</div><div class="nx-s">Check-in, mindfulness and movement are all done.</div></div><div class="nx-dots">${dots}</div></div>`;return;}
  el.innerHTML=`<div class="nx-lbl">NEXT UP · ${steps.filter(x=>x.done).length} OF 3 DONE</div><div class="nx-row"><div class="nx-ico">${next.ico}</div><div style="flex:1"><div class="nx-t">${next.t}</div><div class="nx-s">${esc(next.s)}</div></div></div><button class="btn-gold" style="margin:12px 0 0" onclick="${next.go}">${next.btn}</button><div class="nx-dots" style="margin-top:10px">${dots}</div>`;
}

// evening reflection: shown from 5pm, or once written
const reflOf=c=>{if(!c?.reflection)return null;try{const o=JSON.parse(c.reflection);return{gave:o.g||'',drained:o.d||''};}catch(e){return{gave:c.reflection,drained:''};}};
function renderReflect(){
  const c=todayCI(),r=reflOf(c),show=!!r||new Date().getHours()>=17;
  $('reflCard').style.display=show?'block':'none';
  if(!show)return;
  if(document.activeElement!==$('reflGave'))$('reflGave').value=r?.gave||'';
  if(document.activeElement!==$('reflDrain'))$('reflDrain').value=r?.drained||'';
  $('reflBtn').textContent=r?'Update reflection':'Save reflection';
}
function saveReflect(){
  const g=$('reflGave').value.trim(),dr=$('reflDrain').value.trim();
  if(!g&&!dr){showToast('Write a few words in either box');return;}
  const rec=ciRec();rec.reflection=JSON.stringify({g,d:dr});
  put('checkins',rec);showToast('Reflection saved 🌙');refreshAll();
}

// countdown to the next race or goal (profile.goalName / goalDate)
function renderGoal(){
  const p=S().profile,el=$('goalCard');if(!el)return;
  if(!p.goalDate){el.style.display='none';return;}
  const n=Math.round((new Date(p.goalDate+'T00:00:00')-new Date(td()+'T00:00:00'))/864e5);
  if(n<-3){el.style.display='none';return;}
  const nm=esc(p.goalName||'Your goal');
  let big,sub;
  if(n<0){big='Done';sub='Well done. Set your next goal in Settings.';}
  else if(n===0){big='Today';sub='Race day. Trust your training.';}
  else{
    big=n+(n===1?' day':' days');
    sub=n>=56?'Base phase: build steady volume.':n>=28?'Build phase: add quality sessions.':n>=14?'Peak phase: your hardest weeks.':n>=7?'Taper begins: cut volume, keep some intensity.':'Race week: rest, sleep and fuel well.';
  }
  el.style.display='';
  el.innerHTML=`<div class="gl-row"><div><div class="gl-n">${nm}</div><div class="gl-s">${sub}</div></div><div class="gl-big">${big}</div></div>`;
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
