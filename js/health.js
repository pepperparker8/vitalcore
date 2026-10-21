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
function hlRow(icon,label,v,unit,cmp,cls,date){
  const m=/^([▲▼●]) (.*)$/.exec(cmp),g=m?m[1]:cmp.startsWith('at ')?'●':'',t=m?m[2]:cmp,age=date&&daysAgo(date)>1?' · '+fmtD(date):'';
  return`<div class="rf ${cls}">${UI[icon]}<span class="rf-l">${label}</span><span class="rf-r"><span class="rf-v">${v}${unit?` <em>${unit}</em>`:''}</span><span class="rf-n">${g?`<i class="rf-g" aria-hidden="true">${g}</i>`:''}${t}${age}</span></span></div>`;
}
function hlBase(){
  const d=S(),out=[],rh=hlRhr(),wt=hlMeas('weight'),bp=hlMeas('bpSys','bpDia'),bb=bpBand();
  if(rh){const df=rh.u==null?0:Math.round(rh.v)-Math.round(rh.u);
    out.push(hlRow('heart','Resting heart rate',Math.round(rh.v),'bpm',rh.u==null?'First reading':rfVs(rh.v,rh.u,0),rh.u==null?'nt':df>=TH.HL_RHR_UP?'warn':df<=-TH.HL_RHR_UP?'good':'nt',rh.date));}
  if(wt)out.push(hlRow('scale','Weight',r1(wt.v).toFixed(1),'kg',wt.u==null?'First reading':rfVs(wt.v,wt.u,1),'nt',wt.date));
  const bm=wt&&scComp(wt.c),m2=(d.profile.height/100)*(d.profile.height/100);
  if(bm)out.push(hlRow('ruler','BMI',r1(bm.bmi).toFixed(1),'',wt.u==null?'First reading':rfVs(bm.bmi,wt.u/m2,1),'nt',wt.date));
  const bc=hlComp();
  if(bc){const v=bc.v,u=bc.u,cv=(k,dp)=>u[k]==null?'First reading':rfVs(v[k],u[k],dp);
    out.push(hlRow('flame','Body fat',r1(v.fat).toFixed(1),'%',cv('fat',1),'nt',bc.date));
    out.push(hlRow('dna','Fat-free mass',r1(v.ffm).toFixed(1),'kg',cv('ffm',1),'nt',bc.date));
    out.push(hlRow('weight','Skeletal muscle',r1(v.smm).toFixed(1),'kg',cv('smm',1),'nt',bc.date));
    out.push(hlRow('droplet','Body water',r1(v.tbw).toFixed(1),'%',cv('tbw',1),'nt',bc.date));
    out.push(hlRow('bolt','Resting energy',Math.round(v.ree),'kcal',cv('ree',0),'nt',bc.date));
    out.push(`<div class="hl-est">Estimates from your scale, best read as a trend.</div>`);}
  // v132: the average of the last TH.BP_DAYS days in its band, only from TH.BP_N readings on TH.BP_N days; else the latest reading alone
  if(bb&&bb.high)out.push(hlRow('gauge','Blood pressure',`${bb.sys}/${bb.dia}`,'mmHg','▲ Very high twice: seek medical advice promptly','bad',bb.last.date));
  else if(bb&&bb.band)out.push(hlRow('gauge','Blood pressure',`${bb.sys}/${bb.dia}`,'mmHg',`${bb.band==='normal'?'●':'▲'} ${bb.word} · average of ${bb.n} readings`,bb.band==='normal'?'good':bb.band==='stage2'?'bad':'warn',bb.last.date));
  else if(bp)out.push(hlRow('gauge','Blood pressure',`${bp.c.bpSys}/${bp.c.bpDia}`,'mmHg',bb&&bb.n>1?'Readings from one day':'One reading','nt',bp.date));
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
