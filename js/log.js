// ── WELCOME ──────────────────────────────────────────────────────────────────
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
function fillCI(){
  const c=todayCI();
  ['energy','mood','stress','motivation'].forEach(k=>{
    _ci[k]=c?.[k]||null;
    document.querySelectorAll(`#ciCard .ci-btns[data-k="${k}"] .ci-btn`).forEach((b,i)=>b.classList.toggle('sel',c?.[k]===i+1));
  });
  $('ciGrat').value=c?.gratitude||'';
  const done=ciFull(c);
  $('ciCard').classList.toggle('done',done);
  $('ciCta').textContent=done?'Update check-in':'Save check-in';
  const sum=$('ciSum');
  if(done){sum.innerHTML=`Saved today · Energy ${EM.energy[c.energy]} · Mood ${EM.mood[c.mood]} · Stress ${EM.stress[c.stress]} · Motivation ${EM.motivation[c.motivation]}`;sum.classList.add('show');}
  else sum.classList.remove('show');
}
function ciRec(){return todayCI()||{id:'ci-'+td(),date:td(),energy:null,mood:null,stress:null,motivation:null,mindfulMin:0,gratitude:''};}
function submitCI(){
  if(!_ci.energy||!_ci.mood||!_ci.stress||!_ci.motivation){showToast('Tap one face for each of the four rows');return;}
  const rec={...ciRec(),energy:_ci.energy,mood:_ci.mood,stress:_ci.stress,motivation:_ci.motivation,gratitude:$('ciGrat').value.trim()};
  put('checkins',rec);
  fillCI();showToast('Check-in saved 👍');refreshAll();
}

// ── MINDFULNESS ──────────────────────────────────────────────────────────────
function addMind(m){
  const rec=ciRec();rec.mindfulMin=(rec.mindfulMin||0)+m;
  put('checkins',rec);renderMind();showToast(`+${m} min mindfulness 🧘`);refreshAll();
}
function undoMind(){
  const c=todayCI();if(!c||!c.mindfulMin){showToast('Nothing to reset');return;}
  c.mindfulMin=0;put('checkins',c);renderMind();refreshAll();showToast('Minutes reset');
}
function renderMind(){$('mindToday').textContent=todayCI()?.mindfulMin||0;}
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

// ── QUICK WORKOUT (Today) ────────────────────────────────────────────────────
let _qx='Run',_qd=30;
function renderQuick(){
  $('qxGrid').innerHTML=SPORTS.map(([n,i])=>`<div class="ex-btn ${n===_qx?'sel':''}" onclick="selQx('${n}')"><div class="ex-ico">${i}</div><div class="ex-nm">${n}</div></div>`).join('');
  const st=IS_STR(_qx);
  $('qxDur').style.display=st?'none':'block';$('qxStr').style.display=st?'block':'none';
  $('qxSave').textContent=st?'Log sets in the Log tab':'Save workout';
  $('qxChips').innerHTML=[20,30,45,60,90].map(m=>`<button class="chip ${m===_qd?'sel':''}" onclick="_qd=${m};renderQuick()">${fmtDur(m)}</button>`).join('');
}
function selQx(n){_qx=n;renderQuick();}
function saveQuick(){
  if(IS_STR(_qx)){_selEx=_qx;switchTab('log');openLog('lWorkout');renderExGrid();return;}
  put('workouts',{id:mkId(),date:td(),type:_qx,distKm:0,durMin:_qd,rpe:3,notes:''});
  showToast(`${_qx} saved 💪`);refreshAll();
}

