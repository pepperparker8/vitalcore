// ── RENDER: TODAY ────────────────────────────────────────────────────────────
function renderGreeting(){
  const hr=new Date().getHours(),name=S().profile.name;
  const g=hr<12?'Good morning':hr<17?'Good afternoon':'Good evening';
  const em=hr<12?'☀️':hr<17?'🌤':'🌙';
  $('heroGreeting').textContent=`${g}${name?', '+name:''} ${em}`;
}
function renderRing(score){
  const C=326.7,fill=$('ringFill'),el=$('ringNum');
  clearInterval(renderRing.t);
  if(score===null){fill.style.strokeDashoffset=C;el.textContent='—';return;}
  fill.style.strokeDashoffset=C*(1-Math.min(score,100)/100);
  let cur=+el.textContent||0;const step=(score-cur)/20;
  renderRing.t=setInterval(()=>{cur+=step;if((step>=0&&cur>=score)||(step<0&&cur<=score)||!step){cur=score;clearInterval(renderRing.t);}el.textContent=Math.round(cur);},16);
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
  const sl=last(d.sleepLogs.filter(s=>s.score)),ci=last(d.checkins.filter(ciFull)),tsb=d.intervalsData.tsb;
  if(!sl&&!ci&&tsb===null)return null;
  let s=70;
  if(sl)s=sl.score*0.5+35;
  if(tsb!==null)s=Math.max(30,Math.min(100,s+(tsb>0?tsb*0.5:-tsb*0.3)));
  if(ci){const psy=(ci.energy+ci.mood+(5-ci.stress)+ci.motivation)/16*100;s=s*0.7+psy*0.3;}
  const inj=d.injuries.filter(i=>i.active);
  if(inj.length){const m=Math.max(...inj.map(i=>i.sev));s=Math.max(20,s-m*8);}
  return Math.round(Math.min(100,Math.max(20,s)));
}
function renderHabits(){
  const d=S(),t=td(),ci=todayCI();
  const items=[
    ['💭','CHECK-IN',ciFull(ci),'go(\'ciCard\')'],
    ['🧘','MINDFUL',(ci?.mindfulMin||0)>0,'go(\'mindCard\')',ci?.mindfulMin?ci.mindfulMin+'m':''],
    ['🏃','MOVE',d.workouts.some(w=>w.date===t),'go(\'qwCard\')'],
    ['🌙','SLEEP',d.sleepLogs.some(s=>s.date===t),'switchTab(\'log\');openLog(\'lSleep\')']
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
  $('streakSub').textContent=n?(act.has(td())?'Nice — today is done':'Check in today to keep it alive'):'Check in or meditate today to start one';
  const L=['S','M','T','W','T','F','S'];
  $('wkStrip').innerHTML=[6,5,4,3,2,1,0].map(i=>{const dt=new Date();dt.setDate(dt.getDate()-i);const k=ymd(dt);return`<div class="wk-d"><div class="wk-dot ${act.has(k)?'on':''} ${i===0?'now':''}">✓</div>${L[dt.getDay()]}</div>`;}).join('');
}
function barsHTML(vals,cls,max){
  const n=vals.length,tight=n>14;
  const bars=vals.map(v=>`<div class="bar-c"><div class="bar ${v.v?cls:''}" style="height:${v.v?Math.max(6,Math.round(v.v/max*100)):5}%"></div></div>`).join('');
  const L=['S','M','T','W','T','F','S'];
  const lbl=vals.map((v,i)=>{const dt=new Date(v.date+'T12:00:00');return`<span>${n<=7?L[dt.getDay()]:(i%7===0||i===n-1?dt.getDate():'')}</span>`;}).join('');
  return`<div class="bars ${tight?'tight':''}">${bars}</div><div class="bar-l ${tight?'tight':''}">${lbl}</div>`;
}
function seriesFor(n,fn){return Array.from({length:n},(_,i)=>{const date=dAgo(n-1-i);return{date,v:fn(date)};});}
const moodOn=date=>{const c=S().checkins.find(x=>x.date===date);return c?.mood||0;};
const mindOn=date=>S().checkins.find(x=>x.date===date)?.mindfulMin||0;
const fmtDist=w=>w.distKm?(w.type==='Swim'?Math.round(w.distKm*1000)+' m':w.distKm+' km'):'';
const wkDetail=w=>w.sets?setsText(w):'';
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
  if(ctl===null){$('tloadContent').innerHTML=`<div class="empty-state"><div class="empty-icon">📡</div><div class="empty-title">No training-load data yet</div><div class="empty-sub">Connect Intervals.icu in Settings to see your fitness, fatigue and freshness.</div><button class="empty-btn" onclick="openSettings()">Open Settings</button></div>`;}
  else{$('tloadContent').innerHTML=`<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px"><div class="sbar"><div class="sbar-lbl">FITNESS</div><div class="sbar-val" style="color:var(--teal)">${ctl}</div><div class="sbar-zone" style="color:var(--teal)">CTL</div></div><div class="sbar"><div class="sbar-lbl">FATIGUE</div><div class="sbar-val" style="color:var(--red)">${atl}</div><div class="sbar-zone" style="color:var(--amber)">${zL(atl,'atl')}</div></div><div class="sbar"><div class="sbar-lbl">FORM</div><div class="sbar-val" style="color:var(--green)">${tsb>0?'+':''}${tsb}</div><div class="sbar-zone" style="color:var(--green)">${zL(tsb,'tsb')}</div></div></div>`;}
  $('sbLoad').textContent=ctl??'—';$('sbLoadZ').textContent=ctl?zL(ctl,'atl'):'—';$('sbLoadP').style.width=ctl?Math.min(100,ctl)+'%':'0';
  const sl=last(d.sleepLogs.filter(s=>s.score));
  $('sbSleep').textContent=sl?.score??'—';$('sbSleepZ').textContent=sl?zL(sl.score,'sleep'):'—';$('sbSleepP').style.width=sl?sl.score+'%':'0';
  const fp=tsb!==null?Math.min(100,Math.max(0,(tsb+20)/40*100)):0;
  $('sbFresh').textContent=tsb!==null?(tsb>0?'+':'')+tsb:'—';$('sbFreshZ').textContent=tsb!==null?zL(tsb,'tsb'):'—';$('sbFreshP').style.width=fp+'%';
  $('zATL').textContent=atl??'—';$('zATLd').textContent=atl!=null?`${atl} — ${zL(atl,'atl')} load.`:'Connect Intervals.icu to see fatigue.';
  $('zTSB').textContent=tsb!==null?(tsb>0?'+':'')+tsb:'—';$('zTSBd').textContent=tsb!==null?`${zL(tsb,'tsb')} — ${tsb>0?'Ready to perform.':'Carrying '+Math.abs(tsb)+' points of fatigue.'}`:'Connect Intervals.icu to see freshness.';
}
function renderActList(){
  const d=S(),t=td(),rows=[];
  for(let i=0;i<7;i++){
    const date=dAgo(i),isToday=i===0,ws=d.workouts.filter(w=>w.date===date);
    if(!ws.length)rows.push(`<div class="act-item"><div class="act-icon past" style="font-size:13px;color:var(--t3)">—</div><div><div class="act-name" style="color:var(--t3);font-weight:400">Nothing logged</div><div class="act-meta">${isToday?'Today':date}</div></div></div>`);
    else ws.forEach(w=>rows.push(`<div class="act-item"><div class="act-icon ${isToday?'today':'past'}">${ICON[w.type]||'⚡'}</div><div style="flex:1"><div class="act-name">${esc(w.type)}</div><div class="act-meta">${isToday?'Today':date}${w.sets?'':(w.durMin?' · '+fmtDur(w.durMin):'')}${w.distKm?' · '+fmtDist(w):''}${w.sets?(n=>' · '+n+' set'+(n===1?'':'s'))(setsByEx(w).reduce((n,e)=>n+e[1].length,0)):''} · effort ${w.rpe||3}/5</div>${w.sets?`<div class="act-notes">${esc(setsText(w))}</div>`:''}${w.notes?`<div class="act-notes">${esc(w.notes)}</div>`:''}</div></div>`));
  }
  $('actList').innerHTML=rows.join('');
  const tm=trainOn(t),mm=mindOn(t),wl=d.wellness[t]||d.wellness[dAgo(1)];
  $('passActive').textContent=tm?fmtDur(tm):(d.workouts.some(w=>w.date===t)?'✓':'—');
  $('passMind').textContent=mm?fmtDur(mm):'—';
  $('passSteps').textContent=wl?.steps?wl.steps.toLocaleString():'—';
  $('passStepsSrc').textContent=wl?.steps?'Intervals.icu':'connect Intervals.icu';
}

