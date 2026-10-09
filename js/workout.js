// ── WORKOUT (v122): one reading of each workout, shared by the outline, the levels and the workout sheet: does it count as
// training, how hard it was (your effort, else the watch's, else heart rate), and when hard training fits again ──

// threshold heart rate for a workout: the one recorded with it, else your current one for that sport (rides use the ride
// setting, everything else the run setting), else TH.LT_FROM_MAX of the max heart rate recorded with it
function wkLt(w,thr){
  const i=wIcu(w);if(i.lt)return i.lt;
  const t=thr||stThr(),s=w.type==='Cycle'?t.ride:t.run,o=w.type==='Cycle'?t.run:t.ride;
  if(s&&s.lthr&&!s.est)return s.lthr;
  if(i.mx)return Math.round(i.mx*TH.LT_FROM_MAX);
  return(s&&s.lthr)||(o&&o.lthr)||null;
}
// minutes easy, steady and hard from the time in each heart rate zone: a zone is classed by its middle against the threshold
// (TH.ZN_STEADY, TH.ZN_HARD), so 5-zone and 7-zone setups both work. null without zones.
function wkMix(w,thr){
  const i=wIcu(w),z=i.z,zb=i.zb;if(!Array.isArray(z)||!Array.isArray(zb)||!zb.length)return null;
  const lt=wkLt(w,thr);if(!lt)return null;
  const o={easy:0,steady:0,hard:0};
  z.forEach((s,k)=>{
    const lo=k?zb[k-1]:0,hi=zb[k]??(zb[zb.length-1]+10),mid=(lo+hi)/2;
    o[mid>=lt*TH.ZN_HARD?'hard':mid>=lt*TH.ZN_STEADY?'steady':'easy']+=(s||0)/60;
  });
  Object.keys(o).forEach(k=>{o[k]=Math.round(o[k]);});
  return o.easy+o.steady+o.hard>0?o:null;
}
const wkHasHr=w=>{const i=wIcu(w);return!!(i.hr||i.z);};
// effort 1 to 5: what you typed, else the watch's (1 to 10 halved), else from the heart rate zones, else from the average heart rate
// against threshold; null when none of these exist. Strength is never read from heart rate (it does not show the load on muscles).
// src: 'you' | 'watch' | 'hr' (wkEffOf)
function wkEffOf(w,thr){
  if(w.rpe)return{e:w.rpe,src:'you'};
  const i=wIcu(w);if(i.rpe)return{e:effOf5(i.rpe),src:'watch'};
  if(IS_STR(w.type))return null;
  const dur=w.durMin||0,m=wkMix(w,thr);
  if(m){
    const sh=m.steady+m.hard,hard=m.hard>=TH.HARD_MIN||sh>=TH.HARD_SUM;
    return{e:m.hard>=TH.BIG_MIN||hard&&dur>=TH.BIG_DUR?5:hard?4:sh>=TH.MOD_SUM?3:2,src:'hr'};
  }
  const lt=i.hr&&wkLt(w,thr);
  if(lt){
    // the whole session sat at its average: steady or harder throughout counts as steady-and-hard minutes
    const p=i.hr/lt;
    if(p>=TH.ZN_HARD)return{e:dur>=TH.BIG_MIN?5:dur>=TH.HARD_MIN?4:3,src:'hr'};
    if(p>=TH.ZN_STEADY)return{e:dur>=TH.BIG_DUR?5:dur>=TH.HARD_SUM?4:dur>=TH.MOD_SUM?3:2,src:'hr'};
    return{e:2,src:'hr'};
  }
  return null;
}
const wkEff=(w,thr)=>{const r=wkEffOf(w,thr);return r?r.e:null;};
const wkHard=(w,thr)=>(wkEff(w,thr)||0)>=4;
// does it count as a training day: not yoga; a walk only when long (TH.WALK_TR_MIN) or with TH.WALK_TR_STEADY steady-or-harder minutes
function stTrains(w,thr){
  if(w.type==='Yoga')return false;
  if(w.type!=='Walk')return true;
  if((w.durMin||0)>=TH.WALK_TR_MIN)return true;
  const m=wkMix(w,thr);return!!(m&&m.steady+m.hard>=TH.WALK_TR_STEADY);
}
const wkLabel=w=>wIcu(w).eb?'E-bike ride':w.type;
const wkEb=w=>!!wIcu(w).eb;
// for sentences: "e-bike ride", "ride", "run" ...; "today's", "yesterday's", "Saturday's"
const wkNoun=w=>wkEb(w)?'e-bike ride':({Run:'run',Cycle:'ride',Swim:'swim',Hike:'hike',Walk:'walk',Yoga:'yoga'})[w.type]||'session';
const wkWhen=dt=>dt===td()?"today's":dt===dAgo(1)?"yesterday's":new Date(dt+'T12:00:00').toLocaleDateString('en-GB',{weekday:'long'})+"'s";
// v127: your own bounce-back days. For each hard session (effort 4+) of the last TH.BB_DAYS with no other hard one in the
// TH.BB_FREE_D days after it: the first morning, 1 to TH.BB_MAX days later, with HRV at least its usual less TH.BB_HRV_SD SD and
// resting heart rate at most its usual plus TH.BB_RHR_SD SD (each against the 28 days before the session, resting heart rate from one
// source; a morning with neither is skipped). Not back by then reads TH.BB_MAX. {4 (hard), 5 (very hard): days or null, n readings}:
// the median of a class once it has TH.BB_MIN_N readings, else of both together, else null (the TH.REC_* defaults); 1 to TH.BB_CAP,
// very hard never shorter than hard. Worked out on every call, never stored.
function bounceDays(thr){
  const t=td(),hard=S().workouts.filter(w=>!w.isEx&&w.date<t&&daysAgo(w.date)<=TH.BB_DAYS).map(w=>({w,e:wkEff(w,thr)||0})).filter(x=>x.e>=4);
  const by={4:[],5:[]},before=(d0,dt)=>{const a=daysAgoBetween(dt,d0);return a>=1&&a<=28;};
  hard.forEach(({w,e})=>{
    if(stAdd(w.date,TH.BB_MAX)>t||hard.some(x=>x.w.date>w.date&&daysAgoBetween(w.date,x.w.date)<=TH.BB_FREE_D))return;
    const hb=bandOf(dt=>wellOn('hrv',dt),w.date),rb={};
    let n=null,seen=false;
    for(let k=1;k<=TH.BB_MAX&&n==null;k++){
      const dt=stAdd(w.date,k),h=wellOn('hrv',dt),r=rhrOn(dt);
      if(r&&!rb[r.src])rb[r.src]=toBand(rhrIn(x=>before(w.date,x),r.src));
      const b=r&&rb[r.src];
      const hOk=h!=null&&hb.m!=null?h>=hb.m-TH.BB_HRV_SD*Math.max(hb.sd,TH.HRV_FLOOR):null;
      const rOk=b&&b.m!=null?r.v<=b.m+TH.BB_RHR_SD*Math.max(b.sd,TH.RHR_FLOOR):null;
      if(hOk==null&&rOk==null)continue;
      seen=true;if(hOk!==false&&rOk!==false)n=k;
    }
    if(n==null&&seen)n=TH.BB_MAX;
    if(n!=null)by[e>=5?5:4].push(n);
  });
  const med=a=>{const x=[...a].sort((p,q)=>p-q),m=Math.floor(x.length/2);return x.length%2?x[m]:(x[m-1]+x[m])/2;};
  const all=[...by[4],...by[5]],pool=all.length>=TH.BB_MIN_N?med(all):null;
  const cl=v=>v==null?null:Math.max(1,Math.min(TH.BB_CAP,Math.round(v)));
  const h4=cl(by[4].length>=TH.BB_MIN_N?med(by[4]):pool),h5=cl(by[5].length>=TH.BB_MIN_N?med(by[5]):pool);
  return{4:h4,5:h5!=null&&h4!=null?Math.max(h4,h5):h5,n:all.length};
}
// when hard training fits again after a workout: the next day, TH.REC_HARD_D days after a hard one, TH.REC_BIG_D after a very hard one,
// or your own bounce-back days once they are known (v127). {hardOn (date), n (days), e (effort), own (true when yours), txt (everyday
// words, relative to today)}. The outline (strategy) uses the same dates.
const WK_NUM=['','one','two','three','four'];
function wkRec(w,thr){
  const e=wkEff(w,thr),own=e>=4?bounceDays(thr)[e>=5?5:4]:null,n=own||(e>=5?TH.REC_BIG_D:e>=4?TH.REC_HARD_D:1),t=td();
  const on=stAdd(w.date,n),from=w.date>=t?stAdd(t,1):t,k=Math.max(0,daysAgoBetween(from,on));
  const day=dt=>dt===stAdd(t,1)?'tomorrow':'from '+new Date(dt+'T12:00:00').toLocaleDateString('en-GB',{weekday:'long'});
  const lead=e>=5?'A very hard session.':e>=4?'A hard session.':e===3?'A moderate session.':e?'Easy on your body.':'';
  const yours=own?` (you usually need ${WK_NUM[own]||own} day${own>1?'s':''})`:'';
  let txt;
  if(on<=t)txt='Recovered from this one: hard training fits again.';
  else if(!k)txt=`Hard training fits again ${day(on)}${yours}.`;
  else{
    const keep=from===t?(k===1?'today':k===2?'today and tomorrow':`the next ${WK_NUM[k]||k} days`):(k===1?'tomorrow':`the next ${WK_NUM[k]||k} days`);
    txt=(k===1&&from!==t?'An easy day tomorrow is fine; ready':`Keep ${keep} easy; ready`)+` for hard training ${day(on)}${yours}.`;
  }
  return{hardOn:on,n,e,own:!!own,txt:(lead?lead+' ':'')+txt};
}

