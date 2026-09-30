// ── HEALTH TAB: baselines, blood timeline, doctor/coach report ───────────────
const BM=[
  ['Glucose','glucose','70–100 mg/dL (fasting)'],
  ['Total cholesterol','chol','under 200 mg/dL'],
  ['Uric acid','uric','3.5–7.2 mg/dL']
];
const BM_NOTE={
  glucose:'Moves with: sleep (a poor night raises fasting glucose), refined carbs and sugary drinks late in the evening, stress, and regular training, which improves how your body handles sugar. Fast 8+ hours before the test for a fair reading.',
  chol:'Moves with: saturated fat, fibre (oats, beans, vegetables), body weight and regular aerobic exercise. Changes take 6–12 weeks to show, so retest no sooner than that.',
  uric:'Moves with: hydration, alcohol (especially beer), red and organ meat, seafood, sugary drinks and rapid weight loss. Hard training with dehydration can push it up briefly. Water and steady weight help.'
};
function toggleBT(k){
  const p=$('btp_'+k);if(!p)return;const open=p.classList.toggle('open');
  const b=$('btb_'+k);if(b)b.textContent=open?'Hide trend ▴':'Trend & what moves it ▾';
  if(open)drawBloodChart(k);
}
// time-scaled chart of every result for one marker, with the reference band shaded
function drawBloodChart(k){
  const c=$('btc_'+k);if(!c)return;
  const pts=S().bloodLogs.filter(x=>x[k]).sort((a,b)=>a.date<b.date?-1:1).map(x=>({t:new Date(x.date+'T12:00:00').getTime(),v:x[k],date:x.date}));
  const{ctx,W}=sizeCanvas(c,150),H=150,L=32,R=12,T=10,B=20;
  const rng={glucose:[70,100],chol:[0,200],uric:[3.5,7.2]}[k];
  let mn=Math.min(...pts.map(p=>p.v),rng[0]||0),mx=Math.max(...pts.map(p=>p.v),rng[1]);
  const pad=(mx-mn)*0.15||1;mn=Math.max(0,mn-pad);mx+=pad;
  const t0=pts[0].t,t1=Math.max(last(pts).t,t0+30*864e5);
  const X=t=>L+(t-t0)*(W-L-R)/(t1-t0),Y=v=>T+(mx-v)*(H-T-B)/(mx-mn);
  ctx.clearRect(0,0,W,H);
  ctx.fillStyle=cssv('--green');ctx.globalAlpha=0.12;ctx.fillRect(L,Y(rng[1]),W-L-R,Y(Math.max(rng[0],mn))-Y(rng[1]));ctx.globalAlpha=1;
  ctx.font='9px "IBM Plex Mono",monospace';ctx.textBaseline='middle';ctx.textAlign='right';
  for(let i=0;i<=3;i++){const v=mn+(mx-mn)*i/3,y=Y(v);ctx.strokeStyle=cssv('--bdr');ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(L,y);ctx.lineTo(W-R,y);ctx.stroke();ctx.fillStyle=cssv('--t3');ctx.fillText(Math.round(v*10)/10,L-4,y);}
  ctx.textAlign='center';ctx.fillStyle=cssv('--t3');
  [pts[0],last(pts)].forEach((p,i)=>{if(i&&pts.length<2)return;ctx.textAlign=i?'right':'left';ctx.fillText(p.date.slice(2),i?W-R:L,H-6);});
  ctx.strokeStyle=cssv('--text');ctx.lineWidth=1.5;ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(X(p.t),Y(p.v)):ctx.moveTo(X(p.t),Y(p.v)));ctx.stroke();
  pts.forEach(p=>{const st=scoreBM(p.v,k).status;ctx.fillStyle=cssv(st==='ok'?'--green':st==='warn'?'--amber':'--red');ctx.beginPath();ctx.arc(X(p.t),Y(p.v),4,0,7);ctx.fill();});
}
const stCol=s=>s==='ok'?'var(--green)':s==='warn'?'var(--amber)':'var(--red)';
const stTxt=s=>s==='ok'?'In range':s==='warn'?'Borderline':'Out of range';
const avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:null;
const pl=(n,w)=>`${n} ${w}${n===1?'':'s'}`;
const r1=v=>Math.round(v*10)/10;

