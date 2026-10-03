// ── WELCOME ──────────────────────────────────────────────────────────────────
let _ob=0;
function obGo(n){
  _ob=Math.max(0,Math.min(2,n));
  const t=$('obTrack');if(!t)return;
  t.style.transform=`translateX(${-_ob*100}%)`;
  [...$('obDots').children].forEach((el,i)=>el.classList.toggle('on',i===_ob));
  $('obNext').textContent=_ob===2?"Let's start":'Next';
  if(_ob===2)setTimeout(()=>$('wName').focus(),350);
}
function obNext(){if(_ob<2)obGo(_ob+1);else finishWelcome();}
function finishWelcome(skip){
  const d=S();
  const nm=$('wName').value.trim();
  if(!skip&&nm){d.profile.name=nm;markProfile();}
  d.onboardingDone=true;save(d);
  $('welcome').style.display='none';
  renderGreeting();updSyncStatus();
  if(!skip)showToast(nm?`Welcome, ${nm}! Start with today's check-in.`:'Start with today\'s check-in.');
}

// ── CHECK-IN ─────────────────────────────────────────────────────────────────
let _ci={energy:null,mood:null,stress:null,motivation:null,rested:null};
function selCI(k,v,btn){_ci[k]=v;btn.closest('.ci-btns').querySelectorAll('.ci-btn').forEach(b=>b.classList.remove('sel'));btn.classList.add('sel');}
function todayCI(){return S().checkins.find(c=>c.date===td());}
let _ciKey='';
const ciKey=()=>td()+'|'+(todayCI()?.ts||0);
function fillCI(){
  const c=todayCI();_ciKey=ciKey();
  ['energy','mood','stress','motivation','soreness','coffee'].forEach(k=>{
    _ci[k]=c?.[k]??null;
    document.querySelectorAll(`#ciCard .ci-btns[data-k="${k}"] .ci-btn`).forEach(b=>b.classList.toggle('sel',c?.[k]===+b.getAttribute('onclick').match(/,(\d),this/)[1]));
  });
  $('ciGrat').value=c?.gratitude||'';$('ciLate').checked=!!c?.coffeeLate;
  const done=ciFull(c);
  $('ciCard').classList.toggle('done',done);$('ciStat').textContent=done?'Done today':'Not done today';
  $('ciCta').textContent=done?'Update check-in':'Save check-in';
  const sum=$('ciSum');
  if(done){sum.innerHTML=`Saved today · Energy ${EM.energy[c.energy]} · Mood ${EM.mood[c.mood]} · Stress ${EM.stress[c.stress]} · Motivation ${EM.motivation[c.motivation]}${c.soreness?` · Soreness ${EM.soreness[c.soreness]}`:''}${c.coffee!=null?` · Coffee ${c.coffee===4?'4+':c.coffee}${c.coffeeLate?' (late)':''}`:''}`;sum.classList.add('show');}
  else sum.classList.remove('show');
}
function ciRec(){return todayCI()||{id:'ci-'+td(),date:td(),energy:null,mood:null,stress:null,motivation:null,mindfulMin:0,gratitude:''};}
function submitCI(){
  if(!_ci.energy||!_ci.mood||!_ci.stress||!_ci.motivation){showToast('Tap one face for each of the four rows');return;}
  const rec={...ciRec(),energy:_ci.energy,mood:_ci.mood,stress:_ci.stress,motivation:_ci.motivation,soreness:_ci.soreness??null,coffee:_ci.coffee??null,coffeeLate:$('ciLate').checked,gratitude:$('ciGrat').value.trim()};
  put('checkins',rec);
  fillCI();showToast('Check-in saved');refreshAll();
}

// ── MINDFULNESS ──────────────────────────────────────────────────────────────
function addMind(m){
  const rec=ciRec();rec.mindfulMin=(rec.mindfulMin||0)+m;
  put('checkins',rec);renderMind();showToast(`+${m} min mindfulness`);refreshAll();
}
function undoMind(){
  const c=todayCI();if(!c||!c.mindfulMin){showToast('Nothing to reset');return;}
  c.mindfulMin=0;put('checkins',c);renderMind();refreshAll();showToast('Minutes reset');
}
function renderMind(){const m=todayCI()?.mindfulMin||0;$('mindToday').textContent=m;$('mindStat').textContent=m?m+' min today':'0 min today';}
let _mind=null,_wake=null;
function startMind(min){
  _mind={min,start:Date.now(),end:Date.now()+min*60000};
  $('mindOv').classList.add('show');
  try{navigator.wakeLock?.request('screen').then(l=>_wake=l).catch(()=>{});}catch(e){}
  _mind.t=setInterval(tickMind,250);tickMind();
}
function tickMind(){
  if(!_mind)return;
  const left=Math.max(0,_mind.end-Date.now()),el=(Date.now()-_mind.start)/1000;
  $('moTime').textContent=`${Math.floor(left/60000)}:${String(Math.floor(left/1000)%60).padStart(2,'0')}`;
  $('moPhase').textContent=Math.floor(el/4)%2?'Breathe out':'Breathe in';
  if(!left)finishMind(true);
}
function finishMind(complete){
  if(!_mind)return;
  clearInterval(_mind.t);
  const mins=complete?_mind.min:Math.floor((Date.now()-_mind.start)/60000);
  _mind=null;$('mindOv').classList.remove('show');
  try{_wake?.release();}catch(e){}_wake=null;
  if(complete)try{navigator.vibrate?.([200,100,200]);}catch(e){}
  if(mins>0){addMind(mins);}else showToast('Timer stopped');
}
function stopMind(){finishMind(false);}

