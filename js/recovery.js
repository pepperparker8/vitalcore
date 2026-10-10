// Recovery: HRV, resting HR, sleep and load against your own baseline
const RB_MIN=TH.MIN_BASE_DAYS; // days of data needed before a baseline is trusted (one knob, TH.MIN_BASE_DAYS)
function wSeries(key,days=30,skipToday=true,date=td()){
  const d=S(),o=daysAgo(date),out=[];
  for(let i=skipToday?1:0;i<=days;i++){const w=d.wellness[dAgo(o+i)];if(w&&w[key]!=null)out.push(w[key]);}
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
// v129: date (default today) moves the window back for a past day on Today
function rhrSeries(days=30,date=td()){
  const l=latestOf('rhr',date),o=daysAgo(date);
  return rhrIn(dt=>{const a=daysAgo(dt);return a>=o+1&&a<=o+days;},l?l.src:null);
}
function latestOf(key,date=td()){
  const d=S(),o=daysAgo(date);
  for(let i=0;i<=2;i++){
    if(key==='rhr'){const r=rhrOn(dAgo(o+i));if(r)return{...r,age:i};continue;}
    const w=d.wellness[dAgo(o+i)];if(w&&w[key]!=null)return{v:w[key],age:i,src:'icu'};
  }
  return null;
}
// Intervals.icu details on an imported workout: {hr, hrMax, kcal, elev, load}
const wIcu=w=>(w&&w.sub&&typeof w.sub.icu==='object'&&w.sub.icu)||{};
// Effort of one workout. Uses the Intervals.icu training load when present, scaled into the
// same units as minutes x effort (your own median ratio once 5 workouts have both).
function loadK(){
  const ws=wkOn(),key=ws.length+'|'+ws.reduce((a,w)=>a+(wIcu(w).load||0),0);
  if(loadK.key===key)return loadK.v;
  const r=ws.filter(w=>wIcu(w).load>0&&w.durMin>0).map(w=>w.durMin*(w.rpe||3)/wIcu(w).load).sort((a,b)=>a-b);
  loadK.key=key;return loadK.v=r.length>=5?r[Math.floor(r.length/2)]:3.3;
}
const wLoad=w=>wIcu(w).load>0?wIcu(w).load*loadK():(w.durMin||30)*(w.rpe||3);
const dayLoad=date=>wkOn().filter(w=>w.date===date).reduce((a,w)=>a+wLoad(w),0);
// v131: a day's activity from one source, the one that counted more steps (the band on a tie): the band's day, else the steps another
// device counted (wellness). src null = not recorded. Active time from steps (over STEP_BASE, one minute per STEP_RATE) and calories
// from steps (resting use x the daily-living factor, plus that day's workouts; today the resting part so far) are estimates; sitting needs the band.
const actEst=st=>Math.max(0,st-TH.STEP_BASE)/TH.STEP_RATE;
function wtOn(t){
  const ex=isExampleOnly();
  return last(S().measurements.filter(x=>x.date<=t&&x.weight>=30&&x.weight<=250&&(ex||!x.isEx)).sort((x,y)=>x.date<y.date?-1:1));
}
function dayAct(date){
  const p=dayOn(date),a=p&&p.data||{},ws=((S().wellness||{})[date]||{}).steps,os=ws>0?ws:null,bs=a.steps??(a.act!=null?0:null);
  const o={src:null,steps:null,act:null,actEst:false,sit:null,sitMax:null,kcal:null,kcalBy:null};
  if(bs==null&&os==null)return o;
  const wt=wtOn(date);
  if(bs!=null&&(os==null||bs>=os)){
    o.src='band';o.steps=a.steps??null;o.sit=a.sit??null;o.sitMax=a.sitMax??null;
    if(a.act!=null)o.act=a.act;else if(a.steps!=null){o.act=actEst(a.steps);o.actEst=true;}
    if(a.kcal!=null)o.kcal=a.kcal;else if(a.met&&wt){o.kcal=a.met*wt.weight;o.kcalBy='met';}
    return o;
  }
  o.src='other';o.steps=os;o.act=actEst(os);o.actEst=true;
  if(wt){
    const fr=date===td()?Math.max(0,Math.min(1,(Date.now()-new Date(date+'T00:00').getTime())/864e5)):1,b=fuBmr(wt.weight);
    o.kcal=b*TH.LIVE_K*fr+b*Math.min(TH.LIVE_MAX-TH.LIVE_K,os/TH.LIVE_STEPS)+wkOn().filter(w=>w.date===date).reduce((x,w)=>x+fuWk(w,wt.weight),0);o.kcalBy='steps';
  }
  return o;
}
// v127: minutes on your feet outside workouts count in strain; null when the day has no activity. Workout minutes come off, so a session is never counted twice.
const actMin=date=>dayAct(date).act;
const actLoad=date=>{const m=actMin(date);if(!m)return 0;const wm=wkOn().filter(w=>w.date===date).reduce((a,w)=>a+(w.durMin||0),0);return Math.max(0,m-wm)*TH.ACT_K;};
// strain, sleep need and the strain sheet read this; training rules (hard days, drivers, briefing pairs) stay on dayLoad
const strainLoad=date=>dayLoad(date)+actLoad(date);
// ── v131 SLEEP DEBT: against your sleep goal over the last TH.DEBT_DAYS nights. A short night adds what it fell short; a longer night or a nap
// pays back at most TH.DEBT_REPAY a day; never below 0, so sleep cannot be banked ahead. Missing and battery nights add and pay nothing.
// An alert only: never part of Body, the gauge or sleepNeed. Worked out on demand, never stored (like bounceDays). Null under TH.DEBT_MIN_N nights.
function sleepDebt(date=td()){
  const d=S(),goal=Math.round((d.profile.sleepGoal||7.5)*60),o=daysAgo(date),nights=[];
  let bal=0,n=0,trend='flat',cur=null,hi=false,clearedOn=null,clPeak=null,since=null;
  for(let i=TH.DEBT_DAYS-1;i>=0;i--){
    const dt=dAgo(o+i),s=last(d.sleepLogs.filter(x=>x.date===dt&&x.durMin>0)),nap=typeof napsOn==='function'?napsOn(dt).reduce((a,x)=>a+x.min,0):0;
    if(!s||!slCounts(s)){nights.push({date:dt,slept:null,nap,diff:null,bal,skip:s?'batt':'none'});continue;}
    const diff=s.durMin+nap-goal,b0=bal;n++;
    bal=diff<0?bal-diff:Math.max(0,bal-Math.min(diff,TH.DEBT_REPAY));
    trend=bal>b0?'up':bal<b0?'down':'flat';
    if(bal===0)since=null;else if(since==null)since=dt;
    if(bal>=TH.DEBT_OK){if(!cur||bal>cur.min)cur={min:bal,date:dt};if(bal>=TH.DEBT_WARN)hi=true;clearedOn=null;clPeak=null;}
    else{if(hi){clearedOn=dt;clPeak=cur;hi=false;}cur=null;}
    nights.push({date:dt,slept:s.durMin,nap,diff,bal,skip:null});
  }
  if(n<TH.DEBT_MIN_N)return null;
  const state=bal>=TH.DEBT_OK?(trend==='up'?'building':trend==='down'?'paying':'steady'):clearedOn?'cleared':'none';
  const peak=bal>=TH.DEBT_OK?cur:clPeak;
  // the nights and naps that paid it back, from the peak to the morning it cleared
  const pay=clearedOn&&clPeak?nights.filter(x=>x.date>clPeak.date&&x.date<=clearedOn&&x.diff!=null):[];
  return{date,goal,min:bal,state,trend,nights,peak,clearedOn,since,n,toClear:bal>0?Math.ceil(bal/TH.DEBT_EXTRA):0,
    payN:pay.filter(x=>x.slept>goal).length,payNaps:pay.filter(x=>x.nap>0).length};
}
// HRV and resting heart rate inside your usual range on a day: the same tests as the Recovery sheet's rows (HRV band mean − SD/√7, resting HR mean + SD)
function debtBodyBack(date=td()){
  const P=calcBody(date).parts;
  return{hrv:P.hrv?P.hrv.v7>=P.hrv.m-P.hrv.sd/TH.HRV_SE:null,rhr:P.rhr?P.rhr.v<=P.rhr.m+P.rhr.sd:null};
}
// the line on the morning it clears: HRV and resting heart rate back, or which one is not yet
function debtBackLine(date){
  const b=debtBodyBack(date);
  if(b.hrv===false&&b.rhr===false)return'HRV and resting heart rate are not back to usual yet.';
  if(b.hrv===false)return'HRV is still under usual.';
  if(b.rhr===false)return'Resting heart rate is still above usual.';
  return b.hrv&&b.rhr?'HRV and resting heart rate are back to usual.':b.hrv?'HRV is back to usual.':b.rhr?'Resting heart rate is back to usual.':'';
}
// the fact (why) and the action (do); debtLine joins them: the v123 rule, at most 2 sentences, 140 characters and two numbers
function debtWhy(D){
  if(!D)return'';
  if(D.state==='none')return'No sleep debt.';
  if(D.state==='cleared'){
    if(D.clearedOn!==D.date)return`Cleared on ${dayWord(D.clearedOn)}.`;
    const nn=D.payN,np=D.payNaps,naps=np?(np===1?'a nap':`${np} naps`):'';
    const how=nn>1?`over ${nn} nights`+(naps?` and ${naps}`:''):nn===1?'in one night'+(naps?` and ${naps}`:''):naps?`with ${naps}`:'';
    const bk=debtBackLine(D.date);
    return(how?`Paid back ${how}.`:'Paid back.')+(bk?' '+bk:'');
  }
  if(D.state==='paying')return`Paying back: down from ${fmtDur(D.peak.min)}.`;
  if(D.state==='steady')return'Holding: the last night was right on your goal.';
  const run=D.nights.filter(x=>D.since&&x.date>=D.since&&x.diff!=null),sh=run.filter(x=>x.diff<0).length;
  if(run.length<2)return`${dayWord(D.since,true)} was short.`;
  const when=dayWord(D.since);
  return sh===run.length?`Short every night since ${when}.`:sh*2>=run.length&&run.length>2?`Short most nights since ${when}.`:`Built up since ${when}.`;
}
function debtDo(D){
  if(!D||D.min<TH.DEBT_OK)return'';
  const ex=TH.DEBT_EXTRA===60?'an extra hour':`an extra ${fmtDur(TH.DEBT_EXTRA)}`;
  return D.toClear<=1?`${cap(ex)} tonight clears it.`:`${cap(ex)} a night clears it in about ${D.toClear} nights.`;
}
const debtLine=D=>[debtWhy(D),debtDo(D)].filter(Boolean).join(' ');
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
  if(sl&&slCounts(sl)){
    const df=sl.durMin-goal;
    out.push({k:'sleep',label:'Last night',val:fmtDur(sl.durMin),base:`goal ${fmtDur(goal)}`,delta:df,st:df>=-20?'ok':df>=-60?'warn':'bad',
      ft:`Short night: ${fmtDur(-df)} under your goal`,txt:'An earlier night tonight helps.'});
  }
  // v131: the one sleep debt (sleepDebt, 14 nights, paid back by longer nights and naps); a flag from TH.DEBT_WARN, never part of a score
  const D=sleepDebt();
  if(D){
    out.push({k:'debt',label:'Sleep debt',val:D.min>0?fmtDur(D.min):'none',base:`${D.n} nights logged`,delta:-D.min,st:D.min<TH.DEBT_WARN?'ok':D.min<TH.DEBT_BAD?'warn':'bad',
      ft:`Sleep debt: ${fmtDur(D.min)}`,txt:debtDo(D)||debtWhy(D)});
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
// form (fitness minus fatigue) on a day: today's from the last sync, an earlier day's from that day's wellness
function tsbOn(date){const d=S();if(date===td())return d.intervalsData&&d.intervalsData.tsb!=null?d.intervalsData.tsb:null;const w=d.wellness[date];return w&&w.ctl!=null&&w.atl!=null?Math.round((w.ctl-w.atl)*10)/10:null;}
// what you needed for one night: the goal, plus the strain of the day before, plus recent debt (sleepNeed); shared by Body, the factor row and the sleep sheet
const needOf=sl=>sleepNeed(strainOf(strainLoad(dAgo(daysAgo(sl.date)+1))),sl.date);
// the night Body uses: the record dated that day, else the day before (A5: never an older night)
function bodyNight(date=td()){const d=S(),o=daysAgo(date);for(let i=0;i<=1;i++){const s=last(d.sleepLogs.filter(x=>x.date===dAgo(o+i)&&x.durMin>0));if(s)return s;}return null;}
// v129: any day (Today's day browser, the Recovery sheet); no date = today, exactly as before
function calcBody(date=td()){
  const d=S(),t=date,o=daysAgo(t),parts={hrv:null,rhr:null,sleep:null},missing=[];
  // HRV: the mean of the last 7 nights (that day and the 6 before) against the 28 days before it; z is for a 7-night mean, so the band SD is divided by TH.HRV_SE
  const h7=[];for(let i=0;i<7;i++){const h=bodyHrvOn(dAgo(o+i));if(h)h7.push(h.v);}
  const hb=bandOf(dt=>wellOn('hrv',dt),t);
  if(h7.length>=TH.HRV_MIN_7&&hb.m!=null){const v7=avg(h7),s=Math.max(hb.sd,TH.HRV_FLOOR),z=(v7-hb.m)/(s/TH.HRV_SE);parts.hrv={pts:clampN(50+TH.Z_GAIN*z),v7,m:hb.m,sd:s,z,n7:h7.length,nBase:hb.n,today:bodyHrvOn(t)};}
  else missing.push({k:'hrv',why:h7.length<TH.HRV_MIN_7?`HRV on ${h7.length} of the last 7 nights, needs ${TH.HRV_MIN_7}`:`HRV baseline has ${hb.n} of ${TH.MIN_BASE_DAYS} days`});
  // resting HR: that day against the 28 days before, from one source (all Intervals.icu values, or all manual readings), inverted
  const rv=bodyRhrOn(t),rb=rv?toBand(rhrIn(dt=>{const a=daysAgo(dt);return a>=o+1&&a<=o+28;},rv.src==='man'?'man':'icu')):{m:null,sd:null,n:0};
  if(rv&&rb.m!=null){const s=Math.max(rb.sd,TH.RHR_FLOOR),z=(rv.v-rb.m)/s;parts.rhr={pts:clampN(50-TH.Z_GAIN*z),v:rv.v,m:rb.m,sd:s,z,nBase:rb.n,src:rv.src};}
  else missing.push({k:'rhr',why:!rv?(o?'no resting heart rate for that day':'no resting heart rate for today yet'):`resting heart rate baseline has ${rb.n} of ${TH.MIN_BASE_DAYS} days`});
  // sleep: the night ending that day, else the day before, against what you needed that night: 100 at the full need, 0 at TH.SLEEP_FLOOR of it; Polar's solidity (0 to 100) takes TH.SOLIDITY_W when present
  const sl=bodyNight(t);
  if(sl&&!slCounts(sl))missing.push({k:'sleep',why:'your band ran out of battery during the night'});   // v127: missing, not short
  else if(sl){
    const need=needOf(sl),pct=sl.durMin/need;
    const dur=clampN((pct-TH.SLEEP_FLOOR)/(1-TH.SLEEP_FLOOR)*100);
    const pn=polarOn(sl.date),sol=pn&&pn.data&&pn.data.parts&&pn.data.parts.solidity>0?pn.data.parts.solidity:null;
    parts.sleep={pts:sol!=null?dur*(1-TH.SOLIDITY_W)+sol*TH.SOLIDITY_W:dur,durMin:sl.durMin,need,pct,sol,date:sl.date};
  }else missing.push({k:'sleep',why:o?'no sleep record for the night ending that day or the day before':'no sleep record for the night ending today or yesterday'});
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
