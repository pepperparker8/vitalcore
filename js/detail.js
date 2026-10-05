// ── DETAIL SHEETS (v97): tap a gauge or a factor row on Today ───────────────
// One sheet (#dtModal) shows today's value, the 30-day usual, an interactive chart of
// the last 30 days (v119) and the effect on the recovery score in plain words, plus an Edit link.
let _dtKey=null,_dtCh=null;
const dtGoal=()=>Math.round((S().profile.sleepGoal||7.5)*60);
const dtPsy=c=>mindOf(c);
const cap=s=>s.charAt(0).toUpperCase()+s.slice(1);
const dtPts=n=>{n=Math.round(n);return n===0?'no change':(n>0?'+':'−')+Math.abs(n)+(Math.abs(n)===1?' point':' points');};
const dtAvg=(fn,days=30)=>{const a=[];for(let i=1;i<=days;i++){const v=fn(dAgo(i));if(v!=null)a.push(v);}return a;};
const ciOn=date=>S().checkins.find(c=>c.date===date);
// v119: the last 30 days as an interactive chart (14 in view, drag or ‹ for the rest), with the same zones, usual
// range and lines as the matching Trends chart. The spec is kept in _dtCh and mounted once the sheet is in the page.
// o: bar, color, barColor, zones, lines, band (SD floor: a usual range from the 28 days before each day), min, max,
// yfmt, label, stats {good, label, unit, one, avg}, means(info)
function dtTrend(fn,fmt,o={}){
  const from=dAgo(29),all=seriesFor(o.band!=null?60:30,fn).filter(p=>p.v!=null).map(p=>({d:p.date,v:p.v})),pts=all.filter(p=>p.d>=from);
  if(pts.length<2)return'';
  const band=o.band!=null?rollBand(all,o.band).filter(b=>b.d>=from):null;_dtBand=band?new Map(band.map(b=>[b.d,b])):null;
  _dtCh={H:140,span:14,label:o.label,yfmt:o.yfmt||fmt,min:o.min,max:o.max,zones:o.zones,lines:o.lines,band,hi:true,
    series:[{name:o.label||'Value',type:o.bar?'bar':undefined,color:o.color||'--text',barColor:o.barColor,fmt,pts}],
    stats:{one:'day',...(o.stats||{})},means:o.means||(info=>dtMeaning(info,band,fmt,o))};
  return`<div class="dt-sec">Last 30 days</div><div id="dtChart"></div>`;
}
// a 'good' test for a band chart: in or above (side 1) or in or below (side -1) the usual range of that day; set by dtTrend
let _dtBand=null;
const dtIn=side=>(v,dt)=>{const b=_dtBand&&_dtBand.get(dt);return!!b&&(side>0?v>=b.lo:v<=b.hi);};
// default sentence under a sheet chart: the latest day against its zone or usual range
function dtMeaning(info,band,fmt,o){
  if(band&&o.txt)return bandMeaning(info,band,fmt,o.txt);
  const l=info.last,z=info.zone(l.v);
  return`${l.d===td()?'Today':fmtD(l.d)}: ${fmt(l.v)}${z?', '+z.label.toLowerCase():''}. Your 30-day average here is ${fmt(avg(info.all.map(p=>p.v)))}.`;
}
// ── v117: the sleep sheet browses stored nights (‹ ›) and shows the detailed night from Polar ──
let _dtDate=null;                       // the night on show in the sleep sheet; null = last night
const dtNights=()=>S().sleepLogs.filter(x=>x.durMin).map(x=>x.date).sort();
const dtLastNight=()=>last(S().sleepLogs.filter(x=>x.durMin&&daysAgo(x.date)<=1));
function dtNight(dir){
  const l=dtNights();if(!l.length)return;
  const cur=_dtDate||(dtLastNight()||{}).date;
  let i=cur?l.indexOf(cur):l.length;     // with no night to show, ‹ goes to the newest stored one
  i+=dir;if(i<0||i>=l.length)return;
  _dtDate=l[i];openDetail('sleep');
}
function dtNav(cur){
  const l=dtNights(),i=cur?l.indexOf(cur):l.length;if(!l.length||(l.length<2&&cur))return'';
  const lab=cur?(cur===td()?'Last night':'Night ending '+fmtD(cur)):'Last night';
  return`<div class="dt-nav"><button type="button" aria-label="Earlier night" onclick="dtNight(-1)"${i<=0?' disabled':''}>‹</button><span>${lab}</span><button type="button" aria-label="Later night" onclick="dtNight(1)"${i>=l.length-1?' disabled':''}>›</button></div>`;
}
const PL_WORDS=['','very badly','badly','neither well nor badly','well','very well'];
// a small line over the night from Polar's sample runs ({t, dt seconds, v[]}), placed by time; one line per run
function dtSpark(runs,start,T){
  const pts=[];(runs||[]).forEach(r=>{const t0=(Date.parse(r.t)-start)/1000;if(isNaN(t0))return;const p=[];(r.v||[]).forEach((v,i)=>{if(v>0)p.push([t0+i*(r.dt||300),v]);});if(p.length>1)pts.push(p);});
  const all=pts.flat().map(p=>p[1]);if(!all.length)return'';
  const lo=Math.min(...all),hi=Math.max(...all),sp=hi-lo||1;
  return`<svg class="dt-sp" viewBox="0 0 100 24" preserveAspectRatio="none" aria-hidden="true">${pts.map(p=>`<polyline points="${p.map(([s,v])=>(Math.max(0,Math.min(100,s/T*100))).toFixed(1)+','+(22-(v-lo)/sp*20).toFixed(1)).join(' ')}"/>`).join('')}</svg>`;
}
// the detailed night from Polar: a four-row stage chart from the hypnogram, the stage minutes, Polar's score parts and
// what the body did during the night. Shown only; the recovery score keeps using the sleep record and the daily wellness.
// v119: no app or device names on screen.
function dtPolar(n){
  const x=n.data,st=x.stages||{},span=x.span||0,start=Date.parse(x.start),T=Math.max(60,Math.round((Date.parse(x.end)-start)/1000)||span*60);
  const hm=s=>/^\d{4}-\d\d-\d\dT\d\d:\d\d/.test(s||'')?s.slice(11,16):'',pc=m=>span&&m?` · ${Math.round(m/span*100)}%`:'',row=(l,v)=>v?`<div class="dt-row"><span>${l}</span><b>${v}</b></div>`:'';
  const ROW={0:0,3:1,1:2,2:3},hyp=x.hyp||[];
  let hy='';hyp.forEach(([s,k],i)=>{const e=i+1<hyp.length?hyp[i+1][0]:T;if(e<=s||ROW[k]==null)return;hy+=`<i${k===0?' class="w"':''} style="left:${(s/T*100).toFixed(2)}%;width:${Math.max(0.3,(e-s)/T*100).toFixed(2)}%;top:${ROW[k]*25+3.5}%"></i>`;});
  const [sh,sm]=hm(x.start).split(':').map(Number),mid=isNaN(sh)?'':hhmm(sh*60+sm+Math.round(T/120));
  const chart=hy?`<div class="dt-hy"><div class="dt-hyl"><span>Awake</span><span>REM</span><span>Light</span><span>Deep</span></div><div class="dt-hyp" role="img" aria-label="Sleep stages through the night">${hy}</div><div class="dt-ax"><span>${hm(x.start)}</span><span>${mid}</span><span>${hm(x.end)}</span></div></div>`:'';
  const it=x.inter||{},breaks=it.n?`${it.n} break${it.n>1?'s':''}${it.nLong?`, ${it.nLong} long`:''}`:'';
  let h=`<div class="dt-sec">The night</div>${row(`Asleep from ${hm(x.start)} to ${hm(x.end)}`,fmtDur(span))}${chart}`;
  h+=row('Deep sleep',st.deep?fmtDur(st.deep)+pc(st.deep):'')+row('REM (dreaming)',st.rem?fmtDur(st.rem)+pc(st.rem):'')+row('Light sleep',st.light?fmtDur(st.light)+pc(st.light):'')+row('Awake',st.wake?fmtDur(st.wake)+(breaks?' · '+breaks:''):'');
  const p=x.parts||{};
  if(x.score||p.duration||p.solidity||p.refresh){
    h+=`<div class="dt-sec">Sleep score${x.score?` · ${x.score} of 100`:''}</div>`+row('Amount of sleep',p.duration)+row('Solidity',p.solidity)+row('Regeneration',p.refresh)+row('Efficiency',x.eff?x.eff+'%':'')+row('Sleep cycles',(x.cycles||[]).length||'');
    h+=`<div class="dt-note">Amount is time asleep against your watch's sleep goal, solidity is how unbroken the night was, regeneration is the share of deep and REM sleep. A separate scale from your recovery score.</div>`;
  }
  const rc=x.rc||{},bpm=ms=>ms?Math.round(60000/ms):null,br=ms=>ms?(60000/ms).toFixed(1):null;   // Polar gives intervals in ms
  const mh=plMean(x.hrv),mb=plMean(x.br);   // the night's own samples when Polar gives no mean
  const hr=bpm(rc.rri),hrB=bpm(rc.baseRri),hv=rc.rmssd||(mh&&Math.round(mh)),hvB=rc.baseRmssd,bq=br(rc.resp)||(mb&&mb.toFixed(1)),bqB=br(rc.baseResp);
  const vs=(v,b,u)=>v?`${v}${u}${b?` <small>usual ${b}</small>`:''}`:'';
  if(hr||hv||bq){
    h+=`<div class="dt-sec">Your body during the night</div>`+row('Heart rate',vs(hr,hrB,' bpm'))+row('Heart rate variability',vs(hv,hvB,' ms'))+(hv?dtSpark(x.hrv,start,T):'')+row('Breathing',vs(bq,bqB,' /min'))+(bq?dtSpark(x.br,start,T):'');
    h+=`<div class="dt-note">Measured in the first hours of sleep; usual is your 28-night baseline for the night. Shown for context: your recovery score uses the daily heart rate variability and resting heart rate.</div>`;
  }
  if(x.rating)h+=row('You rated it',`Slept ${PL_WORDS[x.rating]}`);
  return h;
}
// v118: what one Body part (hrv, rhr) adds today, in plain words with its points and weight
function dtBodyPart(k){
  const B=calcBody(),p=B.parts[k],w=k==='hrv'?TH.W_HRV:TH.W_RHR,nm=k==='hrv'?'Heart rate variability':'Resting heart rate';
  if(!p){const m=B.missing.find(x=>x.k===k);return`Not counted in Body today: ${m?m.why:'no data'}. The other parts carry its weight and confidence is low.`;}
  if(k==='hrv')return`${nm} is ${w}% of Body: ${Math.round(p.pts)} of 100. Your 7-night average is ${Math.round(p.v7)} ms against your usual ${Math.round(p.m)} ms. One low morning moves it only a little; a drift over several nights moves it a lot.`;
  return`${nm} is ${w}% of Body: ${Math.round(p.pts)} of 100. Today ${Math.round(p.v)} bpm against your usual ${Math.round(p.m)} bpm; higher than usual lowers it.`;
}
function dtSpec(k){
  if(/^wk:/.test(k))return wkSpec(k.slice(3));   // v122: a workout (workout.js)
  const d=S(),t=td(),fresh=x=>daysAgo(x.date)<=2;
  if(k==='sleep'){
    const sl=_dtDate?d.sleepLogs.find(x=>x.date===_dtDate&&x.durMin):dtLastNight(),goal=dtGoal(),src=(sl&&sl.src)||{};
    const fn=dt=>{const s=d.sleepLogs.find(x=>x.date===dt&&x.durMin);return s?s.durMin:null;},u=dtAvg(fn);
    const wk=/^([01]\d|2[0-3]):[0-5]\d$/.test(d.profile.wakeTime||'')?d.profile.wakeTime:'06:30',[h,m]=wk.split(':').map(Number),need=sleepNeed(strainOf(dayLoad(t)));
    const tonight=`<div class="dt-sec">Tonight</div><div class="dt-row"><span>Asleep by <b>${hhmm(h*60+m-need)}</b> for ${fmtDur(need)}</span><label class="dt-wake">wake at <input type="time" value="${wk}" onchange="setWake(this.value)" aria-label="Wake time"></label></div><div class="dt-note">Your goal of ${fmtDur(goal)}${need>goal?', plus extra for today\'s strain and recent short nights':''}.</div>`;
    const nav=dtNav(sl?sl.date:null),gH=goal/60;
    const tr=dtTrend(dt=>{const v=fn(dt);return v==null?null:v/60;},v=>fmtDur(Math.round(v*60)),{bar:true,color:'--teal',label:'Time asleep',yfmt:v=>Math.round(v)+'h',
      barColor:v=>v>=gH?'--teal':v>=gH-1?'--teal/.5':'--amber',lines:[{v:gH,label:'Goal',color:'--teal'}],
      stats:{good:v=>v>=gH,label:'at or over your goal',unit:'nights',one:'night'},means:info=>sleepMeaning(info,goal)});
    if(!sl)return{title:'Sleep',nav,missing:`No sleep logged for last night. Enter bedtime and wake-up in Log, or tap Sync if your watch recorded it.`,link:['Log sleep',"logGo('lSleep')"],trend:tr,extra:tonight};
    const pc=Math.round(sl.durMin/goal*100),base=Math.round(slScore(sl)*0.5+35),used=last(d.sleepLogs.filter(s=>(s.score||s.durMin)&&fresh(s)));
    const ev=ciOn(dAgo(daysAgo(sl.date)+1)),late=ev&&ev.coffeeLate?`<div class="dt-sec">The evening before</div><div class="dt-note">Your check-in on ${fmtD(ev.date)} says coffee after 14:00. A late cup can cut deep sleep, so keep it in mind when reading this night.</div>`:'';
    const est=src.bed==='est'||src.wake==='est'?' · one time estimated':'';
    const pn=polarOn(sl.date),polar=pn?dtPolar(pn):'';
    // v118 (A5): Body uses the night ending today, else yesterday, never an older one
    const bs=bodyLive()?calcBody().parts.sleep:null;
    const bodyEff=bs&&bs.date===sl.date?`Sleep is ${TH.W_SLEEP}% of Body: ${Math.round(bs.pts)} of 100. You slept ${fmtDur(bs.durMin)} of the ${fmtDur(bs.need)} you needed that night${bs.sol!=null?`, and the night's solidity was ${bs.sol}`:''}.`:'Not counted today: only the night ending today or yesterday counts.';
    return{title:'Sleep',nav,val:fmtDur(sl.durMin),sub:`${pc}% of your ${fmtDur(goal)} goal${sl.date!==t?' · night ending '+fmtD(sl.date):''}${sl.score?' · score '+sl.score:''}${est}`,
      usual:u.length?`${fmtDur(Math.round(avg(u)))} over ${u.length} nights`:'Needs more nights',trend:tr,
      effect:bodyLive()?bodyEff:used&&used.date===sl.date?`Sleep sets the starting point: ${base} out of 100 before form, your check-in and recovery signals adjust it. ${pc>=90?'A full night, so the start is high.':pc>=75?'A bit short of your goal, which lowers the start.':'Well short of your goal, which pulls the start down.'}`:used?`Not counted today: the score uses the night ending ${fmtD(used.date)}.`:'Not counted today: the last night is more than three days old.',
      link:['Edit in Log',"logGo('lSleep')"],extra:polar+late+tonight};
  }
  if(k==='form'){
    const tsb=d.intervalsData.tsb,fn=dt=>{if(dt===t&&tsb!=null)return tsb;const w=d.wellness[dt];return w&&w.ctl!=null&&w.atl!=null?Math.round((w.ctl-w.atl)*10)/10:null;},u=dtAvg(fn);
    if(tsb==null)return{title:'Form',missing:'Form (how fresh your legs are) is fitness minus recent fatigue, from your training history. Connect your training account in Settings and sync.',link:['Open Settings','openSettings()']};
    const n=tsb>0?tsb*0.5:tsb*0.3,w=zL(tsb,'tsb');
    return{title:'Form',val:(tsb>0?'+':'')+Math.round(tsb),sub:`${w} · fitness ${Math.round(d.intervalsData.ctl)} minus recent fatigue ${Math.round(d.intervalsData.atl)}`,
      usual:u.length?`${(avg(u)>0?'+':'')+Math.round(avg(u))} over ${u.length} days`:'Needs more days',trend:dtTrend(fn,sgn,{label:'Form',color:'--teal',zones:formZones(),stats:{good:v=>v>=TH.FORM_OK,label:'balanced or fresher'}}),
      effect:bodyLive()?`No effect on Body. Form counts under Load (today: ${calcLoad().state.toLowerCase()}), which shapes the week plan.`:`${cap(dtPts(n))} on recovery. ${tsb>0?'Fresh legs add a little.':tsb>=TH.FORM_OK?'Close to balanced, so a small adjustment.':'Fatigue is ahead of fitness, which takes points off.'}`,
      link:['Open Settings','openSettings()']};
  }
  if(k==='checkin'){
    const ci=last(d.checkins.filter(c=>ciFull(c)&&fresh(c))),fn=dt=>dtPsy(ciOn(dt)),u=dtAvg(fn);
    // the same cuts and words as Mind (calcMind)
    const tr=dtTrend(fn,v=>Math.round(v)+'/100',{label:'Check-in',min:0,max:100,yfmt:v=>Math.round(v),stats:{good:v=>v>=TH.MIND_FLAT,label:'flat or better'},
      zones:mindZones()});
    if(!ci)return{title:'Check-in',missing:'No check-in in the last three days. It takes four taps: energy, mood, stress and motivation.',link:['Check in',"logGo('lCheckin')"],trend:tr};
    const p=dtPsy(ci),e=EM,old=ci.date!==t?`From ${daysAgo(ci.date)===1?'yesterday':fmtD(ci.date)}, until you check in today. `:'';
    return{title:'Check-in',val:p>=TH.MIND_GOOD?'Good':p>=TH.MIND_FLAT?'Flat':'Strained',sub:`${old}${p}/100 · energy ${e.energy[ci.energy].toLowerCase()}, mood ${e.mood[ci.mood].toLowerCase()}, stress ${e.stress[ci.stress].toLowerCase()}, motivation ${e.motivation[ci.motivation].toLowerCase()}`,
      usual:u.length?`${Math.round(avg(u))}/100 over ${u.length} days`:'Needs more days',trend:tr,
      effect:bodyLive()?`No effect on Body. Your check-ins count under Mind; a week of low ones makes the week plan easier.`:`Counts for 30% of the score. ${p>=70?'A good check-in lifts the score towards 100.':p>=50?'An okay check-in holds the score near where sleep and form put it.':'A low check-in pulls the score down.'}`,
      link:['Edit in Log',"logGo('lCheckin')"]};
  }
  if(k==='hrv'){
    const hv=latestOf('hrv'),hb=wSeries('hrv'),fn=dt=>{const w=d.wellness[dt];return w&&w.hrv!=null?w.hrv:null;};
    if(!hv)return{title:'Heart rate variability',missing:'No HRV in the last three days. Your watch records it overnight; sync to refresh.',link:['Open Settings','openSettings()']};
    const b=hb.length>=RB_MIN?avg(hb):null,pc=b?Math.round((hv.v/b-1)*100):0,adj=b?Math.max(-10,Math.min(4,(hv.v/b-1)*30)):0;
    return{title:'Heart rate variability',val:Math.round(hv.v)+' ms',sub:hv.age?`from ${fmtD(dAgo(hv.age))}`:'last night',
      usual:b?`${Math.round(b)} ms over ${hb.length} days`:`Building: ${hb.length} of ${RB_MIN} days`,trend:dtTrend(fn,v=>Math.round(v)+' ms',{label:'Heart rate variability',color:'--teal',yfmt:v=>Math.round(v),band:TH.HRV_FLOOR,txt:BAND_TXT.hrv,stats:{good:dtIn(1),label:'in or above your usual range'}}),
      effect:bodyLive()?dtBodyPart('hrv'):b?`${cap(dtPts(adj))} on recovery. ${pc>=-5?'Within your usual range, so your body is coping well.':pc>=-15?`${-pc}% below usual: some strain.`:`${-pc}% below usual: your body is under strain.`}`:`Not counted yet: a 30-day usual needs ${RB_MIN} days of data.`,
      link:['Open Settings','openSettings()']};
  }
  if(k==='rhr'){
    const rv=latestOf('rhr'),rb=rhrSeries(),src=rv&&rv.src,fn=dt=>{const r=rhrOn(dt);return r&&r.src===src?r.v:null;};
    if(!rv)return{title:'Resting heart rate',missing:'No resting heart rate in the last three days. Sync to refresh, or log it under Body.',link:['Log in Body',"logGo('lMeas')"]};
    const b=rb.length>=RB_MIN?avg(rb):null,df=b?Math.round(rv.v-b):0,adj=b?Math.max(-6,Math.min(2,-(rv.v-b)*0.8)):0;
    return{title:'Resting heart rate',val:Math.round(rv.v)+' bpm',sub:(rv.age?`from ${fmtD(dAgo(rv.age))}`:'today')+(src==='icu'?'':' · logged by you'),
      usual:b?`${Math.round(b)} bpm over ${rb.length} days`:`Building: ${rb.length} of ${RB_MIN} days of the same kind of reading`,trend:dtTrend(fn,v=>Math.round(v)+' bpm',{label:'Resting heart rate',yfmt:v=>Math.round(v),band:TH.RHR_FLOOR,txt:BAND_TXT.rhr,stats:{good:dtIn(-1),label:'in or below your usual range'}}),
      effect:bodyLive()?dtBodyPart('rhr'):b?`${cap(dtPts(adj))} on recovery. ${df<=2?'Normal for you.':df<=5?`${df} above usual: often fatigue or a short night.`:`${df} above usual: fatigue, illness or poor sleep.`}`:`Not counted yet: a 30-day usual needs ${RB_MIN} days from one source.`,
      link:src==='icu'?['Open Settings','openSettings()']:['Edit in Body',"logGo('lMeas')"]};
  }
  if(k==='breathing'){
    const pv=latestOf('resp'),pb=wSeries('resp'),fn=dt=>{const w=d.wellness[dt];return w&&w.resp!=null?w.resp:null;};
    if(!pv)return{title:'Breathing rate',missing:'No breathing rate in the last three days. Your watch records it while you sleep; sync to refresh.',link:['Open Settings','openSettings()']};
    const b=pb.length>=RB_MIN?avg(pb):null,df=b?Math.round((pv.v-b)*10)/10:0;
    const bd=rollBand(seriesFor(60,fn).filter(p=>p.v!=null).map(p=>({d:p.date,v:p.v})),0.5),lb=last(bd),watch=lb?(lb.lo+lb.hi)/2+TH.ILL_RESP:null;
    return{title:'Breathing rate, asleep',val:pv.v.toFixed(1)+' /min',sub:pv.age?`from ${fmtD(dAgo(pv.age))}`:'last night',
      usual:b?`${b.toFixed(1)} /min over ${pb.length} days`:`Building: ${pb.length} of ${RB_MIN} days`,trend:dtTrend(fn,v=>v.toFixed(1)+' /min',{label:'Breathing rate',color:'--teal',yfmt:v=>v.toFixed(1),band:0.5,txt:BAND_TXT.resp,
        lines:watch!=null?[{v:watch,label:'Illness watch',color:'--amber'}]:[],stats:{good:dtIn(-1),label:'in or below your usual range'}}),
      effect:`It does not change the score. ${!b?'':df<=1?'Normal for you. ':df<=2?'A little above usual: a hard day, or early signs of a cold. ':'Well above usual: an early sign of illness or poor recovery. '}It feeds the illness check: a breath a minute or more above usual, together with resting heart rate up or heart rate variability down, means rest today.`,
      link:['Open Settings','openSettings()']};
  }
  if(k==='soreness'){
    const ci=last(d.checkins.filter(c=>ciFull(c)&&fresh(c))),fn=dt=>{const c=ciOn(dt);return c&&c.soreness?c.soreness:null;},u=dtAvg(fn),s=ci&&ci.soreness;
    // bars from None (no bar) to Severe, as in the Trends soreness chart
    const tr=dtTrend(dt=>{const v=fn(dt);return v==null?null:v-1;},v=>EM.soreness[Math.round(v)+1]||'',{bar:true,color:'--red',label:'Soreness',min:0,max:3,yfmt:v=>String(Math.round(v)),
      barColor:v=>v>=3?'--red':v>=2?'--red/.65':'--red/.35',stats:{good:v=>v<2,label:'none or mild'},
      means:info=>{const m=info.pts.filter(p=>p.v>=2);return m.length?`Moderate or worse on ${m.length} of ${info.n} days, the latest ${fmtD(last(m).d)}.`:`None or mild on all ${info.n} days in view.`;}});
    if(!s)return{title:'Soreness',missing:'Not rated in the last three days. Soreness is part of the check-in.',link:['Check in',"logGo('lCheckin')"],trend:tr};
    return{title:'Soreness',val:EM.soreness[s],sub:`level ${s} of 4${ci.date!==t?` · from ${daysAgo(ci.date)===1?'yesterday':fmtD(ci.date)}, until you check in today`:''}`,
      usual:u.length?`${EM.soreness[Math.round(avg(u))]} over ${u.length} days`:'Needs more days',trend:tr,
      effect:bodyLive()?`No effect on Body. It shapes today's session instead.${s>=3?' Three days in a row at this level is worth logging as an injury.':''}`:s>=2?`${cap(dtPts(-(s-1)*4))} on recovery: 4 points for every level above mild.${s>=3?' Three days in a row at this level is worth logging as an injury.':''}`:'No effect: only soreness above mild takes points off.',
      link:['Edit in Log',"logGo('lCheckin')"]};
  }
  if(k==='coffee'){
    const ci=todayCI(),fn=dt=>{const c=ciOn(dt);return c?c.coffee||0:null;},u=dtAvg(fn);
    return{title:'Coffee',val:ci?(ci.coffee||0)+(ci.coffee===4?'+ cups':ci.coffee===1?' cup':' cups'):'Not logged',sub:ci&&ci.coffeeLate?'including a cup after 14:00':'none after 14:00',
      usual:u.length?`${Math.round(avg(u)*10)/10} cups a day over ${u.length} days`:'Needs more days',trend:dtTrend(fn,v=>Math.round(v)+(Math.round(v)>=4?'+':'')+(Math.round(v)===1?' cup':' cups'),{bar:true,color:'--t2',label:'Coffee',min:0,max:4,yfmt:v=>String(Math.round(v)),
        barColor:v=>v>=3?'--amber':'--t2',lines:[{v:3,label:'3+ cups',color:'--amber'}],stats:{good:v=>v<3,label:'under 3 cups',avg:'average'},
        means:info=>{const l=info.pts.filter(p=>{const c=ciOn(p.d);return c&&c.coffeeLate;}).length;const c=Math.round(info.avg*10)/10;return`About ${c} cup${c===1?'':'s'} a day in view`+(l?`, with a cup after 14:00 on ${l} day${l>1?'s':''}.`:', none after 14:00.');}}),
      effect:'Shown only. A late cup can cut deep sleep tonight; the Trends tab compares your coffee with the next night\'s sleep.',link:['Edit in Log',"logGo('lCheckin')"]};
  }
  if(k==='injury'){
    const inj=d.injuries.filter(i=>i.active);
    if(!inj.length)return{title:'Injuries',missing:'No active injuries. Log a niggle under Injury so recovery and the week plan allow for it.',link:['Log an injury',"logGo('lInjury')"]};
    const m=Math.max(...inj.map(i=>i.sev));
    return{title:'Injuries',val:inj.length===1?esc(inj[0].part):inj.length+' active',sub:inj.map(i=>`${esc(i.part)} (${['','mild','moderate','severe'][i.sev]}, since ${fmtD(i.date)})`).join(' · '),
      usual:'',effect:bodyLive()?'No effect on Body. A severe injury sets the verdict to Rest; moderate ones keep hard days off the plan.':`${cap(dtPts(-m*8))} on recovery: 8 points per level of the worst injury. Hard days are off the plan with a moderate injury.`,link:['Edit in Log',"logGo('lInjury')"]};
  }
  if(k==='strain'){
    const load=dayLoad(t),st=strainOf(load),ref=strainRef(),tg=strainTarget(),fn=dt=>{const l=dayLoad(dt);return l?strainOf(l):0;},ws=d.workouts.filter(w=>w.date===t);
    const u=dtAvg(fn).filter(v=>v>0),hard=strainOf(ref);
    return{title:'Strain',val:load?st.toFixed(1):'0',sub:ws.length?ws.map(w=>esc(w.type)+(w.durMin?' '+fmtDur(w.durMin):'')).join(', '):restToday()?'Planned rest day':'Nothing logged yet today',
      usual:u.length?`${(avg(u)).toFixed(1)} on training days, hard day about ${hard.toFixed(1)}`:'Needs more training days',
      trend:dtTrend(dt=>{const l=dayLoad(dt);return l?strainOf(l):null;},v=>v.toFixed(1),{bar:true,color:'--t2',label:'Strain',yfmt:v=>Math.round(v),
        barColor:v=>v>=hard?'--text':'--t2',lines:[{v:hard,label:'Hard day',color:'--t3'}],stats:{avg:'average on training days',unit:'training days',one:'training day',good:v=>v<hard,label:'below a hard day'},
        means:info=>{const h=info.pts.filter(p=>p.v>=hard);return`${info.n} training day${info.n!==1?'s':''} in view`+(h.length?`, ${h.length} at hard-day strain or more, the latest ${fmtD(last(h).d)}. Hard days need an easy day after them.`:', none as hard as a hard day.');}}),
      effect:`Strain measures today, it does not change recovery. ${tg?`Today's target is ${tg[0]} to ${tg[1]} from your verdict${load?(st>tg[1]?', and you are above it.':st<tg[0]?', so there is room for more.':', and you are in it.'):'.'}`:'A target range appears once you have a recovery score.'} Tomorrow's recovery will reflect it.`,
      link:['Log a workout',"logGo('lWorkout')"]};
  }
  if(k==='recovery'&&bodyLive()){
    // v118: Body is the hero score after the parallel run: HRV, resting heart rate and sleep only, each against your own band
    const B=calcBody(),sc=B.score,h=d.bodyHist||{},fn=dt=>dt===t?sc:(h[dt]??null),u=dtAvg(fn);
    if(sc==null)return{title:'Body',missing:'No Body score yet: it needs heart rate variability or resting heart rate from your watch. Tap Sync in Settings.',link:['Open Settings','openSettings()']};
    const tr=dtTrend(fn,v=>Math.round(v),{label:'Body',color:'--gold-dk',min:0,max:100,zones:scoreZones(),stats:{good:v=>v>=scoreCuts().warn,label:'good'},means:scoreMeaning});
    const P=B.parts,rows=[];
    rows.push([`Heart rate variability · ${TH.W_HRV}%`,P.hrv?`${Math.round(P.hrv.pts)} of 100`:'missing']);
    rows.push([`Resting heart rate · ${TH.W_RHR}%`,P.rhr?`${Math.round(P.rhr.pts)} of 100`:'missing']);
    rows.push([`Sleep · ${TH.W_SLEEP}%`,P.sleep?`${Math.round(P.sleep.pts)} of 100`:'missing']);
    const miss=B.missing.length?`<div class="dt-note">Missing today: ${B.missing.map(m=>m.why).join('; ')}. The other parts carry its weight, so confidence is low.</div>`:'';
    return{title:'Body',val:sc,sub:scoreWord(sc)+(B.conf==='low'?' · low confidence':''),
      usual:u.length?`${Math.round(avg(u))} over ${u.length} days`:'Needs more days',trend:tr,
      effect:`<div class="dt-parts">${rows.map(([l,v])=>`<div class="dt-row"><span>${l}</span><b>${v}</b></div>`).join('')}</div>${miss}Green from ${TH.BODY_GREEN}, yellow from ${TH.BODY_YELLOW}. Form, check-ins, soreness and injuries are not in Body: they shape the week plan and today's session instead.`,
      link:['Open Settings','openSettings()']};
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
    return{title:'Recovery',val:sc,sub:scoreWord(sc),
      usual:u.length?`${Math.round(avg(u))} over ${u.length} days`:'Needs more days',trend:dtTrend(fn,v=>Math.round(v),{label:'Readiness',color:'--gold-dk',min:20,max:100,zones:scoreZones(),stats:{good:v=>v>=scoreCuts().warn,label:'good or primed'},means:scoreMeaning}),
      effect:`<div class="dt-parts">${parts.map(([l,v])=>`<div class="dt-row"><span>${l}</span><b>${v}</b></div>`).join('')}</div>Tap a row under the gauges for the detail of each one.${(()=>{const b=calcBody().score,n=Object.values(d.bodyHist||{}).filter(v=>v!=null).length;return b!=null?`<div class="dt-note">New: Body, from heart rate variability, resting heart rate and sleep only, is ${b} today. It runs alongside this score for ${TH.PARALLEL_DAYS} days (${Math.min(n,TH.PARALLEL_DAYS)} of ${TH.PARALLEL_DAYS} recorded), then takes over.</div>`:'';})()}`,
      link:['Edit in Log',"logGo('lCheckin')"]};
  }
  return null;
}
// again: a re-render of the open sheet (refreshDetail), which never asks the network
function openDetail(k,again){
  if(k!==_dtKey)_dtDate=null;           // a new sheet starts on last night
  _dtCh=null;chUnmount('dtChart');
  const wk=/^wk:/.test(k);
  if(wk&&!again)wkOpen(k.slice(3));
  if(!wk){_wkC=null;_wkRes=null;}
  const sp=dtSpec(k),el=$('dtModal');if(!sp||!el)return;
  _dtKey=k;$('dtTitle').firstChild.textContent=sp.title+' ';
  // v122: a sheet that builds its own body (the workout sheet); open notes and the chart's focus survive a re-render
  if(sp.html!=null){
    const b=$('dtBody'),op=again?[...b.querySelectorAll('details[data-k][open]')].map(x=>x.dataset.k):[];
    const fc=again&&document.activeElement&&document.activeElement.classList.contains('wk-cv');
    b.innerHTML=sp.html;
    if(!again){const m=el.querySelector('.modal');if(m)m.scrollTop=0;}
    el.classList.add('open');
    wkMount();
    op.forEach(x=>{const e=b.querySelector(`details[data-k="${x}"]`);if(e)e.open=true;});
    if(fc){const c=b.querySelector('.wk-cv');if(c)c.focus({preventScroll:true});}
    return;
  }
  let h=sp.nav||'';
  if(sp.missing)h+=`<div class="dt-miss">${sp.missing}</div>`;
  else h+=`<div class="dt-big">${sp.val}</div><div class="dt-sub">${sp.sub||''}</div>${sp.usual?`<div class="dt-row dt-usual"><span>Usual, 30 days</span><b>${sp.usual}</b></div>`:''}`;
  h+=sp.trend||'';
  if(sp.effect)h+=`<div class="dt-sec">Effect on recovery</div><div class="dt-eff">${sp.effect}</div>`;
  h+=sp.extra||'';
  if(sp.link)h+=`<button class="btn-out dt-link" onclick="closeDetail();${sp.link[1]}">${sp.link[0]}</button>`;
  $('dtBody').innerHTML=h;el.classList.add('open');
  if(_dtCh&&$('dtChart'))mountChart('dtChart',{key:'dt'+k,..._dtCh});
}
function closeDetail(){_dtKey=null;_dtDate=null;_dtCh=null;_wkC=null;_wkRes=null;chUnmount('dtChart');const el=$('dtModal');if(el)el.classList.remove('open');}
function refreshDetail(){if(_dtKey)openDetail(_dtKey,1);}
