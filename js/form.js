// Trends: fitness / fatigue / form (from Intervals.icu) and readiness trend (local daily snapshots)
function recordReadiness(s){
  if(s===null||s===undefined)return;
  const d=S();d.readHist=d.readHist||{};
  if(d.readHist[td()]===s)return;
  d.readHist[td()]=s;
  const keys=Object.keys(d.readHist).sort();
  while(keys.length>120)delete d.readHist[keys.shift()];
  save(d);
}
function lineChart(c,H,series,opts){
  // series: [{pts:[{i,v}], color, dash, name, fmt}], opts:{n,min,max,zero,label,hover}
  // Interactive: touch or drag along the chart to read exact values for a day.
  c._a=[H,series,opts];
  const{ctx,W}=sizeCanvas(c,H),L=28,R=8,T=6,B=16,n=opts.n;
  let mn=opts.min,mx=opts.max;
  const X=i=>L+(n<2?0:i*(W-L-R)/(n-1)),Y=v=>T+(mx-v)*(H-T-B)/(mx-mn||1);
  c._m={X,n,L,R,W};
  ctx.font='9px "IBM Plex Mono",monospace';ctx.textBaseline='middle';
  const step=(mx-mn)>60?Math.ceil((mx-mn)/3/10)*10:Math.ceil((mx-mn)/3);
  for(let v=Math.ceil(mn/step)*step;v<=mx;v+=step){
    ctx.strokeStyle=cssv('--bdr');ctx.lineWidth=v===0&&opts.zero?1.5:.5;ctx.beginPath();ctx.moveTo(L,Y(v));ctx.lineTo(W-R,Y(v));ctx.stroke();
    ctx.fillStyle=cssv('--t3');ctx.textAlign='right';ctx.fillText(Math.round(v),L-4,Y(v));
  }
  ctx.textBaseline='alphabetic';ctx.textAlign='center';ctx.fillStyle=cssv('--t3');
  [0,Math.floor((n-1)/2),n-1].forEach(i=>{ctx.textAlign=i===0?'left':i===n-1?'right':'center';ctx.fillText(opts.label(i),X(i),H-3);});
  series.forEach(s=>{
    ctx.strokeStyle=cssv(s.color);ctx.lineWidth=2;ctx.lineJoin='round';ctx.setLineDash(s.dash||[]);ctx.beginPath();
    let open=false;s.pts.forEach(p=>{const x=X(p.i),y=Y(p.v);open?ctx.lineTo(x,y):ctx.moveTo(x,y);open=true;});ctx.stroke();ctx.setLineDash([]);
    if(s.pts.length===1){ctx.fillStyle=cssv(s.color);ctx.beginPath();ctx.arc(X(s.pts[0].i),Y(s.pts[0].v),3,0,7);ctx.fill();}
  });
  const h=opts.hover;
  if(h!=null){
    const x=X(h);ctx.strokeStyle=cssv('--t3');ctx.lineWidth=1;ctx.setLineDash([3,3]);ctx.beginPath();ctx.moveTo(x,T);ctx.lineTo(x,H-B);ctx.stroke();ctx.setLineDash([]);
    const rows=[];
    series.forEach(s=>{const p=s.pts.find(q=>q.i===h);if(!p)return;ctx.fillStyle=cssv(s.color);ctx.beginPath();ctx.arc(x,Y(p.v),4,0,7);ctx.fill();rows.push([s.name||'',s.fmt?s.fmt(p.v):Math.round(p.v*10)/10,s.color]);});
    const title=opts.label(h);ctx.font='10px "IBM Plex Mono",monospace';ctx.textBaseline='middle';
    const lines=[[title,'',null],...(rows.length?rows:[['no data','',null]])];
    const tw=Math.max(...lines.map(l=>ctx.measureText(l[0]+(l[1]!==''?'  '+l[1]:'')).width))+16,th=lines.length*14+8;
    let bx=x+10;if(bx+tw>W-2)bx=x-10-tw;bx=Math.max(2,bx);
    ctx.fillStyle=cssv('--sur');ctx.strokeStyle=cssv('--bdr');ctx.lineWidth=1;ctx.globalAlpha=.96;ctx.beginPath();ctx.roundRect(bx,T,tw,th,6);ctx.fill();ctx.stroke();ctx.globalAlpha=1;
    ctx.textAlign='left';lines.forEach((l,k)=>{ctx.fillStyle=l[2]?cssv(l[2]):cssv('--t3');ctx.fillText(l[1]!==''?`${l[0]}  ${l[1]}`:l[0],bx+8,T+12+k*14);});
  }
  if(!c._i){
    c._i=1;c.style.touchAction='pan-y';
    const at=e=>{const r=c.getBoundingClientRect(),m=c._m,x=e.clientX-r.left,i=Math.round((x-m.L)/((m.W-m.L-m.R)/((m.n-1)||1)));return Math.max(0,Math.min(m.n-1,i));};
    const go=e=>{const[H2,se,op]=c._a;lineChart(c,H2,se,{...op,hover:at(e)});};
    c.addEventListener('pointerdown',go);c.addEventListener('pointermove',e=>{if(e.buttons||e.pointerType==='mouse')go(e);});
    const off=()=>{const[H2,se,op]=c._a;if(op.hover!=null)lineChart(c,H2,se,{...op,hover:null});};
    c.addEventListener('pointerup',()=>setTimeout(off,2500));c.addEventListener('pointerleave',e=>{if(e.pointerType==='mouse')off();});
  }
}
function renderFormChart(){
  const d=S(),c=$('formCanvas');if(!c)return;
  const n=Math.max(14,_range),days=[];for(let i=n-1;i>=0;i--)days.push(dAgo(i));
  const ctl=[],atl=[],tsb=[];
  days.forEach((dt,i)=>{const w=d.wellness[dt];if(w&&w.ctl!=null&&w.atl!=null){ctl.push({i,v:w.ctl});atl.push({i,v:w.atl});tsb.push({i,v:w.ctl-w.atl});}});
  const note=$('formNote'),sum=$('formSum');
  if(ctl.length<2){
    c.style.display='none';sum.textContent='';
    note.innerHTML=d.intervalsKey?'No fitness data yet. Tap Sync in Settings to pull it from Intervals.icu.':'Connect Intervals.icu in <a href="#" onclick="openSettings();return false">Settings</a> to see fitness, fatigue and form.';return;
  }
  c.style.display='block';
  const all=[...ctl,...atl,...tsb].map(p=>p.v);
  lineChart(c,130,[{pts:ctl,color:'--text',name:'Fitness'},{pts:atl,color:'--amber',dash:[],name:'Fatigue'},{pts:tsb,color:'--teal',dash:[4,3],name:'Form'}],{n,min:Math.floor(Math.min(...all,0)-2),max:Math.ceil(Math.max(...all)+2),zero:true,label:i=>dAgo(n-1-i).slice(5)});
  const l=tsb[tsb.length-1].v,f=ctl[ctl.length-1].v,a=atl[atl.length-1].v;
  sum.textContent=`Fitness ${Math.round(f)} · Fatigue ${Math.round(a)} · Form ${l>0?'+':''}${Math.round(l)}`;
  note.textContent=l>5?'You are fresh. A good day for a hard session or race.':l>-10?'Balanced. Training and recovery are in step.':l>-25?'Building. Tired but productive. Protect your sleep.':'Deeply fatigued. Plan an easy day or rest.';
}
function renderReadTrend(){
  const d=S(),c=$('readCanvas');if(!c)return;
  const h=d.readHist||{},n=Math.max(14,_range),pts=[];
  for(let i=0;i<n;i++){const v=h[dAgo(n-1-i)];if(v!=null)pts.push({i,v});}
  const note=$('readNote');
  if(pts.length<2){c.style.display='none';note.textContent='Your daily readiness is saved each time you open the app. A line appears after two days.';return;}
  c.style.display='block';
  lineChart(c,110,[{pts,color:'--gold-dk',name:'Readiness'}],{n,min:20,max:100,label:i=>dAgo(n-1-i).slice(5)});
  const avg=Math.round(pts.reduce((a,p)=>a+p.v,0)/pts.length);
  note.textContent=`Average ${avg} over ${pts.length} day${pts.length!==1?'s':''} recorded.`;
}