// ── the trace: second by second heart rate, altitude, speed, power, cadence and distance of an imported workout. Fetched only
// when its sheet opens, worked out once, kept in memory only (newest 10; localStorage is close to full), never stored or synced ──
const _wkSt=new Map(),_wkPend=new Map();
const WK_TYPES=['time','heartrate','altitude','velocity_smooth','watts','cadence','distance'];
const wkActUrl=w=>'https://intervals.icu/api/v1/activity/'+encodeURIComponent(String(w.id).slice(4));
const wkStUrl=w=>wkActUrl(w)+'/streams.json?'+WK_TYPES.map(t=>'types='+t).join('&');
// the trace already worked out for this workout, without asking the network (re-renders use this); null when none yet
const wkStGot=w=>w&&_wkSt.get(w.id)||null;
// {ok:true, a (wkAnalyse)} or {ok:false, why: 'manual' | 'nokey' | 'offline' | 'auth' | 'none' | 'error'}. A trace, or the answer
// that there is none, is kept; a failure is not, so the next open tries again. Two opens at once share one request.
function wkStreams(w){
  if(!w||!/^icu-/.test(w.id))return Promise.resolve({ok:false,why:'manual'});
  const c=_wkSt.get(w.id);if(c)return Promise.resolve(c);
  const d=S();if(!d.intervalsKey||!d.intervalsID)return Promise.resolve({ok:false,why:'nokey'});
  if(_wkPend.has(w.id))return _wkPend.get(w.id);
  const p=wkStGet(w,d).finally(()=>_wkPend.delete(w.id));
  _wkPend.set(w.id,p);return p;
}
async function wkStGet(w,d){
  if(navigator.onLine===false)return{ok:false,why:'offline'};
  const H={headers:icuHdr(d.intervalsKey)},det=wkHasHr(w)&&!wIcu(w).z?wkDetFill(w,H):null;
  let r;
  try{r=await fetch(wkStUrl(w),H);}catch(e){if(det)await det;return{ok:false,why:'offline'};}
  if(det)await det;
  if(r.status===401)return{ok:false,why:'auth'};
  let res;
  if([403,404,422].includes(r.status))res={ok:false,why:'none'};
  else if(!r.ok)return{ok:false,why:'error'};
  else{
    try{const a=wkAnalyse(wkStParse(await r.json()));res=a?{ok:true,a}:{ok:false,why:'none'};}
    catch(e){return{ok:false,why:'error'};}
  }
  _wkSt.delete(w.id);_wkSt.set(w.id,res);
  while(_wkSt.size>10)_wkSt.delete(_wkSt.keys().next().value);
  return res;
}
// the activity list left out the zones of this workout: read the single workout once and keep its zone details (never anything else)
async function wkDetFill(w,H){
  try{
    const r=await fetch(wkActUrl(w),H);if(!r.ok)return;
    const x=icuDet(await r.json()),cur=S().workouts.find(o=>o.id===w.id);if(!cur)return;
    const oi=wIcu(cur),add={};ICU_DET.forEach(k=>{if(x[k]!=null&&oi[k]==null)add[k]=x[k];});
    if(Object.keys(add).length)put('workouts',{...cur,sub:{...(cur.sub||{}),icu:{...oi,...add}}});
  }catch(e){}
}
// the answer is a list of {type, data}; an object keyed by type is read too
function wkStParse(j){
  const K={time:'t',heartrate:'hr',altitude:'alt',velocity_smooth:'spd',watts:'pw',cadence:'cad',distance:'dist'},o={};
  const L=Array.isArray(j)?j:j&&typeof j==='object'?Object.entries(j).map(([type,v])=>({type,data:Array.isArray(v)?v:v&&v.data})):[];
  L.forEach(s=>{const k=s&&K[s.type];if(k&&Array.isArray(s.data))o[k]=s.data;});
  return o;
}
// time-weighted mean of v over the samples [j, k); each sample counts for the seconds to the next one (at most 10, so a pause adds nothing)
const wkDt=(t,i)=>i<t.length-1?Math.min(Math.max(t[i+1]-t[i],0),10):1;
function wkMeanIn(t,v,j,k){
  let s=0,n=0;for(let i=j;i<k;i++){const x=v[i];if(x!=null){const dt=wkDt(t,i);s+=x*dt;n+=dt;}}
  return n?s/n:null;
}
// the highest W-second time-weighted mean of v; a stretch needs 80 % of its time recorded. {v, j, k}
function wkBest(t,v,W){
  const n=t.length,P=[0],D=[0];
  for(let i=0;i<n;i++){const dt=wkDt(t,i),x=v[i];P.push(P[i]+(x!=null?x*dt:0));D.push(D[i]+(x!=null?dt:0));}
  let k=0,b=null;
  for(let j=0;j<n;j++){
    if(k<j)k=j;
    while(k<n&&t[k]<t[j]+W)k++;
    const c=D[k]-D[j];if(c<W*0.8)continue;
    const m=(P[k]-P[j])/c;if(!b||m>b.v+1e-9)b={v:m,j,k};
  }
  return b;
}
// the biggest climb on the smoothed altitude: it goes on through dips of up to TH.CLIMB_DIP metres. {g, a, b} (sample indexes)
function wkClimb(A){
  let lo=0,hi=0,best={g:0};
  const rec=(a,b)=>{const g=A[b]-A[a];if(g>best.g)best={g,a,b};};
  for(let i=1;i<A.length;i++){
    const x=A[i];
    if(x>A[hi])hi=i;
    else if(A[hi]-x>TH.CLIMB_DIP||x<=A[lo]){rec(lo,hi);lo=hi=i;}
  }
  rec(lo,hi);
  return best.g>=TH.CLIMB_MIN?best:null;
}
// everything the sheet reads from a trace, worked out once on the full trace; the chart keeps at most TH.WK_PTS points.
// {T (seconds), has{hr, alt, spd, pw, cad, dist}, pts[{t, hr, alt, spd (km/h), pw, cad, km, g (a break before it)}], b5, b20, climb}; null without data
function wkAnalyse(s){
  const n=Math.max(0,...['hr','alt','spd','pw','cad','dist'].map(k=>Array.isArray(s[k])?s[k].length:0));
  if(n<2)return null;
  const t0=Array.isArray(s.t)&&s.t.length===n?s.t:Array.from({length:n},(_,i)=>i),T0=t0[0]||0,t=t0.map(x=>(x||0)-T0);
  const num=(a,lo,hi)=>Array.from({length:n},(_,i)=>{const v=a&&a[i];return typeof v==='number'&&isFinite(v)&&v>=lo&&v<=hi?v:null;});
  const hr=num(s.hr,30,240),spd=num(s.spd,0,40),pw=num(s.pw,0,2500),cad=num(s.cad,0,250),dist=num(s.dist,0,1e6),alt0=num(s.alt,-500,9000);
  const any=a=>a.some(x=>x!=null&&x>0);
  // altitude: gaps filled from the nearest reading, then a moving average over about 30 seconds
  let A=null;const f=alt0.findIndex(x=>x!=null);
  if(f>=0){
    let p=alt0[f];const a=alt0.map(x=>x==null?p:(p=x));
    const dts=[];for(let i=1;i<Math.min(n,201);i++)dts.push(t[i]-t[i-1]);dts.sort((x,y)=>x-y);
    const h=Math.max(1,Math.round(15/Math.max(1,dts[dts.length>>1]||1))),P=[0];a.forEach((x,i)=>P.push(P[i]+x));
    A=a.map((_,i)=>{const lo=Math.max(0,i-h),hi=Math.min(n-1,i+h);return(P[hi+1]-P[lo])/(hi-lo+1);});
    let mn=Infinity,mx=-Infinity;A.forEach(x=>{if(x<mn)mn=x;if(x>mx)mx=x;});if(mx-mn<1)A=null;
  }
  const has={hr:any(hr),alt:!!A,spd:any(spd),pw:any(pw),cad:any(cad),dist:any(dist)};
  if(!has.hr&&!has.alt&&!has.spd&&!has.pw&&!has.cad)return null;
  const T=t[n-1],B=Math.max(1,(T+1)/TH.WK_PTS),bk=[];
  for(let i=0;i<n;i++){const b=Math.floor(t[i]/B);(bk[b]=bk[b]||[]).push(i);}
  const r1=v=>v==null?null:Math.round(v*10)/10,rd=v=>v==null?null:Math.round(v);
  const pts=[];let last=null;
  bk.forEach(ix=>{if(!ix)return;
    const j=ix[0],k=ix[ix.length-1]+1,dl=[...ix].reverse().find(i=>dist[i]!=null);
    const v=has.spd?wkMeanIn(t,spd,j,k):null;
    pts.push({t:Math.round(wkMeanIn(t,t,j,k)),hr:rd(wkMeanIn(t,hr,j,k)),alt:A?r1(wkMeanIn(t,A,j,k)):null,spd:v==null?null:r1(v*3.6),
      pw:has.pw?rd(wkMeanIn(t,pw,j,k)):null,cad:has.cad?rd(wkMeanIn(t,cad,j,k)):null,km:dl!=null?Math.round(dist[dl]/10)/100:null,g:last!=null&&t[j]-t[last]>Math.max(60,3*B)?1:0});
    last=k-1;});
  const best=W=>{const b=has.hr&&wkBest(t,hr,W);if(!b)return null;
    const o={hr:Math.round(b.v),at:t[b.j],to:t[b.k-1]};
    if(has.pw){const p=wkMeanIn(t,pw,b.j,b.k);if(p)o.pw=Math.round(p);}
    if(has.spd){const v=wkMeanIn(t,spd,b.j,b.k);if(v)o.spd=r1(v*3.6);}
    return o;};
  let climb=null;const c=A&&wkClimb(A);
  if(c){
    // heart rate at the bottom and the top: the mean of the first and the last 30 seconds of the climb (one reading is too noisy)
    let j=c.a,k=c.b;while(j<c.b&&t[j+1]-t[c.a]<=30)j++;while(k>c.a&&t[c.b]-t[k-1]<=30)k--;
    const km=dist[c.b]!=null&&dist[c.a]!=null?(dist[c.b]-dist[c.a])/1000:null;
    climb={gain:Math.round(c.g),at:t[c.a],to:t[c.b],hr0:rd(wkMeanIn(t,hr,c.a,j+1)),hr1:rd(wkMeanIn(t,hr,k,c.b+1)),km:km>0?Math.round(km*10)/10:null,grade:km>0.05?r1(c.g/(km*10)):null};
  }
  return{T,has,pts,b5:best(300),b20:best(1200),climb};
}

