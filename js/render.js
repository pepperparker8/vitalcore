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
  return v.lvl==='bad'?[0,5]:v.lvl==='warn'?[6,11]:v.sc>=80?[13,17]:[10,14];
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
  renderBed();renderFactors();renderSleepStages();renderDays7();renderWeekLoad();const sc=calcReadiness();const n=daysLogged(30),bn=$('baseNote');if(bn){const b=!isExampleOnly()&&n<7;bn.style.display=b?'block':'none';bn.textContent=b?`Building your baseline: ${n} of 7 days logged. Scores and usual ranges get more personal after a week of data.`:'';}
  $('gRecSub').textContent=sc===null?'Check in':sc>=80?'Primed':sc>=65?'Good':sc>=50?'Moderate':'Low';
}
function readinessFactors(){
  const d=S(),goal=(d.profile.sleepGoal||7.5)*60,out=[];
  const sl=last(d.sleepLogs.filter(x=>x.durMin&&daysAgo(x.date)<=1));
  if(sl){const pc=Math.round(sl.durMin/goal*100);out.push({l:'Sleep',v:fmtDur(sl.durMin),n:pc+'% of goal',st:pc>=90?'good':pc>=75?'warn':'bad'});}
  else out.push({l:'Sleep',v:'Not logged',n:'Tap to log',st:'none',go:"logGo('lSleep')"});
  const tsb=d.intervalsData.tsb;
  if(tsb!==null&&tsb!==undefined)out.push({l:'Form',v:(tsb>0?'+':'')+Math.round(tsb),n:tsb>=5?'Fresh':tsb>=-10?'Balanced':tsb>=-25?'Tired':'Very tired',st:tsb>=-10?'good':tsb>=-25?'warn':'bad'});
  const ci=todayCI();
  if(ci&&ciFull(ci)){const p=Math.round((ci.energy+ci.mood+(5-ci.stress)+ci.motivation)/16*100);out.push({l:'Check-in',v:p>=70?'Good':p>=50?'Okay':'Low',n:p+'/100',st:p>=70?'good':p>=50?'warn':'bad'});}
  else out.push({l:'Check-in',v:'Not done',n:'Tap to check in',st:'none',go:"logGo('lCheckin')"});
  const hv=latestOf('hrv'),hb=wSeries('hrv');
  if(hv&&hb.length>=RB_MIN){const r=hv.v/avg(hb);out.push({l:'HRV',v:Math.round(hv.v)+' ms',n:'usual '+Math.round(avg(hb)),st:r>=0.97?'good':r>=0.9?'warn':'bad'});}
  else if(hv)out.push({l:'HRV',v:Math.round(hv.v)+' ms',n:'building baseline',st:'none'});
  const rv=latestOf('rhr'),rb=rhrSeries();
  if(rv&&rb.length>=RB_MIN){const df=rv.v-avg(rb);out.push({l:'Resting HR',v:Math.round(rv.v)+' bpm',n:'usual '+Math.round(avg(rb)),st:df<=2?'good':df<=5?'warn':'bad'});}
  const pv=latestOf('resp'),pb=wSeries('resp');
  if(pv&&pb.length>=RB_MIN){const df=pv.v-avg(pb);out.push({l:'Breathing',v:pv.v.toFixed(1)+' /min',n:'usual '+avg(pb).toFixed(1),st:df<=1?'good':df<=2?'warn':'bad'});}
  if(ci&&ci.soreness>=2)out.push({l:'Soreness',v:EM.soreness[ci.soreness],n:'-'+(ci.soreness-1)*4+' on recovery',st:ci.soreness>=3?'bad':'warn'});
  if(ci&&ci.coffeeLate)out.push({l:'Coffee',v:'Late cup',n:'after 14:00, may cut deep sleep',st:'warn'});
  const inj=d.injuries.filter(i=>i.active);
  if(inj.length){const m=Math.max(...inj.map(i=>i.sev));out.push({l:'Injury',v:inj.length===1?esc(inj[0].part):inj.length+' active',n:m>=3?'Severe':m===2?'Moderate':'Mild',st:m>=2?'bad':'warn'});}
  return out;
}
function renderFactors(){
  const el=$('rdFactors');if(!el)return;
  const f=readinessFactors();
  el.innerHTML='<div class="rf-h">What is driving recovery</div>'+f.map(x=>`<div class="rf ${x.st}"${x.go?` onclick="${x.go}" role="button"`:''}><span class="rf-dot"></span><span class="rf-l">${x.l}</span><span class="rf-v">${x.v}</span><span class="rf-n">${x.n}</span></div>`).join('');
}
function renderSleepStages(){
  const el=$('slStages');if(!el)return;
  const d=S(),sl=last(d.sleepLogs.filter(x=>x.durMin&&daysAgo(x.date)<=1));
  const deep=sl?((+sl.deepH||0)*60+(+sl.deepM||0)):0,rem=sl?((+sl.remH||0)*60+(+sl.remM||0)):0;
  // bedtime consistency: spread of bedtimes over the last 7 nights (minutes past 18:00, so midnight wraps)
  const beds=d.sleepLogs.filter(x=>x.bed&&daysAgo(x.date)<=7).map(x=>{const[h,m]=x.bed.split(':').map(Number);return((h*60+m)-1080+1440)%1440;});
  let cons='';
  if(beds.length>=3){const mu=avg(beds),sd=Math.sqrt(avg(beds.map(b=>(b-mu)**2)));
    cons=`<div class="ss-cons"><span>Bedtime consistency</span><b class="${sd<=30?'good':sd<=60?'warn':'bad'}">${sd<=30?'Steady':sd<=60?'Varies':'Irregular'}</b><small>within about ${fmtDur(Math.round(sd/5)*5||5)} over ${beds.length} nights</small></div>`;}
  if(!sl||(!deep&&!rem)){if(cons){el.style.display='';el.innerHTML=`<div class="ss-h"><span class="sec">Sleep</span></div>${cons}`;}else el.style.display='none';return;}
  const light=Math.max(0,sl.durMin-deep-rem),tot=sl.durMin;
  const pc=v=>Math.round(v/tot*100);
  const seg=(c,v)=>v?`<span class="ss-seg ${c}" style="width:${v/tot*100}%"></span>`:'';
  const leg=(c,l,v)=>`<div class="ss-leg"><span class="ss-dot ${c}"></span><span>${l}</span><b>${fmtDur(v)}</b><small>${pc(v)}%</small></div>`;
  el.style.display='';
  el.innerHTML=`<div class="ss-h"><span class="sec">Last night</span><span class="ss-tot">${fmtDur(tot)}</span></div><div class="ss-bar">${seg('deep',deep)}${seg('rem',rem)}${seg('light',light)}</div><div class="ss-legs">${leg('deep','Deep',deep)}${leg('rem','REM',rem)}${leg('light','Light',light)}</div><div class="ss-note">${deep/tot<0.13?'Deep sleep below the usual 13 to 23%. ':''}${rem/tot<0.2?'REM below the usual 20 to 25%. ':''}${deep/tot>=0.13&&rem/tot>=0.2?'Deep and REM in the usual ranges.':''}</div>${cons}`;
}
let _d7Sel=null;
function renderDays7(){
  const el=$('d7');if(!el)return;
  const d=S(),h=d.readHist||{},t=td();
  el.innerHTML=[6,5,4,3,2,1,0].map(i=>{const k=dAgo(i),v=i===0?calcReadiness():h[k],dt=new Date(k+'T00:00:00');
    const c=v==null?'var(--ring-trk)':v>=65?'var(--green)':v>=50?'var(--amber)':'var(--red)',off=v==null?81.7:81.7*(1-v/100);
    return`<button class="d7-d ${k===(_d7Sel||t)?'sel':''}" onclick="selDay7('${k}')" aria-label="${k}"><svg viewBox="0 0 30 30"><circle cx="15" cy="15" r="13" fill="none" stroke="var(--ring-trk)" stroke-width="3"/><circle cx="15" cy="15" r="13" fill="none" stroke="${c}" stroke-width="3" stroke-linecap="round" stroke-dasharray="81.7" stroke-dashoffset="${off}" transform="rotate(-90 15 15)"/></svg><span class="d7-v">${v==null?'–':v}</span><span class="d7-l">${i===0?'Today':['S','M','T','W','T','F','S'][dt.getDay()]}</span></button>`;}).join('');
  renderDay7Det();
}
function selDay7(k){_d7Sel=k===td()?null:k;renderDays7();}
function renderDay7Det(){
  const el=$('d7Det');if(!el)return;
  if(!_d7Sel){el.style.display='none';return;}
  const d=S(),k=_d7Sel,dt=new Date(k+'T00:00:00'),v=(d.readHist||{})[k];
  const sl=d.sleepLogs.find(x=>x.date===k&&x.durMin),ws=d.workouts.filter(w=>w.date===k),ci=d.checkins.find(c=>c.date===k);
  const parts=[v!=null?'Recovery '+v:'No recovery score',sl?'Sleep '+fmtDur(sl.durMin):'No sleep logged',ws.length?ws.map(w=>esc(w.type)+(w.durMin?' '+fmtDur(w.durMin):'')).join(', '):'No workout',ci&&ciFull(ci)?'Checked in':'No check-in'];
  el.style.display='';el.innerHTML=`<b>${dt.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'})}</b> · ${parts.join(' · ')}`;
}
function renderWeekLoad(){
  const el=$('wkLoad');if(!el||typeof raceLoad!=='function')return;
  const L=raceLoad(),now=Math.round(L.now);
  if(!L.base&&!now){el.style.display='none';return;}
  const r=typeof racePhase==='function'?racePhase():null,mult=r&&r.n>=0?r.mult:1;
  const dow=(new Date(td()+'T12:00:00').getDay()+6)%7,left=6-dow;
  let lo=null,hi=null;
  if(L.base){lo=Math.round(L.base*mult*0.8/5)*5;hi=Math.round(L.base*mult*1.2/5)*5;}
  const max=Math.max(now,hi||0,60)*1.1,pc=v=>Math.min(100,v/max*100);
  const st=hi==null?'':now>hi?'bad':now>=lo?'good':'none';
  const note=hi==null?'A target range appears after two weeks of logging.':
    now>hi?`Above your usual range. ${left?'Keep the rest of the week easy.':'A lighter week next.'}`:
    now>=lo?`In your usual range${left?` with ${left} day${left>1?'s':''} left`:''}.`:
    `${fmtDur(lo-now)} below the low end${left?`, ${left} day${left>1?'s':''} left`:''}.`;
  el.style.display='';
  el.innerHTML=`<div class="wl-h"><span class="sec">Training this week</span><span class="wl-now ${st}">${fmtDur(now)}</span></div>
  <div class="wl-bar">${hi!=null?`<span class="wl-band" style="left:${pc(lo)}%;width:${pc(hi)-pc(lo)}%"></span>`:''}<span class="wl-fill ${st}" style="width:${pc(now)}%"></span></div>
  <div class="wl-sub">${hi!=null?`Usual ${fmtDur(lo)} to ${fmtDur(hi)}${mult!==1?` (${r.k.toLowerCase()} phase)`:''}`:'Mon to Sun'}</div><div class="wl-note">${note}</div>`;
}
function sleepNeed(st){
  const d=S(),goal=(d.profile.sleepGoal||7.5)*60;
  const debt=[1,2,3].reduce((a,i)=>{const l=d.sleepLogs.filter(x=>x.durMin&&daysAgo(x.date)===i);return l.length?a+Math.max(0,goal-l[l.length-1].durMin):a;},0);
  return Math.round((goal+st/21*45+Math.min(45,debt/2))/5)*5;
}
const hhmm=m=>{m=((m%1440)+1440)%1440;return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');};
function setWake(v){if(!/^\d\d:\d\d$/.test(v))return;const d=S();d.profile.wakeTime=v;save(d);markProfile();renderBed();}
function renderBed(){
  const el=$('gBed');if(!el)return;
  const d=S(),wk=/^([01]\d|2[0-3]):[0-5]\d$/.test(d.profile.wakeTime||'')?d.profile.wakeTime:'06:30',[h,m]=wk.split(':').map(Number);
  const need=sleepNeed(strainOf(dayLoad(td())));
  el.innerHTML=`<div class="gb-t">Asleep by <b>${hhmm(h*60+m-need)}</b></div><label class="gb-s">${fmtDur(need)} · wake at <input type="time" value="${wk}" onchange="setWake(this.value)" aria-label="Wake time"></label>`;
}
function renderZone(score){
  let z,ins;
  if(score===null){z='Start with a check-in';ins='Tap how you feel below. Your readiness score appears once you check in or log sleep.';}
  else if(score>=80){z='Ready to push hard';ins='All systems green. Good day to train hard or race.';}
  else if(score>=65){z='Solid day ahead';ins='Good recovery. Normal training appropriate today.';}
  else if(score>=50){z='Moderate readiness';ins='Some fatigue. Keep intensity moderate today.';}
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
function renderStreak(){
  const n=calcStreak(),act=activeDays();
  $('streakNum').textContent=n;
  $('streakTxt').textContent=n===1?'day streak':'day streak';
  $('streakSub').textContent=n?(act.has(td())?'Today is done':'Check in today to keep it alive'):'Check in or meditate today to start one';
  const L=['S','M','T','W','T','F','S'];
  $('wkStrip').innerHTML=[6,5,4,3,2,1,0].map(i=>{const dt=new Date();dt.setDate(dt.getDate()-i);const k=ymd(dt);return`<div class="wk-d"><div class="wk-dot ${act.has(k)?'on':''} ${i===0?'now':''}">✓</div>${L[dt.getDay()]}</div>`;}).join('');
}
function barsHTML(vals,cls,max){
  const n=vals.length,tight=n>14;
  const bars=vals.map(v=>`<div class="bar-c"><div class="bar ${v.v?cls:''}" style="height:${v.v?Math.max(6,Math.round(v.v/max*100)):5}%"></div></div>`).join('');
  const L=['S','M','T','W','T','F','S'],wk=vals[0]?.wk;
  const lbl=vals.map((v,i)=>{const dt=new Date(v.date+'T12:00:00');return`<span>${wk?(i%2===0?dt.getDate():''):n<=7?L[dt.getDay()]:(i%7===0||i===n-1?dt.getDate():'')}</span>`;}).join('');
  return`<div class="bars ${tight?'tight':''}">${bars}</div><div class="bar-l ${tight?'tight':''}">${lbl}</div>`;
}
function seriesFor(n,fn){return Array.from({length:n},(_,i)=>{const date=dAgo(n-1-i);return{date,v:fn(date)};});}
const moodOn=date=>{const c=S().checkins.find(x=>x.date===date);return c?.mood||0;};
const mindOn=date=>S().checkins.find(x=>x.date===date)?.mindfulMin||0;
const fmtIcu=w=>{const r=wIcu(w),x={};['hr','hrMax','kcal','elev'].forEach(k=>x[k]=Math.round(+r[k])||0);const o=[];if(x.hr)o.push('avg '+x.hr+' bpm'+(x.hrMax?', max '+x.hrMax:''));if(x.kcal)o.push(x.kcal+' kcal');if(x.elev)o.push(x.elev+' m climb');return o.join(' · ');};
const fmtDist=w=>w.distKm?(w.type==='Swim'?Math.round(w.distKm*1000)+' m':w.distKm+' km'):'';
const trainOn=date=>S().workouts.filter(w=>w.date===date).reduce((a,w)=>a+(w.durMin||0),0);
function renderWeekTrends(){
  const mood=seriesFor(7,moodOn),mind=seriesFor(7,mindOn),train=seriesFor(7,trainOn);
  const mv=mood.filter(x=>x.v),avgM=mv.length?Math.round(mv.reduce((a,x)=>a+x.v,0)/mv.length):0;
  const tm=mind.reduce((a,x)=>a+x.v,0),tt=train.reduce((a,x)=>a+x.v,0),sessions=S().workouts.filter(w=>daysAgo(w.date)<7&&daysAgo(w.date)>=0).length;
  const row=(t,s,b)=>`<div style="margin-bottom:14px"><div class="tr-head"><div class="tr-title">${t}</div><div class="tr-sum">${s}</div></div>${b}</div>`;
  $('weekTrends').innerHTML=
    row('Mood',avgM?`avg ${EM.mood[avgM]}`:'no check-ins yet',barsHTML(mood,'mood',4))+
    row('Mindfulness',tm?fmtDur(tm)+' total':'none yet',barsHTML(mind,'mind',Math.max(15,...mind.map(x=>x.v))))+
    row('Training',tt||sessions?`${sessions} session${sessions!==1?'s':''} · ${fmtDur(tt)}`:'none yet',barsHTML(train,'train',Math.max(30,...train.map(x=>x.v))));
}
function renderTLoad(){
  const d=S(),{ctl,atl,tsb}=d.intervalsData;
  if(ctl===null){$('tloadContent').innerHTML=`<div class="empty-state"><div class="empty-icon">${UI.sat}</div><div class="empty-title">No training-load data yet</div><div class="empty-sub">Connect Intervals.icu in Settings to see your fitness, fatigue and freshness.</div><button class="empty-btn" onclick="openSettings()">Open Settings</button></div>`;}
  else{$('tloadContent').innerHTML=`<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px"><div class="sbar"><div class="sbar-lbl">FITNESS</div><div class="sbar-val" style="color:var(--teal)">${ctl}</div><div class="sbar-zone" style="color:var(--teal)">CTL</div></div><div class="sbar"><div class="sbar-lbl">FATIGUE</div><div class="sbar-val" style="color:var(--red)">${atl}</div><div class="sbar-zone" style="color:var(--amber)">${zL(atl,'atl')}</div></div><div class="sbar"><div class="sbar-lbl">FORM</div><div class="sbar-val" style="color:var(--green)">${tsb>0?'+':''}${tsb}</div><div class="sbar-zone" style="color:var(--green)">${zL(tsb,'tsb')}</div></div></div>`;}
  $('zATL').textContent=atl??'—';$('zATLd').textContent=atl!=null?`${atl} — ${zL(atl,'atl')} load.`:'Connect Intervals.icu to see fatigue.';
  $('zTSB').textContent=tsb!==null?(tsb>0?'+':'')+tsb:'—';$('zTSBd').textContent=tsb!==null?`${zL(tsb,'tsb')} — ${tsb>0?'Ready to perform.':'Carrying '+Math.abs(tsb)+' points of fatigue.'}`:'Connect Intervals.icu to see freshness.';
}
function renderActList(){
  const d=S(),t=td(),rows=[];
  for(let i=0;i<7;i++){
    const date=dAgo(i),isToday=i===0,ws=d.workouts.filter(w=>w.date===date);
    if(!ws.length)rows.push(`<div class="act-item"><div class="act-icon past" style="font-size:13px;color:var(--t3)">—</div><div><div class="act-name" style="color:var(--t3);font-weight:400">Nothing logged</div><div class="act-meta">${isToday?'Today':date}</div></div></div>`);
    else ws.forEach(w=>rows.push(wkRow(w)));
  }
  $('actList').innerHTML=dupHTML()+rows.join('');renderWkLog();
  const tm=trainOn(t),mm=mindOn(t),wl=d.wellness[t]||d.wellness[dAgo(1)];
  $('passActive').textContent=tm?fmtDur(tm):(d.workouts.some(w=>w.date===t)?'✓':'—');
  $('passMind').textContent=mm?fmtDur(mm):'—';
  $('passSteps').textContent=wl?.steps?wl.steps.toLocaleString():'—';
  $('passStepsSrc').textContent=wl?.steps?'Intervals.icu':'connect Intervals.icu';
}

// ── RENDER: WELLBEING ────────────────────────────────────────────────────────
let _range=7;
function setRange(n){_range=n;[7,30,90].forEach(x=>$('rng'+x).classList.toggle('active',n===x));renderTrendsTab();}
function bucket(ser){
  if(ser.length<=30)return ser;
  const out=[];
  for(let e=ser.length;e>0;e-=7){const ch=ser.slice(Math.max(0,e-7),e);out.unshift({date:ch[0].date,v:ch.reduce((a,x)=>a+x.v,0),wk:true});}
  return out;
}
function renderTrends(){
  renderMoodChart();renderBodyChart();
  const mr=seriesFor(_range,mindOn),tr=seriesFor(_range,trainOn),mind=bucket(mr),train=bucket(tr),k=mind[0].wk?7:1;
  const tm=mr.reduce((a,x)=>a+x.v,0),tt=tr.reduce((a,x)=>a+x.v,0),days=mr.filter(x=>x.v).length,tdays=tr.filter(x=>x.v).length;
  $('mindSum').textContent=tm?`${fmtDur(tm)} · ${days} day${days!==1?'s':''}`:'none logged';
  $('mindBars').innerHTML=barsHTML(mind,'mind',Math.max(15*k,...mind.map(x=>x.v)));
  $('trainSum').textContent=tt?`${fmtDur(tt)} · ${tdays} day${tdays!==1?'s':''}`:'none logged';
  $('trainBars').innerHTML=barsHTML(train,'train',Math.max(30*k,...train.map(x=>x.v)));
}
function renderSleepBars(){
  const d=S(),L=['S','M','T','W','T','F','S'];let html='';
  for(let i=6;i>=0;i--){
    const date=dAgo(i),dt=new Date(date+'T12:00:00');
    const sl=d.sleepLogs.find(s=>s.date===date),score=slScore(sl),h=score?Math.round(score*0.56):4;
    const col=score>=80?'var(--teal)':score>=65?'rgba(13,122,107,0.5)':'var(--bdr)';
    html+=`<div class="sb-wrap" onclick="tapSB(this)"><div class="sb-tip">${L[dt.getDay()]} · ${sl?.score?sl.score+'/100':sl?.durMin?fmtDur(sl.durMin):'no data'}</div><div class="sb-bar" style="height:${h}px;background:${col}"></div><div class="sb-lbl">${L[dt.getDay()]}</div></div>`;
  }
  $('sleepBars').innerHTML=html;
  const goal=Math.round((d.profile.sleepGoal||7.5)*60),wk=d.sleepLogs.filter(s=>s.durMin&&daysAgo(s.date)<7);
  $('sleepDebt').textContent=wk.length?(()=>{const avg=Math.round(wk.reduce((a,s)=>a+s.durMin,0)/wk.length),debt=wk.reduce((a,s)=>a+(goal-s.durMin),0);return`Average ${fmtDur(avg)} over ${wk.length} night${wk.length>1?'s':''} (goal ${fmtDur(goal)}). `+(debt>0?`Sleep debt: ${fmtDur(debt)}.`:`Ahead of goal by ${fmtDur(-debt)}.`);})():'Add time asleep to see your sleep debt against your goal.';
  const l=last(d.sleepLogs);
  if(l)setStages(l.deepH||0,l.deepM||0,l.remH||0,l.remM||0);
  const t=d.sleepLogs.find(s=>s.date===td());$('sleepStat').textContent=t?'Logged today':'Not logged today';
}
function tapSB(el){document.querySelectorAll('.sb-wrap').forEach(b=>b!==el&&b.classList.remove('tapped'));el.classList.toggle('tapped');}
function hrSeries(){
  const d=S(),m={};
  Object.entries(d.wellness).forEach(([k,w])=>{if(w.rhr)m[k]=w.rhr;});
  d.measurements.forEach(x=>{if(x.hr)m[x.date]=x.hr;});
  return Object.entries(m).sort((a,b)=>a[0]<b[0]?-1:1).map(([date,hr])=>({date,hr})).slice(-7);
}
function renderHRVSpark(){
  const d=S(),hrs=hrSeries();
  if(!hrs.length){$('zHRV').textContent='—';$('hrvSpark').innerHTML='';return;}
  const l=last(hrs);$('zHRV').textContent=l.hr;
  const goal=d.profile.hrGoal||55,trend=hrs.length>=3?(l.hr-hrs[hrs.length-3].hr):0;
  $('zHRVd').textContent=`${l.hr} bpm — ${l.hr<=goal?'At or below goal. Good recovery.':l.hr<=goal+5?'Slightly elevated. Watch closely.':'Elevated. Consider a rest day.'}${trend>2?' Trending up (possible fatigue/illness).':trend<-2?' Trending down (recovery improving).':''}`;
  const mx=Math.max(...hrs.map(m=>m.hr)),mn=Math.min(...hrs.map(m=>m.hr));
  $('hrvSpark').innerHTML=hrs.map(m=>{const h=Math.round((m.hr-mn)/(mx-mn+1)*28+4);const col=m.hr<=goal?'var(--teal)':m.hr<=goal+5?'var(--amber)':'var(--red)';return`<div class="hrv-bar" style="height:${h}px;background:${col};opacity:0.7"></div>`;}).join('');
}
function sizeCanvas(c,H){
  const W=c.parentElement.clientWidth-32||300,r=window.devicePixelRatio||1;
  c.width=W*r;c.height=H*r;c.style.width=W+'px';c.style.height=H+'px';
  const ctx=c.getContext('2d');ctx.scale(r,r);ctx.clearRect(0,0,W,H);return{ctx,W};
}
function renderWtChart(){
  const d=S(),host=$('wtCanvas');if(!host)return;
  const all=d.measurements.filter(m=>m.weight).sort((a,b)=>a.date<b.date?-1:1),goal=d.profile.wtGoal||null,gl=$('wtGoalLine');
  if(all.length<2){host.innerHTML='';gl.textContent=all.length?`Current: ${all[0].weight} kg — log again to see a trend`:'Log your weight in the Log tab to see a trend';return;}
  const f1=v=>(Math.round(v*10)/10)+' kg';
  mountChart('wtCanvas',{key:'wt',H:170,span:120,wide:true,yfmt:v=>Math.round(v*10)/10,ref:goal?[{v:goal,label:'Goal '+goal}]:[],series:[{pts:all.map(m=>({d:m.date,v:m.weight})),color:'--teal',name:'Weight',fmt:f1}]});
  const l=all[all.length-1].weight;
  gl.textContent=`Current: ${l.toFixed(1)} kg`+(goal?` · Goal: ${goal} kg · ${Math.abs(l-goal)<0.5?'At goal':Math.abs(l-goal).toFixed(1)+' kg to go'}`:'');
}
function calcBurnout(){
  const d=S(),cis=d.checkins.filter(ciFull).slice(-7);
  if(!cis.length)return{score:0,label:'No data',sub:'Do a few check-ins and this fills in.',psy:0,phys:0};
  const avgS=cis.reduce((a,c)=>a+(5-c.stress),0)/cis.length,avgE=cis.reduce((a,c)=>a+c.energy,0)/cis.length,avgM=cis.reduce((a,c)=>a+c.mood,0)/cis.length;
  const psy=Math.round((avgS+avgE+avgM)/(4*3)*100);
  const{atl,tsb}=d.intervalsData;
  // both halves are "how well you are coping" (100 = fine); physical comes from form: 0 = 100, -40 or lower = 0
  const phys=tsb==null?null:Math.round(Math.max(0,Math.min(100,100+tsb*2.5)));
  const score=Math.max(0,Math.min(100,Math.round(100-(phys==null?psy:psy*0.6+phys*0.4))));
  return{score,label:score<30?'Low risk':score<60?'Moderate risk':'High risk',sub:score<30?'Physiological and psychological markers stable.':score<60?'Some stress signals. Monitor energy and sleep.':'Elevated stress and fatigue. Reduce training load.',psy,phys};
}
function renderBurnout(){
  const b=calcBurnout();
  $('boScore').textContent=b.score;$('boLabel').textContent=b.label;$('boSub').textContent=b.sub;
  $('boBreak').textContent=b.psy||b.phys?`Mind ${b.psy} of 100 · Body ${b.phys==null?'no data':b.phys+' of 100'} (higher is better)`:'';
}
function renderMoodChart(){
  const d=S(),host=$('moodCanvas');if(!host)return;
  const cis=d.checkins.filter(ciFull).sort((a,b)=>a.date<b.date?-1:1);
  $('moodNote').textContent=cis.length?'Higher is better for every line. Calm is the opposite of stress.':'Your trends appear after your first check-in on the Today tab.';
  if(cis.length<2){host.innerHTML='';return;}
  const L=['','Low','Fair','Good','Great'],f=v=>L[Math.round(v)]||'';
  const mk=(name,color,fn)=>({name,color,fmt:f,pts:cis.map(c=>({d:c.date,v:fn(c)}))});
  mountChart('moodCanvas',{key:'mood',H:170,min:1,max:4,span:30,yfmt:f,series:[mk('Mood','--green',c=>c.mood),mk('Energy','--amber',c=>c.energy),mk('Calm','--t2',c=>5-c.stress),mk('Motivation','--text',c=>c.motivation)]});
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
  if(sore.length>1)series.push({name:'Soreness',color:'--red',fmt:v=>SL[Math.round(v)]||'',pts:sore});
  if(cof.length>1)series.push({name:'Coffee',color:'--amber',fmt:v=>Math.round(v)+(Math.round(v)>=4?'+':'')+' cups',pts:cof});
  mountChart('bodyCanvas',{key:'body',H:150,min:0,max:4,span:30,yfmt:v=>String(Math.round(v)),series});
  // Coffee vs the following night's sleep, in words
  const slBy={};d.sleepLogs.forEach(s=>{if(s.durMin)slBy[s.date]=s.durMin;});
  const next=iso=>{const t=new Date(iso+'T12:00:00');t.setDate(t.getDate()+1);return t.toISOString().slice(0,10);};
  const hi=[],lo=[];
  cis.forEach(c=>{if(c.coffee==null)return;const m=slBy[next(c.date)];if(!m)return;(c.coffee>=3?hi:lo).push(m);});
  const avg=a=>Math.round(a.reduce((x,y)=>x+y,0)/a.length);
  if(hi.length>=3&&lo.length>=3){
    const diff=avg(lo)-avg(hi);
    note.textContent=`After 3+ cups you slept ${fmtDur(avg(hi))} on average, vs ${fmtDur(avg(lo))} after lighter days`+(Math.abs(diff)>=20?` (${diff>0?'-':'+'}${fmtDur(Math.abs(diff))}).`:'. No clear difference yet.');
  }else note.textContent='Soreness 0 to 3 (none to severe) and coffee cups per day. Once there are a few nights after heavy-coffee days, the sleep difference shows here.';
}
function renderWeekBanner(){
  const d=S(),wk=d.workouts.filter(w=>daysAgo(w.date)<7).length;
  const sl=d.sleepLogs.filter(s=>s.score).slice(-7),avg=sl.length?Math.round(sl.reduce((a,s)=>a+s.score,0)/sl.length):0;
  const sc=calcReadiness(),mm=seriesFor(7,mindOn).reduce((a,x)=>a+x.v,0);
  $('weekStats').textContent=`${wk} workout${wk!==1?'s':''} · ${mm?fmtDur(mm)+' mindful':'no mindfulness yet'} · readiness ${sc??'—'} · sleep ${avg?avg+'/100':'—'}`;
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
  ws.forEach(w=>{html+=row(esc(w.type),`${w.sets?'':(w.durMin?fmtDur(w.durMin):'')}${w.distKm?' · '+fmtDist(w):''}<button class="day-del" onclick="editWorkout('${w.id}')">Edit</button><button class="day-del" onclick="delWorkout('${w.id}')">Delete</button>`);if(fmtIcu(w))html+=row('<i>Details</i>',`<span style="font-size:11px;opacity:.8;text-align:right;max-width:220px;display:inline-block">${fmtIcu(w)}</span>`);if(w.sets)html+=row('<i>Sets</i>',`<span style="font-size:11px;opacity:.8;text-align:right;max-width:220px;display:inline-block">${esc(setsText(w))}</span>`);if(w.notes)html+=row('<i>Note</i>',`<span style="font-size:11px;opacity:.7">${esc(w.notes)}</span>`);});
  if(!html)html='<div style="color:rgba(255,255,255,0.4);font-size:13px;padding:8px 0">Nothing logged for this day.</div>';
  $('dayPB').innerHTML=html;
  const p=$('dayPanel');p.classList.add('open');setTimeout(()=>p.scrollIntoView({behavior:'smooth',block:'nearest'}),100);
}
function closeDayPanel(){$('dayPanel').classList.remove('open');}
function renderBests(){
  const d=S(),out=[];
  ['Run','Cycle','Swim','Hike'].forEach(t=>{
    const ws=d.workouts.filter(w=>w.type===t&&w.distKm>0);if(!ws.length)return;
    const b=ws.reduce((a,w)=>w.distKm>a.distKm?w:a);
    out.push([ICON[t],`Longest ${t==='Cycle'?'ride':t.toLowerCase()}`,b.date,fmtDist(b)]);
  });
  strBests().forEach(r=>out.push(r));
  const lw=d.workouts.filter(w=>w.durMin>0&&!w.sets);if(lw.length){const b=lw.reduce((a,w)=>w.durMin>a.durMin?w:a);out.push(['⏱','Longest session',b.date,fmtDur(b.durMin)]);}
  const bm=d.checkins.filter(c=>c.mindfulMin>0);if(bm.length){const b=bm.reduce((a,c)=>c.mindfulMin>a.mindfulMin?c:a);out.push([UI.lotus,'Longest mindfulness day',b.date,fmtDur(b.mindfulMin)]);}
  const bs=bestStreak();if(bs>1)out.push([UI.flame,'Best streak','',`${bs} days`]);
  $('prList').innerHTML=out.length?out.map(([i,t,dt,v])=>`<div class="act-item"><div class="act-icon past">${i}</div><div style="flex:1"><div class="act-name">${t}</div><div class="act-meta">${dt}</div></div><div class="best-v">${v}</div></div>`).join(''):`<div class="empty-state"><div class="empty-title">No records yet</div><div class="empty-sub">Log a few workouts and your personal bests show up here.</div><button class="empty-btn" onclick="logGo('lWorkout')">Log a workout</button></div>`;
}
function renderWeekSum(){
  const d=S(),tw=d.workouts.filter(w=>daysAgo(w.date)<7),lw=d.workouts.filter(w=>{const x=daysAgo(w.date);return x>=7&&x<14;});
  const dist=tw.reduce((a,w)=>a+(w.distKm||0),0),dur=tw.reduce((a,w)=>a+(w.durMin||0),0);
  const sl=d.sleepLogs.filter(s=>s.score).slice(-7),avg=sl.length?Math.round(sl.reduce((a,s)=>a+s.score,0)/sl.length):0;
  const delta=tw.length-lw.length,ds=delta>0?` ↑ +${delta} vs last week`:delta<0?` ↓ ${Math.abs(delta)} vs last week`:' = same as last week';
  const mm=seriesFor(7,mindOn).reduce((a,x)=>a+x.v,0);
  $('weekSum').innerHTML=`${tw.length} workout${tw.length!==1?'s':''} this week${ds}<br>${dur?fmtDur(dur)+' total':'0 min'} · ${dist.toFixed(1)} km<br>${tw.some(w=>w.sets)?'Strength sets: '+tw.reduce((n,w)=>n+(w.sets||[]).filter(isWork).length,0)+'<br>':''}Mindfulness: ${mm?fmtDur(mm):'—'}<br>Sleep avg: ${avg?avg+'/100':'—'}`;
}

