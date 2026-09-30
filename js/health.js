// ── HEALTH TAB: baselines, blood timeline, doctor/coach report ───────────────
const BM=[
  ['Glucose','glucose','70–100 mg/dL (fasting)'],
  ['Total cholesterol','chol','under 200 mg/dL'],
  ['Uric acid','uric','3.5–7.2 mg/dL']
];
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
        <div class="bt-row">${bars}</div>${dif!==null?`<div class="set-note" style="margin-top:6px">${dif===0?'Unchanged':(dif>0?'Up ':'Down ')+Math.abs(dif)} since ${prev.date}.</div>`:'<div class="set-note" style="margin-top:6px">First result. Add another test to see the change.</div>'}</div>`;
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
  const by={};ws.forEach(w=>{const b=by[w.type]=by[w.type]||{n:0,min:0,km:0,sets:0};b.n++;b.min+=w.durMin||0;b.km+=w.distKm||0;b.sets+=(w.sets||[]).filter(isWork).length;});
  sec+=`<h3>Training</h3><table>${Object.keys(by).length?Object.entries(by).map(([t,b])=>row(t,`${pl(b.n,'session')}${b.sets?`, ${pl(b.sets,'set')}`:`, ${fmtDur(b.min)}`}${b.km?`, ${t==='Swim'?Math.round(b.km*1000)+' m':r1(b.km)+' km'}`:''}`)).join(''):row('No workouts logged','')}${d.intervalsData.ctl!=null?row('Fitness / fatigue / form (Intervals.icu)',`${d.intervalsData.ctl} / ${d.intervalsData.atl} / ${d.intervalsData.tsb>0?'+':''}${d.intervalsData.tsb}`):''}</table>`;
  const m=k=>ci.length?r1(avg(ci.map(c=>c[k]))):null;
  const mind=d.checkins.filter(rng).reduce((a,c)=>a+(c.mindfulMin||0),0);
  sec+=`<h3>Mind (1 = low, 4 = high)</h3><table>${ci.length?row('Check-ins',pl(ci.length,'day'))+row('Mood / energy / motivation',`${m('mood')} / ${m('energy')} / ${m('motivation')}`)+row('Calm (4 = very calm)',r1(5-m('stress'))):row('No check-ins','')}${row('Mindfulness',mind?`${fmtDur(mind)} total`:'none logged')}</table>`;
  const bl=last(d.bloodLogs);
  sec+=`<h3>Blood results${bl?' ('+bl.date+')':''}</h3><table>${bl?BM.filter(([,k])=>bl[k]).map(([n,k,ref])=>{const s=scoreBM(bl[k],k);return row(n,`${bl[k]} mg/dL — ${stTxt(s.status)} (ref ${ref})`);}).join(''):row('No results logged','')}</table>`;
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
