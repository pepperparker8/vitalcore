// ── CHART ENGINE: time-based charts you can zoom, pan and inspect ────────────
// Drag to pan, pinch (or wheel) to zoom, tap to inspect a day, arrow keys step through days. Range chips jump to 1M/3M/6M/1Y/All.
// mountChart(id, cfg): cfg = {series:[{name,color,dash,fill,fmt,pts:[{d:'YYYY-MM-DD',v}], type:'bar', w (days per bar, 7 = a week starting Monday), barColor(v,d), dotColor(v,d)}],
//   H, yfmt, min, max, zero, band:[{d,lo,hi}], ref:[{v,label}] (gold: the weight goal only), marks:[dates], extra(date), empty, label, key, span, wide,
//   zones:[{lo,hi,color,label}] shaded threshold bands (lo inclusive, hi exclusive, null = open; zs = the series they describe, default 0),
//   lines:[{v,label,color,dash}] threshold lines, hi (ring the high and low in view, fill the latest point),
//   stats:{s,good(v,d),label,unit,avg,one,words:['Fastest','Slowest']} the "In view" line (words rename high and low, here and on the chart), means(info) one plain sentence for the window in view, how (collapsed note),
//   group (charts that pan and zoom together)}
// Colours are CSS variable names; '--teal/.5' draws at half strength.
const _ch={};
const DN=s=>Math.floor(Date.UTC(+s.slice(0,4),+s.slice(5,7)-1,+s.slice(8,10))/864e5);
const ND=n=>new Date(n*864e5).toISOString().slice(0,10);
const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const dLab=(n,full)=>{const x=new Date(n*864e5);return(full?['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][x.getUTCDay()]+' ':'')+x.getUTCDate()+' '+MON[x.getUTCMonth()]+(full?" '"+String(x.getUTCFullYear()).slice(2):'');};
const CH_R=[['1M',30],['3M',90],['6M',180],['1Y',365],['All',0]];
const chCol=c=>{const[v,a]=String(c||'--t2').split('/');return{c:cssv(v),a:a!=null?+a:1};};
const chOff=s=>((s&&s.w)||1)/2-0.5;                 // a bar's centre, in days after its date
// the zone a value falls in, or null
function chZone(cfg,v){if(!cfg||!cfg.zones||v==null)return null;return cfg.zones.find(z=>(z.lo==null||v>=z.lo)&&(z.hi==null||v<z.hi))||null;}
// Monday-start weekly totals (or means) of daily points
function weekBuckets(pts,agg){
  const m=new Map();
  pts.forEach(p=>{if(p.v==null)return;const n=DN(p.d),k=n-((n+3)%7+7)%7;if(!m.has(k))m.set(k,[]);m.get(k).push(p.v);});
  return[...m.entries()].sort((a,b)=>a[0]-b[0]).map(([k,v])=>({d:ND(k),v:agg==='avg'?v.reduce((a,x)=>a+x,0)/v.length:v.reduce((a,x)=>a+x,0),n:v.length}));
}
// average, high, low and how many are "good" among the points whose centre is inside [a, b]
function chStatsOf(pts,a,b,good,w){
  const off=((w||1)-1)/2,v=pts.filter(p=>{const c=DN(p.d)+off;return p.v!=null&&c>=a-0.5&&c<=b+0.5;});
  if(!v.length)return{n:0,pts:v,good:null};
  let hi=v[0],lo=v[0];v.forEach(p=>{if(p.v>=hi.v)hi=p;if(p.v<=lo.v)lo=p;});
  return{n:v.length,pts:v,first:v[0],last:v[v.length-1],avg:v.reduce((s,p)=>s+p.v,0)/v.length,hi,lo,good:good?v.filter(p=>good(p.v,p.d)).length:null};
}
function chStats(id){
  const st=_ch[id];if(!st||!st.on)return null;
  const cfg=st.cfg,s=cfg.series[(cfg.stats&&cfg.stats.s)||0]||cfg.series[0];
  return{...chStatsOf(s.pts,st.view[0],st.view[1],cfg.stats&&cfg.stats.good,s.w),all:s.pts,fmt:chFmt(cfg,s),zone:v=>chZone(cfg,v),from:ND(Math.ceil(st.view[0])),to:ND(Math.min(Math.floor(st.view[1]),st.dmax))};
}
const chFmt=(cfg,s)=>s.fmt||cfg.yfmt||(v=>Math.round(v*10)/10);
function mountChart(id,cfg){
  const host=$(id);if(!host)return;
  const st=_ch[id]=_ch[id]||{};st.cfg=cfg;
  const pts=cfg.series.flatMap(s=>s.pts);
  if(pts.length<2){host.innerHTML=`<div class="vc-empty">${cfg.empty||'Not enough data yet.'}</div>`;st.on=false;return;}
  const dmin=Math.min(...pts.map(p=>DN(p.d))),dmax=Math.max(DN(td()),...cfg.series.flatMap(s=>s.pts.map(p=>DN(p.d)+((s.w||1)-1))));
  st.dmin=dmin;st.dmax=dmax;st.on=true;
  if(!st.view||st.dataKey!==cfg.key){st.dataKey=cfg.key;const span=Math.min(dmax-dmin,cfg.span||90);st.view=[dmax-Math.max(span,13),dmax];st.hover=null;}
  const howOpen=!!host.querySelector('.vc-how[open]');
  host.innerHTML=`<div class="vc-tb"><div class="vc-chips">${CH_R.map(([l,n])=>`<button data-n="${n}">${l}</button>`).join('')}</div>
    <div class="vc-nav"><button data-a="prev" aria-label="Earlier">‹</button><button class="vc-win" data-a="reset"></button><button data-a="next" aria-label="Later">›</button></div></div>
    <div class="vc-ro"></div><canvas class="vc-cv" tabindex="0" style="width:100%;height:${cfg.H||190}px;display:block"></canvas><div class="vc-sub"></div>
    ${cfg.stats?'<div class="vc-stat"></div>':''}${cfg.means?'<div class="vc-mean"></div>':''}${cfg.how?`<details class="fm-why vc-how"${howOpen?' open':''}><summary>How to read this</summary><div>${cfg.how}</div></details>`:''}`;
  st.cv=host.querySelector('canvas');st.host=host;
  host.querySelectorAll('.vc-chips button').forEach(b=>b.onclick=()=>chZoomTo(id,+b.dataset.n));
  host.querySelector('[data-a=prev]').onclick=()=>chShift(id,-0.5);host.querySelector('[data-a=next]').onclick=()=>chShift(id,0.5);
  host.querySelector('[data-a=reset]').onclick=()=>chZoomTo(id,st.view[1]-st.view[0]+1|0);
  chBind(id);chDraw(id);
}
function chUnmount(id){const st=_ch[id];if(st&&st.host)st.host.innerHTML='';delete _ch[id];}
// redraw every mounted chart (theme switch, resize): canvas colours are read from the CSS variables at draw time
function chRedrawAll(){Object.keys(_ch).forEach(id=>{const st=_ch[id];if(st.on&&st.cv&&st.cv.isConnected)chDraw(id);});if(typeof wkDraw==='function')wkDraw();}
try{matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>setTimeout(chRedrawAll,0));}catch(e){}
function chClamp(st){
  let[a,b]=st.view,span=Math.max(6,Math.min(b-a,Math.max(st.dmax-st.dmin+2,13)));
  const lo=st.dmin-2,hi=st.dmax+2;
  if(a<lo){a=lo;}b=a+span;if(b>hi){b=hi;a=b-span;if(a<lo)a=lo;}
  st.view=[a,b];
}
// draw one chart and the others in its group, kept on the same dates
function chUpd(id){
  chDraw(id);const me=_ch[id],g=me.cfg.group;if(!g)return;
  Object.keys(_ch).forEach(k=>{const o=_ch[k];if(k===id||!o.on||o.cfg.group!==g||!o.cv||!o.cv.isConnected)return;o.view=[...me.view];o.hover=me.hover;chClamp(o);chDraw(k);});
}
function chZoomTo(id,n){const st=_ch[id];if(!st)return;const end=st.dmax;st.view=n?[end-n,end]:[st.dmin,st.dmax];st.hover=null;chClamp(st);chUpd(id);}
function chShift(id,f){const st=_ch[id],s=st.view[1]-st.view[0];st.view=[st.view[0]+s*f,st.view[1]+s*f];chClamp(st);st.hover=null;chUpd(id);}
function chZoomBy(id,r,m){const st=_ch[id],[a,b]=st.view;if(m==null)m=(a+b)/2;st.view=[m-(m-a)*r,m+(b-m)*r];chClamp(st);chUpd(id);}
// snap a tapped day onto the nearest bar of the first series (bars cover more than one day)
function chSnap(st,day){const s=st.cfg.series[0];if(!s||s.type!=='bar')return day;const p=chNear(s,day);return p?DN(p.d)+chOff(s):day;}
function chBind(id){
  const st=_ch[id],c=st.cv,P=new Map();let g=null;
  c.style.touchAction='pan-y';c.style.cursor='grab';
  const px=()=>{const w=c.getBoundingClientRect().width-st.L-st.R;return w/(st.view[1]-st.view[0]);};
  const xAt=e=>e.clientX-c.getBoundingClientRect().left;
  c.onpointerdown=e=>{c.setPointerCapture?.(e.pointerId);P.set(e.pointerId,{x:xAt(e)});
    if(P.size===1)g={t:'tap',x0:xAt(e),v0:[...st.view],moved:0};
    else if(P.size===2){const[a,b]=[...P.values()];g={t:'pinch',d0:Math.abs(a.x-b.x)||1,v0:[...st.view],mid:(a.x+b.x)/2};}};
  c.onpointermove=e=>{
    if(!P.has(e.pointerId)){if(e.pointerType==='mouse'){st.hover=chSnap(st,chDayAt(st,xAt(e)));chUpd(id);}return;}
    P.get(e.pointerId).x=xAt(e);if(!g)return;
    if(g.t==='pinch'&&P.size>=2){const[pa,pb]=[...P.values()],r=g.d0/(Math.abs(pa.x-pb.x)||1),[a0,b0]=g.v0,m=a0+(g.mid-st.L)/((c.getBoundingClientRect().width-st.L-st.R)/(b0-a0));
      st.view=[m-(m-a0)*r,m-(m-a0)*r+(b0-a0)*r];chClamp(st);st.hover=null;chUpd(id);return;}
    if(g.t==='tap'||g.t==='pan'){const dx=xAt(e)-g.x0;g.moved=Math.max(g.moved,Math.abs(dx));
      if(g.moved>7){g.t='pan';const s=g.v0[1]-g.v0[0],sh=-dx/px();st.view=[g.v0[0]+sh,g.v0[0]+sh+s];chClamp(st);st.hover=null;chUpd(id);}}};
  const up=e=>{if(g&&g.t==='tap'&&g.moved<=7&&e.type==='pointerup'){const d=chSnap(st,chDayAt(st,xAt(e)));st.hover=st.hover===d?null:d;chUpd(id);}P.delete(e.pointerId);if(P.size===0)g=null;else if(P.size===1)g={t:'pan',x0:[...P.values()][0].x,v0:[...st.view],moved:99};};
  c.onpointerup=up;c.onpointercancel=up;
  c.onpointerleave=e=>{if(e.pointerType==='mouse'&&st.hover!=null){st.hover=null;chUpd(id);}};
  c.addEventListener('wheel',e=>{e.preventDefault();const m=st.view[0]+(xAt(e)-st.L)/px();st.hover=null;chZoomBy(id,e.deltaY>0?1.2:1/1.2,m);},{passive:false});
  // keyboard: arrows step through the first series' days, + and - zoom, Esc clears
  c.onkeydown=e=>{
    const k=e.key,s=st.cfg.series[0];
    if(k==='ArrowLeft'||k==='ArrowRight'){
      e.preventDefault();const days=s.pts.map(p=>DN(p.d)+chOff(s)),cur=st.hover!=null?st.hover:k==='ArrowLeft'?Math.min(st.view[1],st.dmax)+0.5:st.view[0]-0.5;
      const nx=k==='ArrowLeft'?days.filter(x=>x<cur).pop():days.find(x=>x>cur);if(nx==null)return;
      st.hover=nx;const sp=st.view[1]-st.view[0];if(nx<st.view[0]||nx>st.view[1]){st.view=[nx-sp/2,nx+sp/2];chClamp(st);}chUpd(id);
    }else if(k==='+'||k==='='){e.preventDefault();chZoomBy(id,1/1.5,st.hover);}
    else if(k==='-'||k==='_'){e.preventDefault();chZoomBy(id,1.5,st.hover);}
    else if(k==='Escape'&&st.hover!=null){st.hover=null;chUpd(id);}
  };
}
function chDayAt(st,x){return Math.round(st.view[0]+(x-st.L)/((st.cv.getBoundingClientRect().width-st.L-st.R)/(st.view[1]-st.view[0])));}
function chTicks(a,b){
  const span=b-a,out=[];
  if(span<=21){const s=span<=10?1:2;for(let d=Math.ceil(a);d<=b;d+=s)out.push([d,dLab(d)]);}
  else if(span<=70){const first=Math.ceil(a);for(let d=first;d<=b;d++)if(new Date(d*864e5).getUTCDay()===1)out.push([d,dLab(d)]);}
  else{const s=span>420?3:span>170?2:1,x=new Date(a*864e5);let y=x.getUTCFullYear(),m=x.getUTCMonth();
    for(let i=0;i<40;i++){const d=Date.UTC(y,m,1)/864e5;if(d>b)break;if(d>=a&&m%s===0)out.push([d,MON[m]+(m===0||span>420?" '"+String(y).slice(2):'')]);m++;if(m>11){m=0;y++;}}}
  return out;
}
function chDraw(id){
  const st=_ch[id];if(!st||!st.on)return;
  const{cfg,cv:c}=st,H=cfg.H||190,W=c.parentElement.clientWidth||300,r=window.devicePixelRatio||1;
  c.width=W*r;c.height=H*r;const ctx=c.getContext('2d');ctx.scale(r,r);
  st.L=cfg.wide?40:34;st.R=10;const L=st.L,R=st.R,T=10,B=22,[a,b]=st.view;
  const X=d=>L+(d-a)*(W-L-R)/(b-a),inV=d=>d>=a-1&&d<=b+1;
  const bars=cfg.series.some(s=>s.type==='bar');
  // y range from visible points, threshold lines and any zone edge close to the data
  const vis=cfg.series.flatMap(s=>s.pts.filter(p=>inV(DN(p.d)+chOff(s))).map(p=>p.v)).concat((cfg.ref||[]).map(f=>f.v),(cfg.lines||[]).map(f=>f.v),(cfg.band||[]).filter(p=>inV(DN(p.d))).flatMap(p=>[p.lo,p.hi]),bars?[0]:[]).filter(v=>v!=null);
  let mn=cfg.min,mx=cfg.max;
  if(vis.length&&(mn==null||mx==null)){
    let lo=Math.min(...vis),hi=Math.max(...vis);const rg=hi-lo||Math.abs(hi)||1;
    (cfg.zones||[]).forEach(z=>[z.lo,z.hi].forEach(e=>{if(e!=null&&e>=lo-rg*0.35&&e<=hi+rg*0.35){lo=Math.min(lo,e);hi=Math.max(hi,e);}}));
    const pad=(hi-lo)*0.12||Math.abs(hi)*0.08||1;if(mn==null)mn=bars&&lo>=0?0:lo-pad;if(mx==null)mx=hi+pad;if(cfg.zero){mn=Math.min(mn,0);mx=Math.max(mx,0);}
  }
  if(mn==null){mn=0;mx=1;}
  const Y=v=>T+(mx-v)*(H-T-B)/(mx-mn||1),yf=cfg.yfmt||(v=>Math.round(v*10)/10);
  ctx.font='500 10px Inter,sans-serif';ctx.textBaseline='middle';
  // y gridlines: the largest step of 1, 2 or 5 x 10^n that still gives 3 or more; a label that rounds the same as the last is skipped
  const rg=mx-mn||1,mag=Math.pow(10,Math.floor(Math.log10(rg/4))),cand=[1,2,5,10].map(k=>k*mag),stp=cand.filter(k=>rg/k>=3).pop()||cand[0];let lastL=null;
  for(let v=Math.ceil(mn/stp-1e-9)*stp;v<=mx+1e-9;v+=stp){
    const y=Y(v),yl=yf(Math.round(v/stp)*stp);if(yl===lastL)continue;lastL=yl;ctx.strokeStyle=cssv('--bdr');ctx.globalAlpha=v===0&&cfg.zero?1:.6;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(L,y);ctx.lineTo(W-R,y);ctx.stroke();ctx.globalAlpha=1;
    ctx.fillStyle=cssv('--t3');ctx.textAlign='right';ctx.fillText(yl,L-6,y);
  }
  ctx.textBaseline='alphabetic';ctx.textAlign='center';ctx.fillStyle=cssv('--t3');
  let tk=chTicks(a,b);const tkMax=Math.max(2,Math.floor((W-L-R)/52));while(tk.length>tkMax)tk=tk.filter((_,i)=>i%2===0);
  tk.forEach(([d,l])=>{const x=X(d);if(x<L+8||x>W-R-8)return;ctx.strokeStyle=cssv('--bdr');ctx.globalAlpha=.35;ctx.beginPath();ctx.moveTo(x,T);ctx.lineTo(x,H-B);ctx.stroke();ctx.globalAlpha=1;ctx.fillText(l,x,H-6);});
  ctx.save();ctx.beginPath();ctx.rect(L,0,W-L-R,H-B+2);ctx.clip();
  const boxes=[],lineLab=[],zoneLab=[],hit=q=>boxes.some(b=>q[0]<b[2]&&q[2]>b[0]&&q[1]<b[3]&&q[3]>b[1]);
  // threshold zones: a faint fill and the zone's word at the right edge (drawn last, where nothing else is)
  (cfg.zones||[]).forEach(z=>{
    const top=Y(Math.min(z.hi==null?mx:z.hi,mx)),bot=Y(Math.max(z.lo==null?mn:z.lo,mn));if(bot-top<1)return;
    if(z.color){const k=chCol(z.color);ctx.globalAlpha=.1*k.a;ctx.fillStyle=k.c;ctx.fillRect(L,top,W-L-R,bot-top);ctx.globalAlpha=1;}
    if(z.label&&bot-top>=13)zoneLab.push([z.label,top,bot]);
  });
  if(cfg.band&&cfg.band.length>1){const q=cfg.band.map(p=>[X(DN(p.d)),Y(p.lo),Y(p.hi)]);ctx.globalAlpha=.16;ctx.fillStyle=cssv('--teal');ctx.beginPath();q.forEach((p,i)=>i?ctx.lineTo(p[0],p[2]):ctx.moveTo(p[0],p[2]));for(let i=q.length-1;i>=0;i--)ctx.lineTo(q[i][0],q[i][1]);ctx.closePath();ctx.fill();ctx.globalAlpha=1;}
  (cfg.lines||[]).forEach(f=>{if(f.v<mn||f.v>mx)return;const k=chCol(f.color);ctx.strokeStyle=k.c;ctx.globalAlpha=.85*k.a;ctx.setLineDash(f.dash||[4,4]);ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(L,Y(f.v));ctx.lineTo(W-R,Y(f.v));ctx.stroke();ctx.setLineDash([]);ctx.globalAlpha=1;
    if(f.label)lineLab.push([f.label,k.c,Y(f.v)]);});
  (cfg.ref||[]).forEach(f=>{if(f.v<mn||f.v>mx)return;ctx.strokeStyle=cssv('--gold');ctx.globalAlpha=.7;ctx.setLineDash([5,4]);ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(L,Y(f.v));ctx.lineTo(W-R,Y(f.v));ctx.stroke();ctx.setLineDash([]);ctx.globalAlpha=1;ctx.fillStyle=cssv('--gold-dk');ctx.textAlign='left';ctx.font='600 10px Inter,sans-serif';ctx.fillText(f.label||'',L+4,Y(f.v)-4);});
  const dots=(b-a)<=60,pw=(W-L-R)/(b-a),base=Y(Math.max(mn,Math.min(0,mx)));
  const barGeo=(s,p)=>{const bw=Math.max(2,Math.min(pw*(s.w||1)*0.72,28)),x=X(DN(p.d)+chOff(s)),y=Y(p.v);return{x:x-bw/2,w:bw,y:Math.min(y,base),h:Math.max(1,Math.abs(base-y)),top:y};};
  const barCol=(s,p)=>chCol(s.barColor?s.barColor(p.v,p.d):(cfg.zones&&chZone(cfg,p.v)&&chZone(cfg,p.v).color)||s.color);
  cfg.series.forEach(s=>{
    if(s.type==='bar'){s.pts.forEach(p=>{if(!p.v||!inV(DN(p.d)+chOff(s)))return;const g=barGeo(s,p),k=barCol(s,p);ctx.globalAlpha=k.a;ctx.fillStyle=k.c;ctx.beginPath();ctx.rect(g.x,g.y,g.w,g.h);ctx.fill();ctx.globalAlpha=1;});return;}
    const q=s.pts.map(p=>[X(DN(p.d)),Y(p.v),p]);if(!q.length)return;
    if(s.fill&&q.length>1){const g=ctx.createLinearGradient(0,T,0,H-B);g.addColorStop(0,cssv(s.color));g.addColorStop(1,cssv('--sur'));ctx.globalAlpha=.16;ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(q[0][0],H-B);q.forEach(p=>ctx.lineTo(p[0],p[1]));ctx.lineTo(q[q.length-1][0],H-B);ctx.closePath();ctx.fill();ctx.globalAlpha=1;}
    ctx.strokeStyle=cssv(s.color);ctx.lineWidth=s.thin?1.5:2.2;ctx.lineJoin='round';ctx.lineCap='round';ctx.setLineDash(s.dash||[]);ctx.beginPath();
    q.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.stroke();ctx.setLineDash([]);
    // dots only when there is room for them (about 9px per point in view), or when they carry a colour
    const nIn=q.filter(p=>p[0]>=L-4&&p[0]<=W-R+4).length,roomy=nIn>0&&(W-L-R)/nIn>=9;
    if(!s.noDots&&(roomy||s.dotColor)){q.forEach(p=>{if(p[0]<L-4||p[0]>W)return;ctx.fillStyle=s.dotColor?cssv(s.dotColor(p[2].v,p[2].d)):cssv('--sur');ctx.strokeStyle=cssv(s.color);ctx.beginPath();ctx.arc(p[0],p[1],s.dotColor?4:roomy&&dots?3.2:2.4,0,7);ctx.fill();ctx.lineWidth=s.dotColor?1.2:1.8;ctx.stroke();});}
  });
  (cfg.marks||[]).forEach(m=>{const p=cfg.series[0].pts.find(q=>q.d===m);if(!p)return;ctx.strokeStyle=cssv('--gold');ctx.lineWidth=2;ctx.beginPath();ctx.arc(X(DN(p.d)),Y(p.v),7,0,7);ctx.stroke();});
  // key points: the latest value filled, the high and low in view ringed and labelled
  if(cfg.hi){
    const si=cfg.zs||0,s=cfg.series[si]||cfg.series[0],f=chFmt(cfg,s),info=chStatsOf(s.pts,a,b,null,s.w),isBar=s.type==='bar';
    const at=p=>isBar?[X(DN(p.d)+chOff(s)),barGeo(s,p).top]:[X(DN(p.d)),Y(p.v)];
    const lab=(t,x,y,below)=>{ctx.font='600 9px Inter,sans-serif';const w=ctx.measureText(t).width;x=Math.max(L+w/2+2,Math.min(W-R-w/2-2,x));y=below?Math.min(H-B-3,y+14):Math.max(T+8,y-9);if(hit([x-w/2-2,y-9,x+w/2+2,y+2]))y=below?Math.max(T+8,y-23):Math.min(H-B-3,y+23);boxes.push([x-w/2-2,y-9,x+w/2+2,y+2]);ctx.fillStyle=cssv('--sur');ctx.globalAlpha=.85;ctx.fillRect(x-w/2-2,y-9,w+4,11);ctx.globalAlpha=1;ctx.fillStyle=cssv('--t2');ctx.textAlign='center';ctx.fillText(t,x,y);};
    if(info.n>=3&&info.hi.v!==info.lo.v){
      const hw=(cfg.stats&&cfg.stats.words)||['High','Low'];
      [[info.hi,hw[0],false],[info.lo,hw[1],!isBar]].forEach(([p,w,below])=>{const[x,y]=at(p);if(!isBar){ctx.strokeStyle=cssv('--t2');ctx.lineWidth=1.4;ctx.beginPath();ctx.arc(x,y,6.5,0,7);ctx.stroke();}lab(w+' '+f(p.v),x,y,below);});
    }
    const lp=s.pts[s.pts.length-1];
    if(lp&&!isBar&&inV(DN(lp.d))){const[x,y]=at(lp);ctx.fillStyle=cssv(s.color);ctx.beginPath();ctx.arc(x,y,4.5,0,7);ctx.fill();ctx.strokeStyle=cssv('--sur');ctx.lineWidth=2;ctx.stroke();}
  }
  // line labels: left end, else right end, else the other side of the line; always on a backing so they stay readable
  lineLab.forEach(([t,col,y])=>{ctx.font='600 9px Inter,sans-serif';const w=ctx.measureText(t).width,up=y-4<T+6?y+11:y-4,dn=y-4<T+6?y-4:y+11;
    const at=[[L+4,up],[W-R-4-w,up],[L+4,dn],[W-R-4-w,dn]].map(([x,yy])=>[x-2,yy-9,x+w+2,yy+2]).find(q=>!hit(q)&&q[1]>=0&&q[3]<=H-B+2)||[L+2,up-9,L+w+6,up+2];
    boxes.push(at);ctx.fillStyle=cssv('--sur');ctx.globalAlpha=.85;ctx.fillRect(at[0],at[1],at[2]-at[0],at[3]-at[1]);ctx.globalAlpha=1;ctx.fillStyle=col;ctx.textAlign='left';ctx.fillText(t,at[0]+2,at[3]-2);});
  zoneLab.forEach(([t,top,bot])=>{ctx.font='500 9px Inter,sans-serif';const w=ctx.measureText(t).width,x=W-R-4;
    const q=[top+12,bot-3].map(y=>[x-w-2,y-10,x+2,y+1]).find(b=>!hit(b)&&b[3]<=bot+1&&b[1]>=top-1);if(!q)return;
    boxes.push(q);ctx.fillStyle=cssv('--t3');ctx.textAlign='right';ctx.fillText(t,x,q[3]-1);});
  if(st.hover!=null){const x=X(st.hover);ctx.strokeStyle=cssv('--t2');ctx.lineWidth=1;ctx.setLineDash([3,3]);ctx.beginPath();ctx.moveTo(x,T);ctx.lineTo(x,H-B);ctx.stroke();ctx.setLineDash([]);
    cfg.series.forEach(s=>{const p=chNear(s,st.hover);if(!p)return;
      if(s.type==='bar'){if(!p.v)return;const g=barGeo(s,p);ctx.strokeStyle=cssv('--text');ctx.lineWidth=1.5;ctx.strokeRect(g.x-1,g.y-1,g.w+2,g.h+1);return;}
      ctx.fillStyle=cssv(s.color);ctx.beginPath();ctx.arc(X(DN(p.d)),Y(p.v),4.5,0,7);ctx.fill();ctx.strokeStyle=cssv('--sur');ctx.lineWidth=2;ctx.stroke();});}
  ctx.restore();
  c.setAttribute('aria-label',(cfg.label||'Chart')+': '+cfg.series.map(s=>s.name+' latest '+(s.pts.length?chFmt(cfg,s)(s.pts[s.pts.length-1].v):'none')).join(', ')+'. Drag or use the arrow keys to move through dates.');
  chReadout(id);
}
function chNear(s,day){const o=chOff(s);let best=null,bd=99;s.pts.forEach(p=>{const k=Math.abs(DN(p.d)+o-day);if(k<bd){bd=k;best=p;}});return bd<=(_chTol(s))?best:null;}
const _chTol=s=>s.w>1?s.w/2+0.5:s.pts.length>1?Math.max(1,Math.round((DN(s.pts[s.pts.length-1].d)-DN(s.pts[0].d))/s.pts.length*1.6)):1;
function chReadout(id){
  const st=_ch[id],{cfg,host}=st,[a,b]=st.view;
  host.querySelectorAll('.vc-chips button').forEach(bn=>{const n=+bn.dataset.n,span=Math.round(b-a);bn.classList.toggle('on',n?Math.abs(span-n)<=2&&Math.abs(b-st.dmax)<2:(a<=st.dmin+1&&b>=st.dmax));});
  host.querySelector('.vc-win').textContent=dLab(Math.ceil(a))+' – '+dLab(Math.floor(b));
  const s0=cfg.series[0],wk=s0&&s0.w>1,p0=st.hover!=null&&s0?chNear(s0,st.hover):null;
  let day=st.hover,lab;
  if(day!=null){lab=wk&&p0?'Week of '+dLab(DN(p0.d)):dLab(day,true);}else{day=Math.min(Math.floor(b),st.dmax);lab=wk?'Latest week':'Latest';}
  const cells=cfg.series.map((s,i)=>{
    const p=st.hover!=null?chNear(s,day):s.pts.filter(q=>DN(q.d)<=Math.floor(b)).slice(-1)[0];
    const z=p&&cfg.zones&&i===(cfg.zs||0)?chZone(cfg,p.v):null;
    return`<div class="vc-v"><span class="vc-dot" style="background:${cssv(String(s.color).split('/')[0])}"></span><span class="vc-n">${esc(s.name)}</span><span class="vc-x">${p?chFmt(cfg,s)(p.v):'—'}${z&&z.label?' · '+esc(z.label):''}</span></div>`;}).join('');
  host.querySelector('.vc-ro').innerHTML=`<div class="vc-date">${lab}</div><div class="vc-vals">${cells}</div>`;
  const ex=st.hover!=null&&cfg.extra?cfg.extra(p0?p0.d:ND(st.hover)):'';
  const sub=host.querySelector('.vc-sub'),first=(host.closest('.page')||document).querySelector('.vc-sub')===sub;
  sub.textContent=ex||(st.hover==null&&first?'Drag to move, pinch to zoom, tap to inspect a day.':'');
  chMeaning(id);
}
// the "In view" line and the plain-English sentence for the dates on screen; both follow every pan and zoom
function chMeaning(id){
  const st=_ch[id],{cfg,host}=st;if(!cfg.stats&&!cfg.means)return;
  const info=chStats(id);
  const se=host.querySelector('.vc-stat');
  if(se){
    const o=cfg.stats,f=info.fmt;
    if(!info.n)se.textContent='Nothing recorded in view. Move back with ‹.';
    else if(info.n===1)se.textContent=`In view: one ${o.one||'value'}, ${f(info.last.v)} (${fmtD(info.last.d)}).`;
    else if(info.hi.v===info.lo.v)se.textContent=`In view: ${info.n} ${o.unit||'days'}, all ${f(info.hi.v)}.`;
    else{const w=(o.words||['high','low']).map(x=>x.toLowerCase());se.textContent=`In view: ${o.avg||'average'} ${f(info.avg)} · ${w[0]} ${f(info.hi.v)} (${fmtD(info.hi.d)}) · ${w[1]} ${f(info.lo.v)} (${fmtD(info.lo.d)})`+(info.good!=null?` · ${info.good} of ${info.n} ${o.unit||'days'} ${o.label||'in range'}`:'')+'.';}
  }
  const me=host.querySelector('.vc-mean');
  if(me){let t='';try{t=info.n?cfg.means(info)||'':'';}catch(e){t='';console.warn('chart note',id,e);}me.textContent=t;me.style.display=t?'':'none';}
}
