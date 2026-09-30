// ── WEEKLY REVIEW: shown Mon to Wed on Today for the week that just ended ────
function reviewRange(){
  const m=new Date(td()+'T12:00:00');m.setDate(m.getDate()-((m.getDay()+6)%7));
  const thisMon=ymd(m),a=new Date(m);a.setDate(a.getDate()-7);
  return{from:ymd(a),to:thisMon,thisMon};
}
function reviewData(){
  const d=S(),{from,to}=reviewRange(),In=x=>x.date>=from&&x.date<to;
  const ws=d.workouts.filter(In).filter(w=>!w.isEx);
  const pr=[];
  const h=exHistory();
  h.forEach((a,ex)=>{let best=0;a.forEach(x=>{if(x.date<from)best=Math.max(best,x.e1);});a.filter(In).forEach(x=>{if(x.e1>best+0.01&&best>0){pr.push(`${ex} ~${Math.round(x.e1*10)/10} kg 1RM`);best=x.e1;}});});
  ['Run','Cycle','Hike','Walk'].forEach(t=>{
    const all=d.workouts.filter(w=>w.type===t&&w.distKm>0),prev=Math.max(0,...all.filter(w=>w.date<from).map(w=>w.distKm)),wk=all.filter(In).sort((x,y)=>y.distKm-x.distKm)[0];
    if(wk&&prev>0&&wk.distKm>prev)pr.push(`Longest ${t.toLowerCase()} ${Math.round(wk.distKm*10)/10} km`);
  });
  const dts=Array.from({length:7},(_,i)=>{const x=new Date(from+'T12:00:00');x.setDate(x.getDate()+i);return ymd(x);});
  let planned=0,done=0;
  dts.forEach((dt,i)=>{const p=planOf(i);if(p&&p.type!=='Rest'){planned++;if(d.workouts.some(w=>w.date===dt&&plKey(w.type)===plKey(p.type)))done++;}});
  const sl=d.sleepLogs.filter(In).filter(s=>s.durMin),rh=dts.map(x=>(d.readHist||{})[x]).filter(v=>v!=null);
  const min=ws.reduce((a,w)=>a+(w.durMin||0),0),km=ws.filter(w=>w.type!=='Swim').reduce((a,w)=>a+(w.distKm||0),0);
  return{ws,pr,planned,done,min,km,sleepMin:sl.length?avg(sl.map(s=>s.durMin)):null,ready:rh.length?Math.round(avg(rh)):null,from,to};
}
function renderReview(){
  const el=$('reviewCard');if(!el)return;
  const d=S(),{thisMon}=reviewRange(),dow=(new Date().getDay()+6)%7;
  if(dow>2||(d.profile.reviewSeen===thisMon)||isExampleOnly()){el.style.display='none';return;}
  const r=reviewData();
  if(!r.ws.length&&r.sleepMin==null){el.style.display='none';return;}
  const goal=Math.round((d.profile.sleepGoal||7.5)*60);
  const notes=[];
  if(r.planned)notes.push(r.done>=r.planned?'You followed the whole plan. Strong week.':r.done/r.planned>=0.7?`You did ${r.done} of ${r.planned} planned sessions. Solid.`:`You did ${r.done} of ${r.planned} planned sessions. If the plan was too full, trim it rather than skip it.`);
  if(r.sleepMin!=null)notes.push(r.sleepMin>=goal-20?'Sleep was on target.':`Sleep averaged ${fmtDur(Math.round(goal-r.sleepMin))} under your goal. That is the easiest gain for next week.`);
  const t=k=>`<div class="rv-t"><div class="rv-k">${k[0]}</div><div class="rv-v">${k[1]}</div></div>`;
  el.style.display='block';
  el.innerHTML=`<div class="sg-lbl">LAST WEEK IN REVIEW</div><div class="rv-h">${r.ws.length} session${r.ws.length===1?'':'s'}${r.min?' · '+fmtDur(Math.round(r.min)):''}</div>
    <div class="rv-g">${t(['Distance',Math.round(r.km*10)/10+' km'])}${t(['Plan',r.planned?`${r.done} of ${r.planned}`:'No plan'])}${t(['Sleep',r.sleepMin!=null?fmtDur(Math.round(r.sleepMin)):'—'])}${t(['Readiness',r.ready!=null?r.ready:'—'])}</div>
    ${r.pr.length?`<div class="rv-pr">🏆 <b>New bests:</b> ${r.pr.map(esc).join(' · ')}</div>`:''}
    ${notes.map(n=>`<div class="set-note">${esc(n)}</div>`).join('')}
    <div class="rv-b"><button class="btn-gold" style="margin:0" onclick="reviewPlan()">Plan this week</button><button class="btn-out" style="margin:0" onclick="reviewDone()">Got it</button></div>`;
}
function reviewDone(){const d=S();d.profile.reviewSeen=reviewRange().thisMon;save(d);markProfile();renderReview();}
function reviewPlan(){reviewDone();_plEdit=true;renderPlan();go('planCard');}
