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
  updSyncStatus();
  if(!skip)showToast(nm?`Welcome, ${nm}! Start with today's check-in.`:'Start with today\'s check-in.');
}

// ── CHECK-IN ─────────────────────────────────────────────────────────────────
let _ci={energy:null,mood:null,stress:null,motivation:null,rested:null,symptoms:null,bodyFeel:null,soreArea:[]};
function selCI(k,v,btn){_ci[k]=v;btn.closest('.ci-btns').querySelectorAll('.ci-btn').forEach(b=>b.classList.remove('sel'));btn.classList.add('sel');if(k==='soreness')$('ciAreaRow').style.display=v>=3?'':'none';ciWord(k);}
// v129: the chosen answer in words beside each question (the button's own label), else the two ends of the scale
function ciWord(k){
  const el=document.querySelector(`#ciCard .ci-w[data-k="${k}"]`);if(!el)return;
  let w='';
  if(k==='soreArea')w=_ci.soreArea.map(a=>EM.soreArea[a]).filter(Boolean).join(', ');
  else if(k==='coffee'){const v=_ci.coffee;if(v!=null)w=v>=4?'4+ cups':v+(v===1?' cup':' cups');}
  else{const b=document.querySelector(`#ciCard .ci-btns[data-k="${k}"] .ci-btn.sel`);if(b)w=b.getAttribute('aria-label')||b.textContent.trim();}
  el.textContent=w||el.dataset.e;el.classList.toggle('on',!!w);
}
// v118: where it is sore, shown from Moderate up; several areas allowed
function selArea(a,btn){const i=_ci.soreArea.indexOf(a);if(i<0)_ci.soreArea.push(a);else _ci.soreArea.splice(i,1);btn.classList.toggle('sel',i<0);ciWord('soreArea');}
function todayCI(){return S().checkins.find(c=>c.date===td());}
let _ciKey='';
const ciKey=()=>td()+'|'+(todayCI()?.ts||0);
function fillCI(){
  const c=todayCI();_ciKey=ciKey();
  ['energy','mood','stress','motivation','soreness','coffee','symptoms','bodyFeel'].forEach(k=>{
    _ci[k]=c?.[k]??null;
    document.querySelectorAll(`#ciCard .ci-btns[data-k="${k}"] .ci-btn`).forEach(b=>b.classList.toggle('sel',c?.[k]===+b.getAttribute('onclick').match(/,(\d),this/)[1]));
  });
  _ci.soreArea=c?.soreArea?c.soreArea.split(',').filter(Boolean):[];
  document.querySelectorAll('#ciAreaRow .ci-btn').forEach(b=>b.classList.toggle('sel',_ci.soreArea.includes(b.dataset.a)));
  $('ciAreaRow').style.display=(c?.soreness||0)>=3?'':'none';
  $('ciGrat').value=c?.gratitude||'';$('ciLate').checked=!!c?.coffeeLate;
  ['bodyFeel','energy','mood','stress','motivation','soreness','soreArea','symptoms','coffee'].forEach(ciWord);
  const done=ciFull(c);
  $('ciCard').classList.toggle('done',done);lgStat();
  $('ciCta').textContent=done?'Update check-in':'Save check-in';
  const sum=$('ciSum');
  if(done){sum.innerHTML=`Saved today · Energy ${EM.energy[c.energy]} · Mood ${EM.mood[c.mood]} · Stress ${EM.stress[c.stress]} · Motivation ${EM.motivation[c.motivation]}${c.bodyFeel?` · Body ${EM.bodyFeel[c.bodyFeel]}`:''}${c.soreness?` · Soreness ${EM.soreness[c.soreness]}${c.soreArea&&c.soreness>=3?` (${c.soreArea.split(',').map(a=>EM.soreArea[a]||'').filter(Boolean).join(', ').toLowerCase()})`:''}`:''}${c.symptoms?` · Symptoms ${EM.symptoms[c.symptoms].toLowerCase()}`:''}${c.coffee!=null?` · Coffee ${c.coffee===4?'4+':c.coffee}${c.coffeeLate?' (late)':''}`:''}`;sum.classList.add('show');}
  else sum.classList.remove('show');
}
function ciRec(){return todayCI()||{id:'ci-'+td(),date:td(),energy:null,mood:null,stress:null,motivation:null,mindfulMin:0,gratitude:''};}
function submitCI(){
  if(!_ci.energy||!_ci.mood||!_ci.stress||!_ci.motivation){showToast('Tap one face for each of the four rows');return;}
  const rec={...ciRec(),energy:_ci.energy,mood:_ci.mood,stress:_ci.stress,motivation:_ci.motivation,soreness:_ci.soreness??null,coffee:_ci.coffee??null,coffeeLate:$('ciLate').checked,gratitude:$('ciGrat').value.trim()};
  // v118 fields are written only once set, so check-ins keep syncing before docs/supabase-v118.sql is run; a cleared sore area is '' (not null) so the cloud copy clears too
  if(_ci.symptoms!=null)rec.symptoms=_ci.symptoms;
  if(_ci.bodyFeel!=null)rec.bodyFeel=_ci.bodyFeel;
  const area=(_ci.soreness||0)>=3?_ci.soreArea.join(','):'';
  if(area||rec.soreArea)rec.soreArea=area;
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
function renderMind(){const m=todayCI()?.mindfulMin||0;$('mindToday').textContent=m;lgStat();}
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
// where an imported night came from: 'Polar' (its own night, v116), 'Intervals.icu' (the flattened copy), or null when typed
const slSrc=x=>{const s=x&&x.src||{};return[s.durMin,s.score,s.bed,s.wake].includes('polar')?'Polar':s.durMin==='icu'||s.score==='icu'?'Intervals.icu':null;};
const slIcu=x=>!!slSrc(x);
const slNeedsTime=x=>!!(x&&x.durMin&&!x.bed&&!x.wake&&slIcu(x));
// a night that may hold time with the band off (v127): the signs were too weak to cut it, so it asks until you check it
const slAsk=x=>{const s=x&&x.src||{},n=(s.bed==='polar'||s.wake==='polar')&&polarOn(x.date);return!!(n&&plAsk(n));};
// what a night still needs, or null: st the Log status, hd the progress line, nt the form note, ask 1 = offer Check the night
function slWhy(x){
  if(!x)return null;
  if(slNeedsTime(x))return{st:'Needs bedtime or wake-up',hd:'sleep needs your bedtime',sm:'add your bedtime',nt:'Recorded automatically. Add your bedtime or wake-up time to complete it.'};
  if(!slCounts(x))return{st:'Battery ran out: add your wake-up time',hd:'sleep needs your wake-up time',sm:'add your wake-up time',nt:'Your band ran out of battery during the night. Add your wake-up time and the night counts.'};
  if(slAsk(x)){const h=plAskHead(plTrim(polarOn(x.date)));return{st:h,hd:'check last night\'s sleep',sm:'check the night',nt:h+'.',ask:1};}
  return null;
}
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
  const b=bI.value,w=wI.value,src=x?.src||{},imp=IMP_SRC.includes(src.durMin);
  if(b&&w){
    // a Polar night with its own times: time asleep is the span minus time awake, so it is shorter than bedtime to wake-up
    const dur=slSpan(b,w),pol=src.durMin==='polar'&&x.bed===b&&x.wake===w?x.durMin:0;
    el.textContent=_slEst?`${_slEst.k==='wake'?'Wake-up':'Bedtime'} estimated from the ${fmtDur(rec)} asleep your watch recorded. Correct it if it is off.`
      :pol?`Time asleep: ${fmtDur(pol)}${dur-pol>=5?` (awake ${fmtDur(dur-pol)} during the night)`:''}.`
      :rec&&imp&&Math.abs(dur-rec)>5?`Time asleep from your times: ${fmtDur(dur)} (your watch recorded ${fmtDur(rec)}). Your times win.`:'Time asleep: '+fmtDur(dur);
  }
  else if(rec)el.textContent=(imp?'Recorded: ':'Saved: ')+fmtDur(rec)+'. Enter your bedtime or wake-up time and the other is worked out.';
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
  $('slDel').style.display=x?'':'none';
  const w=slWhy(x);
  renderSlNaps(date);
  $('slNote').innerHTML=!x?'Nothing saved for this night yet.':w?esc(w.nt)+(w.ask?'<button type="button" class="sl-chk" onclick="adjOpen($(\'slDate\').value)">Check the night</button>':''):slIcu(x)?'Recorded automatically. Anything you change here is kept.':'';
}
// v133: the day's naps under the night (the date the night ended on), from napList: the band's under the strict rule and the ones
// you added. × on yours removes it, × on the band's stores a 'no' so it stops counting; Undo puts the list back as it was.
const slNapDate=()=>$('slDate').value||td();
function renderSlNaps(date){
  const el=$('slNaps');if(!el)return;
  const L=napList(date||slNapDate());
  el.innerHTML=L.length?L.map((z,i)=>`<div class="sl-nap">${UI.zzz}<div class="t"><b>${slHM(z.a)} to ${slHM(z.b)}</b><small>${fmtDur(z.min)}</small></div><button type="button" class="sl-nx" aria-label="Remove nap" onclick="rmNap(${i})">${UI.x}</button></div>`).join('')
    :'<div class="set-note">No naps on this day.</div>';
}
function napUndo(date,keep,msg){
  showToast(msg,{label:'Undo',fn:()=>{napPut(date,keep);renderSlNaps(date);refreshAll();showToast('Nap restored');}});
}
function addNap(){
  const date=slNapDate(),A=$('napA'),B=$('napB'),m=s=>{const[h,n]=s.split(':').map(Number);return h*60+n;};
  if(date>td()){showToast('That date is in the future');return;}
  if(!A.value||!B.value){showToast('Enter when the nap started and ended');return;}
  const a=m(A.value),b=m(B.value),m0=plT(date+'T00:00:00');
  if(b<=a){showToast('The nap has to end after it starts');return;}
  if(b-a<TH.NAP_TYPE_MIN||b-a>TH.NAP_TYPE_MAX){showToast(`A nap is ${TH.NAP_TYPE_MIN} minutes to ${TH.NAP_TYPE_MAX/60} hours`);return;}
  if(m0==null||m0+b*DY_MIN>Date.now()){showToast('That nap ends in the future');return;}
  const n0=dyNight(date,dAgo(daysAgo(date)+1)),n1=dyNight(dAgo(daysAgo(date)-1),date);
  if((n0&&m0+a*DY_MIN<n0.b)||(n1&&m0+b*DY_MIN>n1.a)){showToast('That overlaps the night\'s sleep');return;}
  if(napList(date).some(z=>z.a<b&&z.b>a)){showToast('That overlaps a nap already here');return;}
  const keep=napUser(date);napSet(date,a,b);A.value='';B.value='';
  renderSlNaps(date);refreshAll();napUndo(date,keep,'Nap added');
}
function rmNap(i){
  const date=slNapDate(),z=napList(date)[i];if(!z)return;
  const keep=napUser(date);
  if(z.by==='you')napPut(date,keep.filter(u=>!(u.by==='you'&&u.a===z.a&&u.b===z.b)));else napNo(date,z.a,z.b);
  renderSlNaps(date);refreshAll();napUndo(date,keep,'Nap removed');
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
  // a Polar night saved again with its own times keeps Polar's time asleep (the span minus time awake)
  const keep=old0&&old0.src?.durMin==='polar'&&old0.bed===bed&&old0.wake===wake?old0.durMin:0;
  const dur=bed?(keep||slSpan(bed,wake)):(old0?.durMin||0);
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
function setStages(dH,dM,rH,rM,dur){
  $('stDeep').textContent=fmtHM(dH,dM);$('stREM').textContent=fmtHM(rH,rM);
  const lm=Math.max(0,(dur||480)-(dH*60+dM)-(rH*60+rM));
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
  if(!$('wPainRow').innerHTML)painSet(null);
  renderDurChips();
}
function selEx(t){if(IS_STR(t)&&t!==_selEx)_sess=[];_selEx=t;renderExGrid();}
// v121: pain 0 to 10, stored as sub.pain; a second tap on the chosen number clears it
const painOf=w=>w&&w.sub&&typeof w.sub.pain==='number'?w.sub.pain:null;
const painVal=()=>{const v=$('wPain').value;return v===''?null:+v;};
function painSet(v){
  $('wPain').value=v==null?'':String(v);
  $('wPainRow').innerHTML=Array.from({length:11},(_,i)=>`<button type="button" class="pn-c${i===v?' sel':''}" aria-pressed="${i===v}" aria-label="Pain ${i} of 10" onclick="painTap(${i})">${i}</button>`).join('');
}
function painTap(i){painSet(painVal()===i?null:i);}
// while an injury is logged or a comeback after one is running, the pain field is opened once a day and says why it matters
let _pnOpen='';
function painMark(){
  const ir=typeof injRet==='function'?injRet():null,inj=S().injuries.some(x=>x.active);
  $('wPainNote').textContent=ir?'Part of your return plan: a run at 3 or less moves you on, 5 or more steps back. 0 is none, 10 is the worst.':inj?'You have an injury logged, so a pain score helps the plan and the briefing follow it. 0 is none, 10 is the worst.':'0 is none, 10 is the worst. Used when you come back from an injury.';
  if((ir||inj)&&!_editId&&_pnOpen!==td()){_pnOpen=td();$('wMore').open=true;}
}
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
  const ow=_editId&&S().workouts.find(x=>x.id===_editId),oi=ow&&wIcu(ow);if(oi&&Object.keys(oi).length)rec.sub={...(rec.sub||{}),icu:oi};
  if(wkBoth(ow))rec.sub={...(rec.sub||{}),both:1};   // v130: Show both stays on an edited copy
  const pn=painVal();if(pn!=null)rec.sub={...(rec.sub||{}),pain:pn};
  const wasEdit=!!_editId;put('workouts',rec);_editId=null;$('wSave').textContent='Save workout';$('wCancel').style.display='none';
  ['wDH','wDM','wDist','wNotes'].forEach(i=>$(i).value='');$('wRPE').value='';painSet(null);_sess=[];if(st)renderStrength();$('wPace').textContent='';$('wDate').value=td();$('wMore').open=false;$('wkFormT').textContent='Add a workout';wkPreClear();renderDurChips();
  // pain during a comeback run moves the return plan back a step (injRet reads it)
  const ir=pn!=null&&pn>=TH.PAIN_BACK&&rec.type==='Run'&&typeof injRet==='function'?injRet():null;
  showToast(prs.length?`New best: ${prs[0]}`:pn!=null&&pn>=TH.PAIN_STOP?`Pain ${pn} of 10: stop training on it and get it checked.`:ir&&rec.date>=ir.healed?`Pain ${pn} of 10: your next run steps back.`:wasEdit?'Workout updated':'Workout recorded');refreshAll();
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
  $('wRPE').value=w.rpe||'';$('wNotes').value=w.notes||'';painSet(painOf(w));wkPreClear();
  const ir=wIcu(w).rpe;$('wEffNote').textContent=ir&&!w.rpe?`Your watch recorded ${ir} of 10, about ${effOf5(ir)} of 5. Pick it here if it felt like that.`:'';
  _editId=id;$('wSave').textContent='Update workout';$('wCancel').style.display='block';
  $('wMore').open=true;$('wkFormT').textContent='Edit workout';renderDurChips();
  setTimeout(()=>{const t=$('wkFormT');if(t)t.scrollIntoView({behavior:'smooth',block:'start'});},120);
  showToast('Editing '+wkLabel(w).toLowerCase()+' from '+fmtD(w.date));
}
function cancelEdit(){_editId=null;wkPreClear();$('wSave').textContent='Save workout';$('wCancel').style.display='none';['wDH','wDM','wDist','wNotes'].forEach(i=>$(i).value='');$('wRPE').value='';painSet(null);$('wDate').value=td();$('wMore').open=false;$('wkFormT').textContent='Add a workout';_sess=[];if(IS_STR(_selEx))renderStrength();renderDurChips();}
function repeatLast(){
  const w=last(wkOn());if(!w){showToast('No previous workout');return;}
  _selEx=w.type;_sess=[];if(w.sets)loadSession(w.sets);renderExGrid();
  $('wDH').value=Math.floor((w.durMin||0)/60)||'';$('wDM').value=(w.durMin||0)%60||'';
  $('wDist').value=w.type==='Swim'?(Math.round((w.distKm||0)*1000)||''):(w.distKm||'');if(w.sub){$('wPool').value=w.sub.pool||'pool';$('wStroke').value=w.sub.stroke||'Freestyle';}$('wRPE').value=w.rpe||'';$('wNotes').value=w.notes||'';
  painSet(null);$('wDate').value=td();renderDurChips();
  showToast('Last workout loaded. Check it and save.');
}
function delWorkout(id){
  const w=S().workouts.find(x=>x.id===id);if(!w)return;
  // v130: the hidden copies of a double go with the copy that counts (else one would show up in its place); Undo brings all back
  const c=wkDupOf(id),ids=[id,...(c&&c.keep===id?c.hid:[])];
  const copies=ids.map(i=>S().workouts.find(x=>x.id===i)).filter(Boolean).map(x=>JSON.parse(JSON.stringify(x)));
  const copy=copies[0],pan=()=>{if($('dayPanel').classList.contains('open'))openDay(copy.date);};
  if(_editId===id)cancelEdit();
  ids.forEach(i=>del('workouts',i));pan();refreshAll();
  showToast('Workout deleted',{label:'Undo',fn:()=>{const d=S();d.gone=(d.gone||[]).filter(g=>!ids.includes(g));copies.forEach(x=>put('workouts',x));pan();refreshAll();showToast('Workout restored');}});
}
// ── Workout list with Edit / Delete, and "logged twice" check ────────────────
const isIcu=w=>String(w.id).startsWith('icu-');
const fmtDay=dt=>dt===td()?'Today':daysAgo(dt)===1?'Yesterday':new Date(dt+'T12:00:00').toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'});
// v129: o.plain (Today's last 7 days) gives one line, the weekday word and no Edit or Delete
function wkRow(w,o){
  const pl=!!(o&&o.plain),meta=[pl&&daysAgo(w.date)>1?new Date(w.date+'T12:00:00').toLocaleDateString('en-GB',{weekday:'short'}):fmtDay(w.date)];
  const st=w.sets&&w.sets.length;
  if(!st&&w.durMin)meta.push(fmtDur(w.durMin));
  if(w.distKm)meta.push(fmtDist(w));
  if(st){const n=setsByEx(w).reduce((n,e)=>n+e[1].length,0);meta.push(n+' set'+(n===1?'':'s'));}
  if(w.rpe)meta.push('effort '+w.rpe+'/5');
  if(painOf(w)!=null)meta.push('pain '+painOf(w)+' of 10');
  // v122: the row opens the workout sheet; Edit and Delete do only their own job
  return `<div class="act-item tap" role="button" tabindex="0" aria-label="${esc(wkLabel(w))}, ${esc(fmtD(w.date))}: details" onclick="openDetail('wk:${esc(w.id)}')"><div class="act-icon ${w.date===td()?'today':'past'}">${ICON[w.type]||UI.bolt}</div><div style="flex:1;min-width:0"><div class="act-name">${esc(wkLabel(w))}</div><div class="act-meta">${meta.join(' · ')}</div>${pl?'':`${fmtIcu(w)?`<div class="act-meta">${fmtIcu(w)}</div>`:''}${st?`<div class="act-notes">${esc(setsText(w))}</div>`:''}${w.notes?`<div class="act-notes">${esc(w.notes)}</div>`:''}`}</div>${pl?`<span class="act-go" aria-hidden="true">${UI.chev}</span>`:`<button type="button" class="wk-mo" aria-haspopup="menu" aria-expanded="false" aria-label="More for ${esc(wkLabel(w))}, ${esc(fmtD(w.date))}" onclick="event.stopPropagation();wkMenu(this)" onkeydown="event.stopPropagation()">${WK_DOTS}</button><div class="wk-menu" role="menu" hidden><button type="button" role="menuitem" onclick="event.stopPropagation();wkMenuClose();editWorkout('${esc(w.id)}')">${WK_PEN}<span>Edit</span></button><button type="button" role="menuitem" class="del" onclick="event.stopPropagation();wkMenuClose();delWorkout('${esc(w.id)}')">${WK_BIN}<span>Delete</span></button></div>`}</div>`;
}
// v129: Tabler dots, pencil and trash for the workout row menu; one menu open at a time, closed by a tap elsewhere or Esc
const WK_DOTS='<svg class="ui-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"/><path d="M12 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"/><path d="M19 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"/></svg>';
const WK_PEN='<svg class="ui-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4l10.5 -10.5a2.828 2.828 0 1 0 -4 -4l-10.5 10.5v4"/><path d="M13.5 6.5l4 4"/></svg>';
const WK_BIN='<svg class="ui-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7l16 0"/><path d="M10 11l0 6"/><path d="M14 11l0 6"/><path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12"/><path d="M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3"/></svg>';
function wkMenuClose(){document.querySelectorAll('.wk-menu:not([hidden])').forEach(m=>{m.hidden=true;const b=m.previousElementSibling;if(b){b.setAttribute('aria-expanded','false');b.classList.remove('on');}});}
function wkMenu(btn){
  const m=btn.nextElementSibling,open=m&&m.hidden;wkMenuClose();if(!open)return;
  m.hidden=false;btn.setAttribute('aria-expanded','true');btn.classList.add('on');
  const f=m.querySelector('button');if(f)f.focus();
}
document.addEventListener('click',e=>{if(!e.target.closest||!e.target.closest('.wk-menu,.wk-mo'))wkMenuClose();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.querySelector('.wk-menu:not([hidden])')){const b=document.querySelector('.wk-mo.on');wkMenuClose();if(b)b.focus();}});
// a hand-logged workout and an Intervals.icu one of the same type on the same day
function findDups(){
  const d=S(),ok=d.dupOk||[],out=[];
  wkOn().filter(w=>isIcu(w)&&daysAgo(w.date)<30).forEach(a=>{
    const m=wkOn().find(w=>!isIcu(w)&&!w.isEx&&w.date===a.date&&w.type===a.type&&!ok.includes(w.id+'|'+a.id)&&!out.some(p=>p.m.id===w.id));
    if(m)out.push({m,a});
  });
  return out;
}
function dupHTML(){
  return findDups().map(({m,a})=>`<div class="wk-dup"><div class="wk-dup-t">${m.date===td()?"Today's":daysAgo(m.date)===1?"Yesterday's":fmtDay(m.date)} ${esc(m.type.toLowerCase())} is logged twice</div><div class="wk-dup-s">Once by hand and once recorded automatically. Combining keeps one workout with your effort, note${m.sets?', sets':''} and the watch data.</div><div class="wk-acts"><button type="button" onclick="mergeDup('${esc(m.id)}','${esc(a.id)}')">Combine into one</button><button type="button" onclick="keepDup('${esc(m.id)}','${esc(a.id)}')">Keep both</button></div></div>`).join('');
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
const effSugs=()=>{const d=S(),ok=d.effOk||[];return wkOn().filter(w=>isIcu(w)&&!w.rpe&&wIcu(w).rpe&&daysAgo(w.date)<30&&!ok.includes(w.id)).sort((a,b)=>a.date<b.date?1:-1).slice(0,3);};
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
function renderSoreSug(){const b=$('injSug');if(b)b.innerHTML=soreHTML();}
function renderWkLog(){
  const d=S(),el=$('wkRecent');if(!el)return;
  const ws=wkOn().filter(w=>daysAgo(w.date)<7).sort((a,b)=>a.date<b.date?1:a.date>b.date?-1:(b.ts||0)-(a.ts||0));
  $('wkDup').innerHTML=dupHTML()+effHTML();renderSoreSug();wkPrefill();painMark();
  const n=$('wkIcuNote'),on=!!(d.intervalsKey&&d.intervalsID);
  n.style.display=on?'':'none';
  n.textContent=on?'Workouts recorded by your watch arrive here on their own after a sync. Add by hand only what the watch did not record.':'';
  el.innerHTML=ws.length?`<div class="lg-sh">Last 7 days</div>`+ws.map(w=>wkRow(w)).join(''):'';
  lgStat();
}

// ── MEASUREMENTS ─────────────────────────────────────────────────────────────
function saveMeas(){
  const sys=$('bpSys').value,dia=$('bpDia').value;
  if((sys&&!dia)||(dia&&!sys)){showToast('Enter both blood pressure numbers, top and bottom');return;}
  const sN=+sys,dN=+dia;
  const [sLo,sHi]=TH.BP_SYS_RNG,[dLo,dHi]=TH.BP_DIA_RNG,[hLo,hHi]=TH.HR_RNG;
  if(sys&&dia){if(sN<sLo||sN>sHi){showToast(`Systolic: ${sLo}–${sHi}`);return;}if(dN<dLo||dN>dHi){showToast(`Diastolic: ${dLo}–${dHi}`);return;}if(sN<=dN){showToast('Systolic must be higher than diastolic');return;}}
  const wt=+$('wtKg').value||null,hr=+$('hrVal').value||null;
  if(wt&&(wt<30||wt>250)){showToast('Weight: 30–250 kg');return;}
  if(hr&&(hr<hLo||hr>hHi)){showToast(`Resting HR: ${hLo}–${hHi} bpm`);return;}
  const pw=last(S().measurements.filter(m=>m.weight&&!m.isEx&&daysAgo(m.date)<=7));
  if(wt&&pw&&Math.abs(wt-pw.weight)>=4&&!sane(`${wt} kg is ${Math.round(Math.abs(wt-pw.weight)*10)/10} kg different from your last weigh-in (${pw.weight} kg).`))return;
  if(!sN&&!wt&&!hr){showToast('Enter at least one measurement');return;}
  const rec={id:mkId(),date:td(),bpSys:sN||null,bpDia:dN||null,weight:wt,hr};
  rec.src=manSrc(null,rec,['bpSys','bpDia','weight','hr']);
  put('meas',rec);
  ['bpSys','bpDia','wtKg','hrVal'].forEach(i=>$(i).value='');
  updMeasHist();renderWtChart();showToast('Measurements saved');
}
function updMeasHist(){
  const ms=S().measurements;
  const b=ms.filter(m=>m.bpSys).reduce((a,m)=>!a||m.date>a.date||(m.date===a.date&&(bpT(m)||'')>=(bpT(a)||''))?m:a,null),w=last(ms.filter(m=>m.weight)),h=last(ms.filter(m=>m.hr));
  $('bpRec').textContent=b?`${b.bpSys}/${b.bpDia} mmHg${bpT(b)?' · '+bpT(b):''}`:'—';
  $('wtRec').textContent=w?`${w.weight} kg`:'—';
  $('hrRec').textContent=h?`${h.hr} bpm`:'—';
  bpBleInit();lgStat();
}

// ── BLOOD PRESSURE MONITOR (v135, docs/plan-omron-ble.md) ────────────────────
// Reads new readings from a monitor with the standard Bluetooth Blood Pressure service (0x1810, measurement 0x2A35).
// One record per reading, id bp-<date>-<HHMM> from the reading's own time, so a resend is the same record.
// The cuff pulse is shown in the toast only, never stored as resting heart rate (owner's decision).
const BP_SVC=0x1810,BP_MEAS=0x2A35,BP_CTS=0x1805;
let _bpBusy=false,_bpHold=null;
// IEEE-11073 16-bit SFLOAT: 4-bit signed exponent, 12-bit signed mantissa; the special values read as null
function sfloat(u){
  if([0x07FF,0x0800,0x07FE,0x0802,0x0801].includes(u))return null;
  let m=u&0x0FFF,e=u>>12;if(m>=0x0800)m-=0x1000;if(e>=8)e-=16;
  return e<0?m/Math.pow(10,-e):m*Math.pow(10,e);
}
// One 0x2A35 value: flags, systolic, diastolic, mean pressure, then time stamp, pulse, user and status when flagged
function bpParse(dv){
  if(!dv||dv.byteLength<7)return null;
  const f=dv.getUint8(0),u16=i=>dv.getUint16(i,true),k=f&1?TH.BP_KPA:1,mm=v=>v==null?null:Math.round(v*k);
  const sys=mm(sfloat(u16(1))),dia=mm(sfloat(u16(3))),map=mm(sfloat(u16(5)));
  let o=7,at=null,pulse=null,user=null,st=0;
  if(f&2){if(dv.byteLength<o+7)return null;const y=u16(o),mo=dv.getUint8(o+2),d=dv.getUint8(o+3);
    if(y&&mo&&d)at=new Date(y,mo-1,d,dv.getUint8(o+4),dv.getUint8(o+5),dv.getUint8(o+6));o+=7;}
  if(f&4){if(dv.byteLength<o+2)return null;const p=sfloat(u16(o));pulse=p==null?null:Math.round(p);o+=2;}
  if(f&8){if(dv.byteLength<o+1)return null;const x=dv.getUint8(o);user=x===255?null:x;o+=1;}
  if(f&16){if(dv.byteLength<o+2)return null;st=u16(o);o+=2;}
  if(sys==null||dia==null)return null;
  return {sys,dia,map,pulse,at,user,move:!!(st&1),cuff:!!(st&2),irr:!!(st&4)};
}
// The time of day of a monitor reading, from its id ('07:12'), else null
function bpT(rec){const m=/^bp-\d{4}-\d{2}-\d{2}-(\d{2})(\d{2})/.exec(rec&&rec.id||'');return m?m[1]+':'+m[2]:null;}
const bpP2=n=>String(n).padStart(2,'0');
// Decides what to keep from one read: readings r {…bpParse, got (arrival Date)} in the order they arrived.
// Returns the new records and the counts the toast reports; ask = readings of two users and none chosen yet.
function bpKeep(rs,now=new Date()){
  const o={add:[],same:0,gone:0,range:0,old:0,clock:0,phone:0,move:0,cuff:0,other:0,pulse:null,ask:false};
  const users=[...new Set(rs.map(r=>r.user).filter(x=>x!=null))],me=S().bpUser;
  if(users.length>1&&me==null){o.ask=true;return o;}
  const [sLo,sHi]=TH.BP_SYS_RNG,[dLo,dHi]=TH.BP_DIA_RNG,[hLo,hHi]=TH.HR_RNG,ms=S().measurements;
  const bad=r=>r.at&&(r.at-now>TH.BP_BLE_FUT*60000||r.at.getFullYear()<TH.BP_BLE_Y0);
  const lastBad=rs.filter(bad).pop();
  rs.forEach(r=>{
    if(me!=null&&r.user!=null&&r.user!==me){o.other++;return;}
    let at=r.at;
    if(!at){at=r.got||now;o.phone++;}
    else if(bad(r)){if(r!==lastBad){o.clock++;return;}at=r.got||now;o.clock++;}
    if(now-at>TH.BP_BLE_OLD*864e5){o.old++;return;}
    if(r.sys<sLo||r.sys>sHi||r.dia<dLo||r.dia>dHi||r.sys<=r.dia||(r.pulse!=null&&(r.pulse<hLo||r.pulse>hHi))){o.range++;return;}
    const date=ymd(at);
    if(ms.some(m=>m.date===date&&!/^bp-/.test(String(m.id))&&m.bpSys===r.sys&&m.bpDia===r.dia)){o.same++;return;}
    const base=`bp-${date}-${bpP2(at.getHours())}${bpP2(at.getMinutes())}${r.user>1?'-u'+r.user:''}`;
    for(let n=1;;n++){
      const id=n===1?base:base+'-'+n,ex=ms.find(m=>m.id===id)||o.add.find(m=>m.id===id);
      if(ex&&ex.bpSys===r.sys&&ex.bpDia===r.dia){o.same++;return;}
      if(!ex&&isGone(id)){o.gone++;return;}
      if(ex)continue;
      o.add.push({id,date,bpSys:r.sys,bpDia:r.dia,weight:null,hr:null,src:{bpSys:'mon',bpDia:'mon'}});
      if(r.move)o.move++;if(r.cuff)o.cuff++;if(r.pulse!=null)o.pulse=r.pulse;
      return;
    }
  });
  if(!o.add.length)o.phone=0;
  return o;
}
const bpN=(n,w)=>`${n} ${w}${n===1?'':'s'}`;
// The toast after a read, in the counts bpKeep returned
function bpMsg(o){
  const a=o.add.length,t=[];
  t.push(a?`${bpN(a,'reading')} added${o.same?`, ${o.same} already in`:''}`:o.same?`${bpN(o.same,'reading')} already in`:'No new readings on the monitor');
  if(o.pulse!=null&&a)t.push(`Pulse ${o.pulse} bpm`);
  if(o.move)t.push(`${o.move} taken while moving`);
  if(o.cuff)t.push(`${o.cuff} with the cuff loose`);
  if(o.range)t.push(`${bpN(o.range,'reading')} skipped: outside the usual range`);
  if(o.old)t.push(`${bpN(o.old,'reading')} over a year old left out`);
  if(o.clock)t.push(`The monitor's clock is off; set it on the monitor`);
  else if(o.phone)t.push('Time from your phone');
  return t.join('. ')+'.';
}
// Saves what bpKeep kept and reports it, with Undo
function bpApply(rs){
  if(!rs.length){showToast('No new readings on the monitor');return null;}
  const o=bpKeep(rs);
  if(o.ask){_bpHold=rs;bpUserUI();return o;}
  o.add.forEach(r=>put('meas',r));
  const d=S();if(!d.bpOk){d.bpOk=1;save(d);}
  updMeasHist();if(o.add.length)refreshAll();
  showToast(bpMsg(o),o.add.length?{label:'Undo',fn:()=>{o.add.forEach(r=>del('meas',r.id));updMeasHist();refreshAll();}}:null);
  return o;
}
// The button: one read through the browser's device chooser (it must run inside the tap)
async function bpRead(){
  if(_bpBusy||!navigator.bluetooth)return;
  const st=$('bpBleSt'),rs=[];let dev=null,idle=null,done=null;
  _bpBusy=true;
  try{
    dev=await navigator.bluetooth.requestDevice({filters:[{services:[BP_SVC]},{namePrefix:'BLEsmart_'}],optionalServices:[BP_SVC,BP_CTS]});
  }catch(e){
    _bpBusy=false;
    if(e&&/adapter|bluetooth is off|turned off/i.test(e.message||''))showToast('Turn on Bluetooth and try again');
    else if(!e||e.name!=='NotFoundError')showToast('Could not reach the monitor. Try again.');
    return;
  }
  const fin=new Promise(r=>done=r),kick=()=>{clearTimeout(idle);idle=setTimeout(done,TH.BP_BLE_IDLE*1000);};
  const onOff=()=>done();
  dev.addEventListener('gattserverdisconnected',onOff);
  let err=null;
  try{
    st.textContent='Connecting…';
    const srv=await dev.gatt.connect();
    let ch=null;
    try{ch=await (await srv.getPrimaryService(BP_SVC)).getCharacteristic(BP_MEAS);}catch(e){err='svc';}
    if(ch){
      ch.addEventListener('characteristicvaluechanged',ev=>{const r=bpParse(ev.target.value);if(r){r.got=new Date();rs.push(r);}kick();});
      await ch.startNotifications();
      st.textContent='Waiting for readings…';kick();
      await fin;
    }
  }catch(e){if(!err)err='link';}
  clearTimeout(idle);dev.removeEventListener('gattserverdisconnected',onOff);
  try{if(dev.gatt.connected)dev.gatt.disconnect();}catch(e){}
  st.textContent='';_bpBusy=false;
  if(err==='svc'){showToast('This monitor does not share readings this way. Enter them by hand.');return;}
  if(err&&!rs.length){showToast('Could not reach the monitor. Try again.');return;}
  return bpApply(rs);
}
// Which user of a two-user monitor this phone reads (local only)
function bpSetUser(n){
  const d=S();d.bpUser=n;save(d);
  const rs=_bpHold;_bpHold=null;bpUserUI();
  if(rs)bpApply(rs);
}
function bpUserUI(){
  const me=S().bpUser,q=$('bpBleUs'),row=$('bpUserRow');
  if(q)q.hidden=!_bpHold;
  if(row)row.hidden=me==null;
  document.querySelectorAll('.bp-uc').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.u===me&&!(_bpHold&&b.closest('#bpBleUs')))));
}
// Shows the button wherever the browser can use Bluetooth (v136: also while Bluetooth is off, with a line to turn it on)
let _bpAv=false;
async function bpBleInit(){
  const w=$('bpBleW');if(!w)return;
  const bt=navigator.bluetooth;let on=!!bt;
  if(bt&&bt.getAvailability){try{on=await bt.getAvailability();}catch(e){}}
  if(bt&&!_bpAv&&bt.addEventListener){_bpAv=true;try{bt.addEventListener('availabilitychanged',()=>bpBleInit());}catch(e){}}
  w.hidden=!bt;
  const no=$('bpBleNo');if(no)no.hidden=!!bt;
  const off=$('bpBleOff');if(off)off.hidden=!bt||!!on;
  const h=$('bpBleHint');if(h)h.hidden=!!S().bpOk;
  bpUserUI();
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
  lgStat();
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
// v132: upper edges are exclusive (glucose 100 is raised, 126 high; cholesterol 200 borderline, 240 high; uric acid from 6.8)
const BM_RNG={glucose:{ok:[70,TH.GLU_PRE],warn:[TH.GLU_PRE,TH.GLU_HIGH]},chol:{ok:[0,200],warn:[200,240]},uric:{ok:[3.5,TH.URIC_DOC],warn:[TH.URIC_DOC,8.0]}};
function scoreBM(v,t){
  const rng=BM_RNG[t];if(!rng||!v)return{score:null,status:'—'};
  if(v>=rng.ok[0]&&v<rng.ok[1])return{score:90,status:'ok'};
  if(v>=rng.warn[0]&&v<rng.warn[1])return{score:55,status:'warn'};
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
  lgStat();
  renderBloodDisplay();showToast('Blood results saved');
}
function renderBloodDisplay(){
  const d=S(),b=last(d.bloodLogs);
  const el=$('bmDisplay');if(!el)return;
  if(!b){el.innerHTML='<div class="hist-ttl">NO RESULTS YET</div><div style="font-size:12px;color:var(--t3)">Enter your latest lab results below (mg/dL).</div>';return;}
  lgStat();
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
  const w=slWhy(sl);
  return[['lCheckin',ciFull(ci)],['lSleep',!!(sl&&(sl.durMin||sl.score)&&!w),w?'part':'',w?w.hd:''],['lWorkout',wkOn().some(w=>w.date===t)],['lMind',(ci?.mindfulMin||0)>0]];
}
function renderLogHead(){
  const st=logStatus(),n=st.filter(x=>x[1]).length,el=$('lgProg');
  st.forEach(([id,ok,part])=>{const r=$(id);if(!r)return;r.classList.toggle('done',ok);r.classList.toggle('part',part==='part');
    const i=$(id+'St');if(i){const k=ok?'ok':part==='part'?'pt':'no';if(i._k!==k){i._k=k;i.className='log-st '+k;i.setAttribute('role','img');i.setAttribute('aria-label',ok?'Done':k==='pt'?'Needs a detail':'Not done');i.innerHTML=LG_ST[k];}}});
  const pt=st.find(x=>x[2]==='part'),note=pt?pt[3].charAt(0).toUpperCase()+pt[3].slice(1)+'.':'';
  const day=new Date(td()+'T12:00:00').toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'});
  const h=st.map(x=>x[1]?'1':x[2]==='part'?'p':'0').join('')+'|'+note+'|'+day;
  if(el&&el._h!==h){el._h=h;
    el.innerHTML=`<div class="lp-h"><span><b>Today</b><small>${day}</small></span><span>${n} of ${st.length} done</span></div><div class="lp-seg" aria-hidden="true">${st.map(x=>`<i class="${x[1]?'ok':x[2]==='part'?'pt':''}"></i>`).join('')}</div>${note?`<div class="lp-n">${esc(note)}</div>`:''}`;}
  lgStat();
}
// status icons on the four daily rows: done, needs a detail, not done
const LG_O='<path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0"/>';
const LG_ST={ok:`<svg class="ui-i" viewBox="0 0 24 24" aria-hidden="true">${LG_O}<path d="M9 12l2 2l4 -4"/></svg>`,pt:`<svg class="ui-i" viewBox="0 0 24 24" aria-hidden="true">${LG_O}<path d="M12 8v4"/><path d="M12 16h.01"/></svg>`,no:`<svg class="ui-i" viewBox="0 0 24 24" aria-hidden="true">${LG_O}</svg>`};
// v129: the one-line summary under every Log row, written in one place
const lgAgo=dt=>{const n=daysAgo(dt);return n<=0?'today':n===1?'yesterday':n+' days ago';};
const lgClock=ts=>new Date(ts).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
function lgPlan(){try{const x=strategy().days[0];return x&&x.type&&x.role!=='rest'&&x.role!=='race'&&x.role!=='recover'?x.type:'';}catch(e){return'';}}
function lgSum(){
  const d=S(),t=td(),ci=todayCI(),o={};
  if(ciFull(ci)){const m=mindOf(ci);o.ciStat=(m>=TH.MIND_GOOD?'Good':m>=TH.MIND_FLAT?'Flat':'Strained')+(ci.ts?' · '+lgClock(ci.ts):'');}
  else o.ciStat='Takes under a minute';
  const sl=d.sleepLogs.find(s=>s.date===t),w=slWhy(sl);
  o.sleepStat=!sl?'Not logged today':[sl.durMin?fmtDur(sl.durMin):sl.score?'Score '+sl.score:'',w?w.sm:sl.bed&&sl.wake?sl.bed+' to '+sl.wake:''].filter(Boolean).join(' · ')||'Logged today';
  const wt=wkOn().filter(x=>x.date===t);
  if(wt.length===1){const x=wt[0];o.wkStat=[wkLabel(x),!(x.sets&&x.sets.length)&&x.durMin?fmtDur(x.durMin):'',fmtDist(x)].filter(Boolean).join(' · ');}
  else if(wt.length){const m=wt.reduce((a,x)=>a+(x.durMin||0),0);o.wkStat=wt.length+' workouts'+(m?' · '+fmtDur(m):'');}
  else{const p=lgPlan();o.wkStat=p?'Plan today: '+p:'Nothing logged today';}
  const mm=ci?.mindfulMin||0;o.mindStat=mm?mm+' min today':'Not yet today';
  const fd=fuFood(t);o.foodStat='Optional · '+(fd?fuN(fd.kcal)+' kcal so far':'nothing yet');
  const ms=d.measurements.filter(x=>x.date<=t).slice().sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:0),mw=ms.filter(x=>x.weight).pop(),ml=ms[ms.length-1],mb=ms.filter(x=>x.bpSys&&x.bpDia).pop();
  o.measStat=mb&&(!mw||mb.date>=mw.date)?'Blood pressure '+mb.bpSys+'/'+mb.bpDia+' · '+lgAgo(mb.date):mw?'Weighed '+lgAgo(mw.date)+' · '+mw.weight+' kg':ml?'Measured '+lgAgo(ml.date):'Weight, blood pressure, resting heart rate';
  const bl=d.bloodLogs.filter(x=>x.date<=t).map(x=>x.date).sort().pop();
  o.bloodStat=bl?'Last test '+fmtD(bl):'Glucose, cholesterol, uric acid';
  const ij=d.injuries.filter(x=>x.active).slice().sort((a,b)=>a.date<b.date?1:a.date>b.date?-1:0);
  o.injStat=ij.length?ij.length+' active · '+ij[0].part+(ij.length>1?' and '+(ij.length-1)+' more':''):'None active';
  return o;
}
function lgStat(){const o=lgSum();for(const k in o){const e=$(k);if(e&&e.textContent!==o[k])e.textContent=o[k];}}
function logAuto(){
  renderLogHead();
  document.querySelectorAll('.log-sec.open').forEach(x=>x.classList.remove('open'));
  const nx=logStatus().find(x=>!x[1]);if(nx)$(nx[0]).classList.add('open');
}
