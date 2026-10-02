// ── CHART ENGINE: time-based line charts you can zoom, pan and inspect ───────
// Drag to pan, pinch (or wheel) to zoom, tap to inspect a day. Range chips jump to 1M/3M/6M/1Y/All.
// mountChart(id, cfg): cfg = {series:[{name,color,dash,fill,fmt,pts:[{d:'YYYY-MM-DD',v}]}], H, yfmt, min, max, zero, band:[{d,lo,hi}], marks:[dates], extra(date), empty, sub}
const _ch={};
const DN=s=>Math.floor(Date.UTC(+s.slice(0,4),+s.slice(5,7)-1,+s.slice(8,10))/864e5);
const ND=n=>new Date(n*864e5).toISOString().slice(0,10);
const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const dLab=(n,full)=>{const x=new Date(n*864e5);return(full?['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][x.getUTCDay()]+' ':'')+x.getUTCDate()+' '+MON[x.getUTCMonth()]+(full?" '"+String(x.getUTCFullYear()).slice(2):'');};
const CH_R=[['1M',30],['3M',90],['6M',180],['1Y',365],['All',0]];
function mountChart(id,cfg){
  const host=$(id);if(!host)return;
  const st=_ch[id]=_ch[id]||{};st.cfg=cfg;
  const pts=cfg.series.flatMap(s=>s.pts);
  if(pts.length<2){host.innerHTML=`<div class="vc-empty">${cfg.empty||'Not enough data yet.'}</div>`;st.on=false;return;}
  const dmin=Math.min(...pts.map(p=>DN(p.d))),dmax=Math.max(DN(td()),...pts.map(p=>DN(p.d)));
  st.dmin=dmin;st.dmax=dmax;st.on=true;
  if(!st.view||st.dataKey!==cfg.key){st.dataKey=cfg.key;const span=Math.min(dmax-dmin,cfg.span||90);st.view=[dmax-Math.max(span,13),dmax];st.hover=null;}
  host.innerHTML=`<div class="vc-tb"><div class="vc-chips">${CH_R.map(([l,n])=>`<button data-n="${n}">${l}</button>`).join('')}</div>
    <div class="vc-nav"><button data-a="prev" aria-label="Earlier">‹</button><button class="vc-win" data-a="reset"></button><button data-a="next" aria-label="Later">›</button></div></div>
    <div class="vc-ro"></div><canvas class="vc-cv" style="width:100%;height:${cfg.H||190}px;display:block"></canvas><div class="vc-sub"></div>`;
  st.cv=host.querySelector('canvas');st.host=host;
  host.querySelectorAll('.vc-chips button').forEach(b=>b.onclick=()=>chZoomTo(id,+b.dataset.n));
  host.querySelector('[data-a=prev]').onclick=()=>chShift(id,-0.5);host.querySelector('[data-a=next]').onclick=()=>chShift(id,0.5);
  host.querySelector('[data-a=reset]').onclick=()=>chZoomTo(id,st.view[1]-st.view[0]+1|0);
  chBind(id);chDraw(id);
}
function chClamp(st){
  let[a,b]=st.view,span=Math.max(6,Math.min(b-a,Math.max(st.dmax-st.dmin+2,13)));
  const lo=st.dmin-2,hi=st.dmax+2;
  if(a<lo){a=lo;}b=a+span;if(b>hi){b=hi;a=b-span;if(a<lo)a=lo;}
  st.view=[a,b];
}
function chZoomTo(id,n){const st=_ch[id];if(!st)return;const end=st.dmax;st.view=n?[end-n,end]:[st.dmin,st.dmax];st.hover=null;chClamp(st);chDraw(id);}
function chShift(id,f){const st=_ch[id],s=st.view[1]-st.view[0];st.view=[st.view[0]+s*f,st.view[1]+s*f];chClamp(st);st.hover=null;chDraw(id);}
function chBind(id){
  const st=_ch[id],c=st.cv,P=new Map();let g=null;
  c.style.touchAction='pan-y';c.style.cursor='grab';
  const px=()=>{const w=c.getBoundingClientRect().width-st.L-st.R;return w/(st.view[1]-st.view[0]);};
  const xAt=e=>e.clientX-c.getBoundingClientRect().left;
  c.onpointerdown=e=>{c.setPointerCapture?.(e.pointerId);P.set(e.pointerId,{x:xAt(e)});
    if(P.size===1)g={t:'tap',x0:xAt(e),v0:[...st.view],moved:0};
    else if(P.size===2){const[a,b]=[...P.values()];g={t:'pinch',d0:Math.abs(a.x-b.x)||1,v0:[...st.view],mid:(a.x+b.x)/2};}};
  c.onpointermove=e=>{
    if(!P.has(e.pointerId)){if(e.pointerType==='mouse'){st.hover=chDayAt(st,xAt(e));chDraw(id);}return;}
    P.get(e.pointerId).x=xAt(e);if(!g)return;
    if(g.t==='pinch'&&P.size>=2){const[pa,pb]=[...P.values()],r=g.d0/(Math.abs(pa.x-pb.x)||1),[a0,b0]=g.v0,m=a0+(g.mid-st.L)/((c.getBoundingClientRect().width-st.L-st.R)/(b0-a0));
      st.view=[m-(m-a0)*r,m-(m-a0)*r+(b0-a0)*r];chClamp(st);st.hover=null;chDraw(id);return;}
    if(g.t==='tap'||g.t==='pan'){const dx=xAt(e)-g.x0;g.moved=Math.max(g.moved,Math.abs(dx));
      if(g.moved>7){g.t='pan';const s=g.v0[1]-g.v0[0],sh=-dx/px();st.view=[g.v0[0]+sh,g.v0[0]+sh+s];chClamp(st);st.hover=null;chDraw(id);}}};
  const up=e=>{if(g&&g.t==='tap'&&g.moved<=7&&e.type==='pointerup'){const d=chDayAt(st,xAt(e));st.hover=st.hover===d?null:d;chDraw(id);}P.delete(e.pointerId);if(P.size===0)g=null;else if(P.size===1)g={t:'pan',x0:[...P.values()][0].x,v0:[...st.view],moved:99};};
  c.onpointerup=up;c.onpointercancel=up;
  c.onpointerleave=e=>{if(e.pointerType==='mouse'&&st.hover!=null){st.hover=null;chDraw(id);}};
  c.addEventListener('wheel',e=>{e.preventDefault();const r=e.deltaY>0?1.2:1/1.2,a=st.view[0],s=st.view[1]-a,m=a+(xAt(e)-st.L)/px();st.view=[m-(m-a)*r,m-(m-a)*r+s*r];chClamp(st);st.hover=null;chDraw(id);},{passive:false});
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
  const X=d=>L+(d-a)*(W-L-R)/(b-a);
  // y range from visible points
  const vis=cfg.series.flatMap(s=>s.pts.filter(p=>{const d=DN(p.d);return d>=a-1&&d<=b+1;}).map(p=>p.v)).concat((cfg.ref||[]).map(f=>f.v),(cfg.band||[]).filter(p=>{const d=DN(p.d);return d>=a-1&&d<=b+1;}).flatMap(p=>[p.lo,p.hi]));
  let mn=cfg.min,mx=cfg.max;
  if(vis.length&&(mn==null||mx==null)){const lo=Math.min(...vis),hi=Math.max(...vis),pad=(hi-lo)*0.12||Math.abs(hi)*0.08||1;if(mn==null)mn=lo-pad;if(mx==null)mx=hi+pad;if(cfg.zero){mn=Math.min(mn,0);mx=Math.max(mx,0);}}
  if(mn==null){mn=0;mx=1;}
  const Y=v=>T+(mx-v)*(H-T-B)/(mx-mn||1),yf=cfg.yfmt||(v=>Math.round(v*10)/10);
  ctx.font='500 10px Inter,sans-serif';ctx.textBaseline='middle';
  const rawS=(mx-mn)/4,mag=Math.pow(10,Math.floor(Math.log10(rawS||1))),stp=[1,2,2.5,5,10].map(k=>k*mag).find(k=>k>=rawS)||mag;
  for(let v=Math.ceil(mn/stp)*stp;v<=mx+1e-9;v+=stp){
    const y=Y(v);ctx.strokeStyle=cssv('--bdr');ctx.globalAlpha=v===0&&cfg.zero?1:.6;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(L,y);ctx.lineTo(W-R,y);ctx.stroke();ctx.globalAlpha=1;
    ctx.fillStyle=cssv('--t3');ctx.textAlign='right';ctx.fillText(yf(v),L-6,y);
  }
  ctx.textBaseline='alphabetic';ctx.textAlign='center';ctx.fillStyle=cssv('--t3');
  chTicks(a,b).forEach(([d,l])=>{const x=X(d);if(x<L+8||x>W-R-8)return;ctx.strokeStyle=cssv('--bdr');ctx.globalAlpha=.35;ctx.beginPath();ctx.moveTo(x,T);ctx.lineTo(x,H-B);ctx.stroke();ctx.globalAlpha=1;ctx.fillText(l,x,H-6);});
  ctx.save();ctx.beginPath();ctx.rect(L,0,W-L-R,H-B+2);ctx.clip();
  if(cfg.band&&cfg.band.length>1){const q=cfg.band.map(p=>[X(DN(p.d)),Y(p.lo),Y(p.hi)]);ctx.globalAlpha=.16;ctx.fillStyle=cssv('--teal');ctx.beginPath();q.forEach((p,i)=>i?ctx.lineTo(p[0],p[2]):ctx.moveTo(p[0],p[2]));for(let i=q.length-1;i>=0;i--)ctx.lineTo(q[i][0],q[i][1]);ctx.closePath();ctx.fill();ctx.globalAlpha=1;}
  (cfg.ref||[]).forEach(f=>{if(f.v<mn||f.v>mx)return;ctx.strokeStyle=cssv('--gold');ctx.globalAlpha=.7;ctx.setLineDash([5,4]);ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(L,Y(f.v));ctx.lineTo(W-R,Y(f.v));ctx.stroke();ctx.setLineDash([]);ctx.globalAlpha=1;ctx.fillStyle=cssv('--gold-dk');ctx.textAlign='left';ctx.font='600 10px Inter,sans-serif';ctx.fillText(f.label||'',L+4,Y(f.v)-4);});
  const dots=(b-a)<=60;
  cfg.series.forEach((s,si)=>{
    const q=s.pts.map(p=>[X(DN(p.d)),Y(p.v),p]);if(!q.length)return;
    if(s.fill&&q.length>1){const g=ctx.createLinearGradient(0,T,0,H-B);g.addColorStop(0,cssv(s.color));g.addColorStop(1,cssv('--sur'));ctx.globalAlpha=.16;ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(q[0][0],H-B);q.forEach(p=>ctx.lineTo(p[0],p[1]));ctx.lineTo(q[q.length-1][0],H-B);ctx.closePath();ctx.fill();ctx.globalAlpha=1;}
    ctx.strokeStyle=cssv(s.color);ctx.lineWidth=2.2;ctx.lineJoin='round';ctx.lineCap='round';ctx.setLineDash(s.dash||[]);ctx.beginPath();
    q.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.stroke();ctx.setLineDash([]);
    if(dots||q.length<=40){ctx.fillStyle=cssv('--sur');q.forEach(p=>{if(p[0]<L-4||p[0]>W)return;ctx.beginPath();ctx.arc(p[0],p[1],dots?3.2:2.4,0,7);ctx.fill();ctx.lineWidth=1.8;ctx.stroke();});}
  });
  (cfg.marks||[]).forEach(m=>{const p=cfg.series[0].pts.find(q=>q.d===m);if(!p)return;ctx.strokeStyle=cssv('--gold');ctx.lineWidth=2;ctx.beginPath();ctx.arc(X(DN(p.d)),Y(p.v),7,0,7);ctx.stroke();});
  if(st.hover!=null){const x=X(st.hover);ctx.strokeStyle=cssv('--t2');ctx.lineWidth=1;ctx.setLineDash([3,3]);ctx.beginPath();ctx.moveTo(x,T);ctx.lineTo(x,H-B);ctx.stroke();ctx.setLineDash([]);
    cfg.series.forEach(s=>{const p=chNear(s,st.hover);if(!p)return;ctx.fillStyle=cssv(s.color);ctx.beginPath();ctx.arc(X(DN(p.d)),Y(p.v),4.5,0,7);ctx.fill();ctx.strokeStyle=cssv('--sur');ctx.lineWidth=2;ctx.stroke();});}
  ctx.restore();
  c.setAttribute('aria-label',(cfg.label||'Chart')+': '+cfg.series.map(s=>s.name+' latest '+(s.pts.length?(s.fmt?s.fmt(s.pts[s.pts.length-1].v):Math.round(s.pts[s.pts.length-1].v*10)/10):'none')).join(', ')+'. Drag to move through dates.');
  chReadout(id);
}
function chNear(s,day){let best=null,bd=99;s.pts.forEach(p=>{const k=Math.abs(DN(p.d)-day);if(k<bd){bd=k;best=p;}});return bd<=(_chTol(s))?best:null;}
const _chTol=s=>s.pts.length>1?Math.max(1,Math.round((DN(s.pts[s.pts.length-1].d)-DN(s.pts[0].d))/s.pts.length*1.6)):1;
function chReadout(id){
  const st=_ch[id],{cfg,host}=st,[a,b]=st.view;
  host.querySelectorAll('.vc-chips button').forEach(bn=>{const n=+bn.dataset.n,span=Math.round(b-a);bn.classList.toggle('on',n?Math.abs(span-n)<=2&&Math.abs(b-st.dmax)<2:(a<=st.dmin+1&&b>=st.dmax));});
  host.querySelector('.vc-win').textContent=dLab(Math.ceil(a))+' – '+dLab(Math.floor(b));
  let day=st.hover,lab;
  if(day!=null){lab=dLab(day,true);}else{day=Math.min(Math.floor(b),st.dmax);lab='Latest';}
  const cells=cfg.series.map(s=>{
    const p=st.hover!=null?chNear(s,day):s.pts.filter(q=>DN(q.d)<=Math.floor(b)).slice(-1)[0];
    return`<div class="vc-v"><span class="vc-dot" style="background:${cssv(s.color)}"></span><span class="vc-n">${esc(s.name)}</span><span class="vc-x">${p?(s.fmt?s.fmt(p.v):cfg.yfmt?cfg.yfmt(p.v):Math.round(p.v*10)/10):'—'}</span></div>`;}).join('');
  host.querySelector('.vc-ro').innerHTML=`<div class="vc-date">${lab}</div><div class="vc-vals">${cells}</div>`;
  const ex=st.hover!=null&&cfg.extra?cfg.extra(ND(st.hover)):'';
  const sub=host.querySelector('.vc-sub'),first=(host.closest('.page')||document).querySelector('.vc-sub')===sub;
  sub.textContent=ex||(st.hover==null&&first?'Drag to move, pinch to zoom, tap to inspect a day.':'');
}
