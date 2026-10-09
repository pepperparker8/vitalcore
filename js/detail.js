// ── DETAIL SHEETS (v97): tap a gauge or a factor row on Today ───────────────
// One sheet (#dtModal) shows today's value, the 30-day usual, an interactive chart of
// the last 30 days (v119) and the effect on the recovery score in plain words, plus an Edit link.
let _dtKey=null,_dtCh=null;
const dtGoal=()=>Math.round((S().profile.sleepGoal||7.5)*60);
const dtPsy=c=>mindOf(c);
const cap=s=>s.charAt(0).toUpperCase()+s.slice(1);
const dtPts=n=>{n=Math.round(n);return n===0?'no change':(n>0?'+':'−')+Math.abs(n)+(Math.abs(n)===1?' point':' points');};
const dtAvg=(fn,days=30)=>{const a=[];for(let i=1;i<=days;i++){const v=fn(dAgo(i));if(v!=null)a.push(v);}return a;};
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
  return`<div class="dt-sec">Last 30 days</div><div id="dtChart"></div>`;
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
// ── v117: the sleep sheet browses stored nights (‹ ›) and shows the detailed night from Polar ──
let _dtDate=null;                       // the night on show in the sleep sheet; null = last night
const dtNights=()=>S().sleepLogs.filter(x=>x.durMin).map(x=>x.date).sort();
const dtLastNight=()=>last(S().sleepLogs.filter(x=>x.durMin&&daysAgo(x.date)<=1));
function dtNight(dir){
  const l=dtNights();if(!l.length)return;
  const cur=_dtDate||(dtLastNight()||{}).date;
  let i=cur?l.indexOf(cur):l.length;     // with no night to show, ‹ goes to the newest stored one
  i+=dir;if(i<0||i>=l.length)return;
  _dtDate=l[i];openDetail('sleep');
}
function dtNav(cur){
  const l=dtNights(),i=cur?l.indexOf(cur):l.length;if(!l.length||(l.length<2&&cur))return'';
  const lab=cur?(cur===td()?'Last night':'Night ending '+fmtD(cur)):'Last night';
  return`<div class="dt-nav"><button type="button" aria-label="Earlier night" onclick="dtNight(-1)"${i<=0?' disabled':''}>‹</button><span>${lab}</span><button type="button" aria-label="Later night" onclick="dtNight(1)"${i>=l.length-1?' disabled':''}>›</button></div>`;
}
const PL_WORDS=['','very badly','badly','neither well nor badly','well','very well'];
// a small line over the night from Polar's sample runs ({t, dt seconds, v[]}), placed by time; one line per run
function dtSpark(runs,start,T){
  const pts=[];(runs||[]).forEach(r=>{const t0=(Date.parse(r.t)-start)/1000;if(isNaN(t0))return;const p=[];(r.v||[]).forEach((v,i)=>{if(v>0)p.push([t0+i*(r.dt||300),v]);});if(p.length>1)pts.push(p);});
  const all=pts.flat().map(p=>p[1]);if(!all.length)return'';
  const lo=Math.min(...all),hi=Math.max(...all),sp=hi-lo||1;
  return`<svg class="dt-sp" viewBox="0 0 100 24" preserveAspectRatio="none" aria-hidden="true">${pts.map(p=>`<polyline points="${p.map(([s,v])=>(Math.max(0,Math.min(100,s/T*100))).toFixed(1)+','+(22-(v-lo)/sp*20).toFixed(1)).join(' ')}"/>`).join('')}</svg>`;
}
// v127: the night cut on the sleep sheet. A cut night says what was left out and why, with Undo and Adjust; a night that may hold
// time with the band off and has no decision yet asks, with Adjust and "It is right". No app or device names.
function dtCutHTML(n){
  const x=n.data,hs=plHm(x.start);if(!hs||!plHm(x.end)||!/^\d{4}-\d{2}-\d{2}$/.test(n.date))return'';   // the date goes into a button
  const c=plCut(n),tot=plTot(x),raw=x.asleep||x.span,acts=b=>`<div class="wk-acts">${b}</div>`;
  if(c){
    const w=plWin(n,c.s,c.e),a=plHmAdd(hs,c.s),z=plHmAdd(hs,c.e),st=c.s>0,en=c.e<tot;
    const why=c.by==='you'?`You set the night to ${a} to ${z}`:st&&en?`Your band was off before ${a} and after ${z}`:st?`Your band was off from ${hs} to ${a}, so the night starts at ${a}`:`Your band was off after ${z}, so the night ends at ${z}`;
    return`<div class="wk-dup dt-cut"><div class="wk-dup-t">${UI.cut}${c.by==='you'?'Night adjusted':'Night trimmed'}</div><div class="wk-dup-s">${why}: ${fmtDur(w.asleep)} asleep, not ${fmtDur(raw)}.</div>${acts(`<button type="button" onclick="dtUncut('${n.date}')">Undo</button><button type="button" onclick="adjOpen('${n.date}')">Adjust</button>`)}</div>`;
  }
  if(!plAsk(n))return'';
  const t=plTrim(n),g=t.sig;
  const why=g.s1||g.s3?`Your band may have been off until ${plHmAdd(hs,t.at.s)}.`:g.e1||g.e3?`Your band may have been off after ${plHmAdd(hs,t.at.e)}.`
    :`This night ran ${fmtDur(x.span)}, ${fmtDur(Math.round(x.span-t.us))} over your usual.`;
  return`<div class="wk-dup dt-cut"><div class="wk-dup-t">${UI.cut}May include time with your band off</div><div class="wk-dup-s">${why}</div>${acts(`<button type="button" onclick="adjOpen('${n.date}')">Adjust</button><button type="button" onclick="dtCutOk('${n.date}')">It is right</button>`)}</div>`;
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
  const cand=[0,E.tot,E.bandOn,E.bandOff,E.firstSleep,E.lastSleep,...E.seg.flatMap(g=>[g[0],g[1]])].filter(v=>v!=null&&v>=0&&v<=E.tot);
  const pts=[...new Set(cand)].sort((a,b)=>a-b);
  _adj={date,n,E,tot:E.tot,s:c?c.s:0,e:c?c.e:E.tot,hr,cand:pts,back:document.activeElement};
  // a chip within the snap distance of one already shown is left out; As recorded always stays, it is the way back
  const hs=plHm(x.start),opt=(l,v,fix)=>v==null?null:{l,v,fix,t:plHmAdd(hs,v)},near=(o,p)=>Math.abs(o.v-p.v)<=TH.ADJ_SNAP*60;
  const uniq=a=>{a=a.filter(Boolean);const k=a.filter(o=>o.fix);a.forEach(o=>{if(!o.fix&&!k.some(p=>near(o,p)))k.push(o);});return a.filter(o=>k.includes(o));};
  _adj.sc=uniq([E.hrOk&&E.bandOn>0?opt('Band back on',E.bandOn):null,E.firstSleep>0?opt('First sleep',E.firstSleep):null,opt('As recorded',0,1)]);
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
// the detailed night from Polar: a four-row stage chart from the hypnogram, the stage minutes, Polar's score parts and
// what the body did during the night. Shown only; the recovery score keeps using the sleep record and the daily wellness.
// v119: no app or device names on screen. v127: the part outside a cut is hatched and the stage rows count only inside it.
function dtPolar(n){
  const x=n.data,span=x.span||0,start=Date.parse(x.start),T=Math.max(60,Math.round((Date.parse(x.end)-start)/1000)||span*60);
  const hm=s=>plHm(s)||'',row=(l,v)=>v?`<div class="dt-row"><span>${l}</span><b>${v}</b></div>`:'';
  const c=plCut(n),c0=c?c.s:0,c1=c?c.e:T,w=c?plWin(n,c.s,c.e):null,st=w?{deep:w.deep,rem:w.rem,light:w.light,wake:w.wake}:x.stages||{},inBed=w?w.inBed:span;
  const pc=m=>inBed&&m?` · ${Math.round(m/inBed*100)}%`:'',pct=v=>(v/T*100).toFixed(2);
  const ROW={0:0,3:1,1:2,2:3};
  let hy='';plSegs(x).forEach(([s,e,k])=>{s=Math.max(s,c0);e=Math.min(e,c1);if(e<=s||ROW[k]==null)return;hy+=`<i${k===0?' class="w"':''} style="left:${pct(s)}%;width:${Math.max(0.3,(e-s)/T*100).toFixed(2)}%;top:${ROW[k]*25+3.5}%"></i>`;});
  // the part left out: hatched, "Band off" for an automatic cut, "Left out" for yours
  const off=(a,b,e)=>b-a>0?`<b class="dt-off ${e}" style="left:${pct(a)}%;width:${pct(b-a)}%">${(b-a)/T>=0.2?`<span>${c.by==='you'?'Left out':'Band off'}</span>`:''}</b>`:'';
  if(c)hy+=off(0,c0,'s')+off(c1,T,'e');
  const [sh,sm]=hm(x.start).split(':').map(Number),mid=isNaN(sh)?'':hhmm(sh*60+sm+Math.round(T/120));
  const chart=hy?`<div class="dt-hy"><div class="dt-hyl"><span>Awake</span><span>REM</span><span>Light</span><span>Deep</span></div><div class="dt-hyp" role="img" aria-label="Sleep stages through the night">${hy}</div><div class="dt-ax"><span>${hm(x.start)}</span><span>${mid}</span><span>${hm(x.end)}</span></div></div>`:'';
  const it=x.inter||{},breaks=!c&&it.n?`${it.n} break${it.n>1?'s':''}${it.nLong?`, ${it.nLong} long`:''}`:'';
  const from=c?plHmAdd(hm(x.start),c0):hm(x.start),to=c?plHmAdd(hm(x.start),c1):hm(x.end);
  let h=`<div class="dt-sec">The night</div>${row(`Asleep from ${from} to ${to}`,fmtDur(inBed))}${chart}`;
  h+=row('Deep sleep',st.deep?fmtDur(st.deep)+pc(st.deep):'')+row('REM (dreaming)',st.rem?fmtDur(st.rem)+pc(st.rem):'')+row('Light sleep',st.light?fmtDur(st.light)+pc(st.light):'')+row('Awake',st.wake?fmtDur(st.wake)+(breaks?' · '+breaks:''):'');
  const p=x.parts||{};
  if(x.score||p.duration||p.solidity||p.refresh){
    h+=`<div class="dt-sec">Sleep score${x.score?` · ${x.score} of 100`:''}</div>`+row('Amount of sleep',p.duration)+row('Solidity',p.solidity)+row('Regeneration',p.refresh)+row('Efficiency',x.eff?x.eff+'%':'')+row('Sleep cycles',(x.cycles||[]).length||'');
  }
  const rc=x.rc||{},bpm=ms=>ms?Math.round(60000/ms):null,br=ms=>ms?(60000/ms).toFixed(1):null;   // Polar gives intervals in ms
  const mh=plMean(x.hrv),mb=plMean(x.br);   // the night's own samples when Polar gives no mean
  const hr=bpm(rc.rri),hrB=bpm(rc.baseRri),hv=rc.rmssd||(mh&&Math.round(mh)),hvB=rc.baseRmssd,bq=br(rc.resp)||(mb&&mb.toFixed(1)),bqB=br(rc.baseResp);
  const vs=(v,b,u)=>v?`${v}${u}${b?` <small>usual ${b}</small>`:''}`:'';
  if(hr||hv||bq){
    h+=`<div class="dt-sec">Your body during the night</div>`+row('Heart rate',vs(hr,hrB,' bpm'))+row('Heart rate variability',vs(hv,hvB,' ms'))+(hv?dtSpark(x.hrv,start,T):'')+row('Breathing',vs(bq,bqB,' /min'))+(bq?dtSpark(x.br,start,T):'');
  }
  if(x.rating)h+=row('You rated it',`Slept ${PL_WORDS[x.rating]}`);
  return h;
}
// v118: what one Body part (hrv, rhr) adds today, in plain words with its points and weight
function dtBodyPart(k){
  const B=calcBody(),p=B.parts[k],w=k==='hrv'?TH.W_HRV:TH.W_RHR,nm=k==='hrv'?'Heart rate variability':'Resting heart rate';
  if(!p){const m=B.missing.find(x=>x.k===k);return`Missing from Body today${m?': '+m.why:''}.`;}
  if(k==='hrv')return`${Math.round(p.pts)} of 100 for Body (${w}%): your 7-night average is ${Math.round(p.v7)} ms, usual ${Math.round(p.m)}.`;
  return`${Math.round(p.pts)} of 100 for Body (${w}%): ${Math.round(p.v)} bpm, usual ${Math.round(p.m)}.`;
}
function dtSpec(k){
  if(/^wk:/.test(k))return wkSpec(k.slice(3));   // v122: a workout (workout.js)
  const d=S(),t=td(),fresh=x=>daysAgo(x.date)<=2;
  if(k==='sleep'){
    const sl=_dtDate?d.sleepLogs.find(x=>x.date===_dtDate&&x.durMin):dtLastNight(),goal=dtGoal(),src=(sl&&sl.src)||{};
    const fn=dt=>{const s=d.sleepLogs.find(x=>x.date===dt&&x.durMin);return s&&slCounts(s)?s.durMin:null;},u=dtAvg(fn);
    const wk=/^([01]\d|2[0-3]):[0-5]\d$/.test(d.profile.wakeTime||'')?d.profile.wakeTime:'06:30',[h,m]=wk.split(':').map(Number),need=sleepNeed(strainOf(strainLoad(t)));
    const tonight=`<div class="dt-sec">Tonight</div><div class="dt-row"><span>Asleep by <b>${hhmm(h*60+m-need)}</b> for ${fmtDur(need)}</span><label class="dt-wake">wake at <input type="time" value="${wk}" onchange="setWake(this.value)" aria-label="Wake time"></label></div>${need>goal?`<div class="dt-note">${fmtDur(need-goal)} over your goal, for today's strain and recent short nights.</div>`:''}`;
    const nav=dtNav(sl?sl.date:null),gH=goal/60;
    const tr=dtTrend(dt=>{const v=fn(dt);return v==null?null:v/60;},v=>fmtDur(Math.round(v*60)),{bar:true,color:'--teal',label:'Time asleep',yfmt:v=>Math.round(v)+'h',
      barColor:v=>v>=gH?'--teal':v>=gH-1?'--teal/.5':'--amber',lines:[{v:gH,label:'Goal',color:'--teal'}],
      stats:{good:v=>v>=gH,label:'at or over your goal',unit:'nights',one:'night'},means:info=>sleepMeaning(info,goal)});
    const pn0=polarOn(_dtDate||t),pre=pn0?dtBattHTML(pn0,sl)+dtCutHTML(pn0):'';
    if(!sl)return{title:'Sleep',nav,pre,missing:`No sleep logged for last night. Enter bedtime and wake-up in Log, or tap Sync if your watch recorded it.`,link:['Log sleep',"logGo('lSleep')"],trend:tr,extra:tonight};
    const pc=Math.round(sl.durMin/goal*100),base=Math.round(slScore(sl)*0.5+35),used=last(d.sleepLogs.filter(s=>(s.score||s.durMin)&&fresh(s)));
    const ev=ciOn(dAgo(daysAgo(sl.date)+1)),late=ev&&ev.coffeeLate?`<div class="dt-note">Coffee after 14:00 the evening before.</div>`:'';
    const est=src.bed==='est'||src.wake==='est'?' · one time estimated':'';
    const pn=polarOn(sl.date),polar=pn?dtPolar(pn):'';
    // v118 (A5): Body uses the night ending today, else yesterday, never an older one
    const bs=bodyLive()?calcBody().parts.sleep:null;
    const cnt=slCounts(sl),bodyEff=!cnt?'Not counted: the battery ran out.':bs&&bs.date===sl.date?`${Math.round(bs.pts)} of 100 for Body (${TH.W_SLEEP}%): ${fmtDur(bs.durMin)} of the ${fmtDur(bs.need)} you needed.`:'Not counted today: too old.';
    return{title:'Sleep',nav,pre:pn?dtBattHTML(pn,sl)+dtCutHTML(pn):'',val:fmtDur(sl.durMin),sub:`${cnt?`${pc}% of your ${fmtDur(goal)} goal`:`Recorded until ${plHm(pn.data.end)}`}${sl.date!==t?' · night ending '+fmtD(sl.date):''}${sl.score?' · score '+sl.score:''}${est}`,
      usual:u.length?`${fmtDur(Math.round(avg(u)))}`:'Needs more nights',trend:tr,
      effect:bodyLive()?bodyEff:used&&used.date===sl.date?`Starts the score at ${base} of 100${!cnt?', from the part your band recorded.':pc>=90?': a full night.':pc>=75?': a bit short of your goal.':': well short of your goal.'}`:used?`Not counted today: the score uses the night ending ${fmtD(used.date)}.`:'Not counted today: too old.',
      link:['Edit in Log',"logGo('lSleep')"],extra:polar+late+tonight};
  }
  if(k==='form'){
    const tsb=d.intervalsData.tsb,fn=dt=>{if(dt===t&&tsb!=null)return tsb;const w=d.wellness[dt];return w&&w.ctl!=null&&w.atl!=null?Math.round((w.ctl-w.atl)*10)/10:null;},u=dtAvg(fn);
    if(tsb==null)return{title:'Form',missing:'Form (how fresh your legs are) is fitness minus recent fatigue, from your training history. Connect your training account in Settings and sync.',link:['Open Settings','openSettings()']};
    const n=tsb>0?tsb*0.5:tsb*0.3,w=zL(tsb,'tsb');
    return{title:'Form',val:(tsb>0?'+':'')+Math.round(tsb),sub:`${w} · fitness ${Math.round(d.intervalsData.ctl)} minus recent fatigue ${Math.round(d.intervalsData.atl)}`,
      usual:u.length?`${(avg(u)>0?'+':'')+Math.round(avg(u))}`:'Needs more days',trend:dtTrend(fn,sgn,{label:'Form',color:'--teal',zones:formZones(),stats:{good:v=>v>=TH.FORM_OK,label:'balanced or fresher'}}),
      effect:bodyLive()?'Not part of Body.':`${cap(dtPts(n))}.`,
      link:['Open Settings','openSettings()']};
  }
  if(k==='checkin'){
    const ci=last(d.checkins.filter(c=>ciFull(c)&&fresh(c))),fn=dt=>dtPsy(ciOn(dt)),u=dtAvg(fn);
    // the same cuts and words as Mind (calcMind)
    const tr=dtTrend(fn,v=>Math.round(v)+'/100',{label:'Check-in',min:0,max:100,yfmt:v=>Math.round(v),stats:{good:v=>v>=TH.MIND_FLAT,label:'flat or better'},
      zones:mindZones()});
    if(!ci)return{title:'Check-in',missing:'No check-in in the last three days. It takes four taps: energy, mood, stress and motivation.',link:['Check in',"logGo('lCheckin')"],trend:tr};
    const p=dtPsy(ci),e=EM,old=ci.date!==t?`From ${daysAgo(ci.date)===1?'yesterday':fmtD(ci.date)}, until you check in today. `:'';
    return{title:'Check-in',val:p>=TH.MIND_GOOD?'Good':p>=TH.MIND_FLAT?'Flat':'Strained',sub:`${old}${p}/100 · energy ${e.energy[ci.energy].toLowerCase()}, mood ${e.mood[ci.mood].toLowerCase()}, stress ${e.stress[ci.stress].toLowerCase()}, motivation ${e.motivation[ci.motivation].toLowerCase()}`,
      usual:u.length?`${Math.round(avg(u))}/100`:'Needs more days',trend:tr,
      effect:bodyLive()?'Not part of Body.':`30% of the score${p>=70?': lifts it.':p>=50?': holds it steady.':': pulls it down.'}`,
      link:['Edit in Log',"logGo('lCheckin')"]};
  }
  if(k==='hrv'){
    const hv=latestOf('hrv'),hb=wSeries('hrv'),fn=dt=>{const w=d.wellness[dt];return w&&w.hrv!=null?w.hrv:null;};
    if(!hv)return{title:'Heart rate variability',missing:'No HRV in the last three days. Your watch records it overnight; sync to refresh.',link:['Open Settings','openSettings()']};
    const b=hb.length>=RB_MIN?avg(hb):null,pc=b?Math.round((hv.v/b-1)*100):0,adj=b?Math.max(-10,Math.min(4,(hv.v/b-1)*30)):0;
    return{title:'Heart rate variability',val:Math.round(hv.v)+' ms',sub:hv.age?`from ${fmtD(dAgo(hv.age))}`:'last night',
      usual:b?`${Math.round(b)} ms`:`Building: ${hb.length} of ${RB_MIN} days`,trend:dtTrend(fn,v=>Math.round(v)+' ms',{label:'Heart rate variability',color:'--teal',yfmt:v=>Math.round(v),band:TH.HRV_FLOOR,txt:BAND_TXT.hrv,stats:{good:dtIn(1),label:'in or above your usual range'}}),
      effect:bodyLive()?dtBodyPart('hrv'):b?`${cap(dtPts(adj))}${pc>=-5?'.':`: ${-pc}% below usual.`}`:`Counts after ${RB_MIN} days of readings.`,
      link:['Open Settings','openSettings()']};
  }
  if(k==='rhr'){
    const rv=latestOf('rhr'),rb=rhrSeries(),src=rv&&rv.src,fn=dt=>{const r=rhrOn(dt);return r&&r.src===src?r.v:null;};
    if(!rv)return{title:'Resting heart rate',missing:'No resting heart rate in the last three days. Sync to refresh, or log it under Body.',link:['Log in Body',"logGo('lMeas')"]};
    const b=rb.length>=RB_MIN?avg(rb):null,df=b?Math.round(rv.v-b):0,adj=b?Math.max(-6,Math.min(2,-(rv.v-b)*0.8)):0;
    return{title:'Resting heart rate',val:Math.round(rv.v)+' bpm',sub:(rv.age?`from ${fmtD(dAgo(rv.age))}`:'today')+(src==='icu'?'':' · logged by you'),
      usual:b?`${Math.round(b)} bpm`:`Building: ${rb.length} of ${RB_MIN} days`,trend:dtTrend(fn,v=>Math.round(v)+' bpm',{label:'Resting heart rate',yfmt:v=>Math.round(v),band:TH.RHR_FLOOR,txt:BAND_TXT.rhr,stats:{good:dtIn(-1),label:'in or below your usual range'}}),
      effect:bodyLive()?dtBodyPart('rhr'):b?`${cap(dtPts(adj))}${df<=2?'.':`: ${df} bpm above usual.`}`:`Counts after ${RB_MIN} days of readings.`,
      link:src==='icu'?['Open Settings','openSettings()']:['Edit in Body',"logGo('lMeas')"]};
  }
  if(k==='breathing'){
    const pv=latestOf('resp'),pb=wSeries('resp'),fn=dt=>{const w=d.wellness[dt];return w&&w.resp!=null?w.resp:null;};
    if(!pv)return{title:'Breathing rate',missing:'No breathing rate in the last three days. Your watch records it while you sleep; sync to refresh.',link:['Open Settings','openSettings()']};
    const b=pb.length>=RB_MIN?avg(pb):null,df=b?Math.round((pv.v-b)*10)/10:0;
    const bd=rollBand(seriesFor(60,fn).filter(p=>p.v!=null).map(p=>({d:p.date,v:p.v})),0.5),lb=last(bd),watch=lb?(lb.lo+lb.hi)/2+TH.ILL_RESP:null;
    return{title:'Breathing rate, asleep',val:pv.v.toFixed(1)+' /min',sub:pv.age?`from ${fmtD(dAgo(pv.age))}`:'last night',
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
      means:info=>{const m=info.pts.filter(p=>p.v>=2);return m.length?`Moderate or worse on ${m.length} day${m.length>1?'s':''}, the latest ${fmtD(last(m).d)}.`:'None or mild.';}});
    if(!s)return{title:'Soreness',missing:'Not rated in the last three days. Soreness is part of the check-in.',link:['Check in',"logGo('lCheckin')"],trend:tr};
    return{title:'Soreness',val:EM.soreness[s],sub:`level ${s} of 4${ci.date!==t?` · from ${daysAgo(ci.date)===1?'yesterday':fmtD(ci.date)}, until you check in today`:''}`,
      usual:u.length?`${EM.soreness[Math.round(avg(u))]}`:'Needs more days',trend:tr,
      effect:(bodyLive()?'Not part of Body.':s>=2?`${cap(dtPts(-(s-1)*4))}.`:'No change.')+(s>=3?' Three days like this: log it as an injury.':''),
      link:['Edit in Log',"logGo('lCheckin')"]};
  }
  if(k==='coffee'){
    const ci=todayCI(),fn=dt=>{const c=ciOn(dt);return c?c.coffee||0:null;},u=dtAvg(fn);
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
    const load=strainLoad(t),st=strainOf(load),ref=strainRef(),tg=strainTarget(),fn=dt=>{const l=strainLoad(dt);return l?strainOf(l):0;},ws=d.workouts.filter(w=>w.date===t);
    // v127: daily activity counts, so most days have some strain; the usual is then per day, not per training day
    const u=dtAvg(fn).filter(v=>v>0),hard=strainOf(ref),ac=actLoad(t)>0,acAny=dtAvg(actLoad).some(v=>v>0);
    return{title:'Strain',val:load?st.toFixed(1):'0',sub:ws.length?ws.map(w=>esc(w.type)+(w.durMin?' '+fmtDur(w.durMin):'')).join(', ')+(ac?', plus daily activity':''):ac?(restToday()?'Planned rest day, daily activity only':'Daily activity only'):restToday()?'Planned rest day':'Nothing logged yet today',
      usual:u.length?`${(avg(u)).toFixed(1)} ${acAny?'a day':'on training days'}, hard day about ${hard.toFixed(1)}`:'Needs more training days',
      trend:dtTrend(dt=>{const l=strainLoad(dt);return l?strainOf(l):null;},v=>v.toFixed(1),{bar:true,color:'--t2',label:'Strain',yfmt:v=>Math.round(v),
        barColor:v=>v>=hard?'--text':'--t2',lines:[{v:hard,label:'Hard day',color:'--t3'}],stats:{avg:'average on training days',unit:'training days',one:'training day',good:v=>v<hard,label:'below a hard day'},
        means:info=>{const h=info.pts.filter(p=>p.v>=hard);return h.length?`${h.length} hard day${h.length>1?'s':''}, the latest ${fmtD(last(h).d)}.`:'No hard days.';}}),
      effect:tg?`Target today ${tg[0]} to ${tg[1]}${load?(st>tg[1]?': above it.':st<tg[0]?': room for more.':': in it.'):'.'}`:'',
      link:['Log a workout',"logGo('lWorkout')"]};
  }
  if(k==='recovery'&&bodyLive()){
    // v118: Body is the hero score after the parallel run: HRV, resting heart rate and sleep only, each against your own band
    const B=calcBody(),sc=B.score,h=d.bodyHist||{},fn=dt=>dt===t?sc:(h[dt]??null),u=dtAvg(fn);
    if(sc==null)return{title:'Body',missing:'No Body score yet: it needs heart rate variability or resting heart rate from your watch. Tap Sync in Settings.',link:['Open Settings','openSettings()']};
    const tr=dtTrend(fn,v=>Math.round(v),{label:'Body',color:'--gold-dk',min:0,max:100,zones:scoreZones(),stats:{good:v=>v>=scoreCuts().warn,label:'good'},means:scoreMeaning});
    const P=B.parts,rows=[];
    rows.push([`Heart rate variability · ${TH.W_HRV}%`,P.hrv?`${Math.round(P.hrv.pts)} of 100`:'missing']);
    rows.push([`Resting heart rate · ${TH.W_RHR}%`,P.rhr?`${Math.round(P.rhr.pts)} of 100`:'missing']);
    rows.push([`Sleep · ${TH.W_SLEEP}%`,P.sleep?`${Math.round(P.sleep.pts)} of 100`:'missing']);
    const miss=B.missing.length?`<div class="dt-note">Missing today: ${B.missing.map(m=>m.why).join('; ')}.</div>`:'';
    return{title:'Body',val:sc,sub:scoreWord(sc)+(B.conf==='low'?' · low confidence':''),
      usual:u.length?`${Math.round(avg(u))}`:'Needs more days',trend:tr,
      effect:`<div class="dt-parts">${rows.map(([l,v])=>`<div class="dt-row"><span>${l}</span><b>${v}</b></div>`).join('')}</div>${miss}`,
      link:['Open Settings','openSettings()']};
  }
  if(k==='recovery'){
    const sc=calcReadiness(),h=d.readHist||{},fn=dt=>dt===t?sc:(h[dt]??null),u=dtAvg(fn);
    if(sc==null)return{title:'Recovery',missing:'No score yet. Check in or log last night\'s sleep and it appears.',link:['Check in',"logGo('lCheckin')"]};
    const sl=last(d.sleepLogs.filter(s=>(s.score||s.durMin)&&fresh(s))),ci=last(d.checkins.filter(c=>ciFull(c)&&fresh(c))),tsb=d.intervalsData.tsb;
    const parts=[];
    parts.push(['Sleep',sl?`start ${Math.round(slScore(sl)*0.5+35)}`:'start 70, nothing logged']);
    if(tsb!=null)parts.push(['Form',dtPts(tsb>0?tsb*0.5:tsb*0.3)]);
    if(ci)parts.push(['Check-in'+(ci.date!==t?' (yesterday)':''),`30% at ${dtPsy(ci)}/100`]);
    const hv=latestOf('hrv'),hb=wSeries('hrv');if(hv&&hb.length>=RB_MIN)parts.push(['HRV',dtPts(Math.max(-10,Math.min(4,(hv.v/avg(hb)-1)*30)))]);
    const rv=latestOf('rhr'),rb=rhrSeries();if(rv&&rb.length>=RB_MIN)parts.push(['Resting HR',dtPts(Math.max(-6,Math.min(2,-(rv.v-avg(rb))*0.8)))]);
    if(ci&&ci.soreness>=2)parts.push(['Soreness'+(ci.date!==t?' (yesterday)':''),dtPts(-(ci.soreness-1)*4)]);
    const inj=d.injuries.filter(i=>i.active);if(inj.length)parts.push(['Injury',dtPts(-Math.max(...inj.map(i=>i.sev))*8)]);
    return{title:'Recovery',val:sc,sub:scoreWord(sc),
      usual:u.length?`${Math.round(avg(u))}`:'Needs more days',trend:dtTrend(fn,v=>Math.round(v),{label:'Readiness',color:'--gold-dk',min:20,max:100,zones:scoreZones(),stats:{good:v=>v>=scoreCuts().warn,label:'good or primed'},means:scoreMeaning}),
      effect:`<div class="dt-parts">${parts.map(([l,v])=>`<div class="dt-row"><span>${l}</span><b>${v}</b></div>`).join('')}</div>${(()=>{const b=calcBody().score,n=Object.values(d.bodyHist||{}).filter(v=>v!=null).length,left=Math.max(0,TH.PARALLEL_DAYS-n);return b!=null?`<div class="dt-note">Body (new): ${b} today, takes over in ${left} day${left===1?'':'s'}.</div>`:'';})()}`,
      link:['Edit in Log',"logGo('lCheckin')"]};
  }
  return null;
}
// again: a re-render of the open sheet (refreshDetail), which never asks the network
function openDetail(k,again){
  if(k!==_dtKey)_dtDate=null;           // a new sheet starts on last night
  _dtCh=null;chUnmount('dtChart');
  const wk=/^wk:/.test(k);
  if(wk&&!again)wkOpen(k.slice(3));
  if(!wk){_wkC=null;_wkRes=null;}
  const sp=dtSpec(k),el=$('dtModal');if(!sp||!el)return;
  _dtKey=k;$('dtTitle').firstChild.textContent=sp.title+' ';
  // v122: a sheet that builds its own body (the workout sheet); open notes and the chart's focus survive a re-render
  if(sp.html!=null){
    const b=$('dtBody'),op=again?[...b.querySelectorAll('details[data-k][open]')].map(x=>x.dataset.k):[];
    const fc=again&&document.activeElement&&document.activeElement.classList.contains('wk-cv');
    b.innerHTML=sp.html;
    if(!again){const m=el.querySelector('.modal');if(m)m.scrollTop=0;}
    el.classList.add('open');
    wkMount();
    op.forEach(x=>{const e=b.querySelector(`details[data-k="${x}"]`);if(e)e.open=true;});
    if(fc){const c=b.querySelector('.wk-cv');if(c)c.focus({preventScroll:true});}
    return;
  }
  let h=(sp.nav||'')+(sp.pre||'');
  if(sp.missing)h+=`<div class="dt-miss">${sp.missing}</div>`;
  else h+=`<div class="dt-big">${sp.val}</div><div class="dt-sub">${sp.sub||''}</div>${sp.usual?`<div class="dt-row dt-usual"><span>Usual, 30 days</span><b>${sp.usual}</b></div>`:''}`;
  h+=sp.trend||'';
  if(sp.effect)h+=`<div class="dt-sec">Effect on recovery</div><div class="dt-eff">${sp.effect}</div>`;
  h+=sp.extra||'';
  if(sp.link)h+=`<button class="btn-out dt-link" onclick="closeDetail();${sp.link[1]}">${sp.link[0]}</button>`;
  $('dtBody').innerHTML=h;el.classList.add('open');
  if(_dtCh&&$('dtChart'))mountChart('dtChart',{key:'dt'+k,..._dtCh});
}
function closeDetail(){_dtKey=null;_dtDate=null;_dtCh=null;_wkC=null;_wkRes=null;chUnmount('dtChart');const el=$('dtModal');if(el)el.classList.remove('open');}
function refreshDetail(){if(_dtKey)openDetail(_dtKey,1);}
