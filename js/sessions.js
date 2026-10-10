// ── SESSIONS: a library of training sessions in our own words, each with levels 1 to 10 (v121) ──
// A session has a warm-up (w), a main set (m) and a cool-down (c). Each part is a list of
//   steps   {lbl, min | mtr, z:'z1'..'z6' | null, zTo?, eff?, sets?, reps?, secs?, side?}
//   blocks  {n, set:[step]}   (one repeat level only: watches cannot nest repeats)
// q = minutes of quality work (steady-hard or harder); cap = the weekly cap they come off ('thr' steady-hard, 'int' hard, 'rep' strides and hills).
// Targets: sessLines() writes real numbers for the screen (min/km, bpm, W); sessIcu() writes Intervals.icu workout text in percentages
// only, so a watch workout stays right when a threshold changes. Watch cues are letters and spaces only.
// Adding a family: a builder b(level, opt) returning {w, m, c}; quality minutes must never go down as the level rises (tested).

// Zones as percentages: heart rate of threshold heart rate, pace of threshold speed, power of threshold power.
const ZN={
  runHr:{z1:[70,84],z2:[85,89],z3:[90,94],z4:[95,99],z5:[100,106],z6:[100,106]},
  rideHr:{z1:[65,80],z2:[81,89],z3:[90,93],z4:[94,99],z5:[100,106],z6:[100,106]},
  pace:{z1:[70,78],z2:[78,88],z3:[88,94],z4:[94,100],z5:[102,107],z6:[107,115]},
  pw:{z1:[45,55],z2:[56,75],z3:[76,90],z4:[90,100],z5:[106,120],z6:[121,150]},
  eff:{z1:'very easy, you could chat all the way',z2:'easy, you can talk in full sentences',z3:'steady, a few words at a time',
    z4:'comfortably hard, short phrases only',z5:'hard, a word or two',z6:'fast but relaxed, not a sprint'}
};
// Return-to-run ladder after a lower-body injury: [run min, walk min, times]
const RET_LADDER=[[1,4,5],[2,3,5],[3,2,5],[4,1,5],[5,1,5],[20,0,1],[30,0,1]];
const SW_PACE=2.5;  // minutes per 100 m until 3 swims with distance are logged

const st=(lbl,min,z,zTo)=>{const s={lbl,min,z:z||null};if(zTo)s.zTo=zTo;return s;};
const sw=(lbl,mtr,z)=>({lbl,mtr,z:z||null});
const sx=(lbl,sets,reps,o)=>({lbl,sets,reps,...(o||{})});
const lv=(a,l)=>a[Math.max(1,Math.min(a.length,l))-1];
const half=x=>Math.round(x*2)/2;
// a strength or calisthenics level: sets × reps
const strDose=(l,light)=>light?[2,10]:l<=3?[2,10]:l<=6?[3,8]:l<=8?[3,6]:[4,5];
const calDose=l=>l<=3?[2,8]:l<=6?[3,10]:[3,12];

