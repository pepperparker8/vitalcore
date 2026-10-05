// ── RENDER: TODAY ────────────────────────────────────────────────────────────
function renderGreeting(){
  const hr=new Date().getHours(),name=S().profile.name;
  const g=hr<12?'Good morning':hr<17?'Good afternoon':'Good evening';
  $('heroGreeting').textContent=`${g}${name?', '+name:''}`;
}
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
  const ls=[];for(let i=1;i<=60;i++){const l=dayLoad(dAgo(i));if(l>0)ls.push(l);}
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
function renderGauges(){
  const d=S(),load=dayLoad(td()),st=strainOf(load),tg=strainTarget();
  setGauge('strFill','strNum',st/21,load?st.toFixed(1):'0');
  $('gStrSub').textContent=!load&&restToday()?'Rest day':tg?`Aim ${tg[0]}–${tg[1]}`:'\u00a0';
  const sl=last(d.sleepLogs.filter(x=>x.durMin&&daysAgo(x.date)<=1));
  if(sl){const goal=(d.profile.sleepGoal||7.5)*60,pc=Math.min(100,Math.round(sl.durMin/goal*100));
    setGauge('slpFill','slpNum',pc/100,pc+'%');$('gSlpSub').textContent=fmtDur(sl.durMin);}
  else{setGauge('slpFill','slpNum',0,'—');$('gSlpSub').textContent='Log sleep';}
  renderFactors();if(typeof refreshDetail==='function')refreshDetail();const sc=heroScore();const n=daysLogged(30),bn=$('baseNote');if(bn){const b=!isExampleOnly()&&n<TH.MIN_BASE_DAYS;bn.style.display=b?'block':'none';bn.textContent=b?`Building your baseline: ${n} of ${TH.MIN_BASE_DAYS} days logged. Scores and usual ranges get more personal after two weeks of data.`:'';}
  $('gRecSub').textContent=scoreWord(sc);
}
function readinessFactors(){
  const d=S(),goal=(d.profile.sleepGoal||7.5)*60,out=[];
  const sl=last(d.sleepLogs.filter(x=>x.durMin&&daysAgo(x.date)<=1));
  if(sl){const pc=Math.round(sl.durMin/goal*100);out.push({k:'sleep',l:'Sleep',v:fmtDur(sl.durMin),n:pc+'% of goal',st:pc>=90?'good':pc>=75?'warn':'bad'});}
  else out.push({k:'sleep',l:'Sleep',v:'Not logged',n:'Tap for details',st:'none'});
  const tsb=d.intervalsData.tsb;
  if(tsb!==null&&tsb!==undefined)out.push({k:'form',l:'Form',v:(tsb>0?'+':'')+Math.round(tsb),n:zL(tsb,'tsb'),st:tsb>=TH.FORM_OK?'good':tsb>=TH.FORM_DEEP?'warn':'bad'});
  const ci=todayCI();
  if(ci&&ciFull(ci)){const p=Math.round((ci.energy+ci.mood+(5-ci.stress)+ci.motivation)/16*100);out.push({k:'checkin',l:'Check-in',v:p>=TH.MIND_GOOD?'Good':p>=TH.MIND_FLAT?'Okay':'Low',n:p+'/100',st:p>=TH.MIND_GOOD?'good':p>=TH.MIND_FLAT?'warn':'bad'});}
  else out.push({k:'checkin',l:'Check-in',v:'Not done',n:'Tap for details',st:'none'});
  const hv=latestOf('hrv'),hb=wSeries('hrv');
  if(hv&&hb.length>=RB_MIN){const r=hv.v/avg(hb);out.push({k:'hrv',l:'HRV',v:Math.round(hv.v)+' ms',n:'usual '+Math.round(avg(hb)),st:r>=0.97?'good':r>=0.9?'warn':'bad'});}
  else if(hv)out.push({k:'hrv',l:'HRV',v:Math.round(hv.v)+' ms',n:'building baseline',st:'none'});
  const rv=latestOf('rhr'),rb=rhrSeries();
  if(rv&&rb.length>=RB_MIN){const df=rv.v-avg(rb);out.push({k:'rhr',l:'Resting HR',v:Math.round(rv.v)+' bpm',n:'usual '+Math.round(avg(rb)),st:df<=2?'good':df<=5?'warn':'bad'});}
  else if(rv)out.push({k:'rhr',l:'Resting HR',v:Math.round(rv.v)+' bpm',n:'building baseline',st:'none'});
  const pv=latestOf('resp'),pb=wSeries('resp');
  if(pv&&pb.length>=RB_MIN){const df=pv.v-avg(pb);out.push({k:'breathing',l:'Breathing',v:pv.v.toFixed(1)+' /min',n:'usual '+avg(pb).toFixed(1),st:df<=1?'good':df<=2?'warn':'bad'});}
  if(ci&&ci.soreness>=2)out.push({k:'soreness',l:'Soreness',v:EM.soreness[ci.soreness],n:bodyLive()?'shapes today\'s session':'-'+(ci.soreness-1)*4+' on recovery',st:ci.soreness>=3?'bad':'warn'});
  if(ci&&ci.coffeeLate)out.push({k:'coffee',l:'Coffee',v:'Late cup',n:'after 14:00, may cut deep sleep',st:'warn'});
  const inj=d.injuries.filter(i=>i.active);
  if(inj.length){const m=Math.max(...inj.map(i=>i.sev));out.push({k:'injury',l:'Injury',v:inj.length===1?esc(inj[0].part):inj.length+' active',n:m>=3?'Severe':m===2?'Moderate':'Mild',st:m>=2?'bad':'warn'});}
  return out;
}
function renderFactors(){
  const el=$('rdFactors');if(!el)return;
  const f=readinessFactors();
  el.innerHTML='<div class="rf-h">What is driving recovery</div>'+f.map(x=>`<div class="rf ${x.st}" onclick="openDetail('${x.k}')" role="button" tabindex="0"><span class="rf-dot"></span><span class="rf-l">${x.l}</span><span class="rf-v">${x.v}</span><span class="rf-n">${x.n}</span></div>`).join('');
}
// sleep needed for the night ending on date (default tonight): goal, plus up to 45 min for the day's strain, plus half the debt of the 3 nights before
function sleepNeed(st,date){
  const d=S(),goal=(d.profile.sleepGoal||7.5)*60,ref=date?daysAgo(date):0;
  const debt=[1,2,3].reduce((a,i)=>{const l=d.sleepLogs.filter(x=>x.durMin&&daysAgo(x.date)===ref+i);return l.length?a+Math.max(0,goal-l[l.length-1].durMin):a;},0);
  return Math.round((goal+st/21*45+Math.min(45,debt/2))/5)*5;
}
const hhmm=m=>{m=((m%1440)+1440)%1440;return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');};
function setWake(v){if(!/^\d\d:\d\d$/.test(v))return;const d=S();d.profile.wakeTime=v;save(d);markProfile();if(typeof refreshDetail==='function')refreshDetail();}
function renderZone(score){
  let z,ins;
  if(bodyLive()){
    // Body (v118): green, yellow, red from TH.BODY_*
    if(score===null){z='Waiting for your watch';ins='Body needs heart rate variability or resting heart rate from last night. Sync to refresh.';}
    else if(score>=TH.BODY_GREEN){z='Body is recovered';ins='HRV, resting heart rate and sleep are in your usual range. A good day to train as planned.';}
    else if(score>=TH.BODY_YELLOW){z='Body is middling';ins='Some overnight signals are off. Train, but keep it controlled.';}
    else{z='Body needs recovery';ins='Your overnight signals are well off your usual. Rest or easy movement.';}
  }
  else if(score===null){z='Start with a check-in';ins='Tap how you feel below. Your readiness score appears once you check in or log sleep.';}
  else if(score>=TH.OLD_HIGH){z='Ready to push hard';ins='All systems green. Good day to train hard or race.';}
  else if(score>=TH.OLD_WARN){z='Solid day ahead';ins='Good recovery. Normal training appropriate today.';}
  else if(score>=TH.OLD_MOD){z='Moderate readiness';ins='Some fatigue. Keep intensity moderate today.';}
  else{z='Recovery day needed';ins='Body is under stress. Prioritise rest and sleep tonight.';}
  $('heroZone').textContent=z;$('heroIns').textContent=ins;
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
function renderHabits(){
  const d=S(),t=td(),ci=todayCI();
  const items=[
    [UI.chat,'CHECK-IN',ciFull(ci),'logGo(\'lCheckin\')'],
    [UI.lotus,'MINDFUL',(ci?.mindfulMin||0)>0,'logGo(\'lMind\')',ci?.mindfulMin?ci.mindfulMin+'m':''],
    [UI.run,'MOVE',d.workouts.some(w=>w.date===t),'logGo(\'lWorkout\')'],
    [UI.moon,'SLEEP',d.sleepLogs.some(s=>s.date===t),'switchTab(\'log\');openLog(\'lSleep\')']
  ];
  $('habits').innerHTML=items.map(([i,l,ok,go,txt])=>`<button class="hab ${ok?'done':''}" onclick="${go}"><div class="hab-i">${i}</div><div class="hab-l">${l}</div><div class="hab-s">${ok?(txt||'✓'):'Tap'}</div></button>`).join('');
  $('habitsN').textContent=`${items.filter(x=>x[2]).length} of 4 done`;
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
const trainOn=date=>S().workouts.filter(w=>w.date===date).reduce((a,w)=>a+(w.durMin||0),0);
function renderTLoad(){
  const d=S(),{ctl,atl,tsb}=d.intervalsData;
  if(ctl===null){$('tloadContent').innerHTML=`<div class="empty-state"><div class="empty-icon">${UI.sat}</div><div class="empty-title">No training-load data yet</div><div class="empty-sub">Connect Intervals.icu in Settings to see your fitness, fatigue and freshness.</div><button class="empty-btn" onclick="openSettings()">Open Settings</button></div>`;}
  else{$('tloadContent').innerHTML=`<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px"><div class="sbar"><div class="sbar-lbl">FITNESS</div><div class="sbar-val" style="color:var(--teal)">${ctl}</div><div class="sbar-zone" style="color:var(--teal)">CTL</div></div><div class="sbar"><div class="sbar-lbl">FATIGUE</div><div class="sbar-val" style="color:var(--red)">${atl}</div><div class="sbar-zone" style="color:var(--amber)">${zL(atl,'atl')}</div></div><div class="sbar"><div class="sbar-lbl">FORM</div><div class="sbar-val" style="color:var(--green)">${tsb>0?'+':''}${tsb}</div><div class="sbar-zone" style="color:var(--green)">${zL(tsb,'tsb')}</div></div></div>`;}
}
function renderActList(){
  const d=S(),t=td(),rows=[];
  for(let i=0;i<7;i++){
    const date=dAgo(i),isToday=i===0,ws=d.workouts.filter(w=>w.date===date);
    if(!ws.length)rows.push(`<div class="act-item"><div class="act-icon past" style="font-size:13px;color:var(--t3)">—</div><div><div class="act-name" style="color:var(--t3);font-weight:400">Nothing logged</div><div class="act-meta">${isToday?'Today':fmtD(date)}</div></div></div>`);
    else ws.forEach(w=>rows.push(wkRow(w)));
  }
  $('actList').innerHTML=dupHTML()+rows.join('');renderWkLog();
}

// ── RENDER: WELLBEING ────────────────────────────────────────────────────────
let _range=7;
function setRange(n){_range=n;[7,30,90].forEach(x=>$('rng'+x).classList.toggle('active',n===x));renderTrendsTab();}
const nDays=info=>DN(info.to)-DN(info.from)+1;
function renderTrends(){
  renderMoodChart();renderBodyChart();
  const d=S(),mr=seriesFor(_range,mindOn),tr=seriesFor(_range,trainOn);
  const tm=mr.reduce((a,x)=>a+x.v,0),tt=tr.reduce((a,x)=>a+x.v,0),days=mr.filter(x=>x.v).length,tdays=tr.filter(x=>x.v).length;
  const hm=v=>v>=60?Math.round(v/60*10)/10+'h':Math.round(v)+'m',dur=v=>fmtDur(Math.round(v));
  $('mindSum').textContent=tm?`${fmtDur(tm)} · ${days} day${days!==1?'s':''}, last ${_range} days`:'none in the last '+_range+' days';
  const mp=d.checkins.filter(c=>c.mindfulMin>0).sort((a,b)=>a.date<b.date?-1:1);
  if(mp.length<2)$('mindBars').innerHTML=`<div class="vc-empty">${mp.length?'One session so far. Log another in Log > Mindfulness to see the trend.':'Log a mindfulness session in the Log tab and it shows here.'}</div>`;
  else mountChart('mindBars',{key:'mind'+_range,H:130,span:_range,label:'Mindfulness',yfmt:hm,
    series:[{name:'Mindful',type:'bar',color:'--green/.8',fmt:dur,pts:mp.map(c=>({d:c.date,v:c.mindfulMin}))}],
    stats:{avg:'average on practice days',unit:'days',one:'session'},
    means:info=>{
      const n=nDays(info);let t=`You practised on ${info.n} of ${n} days, ${fmtDur(Math.round(info.avg*info.n))} in total.`;
      // calm on practice days against other days, from your own check-ins
      const cis=d.checkins.filter(c=>ciFull(c)&&c.date>=info.from&&c.date<=info.to),on=cis.filter(c=>c.mindfulMin>0),off=cis.filter(c=>!(c.mindfulMin>0));
      if(on.length>=3&&off.length>=3){const k=avg(on.map(c=>5-c.stress))-avg(off.map(c=>5-c.stress));t+=k>=0.3?' Calm was higher on days you practised than on days you did not.':k<=-0.3?' Calm was lower on days you practised than on days you did not.':' Calm was about the same on days you practised as on days you did not.';}
      return t;},
    how:'Each bar is the minutes of mindfulness on that day. Short sessions most days tend to help more than one long one a week. When there are enough check-ins, the note compares how calm you felt on practice days and other days.'});
  $('trainSum').textContent=tt?`${fmtDur(tt)} · ${tdays} day${tdays!==1?'s':''}, last ${_range} days`:'none in the last '+_range+' days';
  const tp=[...new Set(d.workouts.map(w=>w.date))].sort().map(dt=>({d:dt,v:trainOn(dt)})).filter(p=>p.v>0);
  if(tp.length<2)$('trainBars').innerHTML=`<div class="vc-empty">${tp.length?'One workout so far. Log another to see the trend.':'Log a workout in the Log tab and it shows here.'}</div>`;
  else mountChart('trainBars',{key:'train'+_range,H:130,span:_range,label:'Training time',yfmt:hm,
    series:[{name:'Training',type:'bar',color:'--t2',fmt:dur,pts:tp}],
    hi:true,stats:{avg:'average on training days',unit:'days',one:'session'},
    extra:dt=>d.workouts.filter(w=>w.date===dt).map(w=>w.type+(w.durMin?' '+fmtDur(w.durMin):'')).join(' · '),
    means:info=>{
      const n=nDays(info);let t=`${info.n} training day${info.n!==1?'s':''} of ${n}, ${fmtDur(Math.round(info.avg*info.n))} in total; the longest was ${fmtDur(Math.round(info.hi.v))} on ${fmtD(info.hi.d)}.`;
      // the longest run of days without a rest day
      const set=new Set(info.pts.map(p=>p.d));let run=0,best=0;for(let x=DN(info.from);x<=DN(info.to);x++){run=set.has(ND(x))?run+1:0;best=Math.max(best,run);}
      if(best>=7)t+=` You went ${best} days in a row without a rest day; one easy or rest day a week helps you absorb the training.`;
      return t;},
    how:'Each bar is the total training time that day, all sports together. Tap a bar to see the sessions. The high and low in view are labelled.'});
}
// bedtime as minutes from noon, so 23:30 and 00:30 sit an hour apart
const bedMin=t=>{const[h,m]=t.split(':').map(Number);return(h<12?h+24:h)*60+m-720;};
// how far nights are from the goal, and how steady the bedtime is, for the nights in view
function sleepMeaning(info,goal){
  const gH=goal/60,short=info.pts.filter(p=>p.v<gH-1),diff=Math.round(info.avg*60-goal);
  let t=`You averaged ${fmtDur(Math.round(info.avg*60))} asleep, `+(Math.abs(diff)<10?'right on your goal.':diff<0?`${fmtDur(-diff)} under your ${fmtDur(goal)} goal.`:`${fmtDur(diff)} over your goal.`);
  if(short.length)t+=` ${short.length} night${short.length>1?'s were':' was'} more than an hour short, the latest ${fmtD(last(short).d)}.`;
  // two or more short nights in a row is when it starts to show in heart rate variability and mood
  let run=0,best=0;info.pts.forEach(p=>{run=p.v<gH-1?run+1:0;best=Math.max(best,run);});
  if(best>=2)t+=` ${best} short nights came in a row; that is when it starts to show in how recovered you are.`;
  const beds=S().sleepLogs.filter(s=>s.bed&&s.date>=info.from&&s.date<=info.to).map(s=>bedMin(s.bed));
  if(beds.length>=5){const m=avg(beds),sd=Math.sqrt(avg(beds.map(x=>(x-m)**2)));t+=sd>=45?` Your bedtime moved around by about ${fmtDur(Math.round(sd/5)*5)}; a steadier bedtime usually means better sleep.`:` Your bedtime was steady (usually around ${hhmm(Math.round(m)+720)}).`;}
  return t;
}
function renderSleepBars(){
  const d=S(),goal=Math.round((d.profile.sleepGoal||7.5)*60),gH=goal/60;
  const nights=d.sleepLogs.filter(s=>s.durMin).sort((a,b)=>a.date<b.date?-1:1);
  const host=$('sleepCanvas');
  if(host){
    if(nights.length<2)host.innerHTML=`<div class="vc-empty">${nights.length?'One night saved. Log another and your sleep chart appears.':'Log your sleep in the Log tab (bedtime and wake-up) to see it here.'}</div>`;
    else mountChart('sleepCanvas',{key:'sleep',H:160,span:14,label:'Time asleep',yfmt:v=>Math.round(v)+'h',
      series:[{name:'Asleep',type:'bar',color:'--teal',fmt:v=>fmtDur(Math.round(v*60)),pts:nights.map(s=>({d:s.date,v:s.durMin/60})),
        barColor:v=>v>=gH?'--teal':v>=gH-1?'--teal/.5':'--amber'}],
      lines:[{v:gH,label:'Goal '+fmtDur(goal),color:'--teal'}],hi:true,
      extra:date=>{const s=d.sleepLogs.find(x=>x.date===date);if(!s)return'';return[s.bed&&s.wake?`${s.bed} to ${s.wake}`:'',s.score?`score ${s.score} of 100`:'',s.rested?`felt ${['','not rested','so-so','rested','fully rested'][s.rested]||''}`:''].filter(Boolean).join(' · ');},
      stats:{good:v=>v>=gH,label:'at or over your goal',unit:'nights',one:'night'},
      means:info=>sleepMeaning(info,goal),
      how:`Each bar is the time asleep for the night ending on that date. Teal: at or over your goal of ${fmtDur(goal)} (change it in Settings). Light teal: within an hour of it. Amber: more than an hour short. One short night matters little; several in a row add up and show in your heart rate variability, mood and appetite.`});
  }
  const wk=d.sleepLogs.filter(s=>s.durMin&&daysAgo(s.date)<7);
  $('sleepDebt').textContent=wk.length?(()=>{const debt=wk.reduce((a,s)=>a+(goal-s.durMin),0);return`Last 7 days: ${debt>0?`${fmtDur(debt)} short of your goal in total (${wk.length} night${wk.length>1?'s':''}).`:`${fmtDur(-debt)} ahead of your goal (${wk.length} night${wk.length>1?'s':''}).`}`;})():'Add time asleep to see your sleep debt against your goal.';
  const l=last(nights.filter(s=>s.deepH||s.deepM||s.remH||s.remM));
  $('stNight').textContent=l?'Sleep stages, night ending '+fmtD(l.date):'Sleep stages appear once a night has deep and REM sleep.';
  if(l)setStages(l.deepH||0,l.deepM||0,l.remH||0,l.remM||0,l.durMin);
  const t=d.sleepLogs.find(s=>s.date===td());$('sleepStat').textContent=!t?'Not logged today':slNeedsTime(t)?'Needs bedtime or wake-up':slIcu(t)?'Recorded':'Logged today';
  // keep the form in step with imports, but never while the user is in it
  const f=$('lSleep');if(f&&!f.classList.contains('open')&&!f.contains(document.activeElement))loadSleepFor($('slDate').value||td());
}
function renderWtChart(){
  const d=S(),host=$('wtCanvas');if(!host)return;
  const all=d.measurements.filter(m=>m.weight).sort((a,b)=>a.date<b.date?-1:1),goal=d.profile.wtGoal||null,gl=$('wtGoalLine');
  if(all.length<2){host.innerHTML='';gl.textContent=all.length?`Current: ${all[0].weight} kg — log again to see a trend`:'Log your weight in the Log tab to see a trend';return;}
  const f1=v=>(Math.round(v*10)/10)+' kg';
  // the 7-day average smooths out water and food swings, so the trend is read from it, never from one weigh-in
  const raw=all.map(m=>({d:m.date,v:m.weight})),sm=raw.map(p=>{const w=raw.filter(q=>q.d<=p.d&&DN(p.d)-DN(q.d)<7);return{d:p.d,v:avg(w.map(q=>q.v))};});
  mountChart('wtCanvas',{key:'wt',H:170,span:90,wide:true,label:'Body weight',yfmt:v=>Math.round(v*10)/10,ref:goal?[{v:goal,label:'Goal '+goal}]:[],
    series:[{pts:raw,color:'--teal',name:'Weight',fmt:f1,thin:true},{pts:sm,color:'--text',name:'7-day average',fmt:f1,noDots:true}],
    hi:true,stats:{one:'weigh-in',unit:'weigh-ins'},
    means:info=>{
      const v=sm.filter(p=>p.d>=info.from&&p.d<=info.to);if(v.length<2)return'';
      const a=v[0],b=last(v),wks=Math.max(1,(DN(b.d)-DN(a.d))/7),ch=b.v-a.v,rate=ch/wks;
      let t=Math.abs(ch)<0.3?`Steady at about ${f1(b.v)} from ${fmtD(a.d)} to ${fmtD(b.d)}.`:`${ch<0?'Down':'Up'} ${f1(Math.abs(ch))} from ${fmtD(a.d)} to ${fmtD(b.d)} (7-day average), about ${f1(Math.abs(rate))} a week.`;
      if(Math.abs(rate)>b.v*TH.WT_RATE)t+=` That is faster than ${Math.round(TH.WT_RATE*1000)/10}% of body weight a week; ${rate<0?'losing this fast usually costs muscle and recovery, so check you eat enough on training days':'check it is planned'}.`;
      if(goal&&Math.abs(b.v-goal)>=0.5){const to=goal-b.v;t+=Math.abs(rate)>=0.05&&Math.sign(rate)===Math.sign(to)?` At this rate you reach ${goal} kg in about ${Math.round(Math.abs(to/rate))} weeks.`:` Your goal of ${goal} kg is ${f1(Math.abs(to))} ${to<0?'below':'above'}; this stretch is not moving towards it.`;}
      return t;},
    how:`The thin line is each weigh-in; the dark line is the 7-day average, which evens out water and food swings, so read the trend from it. ${goal?'The dashed gold line is your goal (Settings). ':''}For most people a change of up to ${Math.round(TH.WT_RATE*1000)/10}% of body weight a week keeps training quality and muscle.`});
  const l=all[all.length-1].weight;
  gl.textContent=`Current: ${l.toFixed(1)} kg`+(goal?` · Goal: ${goal} kg · ${Math.abs(l-goal)<0.5?'At goal':Math.abs(l-goal).toFixed(1)+' kg to go'}`:'');
}
function calcBurnout(){
  const d=S(),cis=d.checkins.filter(ciFull).slice(-7);
  if(!cis.length)return{score:0,label:'No data',sub:'Do a few check-ins and this fills in.',psy:0,phys:0};
  const avgS=cis.reduce((a,c)=>a+(5-c.stress),0)/cis.length,avgE=cis.reduce((a,c)=>a+c.energy,0)/cis.length,avgM=cis.reduce((a,c)=>a+c.mood,0)/cis.length;
  const psy=Math.round((avgS+avgE+avgM)/(4*3)*100);
  // psychological only since v118 (A3 ledger): training fatigue is read under Load, not here. psy is "how well you are coping", 100 = fine
  const score=Math.max(0,Math.min(100,Math.round(100-psy)));
  return{score,label:score<TH.BURNOUT_MOD?'Low risk':score<TH.BURNOUT_HIGH?'Moderate risk':'High risk',sub:score<TH.BURNOUT_MOD?'Energy, mood and calm are steady.':score<TH.BURNOUT_HIGH?'Some stress signals. Watch energy and sleep.':'Low energy, low mood or stress for a week. Keep hard days few and protect sleep.',psy,phys:null,n:cis.length};
}
function renderBurnout(){
  const b=calcBurnout();
  $('boScore').textContent=b.score;$('boLabel').textContent=b.label;$('boSub').textContent=b.sub;
  $('boBreak').textContent=b.n?`From your last ${b.n} check-in${b.n!==1?'s':''}: energy, mood and calm ${b.psy} of 100 (higher is better). Training fatigue counts under Load, not here.`:'';
  // the same maths for every day with a check-in, over the 7 check-ins up to that day
  const cis=S().checkins.filter(ciFull).sort((a,c)=>a.date<c.date?-1:1),pts=cis.map((c,i)=>{const w=cis.slice(Math.max(0,i-6),i+1);
    return{d:c.date,v:Math.round(100-w.reduce((a,x)=>a+(5-x.stress)+x.energy+x.mood,0)/(w.length*12)*100)};}).filter((p,i)=>i>=2);
  if(pts.length<2){$('boCanvas').innerHTML='';return;}
  const zw=v=>v<TH.BURNOUT_MOD?'Low':v<TH.BURNOUT_HIGH?'Moderate':'High';
  mountChart('boCanvas',{key:'bo',H:140,min:0,max:100,span:60,label:'Burnout risk',yfmt:v=>Math.round(v),
    series:[{name:'Risk',color:'--text',fmt:v=>String(Math.round(v)),pts}],
    zones:[{lo:TH.BURNOUT_HIGH,hi:null,color:'--red',label:'High'},{lo:TH.BURNOUT_MOD,hi:TH.BURNOUT_HIGH,color:'--amber',label:'Moderate'},{lo:null,hi:TH.BURNOUT_MOD,color:'--green',label:'Low'}],
    hi:true,stats:{good:v=>v<TH.BURNOUT_MOD,label:'in the low zone',unit:'days',one:'day'},
    means:info=>{
      const v=info.pts,hi=v.filter(p=>p.v>=TH.BURNOUT_HIGH).length,mod=v.filter(p=>p.v>=TH.BURNOUT_MOD&&p.v<TH.BURNOUT_HIGH).length;
      let run=0,best=0;v.forEach(p=>{run=p.v>=TH.BURNOUT_MOD?run+1:0;best=Math.max(best,run);});
      let t=`Now ${zw(info.last.v).toLowerCase()} (${Math.round(info.last.v)}).`;
      t+=hi?` ${hi} day${hi!==1?'s':''} in the high zone and ${mod} moderate in view.`:mod?` ${mod} day${mod!==1?'s':''} moderate, none high, in view.`:' Low the whole time in view.';
      if(best>=7)t+=` The longest stretch above low was ${best} check-ins: when it lasts a week or more, easier days and more sleep help most.`;
      return t;},
    how:`Each point uses your last 7 check-ins: energy, mood and calm (stress turned around). Under ${TH.BURNOUT_MOD} is low, ${TH.BURNOUT_MOD} to ${TH.BURNOUT_HIGH-1} moderate, ${TH.BURNOUT_HIGH} and over high. A single bad day barely moves it; a week of low energy or high stress does. Training fatigue is not part of it.`});
}
// v120: one line at a time. "All four" is the Mind score (calcMind's maths) with its zones; the chips show one answer
// on its own, Low to Great. Tapping a day always lists the four answers in words. Four overlapping lines were hard to read.
let _moodK='Mind';
function renderMoodChart(){
  const d=S(),host=$('moodCanvas'),ch=$('moodChips');if(!host)return;
  const cis=d.checkins.filter(ciFull).sort((a,b)=>a.date<b.date?-1:1);
  $('moodNote').textContent=cis.length>1?'':cis.length?'One check-in so far. Check in again tomorrow and your trend appears.':'Your trends appear after your first check-in in the Log tab.';
  if(cis.length<2){host.innerHTML='';if(ch)ch.innerHTML='';return;}
  const L=['','Low','Fair','Good','Great'],f=v=>L[Math.round(v)]||'';
  // an average in words, to the nearest half step: 3.4 is "Good", 3.5 "between Good and Great"
  const fa=v=>{const h=Math.round(v*2)/2;return h%1?`between ${L[Math.floor(h)]} and ${L[Math.ceil(h)]}`:L[h];};
  const K=[['Mood',c=>c.mood],['Energy',c=>c.energy],['Calm',c=>5-c.stress],['Motivation',c=>c.motivation]];
  if(!K.some(k=>k[0]===_moodK))_moodK='Mind';
  if(ch)ch.innerHTML=[['Mind','All four'],...K.map(k=>[k[0],k[0]])].map(([k,n])=>`<button class="chip ${k===_moodK?'sel':''}" onclick="_moodK='${k}';renderMoodChart()">${n}</button>`).join('');
  const byDate={};cis.forEach(c=>byDate[c.date]=c);
  const extra=dt=>byDate[dt]?K.map(([n,fn])=>n+' '+f(fn(byDate[dt]))).join(' · '):'';
  const inView=info=>cis.filter(c=>c.date>=info.from&&c.date<=info.to);
  // a run of check-ins with two or more answers under Good
  const runNote=v=>{let run=0,best=0;v.forEach(c=>{run=K.filter(k=>k[1](c)<3).length>=2?run+1:0;best=Math.max(best,run);});
    return best>=3?` ${best} check-ins in a row had two or more answers under Good; look at sleep, training and stress around then.`:'';};
  if(_moodK==='Mind'){
    const zones=mindZones();
    mountChart('moodCanvas',{key:'mood',H:170,min:25,max:100,span:30,label:'Mind',yfmt:v=>String(Math.round(v)),zones,hi:true,extra,
      series:[{name:'Mind',color:'--text',fmt:v=>String(Math.round(v)),pts:cis.map(c=>({d:c.date,v:mindOf(c)}))}],
      stats:{good:v=>v>=TH.MIND_GOOD,label:'good'},
      means:info=>{
        const v=inView(info);if(!v.length)return'';
        const cnt=zones.map(z=>[z.label,v.filter(c=>chZone({zones},mindOf(c))===z).length]).filter(x=>x[1]);
        let t=`Of ${v.length} check-in${v.length>1?'s':''} here: `+cnt.map(([l,n])=>`${n} ${l.toLowerCase()}`).join(', ')+'.';
        const m=K.map(([n,fn])=>[n,avg(v.map(fn))]).sort((a,b)=>a[1]-b[1]),lo=m[0];
        t+=m[3][1]-lo[1]<0.3?` All four answers are close (${fa(avg(m.map(x=>x[1])))} on average).`:lo[1]>=2.75?` ${lo[0]} is the lowest of the four, still ${fa(lo[1])} on average.`:` ${lo[0]} pulls it down most (${fa(lo[1])} on average)`+(lo[0]==='Calm'?': stress is the one to work on.':'.');
        return t+runNote(v);},
      how:`One score from your four check-in answers (mood, energy, calm and motivation), from 25 when all four are Low to 100 when all four are Great. Good is ${TH.MIND_GOOD} and up, Flat ${TH.MIND_FLAT} to ${TH.MIND_GOOD-1}, Strained under ${TH.MIND_FLAT}. Tap a day to see the four answers; tap an answer above to see it on its own. Several strained days in a row often follow short sleep, heavy training or a stressful stretch.`});
  }else{
    const fn=K.find(k=>k[0]===_moodK)[1],nm=_moodK.toLowerCase();
    mountChart('moodCanvas',{key:'mood',H:170,min:1,max:4,span:30,label:_moodK,yfmt:f,extra,
      series:[{name:_moodK,color:'--text',fmt:f,pts:cis.map(c=>({d:c.date,v:fn(c)}))}],
      lines:[{v:3,color:'--t3'}],
      stats:{good:v=>v>=3,label:'Good or Great',words:['Best','Worst']},
      means:info=>{
        const v=inView(info);if(!v.length)return'';
        const lows=v.filter(c=>fn(c)<=1),under=v.filter(c=>fn(c)<3);
        let t=`Your ${nm} averaged ${fa(avg(v.map(fn)))} over ${v.length} check-in${v.length>1?'s':''}`+(under.length?`, under Good on ${under.length}`:', Good or better every time')+'.';
        if(lows.length)t+=` Low on ${lows.length} day${lows.length>1?'s':''}, the latest ${fmtD(last(lows).date)}.`;
        return t+(_moodK==='Calm'&&under.length*2>=v.length?' Calm is the opposite of stress, so stress is the one to work on.':'');},
      how:`Your ${nm} answer from each check-in, from Low to Great; higher is better${_moodK==='Calm'?' (calm is the opposite of stress)':''}. The dashed line marks Good. Tap All four for the combined score.`});
  }
}
function renderBodyChart(){
  const d=S(),host=$('bodyCanvas');if(!host)return;
  const cis=d.checkins.filter(c=>c.soreness!=null||c.coffee!=null).sort((a,b)=>a.date<b.date?-1:1);
  const note=$('bodyNote');
  if(cis.length<2){host.innerHTML='';note.textContent='Log soreness and coffee in your check-in for a few days to see them here.';return;}
  const SL=['None','Mild','Moderate','Severe'];
  const sore=cis.filter(c=>c.soreness!=null).map(c=>({d:c.date,v:c.soreness-1}));
  const cof=cis.filter(c=>c.coffee!=null).map(c=>({d:c.date,v:c.coffee}));
  const series=[];
  if(sore.length>1)series.push({name:'Soreness',type:'bar',color:'--red',fmt:v=>SL[Math.round(v)]||'',pts:sore,barColor:v=>v>=3?'--red':v>=2?'--red/.65':'--red/.35'});
  if(cof.length>1)series.push({name:'Coffee',color:'--text',thin:true,fmt:v=>Math.round(v)+(Math.round(v)>=4?'+':'')+' cups',pts:cof});
  mountChart('bodyCanvas',{key:'body',H:150,min:0,max:4,span:30,label:'Soreness and coffee',yfmt:v=>String(Math.round(v)),series,
    lines:cof.length>1?[{v:3,label:'3+ cups',color:'--amber'}]:[],
    means:info=>{
      const v=cis.filter(c=>c.date>=info.from&&c.date<=info.to);if(!v.length)return'';
      const s=v.filter(c=>c.soreness>=2),m=v.filter(c=>c.soreness>=3),cf=v.filter(c=>c.coffee!=null),hi=cf.filter(c=>c.coffee>=3),late=v.filter(c=>c.coffeeLate);
      let t=s.length?`Sore on ${s.length} of ${v.length} days`+(m.length?`, ${m.length} of them moderate or worse (latest ${fmtD(last(m).date)}).`:', all mild.'):`No soreness on any of ${v.length} days.`;
      if(cf.length)t+=` Coffee averaged ${(c=>c+(c===1?' cup':' cups'))(Math.round(avg(cf.map(c=>c.coffee))*10)/10)} a day`+(hi.length?`, with 3 or more on ${hi.length} day${hi.length>1?'s':''}`:'')+(late.length?` and a cup after 14:00 on ${late.length}`:'')+'.';
      return t;},
    how:'Bars are soreness from your check-in: light red mild, darker moderate, full red severe. The dark line is cups of coffee that day; the amber line marks 3 cups. Several days of moderate soreness in a row is worth logging as an injury. Heavy or late coffee tends to shorten the night after; the note below compares your own nights.'});
  // Coffee vs the following night's sleep, in words
  const slBy={};d.sleepLogs.forEach(s=>{if(s.durMin)slBy[s.date]=s.durMin;});
  const next=iso=>{const t=new Date(iso+'T12:00:00');t.setDate(t.getDate()+1);return t.toISOString().slice(0,10);};
  const hi=[],lo=[];
  cis.forEach(c=>{if(c.coffee==null)return;const m=slBy[next(c.date)];if(!m)return;(c.coffee>=3?hi:lo).push(m);});
  const am=a=>Math.round(a.reduce((x,y)=>x+y,0)/a.length);
  if(hi.length>=3&&lo.length>=3){
    const diff=am(lo)-am(hi);
    note.textContent=`After 3+ cups you slept ${fmtDur(am(hi))} on average, vs ${fmtDur(am(lo))} after lighter days`+(Math.abs(diff)>=20?` (${diff>0?'-':'+'}${fmtDur(Math.abs(diff))}).`:'. No clear difference yet.');
  }else note.textContent='Soreness 0 to 3 (none to severe) and coffee cups per day. Once there are a few nights after heavy-coffee days, the sleep difference shows here.';
}
function renderWeekBanner(){
  const d=S(),wk=d.workouts.filter(w=>daysAgo(w.date)<7).length;
  const sl=d.sleepLogs.filter(s=>s.score).slice(-7),avg=sl.length?Math.round(sl.reduce((a,s)=>a+s.score,0)/sl.length):0;
  const sc=heroScore(),mm=seriesFor(7,mindOn).reduce((a,x)=>a+x.v,0);
  $('weekStats').textContent=`${wk} workout${wk!==1?'s':''} · ${mm?fmtDur(mm)+' mindful':'no mindfulness yet'} · ${bodyLive()?'body':'readiness'} ${sc??'—'} · sleep ${avg?avg+'/100':'—'}`;
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
    const sl=d.sleepLogs.find(s=>s.date===date&&s.score),ci=d.checkins.find(c=>c.date===date),wk=d.workouts.find(w=>w.date===date);
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
  const d=S(),sl=d.sleepLogs.find(s=>s.date===date),ci=d.checkins.find(c=>c.date===date),ws=d.workouts.filter(w=>w.date===date);
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
    const ws=d.workouts.filter(w=>w.type===t&&w.distKm>0&&!wkEb(w));if(!ws.length)return;
    const b=ws.reduce((a,w)=>w.distKm>a.distKm?w:a);
    out.push([ICON[t],`Longest ${t==='Cycle'?'ride':t.toLowerCase()}`,b.date,fmtDist(b)]);
  });
  strBests().forEach(r=>out.push(r));
  const lw=d.workouts.filter(w=>w.durMin>0&&!w.sets);if(lw.length){const b=lw.reduce((a,w)=>w.durMin>a.durMin?w:a);out.push([UI.clock,'Longest session',b.date,fmtDur(b.durMin)]);}
  const bm=d.checkins.filter(c=>c.mindfulMin>0);if(bm.length){const b=bm.reduce((a,c)=>c.mindfulMin>a.mindfulMin?c:a);out.push([UI.lotus,'Longest mindfulness day',b.date,fmtDur(b.mindfulMin)]);}
  const bs=bestStreak();if(bs>1)out.push([UI.flame,'Best streak','',`${bs} days`]);
  $('prList').innerHTML=out.length?out.map(([i,t,dt,v])=>`<div class="act-item"><div class="act-icon past">${i}</div><div style="flex:1"><div class="act-name">${t}</div><div class="act-meta">${fmtD(dt)}</div></div><div class="best-v">${v}</div></div>`).join(''):`<div class="empty-state"><div class="empty-title">No records yet</div><div class="empty-sub">Log a few workouts and your personal bests show up here.</div><button class="empty-btn" onclick="logGo('lWorkout')">Log a workout</button></div>`;
}
function renderWeekSum(){
  const d=S(),tw=d.workouts.filter(w=>daysAgo(w.date)<7),lw=d.workouts.filter(w=>{const x=daysAgo(w.date);return x>=7&&x<14;});
  const dist=tw.reduce((a,w)=>a+(w.distKm||0),0),dur=tw.reduce((a,w)=>a+(w.durMin||0),0);
  const sl=d.sleepLogs.filter(s=>s.score).slice(-7),avg=sl.length?Math.round(sl.reduce((a,s)=>a+s.score,0)/sl.length):0;
  const delta=tw.length-lw.length,ds=delta>0?` ↑ +${delta} vs last week`:delta<0?` ↓ ${Math.abs(delta)} vs last week`:' = same as last week';
  const mm=seriesFor(7,mindOn).reduce((a,x)=>a+x.v,0);
  $('weekSum').innerHTML=`${tw.length} workout${tw.length!==1?'s':''} this week${ds}<br>${dur?fmtDur(dur)+' total':'0 min'} · ${dist.toFixed(1)} km<br>${tw.some(w=>w.sets)?'Strength sets: '+tw.reduce((n,w)=>n+(w.sets||[]).filter(isWork).length,0)+'<br>':''}Mindfulness: ${mm?fmtDur(mm):'—'}<br>Sleep avg: ${avg?avg+'/100':'—'}`;
}

