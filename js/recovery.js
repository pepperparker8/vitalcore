// Recovery: HRV, resting HR, sleep and load against your own baseline
const RB_MIN=TH.MIN_BASE_DAYS; // days of data needed before a baseline is trusted (one knob, TH.MIN_BASE_DAYS)
function wSeries(key,days=30,skipToday=true){
  const d=S(),out=[];
  for(let i=skipToday?1:0;i<=days;i++){const w=d.wellness[dAgo(i)];if(w&&w[key]!=null)out.push(w[key]);}
  return out;
}
// Resting HR for one day: the imported value (Intervals.icu) first, a manual measurement only when there is none
function rhrOn(date){
  const d=S(),w=d.wellness[date];
  if(w&&w.rhr!=null)return{v:w.rhr,src:'icu'};
  const m=last(d.measurements.filter(x=>x.hr&&x.date===date));
  return m?{v:m.hr,src:'man'}:null;
}
// Resting HR values for the dates passing pred, from ONE source: src 'icu' | 'man', else whichever has more days
function rhrIn(pred,src){
  const d=S();
  const icu=Object.entries(d.wellness).filter(([dt,w])=>w.rhr!=null&&pred(dt)).map(([,w])=>w.rhr);
  const man=d.measurements.filter(m=>m.hr&&pred(m.date)).map(m=>m.hr);
  if(src==='man')return man;if(src==='icu')return icu;
  return icu.length>=man.length?icu:man;
}
// 30-day baseline from the same source as the latest value, never mixed
function rhrSeries(days=30){
  const l=latestOf('rhr');
  return rhrIn(dt=>{const a=daysAgo(dt);return a>=1&&a<=days;},l?l.src:null);
}
function latestOf(key){
  const d=S();
  for(let i=0;i<=2;i++){
    if(key==='rhr'){const r=rhrOn(dAgo(i));if(r)return{...r,age:i};continue;}
    const w=d.wellness[dAgo(i)];if(w&&w[key]!=null)return{v:w[key],age:i,src:'icu'};
  }
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
      ft:`Heart rate variability ${-pc}% below usual`,txt:'Your body is under strain. Keep today easy.'});
  }
  const rv=latestOf('rhr'),rb=rhrSeries();
  if(rv&&rb.length>=RB_MIN){
    const b=avg(rb),df=Math.round(rv.v-b);
    out.push({k:'rhr',label:'Resting heart rate',val:Math.round(rv.v)+' bpm',base:`usual ${Math.round(b)} bpm`,delta:-df,st:df<=2?'ok':df<=5?'warn':'bad',
      ft:`Resting heart rate ${df} bpm above usual`,txt:'Often fatigue, illness or poor sleep. Keep today easy.'});
  }
  const pv=latestOf('resp'),pb=wSeries('resp');
  if(pv&&pb.length>=RB_MIN){
    const b=avg(pb),df=Math.round((pv.v-b)*10)/10;
    out.push({k:'resp',label:'Breathing rate (asleep)',val:pv.v.toFixed(1)+' /min',base:`usual ${b.toFixed(1)} /min`,delta:-df,st:df<=1?'ok':df<=2?'warn':'bad',
      ft:`Breathing ${df.toFixed(1)} a minute above usual`,txt:'Can be an early sign of illness. Watch how you feel.'});
  }
  const goal=Math.round((d.profile.sleepGoal||7.5)*60),sl=last(d.sleepLogs.filter(s=>s.durMin&&daysAgo(s.date)<=1));
  if(sl){
    const df=sl.durMin-goal;
    out.push({k:'sleep',label:'Last night',val:fmtDur(sl.durMin),base:`goal ${fmtDur(goal)}`,delta:df,st:df>=-20?'ok':df>=-60?'warn':'bad',
      ft:`Short night: ${fmtDur(-df)} under your goal`,txt:'An earlier night tonight helps.'});
  }
  const wk=d.sleepLogs.filter(s=>s.durMin&&daysAgo(s.date)<7);
  if(wk.length>=3){
    const debt=wk.reduce((a,s)=>a+(goal-s.durMin),0);
    out.push({k:'debt',label:'Sleep debt, 7 nights',val:debt>0?fmtDur(debt):'none',base:`${wk.length} nights logged`,delta:-debt,st:debt<=60?'ok':debt<=180?'warn':'bad',
      ft:`Sleep debt: ${fmtDur(debt)} this week`,txt:'A few earlier nights will clear it.'});
  }
  const yl=dayLoad(dAgo(1));
  const base=[];for(let i=2;i<=29;i++)base.push(dayLoad(dAgo(i)));
  const ba=avg(base),trained=base.filter(x=>x>0).length;
  if(trained>=4){
    const r=ba>0?yl/ba:0,lab=yl===0?'Rest':r<0.7?'Light':r<1.4?'Moderate':'Hard';
    out.push({k:'load',label:"Yesterday's effort",val:lab,base:'vs your daily average',delta:0,st:lab==='Hard'?'warn':'ok',
      ft:'Hard day yesterday',txt:'Expect some tiredness today.'});
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
// ── Body, Load, Mind (v118, Spec v2 A2 and A3): three scores, every signal counted in one place ──
// Body is objective only: HRV, resting heart rate and sleep against your own 28-day band. No self-report, no form, no injuries.
const clampN=(v,a=0,b=100)=>Math.max(a,Math.min(b,v));
const meanSd=a=>{if(!a.length)return{m:null,sd:null,n:0};const m=avg(a);return{m,sd:Math.sqrt(a.reduce((x,v)=>x+(v-m)*(v-m),0)/a.length),n:a.length};};
const toBand=a=>{const r=meanSd(a);return r.n>=TH.MIN_BASE_DAYS?r:{m:null,sd:null,n:r.n};};
// values of fn over the 28 days before date (never the day itself); trusted only with TH.MIN_BASE_DAYS of them
function bandOf(fn,date,win=28){
  const a=daysAgo(date),o=[];
  for(let i=1;i<=win;i++){const v=fn(dAgo(a+i));if(v!=null)o.push(v);}
  return toBand(o);
}
const wellOn=(key,date)=>{const w=S().wellness[date];return w&&w[key]!=null?w[key]:null;};
// HRV for one day: Intervals.icu wellness. A Polar night's overnight HRV fills today only, and only while Intervals.icu has none; baselines stay Intervals.icu.
function bodyHrvOn(date){
  const v=wellOn('hrv',date);if(v!=null)return{v,src:'icu'};
  if(date===td()){const pn=polarOn(date),rc=pn&&pn.data&&pn.data.rc;if(rc&&rc.rmssd>0)return{v:rc.rmssd,src:'polar'};}
  return null;
}
// Resting HR for Body: today's imported or manual value (rhrOn); a Polar night's sleeping heart rate fills today only while Intervals.icu has none
function bodyRhrOn(date){
  const r=rhrOn(date);if(r)return r;
  if(date===td()){const pn=polarOn(date),rc=pn&&pn.data&&pn.data.rc;if(rc&&rc.rri>0)return{v:Math.round(60000/rc.rri),src:'polar'};}
  return null;
}
// the night Body uses: the record dated today, else yesterday (A5: never an older night)
function bodyNight(){const d=S();for(let i=0;i<=1;i++){const s=last(d.sleepLogs.filter(x=>x.date===dAgo(i)&&x.durMin>0));if(s)return s;}return null;}
function calcBody(){
  const d=S(),t=td(),parts={hrv:null,rhr:null,sleep:null},missing=[];
  // HRV: the mean of the last 7 nights (today and the 6 before) against the 28 days before today; z is for a 7-night mean, so the band SD is divided by TH.HRV_SE
  const h7=[];for(let i=0;i<7;i++){const h=bodyHrvOn(dAgo(i));if(h)h7.push(h.v);}
  const hb=bandOf(dt=>wellOn('hrv',dt),t);
  if(h7.length>=TH.HRV_MIN_7&&hb.m!=null){const v7=avg(h7),s=Math.max(hb.sd,TH.HRV_FLOOR),z=(v7-hb.m)/(s/TH.HRV_SE);parts.hrv={pts:clampN(50+TH.Z_GAIN*z),v7,m:hb.m,sd:s,z,n7:h7.length,nBase:hb.n,today:bodyHrvOn(t)};}
  else missing.push({k:'hrv',why:h7.length<TH.HRV_MIN_7?`HRV on ${h7.length} of the last 7 nights, needs ${TH.HRV_MIN_7}`:`HRV baseline has ${hb.n} of ${TH.MIN_BASE_DAYS} days`});
  // resting HR: today against the 28 days before, from one source (all Intervals.icu values, or all manual readings), inverted
  const rv=bodyRhrOn(t),rb=rv?toBand(rhrIn(dt=>{const a=daysAgo(dt);return a>=1&&a<=28;},rv.src==='man'?'man':'icu')):{m:null,sd:null,n:0};
  if(rv&&rb.m!=null){const s=Math.max(rb.sd,TH.RHR_FLOOR),z=(rv.v-rb.m)/s;parts.rhr={pts:clampN(50-TH.Z_GAIN*z),v:rv.v,m:rb.m,sd:s,z,nBase:rb.n,src:rv.src};}
  else missing.push({k:'rhr',why:!rv?'no resting heart rate for today yet':`resting heart rate baseline has ${rb.n} of ${TH.MIN_BASE_DAYS} days`});
  // sleep: the night ending today, else yesterday, against what you needed that night: 100 at the full need, 0 at TH.SLEEP_FLOOR of it; Polar's solidity (0 to 100) takes TH.SOLIDITY_W when present
  const sl=bodyNight();
  if(sl){
    const prev=dAgo(daysAgo(sl.date)+1),need=sleepNeed(strainOf(dayLoad(prev)),sl.date),pct=sl.durMin/need;
    const dur=clampN((pct-TH.SLEEP_FLOOR)/(1-TH.SLEEP_FLOOR)*100);
    const pn=polarOn(sl.date),sol=pn&&pn.data&&pn.data.parts&&pn.data.parts.solidity>0?pn.data.parts.solidity:null;
    parts.sleep={pts:sol!=null?dur*(1-TH.SOLIDITY_W)+sol*TH.SOLIDITY_W:dur,durMin:sl.durMin,need,pct,sol,date:sl.date};
  }else missing.push({k:'sleep',why:'no sleep record for the night ending today or yesterday'});
  if(!parts.hrv&&!parts.rhr)return{score:null,conf:'none',parts,missing,why:'Need HRV or resting heart rate'};
  // weighted mean of the parts that are present, re-weighted when one is missing
  const c=[[parts.hrv,TH.W_HRV],[parts.rhr,TH.W_RHR],[parts.sleep,TH.W_SLEEP]].filter(x=>x[0]);
  const w=c.reduce((a,x)=>a+x[1],0),score=Math.round(c.reduce((a,x)=>a+x[0].pts*x[1],0)/w);
  return{score,conf:missing.length?'low':'good',parts,missing,why:null};
}
// Load: the training fatigue you carry. Form (TSB) in TH.FORM_* bands, this week's minutes against the 4-week mean (ramp), hard sessions in the last 4 days.
function calcLoad(){
  const d=S(),tsb=d.intervalsData?d.intervalsData.tsb:null,L=raceLoad(),ws=stWs();
  let hard4=0;for(let i=0;i<4;i++){const dt=dAgo(i);if(stHard(dt,ws.filter(w=>w.date===dt)))hard4++;}
  const ramp=L.base?L.now/L.base:null,rampFlag=ramp==null?null:ramp>=TH.RAMP_HIGH?'high':ramp>=TH.RAMP_CAUTION?'caution':null;
  const band=tsb==null?null:tsb>=TH.FORM_FRESH?'fresh':tsb>=TH.FORM_OK?'ok':tsb>=TH.FORM_DEEP?'tired':'over';
  let state='Normal';
  if(band==='over')state='Overreached';
  else if(band==='tired'&&(hard4>=2||rampFlag==='high'))state='Overreached';
  else if(band==='tired'||hard4>=2||rampFlag==='high')state='Tired';
  else if(band==='fresh'&&hard4===0)state='Fresh';
  return{state,tsb:tsb??null,formWord:tsb==null?null:zL(tsb,'tsb'),ramp,rampFlag,hard4,base:L.base,now:L.now};
}
// Mind score of one full check-in: energy, mood, calm (5 - stress) and motivation on 0 to 100 (25 when all four are Low)
const mindOf=c=>ciFull(c)?Math.round((c.energy+c.mood+(5-c.stress)+c.motivation)/16*100):null;
// Mind zones for charts (Trends mood chart, check-in sheet): Good, Flat (no fill), Strained
const mindZones=()=>[{lo:TH.MIND_GOOD,hi:null,color:'--green',label:'Good'},{lo:TH.MIND_FLAT,hi:TH.MIND_GOOD,label:'Flat'},{lo:null,hi:TH.MIND_FLAT,color:'--amber',label:'Strained'}];
// Mind: today's check-in (energy, mood, calm, motivation) on 0 to 100, and the psychological burnout risk over the last 7 check-ins
function calcMind(){
  const ci=S().checkins.find(c=>c.date===td()&&ciFull(c))||null;
  const score=ci?mindOf(ci):null;
  const b=calcBurnout();
  return{state:score==null?null:score>=TH.MIND_GOOD?'Good':score>=TH.MIND_FLAT?'Flat':'Strained',score,burnout:b.score,burnoutHigh:b.score>=TH.BURNOUT_HIGH,checkin:ci};
}
// Illness gate (A4). A heuristic, the "neck rule" coaches use, not a diagnosis: symptoms below the neck mean rest;
// above the neck is mild unless the overnight signals also move (breathing up together with resting HR up or HRV down).
function illness(){
  const ci=S().checkins.find(c=>c.date===td())||null,sym=ci&&ci.symptoms!=null?ci.symptoms:0;
  if(sym>=2)return{lvl:'systemic',why:'Your check-in says symptoms below the neck.'};
  const pv=latestOf('resp'),pb=pv&&pv.age<=1?bandOf(dt=>wellOn('resp',dt),td()):null;
  if(pv&&pb&&pb.m!=null&&pv.v>=pb.m+TH.ILL_RESP){
    const B=calcBody().parts,rz=B.rhr?B.rhr.z:null,hz=B.hrv?B.hrv.z:null;
    if((rz!=null&&rz>=TH.ILL_RHR_Z)||(hz!=null&&hz<=TH.ILL_HRV_Z))return{lvl:'systemic',why:`Breathing is ${pv.v.toFixed(1)} a minute against your usual ${pb.m.toFixed(1)}, and ${rz!=null&&rz>=TH.ILL_RHR_Z?'resting heart rate is up':'HRV is down'}.`};
  }
  if(sym===1)return{lvl:'mild',why:'Your check-in says symptoms above the neck.'};
  return null;
}
// Parallel run (A6): Body is recorded next to the old readiness for TH.PARALLEL_DAYS; then the gauge, verdict, outline and briefing switch to Body
function bodyLive(){const h=S().bodyHist||{};return Object.values(h).filter(v=>v!=null).length>=TH.PARALLEL_DAYS;}
function scoreCuts(){return bodyLive()?{bad:TH.BODY_YELLOW,mod:TH.BODY_YELLOW,warn:TH.BODY_GREEN,high:TH.BODY_GREEN}:{bad:TH.OLD_BAD,mod:TH.OLD_MOD,warn:TH.OLD_WARN,high:TH.OLD_HIGH};}
function heroScore(){return bodyLive()?calcBody().score:calcReadiness();}
function heroHist(){const d=S();return(bodyLive()?d.bodyHist:d.readHist)||{};}
function scoreWord(sc){
  if(sc==null)return bodyLive()?'Sync watch':'Check in';
  const c=scoreCuts();
  if(bodyLive())return sc>=c.high?'Good':sc>=c.mod?'Moderate':'Low';
  return sc>=c.high?'Primed':sc>=c.warn?'Good':sc>=c.mod?'Moderate':'Low';
}
