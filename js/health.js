// ── HEALTH TAB: baselines, blood markers, injuries, doctor/coach report ──────
const BM=[
  ['Glucose','glucose','70–100 mg/dL (fasting)'],
  ['Total cholesterol','chol','under 200 mg/dL'],
  ['Uric acid','uric','3.5–7.2 mg/dL']
];
const BM_NOTE={
  glucose:'Sleep (a poor night raises fasting glucose), refined carbs and sugary drinks late in the evening, stress, and regular training, which improves how your body handles sugar. Fast 8+ hours before the test for a fair reading.',
  chol:'Saturated fat, fibre (oats, beans, vegetables), body weight and regular aerobic exercise. Changes take 6–12 weeks to show, so retest no sooner than that.',
  uric:'Hydration, alcohol (especially beer), red and organ meat, seafood, sugary drinks and rapid weight loss. Hard training with dehydration can push it up briefly. Water and steady weight help.'
};
const stTxt=s=>s==='ok'?'In range':s==='warn'?'Borderline':'Out of range';
const avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:null;
const pl=(n,w)=>`${n} ${w}${n===1?'':'s'}`;
const r1=v=>Math.round(v*10)/10;
let _hlOpen=null,_hlInf={},_hlWm={};

// the ⓘ beside a card title (the same look as Trends)
function hlInfo(k){_hlInf[k]=!_hlInf[k];const b=$('hib_'+k),t=$('hinf_'+k);if(!b||!t)return;b.classList.toggle('on',_hlInf[k]);b.setAttribute('aria-expanded',_hlInf[k]);t.hidden=!_hlInf[k];}

// ── baselines: the latest reading against your usual (the mean of the TH.HL_USUAL days before it) ──
const hlBefore=(dt,a)=>{const o=daysAgo(dt),x=daysAgo(a);return x>o&&x<=o+TH.HL_USUAL;};
function hlRhr(){
  for(let i=0;i<=TH.HL_USUAL;i++){const dt=dAgo(i),r=rhrOn(dt);if(r){const u=rhrIn(a=>hlBefore(dt,a),r.src);return{v:r.v,date:dt,u:u.length?avg(u):null};}}
  return null;
}
function hlMeas(f,g){
  const ms=S().measurements.filter(m=>m[f]).sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:0);if(!ms.length)return null;
  const c=last(ms),o=ms.filter(m=>hlBefore(c.date,m.date));
  return{c,date:c.date,v:c[f],u:o.length?avg(o.map(m=>m[f])):null,u2:g&&o.length?avg(o.map(m=>m[g])):null};
}
// one row: icon, label, value with its unit, and under it the comparison (glyph coloured by the row's state)
function hlRow(icon,label,v,unit,cmp,cls,date){
  const m=/^([▲▼]) (.*)$/.exec(cmp),g=m?m[1]:cmp.startsWith('at ')?'●':'',t=m?m[2]:cmp,age=date&&daysAgo(date)>1?' · '+fmtD(date):'';
  return`<div class="rf ${cls}">${UI[icon]}<span class="rf-l">${label}</span><span class="rf-r"><span class="rf-v">${v}${unit?` <em>${unit}</em>`:''}</span><span class="rf-n">${g?`<i class="rf-g" aria-hidden="true">${g}</i>`:''}${t}${age}</span></span></div>`;
}
function hlBase(){
  const d=S(),out=[],rh=hlRhr(),wt=hlMeas('weight'),bp=hlMeas('bpSys','bpDia');
  if(rh){const df=rh.u==null?0:Math.round(rh.v)-Math.round(rh.u);
    out.push(hlRow('heart','Resting heart rate',Math.round(rh.v),'bpm',rh.u==null?'First reading':rfVs(rh.v,rh.u,0),rh.u==null?'nt':df>=TH.HL_RHR_UP?'warn':df<=-TH.HL_RHR_UP?'good':'nt',rh.date));}
  if(wt)out.push(hlRow('scale','Weight',r1(wt.v).toFixed(1),'kg',wt.u==null?'First reading':rfVs(wt.v,wt.u,1),'nt',wt.date));
  if(bp){const c=bp.c,ds=bp.u==null?0:c.bpSys-Math.round(bp.u),dd=bp.u==null?0:c.bpDia-Math.round(bp.u2);
    const cmp=bp.u==null?'First reading':!ds&&!dd?'at your usual':`${(ds||dd)>0?'▲':'▼'} usual ${Math.round(bp.u)}/${Math.round(bp.u2)}`;
    out.push(hlRow('gauge','Blood pressure',`${c.bpSys}/${c.bpDia}`,'mmHg',cmp,'nt',bp.date));}
  const goal=d.profile.wtGoal;
  if(goal&&wt){const df=wt.v-goal;out.push(hlRow('target','Weight goal',goal,'kg',Math.abs(df)<TH.WT_GOAL_NEAR?'Reached':`${r1(Math.abs(df)).toFixed(1)} kg to ${df>0?'lose':'gain'}`,'nt'));}
  return out.join('');
}