const SESS={
  runEasy:{type:'Run',name:'Easy run',time:1,b:(l,o)=>({w:[st('Easy, settling in',5,'z1')],m:[st('Easy',Math.max(5,o.min-10),'z1','z2')],c:[st('Easy, slowing down',5,'z1')]})},
  runStrides:{type:'Run',name:'Easy run with strides',cap:'rep',time:1,b:(l,o)=>{const n=4+Math.floor(l/3),blk=n*(1/3+1);
    return{w:[st('Easy, settling in',5,'z1')],m:[st('Easy',Math.max(5,Math.round(o.min-10-blk)),'z1','z2'),{n,set:[{...st('Stride',1/3,'z6'),q:1},st('Walk back',1,null)]}],c:[st('Easy, slowing down',5,'z1')]};}},
  runLong:{type:'Run',name:'Long run',time:1,b:(l,o)=>({w:[st('Easy, settling in',10,'z1')],m:[st('Easy and steady',Math.max(10,o.min-15),'z1','z2')],c:[st('Easy, slowing down',5,'z1')]})},
  runTempo:{type:'Run',name:'Steady hard run',cap:'thr',b:l=>{const[n,r]=lv([[2,5],[2,6],[3,5],[2,8],[3,6],[2,10],[3,8],[2,12],[3,10],[2,15]],l);
    return{w:[st('Easy',15,'z1','z2')],m:[{n,set:[{...st('Steady hard',r,'z4'),q:1},st('Jog',2,'z1')]}],c:[st('Easy, slowing down',10,'z1')]};}},
  runHard:{type:'Run',name:'Hard run reps',cap:'int',b:l=>{const[n,r]=lv([[4,2],[5,2],[4,3],[6,2],[5,3],[4,4],[6,3],[5,4],[4,5],[6,4]],l);
    return{w:[st('Easy',12,'z1','z2'),{n:3,set:[st('Stride',1/3,'z6'),st('Walk back',1,null)]}],m:[{n,set:[{...st('Hard',r,'z5'),q:1},st('Jog',half(r*0.75),'z1')]}],c:[st('Easy, slowing down',8,'z1')]};}},
  runHills:{type:'Run',name:'Hill reps',cap:'rep',b:l=>{const n=3+l,s=l<=4?0.75:1;
    return{w:[st('Easy to the hill',15,'z1','z2')],m:[{n,set:[{...st('Uphill, strong and tall',s,'z5'),q:1,eff:1},st('Walk or jog down',s*2,null)]}],c:[st('Easy, slowing down',10,'z1')]};}},
  runReturn:{type:'Run',name:'Run-walk',b:l=>{const[r,wk,n]=lv(RET_LADDER,l);
    return{w:[st('Brisk walk',5,null)],m:wk?[{n,set:[st('Easy run',r,'z1'),st('Walk',wk,null)]}]:[st('Easy run',r,'z1')],c:[st('Walk',5,null)]};}},
  rideEasy:{type:'Cycle',name:'Easy ride',time:1,b:(l,o)=>({w:[st('Easy spin',10,'z1')],m:[st('Easy',Math.max(5,o.min-15),'z2')],c:[st('Easy spin',5,'z1')]})},
  rideLong:{type:'Cycle',name:'Long ride',time:1,b:(l,o)=>({w:[st('Easy spin',15,'z1')],m:[st('Easy and steady',Math.max(10,o.min-25),'z2')],c:[st('Easy spin',10,'z1')]})},
  rideTempo:{type:'Cycle',name:'Steady hard ride',cap:'thr',b:l=>{const[n,r]=lv([[2,8],[3,8],[2,12],[3,10],[2,15],[3,12],[2,20],[3,15],[2,25],[3,20]],l);
    return{w:[st('Easy spin',10,'z1'),st('Building',5,'z2')],m:[{n,set:[{...st('Steady hard',r,'z4'),q:1},st('Easy spin',r>=15?5:4,'z1')]}],c:[st('Easy spin',10,'z1')]};}},
  rideHard:{type:'Cycle',name:'Hard ride reps',cap:'int',b:l=>{const[n,r]=lv([[4,3],[5,3],[4,4],[6,3],[5,4],[4,5],[6,4],[5,5],[6,5],[5,6]],l);
    return{w:[st('Easy spin',10,'z1'),st('Building',5,'z2','z3')],m:[{n,set:[{...st('Hard',r,'z5'),q:1},st('Easy spin',r,'z1')]}],c:[st('Easy spin',10,'z1')]};}},
  swimEasy:{type:'Swim',name:'Easy swim',time:1,b:(l,o)=>{const p=o.swPace||SW_PACE,n=Math.max(2,Math.round((o.min-3*p)/(2*p+0.5)));
    return{w:[sw('Easy, any stroke',200,'z1')],m:[{n,set:[sw('Steady',200,'z2'),st('Rest',0.5,null)]}],c:[sw('Easy',100,'z1')]};}},
  swimHard:{type:'Swim',name:'Swim reps',cap:'int',b:l=>{const n=lv([6,7,8,9,10,11,12,13,14,16],l);
    return{w:[sw('Easy, any stroke',300,'z1'),sw('Building',100,'z3')],m:[{n,set:[{...sw('Hard',100,'z5'),q:1},st('Rest',0.5,null)]}],c:[sw('Easy',200,'z1')]};}},
  wt:{type:'Weights',name:'Strength',str:1,b:(l,o)=>{const[s,r]=strDose(l,o.light);
    const legs=o.noLower?[]:[sx('Squat',s,r),sx('Romanian Deadlift',s,r)];
    const up=[sx('Bench Press',s,r),sx('Barbell Row',s,r)];if(l>=4||o.noLower)up.push(sx('Overhead Press',s,r));
    const end=o.noLower?[sx('Plank',s,0,{secs:30})]:[sx('Calf Raise',s,r+4)];
    return{w:[st('Easy cardio or mobility',5,null)],m:[...legs,...up,...end],c:[st('Stretch',5,null)]};}},
  cal:{type:'Calisthenics',name:'Bodyweight strength',str:1,b:(l,o)=>{const[s,r]=calDose(l);
    const m=[sx('Push-up',s,r),l>=6?sx('Pull-up',s,Math.max(3,r-6)):sx('Inverted Row',s,r)];
    if(!o.noLower)m.push(l>=8?sx('Pistol Squat',s,5,{side:1}):sx('Bodyweight Squat',s,r+5),sx('Bodyweight Lunge',s,r,{side:1}));
    m.push(sx('Pike Push-up',s,Math.max(5,r-3)),sx('Plank',s,0,{secs:20+l*4}));
    return{w:[st('Easy cardio or mobility',5,null)],m,c:[st('Stretch',5,null)]};}},
  yoga:{type:'Yoga',name:'Yoga',time:1,b:(l,o)=>{const P=[['Slow breathing, seated',3],['Cat and cow',3],['Downward dog',3],['Low lunge, each side',4],['Pigeon, each side',4],['Seated forward fold',3],['Lying twist, each side',3],['Legs up the wall',5]];
    const k=Math.max(0.6,(o.min||30)/P.reduce((a,p)=>a+p[1],0));return{w:[],m:P.map(([n,t])=>st(n,Math.max(1,Math.round(t*k)),null)),c:[]};}},
  mob:{type:'Yoga',name:'Mobility',time:1,b:(l,o)=>{const P=[['Leg swings, front to back',2],['Leg swings, side to side',2],['Hip circles',2],['Ankle rocks',2],['Lunge with a twist, each side',3],['Glute bridge',2],['Calf stretch, each side',2],['Hip flexor stretch, each side',3],['Upper back rotations',2]];
    const k=Math.max(0.6,(o.min||20)/P.reduce((a,p)=>a+p[1],0));return{w:[],m:P.map(([n,t])=>st(n,Math.max(1,Math.round(t*k)),null)),c:[]};}}
};
// The same kind of session in another sport, for swaps and injuries
const SESS_EQ={
  tempo:{Run:'runTempo',Cycle:'rideTempo',Swim:'swimHard'},vo2:{Run:'runHard',Cycle:'rideHard',Swim:'swimHard'},
  hills:{Run:'runHills',Cycle:'rideHard',Swim:'swimHard'},easy:{Run:'runEasy',Cycle:'rideEasy',Swim:'swimEasy'},
  long:{Run:'runLong',Cycle:'rideLong',Swim:'swimEasy'},strides:{Run:'runStrides',Cycle:'rideEasy',Swim:'swimEasy'}
};

