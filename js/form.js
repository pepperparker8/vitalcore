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
// Body (v118) is snapshotted the same way, local only, alongside the old readiness during the parallel run and after it
function recordBody(s){
  if(s===null||s===undefined)return;
  const d=S();d.bodyHist=d.bodyHist||{};
  if(d.bodyHist[td()]===s)return;
  d.bodyHist[td()]=s;
  const keys=Object.keys(d.bodyHist).sort();
  while(keys.length>120)delete d.bodyHist[keys.shift()];
  save(d);
}
// form zones: the same words as zL and calcLoad, cuts from TH
function formZones(){return[{lo:TH.FORM_FRESH,hi:null,color:'--green',label:'Fresh'},{lo:TH.FORM_OK,hi:TH.FORM_FRESH,label:'Balanced'},{lo:TH.FORM_TIRED,hi:TH.FORM_OK,color:'--amber/.6',label:'Tired'},{lo:TH.FORM_DEEP,hi:TH.FORM_TIRED,color:'--amber',label:'Very tired'},{lo:null,hi:TH.FORM_DEEP,color:'--red',label:'Overreached'}];}
const sgn=v=>(v>0?'+':'')+Math.round(v);
const inView=(pts,info)=>pts.filter(p=>p.d>=info.from&&p.d<=info.to);
// easy days until form is back to balanced: fatigue fades over about 7 days, fitness over about 42 (no training counted, so it is a best case)
function formDaysBack(ctl,atl){for(let t=1;t<=21;t++)if(ctl*Math.exp(-t/42)-atl*Math.exp(-t/7)>=TH.FORM_OK)return t;return null;}
// v123: one line. Today's form word with what to do, then fitness only when it moved 3 or more over the dates in view
function formMeaning(info,ctl,atl){
  const l=info.last,now=l.d===last(ctl).d,z=info.zone(l.v),w=z?z.label:'';
  let t;
  if(!now)t=`On ${dayWord(l.d)}: ${w.toLowerCase()}.`;
  else if(l.v<TH.FORM_OK){const n=formDaysBack(last(ctl).v,last(atl).v);t=w+(n?(n===1?': one easy day gets you back to balanced.':`: about ${n} easy days to get back to balanced.`):': rest; it will take weeks to come back.');}
  else if(l.v>=TH.FORM_FRESH)t=w+': a good day to go hard.';
  else t=w+'.';
  const c=inView(ctl,info);
  if(c.length>=2){const a=Math.round(c[0].v),b=Math.round(last(c).v);if(Math.abs(b-a)>=3)t+=` Fitness ${b>a?'built':'slipped'} from ${a} to ${b}.`;}
  return t;
}
function renderFormChart(){
  const d=S(),host=$('formCanvas');if(!host)return;
  const ctl=[],atl=[],tsb=[];
  Object.keys(d.wellness||{}).sort().forEach(dt=>{const w=d.wellness[dt];if(w&&w.ctl!=null&&w.atl!=null){ctl.push({d:dt,v:w.ctl});atl.push({d:dt,v:w.atl});tsb.push({d:dt,v:w.ctl-w.atl});}});
  const note=$('formNote'),sec=$('tsbSec');
  if(ctl.length<2){
    chUnmount('formCanvas');chUnmount('tsbCanvas');host.innerHTML='';$('tsbCanvas').innerHTML='';sec.style.display='none';
    note.innerHTML=d.intervalsKey?'No fitness data yet. Tap Sync in Settings to pull it.':'Connect Intervals.icu in <a href="#" onclick="openSettings();return false">Settings</a> to see fitness, fatigue and form.';return;
  }
  sec.style.display='';note.textContent='';
  const fm=v=>Math.round(v);
  // the header sits at the top of the card, on the fitness chart: form and its word on the left, fitness and its change on the right
  const zc={Fresh:'good',Tired:'warn','Very tired':'warn',Overreached:'bad'},zs=formZones(),fOn=new Map(tsb.map(p=>[p.d,p.v]));
  mountChart('formCanvas',{key:'form',group:'trends',tb:false,legend:true,H:150,yfmt:fm,label:'Fitness and fatigue',
    series:[{pts:ctl,color:'--text',name:'Fitness',fmt:fm,lg:true},{pts:atl,color:'--amber',name:'Fatigue',fmt:fm,thin:true,lg:true}],
    head:x=>{
      const c=ctl.filter(p=>p.d<=x.to).pop(),pc=ctl.filter(p=>p.d<=x.pto&&p.d>=x.pfrom).pop(),R=c?{rl:'Fitness',rv:String(fm(c.v)),...trCh(c.v,pc&&pc.v,fm,v=>String(fm(v)))}:{};
      const f=x.p?fOn.get(x.p.d):null,lab=x.lab==='Today'?'Form today':'Form, '+x.lab;if(f==null)return{...R,lab,v:null};
      const z=chZone({zones:zs},f),w=z?z.label:'';
      return{...R,lab,v:sgn(f),st:w,cls:zc[w]||'',sa:zc[w]==='good'?'●':zc[w]?'▼':'●'};}});
  mountChart('tsbCanvas',{key:'tsb',group:'trends',tb:false,H:140,yfmt:fm,zero:true,label:'Form',zones:zs,hi:true,
    series:[{pts:tsb,color:'--teal',name:'Form',fmt:sgn,vl:sgn}],
    stats:{good:v=>v>=TH.FORM_OK},
    means:info=>formMeaning(info,ctl,atl)});
}
// usual range per day: mean ± 1 SD of the 28 days before it (needs 5+ points; SD never below floor)
function rollBand(pts,floor,win=28){
  const out=[];
  pts.forEach((p,i)=>{const n=DN(p.d),w=pts.slice(0,i).filter(q=>n-DN(q.d)<=win).map(q=>q.v);
    if(w.length<5)return;const m=avg(w),sd=Math.sqrt(w.reduce((a,v)=>a+(v-m)*(v-m),0)/w.length);
    out.push({d:p.d,lo:m-Math.max(sd,floor),hi:m+Math.max(sd,floor)});});
  return out;
}
// each reading against its own day's usual range: pos 1 above, -1 below, 0 inside, null before the range exists
function vsBand(pts,band){const m=new Map(band.map(b=>[b.d,b]));return pts.map(p=>{const b=m.get(p.d);return{...p,b,pos:!b?null:p.v>b.hi?1:p.v<b.lo?-1:0};});}
// v123: the latest reading in view against its usual range, in one line: where it sits, for how many days, and an action only when there is one
function bandMeaning(info,band,fmt,txt){
  const P=vsBand(info.pts,band).filter(p=>p.pos!=null);if(!P.length)return'Your usual range shows after 5 days of readings.';
  const l=last(P);let k=0;for(let i=P.length-1;i>=0&&P[i].pos===l.pos;i--)k++;
  const T=txt[l.pos+1],recent=daysAgo(l.d)<=1;
  if(!recent)return`On ${dayWord(l.d)}: ${['below','inside','above'][l.pos+1]} your usual range.`;
  return typeof T==='function'?T(k):T;
}
// what a reading below, inside or above its usual range means, given how many days in a row it has sat there; shared by Trends and the detail sheets
const BAND_TXT={
  hrv:[k=>k>1?`Below your usual for ${k} days. Keep today easy.`:'Dipped below your usual today.','Steady, inside your usual range.',k=>k>1?`Above your usual for ${k} days: well recovered.`:'Above your usual: well recovered.'],
  rhr:['Below your usual: well recovered.','Steady, inside your usual range.',k=>k>1?`Above your usual for ${k} days. An easy day helps.`:'A little above your usual today.'],
  resp:['Slower than usual, which is fine.','Steady, inside your usual range.',k=>k>1?`Faster than usual for ${k} days.`:'A little faster than usual today.']};