// ── blood markers: one row each, tapped open to its chart ──
const bmF=(k,v)=>k==='uric'?r1(v):Math.round(v);
// the range under each name, from the same ranges scoreBM uses (mg/dL)
function bmRef(k){const r=BM_RNG[k];return(r.ok[0]>0?`${r.ok[0]} to ${r.ok[1]} mg/dL`:`Under ${r.ok[1]} mg/dL`)+(k==='glucose'?', fasting':'');}
function bmState(v,k){const s=scoreBM(v,k);return s.status==='ok'?{c:'good',g:'●',t:'In range'}:s.status==='warn'?{c:'warn',g:'▲',t:'Borderline'}:{c:'bad',g:s.low?'▼':'▲',t:s.low?'Low':'High'};}
const bmPts=k=>S().bloodLogs.filter(x=>x[k]).sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:0).map(x=>({d:x.date,v:x[k]}));
function bmChg(k,c,p){const df=bmF(k,c-p);return df>0?'up '+df:df<0?'down '+bmF(k,-df):'no change';}
// the header over an open marker's chart: the tapped test (else the latest) and the one before it
function bmHead(k,d){
  const h=$('bth_'+k);if(!h)return;
  const pts=bmPts(k);let i=d?pts.findIndex(p=>p.d===d):pts.length-1;if(i<0)i=pts.length-1;if(i<0)return;
  const c=pts[i],p=pts[i-1],s=bmState(c.v,k),u=' <em>mg/dL</em>';
  h.innerHTML=`<div class="${s.c}"><small>${fmtD(c.d)}</small><b class="v1">${bmF(k,c.v)}${u}</b><span><i>${s.g}</i>${s.t}</span></div>`
    +(p?`<div><small>Previous</small><b class="v2">${bmF(k,p.v)}${u}</b><span>${fmtD(p.d)}</span></div>`:'');
}
// every result for one marker: the healthy range shaded, each dot in its state's colour; no toolbar (bare), drag and pinch stay
function drawBloodChart(k){
  const name=(BM.find(x=>x[1]===k)||[])[0]||k,r=BM_RNG[k],f=v=>bmF(k,v)+' mg/dL',pts=bmPts(k);
  bmHead(k,null);
  mountChart('btc_'+k,{bare:true,vals:true,key:'bt'+k,H:150,span:730,label:name,legend:'Healthy range',yfmt:v=>bmF(k,v),
    yat:r.ok[0]>0?[r.ok[0],r.ok[1]]:[r.ok[1]],zones:[{lo:r.ok[0],hi:r.ok[1],color:'--t3/1.6'}],
    empty:'One result so far. The chart appears after your second test.',
    series:[{name,color:'--t3',thin:true,fmt:f,vl:v=>bmF(k,v),pts,dotColor:v=>({good:'--green',warn:'--amber',bad:'--red'})[bmState(v,k).c]}],
    pick:d=>bmHead(k,d),
    // v123: one line, the state of the latest result in view and the change since the first one
    means:info=>{
      const l=info.last,a=info.first;if(!l)return'';const w=bmState(l.v,k).t,df=l.v-a.v;
      if(a.d===l.d)return w+'.';
      if(!bmF(k,Math.abs(df)))return`${w}, about the same since ${fmtD(a.d)}.`;
      return`${w}, ${df>0?'up':'down'} ${f(Math.abs(df))} since ${fmtD(a.d)}`+(w!=='In range'&&((df<0)===(l.v>r.ok[1]))?': moving towards the range.':'.');}});
}
function hlBm(k){
  const was=_hlOpen===k;if(_hlOpen)chUnmount('btc_'+_hlOpen);_hlOpen=was?null:k;renderHealth();
  if(_hlOpen){const e=$('br_'+k);if(e&&e.scrollIntoView)e.scrollIntoView({block:'nearest'});}
}
function hlBlood(){
  const bl=S().bloodLogs.filter(x=>BM.some(([,k])=>x[k])).sort((a,b)=>a.date<b.date?-1:1);
  if(!bl.length)return'<div class="empty-state" style="padding:8px 0"><div class="empty-icon">'+UI.dna+'</div><div class="empty-title">No blood results yet</div><div class="empty-sub">Enter your latest lab results (mg/dL) and each marker gets a timeline against its healthy range.</div><button class="empty-btn" onclick="logGo(\'lBlood\')">Add lab results</button></div>';
  return`<p class="ksub">Latest test ${fmtD(last(bl).date)}</p>`+BM.map(([name,k])=>{
    const pts=bmPts(k);if(!pts.length)return'';
    const c=last(pts),p=pts[pts.length-2],s=bmState(c.v,k),op=_hlOpen===k,key=`if(event.key==='Enter'||event.key===' '){event.preventDefault();hlBm('${k}')}`;
    return`<div class="br2 ${s.c}" id="br_${k}" role="button" tabindex="0" aria-expanded="${op}" aria-controls="bx_${k}" onclick="hlBm('${k}')" onkeydown="${key}">`
      +`<div class="t"><b>${name}</b><small>${bmRef(k)}</small></div>`
      +`<div class="vv"><b>${bmF(k,c.v)}${op?' <em>mg/dL</em>':''}</b><small><i aria-hidden="true">${s.g}</i>${s.t}${!op&&p?' · '+bmChg(k,c.v,p.v):''}</small></div>${op?UI.chevU:UI.chevD}</div>`
      +(op?`<div class="bx" id="bx_${k}"><div class="vc-hd" id="bth_${k}"></div><div id="btc_${k}"></div>`
        +`<details class="wm"${_hlWm[k]?' open':''} ontoggle="_hlWm['${k}']=this.open"><summary><b>What moves it</b>${UI.chevD}</summary><p>${BM_NOTE[k]}</p></details></div>`:'');
  }).join('');
}

