// ── HEALTH TAB: baselines, blood markers, injuries, doctor/coach report ──────
const BM=[
  ['Glucose','glucose','70–100 mg/dL (fasting)'],
  ['Total cholesterol','chol','under 200 mg/dL'],
  ['Uric acid','uric','3.5–6.8 mg/dL']
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
  const ms=S().measurements.filter(m=>m[f]).sort(msCmp);if(!ms.length)return null;
  const c=last(ms),o=ms.filter(m=>hlBefore(c.date,m.date));
  return{c,date:c.date,v:c[f],u:o.length?avg(o.map(m=>m[f])):null,u2:g&&o.length?avg(o.map(m=>m[g])):null};
}
// ── v140: body composition from a weigh-in with impedance (published equations, estimates only) ──
// H height cm, W weight kg, R impedance ohms (50 kHz, foot to foot); sex unset = the average of the two.
// Never in a score, the fuel targets or the briefing; the scale maker's own formulas are not used.
const scSx=(m,f)=>{const x=S().profile.sex;return x==='m'?m:x==='f'?f:(m+f)/2;};
function scComp(rec){
  const p=S().profile,H=p.height,W=rec&&rec.weight,R=rec&&rec.imp;
  if(!W||!(H>=TH.SC_H_RNG[0]&&H<=TH.SC_H_RNG[1]))return null;
  const o={bmi:W/((H/100)*(H/100))};  // BMI = kg / m²
  if(!R||p.age<TH.SC_AGE_MIN)return o;
  const hr=H*H/R;
  // fat-free mass: Sun SS et al. 2003, Am J Clin Nutr 77:331-40 (NHANES III)
  o.ffm=scSx(-10.678+0.652*hr+0.262*W+0.015*R,-9.529+0.696*hr+0.168*W+0.016*R);
  o.fat=(W-o.ffm)/W*100;
  // total body water: Sun SS et al. 2003, same paper; as a share of weight
  o.tbw=scSx(1.203+0.449*hr+0.176*W,3.747+0.450*hr+0.113*W)/W*100;
  // skeletal muscle mass: Janssen I et al. 2000, J Appl Physiol 89:465-71 (sex 1 man, 0 woman)
  o.smm=0.401*hr+3.825*scSx(1,0)-0.071*p.age+5.102;
  // resting energy from fat-free mass: Katch-McArdle, 370 + 21.6 × fat-free mass
  o.ree=370+21.6*o.ffm;
  if(!(o.ffm>0&&o.ffm<W&&o.smm>0))return{bmi:o.bmi};
  return o;
}
// the latest weigh-in with impedance against the mean of those in the TH.HL_USUAL days before it
function hlComp(){
  const ms=S().measurements.filter(m=>m.weight&&m.imp).sort(msCmp);if(!ms.length)return null;
  const c=last(ms),cc=scComp(c);if(!cc||cc.fat==null)return null;
  const o=ms.filter(m=>hlBefore(c.date,m.date)).map(scComp).filter(x=>x&&x.fat!=null);
  const u=k=>o.length?avg(o.map(x=>x[k])):null;
  return{date:c.date,v:cc,u:{fat:u('fat'),ffm:u('ffm'),tbw:u('tbw'),smm:u('smm'),ree:u('ree')}};
}
// one row: icon, label, value with its unit, and under it the comparison (glyph coloured by the row's state)
// v141: with a key the row opens in place to its chart (one open at a time, shared with the blood markers)
function hlRow(icon,label,v,unit,cmp,cls,date,k){
  const m=/^([▲▼●]) (.*)$/.exec(cmp),g=m?m[1]:cmp.startsWith('at ')?'●':'',t=m?m[2]:cmp,age=date&&daysAgo(date)>1?' · '+fmtD(date):'';
  const op=k&&_hlOpen===k,at=k?` id="hr_${k}" role="button" tabindex="0" aria-expanded="${op}" aria-controls="hx_${k}" onclick="hlOpen('${k}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();hlOpen('${k}')}"`:'';
  return`<div class="rf ${cls}"${at}>${UI[icon]}<span class="rf-l">${label}</span><span class="rf-r"><span class="rf-v">${v}${unit?` <em>${unit}</em>`:''}</span><span class="rf-n">${g?`<i class="rf-g" aria-hidden="true">${g}</i>`:''}${t}${age}</span></span>${k?(op?UI.chevU:UI.chevD):''}</div>`
    +(op?`<div class="bx" id="hx_${k}"><div class="vc-hd" id="hth_${k}"></div><div id="htc_${k}"></div>${k==='wt'&&hlFatOn()?'<div class="hl-sub" id="hth_wtf"></div><div id="htc_wtf"></div>':''}${k==='wt'?hlPwHTML():''}`
      +`<details class="wm"${_hlWm[k]?' open':''} ontoggle="_hlWm['${k}']=this.open"><summary><b>What moves it</b>${UI.chevD}</summary><p>${HL_NOTE[k]}</p></details></div>`:'');
}
function hlBase(){
  const d=S(),out=[],rh=hlRhr(),wt=hlMeas('weight'),bp=hlMeas('bpSys','bpDia'),bb=bpBand();
  if(rh){const df=rh.u==null?0:Math.round(rh.v)-Math.round(rh.u);
    out.push(hlRow('heart','Resting heart rate',Math.round(rh.v),'bpm',rh.u==null?'First reading':rfVs(rh.v,rh.u,0),rh.u==null?'nt':df>=TH.HL_RHR_UP?'warn':df<=-TH.HL_RHR_UP?'good':'nt',rh.date,'rhr'));}
  if(wt)out.push(hlRow('scale','Weight',r1(wt.v).toFixed(1),'kg',wt.u==null?'First reading':rfVs(wt.v,wt.u,1),'nt',wt.date,'wt'));
  const bm=wt&&scComp(wt.c),m2=(d.profile.height/100)*(d.profile.height/100);
  if(bm)out.push(hlRow('ruler','BMI',r1(bm.bmi).toFixed(1),'',wt.u==null?'First reading':rfVs(bm.bmi,wt.u/m2,1),'nt',wt.date,'bmi'));
  const bc=hlComp();
  if(bc){const v=bc.v,u=bc.u,cv=(k,dp)=>u[k]==null?'First reading':rfVs(v[k],u[k],dp);
    out.push(hlRow('flame','Body fat',r1(v.fat).toFixed(1),'%',cv('fat',1),'nt',bc.date,'fat'));
    out.push(hlRow('dna','Fat-free mass',r1(v.ffm).toFixed(1),'kg',cv('ffm',1),'nt',bc.date,'ffm'));
    out.push(hlRow('weight','Skeletal muscle',r1(v.smm).toFixed(1),'kg',cv('smm',1),'nt',bc.date,'smm'));
    out.push(hlRow('droplet','Body water',r1(v.tbw).toFixed(1),'%',cv('tbw',1),'nt',bc.date,'tbw'));
    out.push(hlRow('bolt','Resting energy',Math.round(v.ree),'kcal',cv('ree',0),'nt',bc.date,'ree'));
    out.push(`<div class="hl-est">Estimates from your scale, best read as a trend.</div>`);}
  // v132: the average of the last TH.BP_DAYS days in its band, only from TH.BP_N readings on TH.BP_N days; else the latest reading alone
  if(bb&&bb.high)out.push(hlRow('gauge','Blood pressure',`${bb.sys}/${bb.dia}`,'mmHg','▲ Very high twice: seek medical advice promptly','bad',bb.last.date,'bp'));
  else if(bb&&bb.band)out.push(hlRow('gauge','Blood pressure',`${bb.sys}/${bb.dia}`,'mmHg',`${bb.band==='normal'?'●':'▲'} ${bb.word} · average of ${bb.n} readings`,bb.band==='normal'?'good':bb.band==='stage2'?'bad':'warn',bb.last.date,'bp'));
  else if(bp)out.push(hlRow('gauge','Blood pressure',`${bp.c.bpSys}/${bp.c.bpDia}`,'mmHg',bb&&bb.n>1?'Readings from one day':'One reading','nt',bp.date,'bp'));
  const vo=vo2Trend();
  if(vo)out.push(hlRow('run','VO2max',r1(vo.now).toFixed(1),'',vo.change==null?"Your watch's estimate":vo.change?`${vo.change>0?'▲':'▼'} ${Math.abs(vo.change)} in ${Math.round(vo.daysApart/7)} weeks`:'● No change','nt',vo.date,'vo2'));
  const goal=d.profile.wtGoal;
  if(goal&&wt){const df=wt.v-goal;out.push(hlRow('target','Weight goal',goal,'kg',Math.abs(df)<TH.WT_GOAL_NEAR?'Reached':`${r1(Math.abs(df)).toFixed(1)} kg to ${df>0?'lose':'gain'}`,'nt'));}
  return out.join('');
}

