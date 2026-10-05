// ── STRATEGY: today's session and a rolling 7-day outline, computed from recovery, load, plan and history ──
const LOWER=/knee|ankle|hip|calf|foot|feet|shin|hamstring|quad|achilles|thigh|groin|glute|leg/i;
const ST_DEF={Run:40,Cycle:60,Swim:40,Weights:45,Calisthenics:30,Hike:90,Walk:40,Yoga:30};
const ST_HARD=/interval|tempo|hard|threshold|speed|race|hill|fast|quality/i,ST_LONG=/long/i,ST_EASY=/easy|recover|light|gentle/i;
const ST_MODE={
  start:['Getting started','Log two full weeks of training and a weekly time target appears here.'],
  taper:['Taper','Your goal is close. Training time comes down so you arrive fresh.'],
  recover:['Recovering','Recovery has been low this week, so training time comes down until it lifts.'],
  easier:['Easier week','Three full weeks in a row. An easier week lets your body absorb the work.'],
  hold:['Holding steady','Training time stays where it is until recovery is clearly good.'],
  build:['Building','Recovery is good, so training time goes up a little, about 7 percent.'],
  back:['Coming back','After time off, training time builds back step by step and sessions start a little easier.'],
  harder:['Harder sessions','Your sessions stepped up, so training time holds steady. Volume or intensity, not both at once.']
};
// v121: a return after days off, by the length of the break: [more than N days off, levels down, share of your usual week for each week back]
const ST_GAP=[[TH.GAP_MID,3,[0.33,0.5,0.75,0.9]],[TH.GAP_SHORT,2,[0.5,0.75,0.9]],[TH.GAP_RESUME,1,[0.65,0.85]]];
// the two kinds of hard session in each race phase; hard days take turns
const ST_QUAL={Base:['tempo','hills'],Build:['tempo','vo2'],Peak:['vo2','tempo'],def:['tempo','vo2']};
// what a day can be swapped for, by its role (the role and its place in the week stay)
const ST_SWAP={hard:['Run','Cycle','Swim'],easy:['Run','Cycle','Swim','Yoga'],long:['Run','Cycle','Swim'],steady:['Run','Cycle','Swim','Hike'],strength:['Weights','Calisthenics','Yoga'],gentle:['Yoga','Walk']};
// after the run-walk ladder, one stage a week: what each stage adds back
const ST_IRS=['volume','strides','tempo','hills','long'];
const stPctW=p=>p<0.4?'a third':p<0.55?'half':p<0.7?'two thirds':p<0.8?'three quarters':'nearly all';
const stAdd=(dt,n)=>{const x=new Date(dt+'T12:00:00');x.setDate(x.getDate()+n);return ymd(x);};
const stMon=dt=>{const x=new Date(dt+'T12:00:00');x.setDate(x.getDate()-((x.getDay()+6)%7));return ymd(x);};
const stWs=()=>{const d=S();return isExampleOnly()?d.workouts:d.workouts.filter(w=>!w.isEx);};
// a hard day: effort 4 or 5 (v122: yours, the watch's, else from heart rate, wkHard), or a watch-recorded day with no effort, zones or
// heart rate in the top quarter of your loads
function stHard(dt,ws,thr){
  if(ws.some(w=>wkHard(w,thr)))return true;
  return ws.some(w=>wIcu(w).load>0&&wkEff(w,thr)==null)&&strainOf(dayLoad(dt))>=12;
}
// v121: coming back after more than TH.GAP_RESUME days without training (yoga and short walks do not count, stTrains). Return weeks run
// Monday to Sunday from the week you start again (a start on Friday or later counts from the next Monday).
// v122: only with a real usual week before the break (TH.RET_BASE_WKS weeks with training, TH.RET_BASE_MIN minutes), and over early once
// any 7 days in a row since you started again reach it.
// {gap (days off), from, week (1-based), of, pct, nextPct (share of the usual week), pen (levels down), base (usual minutes a week before the break)}; null once it is over
function stReturn(){
  const t=td(),tr=stWs().filter(w=>w.date<=t&&stTrains(w));
  const ds=[...new Set(tr.map(w=>w.date))].sort();if(!ds.length)return null;
  let from=null,end=null,gap=0;
  const cur=daysAgo(ds[ds.length-1])-1;
  if(cur>TH.GAP_RESUME){from=t;end=ds[ds.length-1];gap=cur;}
  else for(let k=ds.length-1;k>0;k--){const g=daysAgoBetween(ds[k-1],ds[k])-1;if(g>TH.GAP_RESUME){from=ds[k];end=ds[k-1];gap=g;break;}}
  if(!from)return null;
  const band=ST_GAP.find(b=>gap>b[0]),wd=(new Date(from+'T12:00:00').getDay()+6)%7;
  const k=Math.max(0,Math.round(daysAgoBetween(stMon(from),stMon(t))/7)-(wd>=4?1:0));
  if(k>=band[2].length)return null;
  // the usual week before the break: mean of the four 7-day blocks up to the last day trained (blocks with any training)
  const blk=[0,1,2,3].map(n=>tr.filter(w=>{const a=daysAgoBetween(w.date,end);return a>=n*7&&a<n*7+7;}).reduce((s,w)=>s+(w.durMin||0),0)).filter(x=>x>0);
  if(blk.length<TH.RET_BASE_WKS)return null;
  const base=avg(blk);if(base<TH.RET_BASE_MIN)return null;
  const since=tr.filter(w=>w.date>=from);
  if(since.some(e=>since.filter(w=>w.date<=e.date&&w.date>stAdd(e.date,-7)).reduce((s,w)=>s+(w.durMin||0),0)>=base))return null;
  return{gap,from,week:k+1,of:band[2].length,pct:band[2][k],nextPct:band[2][k+1]||1,pen:band[1],base:Math.round(base)};
}
// v121: back to running after a lower-body injury (moderate or worse) marked healed in the last TH.RET_LOWER_D days (healed = its ts).
// First a run-walk ladder (RET_LADDER): a run with pain TH.PAIN_OK or less and no rise in soreness the next morning moves up a step,
// pain TH.PAIN_BACK or more moves back one, no pain score stays. Then one stage a week (ST_IRS); pain TH.PAIN_BACK or more goes back to volume.
// {part, healed, stage, i (stage index, -1 on the ladder), step (ladder 1 to 7), pain (the last one given)} or null
function injRet(){
  const t=td();let I=null,h=null;
  S().injuries.forEach(x=>{if(x.active||x.sev<2||!LOWER.test(x.part||'')||!x.ts)return;const y=ymd(new Date(x.ts)),a=daysAgo(y);if(a>=0&&a<=TH.RET_LOWER_D&&(!h||y>h)){I=x;h=y;}});
  if(!I)return null;
  const runs=stWs().filter(w=>w.type==='Run'&&w.date>=h&&w.date<=t).sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:0);
  const rise=dt=>{const n=ciOn(stAdd(dt,1)),p=ciOn(dt);return!!(n&&n.soreness>=3&&!(p&&p.soreness>=n.soreness));};
  let step=1,from=null,pain=null;
  runs.forEach(w=>{
    const p=w.sub&&typeof w.sub.pain==='number'?w.sub.pain:null;if(p!=null)pain=p;
    if(!from){if(p==null)return;if(p>=TH.PAIN_BACK)step=Math.max(1,step-1);else if(p<=TH.PAIN_OK&&!rise(w.date)&&++step>RET_LADDER.length){step=RET_LADDER.length;from=w.date;}}
    else if(p!=null&&p>=TH.PAIN_BACK)from=w.date;
  });
  const i=from?Math.floor(daysAgo(from)/TH.RET_STAGE_D):-1;if(i>=ST_IRS.length)return null;
  return{part:I.part,healed:h,stage:i<0?'ladder':ST_IRS[i],i,step,pain};
}
// v121: what happened on a planned day (planHist): 'done' (the planned sport at or under the planned effort), 'harder', 'missed'
// (nothing logged, past days only) or 'other' (a different sport), with the effort (1 to 5; v122: wkEffOf, so the watch's 1 to 10 halved,
// else from heart rate, when none was set; src 'you' | 'watch' | 'hr') and pain
function stMatch(dt,thr){
  const p=(S().planHist||{})[dt];if(!p||!p.fam)return null;
  const ws=stWs().filter(w=>w.date===dt);
  if(!ws.length)return dt<td()?{m:'missed',eff:null,pain:null}:null;
  const w=ws.find(x=>x.type===p.type);if(!w)return{m:'other',eff:null,pain:null};
  const r=wkEffOf(w,thr),eff=r?r.e:null,pain=w.sub&&typeof w.sub.pain==='number'?w.sub.pain:null;
  return{m:eff!=null&&p.effort&&eff>p.effort?'harder':'done',eff,src:r?r.src:null,pain};
}
// v121: remember what today's outline asks for (planHist, this phone only, newest TH.PLAN_HIST_N) until a workout is logged today, then
// it stays as it was, so stMatch can compare. Written only when it changed; never from example data. Called from recalc().
function stSnap(){
  const d=S(),t=td();if(isExampleOnly()||stWs().some(w=>w.date===t))return;
  const st=strategy(),x=st&&st.days[0];if(!x||x.done)return;
  const v={fam:x.fam||null,lvl:x.lvl||null,type:x.type,role:x.role,effort:x.effort||0,lo:x.lo||0,hi:x.hi||0,kind:x.kind||null};
  const H=d.planHist||{};if(H[t]&&canon(H[t])===canon(v))return;
  const n={};Object.keys(H).filter(k=>k<t).sort().slice(-(TH.PLAN_HIST_N-1)).forEach(k=>{n[k]=H[k];});
  n[t]=v;d.planHist=n;save(d);
}
// v121: the level (1 to 10) of each session family with levels, worked out again on every call from what was planned (planHist, this
// phone only) and what you logged, so editing or deleting a workout corrects it. Seed: hard sessions of that sport (sessions, for strength)
// in the 42 days before the first remembered plan. Up one after TH.LV_UP_N sessions done at or under the planned effort, at most once in
// TH.LV_UP_GAP_D days and not after a low score in the TH.LV_LOW_D days before; down one after TH.LV_DN_N harder than planned, or one missed.
// Only sessions planned at your level count towards a step up (a short day fitted at a lower level does not); minus the levels of a return after time off.
const ST_LVF={runTempo:'Run',runHard:'Run',runHills:'Run',runStrides:'Run',rideTempo:'Cycle',rideHard:'Cycle',swimHard:'Swim',wt:'Weights',cal:'Calisthenics'};
function progAll(){
  const d=S(),t=td(),ws=stWs(),H=d.planHist||{},ret=stReturn(),thr=stThr();
  const hd=Object.keys(H).filter(k=>k<t||(k===t&&ws.some(w=>w.date===t))).sort();
  const to=hd[0]||t,fr=stAdd(to,-42),win=ws.filter(w=>w.date>=fr&&w.date<to);
  const hard=w=>wkHard(w,thr);
  const lv={},up={},dn={},upAt={};
  Object.entries(ST_LVF).forEach(([f,ty])=>{
    const n=f==='runStrides'?win.filter(w=>w.type==='Run').length/2:IS_STR(ty)?win.filter(w=>w.type===ty).length:win.filter(w=>w.type===ty&&hard(w)).length;
    lv[f]=Math.min(5,1+Math.floor(n/TH.LV_SEED_HARD));up[f]=0;dn[f]=0;
  });
  const cut=scoreCuts().warn,hh=heroHist();
  hd.forEach(dt=>{
    const p=H[dt],f=p&&p.fam;if(!f||!(f in lv))return;
    const m=stMatch(dt,thr);if(!m)return;
    if(m.m==='missed'){lv[f]--;up[f]=0;dn[f]=0;}
    else if(m.m==='harder'){up[f]=0;if(++dn[f]>=TH.LV_DN_N){lv[f]--;dn[f]=0;}}
    else if(m.m==='done'){
      dn[f]=0;
      const low=Array.from({length:TH.LV_LOW_D},(_,k)=>hh[stAdd(dt,-k-1)]).some(v=>v!=null&&v<cut);
      if((p.lvl||lv[f])>=lv[f]&&++up[f]>=TH.LV_UP_N&&!low&&(!upAt[f]||daysAgoBetween(upAt[f],dt)>=TH.LV_UP_GAP_D)){lv[f]++;up[f]=0;upAt[f]=dt;}
    }
    lv[f]=Math.max(1,Math.min(10,lv[f]));
  });
  if(ret)Object.keys(lv).forEach(f=>{lv[f]=Math.max(1,lv[f]-ret.pen);});
  return{lv,upAt,ret};
}
// this week's minutes target: usual week x a factor chosen from recovery, the last three weeks and the race phase
// v121: a return after time off sets the share of the usual week; growth is capped against the last weeks; a level up holds the time
function stWeek(P){
  const L=raceLoad(),ph=racePhase(),d=S(),ws=stWs(),ret=P?P.ret:stReturn();
  const m=new Date(td()+'T12:00:00');m.setDate(m.getDate()-((m.getDay()+6)%7));
  const wk=o=>{const a=new Date(m);a.setDate(a.getDate()+o*7);const b=new Date(a);b.setDate(b.getDate()+7);const A=ymd(a),B=ymd(b);
    return ws.filter(w=>w.date>=A&&w.date<B).reduce((t,w)=>t+(w.durMin||0),0);};
  const base=L.base,p3=[-3,-2,-1].map(wk);
  const rh=Object.entries(heroHist()).filter(([k,v])=>v!=null&&daysAgo(k)>=1&&daysAgo(k)<7).map(x=>x[1]);
  const sc=heroScore();if(sc!=null)rh.push(sc);
  const rAvg=rh.length>=3?avg(rh):sc;
  const full=base&&p3.every(x=>x>=base*0.9);
  const pm=ph&&ph.n>=0?ph.mult:1;
  let mode,f;
  if(pm<1){mode='taper';f=pm;}
  else if(ret){mode='back';f=ret.pct;}
  else if(!base){mode='start';f=1;}
  // v118 (A3 ledger): burnout lives under Mind and spends here, on the week, not on today's verdict
  else if((rAvg!=null&&rAvg<scoreCuts().mod)||calcMind().burnoutHigh){mode='recover';f=0.85;}
  else if(full){mode='easier';f=0.75;}
  else if(rAvg==null||rAvg<scoreCuts().warn||p3[2]>base*TH.RAMP_CAUTION){mode='hold';f=Math.min(1.2,pm);}
  // a session level went up in the last 7 days: hold the time (volume or intensity, not both at once)
  else if(P&&Object.values(P.upAt).some(x=>daysAgo(x)<7)){mode='harder';f=Math.min(1,pm);}
  else{mode='build';f=Math.min(1.2,1.07*pm);}
  const r5=n=>Math.max(5,Math.round(n/5)*5);
  // next week: easier if this one would be the third full week; back to normal after an easier week
  const nextF=mode==='back'?ret.nextPct:mode==='easier'||mode==='recover'?1:mode!=='taper'&&mode!=='start'&&p3[1]>=base*0.9&&p3[2]>=base*0.9?0.75:f;
  const B=mode==='back'?ret.base:base;
  let target=B?r5(B*f):null;
  // growth caps: at most TH.WK_UP over last week and TH.WK_UP2 over the week before (never below your usual week)
  if(target&&mode!=='back'&&f>=1)target=Math.min(target,r5(Math.max(base,p3[2]*TH.WK_UP)),r5(Math.max(base,p3[1]*TH.WK_UP2)));
  // factor for the day i days from now; the taper follows the race calendar day by day
  const fAt=(i,next)=>{
    if(ph&&ph.n>=0){const n=ph.n-i;if(n<0)return 0.5;const x=RACE_PH.find(r=>n>=r.min);if(x.mult<1)return x.mult;}
    return next?nextF:f;
  };
  return{mode,f,base:B,now:Math.round(L.now),target,label:mode==='taper'&&ph?ph.k:ST_MODE[mode][0],why:ST_MODE[mode][1],fAt,ph,ret};
}
function strategy(){
  const sc=heroScore();if(sc===null)return null;
  const d=S(),t=td(),ws=stWs(),P=progAll(),W=stWeek(P),v=coachVerdict(),ret=P.ret,ir=injRet(),thr=stThr(),H=d.planHist||{};
  const rec=ws.filter(w=>daysAgo(w.date)>=0&&daysAgo(w.date)<=42);
  const cnt=ty=>rec.filter(w=>w.type===ty).length;
  const med=ty=>{const a=rec.filter(w=>w.type===ty&&w.durMin).map(w=>w.durMin).sort((x,y)=>x-y);return a.length?a[Math.floor(a.length/2)]:ST_DEF[ty]||40;};
  const mx=ty=>Math.max(0,...rec.filter(w=>w.type===ty).map(w=>w.durMin||0));
  // v122: an e-bike ride does not raise the cap on a long ride
  const mx30=ty=>Math.max(0,...rec.filter(w=>w.type===ty&&!wkEb(w)&&daysAgo(w.date)<=30).map(w=>w.durMin||0));
  const inj=d.injuries.filter(i=>i.active),sev=inj.length?Math.max(...inj.map(i=>i.sev)):0;
  const lowerHurt=inj.some(i=>LOWER.test(i.part)&&i.sev>=2);
  // v121: strength leaves the legs out while a leg injury is active or early in the return from one
  const noLower=inj.some(i=>LOWER.test(i.part))||!!(ir&&ir.i<1);
  // the cross-training sport you do most, for runs that cannot be runs (injury return)
  const crossT=['Cycle','Swim'].filter(x=>cnt(x)>0).sort((a,b)=>cnt(b)-cnt(a))[0]||null;
  // weekly caps on quality minutes (steady hard, hard, strides and hills), and 20% in all; placed sessions come off them
  const tgt=W.target||200,capL={thr:tgt*TH.SESS_THR,int:tgt*TH.SESS_INT,rep:tgt*TH.SESS_REP,all:tgt*0.2};
  const capNow=()=>({thr:Math.min(capL.thr,capL.all),int:Math.min(capL.int,capL.all),rep:Math.min(capL.rep,capL.all)});
  // hard days take turns between the phase's two kinds, starting with the one not planned last time
  const ph=W.ph&&W.ph.n>=0?W.ph:null,pair=ST_QUAL[ph&&ST_QUAL[ph.k]?ph.k:'def'];
  const lk=Object.keys(H).filter(k=>k<t&&H[k].kind).sort().pop();
  let qi=lk&&H[lk].kind===pair[0]?1:0,strided=false;
  const stridesOk=(P.lv.runStrides||1)>=3&&(!ir||ir.i>=1);
  const swp=d.stSwap||{};
  const ranked=['Run','Cycle','Swim'].sort((a,b)=>cnt(b)-cnt(a));
  const main=ranked[0],alt=cnt(ranked[1])>=Math.max(2,cnt(main)*0.25)?ranked[1]:null;
  const strT=cnt('Calisthenics')>cnt('Weights')?'Calisthenics':'Weights';
  // usual training days per week, from the weeks in the last four that had any training (v122: yoga and short walks are not training days)
  const wkN=[0,1,2,3].map(k=>new Set(ws.filter(w=>daysAgo(w.date)>=1+k*7&&daysAgo(w.date)<=7+k*7&&stTrains(w,thr)).map(w=>w.date)).size).filter(x=>x>0);
  const N=Math.max(3,Math.min(6,wkN.length?Math.round(avg(wkN)):3)),maxRun=N<=3?1:N<=4?2:N<=5?3:6;
  const plans=PL_DAYS.map((_,i)=>planOf(i)),hasPlan=plans.some(Boolean);
  const planHas=re=>plans.some(p=>p&&re.test(p.note||''));
  const planHard=planHas(ST_HARD),planLong=planHas(ST_LONG);
  const sore=(d.checkins.find(c=>c.date===t)||{}).soreness||0;
  const r5=n=>Math.max(10,Math.round(n/5)*5);
  const wd0=(new Date(t+'T12:00:00').getDay()+6)%7;
  // what actually happened on the six days before today, then the outline is appended day by day
  const seq=[];
  for(let i=6;i>=1;i--){const dt=dAgo(i),x=ws.filter(w=>w.date===dt);seq.push({tr:x.some(w=>stTrains(w,thr)),hard:stHard(dt,x,thr),str:x.some(w=>IS_STR(w.type)),run:x.some(w=>w.type==='Run')});}
  let gapStr=Math.min(99,...rec.filter(w=>IS_STR(w.type)&&daysAgo(w.date)>=1).map(w=>daysAgo(w.date)));
  // v122: after a hard session, hard training waits (wkRec, the same rule as the workout sheet): the latest date from the last few days' workouts
  const recW=ws.filter(w=>{const a=daysAgo(w.date);return a>=0&&a<TH.REC_BIG_D;}).map(w=>({w,on:wkRec(w,thr).hardOn})).filter(r=>r.on>t)
    .sort((a,b)=>a.on<b.on?1:a.on>b.on?-1:0)[0]||null;
  const recOn=dt=>!!recW&&dt<recW.on,recWhy=recW?`still recovering from ${wkWhen(recW.w.date)} ${wkNoun(recW.w)}`:'';
  let longDone=false,flip=false,hardOff=false;
  const days=[];
  for(let i=0;i<7;i++){
    const dt=dAgo(-i),wd=(wd0+i)%7,pl=planOf(wd),inWk=i<=6-wd0,f=W.fAt(i,!inWk);
    const p6=seq.slice(-6),nTr=p6.filter(x=>x.tr).length,nHard=p6.filter(x=>x.hard).length,prev=last(seq);
    let run=0;for(let k=seq.length-1;k>=0&&seq[k].tr;k--)run++;
    const o={i,date:dt,wd,planned:pl?{type:pl.type,note:pl.note||''}:null,bent:false};
    const today=ws.filter(w=>w.date===dt);
    if(i===0&&today.length){
      seq.push({tr:today.some(w=>stTrains(w,thr)),hard:stHard(dt,today,thr),str:today.some(w=>IS_STR(w.type)),run:today.some(w=>w.type==='Run')});
      if(today.some(w=>IS_STR(w.type)))gapStr=0;else gapStr++;
      const min=today.reduce((a,w)=>a+(w.durMin||0),0);
      // v121: what was planned this morning (planHist) and how it went, for the expanded row
      days.push({...o,done:true,role:'done',type:today[0].type,effort:0,name:'Done: '+[...new Set(today.map(w=>w.type))].join(', '),dur:min?fmtDur(min):'',how:'',why:'Logged today.',snap:H[dt]||null,match:stMatch(dt,thr),swaps:[]});
      continue;
    }
    let maxHard=f<=0.4||rec.length<4?0:W.mode==='easier'||W.mode==='recover'||W.mode==='start'||N<=3||f<1?1:2;
    // v121: no hard days early in a return after time off, at most one later in it or while coming back from an injury
    if(ret)maxHard=Math.min(maxHard,ret.pct<0.75?0:1);
    if(ir)maxHard=Math.min(maxHard,1);
    const canHard=!prev.hard&&nHard<maxHard&&sev<2&&!recOn(dt);
    const pick=()=>rec.length<4?'easy':canHard&&!hardOff?'hard':gapStr>=4&&sev<2&&f>0.5&&p6.filter(x=>x.str).length<2?'strength':wd>=5&&!longDone&&f>=0.9?'long':'easy';
    let role,type=main,why='';
    if(W.ph&&W.ph.n===i){role='race';why='Race day. Trust your training.';}
    else if(W.ph&&W.ph.n===i-1){role='rest';why='Recover after your race.';}
    else if(hasPlan){
      if(!pl||pl.type==='Rest'){role='rest';why=pl?'Rest is on your plan. Recovery is when you adapt.':'Nothing planned for this day.';}
      else if(IS_STR(pl.type)){role='strength';type=pl.type;why=sev>=2?'On your plan. Do not load the injured area.':'On your plan.';}
      else if(pl.type==='Yoga'||pl.type==='Walk'){role='gentle';type=pl.type;why='On your plan.';}
      else{
        type=pl.type;const n=pl.note||'';
        const want=ST_HARD.test(n)?'hard':ST_LONG.test(n)?'long':ST_EASY.test(n)?'easy':type==='Hike'?'steady':null;
        role=want||(canHard&&!planHard?'hard':wd>=5&&!longDone&&!planLong&&f>=0.9?'long':'easy');
        why='On your plan.';
        if(role==='hard'&&!canHard){role='easy';o.bent=true;why=sev>=2?'Plan says hard. Kept easy while your injury is active.':recOn(dt)?`Plan says hard. Kept easy: ${recWhy}.`:prev.hard?'Plan says hard. Kept easy because the day before is hard too.':'Plan says hard. Kept easy to limit hard days this week.';}
      }
    }else{
      if(run>=maxRun||nTr>=N){role='rest';why=nTr>=N?`${nTr} sessions in the last 6 days. Rest lets the work sink in.`:run>1?`${run} training days in a row. Rest lets the work sink in.`:'A rest day after training. That is when you adapt.';}
      else{
        role=pick();
        why=role==='hard'?'Fresh after an easier day. A good day to push.':role==='strength'?(gapStr>=99?'No strength work logged lately.':`No strength work for ${gapStr} days.`):role==='long'?'Your longer session of the week.':recOn(dt)?`Easy: ${recWhy}.`:prev.hard?'Easy day after a hard one.':'Easy volume builds fitness without much fatigue.';
        if(role==='strength')type=strT;
        else if(role==='easy'&&alt){type=flip?alt:main;flip=!flip;}
      }
    }
    // today bends to the body's signals
    if(i===0&&role!=='race'){
      const hf=coachFlags().find(x=>x.hard);
      // v118 (A3 ledger): the verdict alone decides rest (a severe injury sets it inside coachVerdict); form no longer bends today
      if(v&&v.lvl==='bad'){
        const was=pl&&pl.type!=='Rest'?` Your plan says ${pl.type}. Move it a day.`:'';
        role='recover';o.bent=!!was;
        why=(sev>=3?'A serious injury is active.':v.ill&&v.ill.lvl==='systemic'?v.ill.why+' Rest until it clears.':sc<scoreCuts().bad?'Recovery is low, so rest is the training today.':hf?hf.t+'.':'Recovery is the priority today.')+was;
      }else if(role!=='rest'&&role!=='gentle'){
        const cap=v&&v.ill?'You have symptoms above the neck.':prev.hard?'You trained hard yesterday.':sore>=3?'You are sore today.':v&&v.lvl==='warn'?(bodyLive()?'Body is middling today.':'Recovery is moderate.'):'';
        if(cap){
          if(role==='hard'||role==='long'||role==='steady'){o.bent=hasPlan;role='easy';why=cap+' Keep it easy and short.'+(hasPlan&&pl?` Plan: ${pl.type}${pl.note?', '+pl.note:''}.`:'');}
          else if(role==='strength'){o.light=true;why=cap+' Lift lighter than usual.';}
          else why=cap+' Build base without adding stress.';
        }else if(role==='hard')why=hasPlan?'On your plan, and you are recovered enough to do it well.':'You are recovered and yesterday was easy. A good day to push.';
      }
    }
    // this week's target already reached: no more hard or long sessions this week
    if(inWk&&W.target&&W.now>=W.target&&(role==='hard'||role==='long')){role='easy';o.bent=hasPlan;why='This week\'s time target is already reached. Keep it easy.';}
    const IMPACT=['Run','Cycle','Hike','Walk'];
    if(lowerHurt&&IMPACT.includes(type)&&role!=='rest'&&role!=='recover'&&role!=='race'&&role!=='strength'){type='Swim';o.bent=o.bent||hasPlan;why+=' Low impact because of your leg injury.';}
    // v121: your swap for this day (Insights), when the role allows it; never an impact sport with an active leg injury
    const allow=r=>(ST_SWAP[r]||[]).filter(x=>!(lowerHurt&&IMPACT.includes(x)));
    if(swp[dt]&&swp[dt]!==type&&allow(role).includes(swp[dt])){o.swapFrom=type;type=swp[dt];}
    let kind=role==='hard'?pair[qi%2]:null;
    // v121: coming back from a leg injury: hard runs wait for their stage, long runs come back last, never runs two days in a row
    if(ir&&type==='Run'&&!['rest','recover','race'].includes(role)){
      const okAt={tempo:2,hills:3,vo2:3};
      if(role==='hard'&&!(ir.i>=okAt[kind])){if(crossT){type=crossT;why+=' Hard runs come back later after your injury.';}else{role='easy';kind=null;why='Easy while you come back from your injury. Hard runs come back later.';}}
      if(role==='long'&&ir.i<4){role='easy';why='Long runs come back last after your injury.';}
      if(type==='Run'&&prev.run){if(crossT){type=crossT;why='No running two days in a row while you come back from your injury.';}else{role='rest';kind=null;why='No running two days in a row while you come back from your injury.';}}
    }
    if(i>0&&sev>=3&&role!=='rest'&&role!=='race')why='Only if your injury allows. Otherwise rest.';
    if(f<=0.5&&role==='easy'&&/^(Easy volume|Easy day|On your plan\.$)/.test(why))why=f===0.5?'Easy days after your race.':'Race week. Keep the legs fresh.';
    const near=ph&&ph.n-i>=0&&ph.n-i<=TH.STR_NOHEAVY_D;
    const shape=()=>{let dur=0,effort=0,name,how,lim=0;
      if(role==='rest'){name='Rest';how='No training. Sleep and eat well.';}
      else if(role==='recover'){name='Rest or gentle mobility';dur=20;effort=1;how='Gentle stretching, yoga or a walk. Full rest is fine too.';type='Yoga';}
      else if(role==='race'){name=d.profile.goalName||'Race day';effort=5;how='Warm up well and start slower than you think.';}
      else if(role==='gentle'){name=type==='Walk'?'Easy walk':'Yoga';dur=med(type);effort=1;how='Very easy. This is recovery, not training.';}
      else if(role==='strength'){name=type==='Weights'?'Strength session':'Calisthenics session';dur=med(type)*Math.min(1,f);effort=o.light?2:3;how=o.light?'Lighter than usual. Stop each set with 3 or more reps left.':'Steady effort. Stop each set with 1 to 3 reps left.';}
      else if(role==='hard'){name='Hard '+type.toLowerCase();dur=med(type)*f;effort=4;how=f<1?'Warm up 10 min easy, then a few short hard efforts with easy breaks.':'Warm up 10 min easy, then hard efforts with easy breaks, for example 4 to 6 times 3 min.';}
      // v121: a long session is also at most TH.LONG_GROW of your longest in 30 days; a long run also at most TH.LONG_SHARE of the week and TH.LONG_RUN_MAX
      // (rides and hikes are low impact and often a big share of a few-day week, so only the 30-day growth limits them)
      else if(role==='long'){name='Long '+type.toLowerCase();const m30=mx30(type);lim=Math.min(m30?m30*TH.LONG_GROW:1e9,type==='Run'&&W.target?W.target*TH.LONG_SHARE:1e9,type==='Run'?TH.LONG_RUN_MAX:1e9);dur=Math.min(Math.min(med(type)*1.5,Math.max(mx(type)*1.05,med(type)*1.2))*f,lim);effort=2;how='Easy pace all the way. The length is the training.';}
      else if(role==='steady'){name=type;dur=med(type)*f;effort=3;how='Steady effort. Talking takes some work.';}
      else{name='Easy '+type.toLowerCase();dur=med(type)*0.8*f;effort=2;how='Easy. You can talk in full sentences.';}
      let lo=0,hi=0;
      if(dur){lo=r5(dur*0.9);hi=Math.max(lo+5,r5(dur*1.1));if(role==='recover'){lo=15;hi=25;}if(lim&&lim<1e9){hi=Math.min(hi,Math.max(10,Math.floor(lim/5)*5));lo=Math.min(lo,hi-5);}}
      return{effort,name,how,lo,hi};};
    // v121: the session from the library for this role and sport, fitted to the time and the weekly quality caps
    const famOf=()=>{
      if(ir&&ir.stage==='ladder'&&type==='Run'&&role==='easy')return'runReturn';
      if(role==='recover')return'mob';
      if(role==='hard')return(SESS_EQ[kind]||{})[type]||null;
      if(role==='long')return SESS_EQ.long[type]||null;
      if(role==='easy')return type==='Yoga'?'yoga':type==='Run'&&stridesOk&&!strided?'runStrides':SESS_EQ.easy[type]||null;
      if(role==='strength')return type==='Weights'?'wt':type==='Calisthenics'?'cal':type==='Yoga'?'yoga':null;
      if(role==='gentle')return type==='Yoga'?'yoga':null;
      return null;};
    let x=shape(),fam=famOf(),sess=null;
    const fit=()=>fam?sessFit(fam,fam==='runReturn'?ir.step:P.lv[fam]||1,x.lo,x.hi,capNow(),{noLower,light:!!(o.light||near)}):null;
    sess=fit();
    // a hard session may run up to a quarter over your usual time rather than drop to easy
    if(!sess&&fam&&role==='hard'){const h2=Math.max(x.hi,r5(x.hi*1.25));sess=sessFit(fam,P.lv[fam]||1,x.lo,h2,capNow(),{noLower});if(sess){x.lo=Math.max(x.lo,Math.round(sess.min/5)*5);x.hi=x.lo+5;}}
    // still no fit: easy, and later days without a plan pick strength or long instead of trying hard again
    if(!sess&&fam&&role==='hard'){const l1=sessMake(fam,1,{}),full=l1.cap&&l1.q>capNow()[l1.cap]+0.01;hardOff=true;role='easy';kind=null;why=full?'Easy instead: this week\'s hard work is already planned.':'Easy instead: a hard session needs more time than you usually train.';x=shape();fam=famOf();sess=fit();}
    let{effort,name,how,lo,hi}=x;
    if(sess){
      if(sess.cap){capL[sess.cap]-=sess.q;capL.all-=sess.q;}
      if(sess.fam==='runStrides')strided=true;
      if(role!=='recover')name=sess.name;
      if(sess.fam==='runReturn'){lo=hi=Math.round(sess.min);}
      how=sessLines(sess,thr).m[0]||how;
    }
    if(role==='hard')qi++;
    const txt=lo?(lo===hi?fmtDur(lo):`${fmtDur(lo)} to ${fmtDur(hi)}`):'';
    const tr=role!=='rest'&&role!=='recover'&&role!=='gentle';
    seq.push({tr,hard:role==='hard'||role==='race',str:role==='strength',run:tr&&type==='Run'});
    if(role==='strength')gapStr=0;else gapStr++;
    if(role==='long')longDone=true;
    days.push({...o,role,type,effort,name,lo,hi,dur:txt,how,why:why.trim(),kind,fam:sess?sess.fam:null,lvl:sess?sess.lvl:null,sess,swaps:allow(role).filter(y=>y!==type)});
  }
  const fut=days.filter(x=>!x.done);
  return{mode:W.mode,label:W.label,why:W.why,target:W.target,now:W.now,base:W.base?Math.round(W.base):null,hasPlan,days,
    hardN:fut.filter(x=>x.role==='hard'||x.role==='race').length,restN:fut.filter(x=>x.role==='rest'||x.role==='recover').length,
    lo:fut.reduce((a,x)=>a+x.lo,0),hi:fut.reduce((a,x)=>a+x.hi,0),
    ret,ir,thr,tk:{Run:sessKind('Run',thr),Cycle:sessKind('Cycle',thr),Swim:'eff'},lv:P.lv};
}
// today's session in the short form used by the briefing; null once you have trained (the Today card renderSuggest/#sugCard was removed in v115)
function suggestWorkout(){
  const st=strategy();if(!st)return null;
  const x=st.days[0];if(x.done)return null;
  return{type:x.role==='rest'?'Yoga':x.type,title:x.name+(x.dur?', '+x.dur:''),why:x.why};
}
const stBars=n=>n?`<span class="st-e" role="img" aria-label="Effort ${n} of 5">${[1,2,3,4,5].map(k=>`<i${k<=n?' class="on"':''}></i>`).join('')}</span>`:'';
const stMeta=x=>[x.dur,x.effort?`effort ${x.effort} of 5`:''].filter(Boolean).join(' · ');
// v121: your swap for a day (this phone only, past dates dropped); '' goes back to the planned sport. Only sports a role can take are stored.
const ST_SWAPS=new Set(Object.values(ST_SWAP).flat());
function stSwapTo(dt,ty){
  if(ty&&!ST_SWAPS.has(ty))return;
  const d=S(),t=td(),n={};
  Object.entries(d.stSwap||{}).forEach(([k,v])=>{if(k>=t)n[k]=v;});
  if(ty)n[dt]=ty;else delete n[dt];
  d.stSwap=n;save(d);_stOpen.add(dt);refreshAll();
}
// rows you opened stay open when the card is drawn again
const _stOpen=new Set();
function stTog(el){const k=el.dataset.d;if(el.open)_stOpen.add(k);else _stOpen.delete(k);}
const ST_PH=[['w','Warm-up'],['m','Main set'],['c','Cool-down']];
const ST_STAGE={volume:'more running time',strides:'short fast strides',tempo:'steady hard runs',hills:'hill reps',long:'the long run'};
// what was planned for a done day, from this morning's snapshot
function stPlanned(p){
  if(!p)return'';
  const s=p.fam?sessMake(p.fam,p.lvl||1,{min:p.lo||30}):null,n=s?s.name:p.role==='rest'?'Rest':p.type;
  return[n,p.lo?(p.lo===p.hi?fmtDur(p.lo):`${fmtDur(p.lo)} to ${fmtDur(p.hi)}`):'',p.effort?`effort ${p.effort} of 5`:''].filter(Boolean).join(' · ');
}
// the open part of a row: the session in three parts with targets, swaps, or planned against done
function stRowX(x,st){
  let h='';
  if(x.done){
    const ws=stWs().filter(w=>w.date===x.date),m=x.match;
    const pn=ws.map(painOf).filter(v=>v!=null),eff=m&&m.eff!=null?m.eff:null;
    const did=ws.map(w=>[wkLabel(w),w.durMin?fmtDur(w.durMin):''].filter(Boolean).join(' ')).join(', ');
    h+=x.snap?`<div class="st-pv"><span>Planned</span>${esc(stPlanned(x.snap))}</div>`:'';
    h+=`<div class="st-pv"><span>Done</span>${esc([did,eff!=null?`effort ${eff} of 5${m.src==='hr'?' from heart rate':''}`:'',pn.length?`pain ${Math.max(...pn)} of 10`:''].filter(Boolean).join(' · '))}</div>`;
    const say=!m||!x.snap?'':m.m==='other'?'A different sport from the plan.':m.m==='harder'?'Harder than planned.':eff==null?'Add the effort in Log so the plan learns from it.':'Done as planned.';
    if(say)h+=`<div class="set-note">${say}</div>`;
    if(pn.length&&Math.max(...pn)>=TH.PAIN_STOP)h+=`<div class="set-note">Pain ${Math.max(...pn)} of 10: stop training on it and get it checked.</div>`;
    // v122: each workout of the day opens its sheet (not inside the sheet itself)
    if(!x.sheet&&ws.length)h+=`<div class="st-sws">${ws.map(w=>`<button type="button" class="st-sw" onclick="openDetail('wk:${esc(w.id)}')">${ws.length>1?esc(wkLabel(w))+' details':'Workout details'}</button>`).join('')}</div>`;
    return h;
  }
  if(x.sess){
    // yoga and mobility are one list, so they get no part names
    const L=sessLines(x.sess,st.thr),solo=!L.w.length&&!L.c.length;
    h+=ST_PH.filter(([k])=>L[k].length).map(([k,lab])=>`<div class="st-ph">${solo?'':`<span>${lab}</span>`}<ul>${L[k].map(l=>`<li>${esc(l)}</li>`).join('')}</ul></div>`).join('');
    if(L.note&&!IS_STR(x.type)&&x.type!=='Yoga')h+=`<div class="set-note">${esc(L.note)}</div>`;
  }
  if(x.swapFrom)h+=`<div class="set-note">Swapped from ${esc(x.swapFrom.toLowerCase())}.</div>`;
  if(x.swaps&&x.swaps.length){
    const ch=x.swaps.map(y=>y===x.swapFrom?`<button type="button" class="st-sw" onclick="stSwapTo('${x.date}','')">Back to ${y.toLowerCase()}</button>`:`<button type="button" class="st-sw" onclick="stSwapTo('${x.date}','${y}')">${y}</button>`).join('');
    h+=`<div class="st-swl">Swap for</div><div class="st-sws">${ch}</div>`;
  }
  return h;
}
// v121: send to the watch, for the first TH.SEND_DAYS days (today only for now) and only with the keys set.
// Runs, rides and swims go; strength and yoga stay on the phone. The state comes from icuSent on this phone.
function stSendHTML(x,st){
  const d=S();
  if(x.done||x.i>=TH.SEND_DAYS||!d.intervalsKey||!d.intervalsID)return'';
  const was=(d.icuSent||{})[x.date],ev=icuEvent(x,st.thr),busy=_icuBusy===x.date;
  const btn=(t,rm)=>`<button type="button" class="st-send" onclick="icuSendDay('${x.date}'${rm?',1':''})"${busy||_icuBusy?' disabled':''}>${busy?'Sending…':t}</button>`;
  const at=was&&was.at?new Date(was.at).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}):'';
  if(!ev){
    if(was)return`<div class="st-sendr"><span class="st-sent">The session sent earlier is still on your watch.</span>${btn('Take it off',1)}</div>`;
    return x.sess?'<div class="set-note">Strength and yoga stay on this phone.</div>':'';
  }
  if(was&&was.sig===icuSig(ev))return`<div class="st-sendr"><span class="st-sent">On your watch${at?` · sent ${at}`:''}</span>${btn('Take it off',1)}</div>`;
  return`<div class="st-sendr">${was?'<span class="st-sent">Changed since you sent it.</span>':''}${btn(was?'Send the new version':'Send to watch')}</div>`;
}
// one line under the week mode while a comeback runs: after an injury first, else after time off
function stRetHTML(st){
  const ir=st.ir,r=st.ret;let t='';
  if(ir)t=ir.stage==='ladder'?`Coming back from your ${ir.part.toLowerCase()} injury: run-walk step ${ir.step} of ${RET_LADDER.length}. A run with pain 3 or less moves you on, 5 or more steps back.${ir.pain!=null?` Last pain ${ir.pain} of 10.`:''}`
    :`Coming back from your ${ir.part.toLowerCase()} injury: this week adds ${ST_STAGE[ir.stage]}.`;
  else if(r)t=`Coming back after ${r.gap} days off: week ${r.week} of ${r.of} at about ${stPctW(r.pct)} of your usual.`;
  return t?`<div class="st-ret">${esc(t)}</div>`:'';
}
// Insights: the 7-day outline with this week's time target
function renderStrategy(){
  const el=$('stratCard');if(!el)return;
  const st=strategy();
  if(!st){el.style.display='none';return;}
  el.style.display='';
  const pc=st.target?Math.min(100,Math.round(st.now/st.target*100)):0;
  const head=st.target?`<div class="st-tg"><b>${fmtDur(st.now)}</b> of about ${fmtDur(st.target)} this week</div><div class="gl-bar"><div style="width:${pc}%"></div></div>`:'';
  const t=td();[..._stOpen].forEach(k=>{if(k<t)_stOpen.delete(k);});
  // v121: a row with a session, swaps or a done workout opens to show it; rest and race rows stay plain
  // v123: a reason shows once in the week, so three rest days do not repeat the same sentence
  const seen=new Set();
  const rows=st.days.map(x=>{
    const why=seen.has(x.why)?'':x.why;seen.add(x.why);
    const dt=new Date(x.date+'T12:00:00');
    const r=`<div class="st-r${x.i===0?' now':''}${x.role==='rest'||x.role==='recover'?' off':''}"><div class="st-d">${x.i===0?'Today':PL_DAYS[x.wd]}<small>${dt.getDate()}</small></div>
     <div class="st-b"><div class="st-n">${esc(x.name)}</div>${stMeta(x)?`<div class="st-s">${esc(stMeta(x))}</div>`:''}${why?`<div class="st-s st-w">${esc(why)}</div>`:''}</div>${stBars(x.effort)}`;
    const body=(x.role==='rest'||x.role==='race'?'':stRowX(x,st))+stSendHTML(x,st);
    if(!body)return r+'</div>';
    return`<details class="st-x" data-d="${x.date}" ontoggle="stTog(this)"${_stOpen.has(x.date)?' open':''}><summary>${r}<svg class="st-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></div></summary><div class="st-sx">${body}</div></details>`;
  }).join('');
  el.innerHTML=`<div class="sec">Next 7 days</div><div class="st-mode">${esc(st.label)}</div><div class="set-note" style="margin:2px 0 10px">${esc(st.why)}</div>${stRetHTML(st)}${head}
   <div class="st-list">${rows}</div>`;
}
