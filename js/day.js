// ── YOUR DAY (v129): heart rate around the clock, with sleep, band off and workouts ──
// One window: TH.DAY_FROM the day before to TH.DAY_FROM on the day. Today runs to that hour with a "Now" line, or after it
// the 24 hours ending now. Heart rate is the band's 5-minute means of both days. TH.DAY_GAP minutes or more with no heart
// rate outside sleep reads as band off (never at the end of today: the last download can lag, and never before a day that
// was not downloaded). Daytime = awake after the night, outside workouts. The chart reads, pans and zooms; the button in its title opens the Strain sheet for the day.
const DY_MIN=60000,DY_HR=3600000;
const dyMed=a=>{const x=[...a].sort((p,q)=>p-q),m=Math.floor(x.length/2);return x.length?(x.length%2?x[m]:(x[m-1]+x[m])/2):null;};
const dyHasHr=r=>!!(r&&r.data&&Array.isArray(r.data.hr)&&r.data.hr.length);
const dyHm=t=>{const x=new Date(t);return String(x.getHours()).padStart(2,'0')+':'+String(x.getMinutes()).padStart(2,'0');};
// the band's heart rate of one date as [ms, bpm]
function dyPts(date){
  const r=dayOn(date),out=[];if(!dyHasHr(r))return out;
  for(const run of r.data.hr){
    const t0=plT(run.t),dt=(run.dt||TH.DAY_HR_DT)*1000;if(t0==null||!Array.isArray(run.v))continue;
    run.v.forEach((v,i)=>{if(typeof v==='number')out.push([t0+i*dt,v]);});
  }
  return out;
}
// the night ending on the date as {a, b (ms), min asleep}: the kept window of a detailed night, else bed and wake from the log
function dyNight(day,prev){
  const n=polarOn(day),rec=(S().sleepLogs||[]).find(x=>x.date===day);
  if(n&&n.data&&plT(n.data.start)!=null){
    const s0=plT(n.data.start),c=plCut(n),a=s0+(c?c.s:0)*1000,b=s0+(c?c.e:plTot(n.data))*1000;
    return b>a?{a,b,min:rec&&rec.durMin?rec.durMin:c?plWin(n,c.s,c.e).asleep:n.data.asleep||Math.round((b-a)/DY_MIN)}:null;
  }
  if(rec&&/^\d\d:\d\d$/.test(rec.bed||'')&&/^\d\d:\d\d$/.test(rec.wake||'')){
    const a=plT((+rec.bed.slice(0,2)>=12?prev:day)+'T'+rec.bed+':00');
    return a==null?null:{a,b:a+slSpan(rec.bed,rec.wake)*DY_MIN,min:rec.durMin||slSpan(rec.bed,rec.wake)};
  }
  return null;
}
// v131: the naps of a date as [{a, b (ms), min}]. A band sleep stretch (plAct sl) counts only when every check holds:
// NAP_MIN to NAP_MAX minutes; starting NAP_GAP after the night that ended that morning and ending NAP_GAP before the next one
// (before midnight when that night is not known); NAP_STEPS steps or fewer; no timed workout across it; heart rate in NAP_HR_COV
// of its 5-minute slots, their median within NAP_HR_UP of that night's sleeping level (plSleepLvl). No night or no level, no naps.
// Worked out on demand, never stored. v133: these are the band's naps (by 'band'); napsOn adds yours.
function napsBand(date){
  const r=dayOn(date),sl=r&&r.data&&r.data.sl;if(!Array.isArray(sl)||!sl.length)return[];
  const prev=dAgo(daysAgo(date)+1),next=dAgo(daysAgo(date)-1),n0=dyNight(date,prev),pn=polarOn(date),lvl=pn?plSleepLvl(pn):null;
  if(!n0||lvl==null)return[];
  const n1=dyNight(next,date),m0=plT(date+'T00:00:00'),gap=TH.NAP_GAP*DY_MIN,dt=TH.DAY_HR_DT*1000;
  const end=(n1?n1.a:plT(next+'T00:00:00'))-gap,pts=dyPts(date);
  const wks=wkOn().filter(w=>(w.date===date||w.date===prev)&&w.durMin>0&&/^\d\d:\d\d$/.test(wIcu(w).t||''))
    .map(w=>{const t=plT(w.date+'T'+wIcu(w).t+':00');return[t,t+w.durMin*DY_MIN];}).filter(k=>k[0]!=null);
  const out=[];
  for(const z of sl){
    if(!Array.isArray(z)||z.length<3)continue;
    const a=m0+z[0]*DY_MIN,b=m0+z[1]*DY_MIN,min=z[1]-z[0];
    if(min<TH.NAP_MIN||min>TH.NAP_MAX||a<n0.b+gap||b>end||!(z[2]<=TH.NAP_STEPS))continue;
    if(wks.some(([p,q])=>p<b&&q>a))continue;
    const v=pts.filter(p=>p[0]>=a&&p[0]<b).map(p=>p[1]);
    if(v.length<TH.NAP_HR_COV*Math.max(1,Math.round((b-a)/dt))||dyMed(v)>lvl+TH.NAP_HR_UP)continue;
    out.push({a,b,min,by:'band'});
  }
  return out;
}
// v133: your naps, in profile.naps {date:[{a, b (minutes from midnight), by}]}: 'you' a nap you added, 'no' a band nap you took
// off. Synced inside the profile, kept TH.NAP_KEEP days (migrate). Your entry always wins over the band's.
function napUser(date){
  const N=(S().profile||{}).naps,L=N&&N[date];
  return Array.isArray(L)?L.filter(z=>z&&Number.isInteger(z.a)&&Number.isInteger(z.b)&&z.a>=0&&z.b<=1440&&z.a<z.b&&(z.by==='you'||z.by==='no')):[];
}
function napPut(date,L){
  const d=S(),p=d.profile=d.profile||{},N={...(p.naps||{})};
  if(L.length)N[date]=[...L].sort((x,y)=>x.a-y.a);else delete N[date];
  p.naps=N;markProfile();
}
// a new entry replaces any of yours it overlaps
const napAdd=(date,a,b,by)=>napPut(date,[...napUser(date).filter(z=>!(z.a<b&&z.b>a)),{a,b,by}]);
const napSet=(date,a,b)=>napAdd(date,a,b,'you');
const napNo=(date,a,b)=>napAdd(date,a,b,'no');
// the naps that count on a date as [{a, b (ms), min, by 'band'|'you'}]: the band's, less any you took off or overlapped, plus yours.
// Only the sleep debt, Your day and the Naps list in Log > Sleep (napList) read them; never Body, the gauge, the night or Trends.
function napsOn(date){
  const U=napUser(date),m0=plT(date+'T00:00:00');if(m0==null)return[];
  const band=napsBand(date).filter(z=>!U.some(u=>z.a<m0+u.b*DY_MIN&&z.b>m0+u.a*DY_MIN));
  return[...band,...U.filter(u=>u.by==='you').map(u=>({a:m0+u.a*DY_MIN,b:m0+u.b*DY_MIN,min:u.b-u.a,by:'you'}))].sort((x,y)=>x.a-y.a);
}
// for Log > Sleep: the date's naps in minutes from midnight
const napList=date=>{const m0=plT(date+'T00:00:00');return napsOn(date).map(z=>({a:Math.round((z.a-m0)/DY_MIN),b:Math.round((z.b-m0)/DY_MIN),min:z.min,by:z.by}));};
// cal (v129, the Strain sheet): the calendar day instead, midnight to midnight, today to now with no "Now" line,
// with the night that starts that evening as sleep2
function dyDay(day,cal){
  day=day||td();
  const prev=dAgo(daysAgo(day)+1),next=dAgo(daysAgo(day)-1),hh=String(TH.DAY_FROM).padStart(2,'0')+':00:00';
  let a=plT(prev+'T'+hh),b=plT(day+'T'+hh),now=null,last=false;
  if(cal){a=plT(day+'T00:00:00');b=plT(next+'T00:00:00');if(day===td())b=Math.min(b,Date.now());}
  else if(day===td()){const t=Date.now();if(t>=b){b=t;a=t-24*DY_HR;last=true;}else now=t;}
  const end=now||b,rP=dayOn(prev),rD=dayOn(day),gap=TH.DAY_GAP*DY_MIN,dt=TH.DAY_HR_DT*1000;
  const pts=[...dyPts(prev),...dyPts(day)].filter(p=>p[0]>=a&&p[0]<=end).sort((x,y)=>x[0]-y[0]);
  const clip=x=>x&&x.b>a&&x.a<end?{a:Math.max(a,x.a),b:Math.min(end,x.b),min:x.min}:null;
  const sleep=clip(dyNight(day,prev)),sleep2=cal&&day!==td()?clip(dyNight(next,day)):null;
  // v131: naps, drawn as asleep and left out of daytime
  const naps=[...napsOn(prev),...napsOn(day)].map(clip).filter(Boolean);
  const wks=wkOn().filter(w=>(w.date===prev||w.date===day)&&w.durMin>0&&/^\d\d:\d\d$/.test(wIcu(w).t||''))
    .map(w=>{const s=plT(w.date+'T'+wIcu(w).t+':00');return{a:s,b:s+w.durMin*DY_MIN,name:wkLabel(w),w};})
    .filter(k=>k.a!=null&&k.b>a&&k.a<end).map(k=>({...k,a:Math.max(a,k.a),b:Math.min(end,k.b)})).sort((x,y)=>x.a-y.a);
  // band off: the gaps, less the night
  const raw=[],off=[];
  if(pts.length){
    if(dyHasHr(cal?rD:rP)&&pts[0][0]-a>=gap)raw.push([a,pts[0][0]]);
    for(let i=1;i<pts.length;i++)if(pts[i][0]-pts[i-1][0]>=gap)raw.push([pts[i-1][0]+dt,pts[i][0]]);
    if(day!==td()&&dyHasHr(rD)&&end-pts[pts.length-1][0]>=gap)raw.push([pts[pts.length-1][0]+dt,end]);
  }
  const cut=(g,z)=>z?g.flatMap(([p,q])=>[[p,Math.min(q,z.a)],[Math.max(p,z.b),q]]):g;
  naps.reduce((g,z)=>cut(g,z),cut(cut(raw,sleep),sleep2)).forEach(([p,q])=>{if(q-p>=gap)off.push([p,q]);});
  const inW=t=>wks.find(k=>t>=k.a&&t<=k.b)||null,inS=t=>!!sleep&&t>=sleep.a&&t<=sleep.b,inS2=t=>!!sleep2&&t>=sleep2.a&&t<=sleep2.b,inN=t=>naps.some(z=>t>=z.a&&t<=z.b);
  let lo=null,hi=null;for(const[t,v]of pts){if(!lo||v<lo.v)lo={v,t};if(!hi||v>hi.v)hi={v,t};}
  if(hi)hi.w=(inW(hi.t)||{}).w||null;
  const awake=sleep?pts.filter(p=>p[0]>sleep.b&&!inS2(p[0])&&!inW(p[0])&&!inN(p[0])).map(p=>p[1]):[],night=sleep?pts.filter(p=>inS(p[0])).map(p=>p[1]):[];
  return{day,prev,a,b,now,last,cal:!!cal,pts,sleep,sleep2,naps,wks,off,lo,hi,
    dayMean:awake.length*TH.DAY_HR_DT/60>=TH.DAY_MEAN_MIN?awake.reduce((s,v)=>s+v,0)/awake.length:null,
    nightLo:night.length?Math.min(...night):null};
}
// your usual daytime heart rate and lowest at night: the medians of the TH.DAY_USUAL_N days before, from TH.DAY_USUAL_MIN days
function dyUsual(day){
  const n0=daysAgo(day),dm=[],nl=[];
  for(let i=1;i<=TH.DAY_USUAL_N;i++){const d=dyDay(dAgo(n0+i));if(d.dayMean!=null)dm.push(d.dayMean);if(d.nightLo!=null)nl.push(d.nightLo);}
  return{dayMean:dm.length>=TH.DAY_USUAL_MIN?dyMed(dm):null,nightLo:nl.length>=TH.DAY_USUAL_MIN?dyMed(nl):null,n:Math.max(dm.length,nl.length)};
}
// after the day's longest finished workout: minutes until heart rate is back under the daytime usual plus TH.DAY_SETTLE_UP
// (rounded to 5); min null when it stayed above for TH.DAY_SETTLE_MIN or more of readings
function daySettle(D,U){
  if(!U||U.dayMean==null||!D.pts.length)return null;
  const w=D.wks.filter(k=>k.b<(D.now||D.b)).sort((x,y)=>(y.b-y.a)-(x.b-x.a))[0];if(!w)return null;
  const lvl=Math.round((U.dayMean+TH.DAY_SETTLE_UP)/5)*5,after=D.pts.filter(p=>p[0]>=w.b);
  const p=after.find(q=>q[1]<=lvl);
  if(p)return{lvl,min:Math.round((p[0]-w.b)/DY_MIN/5)*5,w:w.w};
  return after.length&&after[after.length-1][0]-w.b>=TH.DAY_SETTLE_MIN*DY_MIN?{lvl,min:null,w:w.w}:null;
}
// one line (v123): how the night settled, else the daytime against usual, with the settle after the main workout when it adds
function dayMeaning(D,U){
  if(!D.pts.length)return'No heart rate recorded for this day.';
  const st=daySettle(D,U),nm=st?wkNoun(st.w):'',near=TH.HR_NEAR,now=D.day===td();
  const set=!st?'':st.min==null?`stayed above ${st.lvl} after the ${nm}`:st.min<=TH.DAY_SETTLE_MIN?`came down fast after the ${nm}`:`took ${st.min<60?st.min+' minutes':fmtDur(st.min)} to come down after the ${nm}`;
  if(D.nightLo!=null&&U.nightLo!=null){
    const df=D.nightLo-Math.round(U.nightLo);
    if(df>near)return`Your heart rate stayed higher than usual overnight: lowest ${D.nightLo} against your usual ${Math.round(U.nightLo)}.`;
    return`Your heart rate settled ${df<-near?'lower than usual':'well'} overnight${set?' and '+set:''}.`;
  }
  if(D.dayMean!=null&&U.dayMean!=null){
    const v=Math.round(D.dayMean),u=Math.round(U.dayMean),df=v-u;
    if(Math.abs(df)>near)return`Your daytime heart rate ${now?'is':'was'} ${df>0?'higher':'lower'} than usual: ${v} against ${u}.`;
    return`Your daytime heart rate ${now?'is':'was'} at your usual${set?', and it '+set:''}.`;
  }
  if(set)return`Your heart rate ${set}.`;
  return U.n<TH.DAY_USUAL_MIN?`Your usual builds after ${TH.DAY_USUAL_MIN} days with your band.`:'A steady day.';
}
// v131: the line, plus the day's nap when it paid back sleep debt and the whole still fits the v123 limit
function dayLine(D,U){
  const t=dayMeaning(D,U),own=D.naps.filter(z=>z.a>=plT(D.day+'T00:00:00'));if(!own.length)return t;
  const Q=sleepDebt(D.day),i=Q?Q.nights.findIndex(x=>x.date===D.day):-1,x=i>=0?Q.nights[i]:null;
  if(!x||x.diff==null||!x.nap||!(i&&Q.nights[i-1].bal>0))return t;
  const add=own.length>1?' The naps count toward paying back your sleep debt.':` The ${own[0].min}-minute nap counts toward paying back your sleep debt.`;
  return(t+add).length<=140?t+add:t;
}
// ── v133: the chart reads, pans and zooms, like the workout trace (wkMount, wkBind, wkDraw). One per id ('yd' Today, 'st' the
// Strain sheet) in _dyC; _dyQ holds the day the Strain sheet mounts once it is in the page. C.st records what was drawn (tests).
// Colours come from cssv, so a theme change redraws it (chRedrawAll). The heart rate numbers sit in a gutter on the right.
const _dyC={},_dyQ={},DY_H=170,DY_R=28;
function dyOff(id){const C=_dyC[id];if(!C)return;if(C.ob)C.ob.disconnect();delete _dyC[id];}
// the span chips: the whole window, then TH.DY_SPAN_MID and TH.DY_SPAN_MIN minutes when shorter
function dySpans(D){
  const full=Math.max(DY_MIN,D.b-D.a),out=[[full,full>=24*DY_HR-DY_MIN?'24h':Math.max(1,Math.round(full/DY_HR))+'h']];
  [TH.DY_SPAN_MID,TH.DY_SPAN_MIN].forEach(m=>{const l=m/60+'h';if(m*DY_MIN<full-DY_MIN&&!out.some(o=>o[1]===l))out.push([m*DY_MIN,l]);});
  return out;
}
function dyMount(host,D,id){
  if(!host)return;
  const o=_dyC[id];if(o&&o.ob)o.ob.disconnect();
  const C={id,host,D,v0:D.a,s:D.b-D.a,hov:null,st:{},w:0};
  // a re-render of the same day keeps a zoomed view and the reading
  if(o&&o.D.day===D.day&&o.D.cal===D.cal&&o.D.last===D.last){
    if(o.s<o.D.b-o.D.a-DY_MIN){C.s=o.s;C.v0=o.v0;}
    if(o.hov!=null&&o.hov>=D.a&&o.hov<=(D.now||D.b))C.hov=o.hov;
  }
  dyClamp(C);
  const sp=dySpans(D),chev=d=>`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d<0?'M15 6l-6 6l6 6':'M9 6l6 6l-6 6'}"/></svg>`;
  host.innerHTML=`<div class="dy-nav">${sp.length>1?`<div class="wk-chs" role="group" aria-label="Time shown">${sp.map(([s,l])=>`<button type="button" class="wk-ch" data-s="${s}" aria-pressed="false">${l}</button>`).join('')}</div>`:''}<div class="dy-pg" hidden><button type="button" class="db" data-d="-1" aria-label="Earlier">${chev(-1)}</button><button type="button" class="db" data-d="1" aria-label="Later">${chev(1)}</button></div></div><div class="vc-ro dy-ro" aria-live="polite"></div><canvas class="vc-cv dy-cv" tabindex="0" role="img" style="width:100%;height:${DY_H}px;display:block"></canvas>`;
  host.querySelectorAll('.wk-ch').forEach(b=>b.onclick=()=>dyChip(C,+b.dataset.s));
  host.querySelectorAll('.dy-pg .db').forEach(b=>b.onclick=()=>dyShift(C,+b.dataset.d));
  C.cv=host.querySelector('.dy-cv');C.ro=host.querySelector('.dy-ro');C.pg=host.querySelector('.dy-pg');C.nav=host.querySelector('.dy-nav');
  dyBind(C);_dyC[id]=C;
  if(typeof ResizeObserver==='function'){C.ob=new ResizeObserver(()=>{if(_dyC[id]===C&&host.clientWidth&&host.clientWidth!==C.w)dyDraw(id);});C.ob.observe(host);}
  dyDraw(id);
}
// the view: from TH.DY_SPAN_MIN minutes to the whole window, never outside it
function dyClamp(C){const D=C.D,full=Math.max(DY_MIN,D.b-D.a),mn=Math.min(full,TH.DY_SPAN_MIN*DY_MIN);C.s=Math.min(full,Math.max(mn,C.s||full));C.v0=Math.min(D.a+full-C.s,Math.max(D.a,C.v0));}
// zoom to span ns keeping the time m where it is on the screen
function dyZoom(C,ns,m){if(m==null)m=C.v0+C.s/2;const s0=C.s,a0=C.v0;C.s=ns;dyClamp(C);C.v0=m-(m-a0)*C.s/s0;dyClamp(C);dyDraw(C.id);}
// a chip centres on the reading, else on the view when zoomed, else ends at now (or the last reading)
function dyChip(C,ns){const D=C.D,zoomed=C.s<D.b-D.a-DY_MIN,lp=D.pts.length?D.pts[D.pts.length-1][0]:null,m=C.hov!=null?C.hov:zoomed?C.v0+C.s/2:null;C.s=ns;C.v0=m!=null?m-ns/2:(D.now||lp||D.b)-ns;dyClamp(C);dyDraw(C.id);}
function dyShift(C,dir){C.v0+=dir*C.s;dyClamp(C);dyDraw(C.id);}
function dyIdx(P,t){let lo=0,hi=P.length-1;while(hi-lo>1){const m=(lo+hi)>>1;if(P[m][0]<t)lo=m;else hi=m;}return Math.abs(P[hi][0]-t)<Math.abs(P[lo][0]-t)?hi:lo;}
// a reading snaps to the nearest 5-minute mean within tol, else to the minute (band off, before the first reading)
function dySnap(C,t,tol){const D=C.D,P=D.pts,e=D.now||D.b;t=Math.min(e,Math.max(D.a,t));tol=tol==null?TH.DAY_HR_DT*1000:tol;if(P.length){const p=P[dyIdx(P,t)];if(Math.abs(p[0]-t)<=tol)return p[0];}return Math.min(e,Math.max(D.a,Math.round(t/DY_MIN)*DY_MIN));}
// what the moment t shows: the heart rate when a mean sits there, and the state (Nap, Asleep, the workout, Band off)
function dyAt(C,t){
  const D=C.D,P=D.pts,i=P.length?dyIdx(P,t):-1,v=i>=0&&P[i][0]===t?P[i][1]:null,inn=z=>z&&t>=z.a&&t<=z.b;
  let st=null;
  if((D.naps||[]).some(inn))st=['Nap','sl'];
  else if(inn(D.sleep)||inn(D.sleep2))st=['Asleep','sl'];
  else{const k=D.wks.find(inn);if(k)st=[k.name,'wo'];else if(D.off.some(([a,b])=>t>=a&&t<=b))st=['Band off','bo'];}
  return{v,word:st?st[0]:null,cls:st?st[1]:null};
}
// the readout over the chart: the reading, else the latest heart rate ("Now" while it is recent today)
function dyRo(C){
  const D=C.D,P=D.pts;
  if(!P.length&&C.hov==null){C.ro.innerHTML='';C.st.ro='';return;}
  const t=C.hov!=null?C.hov:P[P.length-1][0],a=dyAt(C,t);
  const lab=C.hov==null&&D.day===td()&&Date.now()-t<=TH.DAY_GAP*DY_MIN?'Now':dyHm(t);
  const cells=[];
  if(a.v!=null)cells.push(`<div class="vc-v"><span class="vc-n">Heart rate</span><span class="vc-x">${a.v} bpm</span></div>`);
  if(a.word)cells.push(`<div class="vc-v"><span class="vc-x"><i class="dy-sw ${a.cls}" aria-hidden="true"></i>${esc(a.word)}</span></div>`);
  if(!cells.length)cells.push('<div class="vc-v"><span class="vc-x">No reading</span></div>');
  C.ro.innerHTML=`<div class="vc-date">${lab}</div><div class="vc-vals">${cells.join('')}</div>`;
  C.st.ro=[lab,a.v!=null?a.v+' bpm':null,a.word||(a.v==null?'No reading':null)].filter(Boolean).join(' · ');
}
function dyDraw(id){
  if(id==null){Object.keys(_dyC).forEach(k=>dyDraw(k));return;}
  const C=_dyC[id];if(!C||!C.cv||!C.cv.isConnected)return;
  const D=C.D,P=D.pts,v0=C.v0,s=C.s,v1=v0+s,c=C.cv;
  if(C.hov!=null&&(C.hov<v0||C.hov>v1))C.hov=null;
  const W=C.host.clientWidth||300,H=DY_H,r=window.devicePixelRatio||1,PW=W-DY_R,X=t=>(t-v0)/s*PW;
  c.width=Math.round(W*r);c.height=Math.round(H*r);
  const x=c.getContext('2d');x.setTransform(r,0,0,r,0,0);x.clearRect(0,0,W,H);x.font='500 10px Inter,sans-serif';
  const y0=18,y1=H-22,yt=y0+8,yb=y1-18,st={labels:[],ticks:[],yl:[],segs:0,now:false,lo:false,bands:{sl:0,wo:0,bo:0},view:[v0,v1],hov:C.hov};
  // the heart rate range: the readings in view, else all of them; numbers on steps of 1, 2 or 5 x 10^n
  const inV=P.filter(p=>p[0]>=v0&&p[0]<=v1),vs=(inV.length?inV:P).map(p=>p[1]);
  let mn=vs.length?Math.min(...vs):0,mx=vs.length?Math.max(...vs):1;
  if(mx-mn<10){const m=(mx+mn)/2;mn=m-5;mx=m+5;}
  const pd=(mx-mn)*.08;mn-=pd;mx+=pd;
  const Y=v=>yb-(v-mn)/(mx-mn)*(yb-yt);
  const vis=(a,b)=>b>=v0&&a<=v1;
  x.save();x.beginPath();x.rect(0,0,PW,H);x.clip();
  // asleep and naps, workouts, band off (hatched)
  [D.sleep,D.sleep2,...(D.naps||[])].forEach(z=>{if(z&&vis(z.a,z.b)){x.fillStyle=cssv('--teal-l');x.fillRect(X(z.a),y0,Math.max(1,X(z.b)-X(z.a)),y1-y0);st.bands.sl++;}});
  D.wks.forEach(k=>{if(vis(k.a,k.b)){x.fillStyle=cssv('--sur2');x.fillRect(X(k.a),y0,Math.max(1,X(k.b)-X(k.a)),y1-y0);st.bands.wo++;}});
  D.off.forEach(([a,b])=>{
    if(!vis(a,b))return;st.bands.bo++;
    const l=X(a),w=Math.max(1,X(b)-X(a));
    x.save();x.beginPath();x.rect(l,y0,w,y1-y0);x.clip();x.strokeStyle=cssv('--t3');x.globalAlpha=.5;x.lineWidth=1.2;x.beginPath();
    for(let q=l-(y1-y0);q<l+w;q+=5){x.moveTo(q,y1);x.lineTo(q+(y1-y0),y0);}
    x.stroke();x.restore();
  });
  // gridlines with their numbers in the gutter
  if(vs.length){
    const rg=mx-mn,mag=Math.pow(10,Math.floor(Math.log10(rg/4))),cand=[1,2,5,10].map(k=>k*mag),stp=cand.filter(k=>rg/k>=3).pop()||cand[0];
    x.strokeStyle=cssv('--bdr');x.lineWidth=1;x.globalAlpha=.6;x.beginPath();
    for(let v=Math.ceil(mn/stp)*stp;v<=mx;v+=stp){const y=Math.round(Y(v))+.5;x.moveTo(0,y);x.lineTo(PW,y);st.yl.push(String(Math.round(v)));}
    x.stroke();x.globalAlpha=1;
  }
  x.strokeStyle=cssv('--bdr');x.lineWidth=1;x.beginPath();x.moveTo(0,y1+.5);x.lineTo(PW,y1+.5);x.stroke();
  // the line, broken where there is no heart rate for TH.DAY_GAP minutes
  const segs=[];let g=[];P.forEach((p,i)=>{if(i&&p[0]-P[i-1][0]>=TH.DAY_GAP*DY_MIN){segs.push(g);g=[];}g.push(p);});if(g.length)segs.push(g);
  x.strokeStyle=cssv('--text');x.fillStyle=cssv('--text');x.lineWidth=1.6;x.lineJoin='round';x.lineCap='round';
  segs.forEach(q=>{
    if(!vis(q[0][0],q[q.length-1][0]))return;st.segs++;
    if(q.length===1){x.beginPath();x.arc(X(q[0][0]),Y(q[0][1]),1.2,0,Math.PI*2);x.fill();return;}
    x.beginPath();q.forEach((p,i)=>i?x.lineTo(X(p[0]),Y(p[1])):x.moveTo(X(p[0]),Y(p[1])));x.stroke();
  });
  // the lowest of the day
  if(D.lo&&D.lo.t>=v0&&D.lo.t<=v1){
    const cx=X(D.lo.t),cy=Y(D.lo.v);st.lo=true;
    x.beginPath();x.arc(cx,cy,3.5,0,Math.PI*2);x.fillStyle=cssv('--text');x.fill();x.lineWidth=1.5;x.strokeStyle=cssv('--sur');x.stroke();
    x.font='600 10px Inter,sans-serif';x.textAlign='center';x.textBaseline='alphabetic';x.fillText(String(D.lo.v),Math.min(PW-10,Math.max(10,cx)),cy+15);x.font='500 10px Inter,sans-serif';
  }
  if(D.now&&D.now>=v0&&D.now<=v1){const nx=Math.round(X(D.now))+.5;x.strokeStyle=cssv('--t3');x.lineWidth=1;x.setLineDash([3,3]);x.beginPath();x.moveTo(nx,y0);x.lineTo(nx,y1);x.stroke();x.setLineDash([]);st.now=true;}
  // the reading
  const rd=C.hov!=null?dyAt(C,C.hov):null;
  if(rd){
    const hx=Math.round(X(C.hov))+.5;x.strokeStyle=cssv('--t2');x.lineWidth=1;x.setLineDash([3,3]);x.beginPath();x.moveTo(hx,y0);x.lineTo(hx,y1);x.stroke();x.setLineDash([]);
    if(rd.v!=null){x.beginPath();x.arc(X(C.hov),Y(rd.v),4.5,0,Math.PI*2);x.fillStyle=cssv('--text');x.fill();x.lineWidth=2;x.strokeStyle=cssv('--sur');x.stroke();}
  }
  x.restore();
  // labels on top, on the part in view, in order of importance, never overlapping
  const mid=(a,b)=>(Math.max(a,v0)+Math.min(b,v1))/2,want=[];
  if(D.sleep&&vis(D.sleep.a,D.sleep.b))want.push([D.cal?'Asleep':'Asleep '+fmtDur(D.sleep.min),mid(D.sleep.a,D.sleep.b),'--teal',600]);
  if(D.sleep2&&vis(D.sleep2.a,D.sleep2.b))want.push(['Asleep',mid(D.sleep2.a,D.sleep2.b),'--teal',600]);
  (D.naps||[]).forEach(z=>{if(vis(z.a,z.b))want.push(['Nap',mid(z.a,z.b),'--teal',600]);});
  [...D.wks].sort((p,q)=>(q.b-q.a)-(p.b-p.a)).forEach(k=>{if(vis(k.a,k.b))want.push([k.name,mid(k.a,k.b),'--text',600]);});
  if(st.now)want.push(['Now',D.now,'--t2',500]);
  D.off.forEach(([a,b])=>{if(vis(a,b))want.push(['Band off',mid(a,b),'--t2',500]);});
  const put=[];x.textAlign='center';x.textBaseline='alphabetic';
  for(const[t,at,col,wt]of want){
    x.font=`${wt} 10px Inter,sans-serif`;
    const w=x.measureText(t).width,lx=Math.min(W-w/2,Math.max(w/2,X(at)));
    if(put.some(([p,q])=>lx-w/2<q+4&&lx+w/2>p-4))continue;
    put.push([lx-w/2,lx+w/2]);x.fillStyle=cssv(col);x.fillText(t,lx,10);st.labels.push(t);
  }
  x.font='500 10px Inter,sans-serif';
  // heart rate numbers on the right
  if(st.yl.length){x.fillStyle=cssv('--t3');x.textAlign='right';x.textBaseline='middle';st.yl.forEach(v=>x.fillText(v,W-2,Y(+v)));}
  // clock times: every 15 or 30 minutes, 1, 2, 3 or 6 hours, about 52px apart, on the local clock
  const mxT=Math.max(2,Math.floor(PW/52)),tk=([15,30,60,120,180,360].find(m=>s/(m*DY_MIN)<=mxT)||360)*DY_MIN;
  const m0=new Date(v0);m0.setHours(0,0,0,0);
  x.fillStyle=cssv('--t2');x.textBaseline='alphabetic';
  for(let t=m0.getTime()+Math.ceil((v0-m0.getTime())/tk)*tk;t<=v1;t+=tk){
    const tx=X(t),l=dyHm(t);x.textAlign=tx<12?'left':tx>W-12?'right':'center';x.fillText(l,tx,H-6);st.ticks.push(l);
  }
  c.setAttribute('aria-label',(P.length?`Heart rate from ${dyHm(v0)} to ${dyHm(v1)}`:'No heart rate recorded')+(rd?`. Read at ${dyHm(C.hov)}: ${[rd.v!=null?rd.v+' bpm':null,rd.word?rd.word.toLowerCase():null].filter(Boolean).join(', ')||'no reading'}.`:''));
  C.st=st;dyRo(C);
  // the chips, and ‹ › while zoomed in
  const full=C.s>=D.b-D.a-DY_MIN;
  C.host.querySelectorAll('.wk-ch').forEach(b=>b.setAttribute('aria-pressed',String(Math.abs(+b.dataset.s-C.s)<=DY_MIN)));
  C.pg.hidden=full;
  C.host.querySelectorAll('.dy-pg .db').forEach(b=>{const off=+b.dataset.d<0?C.v0<=D.a+1:C.v0+C.s>=D.a+Math.max(DY_MIN,D.b-D.a)-1;b.disabled=off;b.classList.toggle('off',off);});
  C.nav.hidden=!C.host.querySelector('.wk-ch')&&full;
  C.w=W;
}
// tap or drag reads (drag pans once zoomed in), pinch and the wheel zoom, ← → step TH.DY_STEP minutes, + − zoom, Esc clears
function dyBind(C){
  const c=C.cv,ptr=new Map();let dn=null,pz=null;
  c.style.touchAction='pan-y';
  const pw=()=>(c.getBoundingClientRect().width-DY_R)||1;
  const tAt=cx=>{const b=c.getBoundingClientRect();return C.v0+Math.min(1,Math.max(0,(cx-b.left)/pw()))*C.s;};
  const read=cx=>{C.hov=dySnap(C,tAt(cx));dyDraw(C.id);};
  const full=()=>C.s>=C.D.b-C.D.a-DY_MIN;
  c.addEventListener('pointerdown',e=>{
    if(e.pointerType==='mouse'&&e.button)return;
    ptr.set(e.pointerId,e.clientX);
    try{c.setPointerCapture(e.pointerId);}catch(_){}
    if(ptr.size===2){const[a,b]=[...ptr.values()];pz={d:Math.abs(a-b)||1,s:C.s,v0:C.v0,m:tAt((a+b)/2)};dn=null;return;}
    if(ptr.size>2)return;
    dn={x:e.clientX,v:C.v0,h:C.hov,m:0,mouse:e.pointerType==='mouse',id:e.pointerId,pan:!full()};
    if(!dn.pan)read(e.clientX);
  });
  c.addEventListener('pointermove',e=>{
    if(ptr.has(e.pointerId))ptr.set(e.pointerId,e.clientX);
    if(pz&&ptr.size===2){const[a,b]=[...ptr.values()];C.s=pz.s*pz.d/(Math.abs(a-b)||1);dyClamp(C);C.v0=pz.m-(pz.m-pz.v0)*C.s/pz.s;dyClamp(C);dyDraw(C.id);return;}
    if(dn&&dn.id===e.pointerId){
      if(!dn.m&&Math.abs(e.clientX-dn.x)>7)dn.m=1;
      if(!dn.pan)read(e.clientX);
      else if(dn.m){C.v0=dn.v-(e.clientX-dn.x)/pw()*C.s;dyClamp(C);dyDraw(C.id);}
      return;
    }
    if(!dn&&e.pointerType==='mouse'&&!e.buttons)read(e.clientX);
  });
  const up=e=>{
    if(!ptr.has(e.pointerId))return;
    ptr.delete(e.pointerId);
    if(pz){
      if(ptr.size<2){pz=null;dn=null;if(ptr.size===1){const[[id,px]]=[...ptr.entries()];dn={x:px,v:C.v0,h:C.hov,m:1,mouse:false,id,pan:!full()};}}
      return;
    }
    if(!dn||dn.id!==e.pointerId)return;
    const d=dn;dn=null;
    if(e.type==='pointercancel'||d.m)return;
    // a second tap on the reading clears it
    if(!d.mouse&&d.h!=null){const b=c.getBoundingClientRect();if(Math.abs(b.left+(d.h-C.v0)/C.s*pw()-e.clientX)<=12){C.hov=null;dyDraw(C.id);return;}}
    read(e.clientX);
  };
  c.addEventListener('pointerup',up);c.addEventListener('pointercancel',up);
  c.addEventListener('pointerleave',e=>{if(e.pointerType==='mouse'&&!dn&&C.hov!=null){C.hov=null;dyDraw(C.id);}});
  c.addEventListener('wheel',e=>{
    const ns=C.s*(e.deltaY>0?1.2:1/1.2),D=C.D,full=Math.max(DY_MIN,D.b-D.a),mn=Math.min(full,TH.DY_SPAN_MIN*DY_MIN);
    if(Math.min(full,Math.max(mn,ns))===C.s)return;
    e.preventDefault();dyZoom(C,ns,tAt(e.clientX));
  },{passive:false});
  c.addEventListener('keydown',e=>{
    const k=e.key,P=C.D.pts;
    if(k==='ArrowRight'||k==='ArrowLeft'){
      e.preventDefault();const dir=k==='ArrowRight'?1:-1,v1=C.v0+C.s;let t;
      if(C.hov==null){const q=P.filter(p=>p[0]>=C.v0&&p[0]<=v1);t=q.length?(dir>0?q[0][0]:q[q.length-1][0]):(dir>0?C.v0:v1);}
      else t=C.hov+dir*TH.DY_STEP*DY_MIN;
      C.hov=dySnap(C,t,TH.DAY_HR_DT*1000/2);
      if(C.hov<C.v0)C.v0=C.hov;else if(C.hov>C.v0+C.s)C.v0=C.hov-C.s;
      dyClamp(C);dyDraw(C.id);
    }else if(k==='+'||k==='='){e.preventDefault();dyZoom(C,C.s/1.5,C.hov);}
    else if(k==='-'||k==='_'){e.preventDefault();dyZoom(C,C.s*1.5,C.hov);}
    else if(k==='Escape'&&C.hov!=null){e.preventDefault();e.stopPropagation();C.hov=null;dyDraw(C.id);}
  });
}
window.addEventListener('resize',()=>dyDraw());
function dyLegend(D){
  const p=[];
  if(D.pts.length)p.push('<span><i class="ln"></i>Heart rate</span>');
  if(D.sleep||(D.naps||[]).length)p.push('<span><i class="sl"></i>Asleep</span>');
  if(D.off.length)p.push('<span><i class="bo"></i>Band off</span>');
  return p.length?`<div class="dy-lg">${p.join('')}</div>`:'';
}
function dyTiles(D,U){
  const t=[];
  if(D.lo)t.push(['Lowest',D.lo.v,'at '+dyHm(D.lo.t)]);
  if(D.hi)t.push(['Highest',D.hi.v,D.hi.w?'in your '+wkNoun(D.hi.w):'at '+dyHm(D.hi.t)]);
  if(D.dayMean!=null){
    const v=Math.round(D.dayMean);
    if(U.dayMean!=null){
      const u=Math.round(U.dayMean),n=rfVs(v,u,0),m=/^([▲▼]) (.*)$/.exec(n);
      t.push(['Daytime',v,`<i class="${v-u>TH.HR_NEAR?'warn':'good'}" aria-hidden="true">${m?m[1]:'●'}</i>${m?m[2]:n}`]);
    }else t.push(['Daytime',v,'building your usual']);
  }
  return t.length?`<div class="dy-tiles">${t.map(([l,v,n])=>`<div class="dy-tl"><small>${l}</small><b>${v} <em>bpm</em></b><span>${n}</span></div>`).join('')}</div>`:'';
}
// the card on Today: hidden until the band has sent a day with heart rate in the last TH.DAY_BACK days
function renderYourDay(){
  const el=$('yourDay');if(!el)return;
  if(!(S().polarDays||[]).some(r=>dyHasHr(r)&&daysAgo(r.date)>=0&&daysAgo(r.date)<=TH.DAY_BACK)){el.style.display='none';el.innerHTML='';dyOff('yd');return;}
  const D=dyDay(tdDay()),U=dyUsual(D.day),hh=String(TH.DAY_FROM).padStart(2,'0')+':00';
  const sub=D.last?'Last 24 hours':D.day===td()?`Since ${hh} yesterday`:`${hh} ${dayWd(D.prev)} to ${hh} ${dayWd(D.day)}`;
  const draw=D.pts.length||D.sleep||D.wks.length;
  // a re-render keeps the keyboard on the chart
  const ae=document.activeElement,fc=!!(ae&&el.contains(ae)&&ae.classList.contains('dy-cv'));
  el.style.display='';
  el.innerHTML=`<div class="dy-h"><b>Your day</b><span>${sub}</span><button type="button" class="dy-go" aria-label="Open strain" onclick="tdOpen('strain')">${UI.chev}</button></div>`+
    (draw?'<div id="dyHost_yd"></div>'+dyLegend(D):'')+`<div class="dy-m">${dayLine(D,U)}</div>`+dyTiles(D,U);
  if(draw)dyMount($('dyHost_yd'),D,'yd');else dyOff('yd');
  if(fc){const c=el.querySelector('.dy-cv');if(c)c.focus({preventScroll:true});}
}
