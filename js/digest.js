// ── WEEKLY DIGEST: last 7 days vs the 7 before (local, no API key) ───────────
function digestWeek(from,to){
  const d=S(),In=x=>{const a=daysAgo(x.date);return a>=from&&a<to;};
  const ws=d.workouts.filter(In),sl=d.sleepLogs.filter(In).filter(s=>s.score),ci=d.checkins.filter(In).filter(ciFull);
  const wt=d.measurements.filter(In).filter(m=>m.weight);
  const A=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:null;
  return{
    sessions:ws.length,
    min:ws.reduce((a,w)=>a+(w.durMin||0),0),
    km:ws.filter(w=>w.type!=='Swim').reduce((a,w)=>a+(w.distKm||0),0),
    swimM:ws.filter(w=>w.type==='Swim').reduce((a,w)=>a+(w.distKm||0)*1000,0),
    sets:ws.reduce((a,w)=>a+(w.sets||[]).filter(isWork).length,0),
    sleep:A(sl.map(s=>s.score)),nSleep:sl.length,
    mood:A(ci.map(c=>c.mood)),energy:A(ci.map(c=>c.energy)),calm:A(ci.map(c=>5-c.stress)),nCi:ci.length,
    mindful:d.checkins.filter(In).reduce((a,c)=>a+(c.mindfulMin||0),0),
    sleepMin:A(d.sleepLogs.filter(In).filter(s=>s.durMin).map(s=>s.durMin)),
    hrv:A(Object.entries(d.wellness||{}).filter(([dt,w])=>w.hrv&&In({date:dt})).map(([,w])=>w.hrv)),
    rhr:A(Object.entries(d.wellness||{}).filter(([dt,w])=>w.rhr&&In({date:dt})).map(([,w])=>w.rhr)),
    weight:wt.length?last(wt).weight:null,
    days:new Set([...ws,...d.checkins.filter(In)].map(x=>x.date)).size
  };
}
function renderDigest(){
  const el=$('digestCard');if(!el)return;
  const t=digestWeek(0,7),p=digestWeek(7,14);
  if(!t.sessions&&!t.nCi&&!t.nSleep){
    el.innerHTML='<div class="sec">Your week in numbers</div><div class="empty-state" style="padding:8px 0"><div class="empty-title">Nothing logged in the last 7 days</div><div class="empty-sub">Do a daily check-in or log a workout and your weekly summary builds here.</div><button class="empty-btn" onclick="switchTab(\'today\')">Go to Today</button></div>';return;
  }
  // d(value, prev, format, higherIsBetter|null): arrow + change vs last week
  const dl=(v,pv,fmt,good)=>{
    if(v==null||pv==null)return'';
    const df=v-pv;if(Math.abs(df)<0.05)return'<span class="dg-d">same</span>';
    const col=good===null?'var(--t3)':(df>0)===good?'var(--green)':'var(--amber)';
    return`<span class="dg-d" style="color:${col}">${df>0?'▲':'▼'} ${fmt(Math.abs(df))}</span>`;
  };
  const r1=v=>Math.round(v*10)/10,n0=v=>Math.round(v);
  const row=(l,v,extra)=>`<div class="dg-r"><span>${l}</span><span class="dg-v">${v}${extra||''}</span></div>`;
  let h='<div class="sec">Your week in numbers <small style="font-weight:400;color:var(--t3)">last 7 days, change vs the week before</small></div>';
  h+=row('Active days',`${t.days} of 7`,dl(t.days,p.days,n0,true));
  if(typeof planWeek==='function'){const pw=planWeek();if(pw.planned)h+=row('Plan followed',`${pw.done} of ${pw.planned}`,'<span class="dg-d">this week</span>');}
  h+=row('Workouts',t.sessions,dl(t.sessions,p.sessions,n0,null));
  h+=row('Training time',fmtDur(t.min),dl(t.min,p.min,m=>fmtDur(Math.round(m)),null));
  if(t.km||p.km)h+=row('Distance',r1(t.km)+' km',dl(t.km,p.km,v=>r1(v)+' km',null));
  if(t.swimM||p.swimM)h+=row('Swim',n0(t.swimM)+' m',dl(t.swimM,p.swimM,v=>n0(v)+' m',null));
  if(t.sets||p.sets)h+=row('Hard sets',t.sets,dl(t.sets,p.sets,n0,null));
  h+=row('Sleep score',t.sleep!=null?`${n0(t.sleep)}/100`:'—',dl(t.sleep,p.sleep,n0,true));
  if(t.sleepMin!=null)h+=row('Time asleep (avg)',fmtDur(Math.round(t.sleepMin)),dl(t.sleepMin,p.sleepMin,m=>fmtDur(Math.round(m)),true));
  if(t.hrv!=null)h+=row('HRV (avg)',n0(t.hrv)+' ms',dl(t.hrv,p.hrv,n0,true));
  if(t.rhr!=null)h+=row('Resting HR (avg)',n0(t.rhr)+' bpm',dl(t.rhr,p.rhr,r1,false));
  h+=row('Mood (1–4)',t.mood!=null?r1(t.mood):'—',dl(t.mood,p.mood,r1,true));
  h+=row('Energy (1–4)',t.energy!=null?r1(t.energy):'—',dl(t.energy,p.energy,r1,true));
  h+=row('Calm (4 = very calm)',t.calm!=null?r1(t.calm):'—',dl(t.calm,p.calm,r1,true));
  h+=row('Mindfulness',t.mindful?fmtDur(t.mindful):'—',dl(t.mindful,p.mindful,m=>fmtDur(Math.round(m)),true));
  if(t.weight!=null)h+=row('Weight',t.weight+' kg');
  const notes=[];
  const stood=[];
  if(t.sleepMin!=null&&p.sleepMin&&t.sleepMin<p.sleepMin-20)stood.push(`You slept ${fmtDur(Math.round(p.sleepMin-t.sleepMin))} less per night than the week before.`);
  if(t.hrv!=null&&p.hrv&&t.hrv<p.hrv*0.93)stood.push('HRV dipped, a sign your body was under more strain.');
  if(t.min>p.min*1.3&&p.min>0)stood.push('Training time rose by more than 30%. Watch recovery next week.');
  if(t.mood!=null&&p.mood&&t.mood<p.mood-0.4)stood.push('Mood fell noticeably. Compare it with sleep and training above.');
  const dr=(typeof recoveryDrivers==='function'?recoveryDrivers():[]).find(x=>x.k==='debt'&&x.st!=='ok');
  if(dr)stood.push(dr.txt);
  if(stood.length)h+=`<div class="dg-out"><b>What stood out</b><br>${stood.map(esc).join('<br>')}</div>`;
  if(t.nCi<4)notes.push(`Only ${t.nCi} full check-in${t.nCi===1?'':'s'} this week, so mood averages are rough.`);
  if(t.nSleep<4)notes.push(`Only ${t.nSleep} night${t.nSleep===1?'':'s'} of sleep logged.`);
  if(notes.length)h+=`<div class="set-note" style="margin-top:8px">${notes.join(' ')}</div>`;
  el.innerHTML=h;
}