// ── thresholds ──
// Max heart rate estimate: the 98th percentile of recorded workout maxima (needs TH.HRMAX_N)
function hrMaxEst(){
  const v=wkOn().map(w=>w.sub&&w.sub.icu&&w.sub.icu.hrMax).filter(x=>x>=120&&x<=230).sort((a,b)=>a-b);
  return v.length>=TH.HRMAX_N?v[Math.min(v.length-1,Math.floor(v.length*TH.HRMAX_PCT))]:null;
}
// {run:{lthr, maxHr, pace, ref, est}, ride:{ftp, lthr, maxHr, ref, est}}: imported values first (ref 'lthr' or 'max'),
// else threshold HR estimated from max HR (est: shown as "about", never sent to the watch)
function stThr(){
  const t=S().icuThr||{},mx=hrMaxEst(),out={};
  [['run',TH.THR_RUN_K],['ride',TH.THR_RIDE_K]].forEach(([k,K])=>{
    const s={...(t[k]||{})};delete s.est;delete s.ref;
    if(!s.ftp&&s.eftp)s.ftp=s.eftp;delete s.eftp;   // the estimated FTP backs up a missing one
    if(s.lthr)s.ref='lthr';
    else if(s.maxHr){s.lthr=Math.round(s.maxHr*K);s.ref='max';}
    else if(mx){s.maxHr=mx;s.lthr=Math.round(mx*K);s.est=true;}
    out[k]=s;
  });
  return out;
}
// A power meter is in use when TH.PM_RIDES rides in the last 42 days recorded power from a device (v122: e-bike rides never count)
function pmOn(){
  const from=dAgo(42);
  return wkOn().filter(w=>w.type==='Cycle'&&w.date>=from&&w.sub&&w.sub.icu&&w.sub.icu.dw&&w.sub.icu.pw&&!w.sub.icu.eb).length>=TH.PM_RIDES;
}
// how targets are given for a sport: 'pace' | 'hr' | 'pw' | 'eff' (effort words) | null (strength, yoga)
function sessKind(type,thr){
  thr=thr||stThr();
  if(type==='Run')return thr.run.pace?'pace':thr.run.lthr?'hr':'eff';
  if(type==='Cycle')return thr.ride.ftp&&pmOn()?'pw':thr.ride.lthr?'hr':'eff';
  if(type==='Swim')return'eff';
  return null;
}
// minutes per 100 m from the last swims with a distance, else SW_PACE
function swPace(){
  const v=wkOn().filter(w=>w.type==='Swim'&&w.distKm>0&&w.durMin>0).slice(-10).map(w=>w.durMin/(w.distKm*10)).filter(p=>p>=1.2&&p<=5);
  return v.length>=3?v.sort((a,b)=>a-b)[Math.floor(v.length/2)]:SW_PACE;
}

