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
// ── v130 ONE COPY OF EACH WORKOUT ────────────────────────────────────────────
// The same session can arrive twice (the watch and the band, both through the import). Two imported workouts on one date, each with a
// start time and a duration, overlapping by TH.DUP_OVERLAP of the shorter one, are one session, whatever sport each names. In a cluster
// the most detailed copy counts (wkDetScore, then the longer, then the id); the others are hidden on the fly, never deleted, unless the
// copy carries sub.both (Show both). Hand-logged doubles keep the "logged twice" strip in Log (findDups). wkOn() in core.js reads this.
const WK_DET={gps:4,dw:2,z:1,cad:1,dist:1,elev:1,hr:1};
const wkDetScore=w=>{const i=wIcu(w);return(i.gps?WK_DET.gps:0)+(i.dw?WK_DET.dw:0)+(Array.isArray(i.z)&&i.z.some(x=>x>0)?WK_DET.z:0)+(i.cad>0?WK_DET.cad:0)+(w.distKm>0?WK_DET.dist:0)+(i.elev>0?WK_DET.elev:0)+(i.hr>0?WK_DET.hr:0);};
const wkBoth=w=>!!(w&&w.sub&&w.sub.both);
const wkT0=w=>{const m=/^(\d{1,2}):(\d{2})/.exec(wIcu(w).t||'');return m?+m[1]*60+ +m[2]:null;};
const wkKeepCmp=(x,y)=>wkDetScore(y)-wkDetScore(x)||(y.durMin||0)-(x.durMin||0)||(x.id<y.id?-1:x.id>y.id?1:0);
// worked out again only when the list, a time stamp, a duration or a Show both changes (put() stamps ts)
let _wkDup=null;
function wkDupScan(){
  const a=S().workouts||[];let ts=0,du=0,b=0;
  for(const w of a){ts+=w.ts||0;du+=w.durMin||0;if(wkBoth(w))b++;}
  const key=a.length+'|'+ts+'|'+du+'|'+b;
  if(_wkDup&&_wkDup.a===a&&_wkDup.key===key)return _wkDup;
  const by={},hid=new Set(),cl=new Map();
  a.forEach(w=>{if(w.isEx||!/^icu-/.test(String(w.id))||!(w.durMin>0))return;const st=wkT0(w);if(st==null)return;(by[w.date]=by[w.date]||[]).push({w,st,en:st+w.durMin});});
  Object.values(by).forEach(L=>{
    if(L.length<2)return;
    const p=L.map((_,i)=>i),f=i=>p[i]===i?i:(p[i]=f(p[i]));
    for(let i=0;i<L.length;i++)for(let j=i+1;j<L.length;j++){
      const x=L[i],y=L[j],o=Math.min(x.en,y.en)-Math.max(x.st,y.st);
      if(o>0&&o>=TH.DUP_OVERLAP*Math.min(x.w.durMin,y.w.durMin))p[f(j)]=f(i);
    }
    const g={};L.forEach((x,i)=>(g[f(i)]=g[f(i)]||[]).push(x.w));
    Object.values(g).forEach(ws=>{
      if(ws.length<2)return;
      ws.sort(wkKeepCmp);
      const c={keep:ws[0].id,ids:ws.map(w=>w.id),hid:ws.slice(1).filter(w=>!wkBoth(w)).map(w=>w.id)};
      c.hid.forEach(id=>hid.add(id));c.ids.forEach(id=>cl.set(id,c));
    });
  });
  return _wkDup={a,key,hid,cl};
}
const wkHid=()=>wkDupScan().hid;
// the cluster a workout sits in, null without a copy: {keep id, ids (best first), hid (the hidden ones)}
const wkDupOf=id=>wkDupScan().cl.get(id)||null;
// typed values on a hidden copy fill empty fields of the copy that counts: effort, sets, pain, pool and stroke (never the note).
// Writes only when something changes, so it runs after every pull and at start.
function dupFill(){
  const d=S(),seen=new Set();let n=0;
  wkDupScan().cl.forEach(c=>{
    if(seen.has(c)||!c.hid.length)return;seen.add(c);
    const k=d.workouts.find(w=>w.id===c.keep);if(!k)return;
    const rec={...k,sub:{...(k.sub||{})}};let ch=false;
    c.hid.forEach(id=>{
      const h=d.workouts.find(w=>w.id===id);if(!h)return;const hs=h.sub||{};
      if(rec.rpe==null&&h.rpe!=null){rec.rpe=h.rpe;ch=true;}
      if(!(rec.sets&&rec.sets.length)&&h.sets&&h.sets.length){rec.sets=JSON.parse(JSON.stringify(h.sets));ch=true;}
      ['pain','pool','stroke'].forEach(f=>{if(rec.sub[f]==null&&hs[f]!=null){rec.sub[f]=hs[f];ch=true;}});
    });
    if(ch){put('workouts',rec);n++;}
  });
  return n;
}
// Show both (on) or Hide the copy (off): the choice sits on every copy of the session (sub.both, synced inside sub)
function wkBothSet(id,on){
  const c=wkDupOf(id);if(!c)return;
  const was=c.ids.map(i=>S().workouts.find(x=>x.id===i)).filter(Boolean).map(w=>[w.id,wkBoth(w)]);
  const set=(i,v)=>{const w=S().workouts.find(x=>x.id===i);if(!w||wkBoth(w)===v)return;const sub={...(w.sub||{})};if(v)sub.both=1;else delete sub.both;put('workouts',{...w,sub});};
  const after=()=>{refreshAll();if(_dtKey==='wk:'+id&&wkHid().has(id))openDetail('wk:'+c.keep);else refreshDetail();};
  c.ids.forEach(i=>set(i,on));after();
  showToast(on?'Both copies count':'Copy hidden',{label:'Undo',fn:()=>{was.forEach(([i,v])=>set(i,v));after();}});
}
// v127: your own bounce-back days. For each hard session (effort 4+) of the last TH.BB_DAYS with no other hard one in the
// TH.BB_FREE_D days after it: the first morning, 1 to TH.BB_MAX days later, with HRV at least its usual less TH.BB_HRV_SD SD and
// resting heart rate at most its usual plus TH.BB_RHR_SD SD (each against the 28 days before the session, resting heart rate from one
// source; a morning with neither is skipped). Not back by then reads TH.BB_MAX. {4 (hard), 5 (very hard): days or null, n readings}:
// the median of a class once it has TH.BB_MIN_N readings, else of both together, else null (the TH.REC_* defaults); 1 to TH.BB_CAP,
// very hard never shorter than hard. Worked out on every call, never stored.
function bounceDays(thr){
  const t=td(),hard=wkOn().filter(w=>!w.isEx&&w.date<t&&daysAgo(w.date)<=TH.BB_DAYS).map(w=>({w,e:wkEff(w,thr)||0})).filter(x=>x.e>=4);
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
const WK_TYPES=['time','heartrate','altitude','velocity_smooth','watts','cadence','distance','latlng'];
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
// the answer is a list of {type, data}; an object keyed by type is read too. The route (latlng) becomes ll, kept in memory only
function wkStParse(j){
  const K={time:'t',heartrate:'hr',altitude:'alt',velocity_smooth:'spd',watts:'pw',cadence:'cad',distance:'dist'},o={};
  const L=Array.isArray(j)?j:j&&typeof j==='object'?Object.entries(j).map(([type,v])=>({type,data:Array.isArray(v)?v:v&&v.data,data2:v&&!Array.isArray(v)?v.data2:null})):[];
  L.forEach(s=>{
    if(s&&s.type==='latlng'){const ll=wkLL(s.data,s.data2);if(ll&&ll.some(Boolean))o.ll=ll;return;}
    const k=s&&K[s.type];if(k&&Array.isArray(s.data))o[k]=s.data;
  });
  return o;
}
// v130: a route as [[lat, lng] | null]: data holds the latitudes and data2 the longitudes, or data holds [lat, lng] pairs.
// A point off the globe or at 0,0 (no fix) is null
function wkLL(a,b){
  if(!Array.isArray(a))return null;
  const ok=(la,lo)=>typeof la==='number'&&typeof lo==='number'&&isFinite(la)&&isFinite(lo)&&Math.abs(la)<=90&&Math.abs(lo)<=180&&(la!==0||lo!==0)?[la,lo]:null;
  return a.map((x,i)=>Array.isArray(x)?ok(x[0],x[1]):Array.isArray(b)?ok(x,b[i]):null);
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
// {T (seconds), has{hr, alt, spd, pw, cad, dist, gps}, pts[{t, hr, alt, spd (km/h), pw, cad, km, g (a break before it), la, lo (with a route)}], b5, b20, climb}; null without data
function wkAnalyse(s){
  const n=Math.max(0,...['hr','alt','spd','pw','cad','dist','ll'].map(k=>Array.isArray(s[k])?s[k].length:0));
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
  const ll=Array.isArray(s.ll)?s.ll:null,nll=ll?ll.reduce((c,q)=>c+(Array.isArray(q)?1:0),0):0;
  const has={hr:any(hr),alt:!!A,spd:any(spd),pw:any(pw),cad:any(cad),dist:any(dist),gps:false};
  if(!has.hr&&!has.alt&&!has.spd&&!has.pw&&!has.cad&&nll<TH.RT_MIN_PTS)return null;
  const T=t[n-1],B=Math.max(1,(T+1)/TH.WK_PTS),bk=[];
  for(let i=0;i<n;i++){const b=Math.floor(t[i]/B);(bk[b]=bk[b]||[]).push(i);}
  const r1=v=>v==null?null:Math.round(v*10)/10,rd=v=>v==null?null:Math.round(v);
  const pts=[];let last=null;
  bk.forEach(ix=>{if(!ix)return;
    const j=ix[0],k=ix[ix.length-1]+1,dl=[...ix].reverse().find(i=>dist[i]!=null);
    const v=has.spd?wkMeanIn(t,spd,j,k):null;
    const o={t:Math.round(wkMeanIn(t,t,j,k)),hr:rd(wkMeanIn(t,hr,j,k)),alt:A?r1(wkMeanIn(t,A,j,k)):null,spd:v==null?null:r1(v*3.6),
      pw:has.pw?rd(wkMeanIn(t,pw,j,k)):null,cad:has.cad?rd(wkMeanIn(t,cad,j,k)):null,km:dl!=null?Math.round(dist[dl]/10)/100:null,g:last!=null&&t[j]-t[last]>Math.max(60,3*B)?1:0};
    // the route: the mean position of the bucket, 5 decimals (about a metre)
    if(ll){let a=0,b=0,c=0;ix.forEach(i=>{const q=ll[i];if(Array.isArray(q)){a+=q[0];b+=q[1];c++;}});
      o.la=c?Math.round(a/c*1e5)/1e5:null;o.lo=c?Math.round(b/c*1e5)/1e5:null;}
    pts.push(o);last=k-1;});
  has.gps=!!ll&&pts.filter(p=>p.la!=null).length>=TH.RT_MIN_PTS;
  if(!has.gps&&!has.hr&&!has.alt&&!has.spd&&!has.pw&&!has.cad)return null;
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
// v130: the line under the summary when the session was recorded twice. A copy hidden: Show both; both shown: Hide the copy
function wkDupLine(w){
  const c=wkDupOf(w.id);if(!c)return'';
  const[t,b,on]=c.hid.length?['Also recorded by another device. Hidden so it counts once.','Show both',1]:wkBoth(w)?['Recorded twice; both count.','Hide the copy',0]:[];
  return t?`<div class="wk-dup2">${UI.copy}<p>${t}</p><button type="button" onclick="wkBothSet('${esc(w.id)}',${on})">${b}</button></div>`:'';
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
  let h=`<div class="dt-sub">${esc(sum)}</div>`+wkDupLine(w)+(C.length?`<div class="wk-grid">${C.join('')}</div>`:'');
  if(a){
    if(!_wkC||_wkC.id!==id)_wkC={id,m:'hr',hov:null};
    Object.assign(_wkC,{a,w,B,thr,pm});
    const ms=_wkC.ms=wkMets(_wkC);if(!ms.some(([k])=>k===_wkC.m))_wkC.m=ms.length?ms[0][0]:'hr';
    if(a.has.gps)h+=wkRtSec(_wkC);
    if(ms.length)h+=`<div class="dt-sec">${a.has.hr?'Heart rate during the session':'During the session'}</div><div class="dt-card"><div id="wkTr" class="wk-tr"></div></div>`;
  }else{
    _wkC=null;const n=wkNote(w,g);
    h+=n==null?'<div class="wk-load">Loading the heart rate trace…</div>':n?`<div class="dt-note">${n}</div>`:'';
  }
  const Z=wkZones(w,thr),zt=Z.reduce((s,z)=>s+z.min,0);
  if(zt>0){
    const m=wkMix(w,thr);
    h+='<div class="dt-sec">Time in heart rate zones</div><div class="dt-card">';
    if(m)h+=`<div class="wk-mix"><span class="easy">${wkMin(m.easy)} easy</span><span class="steady">${wkMin(m.steady)} steady</span><span class="hard">${wkMin(m.hard)} hard</span></div>`;
    h+='<div class="wk-zns">'+Z.map((z,k)=>{const r=k===0?`up to ${z.hi}`:z.hi==null?`over ${z.lo}`:`${z.lo+1}–${z.hi}`;
      return`<div class="wk-zn"><span class="wk-zl">Zone ${k+1}<small>${r} bpm</small></span><span class="wk-zb"><i class="${z.cls||''}" style="width:${Math.round(z.min/zt*100)}%"></i></span><b>${wkMin(z.min)}</b></div>`;}).join('')+'</div></div>';
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
  if(_wkMap&&_wkMap.id!==id)wkMapOff();
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
  const C=_wkC;if(!C)return;
  const host=$('wkTr'),ms=C.ms;C.cv=C.ro=null;
  if(!host){wkDraw();return;}
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
  const C=_wkC;if(!C)return;
  wkRtDraw(C);
  if(!C.cv||!C.cv.isConnected)return;
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

// ── v130: the route of a GPS workout, drawn from the trace (in memory only, never stored or sent anywhere). Coloured like the
// chip in view when it can be judged, start and finish marks, a mark every 1, 2, 5 or 10 km, and a dot linked to the trace ──
const RT_W=292,RT_H=196,RT_PAD=18;
// distance in km between two {la, lo}
function wkHav(a,b){
  const r=Math.PI/180,x=Math.sin((b.la-a.la)*r/2),y=Math.sin((b.lo-a.lo)*r/2);
  return 2*6371*Math.asin(Math.min(1,Math.sqrt(x*x+Math.cos(a.la*r)*Math.cos(b.la*r)*y*y)));
}
// the route projected onto the drawing (flat, east-west scaled by the latitude, fitted with a margin):
// {a, Q[{i (index in pts), la, lo, x, y, km}], tot (km), st (km between marks), M[{j, d}], cx, cy}
function wkRtGeo(a){
  const P=a.pts,Q=[];P.forEach((p,i)=>{if(p.la!=null)Q.push({i,la:p.la,lo:p.lo});});
  const k=Math.cos(avg(Q.map(q=>q.la))*Math.PI/180);
  let x0=Infinity,x1=-Infinity,y0=Infinity,y1=-Infinity;
  Q.forEach(q=>{const x=q.lo*k,y=-q.la;q.x=x;q.y=y;if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;});
  const dx=x1-x0,dy=y1-y0,sc=Math.min((RT_W-2*RT_PAD)/(dx||1e-9),(RT_H-2*RT_PAD)/(dy||1e-9)),ox=(RT_W-dx*sc)/2,oy=(RT_H-dy*sc)/2;
  // the distance from the recorded distance where there is one, else measured along the route
  const byD=Q.some(q=>P[q.i].km!=null),r1=v=>Math.round(v*10)/10;let c=0,lst=0,cx=0,cy=0;
  Q.forEach((q,j)=>{
    q.x=r1(ox+(q.x-x0)*sc);q.y=r1(oy+(q.y-y0)*sc);cx+=q.x;cy+=q.y;
    if(byD){const v=P[q.i].km;if(v!=null)lst=v;q.km=lst;}else{if(j)c+=wkHav(Q[j-1],q);q.km=c;}
  });
  cx/=Q.length||1;cy/=Q.length||1;
  const tot=Q.length?Q[Q.length-1].km:0,st=[1,2,5,10,20,50,100].find(s=>Math.floor(tot/s)<=TH.RT_KM_MAX)||100,M=[];
  for(let d=st,j=0;d<tot;d+=st){while(j<Q.length&&Q[j].km<d)j++;if(j<Q.length)M.push({j,d});}
  return{a,Q,tot,st,M,cx,cy};
}
// what colours the route: heart rate against your zones, a run's pace against your threshold pace, power from a real meter
// against your FTP (the easy, steady and hard cuts of the session zones); anything else is one plain line. {by, at(p)}
function wkRtCls(C){
  const t=C.thr||{},run=t.run||{},ride=t.ride||{};
  const cut=(v,z)=>v<z.z3[0]?'easy':v<z.z4[0]?'steady':'hard';
  if(C.m==='hr'&&C.a.has.hr&&C.B.length)return{by:'heart rate',at:p=>wkClsAt(C.B,p.hr)};
  if(C.m==='spd'&&C.w.type==='Run'&&run.pace>0)return{by:'pace',at:p=>p.spd==null||p.spd<0.5?null:cut(p.spd/3.6/run.pace*100,ZN.pace)};
  if(C.m==='pw'&&C.pm&&ride.ftp>0)return{by:'power',at:p=>p.pw==null?null:cut(p.pw/ride.ftp*100,ZN.pw)};
  return{by:null,at:()=>null};
}
// the distance said above the route: the recorded one, else measured along it
const wkRtKm=C=>C.w.distKm?fmtDist(C.w):C.rt&&C.rt.tot>0?Math.round(C.rt.tot*10)/10+' km':'';
function wkRtSec(C){
  if(!C.rt||C.rt.a!==C.a)C.rt=wkRtGeo(C.a);
  const km=wkRtKm(C);
  return`<div class="dt-sec">Route${km?`<em>${esc(km)}</em>`:''}</div><div class="dt-card wk-rtc"><div id="wkRt"></div><div class="wk-lg" id="wkRtLg"></div>`+
    `<button type="button" class="wk-bo" id="wkMapB" onclick="wkMapTog()"${C.mapL?' disabled':''} aria-expanded="${!!wkMapIs(C)}">${UI.map}<span>${wkMapLbl(C)}</span></button><p class="wk-mpn" id="wkMapN" role="status">${esc(C.mapN||'')}</p></div>`;
}
// the route cut into runs of one colour for the chip in view, each starting where the last one ended, so the line has no gaps:
// [{c, p[route points]}]; sets C.rtBy (what it is coloured by, null for a plain line)
function wkRtRuns(C){
  const Q=C.rt.Q,K=wkRtCls(C),cs=Q.map(q=>K.at(C.a.pts[q.i]));
  // a moment with no reading keeps the colour before it (the first ones take the first known)
  let f=cs.find(Boolean)||null;for(let j=0;j<cs.length;j++){if(cs[j])f=cs[j];else cs[j]=f;}
  const by=C.rtBy=f?K.by:null,S=[];let cur=null;
  Q.forEach((q,j)=>{const c=by?cs[j]:'';if(cur&&cur.c===c){cur.p.push(q);return;}const pv=cur&&cur.p[cur.p.length-1];cur={c,p:pv?[pv,q]:[q,q]};S.push(cur);});
  return S;
}
// the svg for the chip in view
function wkRtSvg(C){
  const g=C.rt,Q=g.Q,S=wkRtRuns(C),by=C.rtBy,pth=pp=>'M'+pp.map(q=>q.x+' '+q.y).join('L');
  const cl=(v,lo,hi)=>Math.round(Math.min(hi,Math.max(lo,v))*10)/10;
  const km=g.M.map(({j,d})=>{
    const q=Q[j],a=Q[Math.max(0,j-2)],b=Q[Math.min(Q.length-1,j+2)],tx=b.x-a.x,ty=b.y-a.y,l=Math.hypot(tx,ty)||1;
    let nx=-ty/l,ny=tx/l;if((q.x-g.cx)*nx+(q.y-g.cy)*ny<0){nx=-nx;ny=-ny;}
    return`<circle class="rt-k" cx="${q.x}" cy="${q.y}" r="2.6"/><text class="wk-km" x="${cl(q.x+nx*9,8,RT_W-8)}" y="${cl(q.y+ny*9+3.5,10,RT_H-3)}">${d}</text>`;
  }).join('');
  const s=Q[0],e=Q[Q.length-1],km0=wkRtKm(C);
  return`<svg class="wk-rt" viewBox="0 0 ${RT_W} ${RT_H}" role="img" aria-label="Route${km0?', '+esc(km0):''}${by?', coloured by '+by:''}">`+
    `<path class="rt-cs" d="${pth(Q)}"/>`+S.map(x=>`<path class="rt-l${x.c?' '+x.c:''}" d="${pth(x.p)}"/>`).join('')+km+
    `<circle class="rt-f" cx="${e.x}" cy="${e.y}" r="4.6"/><circle class="rt-s" cx="${s.x}" cy="${s.y}" r="5"/>`+
    `<g class="rt-hv" visibility="hidden"><circle class="rt-h1" r="11"/><circle class="rt-h2" r="5.5"/></g></svg>`;
}
function wkRtLg(C){
  const g=C.rt,by=C.rtBy;
  return(by?`<span class="by">By ${by}</span>`+['easy','steady','hard'].map(c=>`<span><i class="${c}"></i>${cap(c)}</span>`).join(''):'')+
    `<span><i class="s"></i>Start</span><span><i class="f"></i>Finish</span>`+(g.M.length?`<span><i class="k"></i>${g.st===1?'Every km':`Every ${g.st} km`}</span>`:'');
}
// the route point nearest to a trace point (the route skips moments without a position)
function wkRtAt(Q,i){
  if(!Q.length)return null;let lo=0,hi=Q.length-1;
  while(hi-lo>1){const m=(lo+hi)>>1;if(Q[m].i<i)lo=m;else hi=m;}
  return Math.abs(Q[hi].i-i)<Math.abs(Q[lo].i-i)?Q[hi]:Q[lo];
}
// drawn again when the chip changes (the colour follows it); the dot follows the moment picked on the trace or the route
function wkRtDraw(C){
  const host=$('wkRt');if(!host||!C.a||!C.a.has.gps)return;
  if(!C.rt||C.rt.a!==C.a)C.rt=wkRtGeo(C.a);
  if(wkMapIs(C)){wkMapDraw(C,host);return;}
  if(host.dataset.m!==C.m||!host.querySelector('svg.wk-rt')){
    host.innerHTML=wkRtSvg(C);host.dataset.m=C.m;
    const lg=$('wkRtLg');if(lg)lg.innerHTML=wkRtLg(C);
    wkRtBind(C,host.firstChild);
  }
  const hv=host.querySelector('.rt-hv'),q=C.hov!=null&&C.a.pts[C.hov]?wkRtAt(C.rt.Q,C.hov):null;
  if(!hv)return;
  if(!q){hv.setAttribute('visibility','hidden');return;}
  hv.setAttribute('transform',`translate(${q.x} ${q.y})`);hv.removeAttribute('visibility');
}
// tap the route to read that moment on the trace (a tap away from it clears); a mouse reads as it moves
function wkRtBind(C,sv){
  if(!sv)return;
  const pick=e=>{
    const r=sv.getBoundingClientRect();if(!r.width||!C.rt)return null;
    const x=(e.clientX-r.left)/r.width*RT_W,y=(e.clientY-r.top)/r.height*RT_H;let b=null,bd=Infinity;
    C.rt.Q.forEach(q=>{const d=(q.x-x)*(q.x-x)+(q.y-y)*(q.y-y);if(d<bd){bd=d;b=q;}});
    return bd<=24*24?b:null;
  };
  sv.addEventListener('click',e=>{const q=pick(e);C.hov=q?q.i:null;wkDraw();});
  sv.addEventListener('pointermove',e=>{if(e.pointerType!=='mouse')return;const q=pick(e);if(q){C.hov=q.i;wkDraw();}});
  sv.addEventListener('pointerleave',e=>{if(e.pointerType==='mouse'){C.hov=null;wkDraw();}});
}

// ── v130: the same route on a street map, only after Show map. Leaflet is in vendor/leaflet (loaded once, on that tap);
// tiles come from OpenStreetMap and are never cached; the map is taken down when the sheet closes or another workout opens ──
const WK_VEND=new URL('../vendor/leaflet/',document.currentScript&&document.currentScript.src||location.href).href;
const WK_TILES='https://tile.openstreetmap.org/{z}/{x}/{y}.png';
let _wkMap=null,_wkLf=null;
const wkMapIs=C=>!!(C&&_wkMap&&_wkMap.id===C.id);
const wkMapLbl=C=>wkMapIs(C)?'Hide map':C.mapL?'Loading the map…':'Show map';
// the map code, added to the page once; a failed load can be tried again
function wkLeaflet(){
  if(window.L&&window.L.map)return Promise.resolve();
  if(_wkLf)return _wkLf;
  return _wkLf=new Promise((ok,no)=>{
    if(!document.querySelector('link[data-lf]')){const l=document.createElement('link');l.rel='stylesheet';l.href=WK_VEND+'leaflet.css';l.dataset.lf='1';document.head.appendChild(l);}
    const s=document.createElement('script');s.src=WK_VEND+'leaflet.js';s.dataset.lf='1';
    s.onload=()=>window.L&&window.L.map?ok():no(new Error('leaflet'));
    s.onerror=()=>{s.remove();no(new Error('leaflet'));};
    document.head.appendChild(s);
  }).catch(e=>{_wkLf=null;throw e;});
}
function wkMapUi(C){
  const b=$('wkMapB'),n=$('wkMapN');
  if(b){b.lastChild.textContent=wkMapLbl(C);b.disabled=!!C.mapL;b.setAttribute('aria-expanded',String(wkMapIs(C)));}
  if(n)n.textContent=C.mapN||'';
}
// Show map / Hide map; offline or when the map code does not load, a note and the route shape stays
function wkMapTog(){
  const C=_wkC;if(!C||!C.rt)return;
  if(wkMapIs(C)){wkMapOff();const h=$('wkRt');if(h){h.innerHTML='';h.dataset.m='';}C.mapN='';wkMapUi(C);wkDraw();return;}
  if(C.mapL)return;
  if(!navigator.onLine){C.mapN='The map needs a connection.';wkMapUi(C);return;}
  C.mapL=1;C.mapN='';wkMapUi(C);
  wkLeaflet().then(()=>{C.mapL=0;if(_wkC!==C||_dtKey!=='wk:'+C.id)return;wkMapOn(C);wkMapUi(C);},
    ()=>{C.mapL=0;C.mapN='The map needs a connection.';if(_wkC===C)wkMapUi(C);});
}
function wkMapOn(C){
  const host=$('wkRt');if(!host)return;
  const el=document.createElement('div');el.className='wk-mpw';
  el.innerHTML=`<div class="wk-mp" role="region" aria-label="Route on a street map"></div><div class="wk-zm"><button type="button" aria-label="Zoom in">${UI.plus}</button><button type="button" aria-label="Zoom out">${UI.minus}</button></div>`;
  host.innerHTML='';host.appendChild(el);host.dataset.m='map';
  try{
    const map=L.map(el.firstChild,{zoomControl:false,scrollWheelZoom:false});
    _wkMap={id:C.id,map,el,m:null,rt:null,ly:null,hv:null};
    map.attributionControl.setPrefix(false);
    L.tileLayer(WK_TILES,{maxZoom:TH.MAP_ZMAX,attribution:'© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'}).addTo(map);
    map.fitBounds(C.rt.Q.map(q=>[q.la,q.lo]),{padding:[24,24]});
    const[zi,zo]=el.querySelectorAll('.wk-zm button');zi.onclick=()=>map.zoomIn();zo.onclick=()=>map.zoomOut();
    // a tap near the route reads that moment on the trace; a tap away from it clears
    map.on('click',e=>{
      const K=_wkC;if(!K||!wkMapIs(K)||!K.rt)return;const pt=e.containerPoint;let b=null,bd=Infinity;
      K.rt.Q.forEach(q=>{const p=map.latLngToContainerPoint([q.la,q.lo]),d=(p.x-pt.x)*(p.x-pt.x)+(p.y-pt.y)*(p.y-pt.y);if(d<bd){bd=d;b=q;}});
      K.hov=b&&bd<=24*24?b.i:null;wkDraw();
    });
  }catch(_){wkMapOff();host.innerHTML='';host.dataset.m='';}
  wkDraw();
}
// the route, marks and the linked dot on the map; a re-rendered sheet gets the same map back
function wkMapDraw(C,host){
  const M=_wkMap,map=M.map,lg=$('wkRtLg'),ll=q=>[q.la,q.lo];
  if(M.el.parentNode!==host){host.innerHTML='';host.appendChild(M.el);host.dataset.m='map';map.invalidateSize();}
  if(M.m!==C.m||M.rt!==C.rt||!M.ly){
    if(M.ly)M.ly.remove();
    const g=C.rt,Q=g.Q,S=wkRtRuns(C),ly=M.ly=L.layerGroup(),o=c=>({className:c,interactive:false});
    L.polyline(Q.map(ll),o('rt-cs')).addTo(ly);
    S.forEach(x=>L.polyline(x.p.map(ll),o('rt-l'+(x.c?' '+x.c:''))).addTo(ly));
    g.M.forEach(({j,d})=>{
      L.circleMarker(ll(Q[j]),Object.assign(o('rt-k'),{radius:3})).addTo(ly);
      L.marker(ll(Q[j]),{icon:L.divIcon({className:'wk-mk',html:String(d),iconSize:[28,14],iconAnchor:[-5,7]}),interactive:false,keyboard:false}).addTo(ly);
    });
    L.circleMarker(ll(Q[Q.length-1]),Object.assign(o('rt-f'),{radius:5.5})).addTo(ly);
    L.circleMarker(ll(Q[0]),Object.assign(o('rt-s'),{radius:6})).addTo(ly);
    ly.addTo(map);M.m=C.m;M.rt=C.rt;
    if(lg)lg.innerHTML=wkRtLg(C);
  }else if(lg&&!lg.firstChild)lg.innerHTML=wkRtLg(C);
  const q=C.hov!=null&&C.a.pts[C.hov]?wkRtAt(C.rt.Q,C.hov):null;
  if(!q){if(M.hv){M.hv.forEach(x=>x.remove());M.hv=null;}return;}
  if(M.hv)M.hv.forEach(x=>x.setLatLng(ll(q)));
  else M.hv=[['rt-h1',11],['rt-h2',5.5]].map(([c,r])=>L.circleMarker(ll(q),{className:c,radius:r,interactive:false}).addTo(map));
}
function wkMapOff(){const M=_wkMap;_wkMap=null;if(M&&M.map)try{M.map.remove();}catch(_){}}