// ── blood markers: one row each, tapped open to its chart ──
const bmF=(k,v)=>k==='uric'?r1(v):Math.round(v);
// the range under each name, from the same ranges scoreBM uses (mg/dL)
function bmRef(k){const r=BM_RNG[k];return(r.ok[0]>0?`${r.ok[0]} to ${r.ok[1]} mg/dL`:`Under ${r.ok[1]} mg/dL`)+(k==='glucose'?', fasting':'');}
function bmState(v,k){const s=scoreBM(v,k);return s.status==='ok'?{c:'good',g:'●',t:'In range'}:s.status==='warn'?{c:'warn',g:'▲',t:'Borderline'}:{c:'bad',g:s.low?'▼':'▲',t:s.low?'Low':'High'};}
// v132 (R12): what a result is worth doing about, in plain words; the same edges as scoreBM. Never a diagnosis.
function bmWord(k,v){
  const s=bmState(v,k);
  if(s.c==='good'||s.t==='Low')return s.t;
  if(k==='glucose')return v<TH.GLU_HIGH?'In the range doctors call prediabetes':'Worth a repeat test and a doctor';
  if(k==='uric')return'Worth a mention to your doctor';
  return s.c==='warn'?'Borderline':'High: worth a mention to your doctor';
}
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
const hlBm=k=>hlOpen(k);
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

