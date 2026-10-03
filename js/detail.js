// ── DETAIL SHEETS (v97): tap a gauge or a factor row on Today ───────────────
// One sheet (#dtModal) shows today's value, its source, the 30-day usual, a 7-day
// trend and the effect on the recovery score in plain words, plus an Edit link.
let _dtKey=null;
const dtGoal=()=>Math.round((S().profile.sleepGoal||7.5)*60);
const dtPsy=c=>ciFull(c)?Math.round((c.energy+c.mood+(5-c.stress)+c.motivation)/16*100):null;
const cap=s=>s.charAt(0).toUpperCase()+s.slice(1);
const dtPts=n=>{n=Math.round(n);return n===0?'no change':(n>0?'+':'−')+Math.abs(n)+(Math.abs(n)===1?' point':' points');};
const dtAvg=(fn,days=30)=>{const a=[];for(let i=1;i<=days;i++){const v=fn(dAgo(i));if(v!=null)a.push(v);}return a;};
const ciOn=date=>S().checkins.find(c=>c.date===date);
// seven small bars, scaled between the lowest and highest value so small changes stay visible
function dtTrend(fn,fmt){
  const vals=seriesFor(7,fn),nums=vals.filter(v=>v.v!=null).map(v=>v.v);
  if(nums.length<2)return'';
  const lo=Math.min(...nums),hi=Math.max(...nums),span=hi-lo||1,L=['S','M','T','W','T','F','S'];
  return`<div class="dt-sec">Last 7 days</div><div class="dt-tr">${vals.map(v=>{const dt=new Date(v.date+'T12:00:00');
    return`<div class="dt-c"><span class="dt-bv">${v.v==null?'':fmt(v.v)}</span><div class="dt-b ${v.v==null?'off':v.date===td()?'now':''}" style="height:${v.v==null?4:Math.round(20+(v.v-lo)/span*80)}%"></div><span class="dt-bl">${v.date===td()?'Now':L[dt.getDay()]}</span></div>`;}).join('')}</div>`;
}
function dtSpec(k){
  const d=S(),t=td(),fresh=x=>daysAgo(x.date)<=2;
  if(k==='sleep'){
    const sl=last(d.sleepLogs.filter(x=>x.durMin&&daysAgo(x.date)<=1)),goal=dtGoal(),src=(sl&&sl.src)||{};
    const fn=dt=>{const s=d.sleepLogs.find(x=>x.date===dt&&x.durMin);return s?s.durMin:null;},u=dtAvg(fn);
    const wk=/^([01]\d|2[0-3]):[0-5]\d$/.test(d.profile.wakeTime||'')?d.profile.wakeTime:'06:30',[h,m]=wk.split(':').map(Number),need=sleepNeed(strainOf(dayLoad(t)));
    const tonight=`<div class="dt-sec">Tonight</div><div class="dt-row"><span>Asleep by <b>${hhmm(h*60+m-need)}</b> for ${fmtDur(need)}</span><label class="dt-wake">wake at <input type="time" value="${wk}" onchange="setWake(this.value)" aria-label="Wake time"></label></div><div class="dt-note">Your goal of ${fmtDur(goal)}${need>goal?', plus extra for today\'s strain and recent short nights':''}.</div>`;
    if(!sl)return{title:'Sleep',missing:`No sleep logged for last night. Enter bedtime and wake-up in Log, or sync Intervals.icu if your watch recorded it.`,link:['Log sleep',"logGo('lSleep')"],extra:tonight};
    const pc=Math.round(sl.durMin/goal*100),base=Math.round(slScore(sl)*0.5+35);
    const srcTxt=slIcu(sl)?'Intervals.icu'+(src.bed==='est'||src.wake==='est'?', one time estimated':src.bed||src.wake?', times added by you':''):'Logged by you';
    return{title:'Sleep',val:fmtDur(sl.durMin),sub:`${pc}% of your ${fmtDur(goal)} goal${sl.date!==t?' · night ending '+fmtD(sl.date):''}${sl.score?' · score '+sl.score:''}`,src:srcTxt,
      usual:u.length?`${fmtDur(Math.round(avg(u)))} over ${u.length} nights`:'Needs more nights',trend:dtTrend(fn,v=>Math.floor(v/60)+'h'+(v%60?String(v%60).padStart(2,'0'):'')),
      effect:fresh(sl)?`Sleep sets the starting point: ${base} out of 100 before form, your check-in and recovery signals adjust it. ${pc>=90?'A full night, so the start is high.':pc>=75?'A bit short of your goal, which lowers the start.':'Well short of your goal, which pulls the start down.'}`:'Not counted today: the last night is more than three days old.',
      link:['Edit in Log',"logGo('lSleep')"],extra:tonight};
  }
  if(k==='form'){
    const tsb=d.intervalsData.tsb,fn=dt=>{if(dt===t&&tsb!=null)return tsb;const w=d.wellness[dt];return w&&w.ctl!=null&&w.atl!=null?Math.round((w.ctl-w.atl)*10)/10:null;},u=dtAvg(fn);
    if(tsb==null)return{title:'Form',missing:'Form (how fresh your legs are) comes from Intervals.icu: fitness minus recent fatigue. Connect it in Settings and sync.',link:['Open Settings','openSettings()']};
    const n=tsb>0?tsb*0.5:tsb*0.3,w=tsb>=5?'Fresh':tsb>=-10?'Balanced':tsb>=-25?'Tired':'Very tired';
    return{title:'Form',val:(tsb>0?'+':'')+Math.round(tsb),sub:`${w} · fitness ${Math.round(d.intervalsData.ctl)} minus recent fatigue ${Math.round(d.intervalsData.atl)}`,src:'Intervals.icu',
      usual:u.length?`${(avg(u)>0?'+':'')+Math.round(avg(u))} over ${u.length} days`:'Needs more days',trend:dtTrend(fn,v=>(v>0?'+':'')+Math.round(v)),
      effect:`${cap(dtPts(n))} on recovery. ${tsb>0?'Fresh legs add a little.':tsb>=-10?'Close to balanced, so a small adjustment.':'Fatigue is ahead of fitness, which takes points off.'}`,
      link:['Open Settings','openSettings()']};
  }
  if(k==='checkin'){
    const ci=last(d.checkins.filter(c=>ciFull(c)&&fresh(c))),fn=dt=>dtPsy(ciOn(dt)),u=dtAvg(fn);
    if(!ci)return{title:'Check-in',missing:'No check-in in the last three days. It takes four taps: energy, mood, stress and motivation.',link:['Check in',"logGo('lCheckin')"],trend:dtTrend(fn,v=>v)};
    const p=dtPsy(ci),e=EM,old=ci.date!==t?`From ${daysAgo(ci.date)===1?'yesterday':fmtD(ci.date)}, until you check in today. `:'';
    return{title:'Check-in',val:p>=70?'Good':p>=50?'Okay':'Low',sub:`${old}${p}/100 · energy ${e.energy[ci.energy].toLowerCase()}, mood ${e.mood[ci.mood].toLowerCase()}, stress ${e.stress[ci.stress].toLowerCase()}, motivation ${e.motivation[ci.motivation].toLowerCase()}`,src:'Logged by you',
      usual:u.length?`${Math.round(avg(u))}/100 over ${u.length} days`:'Needs more days',trend:dtTrend(fn,v=>v),
      effect:`Counts for 30% of the score. ${p>=70?'A good check-in lifts the score towards 100.':p>=50?'An okay check-in holds the score near where sleep and form put it.':'A low check-in pulls the score down.'}`,
      link:['Edit in Log',"logGo('lCheckin')"]};
  }
  if(k==='hrv'){
    const hv=latestOf('hrv'),hb=wSeries('hrv'),fn=dt=>{const w=d.wellness[dt];return w&&w.hrv!=null?w.hrv:null;};
    if(!hv)return{title:'Heart rate variability',missing:'No HRV in the last three days. It comes from Intervals.icu (your watch records it overnight). Sync to refresh.',link:['Open Settings','openSettings()']};
    const b=hb.length>=RB_MIN?avg(hb):null,pc=b?Math.round((hv.v/b-1)*100):0,adj=b?Math.max(-10,Math.min(4,(hv.v/b-1)*30)):0;
    return{title:'Heart rate variability',val:Math.round(hv.v)+' ms',sub:hv.age?`from ${fmtD(dAgo(hv.age))}`:'last night',src:'Intervals.icu',
      usual:b?`${Math.round(b)} ms over ${hb.length} days`:`Building: ${hb.length} of ${RB_MIN} days`,trend:dtTrend(fn,v=>Math.round(v)),
      effect:b?`${cap(dtPts(adj))} on recovery. ${pc>=-5?'Within your usual range, so your body is coping well.':pc>=-15?`${-pc}% below usual: some strain.`:`${-pc}% below usual: your body is under strain.`}`:`Not counted yet: a 30-day usual needs ${RB_MIN} days of data.`,
      link:['Open Settings','openSettings()']};
  }
  if(k==='rhr'){
    const rv=latestOf('rhr'),rb=rhrSeries(),src=rv&&rv.src,fn=dt=>{const r=rhrOn(dt);return r&&r.src===src?r.v:null;};
    if(!rv)return{title:'Resting heart rate',missing:'No resting heart rate in the last three days. Sync Intervals.icu, or log it under Body.',link:['Log in Body',"logGo('lMeas')"]};
    const b=rb.length>=RB_MIN?avg(rb):null,df=b?Math.round(rv.v-b):0,adj=b?Math.max(-6,Math.min(2,-(rv.v-b)*0.8)):0;
    return{title:'Resting heart rate',val:Math.round(rv.v)+' bpm',sub:rv.age?`from ${fmtD(dAgo(rv.age))}`:'today',src:src==='icu'?'Intervals.icu':'Logged by you',
      usual:b?`${Math.round(b)} bpm over ${rb.length} days`:`Building: ${rb.length} of ${RB_MIN} days from the same source`,trend:dtTrend(fn,v=>Math.round(v)),
      effect:b?`${cap(dtPts(adj))} on recovery. ${df<=2?'Normal for you.':df<=5?`${df} above usual: often fatigue or a short night.`:`${df} above usual: fatigue, illness or poor sleep.`}`:`Not counted yet: a 30-day usual needs ${RB_MIN} days from one source.`,
      link:src==='icu'?['Open Settings','openSettings()']:['Edit in Body',"logGo('lMeas')"]};
  }
  if(k==='breathing'){
    const pv=latestOf('resp'),pb=wSeries('resp'),fn=dt=>{const w=d.wellness[dt];return w&&w.resp!=null?w.resp:null;};
    if(!pv)return{title:'Breathing rate',missing:'No breathing rate in the last three days. Your watch records it while you sleep; sync Intervals.icu to refresh.',link:['Open Settings','openSettings()']};
    const b=pb.length>=RB_MIN?avg(pb):null,df=b?Math.round((pv.v-b)*10)/10:0;
    return{title:'Breathing rate, asleep',val:pv.v.toFixed(1)+' /min',sub:pv.age?`from ${fmtD(dAgo(pv.age))}`:'last night',src:'Intervals.icu',
      usual:b?`${b.toFixed(1)} /min over ${pb.length} days`:`Building: ${pb.length} of ${RB_MIN} days`,trend:dtTrend(fn,v=>v.toFixed(1)),
      effect:`Shown only, it does not change the score. ${!b?'':df<=1?'Normal for you.':df<=2?'A little above usual: a hard day, or early signs of a cold.':'Well above usual: an early sign of illness or poor recovery.'}`,
      link:['Open Settings','openSettings()']};
  }
  if(k==='soreness'){
    const ci=last(d.checkins.filter(c=>ciFull(c)&&fresh(c))),fn=dt=>{const c=ciOn(dt);return c&&c.soreness?c.soreness:null;},u=dtAvg(fn),s=ci&&ci.soreness;
    if(!s)return{title:'Soreness',missing:'Not rated in the last three days. Soreness is part of the check-in.',link:['Check in',"logGo('lCheckin')"],trend:dtTrend(fn,v=>EM.soreness[v][0])};
    return{title:'Soreness',val:EM.soreness[s],sub:`level ${s} of 4${ci.date!==t?` · from ${daysAgo(ci.date)===1?'yesterday':fmtD(ci.date)}, until you check in today`:''}`,src:'Logged by you',
      usual:u.length?`${EM.soreness[Math.round(avg(u))]} over ${u.length} days`:'Needs more days',trend:dtTrend(fn,v=>EM.soreness[v][0]),
      effect:s>=2?`${cap(dtPts(-(s-1)*4))} on recovery: 4 points for every level above mild.${s>=3?' Three days in a row at this level is worth logging as an injury.':''}`:'No effect: only soreness above mild takes points off.',
      link:['Edit in Log',"logGo('lCheckin')"]};
  }
  if(k==='coffee'){
    const ci=todayCI(),fn=dt=>{const c=ciOn(dt);return c?c.coffee||0:null;},u=dtAvg(fn);
    return{title:'Coffee',val:ci?(ci.coffee||0)+(ci.coffee===4?'+ cups':ci.coffee===1?' cup':' cups'):'Not logged',sub:ci&&ci.coffeeLate?'including a cup after 14:00':'none after 14:00',src:'Logged by you',
      usual:u.length?`${Math.round(avg(u)*10)/10} cups a day over ${u.length} days`:'Needs more days',trend:dtTrend(fn,v=>v),
      effect:'Shown only. A late cup can cut deep sleep tonight; the Trends tab compares your coffee with the next night\'s sleep.',link:['Edit in Log',"logGo('lCheckin')"]};
  }
  if(k==='injury'){
    const inj=d.injuries.filter(i=>i.active);
    if(!inj.length)return{title:'Injuries',missing:'No active injuries. Log a niggle under Injury so recovery and the week plan allow for it.',link:['Log an injury',"logGo('lInjury')"]};
    const m=Math.max(...inj.map(i=>i.sev));
    return{title:'Injuries',val:inj.length===1?esc(inj[0].part):inj.length+' active',sub:inj.map(i=>`${esc(i.part)} (${['','mild','moderate','severe'][i.sev]}, since ${fmtD(i.date)})`).join(' · '),src:'Logged by you',
      usual:'',effect:`${cap(dtPts(-m*8))} on recovery: 8 points per level of the worst injury. Hard days are off the plan with a moderate injury.`,link:['Edit in Log',"logGo('lInjury')"]};
  }
  if(k==='strain'){
    const load=dayLoad(t),st=strainOf(load),ref=strainRef(),tg=strainTarget(),fn=dt=>{const l=dayLoad(dt);return l?strainOf(l):0;},ws=d.workouts.filter(w=>w.date===t);
    const u=dtAvg(fn).filter(v=>v>0);
    return{title:'Strain',val:load?st.toFixed(1):'0',sub:ws.length?ws.map(w=>esc(w.type)+(w.durMin?' '+fmtDur(w.durMin):'')).join(', '):restToday()?'Planned rest day':'Nothing logged yet today',src:ws.length?(ws.some(w=>String(w.id).startsWith('icu-'))?'Intervals.icu and your log':'Logged by you'):'',
      usual:u.length?`${(avg(u)).toFixed(1)} on training days, hard day about ${strainOf(ref).toFixed(1)}`:'Needs more training days',trend:dtTrend(fn,v=>v?v.toFixed(1):'0'),
      effect:`Strain measures today, it does not change recovery. ${tg?`Today's target is ${tg[0]} to ${tg[1]} from your verdict${load?(st>tg[1]?', and you are above it.':st<tg[0]?', so there is room for more.':', and you are in it.'):'.'}`:'A target range appears once you have a recovery score.'} Tomorrow's recovery will reflect it.`,
      link:['Log a workout',"logGo('lWorkout')"]};
  }
  if(k==='recovery'){
    const sc=calcReadiness(),h=d.readHist||{},fn=dt=>dt===t?sc:(h[dt]??null),u=dtAvg(fn);
    if(sc==null)return{title:'Recovery',missing:'No score yet. Check in or log last night\'s sleep and it appears.',link:['Check in',"logGo('lCheckin')"]};
    const sl=last(d.sleepLogs.filter(s=>(s.score||s.durMin)&&fresh(s))),ci=last(d.checkins.filter(c=>ciFull(c)&&fresh(c))),tsb=d.intervalsData.tsb;
    const parts=[];
    parts.push(['Sleep',sl?`start ${Math.round(slScore(sl)*0.5+35)}`:'start 70, nothing logged']);
    if(tsb!=null)parts.push(['Form',dtPts(tsb>0?tsb*0.5:tsb*0.3)]);
    if(ci)parts.push(['Check-in'+(ci.date!==t?' (yesterday)':''),`30% at ${dtPsy(ci)}/100`]);
    const hv=latestOf('hrv'),hb=wSeries('hrv');if(hv&&hb.length>=RB_MIN)parts.push(['HRV',dtPts(Math.max(-10,Math.min(4,(hv.v/avg(hb)-1)*30)))]);
    const rv=latestOf('rhr'),rb=rhrSeries();if(rv&&rb.length>=RB_MIN)parts.push(['Resting HR',dtPts(Math.max(-6,Math.min(2,-(rv.v-avg(rb))*0.8)))]);
    if(ci&&ci.soreness>=2)parts.push(['Soreness'+(ci.date!==t?' (yesterday)':''),dtPts(-(ci.soreness-1)*4)]);
    const inj=d.injuries.filter(i=>i.active);if(inj.length)parts.push(['Injury',dtPts(-Math.max(...inj.map(i=>i.sev))*8)]);
    return{title:'Recovery',val:sc,sub:sc>=80?'Primed':sc>=65?'Good':sc>=50?'Moderate':'Low',src:'Computed from the rows below',
      usual:u.length?`${Math.round(avg(u))} over ${u.length} days`:'Needs more days',trend:dtTrend(fn,v=>v),
      effect:`<div class="dt-parts">${parts.map(([l,v])=>`<div class="dt-row"><span>${l}</span><b>${v}</b></div>`).join('')}</div>Tap a row under the gauges for the detail of each one.`,
      link:['Edit in Log',"logGo('lCheckin')"]};
  }
  return null;
}
function openDetail(k){
  const sp=dtSpec(k),el=$('dtModal');if(!sp||!el)return;
  _dtKey=k;$('dtTitle').firstChild.textContent=sp.title+' ';
  let h='';
  if(sp.missing)h+=`<div class="dt-miss">${sp.missing}</div>`;
  else h+=`<div class="dt-big">${sp.val}</div><div class="dt-sub">${sp.sub||''}</div>${sp.src?`<div class="dt-src">Source: ${sp.src}</div>`:''}${sp.usual?`<div class="dt-row dt-usual"><span>Usual, 30 days</span><b>${sp.usual}</b></div>`:''}`;
  h+=sp.trend||'';
  if(sp.effect)h+=`<div class="dt-sec">Effect on recovery</div><div class="dt-eff">${sp.effect}</div>`;
  h+=sp.extra||'';
  if(sp.link)h+=`<button class="btn-out dt-link" onclick="closeDetail();${sp.link[1]}">${sp.link[0]}</button>`;
  $('dtBody').innerHTML=h;el.classList.add('open');
}
function closeDetail(){_dtKey=null;const el=$('dtModal');if(el)el.classList.remove('open');}
function refreshDetail(){if(_dtKey)openDetail(_dtKey);}