function baseline(field,days){
  const ms=S().measurements.filter(m=>m[field]);
  if(!ms.length)return null;
  const cur=last(ms),older=ms.filter(m=>m!==cur&&daysAgo(m.date)<=days);
  return{cur:cur[field],date:cur.date,avg:older.length?avg(older.map(m=>m[field])):null,n:older.length};
}
function baseRow(label,b,unit,fmt=v=>v,goodLow=null){
  if(!b)return`<div class="hist-row"><span>${label}</span><span class="hist-val">—</span></div>`;
  let note='<small style="color:var(--t3)"> · first entries</small>';
  if(b.avg!==null){
    const diff=b.cur-b.avg,ad=Math.abs(diff)<0.05?0:diff;
    const col=ad===0||goodLow===null?'var(--t2)':((ad<0)===goodLow?'var(--green)':'var(--amber)');
    note=`<small style="color:${col}"> · ${ad===0?'same as':ad>0?'+'+r1(ad):'−'+r1(-ad)+' vs'} your ${b.n>1?'30-day ':''}avg ${fmt(r1(b.avg))}</small>`;
  }
  return`<div class="hist-row"><span>${label}</span><span class="hist-val">${fmt(b.cur)} ${unit}${note}</span></div>`;
}
function renderHealth(){
  const d=S();
  const bp=(()=>{const ms=d.measurements.filter(m=>m.bpSys);if(!ms.length)return null;const c=last(ms),o=ms.filter(m=>m!==c&&daysAgo(m.date)<=30);return{cur:c,avgS:o.length?avg(o.map(m=>m.bpSys)):null,avgD:o.length?avg(o.map(m=>m.bpDia)):null};})();
  const goal=d.profile.wtGoal;
  $('hBase').innerHTML=
    baseRow('Resting heart rate',baseline('hr',30),'bpm',v=>v,true)+
    baseRow('Weight',baseline('weight',30),'kg',v=>v,null)+
    (bp?`<div class="hist-row"><span>Blood pressure</span><span class="hist-val">${bp.cur.bpSys}/${bp.cur.bpDia} mmHg${bp.avgS!==null?`<small style="color:var(--t2)"> · avg ${Math.round(bp.avgS)}/${Math.round(bp.avgD)}</small>`:''}</span></div>`:baseRow('Blood pressure',null,''))+
    (goal&&last(d.measurements.filter(m=>m.weight))?`<div class="hist-row"><span>Weight goal</span><span class="hist-val">${goal} kg<small style="color:var(--t2)"> · ${r1(last(d.measurements.filter(m=>m.weight)).weight-goal)>0?r1(last(d.measurements.filter(m=>m.weight)).weight-goal)+' kg to lose':'reached'}</small></span></div>`:'');
  if(!d.measurements.length)$('hBase').innerHTML='<div class="empty-state" style="padding:8px 0"><div class="empty-title">No measurements yet</div><div class="empty-sub">Log weight, blood pressure or resting heart rate and your personal baseline builds here.</div><button class="empty-btn" onclick="switchTab(\'log\');openLog(\'lMeas\')">Add a measurement</button></div>';

  const bl=d.bloodLogs.slice().sort((a,b)=>a.date<b.date?-1:1);
  if(!bl.length){
    $('hBlood').innerHTML='<div class="empty-state" style="padding:8px 0"><div class="empty-icon">🧬</div><div class="empty-title">No blood results yet</div><div class="empty-sub">Enter your latest lab results (mg/dL) and each marker gets a timeline against its reference range.</div><button class="empty-btn" onclick="switchTab(\'log\');openLog(\'lBlood\')">Add lab results</button></div>';
  }else{
    $('hBlood').innerHTML=BM.map(([name,k,ref])=>{
      const pts=bl.filter(x=>x[k]).slice(-8);
      if(!pts.length)return'';
      const cur=last(pts),s=scoreBM(cur[k],k),prev=pts.length>1?pts[pts.length-2]:null;
      const mx=Math.max(...pts.map(p=>p[k]))||1;
      const dif=prev?r1(cur[k]-prev[k]):null;
      const bars=pts.map(p=>{const ss=scoreBM(p[k],k);return`<div class="bt-c"><div class="bt-v">${p[k]}</div><div class="bt-b" style="height:${Math.round(p[k]/mx*44)+4}px;background:${stCol(ss.status)}"></div><div class="bt-d">${p.date.slice(2,7).replace('-','/')}</div></div>`;}).join('');
      return`<div class="bt-card"><div class="bt-h"><div><div class="bm-name">${name}</div><div class="bm-unit">Reference: ${ref}</div></div><div style="text-align:right"><div class="bt-now" style="color:${stCol(s.status)}">${cur[k]}</div><div class="bt-st" style="color:${stCol(s.status)}">${stTxt(s.status)}</div></div></div>
        <div class="bt-row">${bars}</div>${dif!==null?`<div class="set-note" style="margin-top:6px">${dif===0?'Unchanged':(dif>0?'Up ':'Down ')+Math.abs(dif)} since ${prev.date}.</div>`:'<div class="set-note" style="margin-top:6px">First result. Add another test to see the change.</div>'}
        <button class="bt-more" id="btb_${k}" onclick="toggleBT('${k}')">Trend & what moves it ▾</button>
        <div class="bt-panel" id="btp_${k}"><canvas id="btc_${k}" style="width:100%;height:150px;display:block"></canvas><div class="set-note" style="margin-top:8px">${pts.length<2?'One result so far. The chart becomes useful after your second test. ':'Green band is the reference range. '}${BM_NOTE[k]}</div></div></div>`;
    }).join('')+'<div class="set-note">Reference ranges are general adult guides. Your doctor decides what is right for you.</div>';
  }
  const inj=d.injuries.filter(i=>i.active);
  $('hInj').innerHTML=inj.length?inj.map(i=>`<div class="hist-row"><span>${esc(i.part)}</span><span class="hist-val">severity ${i.sev}/3 · since ${i.date}</span></div>`).join(''):'<div style="font-size:12px;color:var(--t3)">No active injuries. Add or heal them in the Log tab.</div>';
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
  sec+=`<h3>Body</h3><table>${wt.length?row('Weight',wt.length>1?`${wt[0].weight} → ${last(wt).weight} kg (${r1(last(wt).weight-wt[0].weight)>0?'+':''}${r1(last(wt).weight-wt[0].weight)})`:`${wt[0].weight} kg`):''}${bp.length?row('Blood pressure',`avg ${Math.round(avg(bp.map(m=>m.bpSys)))}/${Math.round(avg(bp.map(m=>m.bpDia)))} mmHg, latest ${last(bp).bpSys}/${last(bp).bpDia} (${pl(bp.length,'reading')})`):''}${hr.length?row('Resting heart rate',`avg ${Math.round(avg(hr.map(m=>m.hr)))} bpm, latest ${last(hr).hr}`):''}${!wt.length&&!bp.length&&!hr.length?row('No measurements logged',''):''}</table>`;
  const dm=sl.filter(x=>x.durMin).map(x=>x.durMin),goal=Math.round((d.profile.sleepGoal||7.5)*60);
  const wl=Object.entries(d.wellness||{}).filter(([dt])=>daysAgo(dt)<days).map(x=>x[1]),hv=wl.filter(w=>w.hrv).map(w=>w.hrv),rh=wl.filter(w=>w.rhr).map(w=>w.rhr);
  sec+=`<h3>Recovery</h3><table>${dm.length?row('Average time asleep',`${fmtDur(Math.round(avg(dm)))} (goal ${fmtDur(goal)}, ${pl(dm.length,'night')})`)+row('Nights under goal by 1h+',`${dm.filter(m=>m<goal-60).length} of ${dm.length}`):''}${hv.length?row('HRV',`avg ${Math.round(avg(hv))} ms, range ${Math.round(Math.min(...hv))}–${Math.round(Math.max(...hv))}`):''}${rh.length?row('Resting HR (wearable)',`avg ${Math.round(avg(rh))} bpm, range ${Math.round(Math.min(...rh))}–${Math.round(Math.max(...rh))}`):''}${!dm.length&&!hv.length&&!rh.length?row('No sleep duration or HRV data',''):''}</table>`;
  const by={};ws.forEach(w=>{const b=by[w.type]=by[w.type]||{n:0,min:0,km:0,sets:0};b.n++;b.min+=w.durMin||0;b.km+=w.distKm||0;b.sets+=(w.sets||[]).filter(isWork).length;});
  sec+=`<h3>Training</h3><table>${Object.keys(by).length?Object.entries(by).map(([t,b])=>row(t,`${pl(b.n,'session')}${b.sets?`, ${pl(b.sets,'set')}`:`, ${fmtDur(b.min)}`}${b.km?`, ${t==='Swim'?Math.round(b.km*1000)+' m':r1(b.km)+' km'}`:''}`)).join(''):row('No workouts logged','')}${d.intervalsData.ctl!=null?row('Fitness / fatigue / form (Intervals.icu)',`${d.intervalsData.ctl} / ${d.intervalsData.atl} / ${d.intervalsData.tsb>0?'+':''}${d.intervalsData.tsb}`):''}</table>`;
  const m=k=>ci.length?r1(avg(ci.map(c=>c[k]))):null;
  const mind=d.checkins.filter(rng).reduce((a,c)=>a+(c.mindfulMin||0),0);
  sec+=`<h3>Mind (1 = low, 4 = high)</h3><table>${ci.length?row('Check-ins',pl(ci.length,'day'))+row('Mood / energy / motivation',`${m('mood')} / ${m('energy')} / ${m('motivation')}`)+row('Calm (4 = very calm)',r1(5-m('stress'))):row('No check-ins','')}${row('Mindfulness',mind?`${fmtDur(mind)} total`:'none logged')}</table>`;
  const bls=d.bloodLogs.slice().sort((a,b)=>a.date<b.date?-1:1).slice(-4);
  sec+=`<h3>Blood results${bls.length?' (latest '+last(bls).date+')':''}</h3><table>${bls.length?BM.filter(([,k])=>bls.some(b=>b[k])).map(([n,k,ref])=>{const pts=bls.filter(b=>b[k]),c=last(pts),s=scoreBM(c[k],k),pv=pts.length>1?pts[pts.length-2]:null;return row(n,`${pts.map(b=>b[k]).join(' → ')} mg/dL — ${stTxt(s.status)} (ref ${ref})${pv?`, ${c[k]>pv[k]?'up':c[k]<pv[k]?'down':'unchanged'} since ${pv.date}`:''}`);}).join(''):row('No results logged','')}</table>`;
  const inj=d.injuries.filter(i=>i.active);
  sec+=`<h3>Active injuries</h3><table>${inj.length?inj.map(i=>row(esc(i.part),`severity ${i.sev}/3 since ${i.date}${i.notes?' — '+esc(i.notes):''}`)).join(''):row('None','')}</table>`;
  const p=d.profile;
  return`<div class="rp-head"><div><div class="rp-t">Health summary${name?' — '+esc(name):''}</div><div class="rp-s">Last ${days} days · generated ${td()}${p.age?' · age '+p.age:''}${p.height?' · '+p.height+' cm':''}</div></div><button class="rp-x" onclick="closeReport()">×</button></div>${sec}<div class="rp-f">Self-tracked with VitalCore. Not a medical record.</div>`;
}
function openReport(days){
  $('reportBody').innerHTML=buildReport(days);$('reportOv').classList.add('show');document.body.classList.add('printing');
}
function closeReport(){$('reportOv').classList.remove('show');document.body.classList.remove('printing');}
function printReport(){window.print();}
