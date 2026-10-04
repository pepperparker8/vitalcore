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
function formMeaning(info,ctl,atl){
  const l=info.last,now=l.d===last(ctl).d,z=info.zone(l.v);
  let t=`${now?'Form is now':'On '+fmtD(l.d)+' form was'} ${sgn(l.v)}: ${z?z.label.toLowerCase():''}.`;
  const c=inView(ctl,info);
  if(c.length>=2){const a=c[0].v,b=last(c).v;t+=Math.abs(b-a)<1?' Fitness held steady over these dates.':` Fitness ${b>a?'rose':'fell'} from ${Math.round(a)} to ${Math.round(b)} over these dates${b>a?', so your training is building':', so you trained less than before'}.`;}
  if(now&&l.v<TH.FORM_OK){const n=formDaysBack(last(ctl).v,last(atl).v);t+=n?(n===1?' One easy day should bring it back to balanced.':` About ${n} easy days would bring it back to balanced.`):' Getting back to balanced will take more than three weeks of easy training.';}
  else if(now&&l.v>=TH.FORM_FRESH)t+=' A good time for a hard session or a race.';
  return t;
}
function renderFormChart(){
  const d=S(),host=$('formCanvas');if(!host)return;
  const ctl=[],atl=[],tsb=[];
  Object.keys(d.wellness||{}).sort().forEach(dt=>{const w=d.wellness[dt];if(w&&w.ctl!=null&&w.atl!=null){ctl.push({d:dt,v:w.ctl});atl.push({d:dt,v:w.atl});tsb.push({d:dt,v:w.ctl-w.atl});}});
  const note=$('formNote'),sum=$('formSum'),sec=$('tsbSec');
  if(ctl.length<2){
    host.innerHTML='';$('tsbCanvas').innerHTML='';sec.style.display='none';sum.textContent='';
    note.innerHTML=d.intervalsKey?'No fitness data yet. Tap Sync in Settings to pull it.':'Connect Intervals.icu in <a href="#" onclick="openSettings();return false">Settings</a> to see fitness, fatigue and form.';return;
  }
  sec.style.display='';note.textContent='';
  const fm=v=>Math.round(v);
  mountChart('formCanvas',{key:'form',group:'form',H:160,yfmt:fm,label:'Fitness and fatigue',hi:true,series:[{pts:ctl,color:'--text',name:'Fitness',fmt:fm},{pts:atl,color:'--amber',name:'Fatigue',fmt:fm,thin:true}],
    how:'Fitness is your training base, a slow average of about the last six weeks. Fatigue is about the last week. Fatigue above fitness means you are carrying tiredness; the Form chart below shows by how much. Both charts move together.'});
  mountChart('tsbCanvas',{key:'tsb',group:'form',H:150,yfmt:fm,zero:true,label:'Form',zones:formZones(),hi:true,
    series:[{pts:tsb,color:'--teal',name:'Form',fmt:sgn}],
    stats:{good:v=>v>=TH.FORM_OK,label:'balanced or fresher'},
    means:info=>formMeaning(info,ctl,atl),
    how:`Form is fitness minus fatigue. Fresh (${sgn(TH.FORM_FRESH)} and up): rested, good for a race or a hard day. Balanced (${TH.FORM_OK} to ${sgn(TH.FORM_FRESH)}): training and recovery in step. Tired (${TH.FORM_TIRED} to ${TH.FORM_OK}): normal in a hard block, protect your sleep. Very tired (${TH.FORM_DEEP} to ${TH.FORM_TIRED}): plan easier days. Overreached (below ${TH.FORM_DEEP}): rest until it comes back up.`});
  const l=last(tsb).v,f=last(ctl).v,a=last(atl).v;
  sum.textContent=`Fitness ${Math.round(f)} · Fatigue ${Math.round(a)} · Form ${sgn(l)}`;
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
// latest reading in view against its usual range, how many readings in a row sit on the same side, and what that means ([below, inside, above])
function bandMeaning(info,band,fmt,txt,num){
  const P=vsBand(info.pts,band).filter(p=>p.pos!=null);if(!P.length)return'Your usual range appears after 5 days of readings.';
  const l=last(P);let k=0;for(let i=P.length-1;i>=0&&P[i].pos===l.pos;i--)k++;
  const where=['below','inside','above'][l.pos+1];
  return`${l.d===td()?'Today':fmtD(l.d)}: ${fmt(l.v)}, ${where} your usual ${(num||fmt)(l.b.lo)} to ${fmt(l.b.hi)}`+(k>1?` (${k} readings in a row ${where}).`:'.')+' '+txt[l.pos+1];
}
// what a reading below, inside or above its usual range means; shared by Trends and the detail sheets
const BAND_TXT={
  hrv:['Lower than usual means your body is under some stress: hard training, short sleep, illness or worry. Keep the day easy if it stays low.','Nothing to act on.','Higher than usual usually means you are well recovered.'],
  rhr:['Lower than usual usually means you are well recovered.','Nothing to act on.','Resting heart rate above usual is often an early sign of illness or under-recovery. An easy day helps if it stays up.'],
  resp:['Slower than usual is fine.','Steady, as it should be.','Faster breathing while asleep can be an early sign of illness, especially with resting heart rate up or HRV down.']};
function renderRecTrend(){
  const d=S(),card=$('recTrendCard');if(!card)return;
  const wl=d.wellness||{},mk=k=>Object.keys(wl).sort().filter(dt=>wl[dt]&&wl[dt][k]!=null).map(dt=>({d:dt,v:wl[dt][k]}));
  const hv=mk('hrv'),rp=mk('resp');let rh=mk('rhr');
  // one source only: manual readings are used when there are more of them than imported days
  const rm=d.measurements.filter(m=>m.hr).sort((a,b)=>a.date<b.date?-1:1).map(m=>({d:m.date,v:m.hr}));
  if(rm.length>rh.length)rh=rm;
  if(hv.length<2&&rh.length<2&&rp.length<2){card.style.display='none';return;}
  card.style.display='';
  const f=v=>Math.round(v),f1=v=>v.toFixed(1);
  const goodIn=(band,side)=>{const m=new Map(band.map(b=>[b.d,b]));return(v,dt)=>{const b=m.get(dt);return!!b&&(side>0?v>=b.lo:v<=b.hi);};};
  if(hv.length>=2){const band=rollBand(hv,TH.HRV_FLOOR),fm=v=>f(v)+' ms';
    mountChart('hrvCanvas',{key:'hrv',H:150,span:60,yfmt:f,band,label:'Heart rate variability',hi:true,series:[{pts:hv,color:'--teal',name:'HRV',fmt:fm}],
      stats:{good:goodIn(band,1),label:'in or above your usual range'},
      means:info=>bandMeaning(info,band,fm,BAND_TXT.hrv,f),
      how:'Heart rate variability is the small change in time between heartbeats, measured overnight. Above your own usual range means recovered; a few days below it means stress is building. Compare it only with yourself: normal values differ a lot between people.'});}
  else $('hrvCanvas').innerHTML='';
  if(rh.length>=2){const band=rollBand(rh,TH.RHR_FLOOR),fm=v=>f(v)+' bpm';
    mountChart('rhrCanvas',{key:'rhr',H:150,span:60,yfmt:f,band,label:'Resting heart rate',hi:true,series:[{pts:rh,color:'--text',name:'Resting HR',fmt:fm}],
      stats:{good:goodIn(band,-1),label:'in or below your usual range'},
      means:info=>bandMeaning(info,band,fm,BAND_TXT.rhr,f),
      how:'Resting heart rate rises with fatigue, heat, alcohol, stress and an oncoming illness, and slowly falls as you get fitter. A few beats above your usual range for two days or more is worth an easier day.'});}
  else $('rhrCanvas').innerHTML='';
  const rs=$('respSec');if(rs)rs.style.display=rp.length>=2?'':'none';
  if(rp.length>=2){const band=rollBand(rp,0.5),fm=v=>f1(v)+' /min',lb=last(band),watch=lb?(lb.lo+lb.hi)/2+TH.ILL_RESP:null;
    mountChart('respCanvas',{key:'resp',H:150,span:60,yfmt:f1,band,label:'Breathing rate while asleep',hi:true,series:[{pts:rp,color:'--teal',name:'Breathing rate',fmt:fm}],
      lines:watch!=null?[{v:watch,label:'Illness watch',color:'--amber'}]:[],
      stats:{good:goodIn(band,-1),label:'in or below your usual range'},
      means:info=>{let t=bandMeaning(info,band,fm,BAND_TXT.resp,f1);
        if(watch!=null&&info.last.v>=watch)t+=' It is at the illness-watch line.';return t;},
      how:`Breathing rate while asleep is normally very steady. The amber line sits ${TH.ILL_RESP} breath a minute above your usual. Crossing it together with a higher resting heart rate or a lower HRV sets the day to Rest.`});}
  else $('respCanvas').innerHTML='';
}
// score zones: the gauge's words (scoreWord) and cuts (scoreCuts)
function scoreZones(){
  const c=scoreCuts();
  return bodyLive()?[{lo:c.high,hi:null,color:'--green',label:'Good'},{lo:c.mod,hi:c.high,color:'--amber/.6',label:'Moderate'},{lo:null,hi:c.mod,color:'--red',label:'Low'}]
    :[{lo:c.high,hi:null,color:'--green',label:'Primed'},{lo:c.warn,hi:c.high,color:'--green/.5',label:'Good'},{lo:c.mod,hi:c.warn,color:'--amber/.6',label:'Moderate'},{lo:null,hi:c.mod,color:'--red',label:'Low'}];
}
function scoreMeaning(info){
  const zs=scoreZones(),cnt=zs.map(z=>[z.label,info.pts.filter(p=>chZone({zones:zs},p.v)===z).length]).filter(x=>x[1]);
  let t=`Of ${info.n} days here: `+cnt.map(([l,n])=>`${n} ${l.toLowerCase()}`).join(', ')+'.';
  // the biggest fall within 3 days in view
  const P=info.pts;let dr=null;
  for(let i=0;i<P.length;i++)for(let j=i+1;j<P.length&&DN(P[j].d)-DN(P[i].d)<=3;j++){const x=P[i].v-P[j].v;if(x>=TH.SCORE_DROP&&(!dr||x>dr.x))dr={x,a:P[i],b:P[j]};}
  t+=dr?` It fell ${Math.round(dr.x)} points in ${DN(dr.b.d)-DN(dr.a.d)} day${DN(dr.b.d)-DN(dr.a.d)>1?'s':''} to ${fmtD(dr.b.d)}: look at sleep, stress and training around then.`:' No sharp falls in view.';
  return t;
}
function renderReadTrend(){
  const d=S(),host=$('readCanvas');if(!host)return;
  const h=d.readHist||{},pts=Object.keys(h).sort().map(dt=>({d:dt,v:h[dt]})).filter(p=>p.v!=null);
  const bh=d.bodyHist||{},bpts=Object.keys(bh).sort().map(dt=>({d:dt,v:bh[dt]})).filter(p=>p.v!=null);
  const note=$('readNote'),live=bodyLive(),f=v=>Math.round(v),c=scoreCuts();
  if(pts.length<2&&bpts.length<2){host.innerHTML='';note.style.display='';note.textContent='Your daily score is saved each time you open the app. A line appears after two days.';return;}
  // v118 parallel run: both lines; the one the gauge uses comes first and is filled, the other dashed. The old readiness ages out of this chart once Body is live.
  const series=[];
  if(live){if(bpts.length>=2)series.push({pts:bpts,color:'--gold-dk',name:'Body',fill:true,fmt:f});if(pts.length>=2)series.push({pts,color:'--t3',dash:[4,3],name:'Old readiness',fmt:f,thin:true,noDots:true});}
  else{if(pts.length>=2)series.push({pts,color:'--gold-dk',name:'Readiness',fill:true,fmt:f});if(bpts.length>=2)series.push({pts:bpts,color:'--text',dash:[4,3],name:'Body',fmt:f,thin:true,noDots:true});}
  const main=series[0].pts;
  mountChart('readCanvas',{key:'read',H:170,min:live?0:20,max:100,band:rollBand(main,4),yfmt:f,label:live?'Body score':'Readiness',zones:scoreZones(),hi:true,series,
    stats:{good:v=>v>=c.warn,label:live?'good':'good or primed'},means:scoreMeaning,
    how:live?`Body is heart rate variability, resting heart rate and sleep against your own usual. Good from ${TH.BODY_GREEN}, moderate from ${TH.BODY_YELLOW}, low below that. The shaded band is your usual range over the 4 weeks before each day. The dashed line is the old readiness score, kept for comparison.`
      :`Primed from ${TH.OLD_HIGH}: ready for a hard day. Good from ${TH.OLD_WARN}, moderate from ${TH.OLD_MOD}, low below ${TH.OLD_MOD}: go easy. The shaded band is your usual range over the 4 weeks before each day. The dashed line is Body (heart rate variability, resting heart rate and sleep only), which takes over after ${TH.PARALLEL_DAYS} days.`});
  note.style.display=live?'none':'';note.textContent=live?'':`Body runs alongside the old readiness for ${TH.PARALLEL_DAYS} days: ${bpts.length} of ${TH.PARALLEL_DAYS} recorded.`;
}