// ── v141 HEALTH HISTORY: every baseline row opens to its chart (bare: drag and pinch, no toolbar), nothing stored ──
const HL_KEYS=['rhr','wt','bmi','fat','ffm','smm','tbw','ree','bp','vo2'];
const hlCid=k=>(HL_KEYS.includes(k)?'htc_':'btc_')+k;
// v145: the weight row also charts body fat under it, on the same dates (two charts that pan together, never two axes)
const hlFatOn=()=>hlPts('fat').length>1;
function hlOff(k){chUnmount(hlCid(k));if(k==='wt')chUnmount('htc_wtf');}
function hlFatHd(d){
  const h=$('hth_wtf');if(!h)return;const P=hlPts('fat');let i=d?P.findIndex(p=>p.d===d):P.length-1;if(i<0)i=P.length-1;
  h.innerHTML=`<b>Body fat</b><span>${hlF('fat',P[i].v)} % · ${fmtD(P[i].d)}</span>`;
}
function hlOpen(k){
  const was=_hlOpen===k;if(_hlOpen)hlOff(_hlOpen);_hlOpen=was?null:k;renderHealth();
  if(_hlOpen){const e=$((HL_KEYS.includes(k)?'hr_':'br_')+k);if(e&&e.scrollIntoView)e.scrollIntoView({block:'nearest'});}
}
const HL_SPEC={rhr:['Resting heart rate','bpm',0],wt:['Weight','kg',1],bmi:['BMI','',1],fat:['Body fat','%',1],ffm:['Fat-free mass','kg',1],
  smm:['Skeletal muscle','kg',1],tbw:['Body water','%',1],ree:['Resting energy','kcal',0],bp:['Blood pressure','mmHg',0],vo2:['VO2max','',1]};
const HL_NOTE={
  rhr:'Sleep, alcohol, illness, heat, stress and hard training raise it for a day or two. Months of aerobic training bring it down. Read it at the same time each morning.',
  wt:'Food and drink, salt, carbs stored with water, and the time of day move a single weigh-in by a kilo or more. Weigh at the same time each morning; the 7-day average is the trend.',
  bmi:'Weight divided by height squared. It cannot tell muscle from fat, so a muscular athlete often reads above the general range. Read the trend, not the number.',
  fat:'Read by a small current through your feet, so water, a meal, a workout or a shower shift it. Weigh at the same time each morning; the trend over weeks is what counts.',
  ffm:'Muscle, bone, organs and water. Strength training and enough protein hold it up while losing weight; a fast loss takes some of it with the fat.',
  smm:'Built by strength training with enough protein and energy. An estimate from the scale, so water swings move it; read the trend over weeks.',
  tbw:'Drinking, salt, carbs, alcohol and sweat move it from day to day. Steady habits and the same weighing time give a fair trend.',
  ree:'What your body burns at rest, estimated from fat-free mass. It follows that number, so keeping muscle keeps it up.',
  bp:'Salt, alcohol, sleep, stress, caffeine and body weight move it; regular aerobic exercise brings it down. Measure seated after 5 quiet minutes, twice, at the same time of day.',
  vo2:'Your watch estimates it from heart rate against pace or power on steady sessions. Regular hard intervals and more aerobic training raise it; a few easy weeks can lower it.'};
