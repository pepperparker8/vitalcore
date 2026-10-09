// ── YOUR DAY (v129): heart rate around the clock, with sleep, band off and workouts ──
// One window: TH.DAY_FROM the day before to TH.DAY_FROM on the day. Today runs to that hour with a "Now" line, or after it
// the 24 hours ending now. Heart rate is the band's 5-minute means of both days. TH.DAY_GAP minutes or more with no heart
// rate outside sleep reads as band off (never at the end of today: the last download can lag, and never before a day that
// was not downloaded). Daytime = awake after the night, outside workouts. Tapping the card opens the Strain sheet for the day.
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
  const wks=(S().workouts||[]).filter(w=>(w.date===prev||w.date===day)&&w.durMin>0&&/^\d\d:\d\d$/.test(wIcu(w).t||''))
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
  cut(cut(raw,sleep),sleep2).forEach(([p,q])=>{if(q-p>=gap)off.push([p,q]);});
  const inW=t=>wks.find(k=>t>=k.a&&t<=k.b)||null,inS=t=>!!sleep&&t>=sleep.a&&t<=sleep.b,inS2=t=>!!sleep2&&t>=sleep2.a&&t<=sleep2.b;
  let lo=null,hi=null;for(const[t,v]of pts){if(!lo||v<lo.v)lo={v,t};if(!hi||v>hi.v)hi={v,t};}
  if(hi)hi.w=(inW(hi.t)||{}).w||null;
  const awake=sleep?pts.filter(p=>p[0]>sleep.b&&!inS2(p[0])&&!inW(p[0])).map(p=>p[1]):[],night=sleep?pts.filter(p=>inS(p[0])).map(p=>p[1]):[];
  return{day,prev,a,b,now,last,cal:!!cal,pts,sleep,sleep2,wks,off,lo,hi,
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
// the chart, shared with the Strain sheet; id keeps the hatch pattern apart. Colours are CSS variables, so it follows the theme.
function dyHrSvg(D,id,W,H){
  W=W||328;H=H||160;
  // the plot leaves a gutter on the right for the gridline numbers
  const P=W-24,y0=16,y1=H-22,span=(D.b-D.a)||1,X=t=>(t-D.a)/span*P,f=v=>(+v).toFixed(1);
  const vs=D.pts.map(p=>p[1]),vmin=Math.min(TH.DAY_GRID_LO,...vs),vmax=Math.max(TH.DAY_GRID_HI,...vs);
  const yb=y1-20,yt=y0+6,Y=v=>yb-(v-vmin)/((vmax-vmin)||1)*(yb-yt);
  const lbl=D.lo?`Heart rate, lowest ${D.lo.v} at ${dyHm(D.lo.t)}, highest ${D.hi.v}`:'No heart rate recorded';
  let s=`<svg class="dy-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${lbl}"><defs><pattern id="hx${id}" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="1.2" height="5" style="fill:var(--t3);opacity:.5"/></pattern></defs>`;
  const band=(a,b,css)=>`<rect x="${f(X(a))}" y="${y0}" width="${f(Math.max(1,X(b)-X(a)))}" height="${y1-y0}" style="${css}"/>`;
  [D.sleep,D.sleep2].forEach(z=>{if(z)s+=band(z.a,z.b,'fill:var(--teal-l)');});
  D.wks.forEach(k=>s+=band(k.a,k.b,'fill:var(--sur2)'));
  D.off.forEach(([a,b])=>s+=band(a,b,`fill:url(#hx${id})`));
  [TH.DAY_GRID_LO,TH.DAY_GRID_HI].forEach(v=>{const y=Y(v);s+=`<line x1="0" x2="${P}" y1="${f(y)}" y2="${f(y)}" style="stroke:var(--bdr);stroke-dasharray:2 3"/><text x="${W}" y="${f(y+3)}" text-anchor="end" style="font-size:9px;fill:var(--t3)">${v}</text>`;});
  s+=`<line x1="0" x2="${P}" y1="${y1}" y2="${y1}" style="stroke:var(--bdr)"/>`;
  // the line, broken where the band was off
  const segs=[];let g=[];D.pts.forEach((p,i)=>{if(i&&p[0]-D.pts[i-1][0]>=TH.DAY_GAP*DY_MIN){segs.push(g);g=[];}g.push(p);});if(g.length)segs.push(g);
  segs.forEach(q=>s+=`<polyline points="${q.map(p=>f(X(p[0]))+','+f(Y(p[1]))).join(' ')}" style="fill:none;stroke:var(--text);stroke-width:1.6;stroke-linejoin:round;stroke-linecap:round"/>`);
  if(D.lo){const cx=X(D.lo.t),cy=Y(D.lo.v),tx=Math.min(P-10,Math.max(10,cx));s+=`<circle cx="${f(cx)}" cy="${f(cy)}" r="3.5" style="fill:var(--text);stroke:var(--sur);stroke-width:1.5"/><text x="${f(tx)}" y="${f(cy+15)}" text-anchor="middle" style="font-size:10px;font-weight:600;fill:var(--text)">${D.lo.v}</text>`;}
  if(D.now)s+=`<line x1="${f(X(D.now))}" x2="${f(X(D.now))}" y1="${y0}" y2="${y1}" style="stroke:var(--t3);stroke-dasharray:3 3"/>`;
  // labels on top, in order of importance, never overlapping
  const want=[];
  if(D.sleep)want.push([D.cal?'Asleep':`Asleep ${fmtDur(D.sleep.min)}`,(D.sleep.a+D.sleep.b)/2,'fill:var(--teal);font-weight:600']);
  if(D.sleep2)want.push(['Asleep',(D.sleep2.a+D.sleep2.b)/2,'fill:var(--teal);font-weight:600']);
  [...D.wks].sort((x,y)=>(y.b-y.a)-(x.b-x.a)).forEach(k=>want.push([k.name,(k.a+k.b)/2,'fill:var(--text);font-weight:600']));
  if(D.now)want.push(['Now',D.now,'fill:var(--t2)']);
  D.off.forEach(([a,b])=>want.push(['Band off',(a+b)/2,'fill:var(--t2)']));
  const put=[];
  for(const[t,at,css]of want){
    const w=t.length*5.5,x=Math.min(W-w/2,Math.max(w/2,X(at)));
    if(put.some(([p,q])=>x-w/2<q+4&&x+w/2>p-4))continue;
    put.push([x-w/2,x+w/2]);s+=`<text x="${f(x)}" y="10" text-anchor="middle" style="font-size:10px;${css}">${esc(t)}</text>`;
  }
  // hours that are multiples of 6 (of 3 on a window of TH.DAY_TICK3 hours or less, today early on)
  const k=span<=TH.DAY_TICK3*DY_HR?3:6;
  let t=Math.ceil(D.a/DY_HR)*DY_HR;while(new Date(t).getHours()%k)t+=DY_HR;
  for(;t<=D.b;t+=k*DY_HR){const x=X(t),an=x<12?'start':x>W-12?'end':'middle';s+=`<text x="${f(x)}" y="${H-7}" text-anchor="${an}" style="font-size:10px;fill:var(--t2)">${String(new Date(t).getHours()).padStart(2,'0')}:00</text>`;}
  return s+'</svg>';
}
function dyLegend(D){
  const p=[];
  if(D.pts.length)p.push('<span><i class="ln"></i>Heart rate</span>');
  if(D.sleep)p.push('<span><i class="sl"></i>Asleep</span>');
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
  if(!(S().polarDays||[]).some(r=>dyHasHr(r)&&daysAgo(r.date)>=0&&daysAgo(r.date)<=TH.DAY_BACK)){el.style.display='none';el.innerHTML='';return;}
  const D=dyDay(tdDay()),U=dyUsual(D.day),hh=String(TH.DAY_FROM).padStart(2,'0')+':00';
  const sub=D.last?'Last 24 hours':D.day===td()?`Since ${hh} yesterday`:`${hh} ${dayWd(D.prev)} to ${hh} ${dayWd(D.day)}`;
  const draw=D.pts.length||D.sleep||D.wks.length;
  el.style.display='';
  el.innerHTML=`<div class="dy-h"><b>Your day</b><span>${sub}</span><i class="dy-go">${UI.chev}</i></div>`+
    (draw?dyHrSvg(D,'yd')+dyLegend(D):'')+`<div class="dy-m">${dayMeaning(D,U)}</div>`+dyTiles(D,U);
}