// ── active injuries, each with Mark healed (Log > Injury keeps its own list) ──
const INJ_SEV=['','Mild','Moderate','Severe'];
function hlInj(){
  const inj=S().injuries.filter(i=>i.active);
  if(!inj.length)return'<div class="hl-none"><span>No active injuries.</span><button class="sbtn" onclick="logGo(\'lInjury\')">Log an injury</button></div>';
  return inj.map(i=>`<div class="inj">${UI.bandage}<div class="t"><b>${esc(i.part)}</b><small>${INJ_SEV[i.sev]||''} · since ${fmtD(i.date)}${i.notes?'<br>'+esc(i.notes):''}</small></div><button class="sbtn" onclick="clearInjury('${esc(i.id)}')">Mark healed</button></div>`).join('');
}

function renderHealth(){
  const b=hlBase();
  document.querySelectorAll('#pg-health .ib:empty').forEach(x=>x.innerHTML=TR_I_SVG);
  $('hinf_base').textContent=`Usual is your average over the ${TH.HL_USUAL} days before the latest reading.`;
  $('hBase').innerHTML=b||'<div class="empty-state" style="padding:8px 0"><div class="empty-title">No measurements yet</div><div class="empty-sub">Log weight, blood pressure or resting heart rate and your personal baseline builds here.</div><button class="empty-btn" onclick="logGo(\'lMeas\')">Add a measurement</button></div>';
  if(_hlOpen&&!bmPts(_hlOpen).length){chUnmount('btc_'+_hlOpen);_hlOpen=null;}
  $('hBlood').innerHTML=hlBlood();
  if(_hlOpen)drawBloodChart(_hlOpen);
  $('hInj').innerHTML=hlInj();
}