// values per day: the mean of that day's readings
function hlDays(rs,f){const m={};rs.forEach(r=>{const v=f(r);if(v!=null&&isFinite(v))(m[r.date]=m[r.date]||[]).push(v);});return Object.keys(m).sort().map(d=>({d,v:avg(m[d])}));}
// the mean of the readings in the TH.HL_AVG days ending on each reading's day
function hlAvg(pts){return pts.map(p=>{const n=DN(p.d),w=pts.filter(q=>DN(q.d)<=n&&n-DN(q.d)<TH.HL_AVG).map(q=>q.v);return{d:p.d,v:avg(w)};});}
const hlWts=()=>{const ex=isExampleOnly();return S().measurements.filter(m=>m.weight>=30&&m.weight<=250&&(ex||!m.isEx));};
const hlM2=()=>{const h=S().profile.height;return h>=TH.SC_H_RNG[0]&&h<=TH.SC_H_RNG[1]?(h/100)*(h/100):null;};
// the points behind each chart; blood pressure gives [systolic, diastolic]
function hlPts(k){
  const d=S();
  if(k==='rhr'){const wl=d.wellness||{};let rh=Object.keys(wl).sort().filter(dt=>wl[dt]&&wl[dt].rhr!=null).map(dt=>({d:dt,v:wl[dt].rhr}));
    const rm=hlDays(d.measurements.filter(m=>m.hr),m=>m.hr);return rm.length>rh.length?rm:rh;}  // one source, as on Trends
  if(k==='wt')return hlDays(hlWts(),m=>m.weight);
  if(k==='bmi'){const m2=hlM2();return m2?hlDays(hlWts(),m=>m.weight/m2):[];}
  if(k==='bp')return[hlDays(d.measurements.filter(m=>m.bpSys&&m.bpDia),m=>m.bpSys),hlDays(d.measurements.filter(m=>m.bpSys&&m.bpDia),m=>m.bpDia)];
  if(k==='vo2')return Object.keys(d.wellness||{}).sort().filter(dt=>d.wellness[dt]&&d.wellness[dt].vo2).map(dt=>({d:dt,v:d.wellness[dt].vo2}));
  return hlDays(d.measurements.filter(m=>m.weight&&m.imp),m=>{const c=scComp(m);return c&&c[k]!=null?c[k]:null;});
}
const hlF=(k,v)=>{const dp=HL_SPEC[k][2];return dp?r1(v).toFixed(1):String(Math.round(v));};
const hlU=k=>HL_SPEC[k][1]?' '+HL_SPEC[k][1]:'';
// the header over an open baseline chart: the tapped day (else the latest) with its change, and the reading before it
function hlHead(k,d){
  const h=$('hth_'+k);if(!h)return;
  const P=hlPts(k),bp=k==='bp',pts=bp?P[0]:P;let i=d?pts.findIndex(p=>p.d===d):pts.length-1;if(i<0)i=pts.length-1;if(i<0)return;
  const val=j=>bp?`${Math.round(P[0][j].v)}/${Math.round(P[1][j].v)}`:hlF(k,pts[j].v),u=HL_SPEC[k][1]?` <em>${HL_SPEC[k][1]}</em>`:'';
  const c=pts[i],p=pts[i-1];let ch='';
  if(p&&!bp){const df=+hlF(k,c.v)-+hlF(k,p.v);ch=df?`<i>${df>0?'▲':'▼'}</i>${df>0?'Up':'Down'} ${hlF(k,Math.abs(df))}${hlU(k)}`:'<i>●</i>No change';}
  if(bp){const x=bpBand(c.d);ch=x&&x.band?`<i>${x.band==='normal'?'●':'▲'}</i>${x.word} on the ${TH.BP_DAYS}-day average`:'';}
  h.innerHTML=`<div><small>${fmtD(c.d)}</small><b class="v1">${val(i)}${u}</b><span>${ch}</span></div>`
    +(p?`<div><small>Previous</small><b class="v2">${val(i-1)}${u}</b><span>${fmtD(p.d)}</span></div>`:'');
}
// one line for an averaged chart: the change of the 7-day average over the view
function hlTrendLine(k,info,est){
  const a=info.first,l=info.last,n=HL_SPEC[k][0];if(!l)return'';
  const df=l.v-a.v,ab=hlF(k,Math.abs(df)),tail=est?' An estimate, best read as a trend.':'';
  if(a.d===l.d)return`${n} ${hlF(k,l.v)}${hlU(k)} on the ${TH.HL_AVG}-day average.`+tail;
  if(!+ab)return`About the same on the ${TH.HL_AVG}-day average since ${fmtD(a.d)}.`+tail;
  const s=`${df>0?'Up':'Down'} ${ab}${hlU(k)} on the ${TH.HL_AVG}-day average since ${fmtD(a.d)}.`;
  if(k==='wt'&&df<0){const w=wtTrend();if(w&&w.fast)return s+' A slower loss keeps more muscle and strength.';}
  return s+tail;
}
// v145 (R9.4, R9.5): the weight change in view split into estimated fat and fat-free mass, from the weigh-ins with body measurement
function hlWtFat(info){
  const ms=S().measurements.filter(m=>m.weight&&m.imp&&m.date>=info.from&&m.date<=info.to),W=hlAvg(hlDays(ms,m=>m.weight)),F=hlAvg(hlDays(ms,m=>{const c=scComp(m);return c?c.ffm:null;}));
  const fb=hlTrendLine('fat',info,true);if(W.length<2||F.length!==W.length)return fb;
  const dw=W[W.length-1].v-W[0].v,dl=F[F.length-1].v-F[0].v,kg=r1(Math.abs(dw)).toFixed(1);
  if(Math.abs(dw)<TH.WF_MIN_KG)return fb;
  const fat=(dw-dl)/dw; // the share of the change that is fat
  if(dw<0)return fat>=TH.WF_FAT_SHARE?`Most of the ${kg} kg lost looks like fat. Muscle is holding.`
    :`Part of the ${kg} kg lost may be muscle, an estimate. A slower loss and protein at each meal help keep it.`;
  return fat>=TH.WF_FAT_SHARE?`Most of the ${kg} kg gained looks like fat, an estimate.`:`Much of the ${kg} kg gained looks like fat-free mass, an estimate.`;
}
// v145 (R9.6): threshold power per kilogram with a real power meter; on a climb speed follows W/kg, so a kilogram less is worth about 100/kg %
function hlPw(){
  const r=(stThr()||{}).ride||{},w=wtOn(td());if(!r.ftp||!w||!pmOn())return null;
  return{wkg:r1(r.ftp/w.weight).toFixed(1),kg:r1(w.weight).toFixed(1),pct:r1(100/w.weight).toFixed(1)};
}
function hlPwHTML(){const p=hlPw();if(!p)return'';const w=wtTrend();
  return`<p class="hl-pw">Threshold power ${p.wkg} W/kg at ${p.kg} kg. ${w&&w.fast?'Losing this fast can cost power, which undoes the gain.':`On a climb, each kilogram less is worth about ${p.pct}% if power holds.`}</p>`;}