// ── building and fitting ──
const sMin=(s,p)=>s.mtr?s.mtr/100*p:s.min||0;
const sItems=a=>a.flatMap(x=>x.set?Array.from({length:x.n},()=>x.set).flat():[x]);
function sessMake(fam,lvl,opt={}){
  const F=SESS[fam];if(!F)return null;
  const p=opt.swPace||(F.type==='Swim'?swPace():SW_PACE),o={...opt,swPace:p};
  const b=F.b(lvl,o),all=[...sItems(b.w),...sItems(b.m),...sItems(b.c)];
  const strMin=x=>x.sets?x.sets*(F.type==='Weights'?2.5:1.5)*(x.side?1.5:1):0;
  const min=all.reduce((a,x)=>a+(x.sets?strMin(x):sMin(x,p)),0);
  const q=all.filter(x=>x.q).reduce((a,x)=>a+sMin(x,p),0);
  return{fam,lvl:F.time||F.str?lvl:Math.max(1,Math.min(fam==='runReturn'?RET_LADDER.length:10,lvl)),type:F.type,name:F.name,min,q:Math.round(q*10)/10,cap:F.cap||null,w:b.w,m:b.m,c:b.c,swPace:p};
}
// The session at this level or the highest lower one that fits: quality minutes within capLeft[cap], total within hi;
// a short session is padded with easy time up to the middle of the range. Null when even level 1 does not fit.
function sessFit(fam,lvl,lo,hi,capLeft,opt={}){
  const F=SESS[fam];if(!F)return null;
  const mid=Math.max(lo,Math.min(hi,Math.round((lo+hi)/10)*5));
  const okCap=s=>!s.cap||!capLeft||s.q<=(capLeft[s.cap]??Infinity)+0.01;
  if(F.time){
    const s=sessMake(fam,lvl,{...opt,min:mid});
    return okCap(s)?s:(fam==='runStrides'?sessMake('runEasy',lvl,{...opt,min:mid}):null);
  }
  if(F.str){
    const s=sessMake(fam,lvl,opt);
    while(s.min>hi&&s.m.length>3){s.m.pop();s.min=[...s.w,...s.m,...s.c].reduce((a,x)=>a+(x.sets?x.sets*(s.type==='Weights'?2.5:1.5)*(x.side?1.5:1):x.min||0),0);}
    return s;
  }
  for(let l=Math.min(fam==='runReturn'?RET_LADDER.length:10,Math.max(1,lvl));l>=1;l--){
    const s=sessMake(fam,l,opt);
    if(!okCap(s))continue;
    if(fam!=='runReturn'&&s.min>hi+0.01)continue;
    const pad=Math.ceil(mid-s.min);
    if(pad>0&&fam!=='runReturn'){
      const ez=s.type==='Cycle'?st('Easy',0,'z2'):st('Easy',0,'z1','z2');
      if(pad<5&&s.c[0]&&s.c[0].min!=null&&!s.c[0].mtr)s.c=[{...s.c[0],min:s.c[0].min+pad},...s.c.slice(1)];
      else if(s.type==='Swim')s.c=[{...st('Easy, any stroke',pad,'z1')},...s.c];
      else s.c=[{...ez,min:pad},...s.c];
      s.min+=pad;
    }
    return s;
  }
  return null;
}

