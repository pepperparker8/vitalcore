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