function hlChart(k){
  const id='htc_'+k,[name,unit]=HL_SPEC[k],f=v=>hlF(k,v)+hlU(k),P=hlPts(k);
  const base={bare:true,vals:false,key:'hl'+k,H:150,span:TH.HL_VIEW,label:name,yfmt:v=>hlF(k,v),pick:d=>hlHead(k,d),
    empty:'One reading so far. The chart appears after your second.'};
  hlHead(k,null);
  // one reading charts nothing: its pair (diastolic) or its own average would otherwise make two points
  if((k==='bp'?P[0]:P).length<2)return mountChart(id,{...base,series:[]});
  if(k==='rhr'){const band=rollBand(P,TH.RHR_FLOOR);
    return mountChart(id,{...base,band,legend:'Your usual range',series:[{name,color:'--text',thin:true,fmt:f,pts:P}],
      means:info=>bandMeaning(info,band,f,BAND_TXT.rhr)});}
  if(k==='bp'){const Sy=TH.BP_SYS,Di=TH.BP_DIA,col=(v,c)=>v<c[0]?'--green':v<c[2]?'--amber':'--red';
    return mountChart(id,{...base,yfmt:v=>String(Math.round(v)),yat:[Sy[0],Sy[1],Sy[2],Di[0],Di[1]],
      lines:[Sy[0],Sy[1],Sy[2],Di[0],Di[1]].map(v=>({v,color:'--t3'})),
      series:[{name:'Systolic',color:'--t3',thin:true,fmt:v=>Math.round(v)+' mmHg',pts:P[0],dotColor:v=>col(v,Sy)},
        {name:'Diastolic',color:'--t3',thin:true,fmt:v=>Math.round(v)+' mmHg',pts:P[1],dotColor:v=>col(v,[Di[0],0,Di[1]])}],
      means:()=>{const x=bpBand();
        if(x&&x.high)return'Very high twice: seek medical advice promptly.';
        if(x&&x.band)return`${x.word} on the ${TH.BP_DAYS}-day average of ${x.n} readings.`;
        return P[0].length>1?'Readings from one day so far.':'One reading so far.';}});}
  if(k==='vo2')return mountChart(id,{...base,series:[{name,color:'--text',thin:true,fmt:f,pts:P,dots:true}],
    means:()=>{const v=vo2Trend();if(!v||v.change==null)return`Your watch's estimate. A change shows once readings are ${Math.round(TH.VO2_GAP/7)} weeks apart.`;
      const w=Math.round(v.daysApart/7);return v.change?`${v.change>0?'Up':'Down'} ${Math.abs(v.change)} over ${w} weeks.`:`No change over ${w} weeks.`;}});
  // weight, BMI and body composition: each day's reading as a dot, the 7-day average as the line
  const cfg={...base,stats:{s:1},series:[{name,color:'--teal',noLine:true,dots:true,fmt:f,pts:P},{name:`${TH.HL_AVG}-day average`,color:'--text',noDots:true,fmt:f,pts:hlAvg(P)}],
    means:info=>hlTrendLine(k,info,!['wt','bmi'].includes(k))};
  const goal=S().profile.wtGoal;
  if(k==='wt'&&goal)cfg.lines=[{v:goal,label:'Goal',color:'--t2'}];
  if(k==='bmi'){const R=TH.BMI_RNG;cfg.zones=[{lo:R[0],hi:R[1],color:'--t3/1.6'}];cfg.legend='General adult range';cfg.yat=[R[0],R[1]];}
  if(k!=='wt'||!$('htc_wtf'))return mountChart(id,cfg);
  // body fat under weight: the same dates, so a pan or a tap on one moves both
  cfg.group='hlwt';const r=mountChart(id,cfg),F=hlPts('fat'),ff=v=>hlF('fat',v)+' %';hlFatHd(null);
  mountChart('htc_wtf',{...base,key:'hlwtf',H:110,group:'hlwt',label:'Body fat',yfmt:v=>hlF('fat',v),pick:d=>{hlHead('wt',d);hlFatHd(d);},stats:{s:1},
    series:[{name:'Body fat',color:'--teal',noLine:true,dots:true,fmt:ff,pts:F},{name:`${TH.HL_AVG}-day average`,color:'--text',noDots:true,fmt:ff,pts:hlAvg(F)}],
    means:info=>hlWtFat(info)});
  return r;
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
  // an open row whose data has gone closes
  if(_hlOpen&&(HL_KEYS.includes(_hlOpen)?!$('hr_'+_hlOpen):!bmPts(_hlOpen).length)){hlOff(_hlOpen);_hlOpen=null;if(b)$('hBase').innerHTML=hlBase();}
  if(_hlOpen&&HL_KEYS.includes(_hlOpen))hlChart(_hlOpen);
  $('hBlood').innerHTML=hlBlood();
  if(_hlOpen&&!HL_KEYS.includes(_hlOpen))drawBloodChart(_hlOpen);
  $('hInj').innerHTML=hlInj();
}

