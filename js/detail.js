// ── DETAIL SHEETS (v97): tap a gauge or a factor row on Today ───────────────
// One sheet (#dtModal) shows today's value, the 30-day usual, an interactive chart of
// the last 30 days (v119) and the effect on the recovery score in plain words, plus an Edit link.
let _dtKey=null,_dtCh=null,_dtDay=null;   // _dtDay (v129): the day Today showed when the sheet opened; null = today
const dtGoal=()=>Math.round((S().profile.sleepGoal||7.5)*60);
const dtPsy=c=>mindOf(c);
const cap=s=>s.charAt(0).toUpperCase()+s.slice(1);
const dtPts=n=>{n=Math.round(n);return n===0?'no change':(n>0?'+':'−')+Math.abs(n)+(Math.abs(n)===1?' point':' points');};
const dtAvg=(fn,days=30)=>{const o=daysAgo(_dtDay||td()),a=[];for(let i=1;i<=days;i++){const v=fn(dAgo(o+i));if(v!=null)a.push(v);}return a;};
const ciOn=date=>S().checkins.find(c=>c.date===date);
// v119: the last 30 days as an interactive chart (14 in view, drag or ‹ for the rest), with the same zones, usual
// range and lines as the matching Trends chart. The spec is kept in _dtCh and mounted once the sheet is in the page.
// o: bar, color, barColor, zones, lines, band (SD floor: a usual range from the 28 days before each day), min, max,
// yfmt, label, stats {good, label, unit, one, avg}, means(info)
function dtTrend(fn,fmt,o={}){
  const from=dAgo(29),all=seriesFor(o.band!=null?60:30,fn).filter(p=>p.v!=null).map(p=>({d:p.date,v:p.v})),pts=all.filter(p=>p.d>=from);
  if(pts.length<2)return'';
  const band=o.band!=null?rollBand(all,o.band).filter(b=>b.d>=from):null;_dtBand=band?new Map(band.map(b=>[b.d,b])):null;
  _dtCh={H:140,span:14,label:o.label,yfmt:o.yfmt||fmt,min:o.min,max:o.max,zones:o.zones,lines:o.lines,band,hi:true,
    series:[{name:o.label||'Value',type:o.bar?'bar':undefined,color:o.color||'--text',barColor:o.barColor,fmt,pts}],
    stats:{one:'day',...(o.stats||{})},means:o.means||(info=>dtMeaning(info,band,fmt,o))};
  return`<div class="dt-sec">Last 30 days</div><div class="dt-card"><div id="dtChart"></div></div>`;
}
// a 'good' test for a band chart: in or above (side 1) or in or below (side -1) the usual range of that day; set by dtTrend
let _dtBand=null;
const dtIn=side=>(v,dt)=>{const b=_dtBand&&_dtBand.get(dt);return!!b&&(side>0?v>=b.lo:v<=b.hi);};
// default line under a sheet chart (v123: one short line): the latest day's zone word, and "higher/lower than usual"
// only when it sits more than one spread from the 30-day average
function dtMeaning(info,band,fmt,o){
  if(band&&o.txt)return bandMeaning(info,band,fmt,o.txt);
  const l=info.last,z=info.zone(l.v),A=info.all.map(p=>p.v),a=avg(A),sd=Math.sqrt(avg(A.map(v=>(v-a)**2)));
  const off=A.length>=5&&sd&&Math.abs(l.v-a)>sd?(l.v>a?', higher than usual':', lower than usual'):'';
  return`${z?z.label:fmt(l.v)}${l.d===td()?' today':' on '+fmtD(l.d)}${off}.`;
}
// ── v129: the sleep sheet browses stored nights (‹ ›) with the same bar as Today's day browser ──
let _dtDate=null,_dtShown=null;         // the night picked with ‹ › (null = the day's own night); the night on show
const dtNights=()=>[...new Set(S().sleepLogs.filter(x=>x.durMin).map(x=>x.date))].sort();
const dtLastNight=()=>last(S().sleepLogs.filter(x=>x.durMin&&daysAgo(x.date)<=1));
function dtNight(dir){
  const l=dtNights();if(!l.length)return;
  const cur=_dtDate||_dtShown;let j;
  if(cur&&l.includes(cur))j=l.indexOf(cur)+dir;
  else{const p=l.filter(x=>x<=(_dtDay||td())).length;j=dir<0?p-1:p;}   // with no night on show, ‹ goes to the newest one before
  if(j<0||j>=l.length)return;
  _dtDate=l[j];openDetail('sleep');
}
function dtNav(cur){
  const l=dtNights(),t=_dtDay||td();if(!l.length)return'';
  const i=cur?l.indexOf(cur):-1,p=l.filter(x=>x<=t).length,bk=cur?i<=0:p<=0,fw=cur?i>=l.length-1:p>=l.length;
  const d=cur||t,n=daysAgo(d),pv=dAgo(n+1);
  const a=n===0?'Last night':'Night ending '+(n===1?'yesterday':n<7?dayWords(d)[0]:fmtD(d));
  const b=`${dayWd(pv)} ${pv.slice(0,7)===d.slice(0,7)?+pv.slice(8):fmtD(pv)} to ${dayWd(d)} ${fmtD(d)}`;
  const btn=(st,off,lbl,path)=>`<button type="button" class="db${off?' off':''}" onclick="dtNight(${st})" aria-label="${lbl}"${off?' disabled':''}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${path}"/></svg></button>`;
  return`<div class="dbar dt-dbar">${btn(-1,bk,'Earlier night','M15 6l-6 6l6 6')}<div class="dt"><b>${a}</b><small>${b}</small></div>${btn(1,fw,'Later night','M9 6l6 6l-6 6')}</div>`;
}
const PL_WORDS=['','very badly','badly','neither well nor badly','well','very well'];
// v127: the night cut on the sleep sheet. A cut night says what was left out and why, with Undo and Adjust; a night that may hold
// time with the band off and has no decision yet asks, with Adjust and "It is right". No app or device names.
function dtCutHTML(n){
  const x=n.data,hs=plHm(x.start);if(!hs||!plHm(x.end)||!/^\d{4}-\d{2}-\d{2}$/.test(n.date))return'';   // the date goes into a button
  const c=plCut(n),tot=plTot(x),raw=x.asleep||x.span,acts=b=>`<div class="wk-acts">${b}</div>`;
  if(c){
    const w=plWin(n,c.s,c.e),a=plHmAdd(hs,c.s),z=plHmAdd(hs,c.e),st=c.s>0,en=c.e<tot;
    const hr=c.why==='hr',why=c.by==='you'?`You set the night to ${a} to ${z}`
      :st&&en?(hr?`Your heart rate stayed high until ${a} and your band was off after ${z}`:`Your band was off before ${a} and after ${z}`)
      :st?(hr?`Your heart rate stayed above its sleeping level until ${a}, so the night starts at ${a}`:`Your band was off from ${hs} to ${a}, so the night starts at ${a}`)
      :`Your band was off after ${z}, so the night ends at ${z}`;
    return`<div class="wk-dup dt-cut"><div class="wk-dup-t">${UI.cut}${c.by==='you'?'Night adjusted':'Night trimmed'}</div><div class="wk-dup-s">${why}: ${fmtDur(w.asleep)} asleep, not ${fmtDur(raw)}.</div>${acts(`<button type="button" onclick="dtUncut('${n.date}')">Undo</button><button type="button" onclick="adjOpen('${n.date}')">Adjust</button>`)}</div>`;
  }
  if(!plAsk(n))return'';
  const t=plTrim(n),g=t.sig;
  const why=g.s5?`Your heart rate stayed above its sleeping level until ${plHmAdd(hs,t.at.s)}, so you may have been awake.`
    :g.s1||g.s3?`Your band may have been off until ${plHmAdd(hs,t.at.s)}.`:g.e1||g.e3?`Your band may have been off after ${plHmAdd(hs,t.at.e)}.`
    :`This night ran ${fmtDur(x.span)}, ${fmtDur(Math.round(x.span-t.us))} over your usual.`;
  return`<div class="wk-dup dt-cut"><div class="wk-dup-t">${UI.cut}${plAskHead(t)}</div><div class="wk-dup-s">${why}</div>${acts(`<button type="button" onclick="adjOpen('${n.date}')">Adjust</button><button type="button" onclick="dtCutOk('${n.date}')">It is right</button>`)}</div>`;
}
// v127: the band ran out of battery, so the recording stops early: the night counts as missing until you add your wake-up time
function dtBattHTML(n,sl){
  if(!n||!n.data||!n.data.batt||!/^\d{4}-\d{2}-\d{2}$/.test(n.date)||slCounts(sl||{date:n.date}))return'';
  const at=plHm(n.data.end);
  return`<div class="wk-dup dt-cut"><div class="wk-dup-t">${UI.battOff}Night cut short</div><div class="wk-dup-s">${at?`Battery ran out at ${at}. `:''}Counted as missing, not short.</div><div class="wk-acts"><button type="button" onclick="dtLogNight('${n.date}')">Add wake-up time</button></div></div>`;
}
// Log > Sleep on a given night (the sheet may show an older one)
function dtLogNight(date){closeDetail();logGo('lSleep');setTimeout(()=>{if(typeof loadSleepFor==='function')loadSleepFor(date);const w=$('slWake');if(w)w.focus({preventScroll:true});},120);}
// Undo a cut: the whole night counts again; the toast puts the cut back
function dtUncut(date){
  const r=polarOn(date);if(!r||!r.trim)return;const prev=r.trim;
  plSetTrim(date,{...prev,by:'off'});
  showToast('The whole night counts again',{label:'Undo',fn:()=>plSetTrim(date,prev)});
}
function dtCutOk(date){const r=polarOn(date);if(!r)return;plSetTrim(date,{s:0,e:plTot(r.data),by:'off'});showToast('Kept as recorded');}
// v127 Adjust a night (#adjModal): the night's stages and 24/7 heart rate with a handle at each end. Drag (snaps to a stage change,
// the band going on or off, first or last sleep), tap the chart to move the nearer handle, or use the keys; chips jump to the usual points.
// Save stores your decision ('you'; the whole night is 'off'), kept over every later download.
let _adj=null;
const ADJ_W=320,ADJ_L=8,ADJ_R=312,ADJ_ROW={0:26,3:44,1:62,2:80};
function adjOpen(date){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return;
  const n=polarOn(date),E=n&&plEdges(n);if(!E||E.tot<=TH.TRIM_GAP*60)return;
  const x=n.data,c=plCut(n),t0=plT(x.start),hr=plHrIn(t0,t0+E.tot*1000);
  const cand=[0,E.tot,E.bandOn,E.bandOff,E.hrSet,E.firstSleep,E.lastSleep,...E.seg.flatMap(g=>[g[0],g[1]])].filter(v=>v!=null&&v>=0&&v<=E.tot);
  const pts=[...new Set(cand)].sort((a,b)=>a-b);
  _adj={date,n,E,tot:E.tot,s:c?c.s:0,e:c?c.e:E.tot,hr,cand:pts,back:document.activeElement};
  // a chip within the snap distance of one already shown is left out; As recorded always stays, it is the way back
  const hs=plHm(x.start),opt=(l,v,fix)=>v==null?null:{l,v,fix,t:plHmAdd(hs,v)},near=(o,p)=>Math.abs(o.v-p.v)<=TH.ADJ_SNAP*60;
  const uniq=a=>{a=a.filter(Boolean);const k=a.filter(o=>o.fix);a.forEach(o=>{if(!o.fix&&!k.some(p=>near(o,p)))k.push(o);});return a.filter(o=>k.includes(o));};
  _adj.sc=uniq([E.hrOk&&E.bandOn>0?opt('Band back on',E.bandOn):null,E.hrSet>E.bandOn?opt('Heart rate settled',E.hrSet):null,E.firstSleep>0?opt('First sleep',E.firstSleep):null,opt('As recorded',0,1)]);
  _adj.ec=uniq([opt('As recorded',E.tot,1),E.lastSleep!=null&&E.lastSleep<E.tot?opt('Last sleep',E.lastSleep):null,E.hrOk&&E.bandOff<E.tot?opt('Band off',E.bandOff):null]);
  const chip=(k,o)=>`<button type="button" class="adj-cp" data-v="${o.v}" onclick="adjSet('${k}',${o.v})">${o.l} <em>${o.t}</em></button>`;
  $('adjSc').innerHTML=_adj.sc.map(o=>chip('s',o)).join('');$('adjEc').innerHTML=_adj.ec.map(o=>chip('e',o)).join('');
  const day=(iso,o)=>new Date(iso.slice(0,10)+'T12:00:00').toLocaleDateString('en-GB',o),d0=x.start.slice(0,10),d1=x.end.slice(0,10);
  $('adjTitle').firstChild.textContent=(date===td()?'Adjust last night':`Adjust the night ending ${fmtD(date)}`)+' ';
  $('adjSub').textContent=d0===d1?day(d1,{weekday:'short',day:'numeric',month:'short'}):`${day(d0,{weekday:'short',day:'numeric'})} to ${day(d1,{weekday:'short',day:'numeric',month:'short'})}`;
  const el=$('adjModal');el.classList.add('open');const m=el.querySelector('.modal');if(m)m.scrollTop=0;
  adjWire();adjDraw();$('adjS').focus({preventScroll:true});
}
function adjClose(){const el=$('adjModal');if(el)el.classList.remove('open');const b=_adj&&_adj.back;_adj=null;if(b&&b.focus&&document.contains(b))b.focus({preventScroll:true});}
const adjX=v=>ADJ_L+(ADJ_R-ADJ_L)*v/_adj.tot;
function adjDraw(){
  const A=_adj;if(!A)return;
  const x=A.n.data,hr=A.hr&&A.hr.length>1?A.hr:null,H=hr?176:118,yB=H-24,G=TH.TRIM_GAP*60,X=adjX,f=v=>v.toFixed(1);
  let g='';
  [40,58,76,94].concat(hr?[150]:[]).forEach(y=>g+=`<line x1="${ADJ_L}" y1="${y}" x2="${ADJ_R}" y2="${y}" class="adj-gl"/>`);
  // stages: inside the window in colour, outside it greyed
  for(const[a,b,k]of A.E.seg){const y=ADJ_ROW[k];if(y==null)continue;
    for(const[p,q,inn]of[[a,Math.min(b,A.s),0],[Math.max(a,A.s),Math.min(b,A.e),1],[Math.max(a,A.e),b,0]]){if(q<=p)continue;
      g+=`<rect x="${f(X(p))}" y="${y}" width="${f(Math.max(0.8,X(q)-X(p)))}" height="14" rx="1" class="${inn?k===0?'adj-w':'adj-s':'adj-o'}"/>`;}}
  // 24/7 heart rate under the stages; a break where the band sent nothing
  if(hr){
    const t0=plT(x.start),vs=hr.map(p=>p[1]),lo=Math.min(...vs),hi=Math.max(...vs),sp=hi-lo||1,gap=TH.DAY_HR_DT*2000;
    let run=[],prev=null;const flush=()=>{if(run.length>1)g+=`<polyline points="${run.join(' ')}" class="adj-hr"/>`;run=[];};
    for(const[ms,v]of hr){const s=(ms-t0)/1000;if(s<0||s>A.tot)continue;if(prev!=null&&ms-prev>gap)flush();run.push(`${f(X(s))},${f(104+(hi-v)/sp*40)}`);prev=ms;}
    flush();
    const first=(hr[0][0]-t0)/1000;
    if(first/A.tot>=0.2)g+=`<text x="${f(X(first/2))}" y="130" class="adj-nh">no heart rate</text>`;
  }
  // the parts left out, the handles, their times and grips
  g+=`<rect x="${ADJ_L}" y="20" width="${f(X(A.s)-ADJ_L)}" height="${yB-20+4}" class="adj-ov"/><rect x="${f(X(A.e))}" y="20" width="${f(ADJ_R-X(A.e))}" height="${yB-20+4}" class="adj-ov"/>`;
  const hs=plHm(x.start);let ps=X(A.s)-18,pe=X(A.e)-18;
  if(pe-ps<38){const c=(ps+pe)/2;ps=c-19;pe=c+19;}
  ps=Math.max(0,Math.min(ADJ_W-74,ps));pe=Math.max(ps+38,Math.min(ADJ_W-36,pe));
  const gy=(20+yB)/2;
  [[A.s,ps],[A.e,pe]].forEach(([v,p])=>{const cx=X(v);
    g+=`<line x1="${f(cx)}" y1="20" x2="${f(cx)}" y2="${yB+4}" class="adj-hl"/><rect x="${f(p)}" y="0" width="36" height="18" rx="9" class="adj-pl"/><text x="${f(p+18)}" y="12.5" class="adj-pt">${plHmAdd(hs,v)}</text>`
      +`<circle cx="${f(cx)}" cy="${gy}" r="10" class="adj-gr"/><line x1="${f(cx-2.5)}" y1="${gy-4}" x2="${f(cx-2.5)}" y2="${gy+4}" class="adj-gl2"/><line x1="${f(cx+2.5)}" y1="${gy-4}" x2="${f(cx+2.5)}" y2="${gy+4}" class="adj-gl2"/>`;});
  // the hours along the bottom, every 2 on a long night
  const[sh,sm]=hs.split(':').map(Number),m0=sh*60+sm,step=A.tot>6*3600?120:60;
  for(let m=Math.ceil(m0/step)*step;m<=m0+A.tot/60;m+=step){const cx=X((m-m0)*60);g+=`<text x="${f(cx)}" y="${H-8}" class="adj-ax" text-anchor="${cx<24?'start':cx>ADJ_W-24?'end':'middle'}">${hhmm(m)}</text>`;}
  const svg=$('adjSvg');svg.setAttribute('viewBox',`0 0 ${ADJ_W} ${H}`);svg.innerHTML=g;
  // handles (focus and drag targets), chips and tiles
  [['adjS',A.s,0,A.e-G,'Start of the night'],['adjE',A.e,A.s+G,A.tot,'End of the night']].forEach(([id,v,lo,hi])=>{const h=$(id);
    h.style.left=(X(v)/ADJ_W*100)+'%';h.setAttribute('aria-valuemin',Math.round(lo/60));h.setAttribute('aria-valuemax',Math.round(hi/60));h.setAttribute('aria-valuenow',Math.round(v/60));h.setAttribute('aria-valuetext',plHmAdd(hs,v));});
  const mark=(box,cur,ok)=>box.querySelectorAll('.adj-cp').forEach(b=>{const v=+b.dataset.v,on=Math.abs(v-cur)<60;b.classList.toggle('on',on);b.setAttribute('aria-pressed',on);b.disabled=!ok(v);});
  mark($('adjSc'),A.s,v=>v<=A.e-G);mark($('adjEc'),A.e,v=>v>=A.s+G);
  const whole=A.s<=0&&A.e>=A.tot,w=plWin(A.n,A.s,A.e),raw=x.asleep||x.span,asl=whole?raw:w.asleep;
  const tile=(l,v,was)=>`<div class="adj-t"><small>${l}</small><b>${fmtDur(v)}</b>${was?`<em>was ${fmtDur(was)}</em>`:''}</div>`;
  $('adjT').innerHTML=tile('In bed',whole?x.span:w.inBed)+tile('Asleep',asl,asl!==raw?raw:0)+tile('Deep',whole&&x.stages?x.stages.deep:w.deep)+tile('Dreaming',whole&&x.stages?x.stages.rem:w.rem);
}
function adjSet(k,v){
  const A=_adj;if(!A)return;const G=TH.TRIM_GAP*60;
  A[k]=k==='s'?Math.max(0,Math.min(A.e-G,v)):Math.min(A.tot,Math.max(A.s+G,v));adjDraw();
}
// a dragged point snaps to the nearest stage change or band moment within TH.ADJ_SNAP minutes, else to the minute
function adjSnap(v){const A=_adj,r=TH.ADJ_SNAP*60;let b=null;for(const c of A.cand)if(Math.abs(c-v)<=r&&(b==null||Math.abs(c-v)<Math.abs(b-v)))b=c;return b!=null?b:Math.round(v/60)*60;}
function adjAt(ev){const b=$('adjSvg').getBoundingClientRect();return Math.max(0,Math.min(_adj.tot,((ev.clientX-b.left)/b.width*ADJ_W-ADJ_L)/(ADJ_R-ADJ_L)*_adj.tot));}
function adjKey(ev,k){
  const A=_adj;if(!A)return;const G=TH.TRIM_GAP*60,st=TH.ADJ_STEP*60,pg=TH.ADJ_PAGE*60,v=A[k];
  if(ev.key==='Escape'){ev.preventDefault();adjClose();return;}
  const to={ArrowLeft:v-st,ArrowDown:v-st,ArrowRight:v+st,ArrowUp:v+st,PageDown:v-pg,PageUp:v+pg,Home:k==='s'?0:A.s+G,End:k==='s'?A.e-G:A.tot}[ev.key];
  if(to==null)return;ev.preventDefault();adjSet(k,to);
}
// drag a handle; a tap elsewhere on the chart moves the nearer handle there (a vertical swipe still scrolls the sheet)
function adjWire(){
  const ch=$('adjCh');if(!ch||ch._w)return;ch._w=1;let tap=null;
  ['adjS','adjE'].forEach(id=>{const h=$(id),k=id==='adjS'?'s':'e';
    h.addEventListener('keydown',ev=>adjKey(ev,k));
    h.addEventListener('pointerdown',ev=>{if(!_adj||ev.button>0)return;ev.preventDefault();ev.stopPropagation();h.setPointerCapture(ev.pointerId);h.focus({preventScroll:true,focusVisible:false});_adj.drag=k;});
    h.addEventListener('pointermove',ev=>{if(_adj&&_adj.drag===k)adjSet(k,adjSnap(adjAt(ev)));});
    const end=()=>{if(_adj)_adj.drag=null;};h.addEventListener('pointerup',end);h.addEventListener('pointercancel',end);
  });
  ch.addEventListener('pointerdown',ev=>{tap=_adj?{x:ev.clientX,y:ev.clientY}:null;});
  ch.addEventListener('pointercancel',()=>{tap=null;});
  ch.addEventListener('pointerup',ev=>{if(!tap||!_adj)return;const moved=Math.abs(ev.clientX-tap.x)>8||Math.abs(ev.clientY-tap.y)>8;tap=null;if(moved)return;
    const v=adjSnap(adjAt(ev)),k=Math.abs(v-_adj.s)<=Math.abs(v-_adj.e)?'s':'e';adjSet(k,v);$(k==='s'?'adjS':'adjE').focus({preventScroll:true,focusVisible:false});});
}
function adjSave(){
  const A=_adj;if(!A)return;const r=polarOn(A.date);if(!r){adjClose();return;}
  const prev=r.trim||null,whole=A.s<=0&&A.e>=A.tot,date=A.date;
  const nt=whole?{s:0,e:A.tot,by:'off'}:{s:Math.round(A.s),e:Math.round(A.e),by:'you'};
  adjClose();plSetTrim(date,nt);
  showToast(whole?'Kept as recorded':'Night saved',{label:'Undo',fn:()=>plSetTrim(date,prev)});
}
// ── v129: the Sleep sheet in the approved order: the headline with the need bar, the stages ring, the night with the band's
// heart rate, details against your usual, the sleep score, the sleep window of TH.DAY_USUAL_N nights. Shown only: Body keeps
// using the sleep record and the daily wellness. No app or device names; the part outside a cut is hatched.
// clock minutes counted from noon, so bedtimes either side of midnight sort and take a median correctly
const slNoon=hm=>{const[h,m]=hm.split(':').map(Number);return(h*60+m+720)%1440;};
const slHmOk=x=>/^\d\d:\d\d$/.test(x||'');
const slRow=(l,v,sm)=>v?`<div class="dt-row"><span>${l}</span><b>${v}${sm||''}</b></div>`:'';
// your usual bedtime and wake-up (noon minutes): the medians of the counted nights among the TH.DAY_USUAL_N before, from TH.DAY_USUAL_MIN
function slUsualBW(date){
  const o=daysAgo(date),b=[],w=[];
  for(let i=1;i<=TH.DAY_USUAL_N;i++){const r=S().sleepLogs.find(x=>x.date===dAgo(o+i)&&x.durMin);if(r&&slCounts(r)&&slHmOk(r.bed)&&slHmOk(r.wake)){b.push(slNoon(r.bed));w.push(slNoon(r.wake));}}
  return b.length>=TH.DAY_USUAL_MIN?{bed:Math.round(dyMed(b)),wake:Math.round(dyMed(w))}:null;
}
// the comparison under a Details value: ▲ ▼ ● in words; green when better, amber when worse, grey within near
function slVs(v,u,dp,better,near){
  const s=rfVs(v,u,dp),m=/^([▲▼]) (.*)$/.exec(s),df=+v.toFixed(dp)-+u.toFixed(dp);
  const col=!m||Math.abs(df)<=(near||0)?'--t3':df*better>0?'--green':'--amber';
  return`<small><i style="color:var(${col})" aria-hidden="true">${m?m[1]:'●'}</i>${m?m[2]:s}</small>`;
}
// stage minutes: the detailed night inside its kept window, else its own totals, else deep and dreaming typed in the log
function slStages(sl,pn){
  let st=null;const x=pn&&pn.data;
  if(x&&(x.hyp||[]).length){const c=plCut(pn),w=plWin(pn,c?c.s:0,c?c.e:plTot(x));st={deep:w.deep,rem:w.rem,light:w.light,wake:w.wake};}
  else if(x&&x.stages)st={deep:x.stages.deep||0,rem:x.stages.rem||0,light:x.stages.light||0,wake:x.stages.wake||0};
  if(!st&&sl){const dp=(sl.deepH||0)*60+(sl.deepM||0),rm=(sl.remH||0)*60+(sl.remM||0);if(dp+rm)st={deep:dp,rem:rm,light:Math.max(0,sl.durMin-dp-rm),wake:0};}
  return st&&st.deep+st.rem>0?st:null;
}
const SL_ST=[['deep','Deep','--deep'],['rem','Dreaming','--rem'],['light','Light','--light'],['wake','Awake','--amber']];
function slRing(st){
  if(!st)return'';
  const on=SL_ST.filter(([k])=>st[k]>0),tot=on.reduce((a,[k])=>a+st[k],0),C=2*Math.PI*52,gap=on.length>1?1.5:0,pc=snPct(SL_ST.slice(0,3).map(([k])=>st[k]));
  let off=0,arc='';
  on.forEach(([k,,c])=>{const L=st[k]/tot*C;arc+=`<circle cx="60" cy="60" r="52" style="fill:none;stroke:var(${c});stroke-width:14;stroke-dasharray:${Math.max(0.5,L-gap).toFixed(1)} ${C.toFixed(1)};stroke-dashoffset:${(-off).toFixed(1)}"/>`;off+=L;});
  const rows=SL_ST.filter(([k])=>k!=='wake'||st.wake>0),sum=st.deep+st.rem+st.light;
  const lbl=rows.map(([k,n])=>`${n} ${fmtDur(st[k])}`).join(', ');
  return`<div class="dt-sec">Stages</div><div class="dt-card"><div class="sn-dn sl-ring"><svg viewBox="0 0 120 120" role="img" aria-label="${lbl}"><g transform="rotate(-90 60 60)">${arc}</g>`+
    `<text x="60" y="58" text-anchor="middle" class="sn-dc">${fmtDur(sum)}</text><text x="60" y="75" text-anchor="middle" class="sn-ds">asleep</text></svg>`+
    `<div class="sn-lg">${rows.map(([k,n,c],i)=>`<div class="sn-lr"><i style="background:var(${c})"></i><span>${n}</span><b>${st[k]?fmtDur(st[k]):'0min'}</b><em>${k==='wake'?'':pc[i]+'%'}</em></div>`).join('')}</div></div></div>`;
}
// the night: four stage rows and the band's heart rate on one time axis (every TH.SL_TICK hours). The part outside a cut is
// hatched ("Band off", "Awake in bed" at a start set by the heart rate, "Left out" for yours); a battery night runs on to your
// usual wake-up as "Not recorded".
function slNightSvg(pn,sl,uWake){
  const x=pn.data,s0=plT(x.start),T=plTot(x);if(s0==null||!T)return'';
  const c=plCut(pn),c0=c?c.s:0,c1=c?c.e:T,batt=!slCounts(sl);
  let D=T;
  if(batt&&uWake!=null){const q=new Date(s0),add=(uWake-(q.getHours()*60+q.getMinutes()+720)%1440)*60;if(add>T)D=add;}
  const pts=[...dyPts(dAgo(daysAgo(pn.date)+1)),...dyPts(pn.date)].filter(p=>p[0]>=s0&&p[0]<=s0+D*1000).sort((p,q)=>p[0]-q[0]);
  const hasHr=pts.length>1,yE=hasHr?124:76,H=yE+22,L=44,R=320,f=v=>(+v).toFixed(1),X=sec=>L+Math.max(0,Math.min(D,sec))/D*(R-L),XT=t=>X((t-s0)/1000);
  const ROW={0:0,3:1,1:2,2:3},COL={0:'--amber',3:'--rem',1:'--light',2:'--deep'};
  const vline=(sec,css)=>`<line x1="${f(Math.min(R-0.8,X(sec)))}" x2="${f(Math.min(R-0.8,X(sec)))}" y1="0" y2="${yE+4}" style="${css}"/>`;
  const pill=(a,b,t)=>{if((b-a)/D<0.2)return'';const w=t.length*5.6+14,m=(X(a)+X(b))/2;return`<rect x="${f(m-w/2)}" y="58" width="${f(w)}" height="16" rx="8" style="fill:var(--bg)"/><text x="${f(m)}" y="70" text-anchor="middle" style="fill:var(--t2);font-weight:600">${t}</text>`;};
  const hatch=(a,b)=>`<rect x="${f(X(a))}" y="4" width="${f(X(b)-X(a))}" height="${yE-4}" style="fill:url(#slhx)"/>`;
  let g='';
  [4,22,40,58,76].concat(hasHr?[yE]:[]).forEach(y=>g+=`<line x1="${L}" x2="${R}" y1="${y}" y2="${y}" style="stroke:var(--bdr)"/>`);
  plSegs(x).forEach(([a,b,k])=>{a=Math.max(a,c0);b=Math.min(b,c1);if(b<=a||ROW[k]==null)return;const w=X(b)-X(a);
    g+=`<rect class="st" data-s="${a}" data-e="${b}" x="${f(X(a))}" y="${6+ROW[k]*18}" width="${f(Math.max(0.6,w))}" height="14" rx="${w<3?0.5:1}" style="fill:var(${COL[k]})"/>`;});
  if(c){
    const off=(a,b,e)=>b>a?`<g class="dt-off ${e}" data-s="${a}" data-e="${b}">${hatch(a,b)}${pill(a,b,c.by==='you'?'Left out':e==='s'&&c.why==='hr'?'Awake in bed':'Band off')}</g>`:'';
    g+=off(0,c0,'s')+off(c1,T,'e');
    if(c0>0)g+=vline(c0,'stroke:var(--text);stroke-width:1.5');
    if(c1<T)g+=vline(c1,'stroke:var(--text);stroke-width:1.5');
  }
  if(batt){
    if(D>T)g+=`<g class="dt-nr" data-s="${T}" data-e="${D}">${hatch(T,D)}${pill(T,D,'Not recorded')}</g>`+vline(D,'stroke:var(--t3);stroke-dasharray:3 3');
    g+=vline(T,'stroke:var(--text);stroke-width:1.5');
  }
  if(hasHr){
    const vs=pts.map(p=>p[1]),lo=Math.min(...vs),hi=Math.max(...vs),Y=v=>115-(v-lo)/((hi-lo)||1)*22;
    const segs=[];let q=[];pts.forEach((p,i)=>{if(i&&p[0]-pts[i-1][0]>=TH.DAY_GAP*DY_MIN){segs.push(q);q=[];}q.push(p);});if(q.length)segs.push(q);
    segs.forEach(z=>{if(z.length>1)g+=`<polyline points="${z.map(p=>f(XT(p[0]))+','+f(Y(p[1]))).join(' ')}" style="fill:none;stroke:var(--text);stroke-width:1.6;stroke-linejoin:round;stroke-linecap:round"/>`;});
    const kept=pts.filter(p=>p[0]>=s0+c0*1000&&p[0]<=s0+c1*1000);
    if(kept.length){const m=kept.reduce((a,p)=>p[1]<a[1]?p:a),cx=XT(m[0]),cy=Y(m[1]);
      g+=`<circle class="dt-lo" cx="${f(cx)}" cy="${f(cy)}" r="3.2" style="fill:var(--text);stroke:var(--bg);stroke-width:1.5"/><text x="${f(Math.min(R-8,Math.max(L+8,cx)))}" y="${f(cy-9.4)}" text-anchor="middle" style="fill:var(--t2);font-weight:600">${m[1]}</text>`;}
  }
  // the time axis: the ends first, then whole hours that fit
  const ay=yE+16,put=[];let ax='';
  const place=(sec,an,t)=>{const w=t.length*5.6,xx=an==='end'?R:X(sec),x0=an==='start'?xx:an==='end'?xx-w:xx-w/2;if(put.some(([p,q])=>x0<q+6&&x0+w>p-6))return;put.push([x0,x0+w]);ax+=`<text x="${f(xx)}" y="${ay}" text-anchor="${an}" style="fill:var(--t3)">${t}</text>`;};
  place(0,'start',dyHm(s0));
  if(batt&&D>T){place(D,'end','usual wake '+hhmm(uWake+720));place(T,'middle',dyHm(s0+T*1000));}
  else place(T,'end',dyHm(s0+T*1000));
  const q0=new Date(s0);q0.setMinutes(0,0,0);let tk=q0.getTime();if(tk<=s0)tk+=DY_HR;
  for(;tk<s0+D*1000;tk+=DY_HR)if(!(new Date(tk).getHours()%TH.SL_TICK))place((tk-s0)/1000,'middle',dyHm(tk));
  const lb=[['Awake',16],['REM',34],['Light',52],['Deep',70]].concat(hasHr?[['Heart',100],['rate',112]]:[]).map(([t,y])=>`<text x="0" y="${y}" style="fill:var(--t2)">${t}</text>`).join('');
  return`<div class="dt-sec">The night</div><div class="dt-hy"><svg viewBox="0 0 320 ${H}" role="img" aria-label="Sleep stages${hasHr?' and heart rate':''} through the night">`+
    `<defs><pattern id="slhx" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="1.2" height="5" style="fill:var(--t3);opacity:.5"/></pattern></defs>${lb}<g class="dt-hyp">${g}</g>${ax}</svg></div>`;
}
// the lowest heart rate while asleep and when, from the band's 24/7 heart rate; usual = the median lowest of the nights before
function slLowest(date){
  const D=dyDay(date);if(!D.sleep)return null;
  let m=null;for(const p of D.pts)if(p[0]>=D.sleep.a&&p[0]<=D.sleep.b&&(!m||p[1]<m[1]))m=p;
  return m?{v:m[1],t:m[0],u:dyUsual(date).nightLo}:null;
}
function slDetails(sl,pn,U){
  const x=pn&&pn.data,c=pn&&plCut(pn),us=v=>v!=null?`<small>usual ${hhmm(v+720)}</small>`:'';
  let bed=slHmOk(sl.bed)?sl.bed:null,wake=slHmOk(sl.wake)?sl.wake:null;
  if(x&&(!bed||!wake)){const h=plHm(x.start);if(h){bed=bed||plHmAdd(h,c?c.s:0);wake=wake||plHmAdd(h,c?c.e:plTot(x));}}
  let h=slRow('Bedtime',bed,us(U&&U.bed))+slRow('Wake-up',wake,us(U&&U.wake)),eff=null;
  if(x&&(x.hyp||[]).length){const w=plWin(pn,c?c.s:0,c?c.e:plTot(x));eff=w.inBed?Math.round(w.asleep/w.inBed*100):null;}
  else if(bed&&wake){const sp=slSpan(bed,wake);eff=sp?Math.round(sl.durMin/sp*100):null;}
  if(eff!=null&&eff<=100)h+=slRow('Time asleep in bed',eff+'%');
  const it=(x&&x.inter)||{};
  if(!c&&it.n)h+=slRow('Breaks',String(it.n),it.nLong?`<small>${it.nLong} long</small>`:'');
  const rc=(x&&x.rc)||{},bpm=ms=>ms?Math.round(60000/ms):null,mh=x?plMean(x.hrv):null,mb=x?plMean(x.br):null;   // intervals in ms
  const lw=slLowest(sl.date),hr=bpm(rc.rri),hrB=bpm(rc.baseRri);
  if(lw)h+=slRow('Lowest heart rate',`${lw.v} bpm at ${dyHm(lw.t)}`,lw.u!=null?slVs(lw.v,Math.round(lw.u),0,-1,TH.HR_NEAR):'');
  else if(hr)h+=slRow('Heart rate overnight',`${hr} bpm`,hrB?slVs(hr,hrB,0,-1,TH.HR_NEAR):'');
  const hv=rc.rmssd||(mh&&Math.round(mh)),hvB=rc.baseRmssd;
  if(hv)h+=slRow('Heart rate variability',`${hv} ms`,hvB?slVs(hv,hvB,0,1,rc.sdRmssd||0):'');
  const bq=rc.resp?60000/rc.resp:mb,bqB=rc.baseResp?60000/rc.baseResp:null;
  if(bq)h+=slRow('Breathing',`${bq.toFixed(1)} /min`,bqB?slVs(bq,bqB,1,-1,TH.ILL_RESP):'');
  if(x&&x.rating)h+=slRow('You rated it',`Slept ${PL_WORDS[x.rating]}`);
  return h?`<div class="dt-sec">Details</div>`+h:'';
}
function slScoreSec(x){
  const p=x.parts||{};
  if(!(x.score||p.duration||p.solidity||p.refresh))return'';
  return`<div class="dt-sec">Sleep score${x.score?` · ${x.score} of 100`:''}</div>`+slRow('Amount of sleep',p.duration)+slRow('Solidity',p.solidity)+slRow('Regeneration',p.refresh)+slRow('Sleep cycles',(x.cycles||[]).length||'');
}
// one line (v123) under the sleep window: last night against your usual bedtime, else how steady your bedtime is
function winMeaning(ok,lastV,U,now){
  if(!U||ok.length<TH.DAY_USUAL_MIN)return`Your usual window builds after ${TH.DAY_USUAL_MIN} nights.`;
  const ww=TH.WIN_OK===30?'half an hour':TH.WIN_OK===60?'an hour':TH.WIN_OK+' minutes';
  if(lastV&&Math.abs(lastV.b-U.bed)>TH.WIN_OK)return`${lastV.b>U.bed?'Later':'Earlier'} to bed than usual ${now?'last night':'that night'}: ${hhmm(lastV.b+720)} against ${hhmm(U.bed+720)}.`;
  const n=ok.filter(z=>Math.abs(z.v.b-U.bed)<=TH.WIN_OK).length;
  return n*2>ok.length?`Steady: you go to bed within ${ww} of your usual most nights.`:`Your bedtime varies by more than ${ww} most nights. A steadier one helps.`;
}
// the sleep window: bed to wake-up as floating bars over the TH.DAY_USUAL_N nights ending on the night shown, your usual dashed
function slWinSvg(date,U){
  const o=daysAgo(date),N=TH.DAY_USUAL_N,sl=[];
  for(let i=N-1;i>=0;i--){const dt=dAgo(o+i),r=S().sleepLogs.find(x=>x.date===dt&&x.durMin);let v=null;
    if(r&&slCounts(r)&&slHmOk(r.bed)&&slHmOk(r.wake)){const b=slNoon(r.bed);v={b,w:b+slSpan(r.bed,r.wake)};}
    sl.push({dt,v});}
  const ok=sl.filter(z=>z.v);if(!ok.length)return'';
  const uw=U?(U.wake<U.bed?U.wake+1440:U.wake):null,stp=TH.WIN_TICK*60,f=v=>(+v).toFixed(1);
  const lo=Math.floor(Math.min(...ok.map(z=>z.v.b),U?U.bed:Infinity)/stp)*stp;
  let hi=Math.ceil(Math.max(...ok.map(z=>z.v.w),uw!=null?uw:-Infinity)/stp)*stp;if(hi<=lo)hi=lo+stp;
  const Y=m=>8+(m-lo)/(hi-lo)*122,sw=(320-36)/N;
  let g='';
  for(let m=lo;m<=hi;m+=stp)g+=`<line x1="36" x2="320" y1="${f(Y(m))}" y2="${f(Y(m))}" style="stroke:var(--bdr)"/><text x="0" y="${f(Y(m)+3)}" style="fill:var(--t3)">${hhmm(m+720)}</text>`;
  sl.forEach((z,i)=>{if(!z.v)return;g+=`<rect class="wn" data-d="${z.dt}" x="${f(36+i*sw+(sw-10)/2)}" y="${f(Y(z.v.b))}" width="10" height="${f(Math.max(2,Y(z.v.w)-Y(z.v.b)))}" rx="3" style="fill:var(--teal);opacity:${i===N-1?1:.32}"/>`;});
  if(U)[U.bed,uw].forEach(m=>g+=`<line x1="36" x2="320" y1="${f(Y(m))}" y2="${f(Y(m))}" style="stroke:var(--text);stroke-dasharray:3 3;opacity:.55"/>`);
  g+=`<text x="${f(36+sw/2)}" y="146" text-anchor="middle" style="fill:var(--t3)">${fmtD(sl[0].dt)}</text><text x="320" y="146" text-anchor="end" style="fill:var(--t3)">${fmtD(date)}</text>`;
  const line=winMeaning(ok,sl[N-1].v,U,date===td());
  return`<div class="dt-sec">Sleep window, ${N} nights</div><div class="sl-win"><svg viewBox="0 0 320 150" role="img" aria-label="Bedtime to wake-up over ${N} nights">${g}</svg><p class="dy-m">${line}</p></div>`;
}
// v118: what one Body part (hrv, rhr) adds today, in plain words with its points and weight
function dtBodyPart(k){
  const B=calcBody(_dtDay||td()),p=B.parts[k],w=k==='hrv'?TH.W_HRV:TH.W_RHR,nm=k==='hrv'?'Heart rate variability':'Resting heart rate';
  if(!p){const m=B.missing.find(x=>x.k===k);return`Missing from Body ${_dtDay?'that day':'today'}${m?': '+m.why:''}.`;}
  if(k==='hrv')return`${Math.round(p.pts)} of 100 for Body (${w}%): your 7-night average is ${Math.round(p.v7)} ms, usual ${Math.round(p.m)}.`;
  return`${Math.round(p.pts)} of 100 for Body (${w}%): ${Math.round(p.v)} bpm, usual ${Math.round(p.m)}.`;
}
// ── v129: the Recovery sheet: the day bar, a waterfall from your usual day, each part against its usual range ──
// a sheet opened from Today moves through the same days as Today's bar (‹ ›, up to TH.DAY_BACK back)
function dtDayNav(){
  const t=_dtDay||td(),n=daysAgo(t),[a,b]=dayWords(t),bk=n>=TH.DAY_BACK,fw=n===0;
  const btn=(st,off,lbl,path)=>`<button type="button" class="db${off?' off':''}" onclick="dtDayGo(${st})" aria-label="${lbl}"${off?' disabled':''}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${path}"/></svg></button>`;
  return`<div class="dbar dt-dbar">${btn(-1,bk,'Day before','M15 6l-6 6l6 6')}<div class="dt"><b>${a}</b><small>${b}</small></div>${btn(1,fw,'Day after','M9 6l6 6l-6 6')}</div>`;
}
function dtDayGo(step){
  if(!_dtKey)return;
  const n=Math.min(TH.DAY_BACK,Math.max(0,daysAgo(_dtDay||td())-step));
  _dtDay=n?dAgo(n):null;openDetail(_dtKey,1);
}
// the usual day has every part at its usual (HRV and resting heart rate at 50 points, sleep at 100, as in calcBody),
// weighted over the parts present; each part then moves it by (points − usual) × its share. The steps are rounded so
// that they add up to the score shown, and listed largest first.
function recSteps(B){
  const P=B.parts,c=[['hrv',P.hrv,TH.W_HRV,50],['rhr',P.rhr,TH.W_RHR,50],['sleep',P.sleep,TH.W_SLEEP,100]].filter(x=>x[1]);
  const W=c.reduce((a,x)=>a+x[2],0),start=c.reduce((a,x)=>a+x[3]*x[2],0)/W,s0=Math.round(start);
  const st=c.map(([k,p,w,u])=>({k,s:(p.pts-u)*w/W,r:Math.round((p.pts-u)*w/W),sh:Math.round(w/W*100)}));
  let diff=B.score-s0-st.reduce((a,x)=>a+x.r,0);
  while(diff){
    const x=st.reduce((a,b)=>diff>0?(b.s-b.r>a.s-a.r?b:a):(b.s-b.r<a.s-a.r?b:a));
    x.r+=Math.sign(diff);diff-=Math.sign(diff);
  }
  st.sort((a,b)=>Math.abs(b.s)-Math.abs(a.s));
  return{start,s0,steps:st,score:B.score,W};
}
const REC_NM={hrv:['HRV'],rhr:['Resting','heart rate'],sleep:['Sleep']};
// the waterfall: the usual day, each part's step (green up, amber down), the score
function recWfSvg(R,lastLbl){
  const lv=[R.s0];R.steps.forEach(x=>lv.push(lv[lv.length-1]+x.r));
  const lo=Math.max(0,Math.floor((Math.min(...lv)-10)/10)*10),hi=Math.max(...lv)+4,y=v=>140-(v-lo)/(hi-lo)*110;
  const n=R.steps.length+2,X=i=>12+i*248/(n-1),bw=36,txt=(x,yy,t,st)=>`<text x="${x}" y="${yy}" style="${st}">${t}</text>`;
  const val='fill:var(--text);text-anchor:middle;font-weight:600;font-size:12px',lab='fill:var(--t2);text-anchor:middle';
  let g=`<line x1="0" y1="140" x2="320" y2="140" style="stroke:var(--bdr)"/>`;
  const bar=(i,a,b,col,op)=>{const t=Math.min(y(a),y(b)),h=Math.max(1.5,Math.abs(y(a)-y(b)));return`<rect x="${X(i)}" y="${(a===b?y(a)-0.75:t).toFixed(1)}" width="${bw}" height="${h.toFixed(1)}" rx="3" style="fill:var(${col})${op?';opacity:'+op:''}"/>`;};
  const names=[['Usual','day'],...R.steps.map(x=>REC_NM[x.k]),[lastLbl]];
  g+=bar(0,lo,R.s0,'--t3',.45)+txt(X(0)+bw/2,(y(R.s0)-7).toFixed(1),R.s0,val);
  R.steps.forEach((x,i)=>{
    const a=lv[i],b=lv[i+1],up=x.r>=0;
    g+=bar(i+1,a,b,x.r>0?'--green':x.r<0?'--amber':'--t3');
    g+=txt(X(i+1)+bw/2,(up?Math.min(y(a),y(b))-7:Math.max(y(a),y(b))+15).toFixed(1),x.r>0?'+'+x.r:x.r<0?'−'+Math.abs(x.r):'0',val);
  });
  g+=bar(n-1,lo,R.score,'--gold')+txt(X(n-1)+bw/2,(y(R.score)-7).toFixed(1),R.score,val);
  for(let i=0;i<n-1;i++)g+=`<line x1="${X(i)+bw}" y1="${y(lv[i]).toFixed(1)}" x2="${X(i+1)}" y2="${y(lv[i]).toFixed(1)}" style="stroke:var(--t3);stroke-dasharray:3 3"/>`;
  names.forEach((nm,i)=>nm.forEach((w,j)=>g+=txt(X(i)+bw/2,156+12*j,w,lab)));
  return`<svg class="rc-wf" viewBox="0 0 320 176" role="img" aria-label="From your usual day ${R.s0} to ${R.score}">${g}</svg>`;
}
// one part against its usual range: value, share of the score, a word with ▲ ▼ ●, and a bar with the range shaded.
// HRV's range is the band mean ± SD/√7, the same test as its z in calcBody, so the word and the bar agree.
function recRows(B,R){
  const P=B.parts,sh=k=>{const x=R.steps.find(s=>s.k===k);return x?`${x.sh}% of the score`:'Not counted';};
  const pos=(v,a0,a1)=>Math.max(0,Math.min(100,(v-a0)/(a1-a0)*100)).toFixed(1);
  const rng=(v,lo,hi,good,mk)=>{
    const sp=hi-lo||1,a0=Math.min(lo,v)-0.75*sp,a1=Math.max(hi,v)+0.75*sp,over=v>hi,under=v<lo;
    const d=Math.max(1,Math.round(over?v-hi:lo-v)),ok=over?good>0:under?good<0:null;
    const col=ok==null?'--green':ok?'--green':'--amber',sym=over?'▲':under?'▼':'●';
    const word=over?`${d} over usual`:under?`${d} under usual`:'inside your usual';
    return{word:`<i style="color:var(${col})">${sym}</i>${word}`,
      bar:`<div class="rc-bl"><div class="u" style="left:${pos(lo,a0,a1)}%;width:${(pos(hi,a0,a1)-pos(lo,a0,a1)).toFixed(1)}%"></div><div class="m" style="left:${pos(v,a0,a1)}%;background:var(${ok===false?'--amber':ok?'--green':mk})"></div></div><div class="rc-bll"><span style="left:${pos(lo,a0,a1)}%">${Math.round(lo)}</span><span style="left:${pos(hi,a0,a1)}%">${Math.round(hi)}</span></div>`};
  };
  const out=[];
  const one=(k,l,body)=>{const m=B.missing.find(x=>x.k===k);
    if(!body)return out.push(`<div class="rc-rg"><div class="rc-h"><div class="l">${l}<small>Not counted</small></div><div class="v"><b>Missing</b><small>${m?esc(cap(m.why)):''}</small></div></div></div>`);
    out.push(`<div class="rc-rg"><div class="rc-h"><div class="l">${l}<small>${sh(k)}</small></div><div class="v"><b>${body.v}</b><small>${body.word}</small></div></div>${body.bar}</div>`);};
  if(P.hrv){const h=P.hrv,se=h.sd/TH.HRV_SE,r=rng(h.v7,h.m-se,h.m+se,1,'--teal');one('hrv','HRV, 7 nights',{v:`${Math.round(h.v7)} ms`,...r});}else one('hrv','HRV, 7 nights');
  if(P.rhr){const h=P.rhr,r=rng(h.v,h.m-h.sd,h.m+h.sd,-1,'--text');one('rhr','Resting heart rate',{v:`${Math.round(h.v)} bpm`,...r});}else one('rhr','Resting heart rate');
  if(P.sleep){const p=P.sleep,ax=Math.max(p.need,p.durMin)*1.25;
    one('sleep','Sleep',{v:fmtDur(p.durMin),word:`${Math.round(p.pct*100)}% of your ${fmtDur(p.need)} need`,
      bar:`<div class="rc-bl"><div class="n" style="left:${pos(p.need,0,ax)}%"></div><div class="m" style="left:${pos(p.durMin,0,ax)}%;background:var(--teal)"></div></div><div class="rc-bll"><span style="left:${pos(p.need,0,ax)}%">need</span></div>`});}
  else one('sleep','Sleep');
  return out.join('');
}
// one line: what lifted or lowered the score most against your usual day (v123 rule), and on today what to do when under green
const REC_UP={hrv:'strong HRV',rhr:'low resting heart rate'};
function recLine(B,R,now){
  const d=R.score-R.s0,sl=B.parts.sleep,stp=k=>R.steps.find(x=>x.k===k);
  const dn=x=>x.k==='hrv'?'low HRV':x.k==='rhr'?'raised resting heart rate':sl&&sl.pct>=1?'restless sleep':'short sleep';
  let t;
  if(d>=TH.REC_STEP){
    const w=R.steps.filter(x=>x.r>0).slice(0,2).map(x=>REC_UP[x.k]),s=stp('sleep');
    if(w.length<2&&s&&s.r>=-1)w.push('enough sleep');
    t=`Above your usual day: ${w.join(' and ')}.`;
  }else if(d<=-TH.REC_STEP){
    t=`Below your usual day: ${R.steps.filter(x=>x.r<0).sort((a,b)=>a.r-b.r).slice(0,2).map(dn).join(' and ')}.`;
  }else t='Close to your usual day.';
  const a=now?renderZone(R.score).act:null;
  return a?`${t} ${a}`:t;
}
const recCol=sc=>{const c=scoreCuts();return sc>=c.warn?'--green':sc>=c.mod?'--amber':'--red';};
// the top of a score sheet: the score, its word in the state colour, and one line
const dtHead=(sc,line)=>`<div class="dt-big">${sc}<small style="color:var(${recCol(sc)})">${scoreWord(sc)}</small></div>${line?`<div class="dt-ln">${line}</div>`:''}`;
// ── v129: the Strain sheet: today's aim, where the strain came from, heart rate zones all day, your day, this week ──
const STR_EW=['','very easy','easy','moderate','hard','very hard'];
// whole percentages that add up to 100 (largest remainder)
function snPct(vs){
  const s=vs.reduce((a,v)=>a+v,0);if(!s)return vs.map(()=>0);
  const r=vs.map(v=>v/s*100),o=r.map(Math.floor);let left=100-o.reduce((a,v)=>a+v,0);
  r.map((v,i)=>[v-o[i],i]).sort((a,b)=>b[0]-a[0]).forEach(([,i])=>{if(left>0){o[i]++;left--;}});
  return o;
}
// the line under today's aim: room left, inside it, over it, or a rest day
function snAimLine(st,tg,rest){
  if(rest)return'Rest day: keep it to everyday moving.';
  if(st>tg[1])return"Over today's aim. Keep the rest of the day easy.";
  if(st>=tg[0])return"Inside today's aim. An easy session still fits; nothing hard.";
  const v=coachVerdict();
  return`Room for about ${Math.round(tg[1]-st)} more. ${v&&v.lvl!=='ok'?'Keep it easy today.':'A full session fits.'}`;
}
function snAim(st,tg,rest){
  const P=v=>(Math.min(21,Math.max(0,v))/21*100).toFixed(1)+'%',lb=[[0,'left:0;transform:none']];
  if(tg[0]>0)lb.push([tg[0],`left:${P(tg[0])}`]);
  lb.push([tg[1],`left:${P(tg[1])}`],[21,'left:100%;transform:translateX(-100%)']);
  return`<div class="sn-sb" role="img" aria-label="Strain ${st.toFixed(1)}, aim ${tg[0]} to ${tg[1]}"><span class="sn-aim" style="left:${P(tg[0])};width:${P(tg[1]-tg[0])}"></span><span class="sn-fill" style="width:${P(st)}"></span></div>`+
    `<div class="sn-sbl" aria-hidden="true">${lb.map(([v,s])=>`<span style="${s}">${v}</span>`).join('')}</div><div class="dt-ln">${snAimLine(st,tg,rest)}</div>`;
}
// the steps of a day: the band's, else the watch's
const snSteps=t=>{const p=dayOn(t),a=p&&p.data||{};return a.steps??((S().wellness||{})[t]||{}).steps??null;};
// each workout and the time on your feet, with its share of the day's strain
function snSrc(t){
  const tot=strainLoad(t);if(!tot)return'';
  const thr=stThr(),ac=actLoad(t),it=wkOn().filter(w=>w.date===t).map(w=>{
    const e=wkEffOf(w,thr);
    return{ic:ICON[w.type]||ICON.Other,l:esc(wkLabel(w)),m:[wIcu(w).t,w.durMin?fmtDur(w.durMin):'',e?STR_EW[e.e]:''].filter(Boolean).join(' · '),v:wLoad(w),c:'--text'};
  });
  if(ac){const st=snSteps(t);it.push({ic:ICON.Walk,l:'On your feet',m:st!=null?fuN(st)+' steps':fmtDur(Math.round(actMin(t)))+' active',v:ac,c:'--t3'});}
  const pc=snPct(it.map(x=>x.v));
  return`<div class="dt-sec">Where it came from</div><div class="dt-card"><div class="sn-split" aria-hidden="true">${it.map((x,i)=>pc[i]?`<i style="width:${pc[i]}%;background:var(${x.c})"></i>`:'').join('')}</div>`+
    it.map((x,i)=>`<div class="sn-src"><span class="sn-ri">${x.ic}</span><span class="sn-l">${x.l}${x.m?`<small>${x.m}</small>`:''}</span><b><span class="sn-dot" style="background:var(${x.c})"></span>${pc[i]}%</b></div>`).join('')+'</div>';
}
// minutes easy, steady and hard while awake, from the band's heart rate against your threshold (a measured one first)
function snZoneMin(t){
  const D=dyDay(t,1),th=stThr(),m=k=>th[k]&&th[k].lthr&&!th[k].est?th[k].lthr:null;
  const lt=m('run')||m('ride')||(th.run||{}).lthr||(th.ride||{}).lthr;if(!lt||!D.pts.length)return null;
  const asl=x=>[D.sleep,D.sleep2].some(z=>z&&x>=z.a&&x<=z.b),per=TH.DAY_HR_DT/60,o={easy:0,steady:0,hard:0};
  D.pts.forEach(([x,v])=>{if(asl(x))return;const k=v>=lt*TH.ZN_HARD?'hard':v>=lt*TH.ZN_STEADY?'steady':v>=lt*TH.ZN_EASY_LO?'easy':null;if(k)o[k]+=per;});
  return o.easy+o.steady+o.hard?o:null;
}
const SN_ZN=[['easy','Easy','--green'],['steady','Steady','--amber'],['hard','Hard','--red']];
function snZones(t){
  const o=snZoneMin(t);if(!o)return'';
  const tot=o.easy+o.steady+o.hard,C=2*Math.PI*44,on=SN_ZN.filter(([k])=>o[k]),gap=on.length>1?2:0,pc=snPct(SN_ZN.map(([k])=>o[k]));
  let off=0,arc='';
  on.forEach(([k,,c])=>{const L=o[k]/tot*C;arc+=`<circle cx="56" cy="56" r="44" style="fill:none;stroke:var(${c});stroke-width:13;stroke-dasharray:${Math.max(0.5,L-gap).toFixed(1)} ${C.toFixed(1)};stroke-dashoffset:${(-off).toFixed(1)}"/>`;off+=L;});
  const lbl=SN_ZN.map(([k,n])=>`${n} ${fmtDur(o[k])}`).join(', ');
  return`<div class="dt-sec">Heart rate zones, all day</div><div class="dt-card"><div class="sn-dn"><svg viewBox="0 0 112 112" role="img" aria-label="${lbl}"><g transform="rotate(-90 56 56)">${arc}</g>`+
    `<text x="56" y="55" text-anchor="middle" class="sn-dc">${fmtDur(tot)}</text><text x="56" y="71" text-anchor="middle" class="sn-ds">in zones</text></svg>`+
    `<div class="sn-lg">${SN_ZN.map(([k,n,c],i)=>`<div class="sn-lr"><i style="background:var(${c})"></i><span>${n}</span><b>${o[k]?fmtDur(o[k]):'0min'}</b><em>${pc[i]}%</em></div>`).join('')}</div></div></div>`;
}
// your usual of one band field: the median of the TH.DAY_USUAL_N days before, from TH.DAY_USUAL_MIN days
function snUsual(t,f){
  const n0=daysAgo(t),v=[];
  for(let i=1;i<=TH.DAY_USUAL_N;i++){const r=dayOn(dAgo(n0+i)),x=r&&r.data?f(r.data,dAgo(n0+i)):null;if(x!=null)v.push(x);}
  return v.length>=TH.DAY_USUAL_MIN?dyMed(v):null;
}
// steps, active time, calories and sitting; today against "usual N a day", a past day ▲ ▼ against usual
function snTiles(t){
  const p=dayOn(t),a=p&&p.data||{},now=t===td(),tl=[];
  const vs=(v,u,fmt)=>{
    if(u==null)return'';if(now)return`usual ${fmt(u)} a day`;
    const df=Math.round(v)-Math.round(u);
    return df?`<i class="${df>0?'good':''}" aria-hidden="true">${df>0?'▲':'▼'}</i>${fmt(Math.abs(df))} ${df>0?'over':'under'} usual`:'<i aria-hidden="true">●</i>at your usual';
  };
  const st=snSteps(t);
  if(st!=null)tl.push(['Steps',fuN(st),vs(st,snUsual(t,(x,dt)=>x.steps??null),fuN)]);
  if(a.act!=null)tl.push(['Active',fmtDur(Math.round(a.act))||'0min',vs(a.act,snUsual(t,x=>x.act??null),m=>fmtDur(Math.round(m)))]);
  const ex=isExampleOnly(),wt=last(S().measurements.filter(x=>x.date<=t&&x.weight>=30&&x.weight<=250&&(ex||!x.isEx)).sort((x,y)=>x.date<y.date?-1:1));
  const kc=a.kcal!=null?a.kcal:a.met&&wt?a.met*wt.weight:null;
  if(kc)tl.push(['Calories burned',`${fuN(kc)}<em>kcal</em>`,(a.kcal!=null?'':'about, ')+(now?'so far today':'whole day')]);
  if(a.sit!=null)tl.push(['Sitting',fmtDur(Math.round(a.sit))||'0min',a.sitMax!=null?`longest ${fmtDur(a.sitMax)||'0min'}`:'']);
  return tl.length?`<div class="dt-sec">Your day</div><div class="sn-tiles">${tl.map(([l,v,n])=>`<div class="sn-tl"><small>${l}</small><b>${v}</b>${n?`<span>${n}</span>`:''}</div>`).join('')}</div>`:'';
}
// the band's heart rate over the calendar day, and how fast it came down after the main workout
function snSettleLine(st){
  if(!st)return'';const nm=wkNoun(st.w);
  if(st.min==null)return`Stayed above ${st.lvl} after your ${nm}.`;
  if(st.min<=TH.DAY_SETTLE_MIN)return st.min?`Back under ${st.lvl} within ${st.min} minutes of your ${nm}: a quick settle.`:`Back under ${st.lvl} right after your ${nm}: a quick settle.`;
  return`Took ${st.min<60?st.min+' minutes':fmtDur(st.min)} to get back under ${st.lvl} after your ${nm}.`;
}
function snHr(t){
  const D=dyDay(t,1);if(!D.pts.length)return'';
  const n=daysAgo(t),ln=snSettleLine(daySettle(D,dyUsual(t)));
  return`<div class="dt-sec">${!n?'Heart rate today':n===1?'Heart rate yesterday':'Heart rate on '+dayWords(t)[0]}</div><div class="dt-card">${dyHrSvg(D,'st')}${dyLegend(D)}${ln?`<div class="dy-m">${ln}</div>`:''}</div>`;
}
// training time since Monday against the outline's target for the week, with what is still planned this week
function snWeekInfo(){
  const P=strategy();if(!P||!P.target)return null;
  const end=6-stWd(td()),left=P.days.filter(x=>x.i<=end&&!x.done&&x.role!=='rest'&&x.role!=='race'),plan=left.reduce((a,x)=>a+((x.lo||0)+(x.hi||0))/2,0);
  const now=P.now,tg=P.target,rest=tg-now,st=now>=tg?'ahead':now+plan>=TH.WK_ON*tg?'on':'behind';
  const L=left.find(x=>x.role==='long');
  let ln=st==='ahead'?(now>tg?'Ahead: past this week\'s target already.':'Target reached for this week.'):st==='on'?'On track.':`Behind: the rest of the plan leaves about ${fmtDur(Math.max(5,Math.round((rest-plan)/5)*5))} short.`;
  if(L&&st!=='ahead'){
    const who=L.i===0?"Today's":L.i===1?"Tomorrow's":cap(wkWhen(L.date)),mid=((L.lo||0)+(L.hi||0))/2;
    ln+=` ${who} long ${wkNoun({type:L.type})} ${mid>=rest/2?'makes up most of the rest':'is still to come'}.`;
  }
  return{now,tg,st,ln};
}
function snWeek(){
  const W=snWeekInfo();if(!W)return'';
  return`<div class="dt-sec">This week</div><div class="sn-wkl"><b>${fmtDur(W.now)||'0min'}</b> <span>of about ${fmtDur(W.tg)}</span></div>`+
    `<div class="sn-wk" role="img" aria-label="${fmtDur(W.now)||'0min'} of about ${fmtDur(W.tg)}"><i style="width:${Math.min(100,W.now/W.tg*100).toFixed(1)}%"></i></div><div class="dt-ln">${W.ln}</div>`;
}
function dtSpec(k){
  if(/^wk:/.test(k))return wkSpec(k.slice(3));   // v122: a workout (workout.js)
  // v129: t is the day Today showed (_dtDay), so every value, usual and check-in is as of that day; the aim and Tonight only on today
  const d=S(),t=_dtDay||td(),o=daysAgo(t),now=!o,fresh=x=>x.date<=t&&daysAgo(x.date)-o<=2;
  const ago=x=>daysAgo(x)-o===1?(now?'yesterday':'the day before'):fmtD(x),old=x=>`from ${ago(x)}${now?', until you check in today':''}`;
  if(k==='sleep'){
    // v129: the night ending the day shown (‹ › picks another); no 30-day chart here, Trends keeps time asleep
    const sl=_dtDate?d.sleepLogs.find(x=>x.date===_dtDate&&x.durMin):now?dtLastNight():bodyNight(t),goal=dtGoal(),src=(sl&&sl.src)||{};
    _dtShown=sl?sl.date:null;
    const wk=/^([01]\d|2[0-3]):[0-5]\d$/.test(d.profile.wakeTime||'')?d.profile.wakeTime:'06:30',[h,m]=wk.split(':').map(Number),tn=sleepNeed(strainOf(strainLoad(t)));
    const tonight=`<div class="dt-sec">Tonight</div><div class="dt-row"><span>Asleep by <b>${hhmm(h*60+m-tn)}</b> for ${fmtDur(tn)}</span><label class="dt-wake">wake at <input type="time" value="${wk}" onchange="setWake(this.value)" aria-label="Wake time"></label></div>${tn>goal?`<div class="dt-note">${fmtDur(tn-goal)} over your goal, for today's strain and recent short nights.</div>`:''}`;
    const nav=dtNav(sl?sl.date:null);
    if(!sl){const pn0=polarOn(_dtDate||t);
      return{title:'Sleep',nav,pre:pn0?dtBattHTML(pn0,null)+dtCutHTML(pn0):'',missing:now?`No sleep logged for last night. Enter bedtime and wake-up in Log, or tap Sync if your watch recorded it.`:`No sleep logged for the night ending ${fmtD(t)}.`,link:['Log sleep',"logGo('lSleep')"],extra:now?tonight:''};}
    const pn=polarOn(sl.date),x=pn&&pn.data,cnt=slCounts(sl),U=slUsualBW(sl.date),pre=pn?dtBattHTML(pn,sl)+dtCutHTML(pn):'';
    const ev=ciOn(dAgo(daysAgo(sl.date)+1)),late=ev&&ev.coffeeLate?`<div class="dt-note">Coffee after 14:00 the evening before.</div>`:'';
    const night=x?slNightSvg(pn,sl,U&&U.wake):'';
    // v127: a battery night counts as missing, not short: no ring, no need bar, no score; what it means for Body and sleep debt
    if(!cnt){
      const us=v=>v!=null?`<small>usual ${hhmm(v+720)}</small>`:'',bed=slHmOk(sl.bed)?sl.bed:x&&plHm(x.start),end=x&&plHm(x.end),ub=last(d.sleepLogs.filter(s=>(s.score||s.durMin)&&fresh(s)));
      const onT=bodyNight(t)===sl?`<div class="dt-sec">On Today</div><div class="dt-card"><div class="rf none">${UI.moon}<span class="rf-l">Sleep</span><span class="rf-r"><span class="rf-v">Not counted</span><span class="rf-n"><i class="rf-g" aria-hidden="true">●</i>battery ran out</span></span></div></div>`:'';
      const det=slRow('Asleep from',bed,us(U&&U.bed))+slRow('Recorded until',end,'<small>battery ran out</small>')
        +(bodyLive()?slRow('Recovery that day','HRV and resting heart rate','<small>sleep left out</small>'):ub&&ub.date===sl.date?slRow('Recovery that day',`Starts at ${Math.round(slScore(sl)*0.5+35)} of 100`,'<small>from the part recorded</small>'):'')+slRow('Sleep debt','Nothing added');
      return{title:'Sleep',nav,pre,head:`<div class="dt-big">${fmtDur(sl.durMin)}</div><div class="dt-sub">recorded${bed?`, from ${bed}`:''} until the battery ran out</div>`,
        body:night+`<div class="dt-sec">Details</div>`+det+onT,link:['Edit in Log',"logGo('lSleep')"],extra:late+(now?tonight:'')};
    }
    const need=needOf(sl),pct=Math.round(sl.durMin/need*100),base=Math.round(slScore(sl)*0.5+35),used=last(d.sleepLogs.filter(s=>(s.score||s.durMin)&&fresh(s)));
    const est=src.bed==='est'||src.wake==='est'?' · one time estimated':'',score=x?slScoreSec(x):'';
    const bar=`<div class="sl-need" role="img" aria-label="${pct}% of what you needed"><i style="width:${Math.min(pct,100)}%"></i><u style="left:${pct>100?(100/pct*100).toFixed(1):100}%"></u></div><div class="sl-nl"><span>0</span><span>Need ${fmtDur(need)}</span></div>`;
    const head=`<div class="dt-big">${fmtDur(sl.durMin)}</div><div class="dt-sub">asleep, ${pct}% of the ${fmtDur(need)} you needed${!score&&sl.score?' · score '+sl.score:''}${est}</div>`+bar;
    // v118 (A5): Body uses the night ending that day, else the day before, never an older one
    const bs=bodyLive()?calcBody(t).parts.sleep:null;
    // a night the shown day does not use names the one it does, or says it came later or is too old
    const pc=Math.round(sl.durMin/goal*100),uD=bodyLive()?bs&&bs.date:used&&used.date,dw=now?'today':'that day';
    const notUsed=uD?`Not counted ${dw}: the score uses the night ending ${fmtD(uD)}.`:`Not counted ${dw}: ${sl.date>t?'this night came later':'too old'}.`;
    return{title:'Sleep',nav,pre,head,
      body:slRing(slStages(sl,pn))+night+slDetails(sl,pn,U)+score+slWinSvg(sl.date,U),
      effect:uD!==sl.date?notUsed:bodyLive()?`${Math.round(bs.pts)} of 100 for Body (${TH.W_SLEEP}%): ${fmtDur(bs.durMin)} of the ${fmtDur(bs.need)} you needed.`
        :`Starts the score at ${base} of 100${pc>=90?': a full night.':pc>=75?': a bit short of your goal.':': well short of your goal.'}`,
      link:['Edit in Log',"logGo('lSleep')"],extra:late+(now?tonight:'')};
  }
  if(k==='form'){
    const fn=tsbOn,tsb=fn(t),ia=now?d.intervalsData:d.wellness[t]||{},u=dtAvg(fn);
    if(tsb==null)return{title:'Form',missing:'Form (how fresh your legs are) is fitness minus recent fatigue, from your training history. Connect your training account in Settings and sync.',link:['Open Settings','openSettings()']};
    const n=tsb>0?tsb*0.5:tsb*0.3,w=zL(tsb,'tsb');
    return{title:'Form',val:(tsb>0?'+':'')+Math.round(tsb),sub:`${w} · fitness ${Math.round(ia.ctl)} minus recent fatigue ${Math.round(ia.atl)}`,
      usual:u.length?`${(avg(u)>0?'+':'')+Math.round(avg(u))}`:'Needs more days',trend:dtTrend(fn,sgn,{label:'Form',color:'--teal',zones:formZones(),stats:{good:v=>v>=TH.FORM_OK,label:'balanced or fresher'}}),
      effect:bodyLive()?'Not part of Body.':`${cap(dtPts(n))}.`,
      link:['Open Settings','openSettings()']};
  }
  if(k==='checkin'){
    const ci=last(d.checkins.filter(c=>ciFull(c)&&fresh(c))),fn=dt=>dtPsy(ciOn(dt)),u=dtAvg(fn);
    // the same cuts and words as Mind (calcMind)
    const tr=dtTrend(fn,v=>Math.round(v)+'/100',{label:'Check-in',min:0,max:100,yfmt:v=>Math.round(v),stats:{good:v=>v>=TH.MIND_FLAT,label:'flat or better'},
      zones:mindZones()});
    if(!ci)return{title:'Check-in',missing:now?'No check-in in the last three days. It takes four taps: energy, mood, stress and motivation.':`No check-in in the three days to ${fmtD(t)}.`,link:['Check in',"logGo('lCheckin')"],trend:tr};
    const p=dtPsy(ci),e=EM,was=ci.date!==t?cap(old(ci.date))+'. ':'';
    return{title:'Check-in',val:p>=TH.MIND_GOOD?'Good':p>=TH.MIND_FLAT?'Flat':'Strained',sub:`${was}${p}/100 · energy ${e.energy[ci.energy].toLowerCase()}, mood ${e.mood[ci.mood].toLowerCase()}, stress ${e.stress[ci.stress].toLowerCase()}, motivation ${e.motivation[ci.motivation].toLowerCase()}`,
      usual:u.length?`${Math.round(avg(u))}/100`:'Needs more days',trend:tr,
      effect:bodyLive()?'Not part of Body.':`30% of the score${p>=70?': lifts it.':p>=50?': holds it steady.':': pulls it down.'}`,
      link:['Edit in Log',"logGo('lCheckin')"]};
  }
  if(k==='hrv'){
    const hv=latestOf('hrv',t),hb=wSeries('hrv',30,true,t),fn=dt=>{const w=d.wellness[dt];return w&&w.hrv!=null?w.hrv:null;};
    if(!hv)return{title:'Heart rate variability',missing:now?'No HRV in the last three days. Your watch records it overnight; sync to refresh.':`No HRV in the three days to ${fmtD(t)}.`,link:['Open Settings','openSettings()']};
    const b=hb.length>=RB_MIN?avg(hb):null,pc=b?Math.round((hv.v/b-1)*100):0,adj=b?Math.max(-10,Math.min(4,(hv.v/b-1)*30)):0;
    return{title:'Heart rate variability',val:Math.round(hv.v)+' ms',sub:hv.age?`from ${fmtD(dAgo(o+hv.age))}`:now?'last night':'that night',
      usual:b?`${Math.round(b)} ms`:`Building: ${hb.length} of ${RB_MIN} days`,trend:dtTrend(fn,v=>Math.round(v)+' ms',{label:'Heart rate variability',color:'--teal',yfmt:v=>Math.round(v),band:TH.HRV_FLOOR,txt:BAND_TXT.hrv,stats:{good:dtIn(1),label:'in or above your usual range'}}),
      effect:bodyLive()?dtBodyPart('hrv'):b?`${cap(dtPts(adj))}${pc>=-5?'.':`: ${-pc}% below usual.`}`:`Counts after ${RB_MIN} days of readings.`,
      link:['Open Settings','openSettings()']};
  }
  if(k==='rhr'){
    const rv=latestOf('rhr',t),rb=rhrSeries(30,t),src=rv&&rv.src,fn=dt=>{const r=rhrOn(dt);return r&&r.src===src?r.v:null;};
    if(!rv)return{title:'Resting heart rate',missing:now?'No resting heart rate in the last three days. Sync to refresh, or log it under Body.':`No resting heart rate in the three days to ${fmtD(t)}.`,link:['Log in Body',"logGo('lMeas')"]};
    const b=rb.length>=RB_MIN?avg(rb):null,df=b?Math.round(rv.v-b):0,adj=b?Math.max(-6,Math.min(2,-(rv.v-b)*0.8)):0;
    return{title:'Resting heart rate',val:Math.round(rv.v)+' bpm',sub:(rv.age?`from ${fmtD(dAgo(o+rv.age))}`:now?'today':'that day')+(src==='icu'?'':' · logged by you'),
      usual:b?`${Math.round(b)} bpm`:`Building: ${rb.length} of ${RB_MIN} days`,trend:dtTrend(fn,v=>Math.round(v)+' bpm',{label:'Resting heart rate',yfmt:v=>Math.round(v),band:TH.RHR_FLOOR,txt:BAND_TXT.rhr,stats:{good:dtIn(-1),label:'in or below your usual range'}}),
      effect:bodyLive()?dtBodyPart('rhr'):b?`${cap(dtPts(adj))}${df<=2?'.':`: ${df} bpm above usual.`}`:`Counts after ${RB_MIN} days of readings.`,
      link:src==='icu'?['Open Settings','openSettings()']:['Edit in Body',"logGo('lMeas')"]};
  }
  if(k==='breathing'){
    const pv=latestOf('resp',t),pb=wSeries('resp',30,true,t),fn=dt=>{const w=d.wellness[dt];return w&&w.resp!=null?w.resp:null;};
    if(!pv)return{title:'Breathing rate',missing:now?'No breathing rate in the last three days. Your watch records it while you sleep; sync to refresh.':`No breathing rate in the three days to ${fmtD(t)}.`,link:['Open Settings','openSettings()']};
    const b=pb.length>=RB_MIN?avg(pb):null,df=b?Math.round((pv.v-b)*10)/10:0;
    const bd=rollBand(seriesFor(60,fn).filter(p=>p.v!=null).map(p=>({d:p.date,v:p.v})),0.5),lb=bd.find(b=>b.d===t)||last(bd),watch=lb?(lb.lo+lb.hi)/2+TH.ILL_RESP:null;
    return{title:'Breathing rate, asleep',val:pv.v.toFixed(1)+' /min',sub:pv.age?`from ${fmtD(dAgo(o+pv.age))}`:now?'last night':'that night',
      usual:b?`${b.toFixed(1)} /min`:`Building: ${pb.length} of ${RB_MIN} days`,trend:dtTrend(fn,v=>v.toFixed(1)+' /min',{label:'Breathing rate',color:'--teal',yfmt:v=>v.toFixed(1),band:0.5,txt:BAND_TXT.resp,
        lines:watch!=null?[{v:watch,label:'Illness watch',color:'--amber'}]:[],stats:{good:dtIn(-1),label:'in or below your usual range'}}),
      effect:'Not in the score. Up together with resting heart rate, it can be an early sign of illness.',
      link:['Open Settings','openSettings()']};
  }
  if(k==='soreness'){
    const ci=last(d.checkins.filter(c=>ciFull(c)&&fresh(c))),fn=dt=>{const c=ciOn(dt);return c&&c.soreness?c.soreness:null;},u=dtAvg(fn),s=ci&&ci.soreness;
    // bars from None (no bar) to Severe, as in the Trends soreness chart
    const tr=dtTrend(dt=>{const v=fn(dt);return v==null?null:v-1;},v=>EM.soreness[Math.round(v)+1]||'',{bar:true,color:'--red',label:'Soreness',min:0,max:3,yfmt:v=>String(Math.round(v)),
      barColor:v=>v>=3?'--red':v>=2?'--red/.65':'--red/.35',stats:{good:v=>v<2,label:'none or mild'},
      means:info=>{const m=info.pts.filter(p=>p.v>=2);return m.length?`Moderate or worse on ${m.length} day${m.length>1?'s':''}, the latest ${dayWord(last(m).d).replace(/^T/,'t')}.`:'None or mild.';}});
    if(!s)return{title:'Soreness',missing:now?'Not rated in the last three days. Soreness is part of the check-in.':`Not rated in the three days to ${fmtD(t)}.`,link:['Check in',"logGo('lCheckin')"],trend:tr};
    return{title:'Soreness',val:EM.soreness[s],sub:`level ${s} of 4${ci.date!==t?' · '+old(ci.date):''}`,
      usual:u.length?`${EM.soreness[Math.round(avg(u))]}`:'Needs more days',trend:tr,
      effect:(bodyLive()?'Not part of Body.':s>=2?`${cap(dtPts(-(s-1)*4))}.`:'No change.')+(s>=3?' Three days like this: log it as an injury.':''),
      link:['Edit in Log',"logGo('lCheckin')"]};
  }
  if(k==='coffee'){
    const ci=ciOn(t),fn=dt=>{const c=ciOn(dt);return c?c.coffee||0:null;},u=dtAvg(fn);
    return{title:'Coffee',val:ci?(ci.coffee||0)+(ci.coffee===4?'+ cups':ci.coffee===1?' cup':' cups'):'Not logged',sub:ci&&ci.coffeeLate?'including a cup after 14:00':'none after 14:00',
      usual:u.length?`${Math.round(avg(u)*10)/10} cups a day`:'Needs more days',trend:dtTrend(fn,v=>Math.round(v)+(Math.round(v)>=4?'+':'')+(Math.round(v)===1?' cup':' cups'),{bar:true,color:'--t2',label:'Coffee',min:0,max:4,yfmt:v=>String(Math.round(v)),
        barColor:v=>v>=3?'--amber':'--t2',lines:[{v:3,label:'3+ cups',color:'--amber'}],stats:{good:v=>v<3,label:'under 3 cups',avg:'average'},
        means:info=>cupsLine(info.avg,info.pts.filter(p=>{const c=ciOn(p.d);return c&&c.coffeeLate;}).length,info.n)}),
      effect:'Not in the score.',link:['Edit in Log',"logGo('lCheckin')"]};
  }
  if(k==='injury'){
    const inj=d.injuries.filter(i=>i.active);
    if(!inj.length)return{title:'Injuries',missing:'No active injuries. Log a niggle under Injury so recovery and the week plan allow for it.',link:['Log an injury',"logGo('lInjury')"]};
    const m=Math.max(...inj.map(i=>i.sev));
    return{title:'Injuries',val:inj.length===1?esc(inj[0].part):inj.length+' active',sub:inj.map(i=>`${esc(i.part)} (${['','mild','moderate','severe'][i.sev]}, since ${fmtD(i.date)})`).join(' · '),
      usual:'',effect:(bodyLive()?'Not part of Body.':`${cap(dtPts(-m*8))}.`)+(m>=3?' Rest until it settles.':m>=2?' No hard days for now.':''),link:['Edit in Log',"logGo('lInjury')"]};
  }
  if(k==='strain'){
    // v129: the aim, where the strain came from, heart rate zones all day, your day, the heart rate line and this week, then the 30-day chart
    const load=strainLoad(t),st=strainOf(load),ref=strainRef(),hard=strainOf(ref),tg=now?strainTarget():null,nav=dtDayNav(),ws=wkOn().filter(w=>w.date===t);
    if(!now&&!load&&!dayOn(t))return{title:'Strain',nav,missing:'Nothing was recorded for this day.'};
    const rest=now&&restToday()&&!ws.length;
    return{title:'Strain',nav,
      head:`<div class="dt-big">${load?st.toFixed(1):'0'}<small class="sn-of">of 21</small></div><div class="dt-sub">${now?(tg?`Aim today: ${tg[0]} to ${tg[1]}`:'So far today'):'Day total'}</div>`+(tg?snAim(st,tg,rest):''),
      body:snSrc(t)+snZones(t)+snTiles(t)+snHr(t)+(now?snWeek():''),
      trend:dtTrend(dt=>{const l=strainLoad(dt);return l?strainOf(l):null;},v=>v.toFixed(1),{bar:true,color:'--t2',label:'Strain',yfmt:v=>Math.round(v),
        barColor:v=>v>=hard?'--text':'--t2',lines:[{v:hard,label:'Hard day',color:'--t3'}],stats:{avg:'average on training days',unit:'training days',one:'training day',good:v=>v<hard,label:'below a hard day'},
        means:info=>{const h=info.pts.filter(p=>p.v>=hard);return h.length?`${h.length} hard day${h.length>1?'s':''}, the latest ${dayWord(last(h).d).replace(/^T/,'t')}.`:'No hard days.';}})};
  }
  if(k==='recovery'&&bodyLive()){
    // v118: Body is the hero score after the parallel run: HRV, resting heart rate and sleep only, each against your own band
    // v129: the score and one line on what moved it, a waterfall from your usual day, each part against its usual range
    const B=calcBody(t),sc=B.score,h=d.bodyHist||{},T=td(),fn=dt=>dt===t?sc:dt===T?calcBody().score:(h[dt]??null),nav=dtDayNav();
    if(sc==null)return{title:'Recovery',nav,missing:now?'No score yet: it needs heart rate variability or resting heart rate from your watch. Tap Sync in Settings.':'No score for this day: no heart rate variability or resting heart rate.',link:['Open Settings','openSettings()']};
    const R=recSteps(B),miss=B.missing.length?`<div class="dt-ln dt-mute">Missing ${now?'today':'that day'}: ${B.missing.map(m=>m.why).join('; ')}.</div>`:'';
    return{title:'Recovery',nav,head:dtHead(sc,recLine(B,R,now))+miss,
      body:`<div class="dt-sec">From your usual day to ${now?'today':'that day'}</div><div class="dt-card">${recWfSvg(R,now?'Today':dayWd(t))}</div>`+
        `<div class="dt-sec">Against your usual range</div><div class="dt-card rc-rgs">${recRows(B,R)}</div>`,
      trend:dtTrend(fn,v=>Math.round(v),{label:'Recovery',color:'--gold-dk',min:0,max:100,zones:scoreZones(),stats:{good:v=>v>=scoreCuts().warn,label:'good'},means:scoreMeaning})};
  }
  if(k==='recovery'){
    const h=d.readHist||{},sc=now?calcReadiness():h[t]??null,fn=dt=>dt===t?sc:(h[dt]??null),u=dtAvg(fn),nav=dtDayNav();
    const usual=`<div class="dt-row dt-usual"><span>Usual, 30 days</span><b>${u.length?Math.round(avg(u)):'Needs more days'}</b></div>`;
    if(!now)return sc==null?{title:'Recovery',nav,missing:'No score was recorded for this day.'}:{title:'Recovery',nav,head:dtHead(sc,'')+usual};
    if(sc==null)return{title:'Recovery',nav,missing:'No score yet. Check in or log last night\'s sleep and it appears.',link:['Check in',"logGo('lCheckin')"]};
    const sl=last(d.sleepLogs.filter(s=>(s.score||s.durMin)&&fresh(s))),ci=last(d.checkins.filter(c=>ciFull(c)&&fresh(c))),tsb=d.intervalsData.tsb;
    const parts=[];
    parts.push(['Sleep',sl?`start ${Math.round(slScore(sl)*0.5+35)}`:'start 70, nothing logged']);
    if(tsb!=null)parts.push(['Form',dtPts(tsb>0?tsb*0.5:tsb*0.3)]);
    if(ci)parts.push(['Check-in'+(ci.date!==t?' (yesterday)':''),`30% at ${dtPsy(ci)}/100`]);
    const hv=latestOf('hrv'),hb=wSeries('hrv');if(hv&&hb.length>=RB_MIN)parts.push(['HRV',dtPts(Math.max(-10,Math.min(4,(hv.v/avg(hb)-1)*30)))]);
    const rv=latestOf('rhr'),rb=rhrSeries();if(rv&&rb.length>=RB_MIN)parts.push(['Resting HR',dtPts(Math.max(-6,Math.min(2,-(rv.v-avg(rb))*0.8)))]);
    if(ci&&ci.soreness>=2)parts.push(['Soreness'+(ci.date!==t?' (yesterday)':''),dtPts(-(ci.soreness-1)*4)]);
    const inj=d.injuries.filter(i=>i.active);if(inj.length)parts.push(['Injury',dtPts(-Math.max(...inj.map(i=>i.sev))*8)]);
    return{title:'Recovery',nav,head:dtHead(sc,renderZone(sc).ins)+usual,
      trend:dtTrend(fn,v=>Math.round(v),{label:'Readiness',color:'--gold-dk',min:20,max:100,zones:scoreZones(),stats:{good:v=>v>=scoreCuts().warn,label:'good or primed'},means:scoreMeaning}),
      effect:`<div class="dt-parts">${parts.map(([l,v])=>`<div class="dt-row"><span>${l}</span><b>${v}</b></div>`).join('')}</div>${(()=>{const b=calcBody().score,n=Object.values(d.bodyHist||{}).filter(v=>v!=null).length,left=Math.max(0,TH.PARALLEL_DAYS-n);return b!=null?`<div class="dt-note">Body (new): ${b} today, takes over in ${left} day${left===1?'':'s'}.</div>`:'';})()}`,
      link:['Edit in Log',"logGo('lCheckin')"]};
  }
  return null;
}
// again: a re-render of the open sheet (refreshDetail), which never asks the network
function openDetail(k,again){
  const md=document.querySelector('#dtModal .modal'),sy=again&&md?md.scrollTop:0;   // a refresh keeps the place (read before the chart comes down); a new sheet starts at its top
  if(k!==_dtKey)_dtDate=null;           // a new sheet starts on last night
  _dtCh=null;chUnmount('dtChart');
  const wk=/^wk:/.test(k);
  if(wk&&!again)wkOpen(k.slice(3));
  if(!wk){_wkC=null;_wkRes=null;wkMapOff();}
  const sp=dtSpec(k),el=$('dtModal');if(!sp||!el)return;
  _dtKey=k;$('dtTitle').firstChild.textContent=sp.title+' ';
  // v122: a sheet that builds its own body (the workout sheet); open notes and the chart's focus survive a re-render
  if(sp.html!=null){
    const b=$('dtBody'),op=again?[...b.querySelectorAll('details[data-k][open]')].map(x=>x.dataset.k):[];
    const fc=again&&document.activeElement&&document.activeElement.classList.contains('wk-cv');
    b.innerHTML=sp.html;
    el.classList.add('open');
    wkMount();
    op.forEach(x=>{const e=b.querySelector(`details[data-k="${x}"]`);if(e)e.open=true;});
    if(fc){const c=b.querySelector('.wk-cv');if(c)c.focus({preventScroll:true});}
    if(md)md.scrollTop=sy;               // set after open and after the body is complete: a hidden or half-built sheet clamps it
    return;
  }
  let h=(sp.nav||'')+(sp.pre||'');
  if(sp.missing)h+=`<div class="dt-miss">${sp.missing}</div>`;
  else if(sp.head!=null)h+=sp.head;      // v129: a sheet that sets its own top (score, word, one line)
  else h+=`<div class="dt-big">${sp.val}</div><div class="dt-sub">${sp.sub||''}</div>${sp.usual?`<div class="dt-row dt-usual"><span>Usual, 30 days</span><b>${sp.usual}</b></div>`:''}`;
  h+=(sp.body||'')+(sp.trend||'');
  if(sp.effect)h+=`<div class="dt-sec">Effect on recovery</div><div class="dt-eff">${sp.effect}</div>`;
  h+=sp.extra||'';
  if(sp.link)h+=`<button class="btn-out dt-link" onclick="closeDetail();${sp.link[1]}">${sp.link[0]}</button>`;
  $('dtBody').innerHTML=h;
  el.classList.add('open');
  if(_dtCh&&$('dtChart'))mountChart('dtChart',{key:'dt'+k,at:_dtDay,..._dtCh});
  if(md)md.scrollTop=sy;
}
function closeDetail(){_dtKey=null;_dtDate=null;_dtShown=null;_dtDay=null;_dtCh=null;_wkC=null;_wkRes=null;wkMapOff();chUnmount('dtChart');const el=$('dtModal');if(el)el.classList.remove('open');}
function refreshDetail(){if(_dtKey)openDetail(_dtKey,1);}