// ── RENDER: WELLBEING ────────────────────────────────────────────────────────
let _range=7;
function setRange(n){_range=n;$('rng7').classList.toggle('active',n===7);$('rng30').classList.toggle('active',n===30);renderTrends();}
function renderTrends(){
  renderMoodChart();
  const mind=seriesFor(_range,mindOn),train=seriesFor(_range,trainOn);
  const tm=mind.reduce((a,x)=>a+x.v,0),tt=train.reduce((a,x)=>a+x.v,0),days=mind.filter(x=>x.v).length;
  $('mindSum').textContent=tm?`${fmtDur(tm)} · ${days} day${days!==1?'s':''}`:'none logged';
  $('mindBars').innerHTML=barsHTML(mind,'mind',Math.max(15,...mind.map(x=>x.v)));
  const tdays=train.filter(x=>x.v).length;
  $('trainSum').textContent=tt?`${fmtDur(tt)} · ${tdays} day${tdays!==1?'s':''}`:'none logged';
  $('trainBars').innerHTML=barsHTML(train,'train',Math.max(30,...train.map(x=>x.v)));
}
function renderSleepBars(){
  const d=S(),L=['S','M','T','W','T','F','S'];let html='';
  for(let i=6;i>=0;i--){
    const date=dAgo(i),dt=new Date(date+'T12:00:00');
    const sl=d.sleepLogs.find(s=>s.date===date),score=sl?.score||0,h=score?Math.round(score*0.56):4;
    const col=score>=80?'var(--teal)':score>=65?'rgba(13,122,107,0.5)':'var(--bdr)';
    html+=`<div class="sb-wrap" onclick="tapSB(this)"><div class="sb-tip">${L[dt.getDay()]} · ${score?score+'/100':'no data'}</div><div class="sb-bar" style="height:${h}px;background:${col}"></div><div class="sb-lbl">${L[dt.getDay()]}</div></div>`;
  }
  $('sleepBars').innerHTML=html;
  const l=last(d.sleepLogs);
  if(l)setStages(l.deepH||0,l.deepM||0,l.remH||0,l.remM||0);
  const t=d.sleepLogs.find(s=>s.date===td());$('sleepStat').textContent=t?'✓ Logged today':'Not logged today';
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
  const d=S(),c=$('wtCanvas');if(!c)return;
  const pts=d.measurements.filter(m=>m.weight).slice(-30),goal=d.profile.wtGoal||72,gl=$('wtGoalLine');
  const{ctx,W}=sizeCanvas(c,80),H=80;
  if(pts.length<2){gl.textContent=pts.length?`Current: ${pts[0].weight} kg — log again to see a trend`:'Log your weight in the Log tab to see a trend';return;}
  const vals=pts.map(m=>m.weight),minV=Math.min(...vals,goal)-0.5,maxV=Math.max(...vals,goal)+0.5;
  const xs=(W-20)/(pts.length-1),ys=(H-12)/(maxV-minV),Y=v=>H-6-(v-minV)*ys;
  ctx.beginPath();ctx.strokeStyle='rgba(201,168,76,0.4)';ctx.lineWidth=1;ctx.setLineDash([4,4]);ctx.moveTo(10,Y(goal));ctx.lineTo(W-10,Y(goal));ctx.stroke();ctx.setLineDash([]);
  ctx.beginPath();ctx.strokeStyle='#0D7A6B';ctx.lineWidth=1.5;ctx.lineJoin='round';
  pts.forEach((m,i)=>{const x=i*xs+10,y=Y(m.weight);i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.stroke();
  pts.forEach((m,i)=>{ctx.beginPath();ctx.arc(i*xs+10,Y(m.weight),2,0,Math.PI*2);ctx.fillStyle=m.weight<=goal?'#0D7A6B':'#B8740A';ctx.fill();});
  const l=vals[vals.length-1];
  gl.textContent=`Current: ${l.toFixed(1)} kg · Goal: ${goal} kg · ${l<=goal?'✓ At goal':(l-goal).toFixed(1)+' kg to go'}`;
}
function calcBurnout(){
  const d=S(),cis=d.checkins.filter(ciFull).slice(-7);
  if(!cis.length)return{score:0,label:'No data',sub:'Do a few check-ins and this fills in.',psy:0,phys:0};
  const avgS=cis.reduce((a,c)=>a+(5-c.stress),0)/cis.length,avgE=cis.reduce((a,c)=>a+c.energy,0)/cis.length,avgM=cis.reduce((a,c)=>a+c.mood,0)/cis.length;
  const psy=Math.round((avgS+avgE+avgM)/(4*3)*100);
  const{atl,tsb}=d.intervalsData;
  const phys=Math.round(atl?Math.min(100,atl)/100*40+(tsb<-15?30:0):20);
  const score=Math.max(0,Math.min(100,Math.round(100-psy*0.6-phys*0.4)));
  return{score,label:score<30?'Low risk':score<60?'Moderate risk':'High risk',sub:score<30?'Physiological and psychological markers stable.':score<60?'Some stress signals. Monitor energy and sleep.':'Elevated stress and fatigue. Reduce training load.',psy,phys};
}
function renderBurnout(){
  const b=calcBurnout();
  $('boScore').textContent=b.score;$('boLabel').textContent=b.label;$('boSub').textContent=b.sub;
  $('boBreak').textContent=b.psy||b.phys?`Psychological: ${b.psy} · Physical: ${b.phys}`:'';
}
function renderMoodChart(){
  const d=S(),c=$('moodCanvas');if(!c)return;
  const{ctx,W}=sizeCanvas(c,110),H=110,n=_range;
  const days=Array.from({length:n},(_,i)=>dAgo(n-1-i));
  const pts=days.map(x=>d.checkins.find(c=>c.date===x&&ciFull(c)));
  $('moodNote').textContent=pts.some(Boolean)?'Higher is better for every line. Calm is the opposite of stress.':'Your trends appear after your first check-in on the Today tab.';
  // gridlines
  ctx.strokeStyle='rgba(0,0,0,0.06)';ctx.lineWidth=1;
  for(let g=0;g<4;g++){const y=8+g*(H-24)/3;ctx.beginPath();ctx.moveTo(6,y);ctx.lineTo(W-6,y);ctx.stroke();}
  const X=i=>6+(n===1?0:i*(W-12)/(n-1)),Y=v=>8+(4-v)/3*(H-24);
  [{k:'motivation',col:'#2A2A2A'},{k:'energy',col:'#B8740A'},{k:'calm',col:'#5A5550'},{k:'mood',col:'#1A6B3A'}].forEach(({k,col})=>{
    const val=c=>k==='calm'?5-c.stress:c[k];
    ctx.strokeStyle=col;ctx.fillStyle=col;ctx.lineWidth=k==='mood'?2.5:1.5;ctx.lineJoin='round';
    ctx.beginPath();let pen=false;
    pts.forEach((c,i)=>{if(!c){return;}const x=X(i),y=Y(val(c));pen?ctx.lineTo(x,y):ctx.moveTo(x,y);pen=true;});ctx.stroke();
    pts.forEach((c,i)=>{if(!c)return;ctx.beginPath();ctx.arc(X(i),Y(val(c)),k==='mood'?3:2,0,Math.PI*2);ctx.fill();});
  });
  ctx.fillStyle='#9A9690';ctx.font='9px IBM Plex Mono, monospace';
  ctx.textAlign='left';ctx.fillText(days[0].slice(5),6,H-4);ctx.textAlign='right';ctx.fillText('today',W-6,H-4);
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
function calPrev(){_calDate.setMonth(_calDate.getMonth()-1);renderCalendar();}
function calNext(){_calDate.setMonth(_calDate.getMonth()+1);renderCalendar();}
function openDay(date){
  const d=S(),sl=d.sleepLogs.find(s=>s.date===date),ci=d.checkins.find(c=>c.date===date),ws=d.workouts.filter(w=>w.date===date);
  $('dayPT').textContent=new Date(date+'T12:00:00').toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'short',year:'numeric'});
  const row=(l,v)=>`<div class="day-row"><span class="day-lbl">${l}</span><span class="day-val">${v}</span></div>`;
  let html='';
  if(sl)html+=row('Sleep score',(sl.score||'—')+'/100')+((sl.deepH||sl.deepM)?row('Deep sleep',fmtHM(sl.deepH||0,sl.deepM||0)):'')+((sl.remH||sl.remM)?row('REM sleep',fmtHM(sl.remH||0,sl.remM||0)):'');
  if(ciFull(ci))html+=row('Energy',EM.energy[ci.energy])+row('Mood',EM.mood[ci.mood])+row('Stress',EM.stress[ci.stress])+row('Motivation',EM.motivation[ci.motivation]);
  if(ci?.mindfulMin)html+=row('Mindfulness',fmtDur(ci.mindfulMin));
  if(ci?.gratitude)html+=row('Grateful for',`<span style="font-size:12px;font-family:var(--body);text-align:right;max-width:190px;display:inline-block">${esc(ci.gratitude)}</span>`);
  ws.forEach(w=>{html+=row(esc(w.type),`${w.sets?'':(w.durMin?fmtDur(w.durMin):'')}${w.distKm?' · '+fmtDist(w):''}<button class="day-del" onclick="delWorkout('${w.id}')">Delete</button>`);if(w.sets)html+=row('<i>Sets</i>',`<span style="font-size:11px;opacity:.8;text-align:right;max-width:220px;display:inline-block">${esc(setsText(w))}</span>`);if(w.notes)html+=row('<i>Note</i>',`<span style="font-size:11px;opacity:.7">${esc(w.notes)}</span>`);});
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
  const bm=d.checkins.filter(c=>c.mindfulMin>0);if(bm.length){const b=bm.reduce((a,c)=>c.mindfulMin>a.mindfulMin?c:a);out.push(['🧘','Longest mindfulness day',b.date,fmtDur(b.mindfulMin)]);}
  const bs=bestStreak();if(bs>1)out.push(['🔥','Best streak','',`${bs} days`]);
  $('prList').innerHTML=out.length?out.map(([i,t,dt,v])=>`<div class="act-item"><div class="act-icon past">${i}</div><div style="flex:1"><div class="act-name">${t}</div><div class="act-meta">${dt}</div></div><div class="best-v">${v}</div></div>`).join(''):`<div class="empty-state"><div class="empty-icon">🏅</div><div class="empty-title">No records yet</div><div class="empty-sub">Log a few workouts and your personal bests show up here.</div><button class="empty-btn" onclick="switchTab('today');go('qwCard')">Log a workout</button></div>`;
}
function renderWeekSum(){
  const d=S(),tw=d.workouts.filter(w=>daysAgo(w.date)<7),lw=d.workouts.filter(w=>{const x=daysAgo(w.date);return x>=7&&x<14;});
  const dist=tw.reduce((a,w)=>a+(w.distKm||0),0),dur=tw.reduce((a,w)=>a+(w.durMin||0),0);
  const sl=d.sleepLogs.filter(s=>s.score).slice(-7),avg=sl.length?Math.round(sl.reduce((a,s)=>a+s.score,0)/sl.length):0;
  const delta=tw.length-lw.length,ds=delta>0?` ↑ +${delta} vs last week`:delta<0?` ↓ ${Math.abs(delta)} vs last week`:' = same as last week';
  const mm=seriesFor(7,mindOn).reduce((a,x)=>a+x.v,0);
  $('weekSum').innerHTML=`${tw.length} workout${tw.length!==1?'s':''} this week${ds}<br>${dur?fmtDur(dur)+' total':'0 min'} · ${dist.toFixed(1)} km<br>${tw.some(w=>w.sets)?'Strength sets: '+tw.reduce((n,w)=>n+(w.sets||[]).filter(isWork).length,0)+'<br>':''}Mindfulness: ${mm?fmtDur(mm):'—'}<br>Sleep avg: ${avg?avg+'/100':'—'}`;
}