// ── targets ──
const ZT={Run:{hr:'runHr',pace:'pace'},Cycle:{hr:'rideHr',pw:'pw'}};
const zR=(tab,z,zTo)=>[ZN[tab][z][0],ZN[tab][zTo||z][1]];
// {txt, icu} for one step: txt for the screen (real numbers, or effort words), icu for the watch ('' = no target)
function sessTarget(step,type,thr,kind){
  const z=step.z;if(!z)return{txt:'',icu:''};
  const words={txt:ZN.eff[step.zTo||z],icu:''};
  if(!kind||kind==='eff'||step.eff||step.mtr)return words;
  const tab=(ZT[type]||{})[kind];if(!tab)return words;
  const[a,b]=zR(tab,z,step.zTo);
  if(kind==='pace'){
    const v=thr.run.pace,mk=p=>fmtPace(1000/(v*p/100)/60);
    return{txt:`${mk(b)} to ${mk(a)}\u00a0/km`,icu:`${a}-${b}% Pace`};
  }
  if(kind==='pw'){const f=thr.ride.ftp;return{txt:`${Math.round(f*a/100)} to ${Math.round(f*b/100)} W`,icu:`${a}-${b}%`};}
  // heart rate lags short efforts, so steps under 3 minutes at hard or faster use effort words
  if(step.min<3&&(z==='z5'||z==='z6'))return words;
  const t=type==='Run'?thr.run:thr.ride,lo=Math.round(t.lthr*a/100),hi=Math.round(t.lthr*b/100);
  const txt=`${t.est?'about ':''}${lo} to ${hi} bpm`;
  if(t.est)return{txt,icu:''};
  if(t.ref==='max'){const K=type==='Run'?TH.THR_RUN_K:TH.THR_RIDE_K;return{txt,icu:`${Math.round(a*K)}-${Math.round(b*K)}% HR`};}
  return{txt,icu:`${a}-${b}% LTHR`};
}

// ── screen text ──
const sDur=min=>{const s=Math.round(min*60);if(s<60)return`${s}s`;const m=Math.floor(s/60),r=s%60;return r?`${fmtDur(m)} ${r}s`:fmtDur(m);};
function sStep(x,type,thr,kind){
  if(x.sets)return`${x.lbl}: ${x.sets} × ${x.secs?x.secs+'s':x.reps}${x.side?' each side':''}`;
  const d=x.mtr?`${x.mtr} m`:sDur(x.min),t=sessTarget(x,type,thr,kind).txt;
  return`${x.lbl} ${d}${t?(/\d/.test(t)?' at ':', ')+t:''}`;
}
// {w, m, c: [lines], note}
function sessLines(s,thr){
  thr=thr||stThr();const kind=sessKind(s.type,thr);
  const part=a=>a.map(x=>x.set?`${x.n} times: ${x.set.map(y=>sStep(y,s.type,thr,kind)).join(', then ')}`:sStep(x,s.type,thr,kind));
  let note='';
  if(kind==='eff'&&s.type!=='Swim')note='No threshold yet, so targets are by feel.';
  else if(kind==='hr'&&(s.type==='Run'?thr.run:thr.ride).est)note='Heart rates are estimated, so the watch gets no heart rate targets.';
  else if(s.type==='Swim')note=`Times assume about ${fmtPace(s.swPace||SW_PACE)} per 100 m.`;
  return{w:part(s.w),m:part(s.m),c:part(s.c),note};
}
// the main set in short for the briefing (at most 70 characters; the session name sits beside it)
function sessSum(s){
  if(!s)return'';
  const one=x=>x.sets?`${x.lbl} ${x.sets}×${x.secs?x.secs+'s':x.reps}`:`${x.lbl.toLowerCase()} ${x.mtr?x.mtr+' m':sDur(x.min)}`;
  const m=s.m.map(x=>x.set?`${x.n}× ${x.set.map(one).join(' + ')}`:one(x)).join(', ');
  return m.length>70?m.slice(0,69)+'…':m;
}

// ── watch text (Intervals.icu workout description): percentages only, cues letters and spaces only ──
const cue=l=>String(l).replace(/[^A-Za-z ]/g,' ').replace(/\s+/g,' ').trim();
const iDur=x=>x.mtr?`${x.mtr}mtr`:Number.isInteger(x.min)?`${x.min}m`:`${Math.round(x.min*60)}s`;
function sessIcu(s,thr){
  if(!s||!['Run','Cycle','Swim'].includes(s.type))return'';
  thr=thr||stThr();const kind=sessKind(s.type,thr);
  const ln=x=>{const t=sessTarget(x,s.type,thr,kind).icu;return`- ${cue(x.lbl)} ${iDur(x)}${t?' '+t:''}`;};
  const grp=(name,a)=>{const out=[];let loose=[],first=true;
    const flush=()=>{if(loose.length){out.push([first?name:'',loose]);first=false;loose=[];}};
    a.forEach(x=>{if(x.set&&x.n>1){flush();out.push([`${name==='Main Set'?'Main Set ':''}${x.n}x`,x.set.map(ln)]);first=false;}else(x.set||[x]).forEach(y=>loose.push(ln(y)));});
    flush();return out;};
  return[...grp('Warmup',s.w),...grp('Main Set',s.m),...grp('Cooldown',s.c)].map(([h,l])=>(h?h+'\n':'')+l.join('\n')).join('\n\n');
}
