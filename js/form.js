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
function renderFormChart(){
  const d=S(),host=$('formCanvas');if(!host)return;
  const ctl=[],atl=[],tsb=[];
  Object.keys(d.wellness||{}).sort().forEach(dt=>{const w=d.wellness[dt];if(w&&w.ctl!=null&&w.atl!=null){ctl.push({d:dt,v:w.ctl});atl.push({d:dt,v:w.atl});tsb.push({d:dt,v:w.ctl-w.atl});}});
  const note=$('formNote'),sum=$('formSum');
  if(ctl.length<2){
    host.innerHTML='';sum.textContent='';
    note.innerHTML=d.intervalsKey?'No fitness data yet. Tap Sync in Settings to pull it from Intervals.icu.':'Connect Intervals.icu in <a href="#" onclick="openSettings();return false">Settings</a> to see fitness, fatigue and form.';return;
  }
  const fm=v=>Math.round(v);
  mountChart('formCanvas',{key:'form',H:190,zero:true,yfmt:fm,series:[{pts:ctl,color:'--text',name:'Fitness',fmt:fm},{pts:atl,color:'--amber',name:'Fatigue',fmt:fm},{pts:tsb,color:'--teal',dash:[4,3],name:'Form',fmt:v=>(v>0?'+':'')+Math.round(v)}]});
  const l=tsb[tsb.length-1].v,f=ctl[ctl.length-1].v,a=atl[atl.length-1].v;
  sum.textContent=`Fitness ${Math.round(f)} · Fatigue ${Math.round(a)} · Form ${l>0?'+':''}${Math.round(l)}`;
  note.textContent=l>5?'You are fresh. A good day for a hard session or race.':l>-10?'Balanced. Training and recovery are in step.':l>-25?'Building. Tired but productive. Protect your sleep.':'Deeply fatigued. Plan an easy day or rest.';
}
// usual range per day: mean ± 1 SD of the 28 days before it (needs 5+ points; SD never below floor)
function rollBand(pts,floor,win=28){
  const out=[];
  pts.forEach((p,i)=>{const n=DN(p.d),w=pts.slice(0,i).filter(q=>n-DN(q.d)<=win).map(q=>q.v);
    if(w.length<5)return;const m=avg(w),sd=Math.sqrt(w.reduce((a,v)=>a+(v-m)*(v-m),0)/w.length);
    out.push({d:p.d,lo:m-Math.max(sd,floor),hi:m+Math.max(sd,floor)});});
  return out;
}
function renderRecTrend(){
  const d=S(),card=$('recTrendCard');if(!card)return;
  const wl=d.wellness||{},mk=k=>Object.keys(wl).sort().filter(dt=>wl[dt]&&wl[dt][k]!=null).map(dt=>({d:dt,v:wl[dt][k]}));
  const hv=mk('hrv'),rp=mk('resp');let rh=mk('rhr');
  if(rh.length<2)rh=d.measurements.filter(m=>m.hr).sort((a,b)=>a.date<b.date?-1:1).map(m=>({d:m.date,v:m.hr}));
  if(hv.length<2&&rh.length<2&&rp.length<2){card.style.display='none';return;}
  card.style.display='';
  const f=v=>Math.round(v);
  if(hv.length>=2)mountChart('hrvCanvas',{key:'hrv',H:150,span:60,yfmt:f,band:rollBand(hv,3),series:[{pts:hv,color:'--teal',name:'HRV',fmt:v=>f(v)+' ms'}]});else $('hrvCanvas').innerHTML='';
  if(rh.length>=2)mountChart('rhrCanvas',{key:'rhr',H:150,span:60,yfmt:f,band:rollBand(rh,1.5),series:[{pts:rh,color:'--text',name:'Resting HR',fmt:v=>f(v)+' bpm'}]});else $('rhrCanvas').innerHTML='';
  const rs=$('respSec');if(rs)rs.style.display=rp.length>=2?'':'none';
  if(rp.length>=2)mountChart('respCanvas',{key:'resp',H:150,span:60,yfmt:v=>v.toFixed(1),band:rollBand(rp,0.5),series:[{pts:rp,color:'--teal',name:'Breathing rate',fmt:v=>v.toFixed(1)+' /min'}]});else $('respCanvas').innerHTML='';
}
function renderReadTrend(){
  const d=S(),host=$('readCanvas');if(!host)return;
  const h=d.readHist||{},pts=Object.keys(h).sort().map(dt=>({d:dt,v:h[dt]})).filter(p=>p.v!=null);
  const note=$('readNote');
  if(pts.length<2){host.innerHTML='';note.textContent='Your daily readiness is saved each time you open the app. A line appears after two days.';return;}
  mountChart('readCanvas',{key:'read',H:170,min:20,max:100,band:rollBand(pts,4),yfmt:v=>Math.round(v),series:[{pts,color:'--gold-dk',name:'Readiness',fill:true,fmt:v=>Math.round(v)}]});
  const avg=Math.round(pts.reduce((a,p)=>a+p.v,0)/pts.length);
  note.textContent=`Shaded area is your usual range over the last 4 weeks. Average ${avg} over ${pts.length} day${pts.length!==1?'s':''} recorded. 80+ ready for a hard day, 60 to 80 steady, below 60 go easy.`;
}