// ── v132 BODY AND HEALTH: blood pressure, weight, low energy signs, the watch's VO2max, the race guide ──
const BP_WORD={normal:'Normal',elevated:'Elevated',stage1:'Stage 1 range',stage2:'Stage 2 range'};
// blood pressure over the TH.BP_DAYS days to t: the averages in their band (AHA/ACC), only from TH.BP_N readings on TH.BP_N days;
// high = TH.BP_N readings at the top cut (seek advice promptly). Measure seated after 5 quiet minutes. Never named as a condition.
function bpBand(t=td()){
  const a=stAdd(t,-(TH.BP_DAYS-1)),r=S().measurements.filter(m=>m.bpSys&&m.bpDia&&m.date>=a&&m.date<=t).sort((x,y)=>x.date<y.date?-1:x.date>y.date?1:0);
  if(!r.length)return null;
  const n=r.length,days=new Set(r.map(m=>m.date)).size,sys=Math.round(avg(r.map(m=>m.bpSys))),dia=Math.round(avg(r.map(m=>m.bpDia))),Sy=TH.BP_SYS,Di=TH.BP_DIA;
  const hiN=r.filter(m=>m.bpSys>=Sy[3]||m.bpDia>=Di[2]).length;
  const band=n<TH.BP_N||days<TH.BP_N?null:sys>=Sy[2]||dia>=Di[1]?'stage2':sys>=Sy[1]||dia>=Di[0]?'stage1':sys>=Sy[0]?'elevated':'normal';
  return{sys,dia,n,days,band,word:band?BP_WORD[band]:null,hiN,high:hiN>=TH.BP_N,last:last(r)};
}
// the 7-day average weight ending on x (null without a weigh-in in those days)
function wtAvgAt(x){
  const a=stAdd(x,-6),ex=isExampleOnly(),v=S().measurements.filter(m=>m.date>=a&&m.date<=x&&m.weight>=30&&m.weight<=250&&(ex||!m.isEx)).map(m=>m.weight);
  return v.length?avg(v):null;
}
// weight at the latest weigh-in on or before t: the 7-day average, the change on 4 weeks before to 0.1 kg (steady up to TH.WT_STEADY),
// the weeks in a row losing TH.WT_RATE of body weight or more (fast from TH.WT_RATE_WKS), and the distance to the goal
function wtTrend(t=td()){
  const w=wtOn(t);if(!w)return null;
  const L=w.date,now=wtAvgAt(L),b4=wtAvgAt(stAdd(L,-28)),ch4=b4==null?null:r1(now-b4),goal=S().profile.wtGoal;
  let fastWks=0;
  for(let i=0;i<TH.REDS_WKS*2;i++){const a=wtAvgAt(stAdd(L,-7*i)),b=wtAvgAt(stAdd(L,-7*(i+1)));if(a==null||b==null||+(b-a).toFixed(3)<+(TH.WT_RATE*b).toFixed(3))break;fastWks++;}
  const df=goal?w.weight-goal:null; // the goal and the Weight tile read the latest weigh-in, as Health and Fuel do; the trend reads the 7-day means
  return{date:L,now:r1(now),last:r1(w.weight),ch4,dir:ch4==null?null:Math.abs(ch4)<=TH.WT_STEADY?'steady':ch4<0?'down':'up',fastWks,fast:fastWks>=TH.WT_RATE_WKS,
    toGoal:goal?{goal,kg:r1(Math.abs(df)),dir:df>0?'lose':'gain',reached:Math.abs(df)<TH.WT_GOAL_NEAR}:null};
}
// R11: signs that you may not be eating enough for your training, over the last TH.REDS_WKS weeks to t. Each sign must last:
// weight falling all through (or fast while losing on purpose), food under estimated use and mind under your usual in the first and last
// weeks with no week against it, ill twice, sessions harder than planned in both halves. TH.REDS_N+ signs ask the question; never a diagnosis.
function redsSigns(t=td(),thr=stThr()){
  const W=TH.REDS_WKS*7,a=stAdd(t,-(W-1)),signs=[],goal=fuGoal();
  // weeks oldest first, each ending on e (food weeks end the day before, today's log is still open)
  const wks=f=>{const o=[];for(let k=TH.REDS_WKS-1;k>=0;k--)o.push(f(stAdd(t,-7*k)));return o;};
  const lasts=r=>{const v=r.filter(x=>x!=null);return v.length>=2&&r[0]===true&&r[r.length-1]===true&&v.every(Boolean);};
  // 1 weight
  if(goal==='lose'){const w=wtTrend(t);if(w&&w.fast&&daysAgoBetween(w.date,t)<7)signs.push({k:'weight',why:'Losing weight fast for weeks'});}
  else{const w0=wtAvgAt(stAdd(t,-W)),w1=wtAvgAt(stAdd(t,-W/2)),w2=wtAvgAt(t);
    if(w0!=null&&w1!=null&&w2!=null&&w0>w1&&w1>w2&&+(w0-w2).toFixed(3)>=+(TH.REDS_WT*w0).toFixed(3))signs.push({k:'weight',why:'Weight falling for weeks'});}
  // 2 food under use
  const m=fuWeight(),kg=m?m.weight:null;
  if(kg&&lasts(wks(e=>{const x=fuWeekLow(stAdd(e,-1),kg);return x?x.low:null;})))signs.push({k:'food',why:'Eating well under what you use'});
  // 3 mind under your usual
  const mi={};S().checkins.forEach(c=>{const v=mindOf(c);if(v!=null)mi[c.date]=v;});
  const u=bandOf(x=>mi[x]??null,a);
  if(u.m!=null&&lasts(wks(e=>{const v=[];for(let i=0;i<7;i++){const x=mi[stAdd(e,-i)];if(x!=null)v.push(x);}
    if(v.length<TH.OVR_CI_N)return null;const mm=avg(v);return mm<u.m&&mm<=u.m-TH.OVR_MIND_SD*u.sd;})))signs.push({k:'mind',why:'Mood and energy under your usual'});
  // 4 ill twice: episodes split by more than TH.ILL_FREE_D clear days
  let ep=0,prev=null;
  for(let i=W-1;i>=0;i--){const dt=stAdd(t,-i);if(symOn(dt)>=1||(illness(dt)||{}).lvl==='systemic'){if(prev==null||daysAgoBetween(prev,dt)-1>TH.ILL_FREE_D)ep++;prev=dt;}}
  if(ep>=2)signs.push({k:'ill',why:'Ill twice in a few weeks'});
  // 5 sessions harder than planned, in both halves
  let h1=0,h2=0;
  for(let i=0;i<W;i++){const x=stMatch(stAdd(t,-i),thr);if(x&&x.m==='harder'){if(i<W/2)h2++;else h1++;}}
  if(h1+h2>=TH.REDS_HARD&&h1&&h2)signs.push({k:'hard',why:'Sessions feel harder than planned'});
  return{n:signs.length,signs,on:signs.length>=TH.REDS_N};
}
// the watch's VO2max on or before t against the latest value TH.VO2_GAP+ days before it (a progress marker, one value for every sport)
function vo2Trend(t=td()){
  const v=Object.entries(S().wellness||{}).filter(([dt,w])=>w&&w.vo2&&dt<=t).sort((a,b)=>a[0]<b[0]?-1:1);if(!v.length)return null;
  const[ld,lw]=last(v),pr=v.filter(([dt])=>daysAgoBetween(dt,ld)>=TH.VO2_GAP).pop();
  return{now:lw.vo2,date:ld,before:pr?pr[1].vo2:null,daysApart:pr?daysAgoBetween(pr[0],ld):null,change:pr?+(lw.vo2-pr[1].vo2).toFixed(1):null};
}
// a guide, not a promise: Riegel (T2 = T1 x (D2/D1)^TH.RIEGEL) from your best run of TH.RG_MIN_KM+ km in TH.RG_DAYS days;
// the goal distance from the goal name; a marathon from shorter runs is likely optimistic
const RG_DIST=[['5K',5],['10K',10],['Half marathon',21.0975]],RG_MARA=42.195;
function rgGoal(){
  const g=(S().profile.goalName||'').toLowerCase();
  return/half/.test(g)?RG_DIST[2]:/marathon/.test(g)?['Marathon',RG_MARA]:/10\s*k/.test(g)?RG_DIST[1]:/5\s*k/.test(g)?RG_DIST[0]:null;
}
function raceGuide(t=td()){
  const R=TH.RIEGEL,f=(w,km)=>w.durMin*Math.pow(km/w.distKm,R);
  const rs=stWs().filter(w=>w.type==='Run'&&w.distKm>=TH.RG_MIN_KM&&w.durMin>0&&w.durMin*60/w.distKm>=TH.RG_PACE_MIN&&w.date<=t&&daysAgoBetween(w.date,t)<TH.RG_DAYS);
  if(!rs.length)return null;
  const b=rs.reduce((x,w)=>f(w,10)<f(x,10)?w:x),g=rgGoal();
  return{from:{date:b.date,km:b.distKm,min:b.durMin},list:RG_DIST.map(([k,km])=>({k,km,min:Math.round(f(b,km))})),
    goal:g?{k:g[0],km:g[1],min:Math.round(f(b,g[1])),opt:g[1]===RG_MARA}:null};
}

