// Recovery: HRV, resting HR, sleep and load against your own baseline
const RB_MIN=7; // days of data needed before a baseline is trusted
function wSeries(key,days=30,skipToday=true){
  const d=S(),out=[];
  for(let i=skipToday?1:0;i<=days;i++){const w=d.wellness[dAgo(i)];if(w&&w[key]!=null)out.push(w[key]);}
  return out;
}
function rhrSeries(days=30){
  // Intervals resting HR, else manual measurements
  const s=wSeries('rhr',days);if(s.length)return s;
  return S().measurements.filter(m=>m.hr&&daysAgo(m.date)<=days&&daysAgo(m.date)>=1).map(m=>m.hr);
}
function latestOf(key){
  const d=S();
  for(let i=0;i<=2;i++){const w=d.wellness[dAgo(i)];if(w&&w[key]!=null)return{v:w[key],age:i};}
  if(key==='rhr'){const m=last(d.measurements.filter(x=>x.hr&&daysAgo(x.date)<=2));if(m)return{v:m.hr,age:daysAgo(m.date)};}
  return null;
}
// Intervals.icu details on an imported workout: {hr, hrMax, kcal, elev, load}
const wIcu=w=>(w&&w.sub&&typeof w.sub.icu==='object'&&w.sub.icu)||{};
// Effort of one workout. Uses the Intervals.icu training load when present, scaled into the
// same units as minutes x effort (your own median ratio once 5 workouts have both).
function loadK(){
  const ws=S().workouts,key=ws.length+'|'+ws.reduce((a,w)=>a+(wIcu(w).load||0),0);
  if(loadK.key===key)return loadK.v;
  const r=ws.filter(w=>wIcu(w).load>0&&w.durMin>0).map(w=>w.durMin*(w.rpe||3)/wIcu(w).load).sort((a,b)=>a-b);
  loadK.key=key;return loadK.v=r.length>=5?r[Math.floor(r.length/2)]:3.3;
}
const wLoad=w=>wIcu(w).load>0?wIcu(w).load*loadK():(w.durMin||30)*(w.rpe||3);
const dayLoad=date=>S().workouts.filter(w=>w.date===date).reduce((a,w)=>a+wLoad(w),0);
function recoveryDrivers(){
  const d=S(),out=[];
  const hv=latestOf('hrv'),hb=wSeries('hrv');
  if(hv&&hb.length>=RB_MIN){
    const b=avg(hb),pc=Math.round((hv.v/b-1)*100);
    out.push({k:'hrv',label:'Heart rate variability',val:Math.round(hv.v)+' ms',base:`usual ${Math.round(b)} ms`,delta:pc,st:pc>=-5?'ok':pc>=-15?'warn':'bad',
      txt:pc>=-5?'HRV is normal. Your body is coping well.':`HRV is ${-pc}% below your usual. Your body is under strain.`});
  }
  const rv=latestOf('rhr'),rb=rhrSeries();
  if(rv&&rb.length>=RB_MIN){
    const b=avg(rb),df=Math.round(rv.v-b);
    out.push({k:'rhr',label:'Resting heart rate',val:Math.round(rv.v)+' bpm',base:`usual ${Math.round(b)} bpm`,delta:-df,st:df<=2?'ok':df<=5?'warn':'bad',
      txt:df<=2?'Resting HR is normal.':`Resting HR is ${df} bpm above usual. This often means fatigue, illness or poor sleep.`});
  }
  const pv=latestOf('resp'),pb=wSeries('resp');
  if(pv&&pb.length>=RB_MIN){
    const b=avg(pb),df=Math.round((pv.v-b)*10)/10;
    out.push({k:'resp',label:'Breathing rate (asleep)',val:pv.v.toFixed(1)+' /min',base:`usual ${b.toFixed(1)} /min`,delta:-df,st:df<=1?'ok':df<=2?'warn':'bad',
      txt:df<=1?'Breathing rate is normal.':`Breathing rate is ${df.toFixed(1)} breaths a minute above usual. This can be an early sign of illness, a hard day or poor recovery.`});
  }
  const goal=Math.round((d.profile.sleepGoal||7.5)*60),sl=d.sleepLogs.find(s=>s.durMin&&daysAgo(s.date)<=1);
  if(sl){
    const df=sl.durMin-goal;
    out.push({k:'sleep',label:'Last night',val:fmtDur(sl.durMin),base:`goal ${fmtDur(goal)}`,delta:df,st:df>=-20?'ok':df>=-60?'warn':'bad',
      txt:df>=-20?'You met your sleep goal.':`You slept ${fmtDur(-df)} less than your goal.`});
  }
  const wk=d.sleepLogs.filter(s=>s.durMin&&daysAgo(s.date)<7);
  if(wk.length>=3){
    const debt=wk.reduce((a,s)=>a+(goal-s.durMin),0);
    out.push({k:'debt',label:'Sleep debt, 7 nights',val:debt>0?fmtDur(debt):'none',base:`${wk.length} nights logged`,delta:-debt,st:debt<=60?'ok':debt<=180?'warn':'bad',
      txt:debt<=60?'No meaningful sleep debt.':`You owe about ${fmtDur(debt)} of sleep. Add earlier nights, not just one long lie-in.`});
  }
  const yl=dayLoad(dAgo(1));
  const base=[];for(let i=2;i<=29;i++)base.push(dayLoad(dAgo(i)));
  const ba=avg(base),trained=base.filter(x=>x>0).length;
  if(trained>=4){
    const r=ba>0?yl/ba:0,lab=yl===0?'Rest':r<0.7?'Light':r<1.4?'Moderate':'Hard';
    out.push({k:'load',label:"Yesterday's effort",val:lab,base:'vs your daily average',delta:0,st:lab==='Hard'?'warn':'ok',
      txt:lab==='Hard'?'Yesterday was hard for you. Expect some carry-over fatigue today.':lab==='Rest'?'A rest day helps recovery.':'A normal amount of training.'});
  }
  return out;
}
// small readiness nudge from HRV and resting HR (0 when no trusted baseline)
function recoveryAdj(){
  let a=0;
  const hv=latestOf('hrv'),hb=wSeries('hrv');
  if(hv&&hb.length>=RB_MIN)a+=Math.max(-10,Math.min(4,(hv.v/avg(hb)-1)*30));
  const rv=latestOf('rhr'),rb=rhrSeries();
  if(rv&&rb.length>=RB_MIN)a+=Math.max(-6,Math.min(2,-(rv.v-avg(rb))*0.8));
  return a;
}
function renderRecovery(){
  const el=$('recCard');if(!el)return;
  const dr=recoveryDrivers();
  if(!dr.length){
    el.innerHTML=`<div class="rc-lbl">RECOVERY</div><div class="set-note">Recovery drivers appear once you have a week of sleep durations, or HRV and resting heart rate from Intervals.icu. Log time asleep in the Log tab.</div>`;return;
  }
  const bad=dr.filter(x=>x.st==='bad').length,warn=dr.filter(x=>x.st==='warn').length;
  const head=bad?'Your body is asking for recovery.':warn?'Mostly fine, watch a couple of things.':'Recovery signals look good.';
  el.innerHTML=`<div class="rc-lbl">RECOVERY</div><div class="rc-head">${head}</div>`+dr.map(x=>`<details class="rc-row"><summary><span class="rc-dot ${x.st}"></span><span class="rc-name">${x.label}</span><span class="rc-val">${x.val}</span></summary><div class="rc-more"><b>${x.base}</b><br>${esc(x.txt)}</div></details>`).join('');
}