// ── the workout sheet (v122, tap a workout row): the numbers, the heart rate over the session (speed, power or cadence on a chip),
// time in each heart rate zone, a few sentences worked out here (no AI) and the same recovery advice the outline uses.
// No source names. _wkC holds the open chart (kept across re-renders of the same workout), _wkRes the last failed trace request ──
let _wkC=null,_wkRes=null;
const WK_H=200,WK_COL={easy:'--green',steady:'--amber',hard:'--red'};
// each heart rate zone with its minutes and class: [{k, lo, hi (null for the last), min, cls}]; [] without zones
function wkZones(w,thr){
  const i=wIcu(w),z=i.z,zb=i.zb;if(!Array.isArray(z)||!Array.isArray(zb)||!zb.length)return[];
  const lt=wkLt(w,thr);
  return z.map((s,k)=>{
    const lo=k?zb[k-1]:0,top=zb[k]??(zb[zb.length-1]+10),mid=(lo+top)/2;
    return{k,lo,hi:k===z.length-1?null:top,min:(s||0)/60,cls:!lt?null:mid>=lt*TH.ZN_HARD?'hard':mid>=lt*TH.ZN_STEADY?'steady':'easy'};
  });
}
// the zones merged into easy, steady and hard bands of heart rate: [{lo, hi (null = open), cls}]; from the threshold when there are no zones
function wkBands(w,thr){
  const Z=wkZones(w,thr).filter(z=>z.cls),B=[];
  Z.forEach(z=>{const b=B[B.length-1];if(b&&b.cls===z.cls)b.hi=z.hi;else B.push({lo:z.lo,hi:z.hi,cls:z.cls});});
  if(B.length)return B;
  const lt=wkLt(w,thr);if(!lt)return[];
  const s=Math.round(lt*TH.ZN_STEADY),h=Math.round(lt*TH.ZN_HARD);
  return[{lo:0,hi:s,cls:'easy'},{lo:s,hi:h,cls:'steady'},{lo:h,hi:null,cls:'hard'}];
}
const wkClsAt=(B,v)=>{if(v==null)return null;const b=B.find(b=>v>b.lo&&(b.hi==null||v<=b.hi));return b?b.cls:null;};
// speed as you read it for that sport: km/h on a ride, min per 100 m in the water, else min per km; null when standing still
const wkSpdTxt=(w,v)=>v==null||v<0.5?null:w.type==='Cycle'?v.toFixed(1)+' km/h':w.type==='Swim'?fmtPace(6/v)+' /100 m':fmtPace(60/v)+' /km';
// elapsed time m:ss, or h:mm:ss for a session of an hour or more
const wkTm=(s,long)=>{s=Math.max(0,Math.round(s));const h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=String(s%60).padStart(2,'0');return long||h?`${h}:${String(m).padStart(2,'0')}:${x}`:`${m}:${x}`;};
const wkHm=s=>`${Math.floor(s/3600)}:${String(Math.floor(s%3600/60)).padStart(2,'0')}`;
const wkMin=m=>m>=0.5?fmtDur(Math.round(m)):'0min';
const wkPl=w=>{const n=wkNoun(w);return n==='yoga'?'yoga sessions':n+'s';};
// your last TH.SIM_N sessions of the same kind (e-bike with e-bike) before this one, within TH.SIM_DUR of its length, with a heart rate
function wkSim(w){
  const eb=wkEb(w),d=w.durMin||0;if(!d)return[];
  return stWs().filter(o=>o.id!==w.id&&o.type===w.type&&wkEb(o)===eb&&o.date<w.date&&wIcu(o).hr&&Math.abs((o.durMin||0)-d)<=d*TH.SIM_DUR)
    .sort((a,b)=>a.date<b.date?1:-1).slice(0,TH.SIM_N);
}
// up to six plain sentences: the mix, heart rate drift, the hardest stretches, the biggest climb, heart rate recovery, similar sessions
// drift: only runs and rides with a motor-free effort, long enough for it to mean something (the sheet and the briefing)
const wkDriftOn=w=>{const i=wIcu(w);return i.dec!=null&&!wkEb(w)&&(w.type==='Run'||w.type==='Cycle')&&(w.durMin||0)>=TH.DRIFT_MIN;};
function wkIns(w,a,thr,B,pm){
  const o=[],i=wIcu(w),eb=wkEb(w),dur=w.durMin||0,m=wkMix(w,thr);
  if(m){
    // v123: the minutes sit right above in the zone bars, so the sentence gives the meaning only
    const t=m.easy+m.steady+m.hard;
    o.push(m.easy>=t*TH.MIX_EASY?'Mostly easy.':m.hard>=t*TH.MIX_HARD?'Plenty of hard work.':m.steady+m.hard>=t*TH.MIX_SH?'Mostly steady to hard.':'A mix of easy and steady.');
  }
  if(wkDriftOn(w)){
    const by=w.type==='Run'?'pace':pm?'power':'speed',d=i.dec,r=Math.round(Math.abs(d)*10)/10;
    o.push(d<=0?`Well paced: heart rate held steady against ${by}.`:d<TH.DRIFT_OK?`Well paced: heart rate drifted ${r}% against ${by}.`
      :d<TH.DRIFT_HIGH?`Heart rate drifted ${r}% against ${by}, common on a long or warm day.`:`Heart rate drifted ${r}% against ${by}: heat, too little to drink or eat, or a long day for your fitness.`);
  }
  if(a&&a.b5){
    const b=a.b5;
    o.push(`Hardest 5 minutes: ${b.hr} bpm${wkClsAt(B,b.hr)?' ('+wkClsAt(B,b.hr)+')':''}${pm&&b.pw?`, ${b.pw} W`:''}, ${b.at<60?'from the start':fmtDur(Math.round(b.at/60))+' in'}.`+(a.T>=1800&&a.b20?` Hardest 20: ${a.b20.hr} bpm${pm&&a.b20.pw?`, ${a.b20.pw} W`:''}.`:''));
  }
  if(a&&a.climb){
    const c=a.climb,mn=Math.max(1,Math.round((c.to-c.at)/60));
    o.push(`Biggest climb: ${c.gain} m${c.km?` over ${c.km} km`:''}${c.grade?` (${c.grade}%)`:''} in ${fmtDur(mn)}${c.hr0&&c.hr1?`, heart rate ${c.hr0} to ${c.hr1} bpm`:''}.`);
  }
  if(i.hrr>0){
    const prev=stWs().filter(x=>x.id!==w.id&&x.type===w.type&&wkEb(x)===eb&&x.date<w.date&&wIcu(x).hrr>0).sort((x,y)=>x.date<y.date?1:-1).slice(0,10).map(x=>wIcu(x).hrr);
    let t=`Heart rate fell ${Math.round(i.hrr)} beats in the minute after a hard effort`;
    if(prev.length>=3){const u=Math.round(avg(prev)),d=i.hrr-u;t+=Math.abs(d)<=TH.HRR_NEAR?`, about your usual ${u}.`:d>0?`, more than your usual ${u}: a good sign.`:`, less than your usual ${u}: tiredness, heat or a short cool-down.`;}
    o.push(prev.length>=3?t:t+'.');
  }
  const sim=IS_STR(w.type)?[]:wkSim(w);
  if(i.hr&&sim.length>=2){
    const u=Math.round(avg(sim.map(x=>wIcu(x).hr))),d=Math.round(i.hr)-u;
    let t=`Average heart rate ${Math.round(i.hr)} bpm, ${Math.abs(d)<=TH.HR_NEAR?'about the same as':d>0?`${d} higher than`:`${-d} lower than`} your last ${sim.length} similar ${wkPl(w)}`;
    const sp=x=>x.distKm>0&&x.durMin>0?x.distKm/(x.durMin/60):null,me=sp(w),th=sim.map(sp).filter(v=>v),v=th.length>=2?avg(th):null;
    // v123: the speed only when it carries the point (same speed, different heart rate)
    if(!eb&&w.type!=='Swim'&&me&&v&&d<-TH.HR_NEAR&&me>=v*0.99)t+=', at the same speed or faster: fitness is building.';
    else if(!eb&&w.type!=='Swim'&&me&&v&&d>TH.HR_NEAR&&me<=v*1.01)t+=', at the same speed or slower: tiredness or heat can do this.';
    else t+='.';
    o.push(t);
  }
  return o.slice(0,6);
}
// the line under the summary when there is no trace to draw; null while it loads
function wkNote(w,g){
  if(!/^icu-/.test(w.id))return IS_STR(w.type)?'':'The heart rate detail shows when your watch records the workout.';
  if(g&&!g.ok)return'The heart rate trace is not available for this workout.';
  const r=_wkRes&&_wkRes.id===w.id?_wkRes.r:null;
  if(r)return r.why==='offline'?'The heart rate trace needs a connection. Open this again when you are online.':r.why==='auth'?'The heart rate trace could not be read: check the connection key in Settings.':r.why==='none'?'The heart rate trace is not available for this workout.':'The heart rate trace could not be loaded just now. Open this again to try again.';
  const d=S();if(!d.intervalsKey||!d.intervalsID)return'The heart rate trace shows on the phone where the connection is set up in Settings.';
  return _wkPend.has(w.id)?null:'The heart rate trace is not available for this workout.';
}
// {title, html} for the detail sheet (openDetail renders html as it is)
function wkSpec(id){
  const w=S().workouts.find(x=>x.id===id);
  if(!w){_wkC=null;return{title:'Workout',html:'<div class="dt-miss">This workout is no longer in your log.</div>'};}
  const i=wIcu(w),thr=stThr(),eb=wkEb(w),pm=w.type==='Cycle'&&!eb&&!!i.dw&&!!i.pw,B=wkBands(w,thr),g=wkStGot(w),a=g&&g.ok?g.a:null;
  const wd=new Date(w.date+'T12:00:00').toLocaleDateString('en-GB',{weekday:'short'});
  const sum=[wd+' '+fmtD(w.date)+(i.t?', '+i.t:''),!(w.sets&&w.sets.length)&&w.durMin?fmtDur(w.durMin):'',w.distKm?fmtDist(w):'',i.elev>0?Math.round(i.elev)+' m climb':''].filter(Boolean).join(' · ');
  const C=[],cell=(l,v,s)=>C.push(`<div><span>${l}</span><b>${esc(String(v))}</b>${s?`<small>${esc(s)}</small>`:''}</div>`);
  if(i.hr)cell('Average heart rate',Math.round(i.hr),'bpm');
  if(i.hrMax)cell('Max heart rate',Math.round(i.hrMax),'bpm');
  if(i.kcal)cell('Energy',Math.round(i.kcal),'kcal');
  const vt=wkSpdTxt(w,i.spd||(w.distKm>0&&w.durMin>0&&!(w.sets&&w.sets.length)?w.distKm/(w.durMin/60):null));
  if(vt){const[v,...u]=vt.split(' ');cell(w.type==='Cycle'?'Average speed':'Average pace',v,u.join(' '));}
  if(pm)cell('Average power',Math.round(i.pw),'W');
  if(i.cad)cell('Cadence',Math.round(i.cad),w.type==='Cycle'?'rpm':'per min');
  const ef=wkEffOf(w,thr);if(ef)cell('Effort',ef.e+' of 5',ef.src==='hr'?'from heart rate':ef.src==='watch'?'from your watch':'');
  if(painOf(w)!=null)cell('Pain',painOf(w)+' of 10','');
  if(w.type==='Swim'&&w.sub&&w.sub.pool)cell('Where',w.sub.pool==='open'?'Open water':'Pool','');
  if(w.type==='Swim'&&w.sub&&w.sub.stroke)cell('Stroke',w.sub.stroke,'');
  let h=`<div class="dt-sub">${esc(sum)}</div>`+(C.length?`<div class="wk-grid">${C.join('')}</div>`:'');
  if(a){
    if(!_wkC||_wkC.id!==id)_wkC={id,m:'hr',hov:null};
    Object.assign(_wkC,{a,w,B,thr,pm});
    h+=`<div class="dt-sec">${a.has.hr?'Heart rate during the session':'During the session'}</div><div id="wkTr" class="wk-tr"></div>`;
  }else{
    _wkC=null;const n=wkNote(w,g);
    h+=n==null?'<div class="wk-load">Loading the heart rate trace…</div>':n?`<div class="dt-note">${n}</div>`:'';
  }
  const Z=wkZones(w,thr),zt=Z.reduce((s,z)=>s+z.min,0);
  if(zt>0){
    const m=wkMix(w,thr);
    h+='<div class="dt-sec">Time in heart rate zones</div>';
    if(m)h+=`<div class="wk-mix"><span class="easy">${wkMin(m.easy)} easy</span><span class="steady">${wkMin(m.steady)} steady</span><span class="hard">${wkMin(m.hard)} hard</span></div>`;
    h+='<div class="wk-zns">'+Z.map((z,k)=>{const r=k===0?`up to ${z.hi}`:z.hi==null?`over ${z.lo}`:`${z.lo+1}–${z.hi}`;
      return`<div class="wk-zn"><span class="wk-zl">Zone ${k+1}<small>${r} bpm</small></span><span class="wk-zb"><i class="${z.cls||''}" style="width:${Math.round(z.min/zt*100)}%"></i></span><b>${wkMin(z.min)}</b></div>`;}).join('')+'</div>';
  }
  const ins=wkIns(w,a,thr,B,pm);
  if(ins.length)h+=`<div class="dt-sec">What it shows</div><ul class="wk-in">${ins.map(t=>`<li>${esc(t)}</li>`).join('')}</ul>`;
  if(daysAgo(w.date)<Math.max(TH.REC_BIG_D,TH.BB_CAP)&&stTrains(w,thr)){const r=wkRec(w,thr);if(r.e&&(daysAgo(w.date)<=2||r.hardOn>td()))h+=`<div class="dt-sec">Recovery</div><div class="dt-eff">${esc(r.txt)}</div>`;}
  const ph=(S().planHist||{})[w.date];
  if(ph&&ph.fam)h+=`<div class="dt-sec">Planned against done</div><div class="wk-pv">${stRowX({date:w.date,done:1,snap:ph,match:stMatch(w.date,thr),sheet:1},null)}</div>`;
  if(w.sets&&w.sets.length)h+=`<div class="dt-sec">Sets</div><div class="dt-eff">${esc(setsText(w))}</div>`;
  if(w.notes)h+=`<div class="dt-sec">Note</div><div class="dt-eff">${esc(w.notes)}</div>`;
  h+=`<button type="button" class="btn-out dt-link" onclick="closeDetail();editWorkout('${esc(w.id)}')">Edit in Log</button>`;
  return{title:wkLabel(w),html:h};
}
// the sheet opened (not a re-render): ask for the trace once when it is not here yet; the answer re-renders the sheet if it is still open
function wkOpen(id){
  if(_wkC&&_wkC.id!==id)_wkC=null;
  _wkRes=null;
  const d=S(),w=d.workouts.find(x=>x.id===id);
  if(!w||!/^icu-/.test(id)||!d.intervalsKey||!d.intervalsID||_wkSt.has(id))return;
  wkStreams(w).then(r=>{if(_dtKey!=='wk:'+id)return;if(!r.ok)_wkRes={id,r};refreshDetail();});
}
// what the chart can show: heart rate, speed or pace, power (a real meter only), cadence; height when there is nothing else
function wkMets(C){
  const a=C.a,ms=[['hr','Heart rate'],['spd',C.w.type==='Cycle'?'Speed':'Pace'],['pw','Power'],['cad','Cadence']].filter(([k])=>a.has[k]&&(k!=='pw'||C.pm));
  if(!ms.length&&a.has.alt)ms.push(['alt','Height']);
  return ms;
}
function wkMount(){
  const C=_wkC,host=$('wkTr');if(!C||!host)return;
  const ms=C.ms=wkMets(C);if(!ms.some(([k])=>k===C.m))C.m=ms.length?ms[0][0]:'hr';
  host.innerHTML=(ms.length>1?`<div class="wk-chs" role="group" aria-label="Show on the chart">${ms.map(([k,l])=>`<button type="button" class="wk-ch" data-m="${k}" aria-pressed="${k===C.m}">${l}</button>`).join('')}</div>`:'')+
    `<div class="vc-ro wk-ro"></div><canvas class="vc-cv wk-cv" tabindex="0" role="img" style="width:100%;height:${WK_H}px;display:block"></canvas>`;
  host.querySelectorAll('.wk-ch').forEach(b=>b.onclick=()=>{C.m=b.dataset.m;host.querySelectorAll('.wk-ch').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));wkDraw();});
  C.cv=host.querySelector('canvas');C.ro=host.querySelector('.wk-ro');
  wkBind(C);wkDraw();
}
// nearest chart point to a time (binary search on t)
function wkIdx(P,t){let lo=0,hi=P.length-1;while(hi-lo>1){const m=(lo+hi)>>1;if(P[m].t<t)lo=m;else hi=m;}return Math.abs(P[hi].t-t)<Math.abs(P[lo].t-t)?hi:lo;}
// x on the canvas of a time, and the time under a pointer
const wkPx=(C,t)=>C.L+t/Math.max(1,C.a.T)*(C.cv.clientWidth-C.L-C.R);
const wkX=(C,cx)=>{const r=C.cv.getBoundingClientRect();return(cx-r.left-C.L)/Math.max(1,r.width-C.L-C.R)*C.a.T;};
// tap or drag to read a moment; a second tap on the same spot clears it (a mouse clears by leaving); ← → step, Esc clears
function wkBind(C){
  const c=C.cv;let dn=null;
  const at=e=>wkIdx(C.a.pts,wkX(C,e.clientX));
  c.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button)return;dn={x:e.clientX,i:C.hov,m:0,mouse:e.pointerType==='mouse'};try{c.setPointerCapture(e.pointerId);}catch(_){}C.hov=at(e);wkDraw();});
  c.addEventListener('pointermove',e=>{if(dn){if(Math.abs(e.clientX-dn.x)>7)dn.m=1;C.hov=at(e);wkDraw();}else if(e.pointerType==='mouse'){C.hov=at(e);wkDraw();}});
  c.addEventListener('pointerup',e=>{if(!dn)return;const d=dn;dn=null;
    if(!d.mouse&&!d.m&&d.i!=null&&C.a.pts[d.i]&&Math.abs(wkPx(C,C.a.pts[d.i].t)-(e.clientX-c.getBoundingClientRect().left))<=12){C.hov=null;wkDraw();}});
  c.addEventListener('pointercancel',()=>{dn=null;});
  c.addEventListener('pointerleave',e=>{if(e.pointerType==='mouse'&&!dn){C.hov=null;wkDraw();}});
  c.addEventListener('keydown',e=>{
    const n=C.a.pts.length,s=Math.max(1,Math.round(n/60));
    if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();const f=e.key==='ArrowRight';C.hov=C.hov==null?(f?0:n-1):Math.max(0,Math.min(n-1,C.hov+(f?s:-s)));wkDraw();}
    else if(e.key==='Escape'&&C.hov!=null){e.preventDefault();e.stopPropagation();C.hov=null;wkDraw();}
  });
}
// how a value reads for a metric
function wkFmt(C,m,v){
  if(v==null)return null;
  if(m==='hr')return Math.round(v)+' bpm';
  if(m==='spd')return wkSpdTxt(C.w,v);
  if(m==='pw')return Math.round(v)+' W';
  if(m==='cad')return Math.round(v)+(C.w.type==='Cycle'?' rpm':' per min');
  return Math.round(v)+' m';
}
// the line above the chart: the whole session when nothing is picked, else the moment under your finger
function wkRo(C){
  const P=C.a.pts,m=C.m,nm=(C.ms.find(([k])=>k===m)||[,''])[1],long=C.a.T>=3600;let lab,cells=[];
  if(C.hov==null||!P[C.hov]){
    const vs=P.map(p=>p[m]).filter(v=>v!=null&&(m!=='spd'||v>=0.5)),i=wIcu(C.w);
    if(vs.length){let mx=vs[0];vs.forEach(v=>{if(v>mx)mx=v;});
      // the recorded averages first, so the line above the chart says what the numbers above it say
      const rec={hr:i.hr,spd:i.spd,pw:i.pw,cad:i.cad}[m],av=rec>0?rec:avg(vs);if(m==='hr'&&i.hrMax)mx=i.hrMax;
      if(m==='alt'){let mn=vs[0];vs.forEach(v=>{if(v<mn)mn=v;});cells=[['Lowest',wkFmt(C,m,mn)],['Highest',wkFmt(C,m,mx)]];}
      else cells=[['Average',wkFmt(C,m,av)],[m==='spd'?'Fastest':'Max',wkFmt(C,m,mx)]];}
    lab=(nm||'Whole session')+', whole session';
  }else{
    const p=P[C.hov];lab=wkTm(p.t,long);
    if(p.hr!=null)cells.push(['Heart rate',wkFmt(C,'hr',p.hr)+(C.B.length&&wkClsAt(C.B,p.hr)?' · '+wkClsAt(C.B,p.hr):'')]);
    if(p.spd!=null&&C.ms.some(([k])=>k==='spd'))cells.push([C.w.type==='Cycle'?'Speed':'Pace',wkFmt(C,'spd',p.spd)||'stopped']);
    if(p.pw!=null&&C.pm)cells.push(['Power',wkFmt(C,'pw',p.pw)]);
    if(p.cad!=null&&m==='cad')cells.push(['Cadence',wkFmt(C,'cad',p.cad)]);
    if(p.alt!=null)cells.push(['Height',wkFmt(C,'alt',p.alt)]);
    if(p.km!=null)cells.push(['Distance',p.km.toFixed(p.km<10?2:1)+' km']);
  }
  C.ro.innerHTML=`<div class="vc-date">${esc(lab)}</div><div class="vc-vals">${cells.filter(c=>c[1]).map(([n,x])=>`<div class="vc-v"><span class="vc-n">${n}</span><span class="vc-x">${esc(x)}</span></div>`).join('')}</div>`;
  C.cv.setAttribute('aria-label',`${nm} over the session${cells.length?': '+cells.filter(c=>c[1]).map(c=>c[0].toLowerCase()+' '+c[1]).join(', '):''}`);
}
function wkDraw(){
  const C=_wkC;if(!C||!C.cv||!C.cv.isConnected)return;
  const c=C.cv,P=C.a.pts,m=C.m,H=WK_H,W=c.parentElement.clientWidth||300,r=window.devicePixelRatio||1;
  c.width=W*r;c.height=H*r;const ctx=c.getContext('2d');ctx.scale(r,r);
  const L=C.L=34,R=C.R=10,T=10,Bm=22,TT=Math.max(1,C.a.T),X=t=>L+t/TT*(W-L-R);
  const vs=P.map(p=>p[m]).filter(v=>v!=null);
  let mn=0,mx=1;
  if(vs.length){
    let lo=vs[0],hi=vs[0];vs.forEach(v=>{if(v<lo)lo=v;if(v>hi)hi=v;});
    if(m==='hr'||m==='alt'){
      const rg=hi-lo||10;
      // a band edge close to the data joins the range, so the zone the line sits in is shown
      if(m==='hr')C.B.forEach(b=>[b.lo,b.hi].forEach(e=>{if(e&&e>=lo-rg*0.35&&e<=hi+rg*0.35){lo=Math.min(lo,e);hi=Math.max(hi,e);}}));
      const pad=(hi-lo)*0.08||5;mn=lo-pad;mx=hi+pad;
    }else{const s=[...vs].sort((x,y)=>x-y);mx=(s[Math.floor((s.length-1)*0.98)]||hi)*1.08||1;}
  }
  const Y=v=>T+(mx-v)*(H-T-Bm)/(mx-mn||1);
  const yf=m==='spd'&&C.w.type!=='Cycle'?(v=>v<=0?'':fmtPace((C.w.type==='Swim'?6:60)/v)):(v=>String(Math.round(v)));
  ctx.font='500 10px Inter,sans-serif';ctx.textBaseline='middle';
  const rg=mx-mn||1,mag=Math.pow(10,Math.floor(Math.log10(rg/4))),cand=[1,2,5,10].map(k=>k*mag),stp=cand.filter(k=>rg/k>=3).pop()||cand[0];
  for(let v=Math.ceil(mn/stp-1e-9)*stp;v<=mx+1e-9;v+=stp){
    const y=Y(v);ctx.strokeStyle=cssv('--bdr');ctx.globalAlpha=.6;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(L,y);ctx.lineTo(W-R,y);ctx.stroke();ctx.globalAlpha=1;
    ctx.fillStyle=cssv('--t3');ctx.textAlign='right';ctx.fillText(yf(Math.round(v/stp)*stp),L-6,y);
  }
  // time ticks: the smallest round step that keeps labels about 52px apart
  ctx.textBaseline='alphabetic';ctx.textAlign='center';
  const mxT=Math.max(2,Math.floor((W-L-R)/52)),sx=[60,120,300,600,900,1200,1800,3600,7200,10800].find(s=>TT/s<=mxT)||10800;
  for(let s=sx;s<TT;s+=sx){const x=X(s);if(x>W-R-8)break;ctx.strokeStyle=cssv('--bdr');ctx.globalAlpha=.35;ctx.beginPath();ctx.moveTo(x,T);ctx.lineTo(x,H-Bm);ctx.stroke();ctx.globalAlpha=1;ctx.fillStyle=cssv('--t3');ctx.fillText(wkHm(s),x,H-6);}
  ctx.save();ctx.beginPath();ctx.rect(L,0,W-L-R,H-Bm+2);ctx.clip();
  const lab=[];
  if(m==='hr')C.B.forEach(b=>{
    const top=Y(Math.min(b.hi==null?mx:b.hi,mx)),bot=Y(Math.max(b.lo,mn));if(bot-top<1)return;
    ctx.globalAlpha=.1;ctx.fillStyle=cssv(WK_COL[b.cls]);ctx.fillRect(L,top,W-L-R,bot-top);ctx.globalAlpha=1;
    if(bot-top>=13)lab.push([cap(b.cls),top]);
  });
  // the height of the route as a faint area along the bottom third
  if(C.a.has.alt&&m!=='alt'){
    const al=P.filter(p=>p.alt!=null);
    if(al.length>1){let lo=al[0].alt,hi=lo;al.forEach(p=>{if(p.alt<lo)lo=p.alt;if(p.alt>hi)hi=p.alt;});
      const hg=(H-T-Bm)*0.35,Ya=v=>H-Bm-(v-lo)/((hi-lo)||1)*hg;
      ctx.globalAlpha=.16;ctx.fillStyle=cssv('--t3');ctx.beginPath();ctx.moveTo(X(al[0].t),H-Bm);al.forEach(p=>ctx.lineTo(X(p.t),Ya(p.alt)));ctx.lineTo(X(al[al.length-1].t),H-Bm);ctx.closePath();ctx.fill();ctx.globalAlpha=1;}
  }
  ctx.strokeStyle=cssv('--text');ctx.lineWidth=1.8;ctx.lineJoin='round';ctx.lineCap='round';ctx.beginPath();
  let on=false;P.forEach(p=>{const v=p[m];if(v==null||p.g)on=false;if(v==null)return;const x=X(p.t),y=Y(v);if(on)ctx.lineTo(x,y);else ctx.moveTo(x,y);on=true;});ctx.stroke();
  ctx.font='500 9px Inter,sans-serif';ctx.textAlign='right';ctx.fillStyle=cssv('--t3');lab.forEach(([t,top])=>ctx.fillText(t,W-R-4,top+11));
  if(C.hov!=null&&P[C.hov]){
    const p=P[C.hov],x=X(p.t);ctx.strokeStyle=cssv('--t2');ctx.lineWidth=1;ctx.setLineDash([3,3]);ctx.beginPath();ctx.moveTo(x,T);ctx.lineTo(x,H-Bm);ctx.stroke();ctx.setLineDash([]);
    if(p[m]!=null){ctx.fillStyle=cssv('--text');ctx.beginPath();ctx.arc(x,Y(p[m]),4.5,0,7);ctx.fill();ctx.strokeStyle=cssv('--sur');ctx.lineWidth=2;ctx.stroke();}
  }
  ctx.restore();
  wkRo(C);
}
window.addEventListener('resize',()=>wkDraw());