function renderRecTrend(){
  const d=S();if(!$('hrvCard'))return;
  const wl=d.wellness||{},mk=k=>Object.keys(wl).sort().filter(dt=>wl[dt]&&wl[dt][k]!=null).map(dt=>({d:dt,v:wl[dt][k]}));
  const hv=mk('hrv'),rp=mk('resp');let rh=mk('rhr');
  // one source only: manual readings are used when there are more of them than imported days
  const rm=d.measurements.filter(m=>m.hr).sort((a,b)=>a.date<b.date?-1:1).map(m=>({d:m.date,v:m.hr}));
  if(rm.length>rh.length)rh=rm;
  const f=v=>Math.round(v),f1=v=>Math.round(v*10)/10;
  const goodIn=(band,side)=>{const m=new Map(band.map(b=>[b.d,b]));return(v,dt)=>{const b=m.get(dt);return!!b&&(side>0?v>=b.lo:v<=b.hi);};};
  // the header: that day's reading against its own usual range; up is good for HRV, down for resting heart rate and breathing
  const W={hrv:['Below your usual','Inside your usual','Above your usual'],resp:['Slower than usual','Inside your usual','Faster than usual']};
  const card=(k,pts,band,fu,r,cls,words)=>{
    const m=new Map(band.map(b=>[b.d,b]));
    return{head:x=>{const R=trRight(pts,x,{f:fu,r});if(!x.p)return{...R,v:null};const[v,u]=fu(x.p.v),b=m.get(x.p.d),pos=!b?null:x.p.v>b.hi?1:x.p.v<b.lo?-1:0;
      return{...R,v,u,...(pos==null?{}:{st:words[pos+1],cls:cls[pos+1],sa:['▼','●','▲'][pos+1]})};}};};
  const show=(id,on)=>{const c=$(id);if(c)c.style.display=on?'':'none';};
  show('hrvCard',hv.length>=2);show('rhrCard',rh.length>=2);show('respCard',rp.length>=2);
  if(hv.length>=2){const band=rollBand(hv,TH.HRV_FLOOR),fm=v=>f(v)+' ms';
    mountChart('hrvCanvas',{key:'hrv',group:'trends',tb:false,legend:true,H:150,yfmt:f,band,label:'Heart rate variability',hi:true,series:[{pts:hv,color:'--teal',name:'HRV',fmt:fm,vl:v=>String(f(v))}],
      stats:{good:goodIn(band,1)},...card('hrv',hv,band,v=>[String(f(v)),'ms'],f,['warn','','good'],W.hrv),
      means:info=>bandMeaning(info,band,fm,BAND_TXT.hrv)});}
  else chUnmount('hrvCanvas');
  if(rh.length>=2){const band=rollBand(rh,TH.RHR_FLOOR),fm=v=>f(v)+' bpm';
    mountChart('rhrCanvas',{key:'rhr',group:'trends',tb:false,legend:true,H:150,yfmt:f,band,label:'Resting heart rate',hi:true,series:[{pts:rh,color:'--text',name:'Resting HR',fmt:fm,vl:v=>String(f(v))}],
      stats:{good:goodIn(band,-1)},...card('rhr',rh,band,v=>[String(f(v)),'bpm'],f,['good','','warn'],W.hrv),
      means:info=>bandMeaning(info,band,fm,BAND_TXT.rhr)});}
  else chUnmount('rhrCanvas');
  if(rp.length>=2){const band=rollBand(rp,0.5),fm=v=>f1(v)+' /min',lb=last(band),watch=lb?(lb.lo+lb.hi)/2+TH.ILL_RESP:null;
    mountChart('respCanvas',{key:'resp',group:'trends',tb:false,legend:true,H:150,yfmt:f1,band,label:'Breathing rate while asleep',hi:true,series:[{pts:rp,color:'--teal',name:'Breathing rate',fmt:fm,vl:v=>String(f1(v))}],
      lines:watch!=null?[{v:watch,label:'Illness watch',color:'--amber'}]:[],
      stats:{good:goodIn(band,-1)},...card('resp',rp,band,v=>[String(f1(v)),'/min'],f1,['','','warn'],W.resp),
      means:info=>watch!=null&&info.last.v>=watch&&daysAgo(info.last.d)<=1?'At the illness-watch line. Rest if you feel unwell.':bandMeaning(info,band,fm,BAND_TXT.resp)});}
  else chUnmount('respCanvas');
}
// score zones: the gauge's words (scoreWord) and cuts (scoreCuts)
function scoreZones(){
  const c=scoreCuts();
  return bodyLive()?[{lo:c.high,hi:null,color:'--green',label:'Good'},{lo:c.mod,hi:c.high,color:'--amber/.6',label:'Moderate'},{lo:null,hi:c.mod,color:'--red',label:'Low'}]
    :[{lo:c.high,hi:null,color:'--green',label:'Primed'},{lo:c.warn,hi:c.high,color:'--green/.5',label:'Good'},{lo:c.mod,hi:c.warn,color:'--amber/.6',label:'Moderate'},{lo:null,hi:c.mod,color:'--red',label:'Low'}];
}
// v123: the pattern in one line ("Mostly good"), with the sharpest fall in view; a fall in the last 3 days leads, with what to look at
function scoreMeaning(info){
  const zs=scoreZones(),cnt=zs.map(z=>[z.label.toLowerCase(),info.pts.filter(p=>chZone({zones:zs},p.v)===z).length]).filter(x=>x[1]).sort((a,b)=>b[1]-a[1]);
  const P=info.pts;let dr=null;
  for(let i=0;i<P.length;i++)for(let j=i+1;j<P.length&&DN(P[j].d)-DN(P[i].d)<=3;j++){const x=P[i].v-P[j].v;if(x>=TH.SCORE_DROP&&(!dr||x>dr.x))dr={x,a:P[i],b:P[j]};}
  if(dr&&dr.b===last(P)&&daysAgo(dr.b.d)<=1)return`Down ${Math.round(dr.x)} points in ${DN(dr.b.d)-DN(dr.a.d)>1?DN(dr.b.d)-DN(dr.a.d)+' days':'a day'}. Look at sleep, stress and training.`;
  const t=cnt.length===1?`All ${cnt[0][0]}`:cnt[0][1]>=info.n*0.6?`Mostly ${cnt[0][0]}`:`A mix of ${cnt[0][0]} and ${cnt[1][0]} days`;
  return t+(dr?`, with a sharp drop ${onDay(dr.b.d)}.`:'.');
}
function renderReadTrend(){
  const d=S(),host=$('readCanvas');if(!host)return;
  const h=d.readHist||{},pts=Object.keys(h).sort().map(dt=>({d:dt,v:h[dt]})).filter(p=>p.v!=null);
  const bh=d.bodyHist||{},bpts=Object.keys(bh).sort().map(dt=>({d:dt,v:bh[dt]})).filter(p=>p.v!=null);
  const note=$('readNote'),live=bodyLive(),f=v=>Math.round(v),c=scoreCuts();
  if(pts.length<2&&bpts.length<2){chUnmount('readCanvas');host.innerHTML='';note.style.display='';note.textContent='Your daily score is saved each time you open the app. A line appears after two days.';return;}
  // v118 parallel run: both lines; the one the gauge uses comes first and is filled, the other dashed. The old readiness ages out of this chart once Body is live.
  const series=[];
  if(live){if(bpts.length>=2)series.push({pts:bpts,color:'--gold-dk',name:'Body',fill:true,fmt:f,vl:v=>String(f(v))});if(pts.length>=2)series.push({pts,color:'--t3',dash:[4,3],name:'Old readiness',lg:true,fmt:f,thin:true,noDots:true});}
  else{if(pts.length>=2)series.push({pts,color:'--gold-dk',name:'Readiness',fill:true,fmt:f,vl:v=>String(f(v))});if(bpts.length>=2)series.push({pts:bpts,color:'--text',dash:[4,3],name:'Body',lg:'Body (new score)',fmt:f,thin:true,noDots:true});}
  const main=series[0].pts,wc={Primed:'good',Good:'good',Moderate:'warn',Low:'bad'};
  mountChart('readCanvas',{key:'read',group:'trends',tb:false,legend:true,H:170,min:live?0:20,max:100,band:rollBand(main,4),yfmt:f,label:live?'Body score':'Readiness',zones:scoreZones(),hi:true,series,
    stats:{good:v=>v>=c.warn},means:scoreMeaning,
    head:x=>{const R=trRight(main,x,{f:v=>[String(f(v)),'']});if(!x.p)return{...R,v:null};const w=scoreWord(x.p.v);
      return{...R,v:String(f(x.p.v)),u:'of 100',st:w,cls:wc[w]||'',sa:wc[w]==='good'?'●':'▼'};}});
  note.style.display='none';note.textContent='';
}
