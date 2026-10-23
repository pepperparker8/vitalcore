// ── COACH VIEW: one screen for "should I train today, and what should I watch" ──
// v132: every item carries an icon (ic, a UI key), an optional value (v, with g the arrow and w the word under it)
// and the summary row it opens (go). Only the injury item sets `hard` (strategy reads it). Pinned items lead.
function coachFlags(){
  const d=S(),fl=[],t=td(),F=n=>typeof window[n]==='function',thr=F('stThr')?stThr():null;
  const inj=d.injuries.filter(i=>i.active);
  inj.forEach(i=>fl.push({k:'injury',ic:'bandage',go:'injury',hard:i.sev>=3,st:i.sev>=3?'bad':'warn',t:`${i.part} injury (${['','mild','moderate','severe'][i.sev]})`,a:'Adjust sessions that load it.'}));
  // v123: the fact once in the title, what to do once in the note. The debt has its own item below.
  const DIC={hrv:'pulse',rhr:'heart',resp:'lungs',sleep:'moon',load:'bolt'},DT={sleep:'Short night',load:'Hard day yesterday'};
  // v132: HRV and resting heart rate read Body's parts (the 7-night HRV, today's resting HR against its band), the same numbers as Today's call
  const HV=F('bodyHrvPart')?bodyHrvPart(t).part:null,RH=F('bodyRhrPart')?bodyRhrPart(t).part:null;
  if(HV&&HV.z<=TH.HRV_EASY_Z)fl.push({k:'hrv',ic:'pulse',go:'recovery',st:'warn',t:'Heart rate variability',v:Math.round(HV.v7)+' ms',g:'▼',w:`usual ${Math.round(HV.m)} ms`,a:'Lower than usual over the last week. Keep today easy.'});
  if(RH&&RH.z>=TH.RHR_WATCH_Z)fl.push({k:'rhr',ic:'heart',go:'recovery',st:'warn',t:'Resting heart rate',v:Math.round(RH.v)+' bpm',g:'▲',w:`usual ${Math.round(RH.m)} bpm`,a:'Often fatigue, illness or poor sleep. Watch how you feel.'});
  recoveryDrivers().forEach(r=>{if(r.st==='ok'||r.k==='debt'||r.k==='hrv'||r.k==='rhr')return;
    fl.push({k:r.k,ic:DIC[r.k]||'pulse',go:'recovery',st:r.st,t:DT[r.k]||r.label,v:r.k==='load'?'':r.val,g:r.k==='hrv'||r.k==='sleep'?'▼':'▲',w:r.k==='load'?'':r.base,a:r.txt});});
  if(F('sleepDebt')){const D=sleepDebt(t);if(D&&D.min>=TH.DEBT_WARN){const st=D.state;
    fl.push({k:'debt',ic:'zzz',go:'recovery',st:D.min>=TH.DEBT_BAD?'bad':'warn',t:'Sleep debt',v:fmtDur(D.min),g:st==='building'?'▲':st==='paying'?'▼':'●',w:st==='building'?'Building':st==='paying'?'Paying back':'Steady',a:debtLine(D)});}}
  const wk=loadWeeks();const cur=wk[wk.length-2];if(cur&&cur.jump)fl.push({k:'jump',ic:'chartLine',go:'training',st:'warn',t:'Big jump in training',v:`+${cur.jump}%`,g:'▲',w:'last week',a:'Keep this week similar or easier.'});
  // v118 (A3 ledger): form and burnout explain, they no longer set today's verdict. Form is read under Load, burnout under Mind (the weekly hard-day budget).
  const tsb=tsbOn(td());if(tsb!=null&&tsb<TH.FORM_TIRED)fl.push({k:'form',ic:'battery',go:'training',st:tsb<TH.FORM_DEEP?'bad':'warn',t:tsb<TH.FORM_DEEP?'Carrying a lot of fatigue':'Carrying fatigue',a:tsb<TH.FORM_DEEP?'Keep the next few days easy.':'An easy day or two will freshen you up.'});
  const b=calcBurnout();if(b.score>=TH.BURNOUT_HIGH)fl.push({k:'burnout',ic:'mood',go:'recovery',st:'warn',t:'Energy, mood or calm low for a week',a:'Keep hard days few and protect sleep.'});
  // v132 (R3.4): heart rate above your similar sessions at the same pace or speed, twice in a row
  if(F('hrPaceList')&&thr){const L=hrPaceList(t,thr);if(L[0]&&L[0].run&&daysAgoBetween(L[0].w.date,t)<7){
    const ty=L.slice(0,TH.HR_PACE_N).map(x=>x.w.type),nn=ty.every(x=>x==='Run')?'runs':ty.every(x=>x==='Cycle')?'rides':'sessions';
    fl.push({k:'hrpace',ic:'heart',go:'training',st:'warn',t:nn==='runs'?'Heart rate at easy pace':nn==='rides'?'Heart rate on easy rides':'Heart rate in easy sessions',v:`+${L[0].r.d} bpm`,g:'▲',w:`${TH.HR_PACE_N} ${nn}`,
      a:`Higher than your last ${TH.SIM_N} similar ${nn}, ${TH.HR_PACE_N===2?'twice':TH.HR_PACE_N+' times'} in a row. A sign, not a verdict.`});}}
  // v132 (R3.2, R3.3, R4.3): overreaching, sameness and the session mix
  if(F('overreach')&&thr){const o=overreach(t,thr);if(o&&o.on)fl.push({k:'ovr',ic:'chartLine',go:'training',st:o.doc?'bad':'warn',t:'Watch for overreaching',v:`${o.days} days`,
    a:o.doc?'Mood down, sessions harder and load up for 2 weeks. Ease off, and worth talking to a doctor.':'Mood down, sessions harder and load up together. Take a few easier days.'});}
  if(F('monotony')){const m=monotony(t);if(m&&m.on)fl.push({k:'mono',ic:'chartLine',go:'training',st:'warn',t:'Every day much the same',a:'A heavy week with no easy days. Make some days clearly easier than others.'});}
  if(F('sessMix28')&&thr){const m=sessMix28(t,thr);if(m&&m.on){
    if(m.easyShare!=null&&m.easyShare<TH.EASY_SHARE)fl.push({k:'mix',ic:'chartLine',go:'training',st:'warn',t:'Too little easy training',v:`${Math.round(m.easyShare*100)}% easy`,a:`Aim for ${Math.round(TH.EASY_AIM_LO*100)}% or more easy.`});
    else if(m.hard7max>TH.HARD_7)fl.push({k:'mix',ic:'chartLine',go:'training',st:'warn',t:'Many hard sessions in a week',v:`${m.hard7max} in 7 days`,a:`Keep it to ${TH.HARD_7} hard sessions a week, with easy days between.`});}}
  // v132 (R6.3): the title names what was seen; the body signs give the fact, the check-in its words
  const ill=illness();if(ill){const sys=ill.lvl==='systemic',bd=ill.kind==='body';
    fl.push({k:'ill',ic:bd?'lungs':'steth',go:'recovery',pin:1,st:sys?'bad':'warn',t:ill.kind==='below'?'Symptoms below the neck: rest today':bd?(sys?'Your body may be fighting something: rest today':'Your body may be fighting something'):'Symptoms above the neck',
      a:(bd?ill.fact:ill.why)+(sys?' Train again once it has cleared.':bd?' Keep today easy and short.':' Keep today easy and controlled.')});
    // the body signs it already names are not repeated as items of their own
    if(bd){const nm={resp:1,rhr:ill.rhrUp,hrv:!ill.rhrUp&&ill.hrvDown};for(let i=fl.length-1;i>=0;i--)if(nm[fl[i].k])fl.splice(i,1);}}
  // v132 (R6.4, R6.5): coming back after being ill, and symptoms that last
  if(F('illBack')){const ib=illBack(t);if(ib){const a=((ib.first?'Start with a short, easy session. ':'')+(ib.hardFrom>t?`Hard sessions from ${fmtD(ib.hardFrom)}.`:'')).trim();
    fl.push({k:'illback',ic:'steth',go:'recovery',st:'warn',t:'Coming back from being ill',a:a||'Build back up over a few days.'});}}
  if(F('illDoc')){const id=illDoc(t);if(id)fl.push({k:'illdoc',ic:'steth',go:'recovery',pin:2,st:'bad',t:`Symptoms for ${id.days} days`,a:'Worth getting checked by a doctor.'});}
  // v132 (R5.4, R5.5): signs of eating too little, and weight falling fast
  let rs=null;if(F('redsSigns')&&thr){const r=redsSigns(t,thr);if(r&&r.on){rs=r;const w=r.signs.map(x=>x.why);
    fl.push({k:'reds',ic:'kitchen',go:'eat',st:'warn',t:'Signs you may not be eating enough',v:`${r.n} signs`,a:w[0]+(w[1]?', '+w[1][0].toLowerCase()+w[1].slice(1):'')+'. Worth talking to a sports doctor or dietitian.'});}}
  if(F('wtTrend')){const w=wtTrend(t);if(w&&w.fast&&w.date&&daysAgoBetween(w.date,t)<7&&!(rs&&rs.signs.some(x=>x.k==='weight')))
    fl.push({k:'wt',ic:'scale',go:'body',st:'warn',t:'Losing weight fast',v:`${w.fastWks} weeks`,g:'▼',w:'losing fast',a:`Lose no faster than about ${Math.round(TH.WT_RATE*w.now*10)/10} kg a week while training hard.`});}
  // v132 (R8.1): blood pressure in the guideline's ranges, never a diagnosis
  if(F('bpBand')){const p=bpBand(t);if(p){
    if(p.high&&p.last)fl.push({k:'bp',ic:'heart',go:'body',pin:3,st:'bad',t:'Blood pressure very high',v:`${p.last.bpSys}/${p.last.bpDia}`,g:'▲',a:'Read very high twice. Seek medical advice promptly.'});
    else if(p.band==='stage2'||p.band==='stage1')fl.push({k:'bp',ic:'heart',go:'body',st:'warn',t:'Blood pressure',v:`${p.sys}/${p.dia}`,g:'▲',w:p.word,
      a:p.band==='stage2'?'Average of your recent readings. Worth a mention to your doctor.':'Regular training tends to bring it down. Worth rechecking.'});}}
  // v132 (R8.2): blood markers outside the range, from a test in the last year
  if(typeof BM!=='undefined'&&typeof bmPts==='function')BM.forEach(([lb,k])=>{const p=last(bmPts(k));if(!p||daysAgo(p.d)>=TH.BM_WATCH_D)return;
    const s=bmState(p.v,k);if(s.c==='good')return;const wd=bmWord(k,p.v);
    fl.push({k:'bm_'+k,ic:'dna',go:'body',st:s.c==='bad'?'bad':'warn',t:lb,v:bmF(k,p.v),g:s.g,w:s.t,a:(wd!==s.t?wd+'. ':'')+`Tested ${fmtD(p.d)}.`});});
  const ci=d.checkins.find(c=>c.date===t&&ciFull(c));if(!ci)fl.push({k:'checkin',ic:'mood',go:'checkin',st:'info',t:'No check-in today',a:'Twenty seconds makes today\'s score more accurate.'});
  const R={bad:0,warn:1,info:2};
  return fl.map((f,i)=>({f,i})).sort((x,y)=>(x.f.pin||9)-(y.f.pin||9)||(R[x.f.st]??3)-(R[y.f.st]??3)||x.i-y.i).map(x=>x.f);
}
function coachVerdict(){
  const sc=heroScore();if(sc===null)return null;
  // v118 (A3 ledger): the score sets the level; two gates override it: a severe injury, and the illness gate (A4: systemic means rest, mild caps the day at hold steady).
  // Drivers, form, burnout and sleep flags explain, they no longer trigger. The full Body x Load table arrives in v119.
  const hurt=S().injuries.some(i=>i.active&&i.sev>=3),ill=illness(),c=scoreCuts();
  let lvl=sc<c.bad?'bad':sc<c.warn?'warn':'ok';
  if(hurt||(ill&&ill.lvl==='systemic'))lvl='bad';else if(ill&&lvl==='ok')lvl='warn';
  const head={ok:['Train','You are recovered. Follow the plan and push where it says to.'],warn:['Hold steady','Train, but keep it controlled. Do not add extra load today.'],bad:['Rest','Recovery is the priority. Easy movement or rest.']}[lvl];
  return{lvl,head,sc,ill};
}
// v134: no score, no verdict; the two gates still hold for the outline (a severe injury or systemic illness rests, a mild illness keeps it easy)
function coachGates(){
  const hurt=S().injuries.some(i=>i.active&&i.sev>=3),ill=illness();
  return{lvl:hurt||(ill&&ill.lvl==='systemic')?'bad':ill?'warn':null,head:null,sc:null,ill,gate:true};
}
// true when today's prescription is rest and nothing has been logged
function restToday(){try{const s=typeof strategy==='function'?strategy():null,d0=s&&s.days&&s.days[0];return !!(d0&&d0.role==='rest'&&!wkOn().some(w=>w.date===td()));}catch(e){return false;}}
function isExampleOnly(){
  const d=S(),real=a=>(a||[]).some(x=>!x.isEx);
  return !(real(d.checkins)||real(d.sleepLogs)||real(wkOn())||real(d.measurements)||real(d.bloodLogs))&&!Object.keys(d.wellness||{}).length;
}
function daysLogged(n){
  const d=S(),set=new Set();
  [d.checkins,d.sleepLogs,wkOn(),d.measurements].forEach(a=>(a||[]).forEach(x=>{if(!x.isEx&&daysAgo(x.date)<n)set.add(x.date);}));
  Object.keys(d.wellness||{}).forEach(k=>{if(daysAgo(k)<n)set.add(k);});
  return set.size;
}
function renderExTag(){const l=document.querySelector('.ring-lbl');if(l)l.textContent='READY';}
