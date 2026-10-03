// ── REVIEW DATA: shared by the monthly review (the weekly review card was removed in v109) ──
function reviewRange(){
  const m=new Date(td()+'T12:00:00');m.setDate(m.getDate()-((m.getDay()+6)%7));
  const thisMon=ymd(m),a=new Date(m);a.setDate(a.getDate()-7);
  return{from:ymd(a),to:thisMon,thisMon};
}
function reviewData(from,to){
  const d=S();if(!from)({from,to}=reviewRange());const In=x=>x.date>=from&&x.date<to;
  const ws=d.workouts.filter(In).filter(w=>!w.isEx);
  const pr=[];
  const h=exHistory();
  h.forEach((a,ex)=>{let best=0,top=0;a.forEach(x=>{if(x.date<from)best=Math.max(best,x.e1);});a.filter(In).forEach(x=>{if(x.e1>best+0.01&&best>0&&x.e1>top)top=x.e1;});if(top)pr.push(`${ex} ~${Math.round(top*10)/10} kg 1RM`);});
  ['Run','Cycle','Hike','Walk'].forEach(t=>{
    const all=d.workouts.filter(w=>w.type===t&&w.distKm>0),prev=Math.max(0,...all.filter(w=>w.date<from).map(w=>w.distKm)),wk=all.filter(In).sort((x,y)=>y.distKm-x.distKm)[0];
    if(wk&&prev>0&&wk.distKm>prev)pr.push(`Longest ${t.toLowerCase()} ${Math.round(wk.distKm*10)/10} km`);
  });
  const dts=[];for(let x=new Date(from+'T12:00:00');ymd(x)<to;x.setDate(x.getDate()+1))dts.push(ymd(x));
  let planned=0,done=0;
  dts.forEach(dt=>{const p=planOf((new Date(dt+'T12:00:00').getDay()+6)%7);if(p&&p.type!=='Rest'){planned++;if(d.workouts.some(w=>w.date===dt&&plKey(w.type)===plKey(p.type)))done++;}});
  const sl=d.sleepLogs.filter(In).filter(s=>s.durMin),rh=dts.map(x=>(d.readHist||{})[x]).filter(v=>v!=null);
  const min=ws.reduce((a,w)=>a+(w.durMin||0),0),km=ws.filter(w=>w.type!=='Swim').reduce((a,w)=>a+(w.distKm||0),0);
  return{ws,pr,planned,done,min,km,sleepMin:sl.length?avg(sl.map(s=>s.durMin)):null,ready:rh.length?Math.round(avg(rh)):null,from,to};
}
// ── MONTHLY REVIEW: shown on the 1st to 3rd for the calendar month that just ended ──
function monthRange(){
  const n=new Date(td()+'T12:00:00'),f=(y,m)=>ymd(new Date(y,m,1,12));
  const y=n.getFullYear(),m=n.getMonth();
  return{from:f(y,m-1),to:f(y,m),prev:f(y,m-2),key:f(y,m),name:new Date(y,m-1,1).toLocaleString('en',{month:'long'})};
}
function monthExtra(from,to){
  const d=S(),In=x=>x.date>=from&&x.date<to,a=k=>{const v=d.measurements.filter(In).map(m=>m[k]).filter(Boolean);return v.length?avg(v):null;};
  const hv=Object.keys(d.wellness||{}).filter(k=>k>=from&&k<to&&d.wellness[k].hrv).map(k=>d.wellness[k].hrv);
  const ci=d.checkins.filter(In).filter(c=>!c.isEx&&ciFull(c));
  const types={};d.workouts.filter(In).filter(w=>!w.isEx).forEach(w=>types[w.type]=(types[w.type]||0)+1);
  const top=Object.entries(types).sort((x,y)=>y[1]-x[1])[0];
  return{weight:a('weight'),hrv:hv.length>=5?avg(hv):null,mood:ci.length>=5?avg(ci.map(c=>c.mood)):null,checkins:ci.length,top};
}
function renderMonthly(){
  const el=$('monthCard');if(!el)return;
  const d=S(),mr=monthRange(),dom=new Date().getDate();
  if(dom>3||d.profile.monthSeen===mr.key||isExampleOnly()){el.style.display='none';return;}
  const r=reviewData(mr.from,mr.to),p=reviewData(mr.prev,mr.from);
  if(!r.ws.length&&r.sleepMin==null){el.style.display='none';return;}
  const x=monthExtra(mr.from,mr.to),y=monthExtra(mr.prev,mr.from);
  const dl=(a,b,u,inv)=>{if(a==null||b==null)return '';const v=Math.round((a-b)*10)/10;if(!v)return '<span class="rv-d">same as before</span>';return `<span class="rv-d ${(v>0)!==!!inv?'up':'down'}">${v>0?'+':''}${v}${u} vs before</span>`;};
  const t=(k,v,sub)=>`<div class="rv-t"><div class="rv-k">${k}</div><div class="rv-v">${v}</div>${sub?`<div class="rv-sub">${sub}</div>`:''}</div>`;
  const notes=[];
  if(r.planned)notes.push(`You completed ${r.done} of ${r.planned} planned sessions (${Math.round(r.done/r.planned*100)}%).`);
  if(x.top)notes.push(`Most frequent: ${x.top[0].toLowerCase()}, ${x.top[1]} time${x.top[1]===1?'':'s'}.`);
  if(x.weight!=null&&y.weight!=null)notes.push(`Average weight ${Math.round(x.weight*10)/10} kg, ${Math.abs(x.weight-y.weight)<0.1?'unchanged':(x.weight>y.weight?'up ':'down ')+Math.round(Math.abs(x.weight-y.weight)*10)/10+' kg'} on the month before.`);
  if(x.hrv!=null)notes.push(`Heart rate variability averaged ${Math.round(x.hrv)} ms${y.hrv!=null?(Math.round(x.hrv)===Math.round(y.hrv)?', the same as the month before':(x.hrv>y.hrv?', up':', down')+' from '+Math.round(y.hrv)):''}.`);
  if(x.mood!=null)notes.push(`Mood averaged ${x.mood>=3.3?'good':x.mood>=2.5?'so-so':'low'} across ${x.checkins} check-ins.`);
  el.style.display='block';
  el.innerHTML=`<div class="sg-lbl">${mr.name.toUpperCase()} IN REVIEW</div><div class="rv-h">${r.ws.length} session${r.ws.length===1?'':'s'}${r.min?' · '+fmtDur(Math.round(r.min)):''}</div>
    <div class="rv-g rv-g2">${t('Sessions',r.ws.length,dl(r.ws.length,p.ws.length,''))}${t('Distance',Math.round(r.km)+' km',dl(Math.round(r.km),Math.round(p.km),' km'))}${t('Sleep',r.sleepMin!=null?fmtDur(Math.round(r.sleepMin)):'—',p.sleepMin!=null&&r.sleepMin!=null?dl(Math.round(r.sleepMin),Math.round(p.sleepMin),' min'):'')}${t('Readiness',r.ready!=null?r.ready:'—',r.ready!=null&&p.ready!=null?dl(r.ready,p.ready,''):'')}</div>
    ${r.pr.length||notes.length?`<details class="fm-why"><summary>More about the month</summary>${r.pr.length?`<div class="rv-pr">${UI.trophy}<b>New bests:</b> ${r.pr.slice(0,6).map(esc).join(' · ')}</div>`:''}
    ${notes.map(n=>`<div class="set-note">${esc(n)}</div>`).join('')}</details>`:''}
    <div class="rv-b"><button class="btn-out" style="margin:0" onclick="monthDone()">Got it</button></div>`;
}
function monthDone(){const d=S();d.profile.monthSeen=monthRange().key;save(d);markProfile();renderMonthly();}
