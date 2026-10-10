// ── RENDER: TODAY ────────────────────────────────────────────────────────────
function renderRing(score){
  const fill=$('ringFill'),el=$('ringNum'),C=+fill.getAttribute('stroke-dasharray');
  clearInterval(renderRing.t);
  if(score===null){fill.style.strokeDashoffset=C;el.textContent='—';return;}
  fill.style.strokeDashoffset=C*(1-Math.min(score,100)/100);
  let cur=+el.textContent||0;const step=(score-cur)/20;
  renderRing.t=setInterval(()=>{cur+=step;if((step>=0&&cur>=score)||(step<0&&cur<=score)||!step){cur=score;clearInterval(renderRing.t);}el.textContent=Math.round(cur);},16);
}
const GC=213.6;
function strainOf(load){const ref=strainRef();return Math.round(21*(1-Math.exp(-load/(1.2*ref)))*10)/10;}
function strainRef(){
  const ls=[];for(let i=1;i<=60;i++){const l=strainLoad(dAgo(i));if(l>0)ls.push(l);}
  if(ls.length<3)return 200;
  ls.sort((a,b)=>a-b);return ls[Math.floor(ls.length*0.75)];
}
function strainTarget(){
  const v=coachVerdict();if(!v)return null;
  return v.lvl==='bad'?[0,5]:v.lvl==='warn'?[6,11]:v.sc>=scoreCuts().high?[13,17]:[10,14];
}
function setGauge(id,numId,frac,txt){
  const f=$(id),n=$(numId);if(!f||!n)return;
  f.style.strokeDashoffset=GC*(1-Math.max(0,Math.min(1,frac)));n.textContent=txt;
}
// v129: the gauges follow the day in view (tdDay); a past day's strain is its total, its sleep the night ending that day against that night's need
function renderGauges(){
  const d=S(),dt=tdDay(),now=dt===td(),load=strainLoad(dt),st=strainOf(load),tg=now?strainTarget():null;
  setGauge('strFill','strNum',st/21,load?st.toFixed(1):'0');
  $('gStrSub').textContent=!now?'Day total':!dayLoad(dt)&&restToday()?'Rest day':tg?`Aim ${tg[0]} to ${tg[1]}`:'\u00a0';
  const sl=bodyNight(dt);
  if(sl&&!slCounts(sl)){setGauge('slpFill','slpNum',0,'—');$('gSlpSub').textContent='Battery ran out';}
  else if(sl){const pc=Math.min(100,Math.round(sl.durMin/needOf(sl)*100));
    setGauge('slpFill','slpNum',pc/100,pc+'%');$('gSlpSub').textContent=fmtDur(sl.durMin);}
  else{setGauge('slpFill','slpNum',0,'—');$('gSlpSub').textContent=now?'Log sleep':'Not logged';}
  renderFactors();if(typeof refreshDetail==='function')refreshDetail();const sc=dayScore(dt);const n=daysLogged(30),bn=$('baseNote');if(bn){const b=now&&!isExampleOnly()&&n<TH.MIN_BASE_DAYS;bn.style.display=b?'block':'none';bn.textContent=b?`Building your baseline: ${n} of ${TH.MIN_BASE_DAYS} days logged. Scores and usual ranges get more personal after two weeks of data.`:'';}
  $('gRecSub').textContent=sc==null&&!now?'No data':scoreWord(sc);
}
// v129: any day on Today (default today). Order as the approved mockup: sleep, HRV, resting heart rate, breathing, check-in, form;
// soreness and late coffee from that day's check-in; injuries only on today.
function readinessFactors(date=td()){
  const d=S(),out=[],now=date===td();
  const sl=bodyNight(date);
  if(sl&&!slCounts(sl))out.push({k:'sleep',l:'Sleep',v:'Not counted',n:'battery ran out',st:'none'});
  else if(sl){const pc=Math.round(sl.durMin/needOf(sl)*100);out.push({k:'sleep',l:'Sleep',v:fmtDur(sl.durMin),n:pc+'% of need',st:pc>=90?'good':pc>=75?'warn':'bad'});}
  else out.push({k:'sleep',l:'Sleep',v:'Not logged',n:'Tap for details',st:'none'});
  const hv=latestOf('hrv',date),hb=wSeries('hrv',30,true,date);
  if(hv&&hb.length>=RB_MIN){const r=hv.v/avg(hb);out.push({k:'hrv',l:'HRV',v:Math.round(hv.v)+' ms',n:rfVs(hv.v,avg(hb),0),st:r>=0.97?'good':r>=0.9?'warn':'bad'});}
  else if(hv)out.push({k:'hrv',l:'HRV',v:Math.round(hv.v)+' ms',n:'building baseline',st:'none'});
  const rv=latestOf('rhr',date),rb=rhrSeries(30,date);
  if(rv&&rb.length>=RB_MIN){const df=rv.v-avg(rb);out.push({k:'rhr',l:'Resting heart rate',v:Math.round(rv.v)+' bpm',n:rfVs(rv.v,avg(rb),0),st:df<=2?'good':df<=5?'warn':'bad'});}
  else if(rv)out.push({k:'rhr',l:'Resting heart rate',v:Math.round(rv.v)+' bpm',n:'building baseline',st:'none'});
  const pv=latestOf('resp',date),pb=wSeries('resp',30,true,date);
  if(pv&&pb.length>=RB_MIN){const df=pv.v-avg(pb);out.push({k:'breathing',l:'Breathing',v:pv.v.toFixed(1)+' /min',n:rfVs(pv.v,avg(pb),1),st:df<=1?'good':df<=2?'warn':'bad'});}
  const ci=d.checkins.find(c=>c.date===date);
  if(ci&&ciFull(ci)){const p=mindOf(ci);out.push({k:'checkin',l:'Check-in',v:p>=TH.MIND_GOOD?'Good':p>=TH.MIND_FLAT?'Okay':'Low',n:p+' of 100',st:p>=TH.MIND_GOOD?'good':p>=TH.MIND_FLAT?'warn':'bad'});}
  else out.push({k:'checkin',l:'Check-in',v:'Not done',n:'Tap for details',st:'none'});
  const tsb=tsbOn(date);
  if(tsb!=null)out.push({k:'form',l:'Form',v:(tsb>0?'+':tsb<0?'−':'')+Math.abs(Math.round(tsb)),n:zL(tsb,'tsb'),st:tsb>=TH.FORM_OK?'good':tsb>=TH.FORM_DEEP?'warn':'bad'});
  if(ci&&ci.soreness>=2)out.push({k:'soreness',l:'Soreness',v:EM.soreness[ci.soreness],n:bodyLive()?(now?'shapes today\'s session':'shaped that day\'s session'):'−'+(ci.soreness-1)*4+' on recovery',st:ci.soreness>=3?'bad':'warn'});
  if(ci&&ci.coffeeLate)out.push({k:'coffee',l:'Coffee',v:'Late cup',n:'after 14:00',st:'warn'});
  const inj=now?d.injuries.filter(i=>i.active):[];
  if(inj.length){const m=Math.max(...inj.map(i=>i.sev));out.push({k:'injury',l:'Injury',v:inj.length===1?esc(inj[0].part):inj.length+' active',n:m>=3?'Severe':m===2?'Moderate':'Mild',st:m>=2?'bad':'warn'});}
  return out;
}
// v125: each factor row has its line icon; a number against your usual reads "▼ 3 under usual"
const RF_IC={sleep:'moon',form:'battery',checkin:'mood',hrv:'pulse',rhr:'heart',breathing:'lungs',soreness:'sore',coffee:'coffee',injury:'bandage'};
function rfVs(v,u,dp){const df=+(+v.toFixed(dp)-+u.toFixed(dp)).toFixed(dp);return df>0?'▲ '+df.toFixed(dp)+' over usual':df<0?'▼ '+(-df).toFixed(dp)+' under usual':'at your usual';}
function renderFactors(){
  const el=$('rdFactors');if(!el)return;
  const f=readinessFactors(tdDay());
  el.innerHTML='<div class="rf-h">What is driving recovery</div>'+f.map(x=>{const m=/^([▲▼]) (.*)$/.exec(x.n);return`<div class="rf ${x.st}" onclick="tdOpen('${x.k}')" role="button" tabindex="0">${UI[RF_IC[x.k]]||''}<span class="rf-l">${x.l}</span><span class="rf-r"><span class="rf-v">${x.v}</span><span class="rf-n"><i class="rf-g" aria-hidden="true">${m?m[1]:'●'}</i>${m?m[2]:x.n}</span></span></div>`;}).join('');
}
// sleep needed for the night ending on date (default tonight): goal, plus up to 45 min for the day's strain, plus half the debt of the 3 nights before
function sleepNeed(st,date){
  const d=S(),goal=(d.profile.sleepGoal||7.5)*60,ref=date?daysAgo(date):0;
  const debt=[1,2,3].reduce((a,i)=>{const l=d.sleepLogs.filter(x=>x.durMin&&daysAgo(x.date)===ref+i&&slCounts(x));return l.length?a+Math.max(0,goal-l[l.length-1].durMin):a;},0);
  return Math.round((goal+st/21*45+Math.min(45,debt/2))/5)*5;
}
const hhmm=m=>{m=((m%1440)+1440)%1440;return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');};
function setWake(v){if(!/^\d\d:\d\d$/.test(v))return;const d=S();d.profile.wakeTime=v;save(d);markProfile();if(typeof refreshDetail==='function')refreshDetail();}
// the headline and its line for a recovery score (v129: shown at the top of the Recovery sheet, no longer on Today)
function renderZone(score){
  let z,ins,act=null;   // act: what to do today, for a score under green (the Recovery sheet's line)
  if(bodyLive()){
    // Body (v118): green, yellow, red from TH.BODY_*
    if(score===null){z='Waiting for your watch';ins='Body needs heart rate variability or resting heart rate from last night. Sync to refresh.';}
    else if(score>=TH.BODY_GREEN){z='Body is recovered';ins='HRV, resting heart rate and sleep are in your usual range. A good day to train as planned.';}
    else if(score>=TH.BODY_YELLOW){z='Body is middling';act='Train, but keep it controlled.';ins='Some overnight signals are off. '+act;}
    else{z='Body needs recovery';act='Rest or easy movement.';ins='Your overnight signals are well off your usual. '+act;}
  }
  else if(score===null){z='Start with a check-in';ins='Tap how you feel below. Your readiness score appears once you check in or log sleep.';}
  else if(score>=TH.OLD_HIGH){z='Ready to push hard';ins='All systems green. Good day to train hard or race.';}
  else if(score>=TH.OLD_WARN){z='Solid day ahead';ins='Good recovery. Normal training appropriate today.';}
  else if(score>=TH.OLD_MOD){z='Moderate readiness';ins='Some fatigue. Keep intensity moderate today.';}
  else{z='Recovery day needed';ins='Body is under stress. Prioritise rest and sleep tonight.';}
  return{z,ins,act};
}
function calcReadiness(){
  const d=S();
  // only the last three days count: an old night or check-in says nothing about today
  const fresh=x=>daysAgo(x.date)<=2;
  const sl=last(d.sleepLogs.filter(s=>(s.score||s.durMin)&&fresh(s))),ci=last(d.checkins.filter(c=>ciFull(c)&&fresh(c))),tsb=d.intervalsData.tsb;
  if(!sl&&!ci&&tsb===null)return null;
  let s=70;
  if(sl)s=slScore(sl)*0.5+35;
  if(tsb!=null)s=Math.max(30,Math.min(100,s+(tsb>0?tsb*0.5:tsb*0.3)));
  if(ci){const psy=(ci.energy+ci.mood+(5-ci.stress)+ci.motivation)/16*100;s=s*0.7+psy*0.3;}
  s+=recoveryAdj();
  if(ci&&ci.soreness>=2)s-=(ci.soreness-1)*4;
  const inj=d.injuries.filter(i=>i.active);
  if(inj.length){const m=Math.max(...inj.map(i=>i.sev));s=Math.max(20,s-m*8);}
  return Math.round(Math.min(100,Math.max(20,s)));
}
function activeDays(){const s=new Set();S().checkins.forEach(c=>{if(ciFull(c)||c.mindfulMin>0)s.add(c.date);});return s;}
function calcStreak(){const s=activeDays();let n=0,i=s.has(td())?0:1;while(s.has(dAgo(i))){n++;i++;}return n;}
function bestStreak(){const a=[...activeDays()].sort();let best=0,run=0,prev=null;for(const x of a){run=prev&&daysAgoBetween(prev,x)===1?run+1:1;best=Math.max(best,run);prev=x;}return best;}
const daysAgoBetween=(a,b)=>Math.round((new Date(b+'T00:00:00')-new Date(a+'T00:00:00'))/864e5);
function seriesFor(n,fn){return Array.from({length:n},(_,i)=>{const date=dAgo(n-1-i);return{date,v:fn(date)};});}
const moodOn=date=>{const c=S().checkins.find(x=>x.date===date);return c?.mood||0;};
const mindOn=date=>S().checkins.find(x=>x.date===date)?.mindfulMin||0;
const fmtIcu=w=>{const r=wIcu(w),x={};['hr','hrMax','kcal','elev'].forEach(k=>x[k]=Math.round(+r[k])||0);const o=[];if(x.hr)o.push('avg '+x.hr+' bpm'+(x.hrMax?', max '+x.hrMax:''));if(x.kcal)o.push(x.kcal+' kcal');if(x.elev)o.push(x.elev+' m climb');return o.join(' · ');};
const fmtDist=w=>w.distKm?(w.type==='Swim'?Math.round(w.distKm*1000)+' m':w.distKm+' km'):'';
// v123: fitness against about 4 weeks ago in one word, instead of "CTL"
function fitWord(){const d=S();let o=null;for(let i=28;i<=35&&o==null;i++){const x=d.wellness[dAgo(i)];if(x&&x.ctl!=null)o=x.ctl;}if(o==null)return'';const c=d.intervalsData.ctl-o;return c>=3?'Rising':c<=-3?'Falling':'Steady';}
function renderTLoad(){
  const d=S(),{ctl,atl,tsb}=d.intervalsData;
  if(ctl===null){$('tloadContent').innerHTML=`<div class="empty-state"><div class="empty-icon">${UI.sat}</div><div class="empty-title">No training-load data yet</div><div class="empty-sub">Connect Intervals.icu in Settings to see your fitness, fatigue and freshness.</div><button class="empty-btn" onclick="openSettings()">Open Settings</button></div>`;return;}
  // v129: three plain tiles, the number and its word; no state colours
  const tl=(k,v,w)=>`<div class="dy-tl"><small>${k}</small><b>${v}</b><span>${w||'&nbsp;'}</span></div>`;
  $('tloadContent').innerHTML=`<div class="dy-tiles">${tl('Fitness',Math.round(ctl),fitWord())}${tl('Fatigue',Math.round(atl),zL(atl,'atl'))}${tl('Form',(tsb>0?'+':tsb<0?'−':'')+Math.abs(Math.round(tsb)),zL(tsb,'tsb'))}</div>`;
}
// v129: the workouts of the last 7 days, the total time in the header; Edit and Delete live in Log
function renderActList(){
  const d=S(),ws=wkOn().filter(w=>daysAgo(w.date)>=0&&daysAgo(w.date)<7).sort((a,b)=>a.date<b.date?1:a.date>b.date?-1:(wIcu(b).t||'')>(wIcu(a).t||'')?1:-1);
  const tot=ws.reduce((a,w)=>a+(+w.durMin||0),0),te=$('actTot');if(te)te.textContent=tot?fmtDur(tot):'';
  $('actList').innerHTML=dupHTML()+(ws.length?ws.map(w=>wkRow(w,{plain:1})).join(''):`<div class="empty-state"><div class="empty-title">Nothing logged in the last 7 days</div><div class="empty-sub">Workouts from your watch show here, or add one yourself.</div><button class="empty-btn" onclick="logGo('lWorkout')">Log a workout</button></div>`);
  renderWkLog();
}

// ── RENDER: WELLBEING ────────────────────────────────────────────────────────
// v128: minutes as a header value ('1h 5min', or '0 min': fmtDur reads 0 as a dash)
const durVU=v=>Math.round(v)?[fmtDur(Math.round(v)),'']:['0','min'];
// a day in a line: 'Last night' or a weekday inside the last week, a date before that
const dayWord=(d,night)=>d===td()?(night?'Last night':'Today'):daysAgo(d)<7?['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][new Date(d+'T12:00:00').getDay()]:fmtD(d);
// inside a sentence: 'today', 'on Monday', 'on 20 Sept'
const onDay=d=>d===td()?'today':'on '+dayWord(d);
function renderTrends(){
  renderMoodChart();renderBodyChart();
  const d=S(),dur=v=>fmtDur(Math.round(v));
  const mp=d.checkins.filter(c=>c.mindfulMin>0).sort((a,b)=>a.date<b.date?-1:1),pts=mp.map(c=>({d:c.date,v:c.mindfulMin}));
  if(mp.length<2){chUnmount('mindBars');$('mindBars').innerHTML=`<div class="vc-empty">${mp.length?'One session so far. Log another in Log > Mindfulness to see the trend.':'Log a mindfulness session in the Log tab and it shows here.'}</div>`;return;}
  const T=DN(td()),cw=ND(T-((T+3)%7+7)%7),nd=k=>`${k} day${k!==1?'s':''}`;
  mountChart('mindBars',{key:'mind',group:'trends',tb:false,H:130,label:'Mindfulness',yfmt:axMin,ysteps:CH_MIN_STEPS,
    series:[{name:'Mindful',type:'bar',color:'--green/.8',zero:'–',fmt:dur,vl:v=>fmtDur(Math.round(v)).split(' '),pts}],
    head:x=>{
      const R=trRight(pts,x,{tot:true,f:durVU});
      if(x.wk){const v=trLeft(pts,x,true),k=pts.filter(p=>DN(p.d)>=DN(x.d)&&DN(p.d)<=DN(x.d)+6).length;if(!v)return{...R,v:null};const[a,u]=durVU(v);return{...R,v:a,u,st:nd(k),sa:''};}
      if(!x.p)return{...R,v:null};const[a,u]=durVU(x.p.v);return{...R,v:a,u};},
    means:info=>{
      // calm on practice days against other days, from your own check-ins; else how often
      const cis=d.checkins.filter(c=>ciFull(c)&&c.date>=info.from&&c.date<=info.to),on=cis.filter(c=>c.mindfulMin>0),off=cis.filter(c=>!(c.mindfulMin>0));
      if(on.length>=3&&off.length>=3){const k=avg(on.map(c=>5-c.stress))-avg(off.map(c=>5-c.stress));if(k>=0.3)return'Calmer on days you practised.';if(k<=-0.3)return'Less calm on days you practised.';}
      const sh=pts.filter(p=>p.d>=info.from&&p.d<=info.to).length/info.days;return sh>=0.7?'Most days.':sh>=0.35?'A few days a week.':'Now and then.';},
    weekly:{series:[{name:'Mindful',type:'bar',w:7,color:'--green/.8',fmt:dur,pts:weekBuckets(pts).map(w=>({d:w.d,v:w.v})),barColor:(v,dt)=>dt===cw?'--green/.45':'--green/.8'}],
      extra:dt=>{const k=pts.filter(p=>DN(p.d)>=DN(dt)&&DN(p.d)<=DN(dt)+6).length;return nd(k)+(dt===cw?' (so far)':'');}}});
}
// bedtime as minutes from noon, so 23:30 and 00:30 sit an hour apart
const bedMin=t=>{const[h,m]=t.split(':').map(Number);return(h<12?h+24:h)*60+m-720;};
// v123: one line. Short nights in a row now lead, then this week's debt, then the average against the goal;
// a second sentence only when bedtime moves around a lot
function sleepMeaning(info,goal){
  const gH=goal/60,P=info.pts,l=last(P),r5=m=>Math.max(5,Math.round(m/5)*5);let k=0;for(let i=P.length-1;i>=0&&P[i].v<gH-1;i--)k++;
  if(k>=2&&daysAgo(l.d)<=1)return`Short ${k} nights in a row. An early night helps.`;
  const wk=S().sleepLogs.filter(x=>x.durMin&&daysAgo(x.date)<7&&slCounts(x)),debt=wk.reduce((a,x)=>a+(goal-x.durMin),0),diff=Math.round(info.avg*60-goal);
  if(info.to>=dAgo(1)&&wk.length>=3&&debt>=60){
    const sn=wk.reduce((m,x)=>!m||x.durMin<m.durMin?x:m,null);
    return`${fmtDur(r5(debt))} short of your goal this week.`+(sn.durMin<=goal-60?` ${dayWord(sn.date,true)} was the short night.`:'');}
  let t=Math.abs(diff)<10?'On your goal on average.':`About ${fmtDur(r5(Math.abs(diff)))} ${diff<0?'under':'over'} your goal on average.`;
  const beds=S().sleepLogs.filter(x=>x.bed&&x.date>=info.from&&x.date<=info.to).map(x=>bedMin(x.bed));
  if(beds.length>=5){const m=avg(beds),sd=Math.sqrt(avg(beds.map(x=>(x-m)**2)));if(sd>=45)t+=` Bedtime varies by about ${fmtDur(r5(sd))}.`;}
  return t;
}
function renderSleepBars(){
  const d=S(),goal=Math.round((d.profile.sleepGoal||7.5)*60),gH=goal/60;
  const nights=d.sleepLogs.filter(s=>s.durMin&&slCounts(s)).sort((a,b)=>a.date<b.date?-1:1);   // a battery night is a gap, not a short bar
  const host=$('sleepCanvas');
  if(host){
    if(nights.length<2){chUnmount('sleepCanvas');host.innerHTML=`<div class="vc-empty">${nights.length?'One night saved. Log another and your sleep chart appears.':'Log your sleep in the Log tab (bedtime and wake-up) to see it here.'}</div>`;}
    else{
      const pts=nights.map(s=>({d:s.date,v:s.durMin/60})),hv=v=>fmtDur(Math.round(v*60)),r5=m=>Math.max(5,Math.round(m/5)*5);
      const T=DN(td()),cw=ND(T-((T+3)%7+7)%7),bc=v=>v>=gH?'--teal':v>=gH-1?'--teal/.5':'--amber',gl=[{v:gH,label:'Goal '+fmtDur(goal),color:'--teal'}];
      // under the goal by 10 minutes or more says by how much; an hour or more is a warning
      const vsGoal=v=>{const m=goal-v*60;return m>=10?{st:`${fmtDur(r5(m))} under your goal`,cls:m>=60?'warn':'',sa:'▼'}:{st:'Goal met',cls:'good'};};
      mountChart('sleepCanvas',{key:'sleep',group:'trends',tb:false,legend:true,today:'Last night',H:160,label:'Time asleep',yfmt:v=>Math.round(v)+'h',
        series:[{name:'Asleep',type:'bar',color:'--teal',zero:'–',fmt:hv,vl:v=>hv(v).split(' '),pts,barColor:bc}],
        lines:gl,
        extra:date=>{const s=d.sleepLogs.find(x=>x.date===date);if(!s)return'';return[s.bed&&s.wake?`${s.bed} to ${s.wake}`:'',s.score?`score ${s.score} of 100`:'',s.rested?`felt ${['','not rested','so-so','rested','fully rested'][s.rested]||''}`:''].filter(Boolean).join(' · ');},
        head:x=>{
          const R=trRight(pts,x,{f:v=>[hv(v),''],r:v=>Math.round(v*12)/12});
          const v=x.wk?trLeft(pts,x,false):x.p?x.p.v:null;
          return v==null?{...R,v:null}:{...R,v:hv(v),u:'',...vsGoal(v)};},
        means:info=>sleepMeaning(info,goal),
        weekly:{series:[{name:'Asleep',type:'bar',w:7,color:'--teal',fmt:hv,pts:weekBuckets(pts,'avg').map(w=>({d:w.d,v:w.v})),barColor:(v,dt)=>dt===cw?'--teal/.5':bc(v)}],lines:gl,
          extra:dt=>{const k=pts.filter(p=>DN(p.d)>=DN(dt)&&DN(p.d)<=DN(dt)+6).length;return`Average of ${k} night${k!==1?'s':''}`+(dt===cw?' (so far)':'');}}});
    }
  }
  const l=last(nights.filter(s=>s.deepH||s.deepM||s.remH||s.remM));
  $('stNight').textContent=l?'Sleep stages, night ending '+fmtD(l.date):'';$('stBox').style.display=l?'':'none';
  if(l)setStages(l.deepH||0,l.deepM||0,l.remH||0,l.remM||0,l.durMin);
  lgStat();
  // keep the form in step with imports, but never while the user is in it
  const f=$('lSleep');if(f&&!f.classList.contains('open')&&!f.contains(document.activeElement))loadSleepFor($('slDate').value||td());
}
function renderWtChart(){
  const d=S(),host=$('wtCanvas');if(!host)return;
  const all=d.measurements.filter(m=>m.weight).sort((a,b)=>a.date<b.date?-1:1),goal=d.profile.wtGoal||null,gl=$('wtGoalLine');
  if(all.length<2){chUnmount('wtCanvas');host.innerHTML='';gl.textContent=all.length?`${all[0].weight} kg so far. Log again to see a trend.`:'Log your weight in the Log tab to see a trend.';return;}
  const f1=v=>(Math.round(v*10)/10).toFixed(1)+' kg',s1=v=>(Math.round(v*10)/10).toFixed(1);   // always one decimal: 73.0 sits beside 73.1
  // the 7-day average smooths out water and food swings, so the trend is read from it, never from one weigh-in
  const raw=all.map(m=>({d:m.date,v:m.weight})),sm=raw.map(p=>{const w=raw.filter(q=>q.d<=p.d&&DN(p.d)-DN(q.d)<7);return{d:p.d,v:avg(w.map(q=>q.v))};});
  const r1=v=>Math.round(v*10)/10;
  mountChart('wtCanvas',{key:'wt',group:'trends',tb:false,legend:true,H:170,label:'Body weight',yfmt:r1,lines:goal?[{v:goal,label:'Goal '+goal+' kg',color:'--t3'}]:[],
    series:[{pts:raw,color:'--teal',name:'Weight',fmt:f1,vl:s1,thin:true},{pts:sm,color:'--text',name:'7-day average',fmt:f1,noDots:true,lg:true}],
    hi:true,
    head:x=>{
      const R=trRight(raw,x,{f:v=>[s1(v),'kg'],r:r1});if(!x.p)return{...R,v:null};
      const v=x.p.v,g=goal?r1(v-goal):null;
      return{...R,v:s1(v),u:'kg',...(g==null?{}:Math.abs(g)<0.5?{st:'At your goal',cls:'good'}:{st:`${f1(Math.abs(g))} ${g>0?'over':'under'} your goal`,sa:g>0?'▲':'▼'})};},
    means:info=>{
      const v=sm.filter(p=>p.d>=info.from&&p.d<=info.to);if(v.length<2)return'';
      const a=v[0],b=last(v),wks=Math.max(1,(DN(b.d)-DN(a.d))/7),ch=b.v-a.v,rate=ch/wks;
      let t=f1(b.v)+(Math.abs(ch)<0.3?', steady':`, ${ch<0?'down':'up'} ${f1(Math.abs(ch))} since ${dayWord(a.d).replace('Today','today')}`);
      if(Math.abs(rate)>b.v*TH.WT_RATE)return t+(rate<0?'. That is fast; eat enough on training days.':'. That is fast.');
      if(goal)t+=Math.abs(b.v-goal)<0.5?': at your goal':Math.abs(ch)<0.3?`; your goal is ${goal} kg`:`: ${Math.sign(ch)===Math.sign(goal-b.v)?'towards':'away from'} your ${goal} kg goal`;
      return t+'.';}});
  gl.textContent='';
}
function calcBurnout(){
  const d=S(),cis=d.checkins.filter(ciFull).slice(-7);
  if(!cis.length)return{score:0,label:'No data',sub:'Do a few check-ins and this fills in.',psy:0,phys:0};
  const avgS=cis.reduce((a,c)=>a+(5-c.stress),0)/cis.length,avgE=cis.reduce((a,c)=>a+c.energy,0)/cis.length,avgM=cis.reduce((a,c)=>a+c.mood,0)/cis.length;
  const psy=Math.round((avgS+avgE+avgM)/(4*3)*100);
  // psychological only since v118 (A3 ledger): training fatigue is read under Load, not here. psy is "how well you are coping", 100 = fine
  const score=Math.max(0,Math.min(100,Math.round(100-psy)));
  return{score,label:score<TH.BURNOUT_MOD?'Low risk':score<TH.BURNOUT_HIGH?'Moderate risk':'High risk',sub:score<TH.BURNOUT_MOD?'':score<TH.BURNOUT_HIGH?'Some stress signals. Watch energy and sleep.':'Low energy, low mood or stress for a week. Keep hard days few and protect sleep.',psy,phys:null,n:cis.length};
}
function renderBurnout(){
  // the same maths as calcBurnout for every day with a check-in, over the 7 check-ins up to that day
  const cis=S().checkins.filter(ciFull).sort((a,c)=>a.date<c.date?-1:1),pts=cis.map((c,i)=>{const w=cis.slice(Math.max(0,i-6),i+1);
    return{d:c.date,v:Math.round(100-w.reduce((a,x)=>a+(5-x.stress)+x.energy+x.mood,0)/(w.length*12)*100)};}).filter((p,i)=>i>=2);
  if(pts.length<2){chUnmount('boCanvas');$('boCanvas').innerHTML=`<div class="vc-empty">${cis.length?'Check in a few more days and your burnout risk shows here.':'Your burnout risk appears after a few check-ins in the Log tab.'}</div>`;return;}
  const lvl=v=>v>=TH.BURNOUT_HIGH?{st:'High risk',cls:'bad',sa:'▲'}:v>=TH.BURNOUT_MOD?{st:'Moderate risk',cls:'warn',sa:'▲'}:{st:'Low risk',cls:'good'};
  mountChart('boCanvas',{key:'bo',group:'trends',tb:false,H:140,min:0,max:100,label:'Burnout risk',yfmt:v=>Math.round(v),
    series:[{name:'Risk',color:'--text',fmt:v=>String(Math.round(v)),pts}],
    zones:[{lo:TH.BURNOUT_HIGH,hi:null,color:'--red',label:'High'},{lo:TH.BURNOUT_MOD,hi:TH.BURNOUT_HIGH,color:'--amber',label:'Moderate'},{lo:null,hi:TH.BURNOUT_MOD,color:'--green',label:'Low'}],
    hi:true,
    head:x=>{const R=trRight(pts,x,{f:v=>[String(Math.round(v)),'']});return x.p?{...R,v:String(Math.round(x.p.v)),u:'of 100',...lvl(x.p.v)}:{...R,v:null};},
    means:info=>{
      const v=info.pts,hi=v.filter(p=>p.v>=TH.BURNOUT_HIGH),mod=v.filter(p=>p.v>=TH.BURNOUT_MOD&&p.v<TH.BURNOUT_HIGH).length;
      let run=0;for(let i=v.length-1;i>=0&&v[i].v>=TH.BURNOUT_MOD;i--)run++;
      if(run>=7)return`Above low for ${run} check-ins in a row. Easier days and more sleep help most.`;
      return hi.length?`High on ${hi.length} day${hi.length>1?'s':''}, the latest ${dayWord(last(hi).d).replace('Today','today')}.`:mod?`Mostly low, moderate on ${mod} day${mod>1?'s':''}.`:'Low throughout.';}});
}
// v120: one line at a time. "All four" is the Mind score (calcMind's maths) with its zones; the chips show one answer
// on its own, Low to Great. Tapping a day always lists the four answers in words. Four overlapping lines were hard to read.
let _moodK='Mind';
function renderMoodChart(){
  const d=S(),host=$('moodCanvas'),ch=$('moodChips');if(!host)return;
  const cis=d.checkins.filter(ciFull).sort((a,b)=>a.date<b.date?-1:1);
  $('moodNote').textContent=cis.length>1?'':cis.length?'One check-in so far. Check in again tomorrow and your trend appears.':'Your trends appear after your first check-in in the Log tab.';
  if(cis.length<2){chUnmount('moodCanvas');host.innerHTML='';if(ch)ch.innerHTML='';return;}
  const L=['','Low','Fair','Good','Great'],f=v=>L[Math.round(v)]||'';
  // an average in words, to the nearest half step: 3.4 is "Good", 3.5 "between Good and Great"
  const fa=v=>{const h=Math.round(v*2)/2;return h%1?`between ${L[Math.floor(h)]} and ${L[Math.ceil(h)]}`:L[h];};
  const K=[['Mood',c=>c.mood],['Energy',c=>c.energy],['Calm',c=>5-c.stress],['Motivation',c=>c.motivation]];
  if(!K.some(k=>k[0]===_moodK))_moodK='Mind';
  if(ch)ch.innerHTML=[['Mind','All four'],...K.map(k=>[k[0],k[0]])].map(([k,n])=>`<button class="chip ${k===_moodK?'sel':''}" aria-pressed="${k===_moodK}" onclick="_moodK='${k}';renderMoodChart()">${n}</button>`).join('');
  const byDate={};cis.forEach(c=>byDate[c.date]=c);
  const extra=dt=>byDate[dt]?K.map(([n,fn])=>n+' '+f(fn(byDate[dt]))).join(' · '):'';
  const inView=info=>cis.filter(c=>c.date>=info.from&&c.date<=info.to);
  // a current run of check-ins with two or more answers under Good leads the line
  const runNow=v=>{let k=0;for(let i=v.length-1;i>=0&&K.filter(q=>q[1](v[i])<3).length>=2;i--)k++;return k>=3&&daysAgo(last(v).date)<=1?`${k} check-ins in a row with two answers or more under Good. Look at sleep, training and stress.`:'';};
  if(_moodK==='Mind'){
    const zones=mindZones(),pts=cis.map(c=>({d:c.date,v:mindOf(c)})),zc={Good:'good',Strained:'warn'};
    mountChart('moodCanvas',{key:'mood',group:'trends',tb:false,H:170,min:25,max:100,label:'Mind',yfmt:v=>String(Math.round(v)),zones,hi:true,extra,
      series:[{name:'Mind',color:'--text',fmt:v=>String(Math.round(v)),pts}],
      head:x=>{const R=trRight(pts,x,{f:v=>[String(Math.round(v)),'']});if(!x.p)return{...R,v:null};const z=chZone({zones},x.p.v);
        return{...R,v:String(Math.round(x.p.v)),u:'of 100',...(z?{st:z.label,cls:zc[z.label]||'',sa:z.label==='Strained'?'▼':'●'}:{})};},
      means:info=>{
        const v=inView(info);if(!v.length)return'';const r=runNow(v);if(r)return r;
        const cnt=zones.map(z=>[z.label,v.filter(c=>chZone({zones},mindOf(c))===z).length]).sort((a,b)=>b[1]-a[1]),top=cnt[0];
        const ws=cnt.filter(x=>x[1]).map(x=>x[0].toLowerCase());
        let t=top[1]===v.length?'All '+top[0].toLowerCase():top[1]/v.length>=0.6?'Mostly '+top[0].toLowerCase():'A mix of '+ws.slice(0,-1).join(', ')+' and '+last(ws)+' days';
        const m=K.map(([n,fn])=>[n,avg(v.map(fn))]).sort((a,b)=>a[1]-b[1]),lo=m[0];
        if(m[3][1]-lo[1]>=0.3)t+=lo[0]==='Calm'&&lo[1]<2.75?'; stress pulls it down most':`; ${lo[0].toLowerCase()} is the lowest`;
        return t+'.';}});
  }else{
    const fn=K.find(k=>k[0]===_moodK)[1],pts=cis.map(c=>({d:c.date,v:fn(c)}));
    mountChart('moodCanvas',{key:'mood',group:'trends',tb:false,H:170,min:1,max:4,label:_moodK,yfmt:f,extra,
      series:[{name:_moodK,color:'--text',fmt:f,pts}],
      // words, not numbers: the right side is the window's average to the nearest word, without a change line
      head:x=>{const g=trAgg(pts,x,false),R=g.v==null?{}:{rl:trRl(x.n),rv:L[Math.round(g.v)]};return x.p?{...R,v:f(x.p.v),st:''}:{...R,v:null};},
      lines:[{v:3,color:'--t3'}],
      stats:{words:['Best','Worst']},
      means:info=>{
        const v=inView(info);if(!v.length)return'';
        const lows=v.filter(c=>fn(c)<=1),under=v.filter(c=>fn(c)<3);
        const t=`Averaging ${fa(avg(v.map(fn)))}`+(lows.length?`, Low on ${lows.length} day${lows.length>1?'s':''}`:'')+'.';
        return t+(_moodK==='Calm'&&under.length*2>=v.length?' Stress is the one to work on.':'');}});
  }
}
// v123: coffee in one plain sentence; "often late" once a quarter of the days with coffee had some after 2 pm
function cupsLine(a,late,n){const c=Math.round(a);return(a<0.5?'Little coffee':`About ${c} cup${c===1?'':'s'} of coffee a day`)+(late>=3&&late>=n/4?', often late in the day.':'.');}
function renderBodyChart(){
  const d=S(),host=$('bodyCanvas');if(!host)return;
  const cis=d.checkins.filter(c=>c.soreness!=null||c.coffee!=null).sort((a,b)=>a.date<b.date?-1:1);
  const note=$('bodyNote');
  if(cis.length<2){chUnmount('bodyCanvas');host.innerHTML='';note.textContent='Log soreness and coffee in your check-in for a few days to see them here.';return;}
  const SL=['None','Mild','Moderate','Severe'];
  const sore=cis.filter(c=>c.soreness!=null).map(c=>({d:c.date,v:c.soreness-1}));
  const cof=cis.filter(c=>c.coffee!=null).map(c=>({d:c.date,v:c.coffee}));
  const series=[];
  if(sore.length>1)series.push({name:'Soreness',type:'bar',color:'--red',lg:true,fmt:v=>SL[Math.round(v)]||'',pts:sore,barColor:v=>v>=3?'--red':v>=2?'--red/.65':'--red/.35'});
  const cups=v=>Math.round(v)+(Math.round(v)>=4?'+':'');
  if(cof.length>1)series.push({name:'Coffee',color:'--text',thin:true,lg:true,fmt:v=>cups(v)+' cups',vl:cups,pts:cof});
  const byDate={},ci=series.findIndex(s=>s.name==='Coffee');cis.forEach(c=>byDate[c.date]=c);
  if(!series.length){chUnmount('bodyCanvas');host.innerHTML='';note.textContent='Log soreness and coffee in your check-in for a few days to see them here.';return;}
  mountChart('bodyCanvas',{key:'body',group:'trends',tb:false,legend:true,H:150,min:0,max:4,label:'Soreness and coffee',yfmt:v=>String(Math.round(v)),series,vs:ci>=0?[ci]:[],
    lines:cof.length>1?[{v:3,label:'3+ cups',color:'--amber'}]:[],
    head:x=>{
      const r1=v=>Math.round(v*10)/10,R=cof.length>1?trRight(cof,x,{f:v=>[String(r1(v)),r1(v)===1?'cup':'cups'],r:r1,rl:'Coffee a day'}):{},c=byDate[x.d];
      if(!c)return{...R,v:null};const n=c.coffee!=null?Math.round(c.coffee):null;
      return{...R,v:c.soreness!=null?SL[c.soreness-1]:'–',u:c.soreness!=null?'soreness':'',st:n==null?'':n?`${cups(n)} cup${n===1?'':'s'} of coffee`+(c.coffeeLate?', late':''):'No coffee',sa:''};},
    means:info=>{
      const v=cis.filter(c=>c.date>=info.from&&c.date<=info.to);if(!v.length)return'';
      const s=v.filter(c=>c.soreness>=2),m=v.filter(c=>c.soreness>=3),cf=v.filter(c=>c.coffee!=null),late=v.filter(c=>c.coffeeLate);
      const t=m.length?`Sore on ${m.length} day${m.length>1?'s':''}, the latest ${dayWord(last(m).date).replace('Today','today')}.`:s.length?'Only mild soreness.':'No soreness.';
      return cf.length?t+' '+cupsLine(avg(cf.map(c=>c.coffee)),late.length,cf.length):t;}});
  // Coffee vs the following night's sleep, in words
  const slBy={};d.sleepLogs.forEach(s=>{if(s.durMin)slBy[s.date]=s.durMin;});
  const next=iso=>{const t=new Date(iso+'T12:00:00');t.setDate(t.getDate()+1);return t.toISOString().slice(0,10);};
  const hi=[],lo=[];
  cis.forEach(c=>{if(c.coffee==null)return;const m=slBy[next(c.date)];if(!m)return;(c.coffee>=3?hi:lo).push(m);});
  const am=a=>Math.round(a.reduce((x,y)=>x+y,0)/a.length);
  if(hi.length>=3&&lo.length>=3){
    const diff=am(lo)-am(hi);
    // v123: only when it makes a difference of 20 minutes or more
    note.textContent=Math.abs(diff)>=20?`After days with 3 or more cups you slept about ${fmtDur(Math.round(Math.abs(diff)/5)*5)} ${diff>0?'less':'more'}.`:'';
  }else note.textContent='';
}

// ── RENDER: HISTORY ──────────────────────────────────────────────────────────
let _calDate=new Date();
function renderCalendar(){
  const d=S(),y=_calDate.getFullYear(),m=_calDate.getMonth();
  $('calTitle').textContent=new Date(y,m,1).toLocaleString('default',{month:'long',year:'numeric'});
  const first=new Date(y,m,1).getDay(),days=new Date(y,m+1,0).getDate(),today=td();
  let html='',active=0;
  ['S','M','T','W','T','F','S'].forEach(l=>html+=`<div class="cal-dlbl">${l}</div>`);
  for(let i=0;i<first;i++)html+='<div></div>';
  for(let day=1;day<=days;day++){
    const date=`${y}-${String(m+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const sl=d.sleepLogs.find(s=>s.date===date&&s.score),ci=d.checkins.find(c=>c.date===date),wk=wkOn().find(w=>w.date===date);
    let score=0;
    if(ciFull(ci))score=(ci.energy+ci.mood+(5-ci.stress)+ci.motivation)/16*100;else if(sl)score=sl.score;else if(wk||ci?.mindfulMin)score=60;
    if(score||ci||wk)active++;
    let cls='cal-day';
    cls+=score>0?(score>=75?' good has-dot':score>=55?' ok has-dot':' low has-dot'):' empty';
    if(date===today)cls+=' today';
    html+=`<div class="${cls}" onclick="openDay('${date}')">${day}</div>`;
  }
  $('calGrid').innerHTML=html;
  $('calNote').textContent=`${active} active day${active!==1?'s':''} this month · colour shows how you felt (green good, amber okay, red low)`;
}
function calPrev(){_calDate.setDate(1);_calDate.setMonth(_calDate.getMonth()-1);renderCalendar();}
function calNext(){_calDate.setDate(1);_calDate.setMonth(_calDate.getMonth()+1);renderCalendar();}
function openDay(date){
  const d=S(),sl=d.sleepLogs.find(s=>s.date===date),ci=d.checkins.find(c=>c.date===date),ws=wkOn().filter(w=>w.date===date);
  $('dayPT').textContent=new Date(date+'T12:00:00').toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'short',year:'numeric'});
  const row=(l,v)=>`<div class="day-row"><span class="day-lbl">${l}</span><span class="day-val">${v}</span></div>`;
  let html='';
  if(sl)html+=row('Sleep',`${sl.durMin?fmtDur(sl.durMin)+' · ':''}${sl.score?sl.score+'/100':'no score'}<button class="day-del" style="color:var(--text)" onclick="editSleep('${date}')">Edit</button>`)+((sl.deepH||sl.deepM)?row('Deep sleep',fmtHM(sl.deepH||0,sl.deepM||0)):'')+((sl.remH||sl.remM)?row('REM sleep',fmtHM(sl.remH||0,sl.remM||0)):'');
  if(ciFull(ci))html+=row('Energy',EM.energy[ci.energy])+row('Mood',EM.mood[ci.mood])+row('Stress',EM.stress[ci.stress])+row('Motivation',EM.motivation[ci.motivation]);
  if(ci?.mindfulMin)html+=row('Mindfulness',fmtDur(ci.mindfulMin));
  if(reflOf(ci)){const r=reflOf(ci);if(r.gave)html+=row('Gave energy',`<span style="font-size:12px;font-family:var(--body);text-align:right;max-width:190px;display:inline-block">${esc(r.gave)}</span>`);if(r.drained)html+=row('Drained me',`<span style="font-size:12px;font-family:var(--body);text-align:right;max-width:190px;display:inline-block">${esc(r.drained)}</span>`);}
  if(ci?.gratitude)html+=row('Grateful for',`<span style="font-size:12px;font-family:var(--body);text-align:right;max-width:190px;display:inline-block">${esc(ci.gratitude)}</span>`);
  ws.forEach(w=>{const sm=[w.sets?'':(w.durMin?fmtDur(w.durMin):''),w.distKm?fmtDist(w):''].filter(Boolean).join(' · ');html+=row(`<button type="button" class="day-wk" aria-label="${esc(wkLabel(w))}${sm?', '+sm:''}, details" onclick="closeDayPanel();openDetail('wk:${esc(w.id)}')">${esc(wkLabel(w))} <span aria-hidden="true">›</span>${sm?`<small>${sm}</small>`:''}</button>`,`<button class="day-del" onclick="editWorkout('${esc(w.id)}')">Edit</button><button class="day-del" onclick="delWorkout('${esc(w.id)}')">Delete</button>`);if(fmtIcu(w))html+=row('<i>Details</i>',`<span style="font-size:11px;opacity:.8;text-align:right;max-width:220px;display:inline-block">${fmtIcu(w)}</span>`);if(w.sets)html+=row('<i>Sets</i>',`<span style="font-size:11px;opacity:.8;text-align:right;max-width:220px;display:inline-block">${esc(setsText(w))}</span>`);if(w.notes)html+=row('<i>Note</i>',`<span style="font-size:11px;opacity:.7">${esc(w.notes)}</span>`);});
  if(!html)html='<div style="color:rgba(255,255,255,0.4);font-size:13px;padding:8px 0">Nothing logged for this day.</div>';
  $('dayPB').innerHTML=html;
  const p=$('dayPanel');p.classList.add('open');setTimeout(()=>p.scrollIntoView({behavior:'smooth',block:'nearest'}),100);
}
function closeDayPanel(){$('dayPanel').classList.remove('open');}
function renderBests(){
  const d=S(),out=[];
  ['Run','Cycle','Swim','Hike'].forEach(t=>{
    const ws=wkOn().filter(w=>w.type===t&&w.distKm>0&&!wkEb(w));if(!ws.length)return;
    const b=ws.reduce((a,w)=>w.distKm>a.distKm?w:a);
    out.push([ICON[t],`Longest ${t==='Cycle'?'ride':t.toLowerCase()}`,b.date,fmtDist(b)]);
  });
  strBests().forEach(r=>out.push(r));
  const lw=wkOn().filter(w=>w.durMin>0&&!w.sets);if(lw.length){const b=lw.reduce((a,w)=>w.durMin>a.durMin?w:a);out.push([UI.clock,'Longest session',b.date,fmtDur(b.durMin)]);}
  const bm=d.checkins.filter(c=>c.mindfulMin>0);if(bm.length){const b=bm.reduce((a,c)=>c.mindfulMin>a.mindfulMin?c:a);out.push([UI.lotus,'Longest mindfulness day',b.date,fmtDur(b.mindfulMin)]);}
  const bs=bestStreak();if(bs>1)out.push([UI.flame,'Best streak','',`${bs} days`]);
  $('prList').innerHTML=out.length?out.map(([i,t,dt,v])=>`<div class="act-item"><div class="act-icon past">${i}</div><div style="flex:1"><div class="act-name">${t}</div><div class="act-meta">${fmtD(dt)}</div></div><div class="best-v">${v}</div></div>`).join(''):`<div class="empty-state"><div class="empty-title">No records yet</div><div class="empty-sub">Log a few workouts and your personal bests show up here.</div><button class="empty-btn" onclick="logGo('lWorkout')">Log a workout</button></div>`;
}
function renderWeekSum(){
  const d=S(),tw=wkOn().filter(w=>daysAgo(w.date)<7),lw=wkOn().filter(w=>{const x=daysAgo(w.date);return x>=7&&x<14;});
  const dist=tw.reduce((a,w)=>a+(w.distKm||0),0),dur=tw.reduce((a,w)=>a+(w.durMin||0),0);
  const sl=d.sleepLogs.filter(s=>s.score).slice(-7),avg=sl.length?Math.round(sl.reduce((a,s)=>a+s.score,0)/sl.length):0;
  const delta=tw.length-lw.length,ds=delta>0?` ↑ +${delta} vs last week`:delta<0?` ↓ ${Math.abs(delta)} vs last week`:' = same as last week';
  const mm=seriesFor(7,mindOn).reduce((a,x)=>a+x.v,0);
  $('weekSum').innerHTML=`${tw.length} workout${tw.length!==1?'s':''} this week${ds}<br>${dur?fmtDur(dur)+' total':'0 min'} · ${dist.toFixed(1)} km<br>${tw.some(w=>w.sets)?'Strength sets: '+tw.reduce((n,w)=>n+(w.sets||[]).filter(isWork).length,0)+'<br>':''}Mindfulness: ${mm?fmtDur(mm):'—'}<br>Sleep avg: ${avg?avg+'/100':'—'}`;
}