// ── report: a clean one-page summary the user can save as PDF ────────────────
function buildReport(days=30){
  const d=S(),name=d.profile.name,rng=x=>daysAgo(x.date)<days;
  const sl=d.sleepLogs.filter(rng),ms=d.measurements.filter(rng),ci=d.checkins.filter(rng).filter(ciFull),ws=d.workouts.filter(rng);
  const row=(a,b)=>`<tr><td>${a}</td><td>${b}</td></tr>`;
  const sc=sl.filter(s=>s.score).map(s=>s.score);
  const deep=sl.filter(s=>s.deepH||s.deepM).map(s=>s.deepH*60+s.deepM),rem=sl.filter(s=>s.remH||s.remM).map(s=>s.remH*60+s.remM);
  let sec='';
  sec+=`<h3>Sleep</h3><table>${sc.length?row('Average sleep score',`${Math.round(avg(sc))}/100 (${pl(sc.length,'night')} logged)`)+(deep.length?row('Average deep sleep',fmtDur(Math.round(avg(deep)))):'')+(rem.length?row('Average REM sleep',fmtDur(Math.round(avg(rem)))):''):row('No sleep logged','')}</table>`;
  const wt=ms.filter(m=>m.weight),bp=ms.filter(m=>m.bpSys),hr=ms.filter(m=>m.hr);
  sec+=`<h3>Body</h3><table>${wt.length?row('Weight',wt.length>1?`${wt[0].weight} → ${last(wt).weight} kg (${r1(last(wt).weight-wt[0].weight)>0?'+':''}${r1(last(wt).weight-wt[0].weight)})`:`${wt[0].weight} kg`):''}${bp.length?row('Blood pressure',`avg ${Math.round(avg(bp.map(m=>m.bpSys)))}/${Math.round(avg(bp.map(m=>m.bpDia)))} mmHg, latest ${last(bp).bpSys}/${last(bp).bpDia} (${pl(bp.length,'reading')})`):''}${hr.length?row('Resting heart rate (manual)',`avg ${Math.round(avg(hr.map(m=>m.hr)))} bpm, latest ${last(hr).hr}`):''}${!wt.length&&!bp.length&&!hr.length?row('No measurements logged',''):''}</table>`;
  const dm=sl.filter(x=>x.durMin&&slCounts(x)).map(x=>x.durMin),goal=Math.round((d.profile.sleepGoal||7.5)*60);
  const wl=Object.entries(d.wellness||{}).filter(([dt])=>daysAgo(dt)<days).map(x=>x[1]),hv=wl.filter(w=>w.hrv).map(w=>w.hrv),rh=rhrIn(dt=>daysAgo(dt)<days);
  sec+=`<h3>Recovery</h3><table>${dm.length?row('Average time asleep',`${fmtDur(Math.round(avg(dm)))} (goal ${fmtDur(goal)}, ${pl(dm.length,'night')})`)+row('Nights under goal by 1h+',`${dm.filter(m=>m<goal-60).length} of ${dm.length}`):''}${hv.length?row('HRV',`avg ${Math.round(avg(hv))} ms, range ${Math.round(Math.min(...hv))}–${Math.round(Math.max(...hv))}`):''}${rh.length?row('Resting HR (wearable)',`avg ${Math.round(avg(rh))} bpm, range ${Math.round(Math.min(...rh))}–${Math.round(Math.max(...rh))}`):''}${!dm.length&&!hv.length&&!rh.length?row('No sleep duration or HRV data',''):''}</table>`;
  const by={};ws.forEach(w=>{const b=by[w.type]=by[w.type]||{n:0,min:0,km:0,sets:0};b.n++;b.min+=w.durMin||0;b.km+=w.distKm||0;b.sets+=(w.sets||[]).filter(isWork).length;});
  sec+=`<h3>Training</h3><table>${Object.keys(by).length?Object.entries(by).map(([t,b])=>row(t,`${pl(b.n,'session')}${b.sets?`, ${pl(b.sets,'set')}`:`, ${fmtDur(b.min)}`}${b.km?`, ${t==='Swim'?Math.round(b.km*1000)+' m':r1(b.km)+' km'}`:''}`)).join(''):row('No workouts logged','')}${d.intervalsData.ctl!=null?row('Fitness / fatigue / form',`${d.intervalsData.ctl} / ${d.intervalsData.atl} / ${d.intervalsData.tsb>0?'+':''}${d.intervalsData.tsb}`):''}</table>`;
  if(typeof planWeek==='function'){const pw=planWeek();if(pw.planned)sec+=`<h3>Weekly plan</h3><table>${row('Sessions planned this week',pw.planned)}${row('Done so far',`${pw.done}${pw.due?` (${Math.round(pw.days.filter(x=>x.p&&x.p.type!=='Rest'&&x.dt<=td()&&x.st==='done').length/pw.due*100)}% of those due)`:''}`)}${row('Plan',pw.days.map(x=>PL_DAYS[x.i]+' '+(x.p?esc(x.p.type)+(x.p.note?' ('+esc(x.p.note)+')':''):'—')).join(', '))}</table>`;}
  const m=k=>ci.length?r1(avg(ci.map(c=>c[k]))):null;
  const mind=d.checkins.filter(rng).reduce((a,c)=>a+(c.mindfulMin||0),0);
  sec+=`<h3>Mind (1 = low, 4 = high)</h3><table>${ci.length?row('Check-ins',pl(ci.length,'day'))+row('Mood / energy / motivation',`${m('mood')} / ${m('energy')} / ${m('motivation')}`)+row('Calm (4 = very calm)',r1(5-m('stress'))):row('No check-ins','')}${row('Mindfulness',mind?`${fmtDur(mind)} total`:'none logged')}</table>`;
  const bls=d.bloodLogs.slice().sort((a,b)=>a.date<b.date?-1:1).slice(-4);
  sec+=`<h3>Blood results${bls.length?' (latest '+fmtD(last(bls).date)+')':''}</h3><table>${bls.length?BM.filter(([,k])=>bls.some(b=>b[k])).map(([n,k,ref])=>{const pts=bls.filter(b=>b[k]),c=last(pts),s=scoreBM(c[k],k),pv=pts.length>1?pts[pts.length-2]:null;return row(n,`${pts.map(b=>b[k]).join(' → ')} mg/dL — ${stTxt(s.status)} (ref ${ref})${pv?`, ${c[k]>pv[k]?'up':c[k]<pv[k]?'down':'unchanged'} since ${fmtD(pv.date)}`:''}`);}).join(''):row('No results logged','')}</table>`;
  const inj=d.injuries.filter(i=>i.active);
  sec+=`<h3>Active injuries</h3><table>${inj.length?inj.map(i=>row(esc(i.part),`severity ${i.sev}/3 since ${fmtD(i.date)}${i.notes?' — '+esc(i.notes):''}`)).join(''):row('None','')}</table>`;
  const p=d.profile;
  return`<div class="rp-head"><div><div class="rp-t">Health summary${name?' — '+esc(name):''}</div><div class="rp-s">Last ${days} days · generated ${fmtD(td())}${p.age?' · age '+p.age:''}${p.height?' · '+p.height+' cm':''}</div></div><button class="rp-x" onclick="closeReport()">×</button></div>${sec}<div class="rp-f">Self-tracked with VitalCore. Not a medical record.</div>`;
}
function openReport(days){
  $('reportBody').innerHTML=buildReport(days);$('reportOv').classList.add('show');document.body.classList.add('printing');
}
function closeReport(){$('reportOv').classList.remove('show');document.body.classList.remove('printing');}
function printReport(){window.print();}