// ── report: a clean one-page summary the user can save as PDF ────────────────
function buildReport(days=30){
  const d=S(),name=d.profile.name,rng=x=>daysAgo(x.date)<days;
  const sl=d.sleepLogs.filter(rng),ms=d.measurements.filter(rng),ci=d.checkins.filter(rng).filter(ciFull),ws=wkOn().filter(rng);
  const row=(a,b)=>`<tr><td>${a}</td><td>${b}</td></tr>`;
  const sc=sl.filter(s=>s.score).map(s=>s.score);
  const deep=sl.filter(s=>s.deepH||s.deepM).map(s=>s.deepH*60+s.deepM),rem=sl.filter(s=>s.remH||s.remM).map(s=>s.remH*60+s.remM);
  let sec='';
  sec+=`<h3>Sleep</h3><table>${sc.length?row('Average sleep score',`${Math.round(avg(sc))}/100 (${pl(sc.length,'night')} logged)`)+(deep.length?row('Average deep sleep',fmtDur(Math.round(avg(deep)))):'')+(rem.length?row('Average REM sleep',fmtDur(Math.round(avg(rem)))):''):row('No sleep logged','')}</table>`;
  const wt=ms.filter(m=>m.weight),bp=ms.filter(m=>m.bpSys),hr=ms.filter(m=>m.hr);
  sec+=`<h3>Body</h3><table>${wt.length?row('Weight',wt.length>1?`${wt[0].weight} → ${last(wt).weight} kg (${r1(last(wt).weight-wt[0].weight)>0?'+':''}${r1(last(wt).weight-wt[0].weight)})`:`${wt[0].weight} kg`):''}${bp.length?row('Blood pressure',`avg ${Math.round(avg(bp.map(m=>m.bpSys)))}/${Math.round(avg(bp.map(m=>m.bpDia)))} mmHg, latest ${last(bp).bpSys}/${last(bp).bpDia} (${pl(bp.length,'reading')})${bpBand()&&bpBand().band?`; last ${TH.BP_DAYS} days ${bpBand().word.toLowerCase()}`:''}`):''}${hr.length?row('Resting heart rate (manual)',`avg ${Math.round(avg(hr.map(m=>m.hr)))} bpm, latest ${last(hr).hr}`):''}${!wt.length&&!bp.length&&!hr.length?row('No measurements logged',''):''}</table>`;
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