// ── SLEEP ────────────────────────────────────────────────────────────────────
function saveSleep(){
  const score=+$('slScore').value||null;
  if(score!==null&&(score<0||score>100)){showToast('Sleep score should be 0–100');return;}
  const dH=+$('slDH').value||0,dM=+$('slDM').value||0,rH=+$('slRH').value||0,rM=+$('slRM').value||0;
  if(!score&&!dH&&!dM&&!rH&&!rM&&!_ci.rested){showToast('Enter at least a sleep score');return;}
  const date=td();
  put('sleep',{id:'sl-'+date,date,score,deepH:dH,deepM:dM,remH:rH,remM:rM,rested:_ci.rested});
  $('sleepStat').textContent='✓ Logged today';
  setStages(dH,dM,rH,rM);renderSleepBars();showToast('Sleep logged');refreshAll();
}
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
}
function selEx(t){if(IS_STR(t)&&t!==_selEx)_sess=[];_selEx=t;renderExGrid();}
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
  if(sw){
    const m=+$('wDist').value||0;
    if(m>25000){showToast('Swim distance is in metres — that looks too high');return;}
    dist=Math.round(m)/1000;sub={pool:$('wPool').value,stroke:$('wStroke').value};
  }
  if(st){
    const r=collectSets();if(r.err){showToast(r.err);return;}
    sets=r.sets;prs=findPRs(sets);
  }
  const rec={id:mkId(),date,type:_selEx,distKm:dist,durMin:st?Math.max(10,Math.round(sets.filter(isWork).length*3)):dur,rpe:+$('wRPE').value||3,notes:$('wNotes').value.trim()};
  if(sets)rec.sets=sets;if(sub)rec.sub=sub;
  put('workouts',rec);
  ['wDH','wDM','wDist','wNotes'].forEach(i=>$(i).value='');$('wRPE').value='';_sess=[];if(st)renderStrength();$('wPace').textContent='';
  $('wkStat').textContent='✓ Saved';showToast(prs.length?`New best 🏆 ${prs[0]}`:'Workout recorded 💪');refreshAll();
}
function repeatLast(){
  const w=last(S().workouts);if(!w){showToast('No previous workout');return;}
  _selEx=w.type;_sess=[];if(w.sets)loadSession(w.sets);renderExGrid();
  $('wDH').value=Math.floor((w.durMin||0)/60)||'';$('wDM').value=(w.durMin||0)%60||'';
  $('wDist').value=w.type==='Swim'?(Math.round((w.distKm||0)*1000)||''):(w.distKm||'');if(w.sub){$('wPool').value=w.sub.pool||'pool';$('wStroke').value=w.sub.stroke||'Freestyle';}$('wRPE').value=w.rpe||'';$('wNotes').value=w.notes||'';
  showToast('Last workout loaded — change the date and record');
}
function delWorkout(id){
  if(!confirm('Delete this workout?'))return;
  const w=S().workouts.find(x=>x.id===id);
  del('workouts',id);if(w)openDay(w.date);refreshAll();showToast('Workout deleted');
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
  if(!sN&&!wt&&!hr){showToast('Enter at least one measurement');return;}
  put('meas',{id:mkId(),date:td(),bpSys:sN||null,bpDia:dN||null,weight:wt,hr});
  ['bpSys','bpDia','wtKg','hrVal'].forEach(i=>$(i).value='');
  $('measStat').textContent='✓ Saved today';
  updMeasHist();renderHRVSpark();renderWtChart();showToast('Measurements saved');
}
function updMeasHist(){
  const ms=S().measurements;
  const b=last(ms.filter(m=>m.bpSys)),w=last(ms.filter(m=>m.weight)),h=last(ms.filter(m=>m.hr));
  $('bpRec').textContent=b?`${b.bpSys}/${b.bpDia} mmHg`:'—';
  $('wtRec').textContent=w?`${w.weight} kg`:'—';
  $('hrRec').textContent=h?`${h.hr} bpm`:'—';
  const l=last(ms);$('measStat').textContent=l?(l.date===td()?'✓ Saved today':`Last: ${daysAgo(l.date)} days ago`):'Not logged yet';
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
      <div class="inj-body"><div class="inj-name">${esc(inj.part)}</div><div class="inj-date">${inj.date}${inj.notes?' · '+esc(inj.notes):''}</div></div>
      <button onclick="clearInjury('${inj.id}')" style="background:none;border:none;color:var(--t3);cursor:pointer;font-size:22px;min-width:44px;min-height:44px" aria-label="Mark healed">×</button>
    </div>`).join('');
}
function clearInjury(id){
  const r=S().injuries.find(i=>i.id===id);if(!r)return;
  r.active=false;put('inj',r);renderInjuryDisplay();showToast('Marked as healed');refreshAll();
}

// ── BLOOD MARKERS ────────────────────────────────────────────────────────────
function scoreBM(v,t){
  const r={glucose:{ok:[70,100],warn:[100,125]},chol:{ok:[0,200],warn:[200,239]},uric:{ok:[3.5,7.2],warn:[7.2,8.0]},hdl:{ok:[40,999],warn:[35,40]},ldl:{ok:[0,100],warn:[100,130]}};
  const rng=r[t];if(!rng||!v)return{score:null,status:'—'};
  if(v>=rng.ok[0]&&v<=rng.ok[1])return{score:90,status:'ok'};
  if(v>=rng.warn[0]&&v<=rng.warn[1])return{score:55,status:'warn'};
  return{score:20,status:'bad'};
}
function saveBlood(){
  const date=$('bmDate').value||td();
  const v={glucose:+$('bmG').value||null,chol:+$('bmC').value||null,uric:+$('bmU').value||null,hdl:+$('bmH').value||null,ldl:+$('bmL').value||null};
  if(!Object.values(v).some(Boolean)){showToast('Enter at least one marker');return;}
  if(v.glucose&&(v.glucose<20||v.glucose>600)){showToast('Glucose value seems off (mg/dL)');return;}
  if(v.chol&&(v.chol<50||v.chol>500)){showToast('Cholesterol value seems off (mg/dL)');return;}
  put('blood',{id:mkId(),date,...v});
  ['bmG','bmC','bmU','bmH','bmL'].forEach(i=>$(i).value='');
  $('bloodStat').textContent=`Last tested: ${date}`;
  renderBloodDisplay();showToast('Blood results saved');
}
function renderBloodDisplay(){
  const d=S(),b=last(d.bloodLogs);
  const el=$('bmDisplay');if(!el)return;
  if(!b){el.innerHTML='<div class="hist-ttl">NO RESULTS YET</div><div style="font-size:12px;color:var(--t3)">Enter your latest lab results below (mg/dL).</div>';return;}
  $('bloodStat').textContent=`Last tested: ${b.date}`;
  const markers=[['Glucose','glucose'],['Cholesterol','chol'],['Uric Acid','uric'],['HDL','hdl'],['LDL','ldl']];
  const C=2*Math.PI*12;
  el.innerHTML=`<div class="hist-ttl">LAST RESULTS · ${b.date}</div>`+markers.filter(([,k])=>b[k]).map(([name,k])=>{
    const s=scoreBM(b[k],k);
    const col=s.status==='ok'?'var(--green)':s.status==='warn'?'var(--amber)':'var(--red)';
    const hist=d.bloodLogs.slice(-5).map(x=>x[k]).filter(Boolean);
    const mx=Math.max(...hist,1);
    const spark=hist.length>1?`<div class="bm-spark">${hist.map(v=>`<div class="bm-spark-bar" style="height:${Math.round(v/mx*16)+2}px;background:${col};opacity:0.5"></div>`).join('')}</div>`:'';
    return`<div class="bm-row"><div><div class="bm-name">${name}</div><div class="bm-unit">${b[k]} mg/dL</div>${spark}</div>
      <div class="bm-right"><div class="bm-ring"><svg width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="12" fill="none" stroke="rgba(0,0,0,0.08)" stroke-width="3"/><circle cx="16" cy="16" r="12" fill="none" stroke="${col}" stroke-width="3" stroke-linecap="round" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C*(1-(s.score||0)/100)).toFixed(1)}"/></svg><div class="bm-ring-num" style="color:${col}">${s.score||'—'}</div></div>
      <span class="bm-badge ${s.status}">${s.status==='ok'?'Normal':s.status==='warn'?'Border':'High'}</span></div></div>`;
  }).join('');
}

