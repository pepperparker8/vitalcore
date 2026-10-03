// ── COACH VIEW: one screen for "should I train today, and what should I watch" ──
function coachFlags(){
  const d=S(),fl=[];
  const inj=d.injuries.filter(i=>i.active);
  inj.forEach(i=>fl.push({hard:i.sev>=3,st:i.sev>=3?'bad':'warn',t:`${i.part} injury (${['','mild','moderate','severe'][i.sev]})`,a:'Adjust sessions that load it.'}));
  recoveryDrivers().forEach(r=>{if(r.st!=='ok')fl.push({st:r.st,t:`${r.label}: ${r.val} (${r.base})`,a:r.txt});});
  const wk=loadWeeks();const cur=wk[wk.length-2];if(cur&&cur.jump)fl.push({st:'warn',t:`Last week's load was ${cur.jump}% above your recent average`,a:'Keep this week similar or easier.'});
  const tsb=d.intervalsData&&d.intervalsData.tsb;if(tsb!=null&&tsb<-25)fl.push({hard:1,st:'bad',t:`Form is very low (${Math.round(tsb)})`,a:'You are carrying a lot of fatigue. Plan an easy day.'});
  const b=calcBurnout();if(b.score>=60)fl.push({hard:1,st:'bad',t:'Stress and fatigue signals are high',a:b.sub});
  const ci=d.checkins.find(c=>c.date===td()&&ciFull(c));if(!ci)fl.push({st:'info',t:'No check-in today',a:'A 20-second check-in makes readiness more accurate.'});
  return fl;
}
function coachVerdict(){
  const sc=calcReadiness();if(sc===null)return null;
  const fl=coachFlags(),bad=fl.filter(f=>f.hard).length,warn=fl.filter(f=>f.st==='warn'||f.st==='bad').length;
  const lvl=sc<45||bad?'bad':sc<65||warn>=1?'warn':'ok';
  const head={ok:['Train','You are recovered. Follow the plan and push where it says to.'],warn:['Hold steady','Train, but keep it controlled. Do not add extra load today.'],bad:['Rest','Recovery is the priority. Easy movement or rest.']}[lvl];
  return{lvl,head,sc};
}
// true when today's prescription is rest and nothing has been logged
function restToday(){try{const s=typeof strategy==='function'?strategy():null,d0=s&&s.days&&s.days[0];return !!(d0&&d0.role==='rest'&&!S().workouts.some(w=>w.date===td()));}catch(e){return false;}}
function renderCoach(){
  const el=$('coachCard');if(!el)return;
  const d=S(),sc=calcReadiness();
  if(sc===null){el.innerHTML='<div class="sec">Things to watch</div><div class="empty-state" style="padding:8px 0"><div class="empty-title">Not enough to coach you yet</div><div class="empty-sub">Log last night\'s sleep or do a check-in and anything that needs your attention shows up here.</div><button class="empty-btn" onclick="switchTab(\'today\')">Go to Today</button></div>';return;}
  const fl=coachFlags(),n=daysLogged(14),pw=planWeek();
  const basis=`<div class="set-note" style="margin-top:10px">${n<4?`Early estimate: only ${n} of the last 14 days have data.`:`Based on ${n} of the last 14 days with data.`}</div>`;
  const dot=s=>`<span class="cc-d cc-${s}"></span>`;
  const row=(s,k,v)=>`<div class="cc-r">${dot(s)}<div class="cc-k">${k}</div><div class="cc-v">${v}</div></div>`;
  const wk=loadWeeks(),cw=wk[wk.length-1],pv=wk[wk.length-2];
  const lv=LD_M[_ldMetric][2];
  const rows=[
    row(pw.planned?(pw.due&&pw.done<pw.due?'warn':'ok'):'info','Plan this week',pw.planned?`${pw.done} of ${pw.planned} done`:'No plan set'),
    row(cw&&pv&&pv.total&&cw.total>pv.total*1.25?'warn':'ok','Load this week',cw?`${lv(cw.total)}${pv&&pv.total?` · last week ${lv(pv.total)}`:''}`:'—')
  ].join('');
  el.innerHTML=`<div class="sec">Things to watch</div>${fl.length?fl.map(f=>`<div class="cc-f">${dot(f.st)}<div><b>${esc(f.t)}</b><div class="set-note" style="margin:2px 0 0">${esc(f.a)}</div></div></div>`).join(''):'<div class="set-note">Nothing flagged. Your recovery numbers, load and injuries all look fine.</div>'}
   <div style="margin-top:12px">${rows}</div>${basis}`;
}

function isExampleOnly(){
  const d=S(),real=a=>(a||[]).some(x=>!x.isEx);
  return !(real(d.checkins)||real(d.sleepLogs)||real(d.workouts)||real(d.measurements)||real(d.bloodLogs))&&!Object.keys(d.wellness||{}).length;
}
function daysLogged(n){
  const d=S(),set=new Set();
  [d.checkins,d.sleepLogs,d.workouts,d.measurements].forEach(a=>(a||[]).forEach(x=>{if(!x.isEx&&daysAgo(x.date)<n)set.add(x.date);}));
  Object.keys(d.wellness||{}).forEach(k=>{if(daysAgo(k)<n)set.add(k);});
  return set.size;
}
function renderExTag(){const l=document.querySelector('.ring-lbl');if(l)l.textContent='READY';}