// ── SLEEP ────────────────────────────────────────────────────────────────────
// minutes between bedtime and wake-up, crossing midnight when wake is earlier
function slSpan(b,w){const m=x=>{const[h,n]=x.split(':').map(Number);return h*60+n;};let d=m(w)-m(b);if(d<=0)d+=1440;return d;}
// the time computed from a recorded duration: {k:'bed'|'wake', v:'HH:MM'}; saved as an estimate unless the user changes it
let _slEst=null;
const slIcu=x=>!!(x&&x.src&&(x.src.durMin==='icu'||x.src.score==='icu'));
const slNeedsTime=x=>!!(x&&x.durMin&&!x.bed&&!x.wake&&slIcu(x));
const slHM=m=>{m=((m%1440)+1440)%1440;return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');};
function slCalc(typed){
  const bI=$('slBed'),wI=$('slWake'),el=$('slDur'),I=k=>k==='bed'?bI:wI;if(!el)return;
  const x=S().sleepLogs.find(s=>s.date===$('slDate').value),rec=x?.durMin&&!x.bed&&!x.wake?x.durMin:0;
  if(typed&&_slEst&&_slEst.k===typed)_slEst=null;                    // the user corrected the estimate
  if(typed&&_slEst&&_slEst.k!==typed&&!I(typed).value){_slEst=null;} // cleared the typed time: drop the estimate
  if(rec&&typed&&!_slEst){
    // one time typed, the other computed from the recorded duration
    const m=s=>{const[h,n]=s.split(':').map(Number);return h*60+n;};
    if(typed==='bed'&&bI.value&&!wI.value){_slEst={k:'wake',v:slHM(m(bI.value)+rec)};wI.value=_slEst.v;}
    else if(typed==='wake'&&wI.value&&!bI.value){_slEst={k:'bed',v:slHM(m(wI.value)-rec)};bI.value=_slEst.v;}
  }
  if(_slEst&&I(_slEst.k).value!==_slEst.v)_slEst=null;
  bI.classList.toggle('inp-est',_slEst?.k==='bed');wI.classList.toggle('inp-est',_slEst?.k==='wake');
  const b=bI.value,w=wI.value,src=x?.src||{};
  if(b&&w){
    const dur=slSpan(b,w);
    el.textContent=_slEst?`${_slEst.k==='wake'?'Wake-up':'Bedtime'} estimated from ${fmtDur(rec)} recorded by Intervals.icu. Correct it if it is off.`
      :rec&&src.durMin==='icu'&&Math.abs(dur-rec)>5?`Time asleep from your times: ${fmtDur(dur)} (Intervals.icu recorded ${fmtDur(rec)}). Your times win.`:'Time asleep: '+fmtDur(dur);
  }
  else if(rec)el.textContent=(src.durMin==='icu'?'Intervals.icu recorded ':'Saved: ')+fmtDur(rec)+'. Enter your bedtime or wake-up time and the other is worked out.';
  else el.textContent='Enter when you fell asleep and woke up.';
}
function loadSleepFor(date){
  date=date||td();$('slDate').value=date;
  const x=S().sleepLogs.find(s=>s.date===date),src=x?.src||{};
  _slEst=null;
  $('slScore').value=x?.score??'';
  $('slBed').value=x?.bed||'';$('slWake').value=x?.wake||'';slCalc();
  $('slDH').value=x?.deepH||'';$('slDM').value=x?.deepM||'';$('slRH').value=x?.remH||'';$('slRM').value=x?.remM||'';
  $('slMore').open=!!(x&&(x.score!=null||x.deepH||x.deepM||x.remH||x.remM||x.rested));
  _ci.rested=x?.rested??null;
  document.querySelectorAll('#lSleep .ci-btn').forEach((b,i)=>b.classList.toggle('sel',x?.rested===i+1));
  // source tags: shown only on fields that still hold the imported value
  $('slDurSrc').hidden=!(x?.durMin&&src.durMin==='icu'&&!x.bed);
  $('slScoreSrc').hidden=!(x?.score!=null&&src.score==='icu');
  $('slRestSrc').hidden=!(x?.rested&&src.rested==='icu');
  $('slDel').style.display=x?'':'none';
  $('slNote').textContent=!x?'Nothing saved for this night yet.':slNeedsTime(x)?'Recorded by Intervals.icu. Add your bedtime or wake-up time to complete it.':slIcu(x)?'Recorded by Intervals.icu. Anything you change here is kept.':'Editing the saved night. Change anything and save.';
}
// soft guardrail: unusual but possible values get a friendly confirm instead of a block
const sane=m=>confirm(m+'\n\nSave it anyway?');
function saveSleep(){
  const date=$('slDate').value||td();
  if(date>td()){showToast('That date is in the future');return;}
  const score=+$('slScore').value||null;
  if(score!==null&&(score<0||score>100)){showToast('Sleep score should be 0–100');return;}
  const bed=$('slBed').value,wake=$('slWake').value,old0=S().sleepLogs.find(s=>s.date===date);
  if(!!bed!==!!wake){showToast('Enter both bedtime and wake-up time');return;}
  const dur=bed?slSpan(bed,wake):(old0?.durMin||0);
  if(dur>16*60){showToast('Sleep over 16 hours looks off');return;}
  if(dur>12*60&&!sane(`That is ${fmtDur(dur)} of sleep, which is unusually long.`))return;
  if(dur>0&&dur<2*60&&!sane(`That is only ${fmtDur(dur)} of sleep.`))return;
  const dH=+$('slDH').value||0,dM=+$('slDM').value||0,rH=+$('slRH').value||0,rM=+$('slRM').value||0;
  if(dH*60+dM+rH*60+rM>(dur||16*60)){showToast('Deep + REM cannot be longer than time asleep');return;}
  if(!score&&!dur&&!dH&&!dM&&!rH&&!rM&&!_ci.rested){showToast('Enter time asleep or a sleep score');return;}
  const old=S().sleepLogs.find(s=>s.date===date);
  const rec={id:old?.id||'sl-'+date,date,score,durMin:dur||null,bed:bed||null,wake:wake||null,deepH:dH,deepM:dM,remH:rH,remM:rM,rested:_ci.rested??null};
  rec.src=manSrc(old,rec,['score','durMin','bed','wake','deepH','deepM','remH','remM','rested']);
  if(_slEst&&rec[_slEst.k]===_slEst.v)rec.src[_slEst.k]='est';
  put('sleep',rec);
  loadSleepFor(date);renderSleepBars();showToast('Sleep saved');refreshAll();
}
function delSleep(){
  const date=$('slDate').value||td(),x=S().sleepLogs.find(s=>s.date===date);
  if(!x)return;
  const copy={...x};del('sleep',x.id);loadSleepFor(date);renderSleepBars();refreshAll();
  showToast('Sleep deleted',{label:'Undo',fn:()=>{const d=S();d.gone=(d.gone||[]).filter(g=>g!==copy.id);put('sleep',copy);loadSleepFor(date);renderSleepBars();refreshAll();showToast('Sleep restored');}});
}
function editSleep(date){closeDayPanel();switchTab('log');openLog('lSleep');loadSleepFor(date);$('lSleep').scrollIntoView({behavior:'smooth'});}
function setStages(dH,dM,rH,rM){
  $('stDeep').textContent=fmtHM(dH,dM);$('stREM').textContent=fmtHM(rH,rM);
  const lm=Math.max(0,480-(dH*60+dM)-(rH*60+rM));
  $('stLight').textContent=(dH||dM||rH||rM)?fmtDur(lm):'—';
}

// ── WORKOUT (Log tab) ────────────────────────────────────────────────────────
let _selEx='Run';
function renderExGrid(){
  $('exGrid').innerHTML=SPORTS.map(([n,i])=>`<div class="ex-btn ${n===_selEx?'sel':''}" onclick="selEx('${n}')"><div class="ex-ico">${i}</div><div class="ex-nm">${n}</div></div>`).join('');
  const st=IS_STR(_selEx),sw=_selEx==='Swim';
  $('wDistFg').style.display=HAS_DIST.includes(_selEx)||sw?'block':'none';
  $('wDistU').textContent=sw?'m':'km';$('wDist').placeholder=sw?'1500':'10.5';$('wDist').step=sw?'50':'0.1';
  $('wDurFg').style.display=st?'none':'block';
  $('wSwim').style.display=sw?'block':'none';$('wStr').style.display=st?'block':'none';
  if(st)renderStrength();
  renderDurChips();
}
function selEx(t){if(IS_STR(t)&&t!==_selEx)_sess=[];_selEx=t;renderExGrid();}
// one-tap durations fill the hour and minute boxes
function renderDurChips(){
  const el=$('wDurChips');if(!el)return;
  const cur=(+$('wDH').value||0)*60+(+$('wDM').value||0);
  el.innerHTML=[20,30,45,60,90].map(m=>`<button type="button" class="chip ${m===cur?'sel':''}" onclick="setDur(${m})">${fmtDur(m)}</button>`).join('');
}
function setDur(m){$('wDH').value=Math.floor(m/60)||'';$('wDM').value=m%60||'';swimPace();renderDurChips();}
function swimPace(){
  const m=+$('wDist').value||0,dur=(+$('wDH').value||0)*60+(+$('wDM').value||0);
  $('wPace').textContent=m>0&&dur>0?`Pace: ${fmtPace(dur/(m/100))} per 100 m`:'';
}
function fmtPace(min){const s=Math.round(min*60);return`${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;}
function saveWorkout(){
  const date=$('wDate').value||td();
  if(date>td()){showToast('That date is in the future');return;}
  const st=IS_STR(_selEx),sw=_selEx==='Swim';
  const dur=(+$('wDH').value||0)*60+(+$('wDM').value||0);
  if(!st&&!dur){showToast('Enter how long it took');return;}
  if(dur>720){showToast('Duration looks too long — max 12 h');return;}
  let dist=HAS_DIST.includes(_selEx)?(+$('wDist').value||0):0,sets=null,sub=null,prs=[];
  if(dist>500){showToast('Distance looks too high');return;}
  if(!st&&dur>360&&!sane(`That is ${fmtDur(dur)} of training, which is a very long session.`))return;
  if(!st&&dur>0&&dur<5&&!sane('That session is under 5 minutes.'))return;
  const spd={Run:[24,'a run'],Cycle:[60,'a ride'],Walk:[9,'a walk'],Hike:[9,'a hike']}[_selEx];
  if(spd&&dist&&dur&&dist/(dur/60)>spd[0]&&!sane(`${Math.round(dist*10)/10} km in ${fmtDur(dur)} is faster than ${spd[0]} km/h for ${spd[1]}.`))return;
  if(sw){
    const m=+$('wDist').value||0;
    if(m>25000){showToast('Swim distance is in metres — that looks too high');return;}
    dist=Math.round(m)/1000;sub={pool:$('wPool').value,stroke:$('wStroke').value};
  }
  if(st){
    const r=collectSets();if(r.err){showToast(r.err);return;}
    sets=r.sets;prs=findPRs(sets);
  }
  const rec={id:_editId||mkId(),date,type:_selEx,distKm:dist,durMin:st?Math.max(10,Math.round(sets.filter(isWork).length*3)):dur,rpe:+$('wRPE').value||null,notes:$('wNotes').value.trim()};
  if(sets)rec.sets=sets;if(sub)rec.sub=sub;
  const oi=_editId&&wIcu(S().workouts.find(x=>x.id===_editId));if(oi&&Object.keys(oi).length)rec.sub={...(rec.sub||{}),icu:oi};
  const wasEdit=!!_editId;put('workouts',rec);_editId=null;$('wSave').textContent='Save workout';$('wCancel').style.display='none';
  ['wDH','wDM','wDist','wNotes'].forEach(i=>$(i).value='');$('wRPE').value='';_sess=[];if(st)renderStrength();$('wPace').textContent='';$('wDate').value=td();$('wMore').open=false;$('wkFormT').textContent='Add a workout';wkPreClear();renderDurChips();
  showToast(prs.length?`New best: ${prs[0]}`:wasEdit?'Workout updated':rec.rpe?'Workout recorded':'Workout recorded, effort not set');refreshAll();
}
let _editId=null;
function editWorkout(id){
  const w=S().workouts.find(x=>x.id===id);if(!w)return;
  closeDayPanel();switchTab('log');lgOpen('lWorkout');
  _selEx=w.type;_sess=[];if(w.sets)loadSession(w.sets);renderExGrid();
  $('wDate').value=w.date;
  $('wDH').value=Math.floor((w.durMin||0)/60)||'';$('wDM').value=(w.durMin||0)%60||'';
  $('wDist').value=w.type==='Swim'?(Math.round((w.distKm||0)*1000)||''):(w.distKm||'');
  if(w.sub){$('wPool').value=w.sub.pool||'pool';$('wStroke').value=w.sub.stroke||'Freestyle';}
  $('wRPE').value=w.rpe||'';$('wNotes').value=w.notes||'';wkPreClear();
  const ir=wIcu(w).rpe;$('wEffNote').textContent=ir&&!w.rpe?`Your watch recorded ${ir} of 10, about ${effOf5(ir)} of 5. Pick it here if it felt like that.`:'';
  _editId=id;$('wSave').textContent='Update workout';$('wCancel').style.display='block';
  $('wMore').open=true;$('wkFormT').textContent='Edit workout';renderDurChips();
  setTimeout(()=>$('wkFormT').scrollIntoView({behavior:'smooth',block:'start'}),120);
  showToast('Editing '+w.type+' from '+w.date);
}
function cancelEdit(){_editId=null;wkPreClear();$('wSave').textContent='Save workout';$('wCancel').style.display='none';['wDH','wDM','wDist','wNotes'].forEach(i=>$(i).value='');$('wRPE').value='';$('wDate').value=td();$('wMore').open=false;$('wkFormT').textContent='Add a workout';_sess=[];if(IS_STR(_selEx))renderStrength();renderDurChips();}
function repeatLast(){
  const w=last(S().workouts);if(!w){showToast('No previous workout');return;}
  _selEx=w.type;_sess=[];if(w.sets)loadSession(w.sets);renderExGrid();
  $('wDH').value=Math.floor((w.durMin||0)/60)||'';$('wDM').value=(w.durMin||0)%60||'';
  $('wDist').value=w.type==='Swim'?(Math.round((w.distKm||0)*1000)||''):(w.distKm||'');if(w.sub){$('wPool').value=w.sub.pool||'pool';$('wStroke').value=w.sub.stroke||'Freestyle';}$('wRPE').value=w.rpe||'';$('wNotes').value=w.notes||'';
  $('wDate').value=td();renderDurChips();
  showToast('Last workout loaded. Check it and save.');
}
function delWorkout(id){
  const w=S().workouts.find(x=>x.id===id);if(!w)return;
  const copy=JSON.parse(JSON.stringify(w)),pan=()=>{if($('dayPanel').classList.contains('open'))openDay(copy.date);};
  if(_editId===id)cancelEdit();
  del('workouts',id);pan();refreshAll();
  showToast('Workout deleted',{label:'Undo',fn:()=>{const d=S();d.gone=(d.gone||[]).filter(g=>g!==id);put('workouts',copy);pan();refreshAll();showToast('Workout restored');}});
}
// ── Workout list with Edit / Delete, and "logged twice" check ────────────────
const isIcu=w=>String(w.id).startsWith('icu-');
const fmtDay=dt=>dt===td()?'Today':daysAgo(dt)===1?'Yesterday':new Date(dt+'T12:00:00').toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'});
function wkRow(w,today){
  const meta=[fmtDay(w.date)];
  if(!w.sets&&w.durMin)meta.push(fmtDur(w.durMin));
  if(w.distKm)meta.push(fmtDist(w));
  if(w.sets){const n=setsByEx(w).reduce((n,e)=>n+e[1].length,0);meta.push(n+' set'+(n===1?'':'s'));}
  meta.push(w.rpe?'effort '+w.rpe+'/5':'effort not set');
  return `<div class="act-item"><div class="act-icon ${w.date===td()?'today':'past'}">${ICON[w.type]||UI.bolt}</div><div style="flex:1;min-width:0"><div class="act-name">${esc(w.type)}${isIcu(w)?'<span class="wk-src">Intervals.icu</span>':''}</div><div class="act-meta">${meta.join(' · ')}</div>${fmtIcu(w)?`<div class="act-meta">${fmtIcu(w)}</div>`:''}${w.sets?`<div class="act-notes">${esc(setsText(w))}</div>`:''}${w.notes?`<div class="act-notes">${esc(w.notes)}</div>`:''}<div class="wk-acts"><button type="button" onclick="editWorkout('${esc(w.id)}')">Edit</button><button type="button" onclick="delWorkout('${esc(w.id)}')">Delete</button></div></div></div>`;
}
// a hand-logged workout and an Intervals.icu one of the same type on the same day
function findDups(){
  const d=S(),ok=d.dupOk||[],out=[];
  d.workouts.filter(w=>isIcu(w)&&daysAgo(w.date)<30).forEach(a=>{
    const m=d.workouts.find(w=>!isIcu(w)&&!w.isEx&&w.date===a.date&&w.type===a.type&&!ok.includes(w.id+'|'+a.id)&&!out.some(p=>p.m.id===w.id));
    if(m)out.push({m,a});
  });
  return out;
}
function dupHTML(){
  return findDups().map(({m,a})=>`<div class="wk-dup"><div class="wk-dup-t">${m.date===td()?"Today's":daysAgo(m.date)===1?"Yesterday's":fmtDay(m.date)} ${esc(m.type.toLowerCase())} is logged twice</div><div class="wk-dup-s">Once by hand and once from Intervals.icu. Combining keeps one workout with your effort, note${m.sets?', sets':''} and the watch data.</div><div class="wk-acts"><button type="button" onclick="mergeDup('${esc(m.id)}','${esc(a.id)}')">Combine into one</button><button type="button" onclick="keepDup('${esc(m.id)}','${esc(a.id)}')">Keep both</button></div></div>`).join('');
}
function mergeDup(mid,aid){
  const d=S(),m=d.workouts.find(w=>w.id===mid),a=d.workouts.find(w=>w.id===aid);if(!m||!a)return;
  const rec={...a,rpe:m.rpe||a.rpe,notes:m.notes||a.notes};
  if(m.sets){rec.sets=m.sets;rec.durMin=a.durMin||m.durMin;}
  if(!rec.distKm&&m.distKm)rec.distKm=m.distKm;
  if(!rec.durMin&&m.durMin)rec.durMin=m.durMin;
  if(m.sub)rec.sub={...m.sub,...(a.sub||{})};
  if(_editId===mid)cancelEdit();
  put('workouts',rec);del('workouts',mid);refreshAll();showToast('Combined into one workout');
}
function keepDup(mid,aid){const d=S();d.dupOk=[...(d.dupOk||[]),mid+'|'+aid].slice(-100);save(d);refreshAll();}
// ── Suggestions the user confirms (v99): watch effort, planned session, soreness streak ──
const effOf5=r=>Math.max(1,Math.min(5,Math.round(r/2)));
// imported workouts whose watch effort has not been accepted or declined
const effSugs=()=>{const d=S(),ok=d.effOk||[];return d.workouts.filter(w=>isIcu(w)&&!w.rpe&&wIcu(w).rpe&&daysAgo(w.date)<30&&!ok.includes(w.id)).sort((a,b)=>a.date<b.date?1:-1).slice(0,3);};
const effHTML=()=>effSugs().map(w=>{const r=wIcu(w).rpe;return`<div class="wk-dup"><div class="wk-dup-t">${fmtDay(w.date)}'s ${esc(w.type.toLowerCase())}: your watch recorded effort ${r} of 10</div><div class="wk-dup-s">Save it as ${effOf5(r)} of 5? Effort feeds training load, strain and the briefing.</div><div class="wk-acts"><button type="button" onclick="useEff('${esc(w.id)}')">Use ${effOf5(r)} of 5</button><button type="button" onclick="editWorkout('${esc(w.id)}')">Pick another</button><button type="button" onclick="skipEff('${esc(w.id)}')">Not now</button></div></div>`;}).join('');
function useEff(id){const w=S().workouts.find(x=>x.id===id);if(!w)return;put('workouts',{...w,rpe:effOf5(wIcu(w).rpe)});refreshAll();showToast('Effort saved');}
function skipEff(id){const d=S();d.effOk=[...(d.effOk||[]),id].slice(-100);save(d);refreshAll();}
// today's planned session fills the empty form; the user changes anything, then saves
let _wkPre=null;
function wkPrefill(force){
  if(_editId||$('wDate').value!==td())return;
  const dirty=$('wDH').value||$('wDM').value||$('wDist').value||$('wNotes').value||_sess.length;
  if(dirty&&!force)return;
  if(!force&&_wkPre===td())return;
  const st=typeof strategy==='function'?strategy():null,x=st&&st.days[0];
  if(!x||x.done||x.role==='rest'||x.role==='race'||!PL_TYPES.includes(x.type))return;
  _wkPre=td();_selEx=x.type;_sess=[];renderExGrid();
  const mins=IS_STR(x.type)?0:Math.round((x.lo+x.hi)/2/5)*5;
  if(mins){$('wDH').value=Math.floor(mins/60)||'';$('wDM').value=mins%60||'';}
  $('wRPE').value=x.effort||'';
  $('wPre').style.display='';$('wPre').innerHTML=`Filled from today's plan: ${esc(x.name)}${mins?', '+fmtDur(mins):''}${x.effort?', effort '+x.effort+' of 5':''}. Change anything, then save. <button type="button" class="lnk" onclick="wkPreClear(true)">Clear</button>`;
  renderDurChips();
}
function wkPreClear(reset){const e=$('wPre');if(e){e.style.display='none';e.innerHTML='';}$('wEffNote').textContent='';if(reset){['wDH','wDM','wDist','wNotes'].forEach(i=>$(i).value='');$('wRPE').value='';renderDurChips();}}
// soreness 3 or more on three days running (ending today or yesterday), with no injury logged since it began
function soreStreak(){
  const d=S(),end=todayCI()&&todayCI().soreness?0:1,days=[];
  for(let i=end;i<end+3;i++){const c=d.checkins.find(x=>x.date===dAgo(i));if(!c||!(c.soreness>=3))return null;days.push(c.date);}
  const from=days[days.length-1];
  if(d.injuries.some(j=>j.active&&j.date>=from))return null;
  if(d.soreOk===from)return null;
  return{from,to:days[0],n:3};
}
const soreHTML=()=>{const s=soreStreak();return s?`<div class="wk-dup"><div class="wk-dup-t">Sore for three days in a row</div><div class="wk-dup-s">Your check-ins since ${fmtD(s.from)} say so. Logged as an injury, training bends around it and the briefing keeps an eye on it.</div><div class="wk-acts"><button type="button" onclick="soreToInjury()">Log an injury</button><button type="button" onclick="soreSkip()">Not now</button></div></div>`:'';};
function soreToInjury(){const s=soreStreak();logGo('lInjury');if(s){$('injNotes').value='Sore since '+fmtD(s.from);$('injSev').value='1';}setTimeout(()=>$('injPart').focus(),300);}
function soreSkip(){const s=soreStreak(),d=S();if(s)d.soreOk=s.from;save(d);refreshAll();}
function renderSoreSug(){const a=$('soreSug'),b=$('injSug'),h=soreHTML();if(a)a.innerHTML=h;if(b)b.innerHTML=h;}
function renderWkLog(){
  const d=S(),el=$('wkRecent');if(!el)return;
  const ws=d.workouts.filter(w=>daysAgo(w.date)<7).sort((a,b)=>a.date<b.date?1:a.date>b.date?-1:(b.ts||0)-(a.ts||0));
  $('wkDup').innerHTML=dupHTML()+effHTML();renderSoreSug();wkPrefill();
  const n=$('wkIcuNote'),on=!!(d.intervalsKey&&d.intervalsID);
  n.style.display=on?'':'none';
  n.textContent=on?'Connected to Intervals.icu: workouts recorded by your watch arrive here on their own after a sync. Add by hand only what the watch did not record.':'';
  el.innerHTML=ws.length?`<div class="sec">Last 7 days</div>`+ws.map(w=>wkRow(w)).join(''):'';
  const nT=d.workouts.filter(w=>w.date===td()).length;
  $('wkStat').textContent=nT?nT+' logged today':'Nothing logged today';
}

// ── MEASUREMENTS ─────────────────────────────────────────────────────────────
function saveMeas(){
  const sys=$('bpSys').value,dia=$('bpDia').value;
  if((sys&&!dia)||(dia&&!sys)){showToast('Enter both systolic and diastolic');return;}
  const sN=+sys,dN=+dia;
  if(sys&&dia){if(sN<60||sN>250){showToast('Systolic: 60–250');return;}if(dN<40||dN>180){showToast('Diastolic: 40–180');return;}if(sN<=dN){showToast('Systolic must be higher than diastolic');return;}}
  const wt=+$('wtKg').value||null,hr=+$('hrVal').value||null;
  if(wt&&(wt<30||wt>250)){showToast('Weight: 30–250 kg');return;}
  if(hr&&(hr<30||hr>200)){showToast('Resting HR: 30–200 bpm');return;}
  const pw=last(S().measurements.filter(m=>m.weight&&!m.isEx&&daysAgo(m.date)<=7));
  if(wt&&pw&&Math.abs(wt-pw.weight)>=4&&!sane(`${wt} kg is ${Math.round(Math.abs(wt-pw.weight)*10)/10} kg different from your last weigh-in (${pw.weight} kg).`))return;
  if(!sN&&!wt&&!hr){showToast('Enter at least one measurement');return;}
  const rec={id:mkId(),date:td(),bpSys:sN||null,bpDia:dN||null,weight:wt,hr};
  rec.src=manSrc(null,rec,['bpSys','bpDia','weight','hr']);
  put('meas',rec);
  ['bpSys','bpDia','wtKg','hrVal'].forEach(i=>$(i).value='');
  $('measStat').textContent='Saved today';
  updMeasHist();renderHRVSpark();renderWtChart();showToast('Measurements saved');
}
function updMeasHist(){
  const ms=S().measurements;
  const b=last(ms.filter(m=>m.bpSys)),w=last(ms.filter(m=>m.weight)),h=last(ms.filter(m=>m.hr));
  $('bpRec').textContent=b?`${b.bpSys}/${b.bpDia} mmHg`:'—';
  $('wtRec').textContent=w?`${w.weight} kg`:'—';$('wtRecSrc').hidden=!(w&&w.src&&w.src.weight==='icu');
  $('hrRec').textContent=h?`${h.hr} bpm`:'—';
  const l=last(ms);$('measStat').textContent=l?(l.date===td()?'Saved today':`Last: ${daysAgo(l.date)} days ago`):'Not logged yet';
}

// ── INJURY LOG ───────────────────────────────────────────────────────────────
function saveInjury(){
  const part=$('injPart').value.trim();
  if(!part){showToast('Enter a body part');return;}
  put('inj',{id:mkId(),date:$('injDate').value||td(),part,sev:+$('injSev').value||1,notes:$('injNotes').value.trim(),active:true});
  $('injPart').value='';$('injNotes').value='';
  renderInjuryDisplay();showToast('Injury logged');refreshAll();
}
function renderInjuryDisplay(){
  const injs=S().injuries.filter(i=>i.active).slice(-5).reverse();
  $('injStat').textContent=injs.length?`${S().injuries.filter(i=>i.active).length} active`:'No active injuries';
  const el=$('injDisplay');
  if(!injs.length){el.innerHTML='<div class="hist-ttl">ACTIVE / RECENT</div><div style="font-size:12px;color:var(--t3);padding:4px 0">No injuries logged</div>';return;}
  el.innerHTML='<div class="hist-ttl">ACTIVE</div>'+injs.map(inj=>`
    <div class="inj-item">
      <div class="inj-sev s${inj.sev}">${inj.sev}</div>
      <div class="inj-body"><div class="inj-name">${esc(inj.part)}</div><div class="inj-date">${fmtD(inj.date)}${inj.notes?' · '+esc(inj.notes):''}</div></div>
      <button onclick="clearInjury('${inj.id}')" style="background:none;border:none;color:var(--t3);cursor:pointer;font-size:22px;min-width:44px;min-height:44px" aria-label="Mark healed">×</button>
    </div>`).join('');
}
function clearInjury(id){
  const r=S().injuries.find(i=>i.id===id);if(!r)return;
  r.active=false;put('inj',r);renderInjuryDisplay();showToast('Marked as healed');refreshAll();
}

// ── BLOOD MARKERS ────────────────────────────────────────────────────────────
function scoreBM(v,t){
  const r={glucose:{ok:[70,100],warn:[100,125]},chol:{ok:[0,200],warn:[200,239]},uric:{ok:[3.5,7.2],warn:[7.2,8.0]}};
  const rng=r[t];if(!rng||!v)return{score:null,status:'—'};
  if(v>=rng.ok[0]&&v<=rng.ok[1])return{score:90,status:'ok'};
  if(v>=rng.warn[0]&&v<=rng.warn[1])return{score:55,status:'warn'};
  return{score:20,status:'bad',low:v<rng.ok[0]};
}
function saveBlood(){
  const date=$('bmDate').value||td();
  const v={glucose:+$('bmG').value||null,chol:+$('bmC').value||null,uric:+$('bmU').value||null};
  if(!Object.values(v).some(Boolean)){showToast('Enter at least one marker');return;}
  if(v.glucose&&(v.glucose<20||v.glucose>600)){showToast('Glucose value seems off (mg/dL)');return;}
  if(v.chol&&(v.chol<50||v.chol>500)){showToast('Cholesterol value seems off (mg/dL)');return;}
  put('blood',{id:mkId(),date,...v});
  ['bmG','bmC','bmU'].forEach(i=>$(i).value='');
  $('bloodStat').textContent=`Last tested: ${fmtD(date)}`;
  renderBloodDisplay();showToast('Blood results saved');
}
function renderBloodDisplay(){
  const d=S(),b=last(d.bloodLogs);
  const el=$('bmDisplay');if(!el)return;
  if(!b){el.innerHTML='<div class="hist-ttl">NO RESULTS YET</div><div style="font-size:12px;color:var(--t3)">Enter your latest lab results below (mg/dL).</div>';return;}
  $('bloodStat').textContent=`Last tested: ${fmtD(b.date)}`;
  const markers=[['Glucose','glucose'],['Cholesterol','chol'],['Uric acid','uric']];
  const C=2*Math.PI*12;
  el.innerHTML=`<div class="hist-ttl">LAST RESULTS · ${fmtD(b.date)}</div>`+markers.filter(([,k])=>b[k]).map(([name,k])=>{
    const s=scoreBM(b[k],k);
    const col=s.status==='ok'?'var(--green)':s.status==='warn'?'var(--amber)':'var(--red)';
    const hist=d.bloodLogs.slice(-5).map(x=>x[k]).filter(Boolean);
    const mx=Math.max(...hist,1);
    const spark=hist.length>1?`<div class="bm-spark">${hist.map(v=>`<div class="bm-spark-bar" style="height:${Math.round(v/mx*16)+2}px;background:${col};opacity:0.5"></div>`).join('')}</div>`:'';
    return`<div class="bm-row"><div><div class="bm-name">${name}</div><div class="bm-unit">${b[k]} mg/dL</div>${spark}</div>
      <div class="bm-right"><div class="bm-ring"><svg width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="12" fill="none" stroke="rgba(0,0,0,0.08)" stroke-width="3"/><circle cx="16" cy="16" r="12" fill="none" stroke="${col}" stroke-width="3" stroke-linecap="round" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C*(1-(s.score||0)/100)).toFixed(1)}"/></svg><div class="bm-ring-num" style="color:${col}">${s.score||'—'}</div></div>
      <span class="bm-badge ${s.status}">${s.status==='ok'?'Normal':s.status==='warn'?'Border':s.low?'Low':'High'}</span></div></div>`;
  }).join('');
}


// Log home: progress for the day's four routine entries, and open the first one still to do
function logStatus(){
  const d=S(),t=td(),ci=todayCI();
  const sl=d.sleepLogs.find(s=>s.date===t);
  return[['lCheckin',ciFull(ci)],['lSleep',!!(sl&&(sl.durMin||sl.score)&&!slNeedsTime(sl)),slNeedsTime(sl)?'part':''],['lWorkout',d.workouts.some(w=>w.date===t)],['lMind',(ci?.mindfulMin||0)>0]];
}
function renderLogHead(){
  const st=logStatus(),n=st.filter(x=>x[1]).length,el=$('lgProg');
  st.forEach(([id,ok,part])=>{if($(id)){$(id).classList.toggle('done',ok);$(id).classList.toggle('part',part==='part');}});
  const part=st.some(x=>x[2]==='part');
  const h=n+'|'+part;if(el&&el._h!==h){el._h=h;el.innerHTML=`<b>${n} of 4</b> daily entries done${part?', sleep needs one detail':''}<span class="lg-bar"><i style="width:${n*25}%"></i></span>`;}
}
function logAuto(){
  renderLogHead();
  document.querySelectorAll('.log-sec.open').forEach(x=>x.classList.remove('open'));
  const nx=logStatus().find(x=>!x[1]);if(nx)$(nx[0]).classList.add('open');
}
