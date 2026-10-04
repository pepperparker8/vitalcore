// ── TRENDS TAB: charts + calendar in one place ───────────────────────────────
let _trView='charts',_spSport='Run';
function setTrView(v){
  _trView=v;
  $('trCharts').style.display=v==='charts'?'block':'none';$('trCal').style.display=v==='cal'?'block':'none';
  $('segCharts').classList.toggle('active',v==='charts');$('segCal').classList.toggle('active',v==='cal');
  renderTrendsTab();
}
function renderTrendsTab(){
  if(_trView==='cal'){renderCalendar();renderBests();renderWeekSum();return;}
  renderWeekBanner();renderBurnout();renderSleepBars();
  requestAnimationFrame(()=>{renderTrends();renderWtChart();renderStrTrend();renderSportTrend();renderFormChart();renderReadTrend();renderRecTrend();renderLoad();renderProgress();});
}
// weekly distance for one sport, over the selected range (at least 4 weeks)
function renderSportTrend(){
  const d=S(),sports=['Run','Cycle','Swim','Hike','Walk'],swim=_spSport==='Swim';
  $('spChips').className='chip-row sp';$('spChips').innerHTML=sports.map(s=>`<button class="chip ${s===_spSport?'sel':''}" onclick="_spSport='${s}';renderSportTrend()">${ICON[s]} ${s}</button>`).join('');
  const wks=Math.max(4,Math.round(_range/7));
  const every=d.workouts.filter(w=>w.type===_spSport&&w.distKm>0),all=every.filter(w=>daysAgo(w.date)<wks*7);
  const fmt=v=>swim?Math.round(v*1000)+' m':(Math.round(v*10)/10)+' km';
  if(!every.length){
    $('spSum').textContent='';$('spBars').innerHTML='';
    $('spNote').textContent=`No ${_spSport.toLowerCase()} distance logged yet. Log one in the Log tab.`;return;
  }
  const tot=all.reduce((a,w)=>a+w.distKm,0),tm=all.reduce((a,w)=>a+(w.durMin||0),0);
  $('spSum').textContent=all.length?`${fmt(tot)} · ${all.length} session${all.length!==1?'s':''}, last ${wks} weeks`:`none in the last ${wks} weeks`;
  // every week from the first one with this sport, empty weeks included, so "usual" counts the weeks you skipped
  const by=new Map(weekBuckets(every.map(w=>({d:w.date,v:w.distKm}))).map(w=>[DN(w.d),w.v])),f0=Math.min(...by.keys()),now=DN(td()),nowW=now-((now+3)%7+7)%7,wk=[];
  for(let k=f0;k<=nowW;k+=7){const prev=[1,2,3,4].map(i=>k-i*7).filter(x=>x>=f0);wk.push({d:ND(k),v:by.get(k)||0,base:prev.length?prev.reduce((a,x)=>a+(by.get(x)||0),0)/prev.length:null});}
  const bw={};wk.forEach(w=>bw[w.d]=w);
  if(every.length<2&&wk.length<2)$('spBars').innerHTML='<div class="vc-empty">One session so far. Log another to see the weekly trend.</div>';
  else mountChart('spBars',{key:'sp'+_spSport,H:140,span:84,label:_spSport+' distance per week',yfmt:v=>swim?Math.round(v*1000):Math.round(v),
    series:[{name:'Distance',type:'bar',w:7,color:'--t2',fmt,pts:wk.filter(w=>w.v>0).map(w=>({d:w.d,v:w.v})),barColor:(v,dt)=>dt===ND(nowW)?'--t2/.55':'--t2'},
      {name:'Usual',color:'--text',dash:[4,4],thin:true,noDots:true,fmt,pts:wk.filter(w=>w.base).map(w=>({d:ND(DN(w.d)+3),v:w.base}))}],
    hi:true,stats:{avg:'average active week',unit:'weeks',one:'week'},
    extra:dt=>{const w=bw[dt];if(!w)return'';const s=every.filter(x=>x.date>=dt&&DN(x.date)<DN(dt)+7);return`${s.length} session${s.length!==1?'s':''}`+(w.base?` · ${Math.round(w.v/w.base*100)}% of usual`:'')+(dt===ND(nowW)?' (so far)':'');},
    means:info=>{
      const w=bw[info.last.d],s=every.filter(x=>x.date>=info.from&&x.date<=info.to);
      let t=w?`${w.d===ND(nowW)?'This week so far':'Week of '+fmtD(w.d)}: ${fmt(w.v)}`+(w.base?`, ${Math.round(w.v/w.base*100)}% of your usual ${fmt(w.base)} a week.`:'.'):'';
      if(s.length){const lg=s.reduce((a,x)=>x.distKm>a.distKm?x:a);t+=` ${s.length} session${s.length!==1?'s':''} in view; the longest ${fmt(lg.distKm)} on ${fmtD(lg.date)}.`;}
      return t;},
    how:`Each bar is one week, Monday to Sunday; the latest is lighter because it is not finished. The dashed line is your usual week: the average of the 4 weeks before, counting weeks you did no ${_spSport.toLowerCase()}. Distance that rises a little week to week builds endurance; a long session much bigger than usual is where niggles start.`});
  let pace='';
  if(tm>0){
    if(swim)pace=`Average pace over the last ${wks} weeks: ${fmtPace(tm/(tot*10))} per 100 m.`;
    else if(_spSport==='Cycle')pace=`Average speed over the last ${wks} weeks: ${(tot/(tm/60)).toFixed(1)} km/h.`;
    else pace=`Average pace over the last ${wks} weeks: ${fmtPace(tm/tot)} per km.`;
  }
  $('spNote').textContent=pace;
}

// ── Weekly load: tap a bar for the sport breakdown; amber = jump vs recent weeks ──
let _ldMetric='min',_ldWeeks=8;
const LD_M={min:['Hours',w=>w.durMin||0,v=>fmtDur(Math.round(v))],km:['Distance',w=>w.type==='Swim'?0:(w.distKm||0),v=>(Math.round(v*10)/10)+' km'],n:['Sessions',()=>1,v=>Math.round(v)+(Math.round(v)===1?' session':' sessions')]};
function setLd(k,v){if(k==='m')_ldMetric=v;renderLoad();}
// weekly totals, Monday to Sunday, the last n weeks (the coach card reads the last 8); jump = % over the 4 weeks before, complete weeks only
function loadWeeks(n){
  const d=S(),f=LD_M[_ldMetric][1],out=[];n=n||_ldWeeks;
  const mon=new Date(td()+'T12:00:00');mon.setDate(mon.getDate()-((mon.getDay()+6)%7));
  for(let w=n-1;w>=0;w--){
    const a=new Date(mon);a.setDate(a.getDate()-w*7);const b=new Date(a);b.setDate(b.getDate()+7);
    const A=ymd(a),B=ymd(b),ws=d.workouts.filter(x=>x.date>=A&&x.date<B),by={};
    ws.forEach(x=>{const v=f(x);if(v)by[x.type]=(by[x.type]||0)+v;});
    out.push({start:A,total:Object.values(by).reduce((s,x)=>s+x,0),by});
  }
  out.forEach((o,i)=>{const prev=out.slice(Math.max(0,i-4),i).filter(x=>x.total>0);const b=prev.length?avg(prev.map(x=>x.total)):null;o.jump=b&&o.total>b*TH.RAMP_CAUTION&&!(i===out.length-1)?Math.round((o.total/b-1)*100):null;o.base=b;});
  return out;
}
// how a week compares with the 4 before it: 'high' from TH.RAMP_HIGH, 'jump' from TH.RAMP_CAUTION
const ldRamp=w=>!w||!w.base||!w.total?null:w.total>=w.base*TH.RAMP_HIGH?'high':w.total>=w.base*TH.RAMP_CAUTION?'jump':null;
function loadMeaning(info,wk,fm){
  const by={};wk.forEach(w=>by[w.start]=w);
  const cur=by[info.last.d],done=info.pts.filter(p=>p.d!==wk[wk.length-1].start),j=done.filter(p=>ldRamp(by[p.d]));
  let t='';
  if(cur&&cur===wk[wk.length-1])t=`This week so far: ${fm(cur.total)}`+(cur.base?`, ${Math.round(cur.total/cur.base*100)}% of your usual ${fm(cur.base)}.`:'.');
  else if(cur)t=`Week of ${fmtD(cur.start)}: ${fm(cur.total)}`+(cur.base?`, ${Math.round(cur.total/cur.base*100)}% of the usual ${fm(cur.base)} before it.`:'.');
  if(j.length){const l=by[last(j).d];t+=` ${j.length} week${j.length>1?'s':''} here jumped more than ${Math.round((TH.RAMP_CAUTION-1)*100)}% over the 4 weeks before, the latest the week of ${fmtD(l.start)} (+${Math.round((l.total/l.base-1)*100)}%). Big jumps are when overuse injuries tend to start; follow one with a similar or easier week.`;}
  else if(done.length>=3)t+=` No week here jumped more than ${Math.round((TH.RAMP_CAUTION-1)*100)}% over the weeks before: a steady build.`;
  return t;
}
function renderLoad(){
  const el=$('loadCard');if(!el)return;
  const d=S(),first=d.workouts.reduce((a,w)=>!a||w.date<a?w.date:a,null);
  const fm=LD_M[_ldMetric][2],seg=opts=>opts.map(([v,l])=>`<button class="${_ldMetric===v?'active':''}" onclick="setLd('m','${v}')">${l}</button>`).join('');
  if(!first){el.innerHTML='<div class="sec">Training load by week</div><div class="empty-state" style="padding:8px 0"><div class="empty-title">No workouts yet</div><div class="empty-sub">Log a workout and weekly load builds here.</div><button class="empty-btn" onclick="switchTab(\'log\');openLog(\'lWorkout\')">Log a workout</button></div>';return;}
  // every week from the first workout (at least 8), so the chart can pan back through all of it
  const wk=loadWeeks(Math.max(8,Math.ceil(daysAgo(first)/7)+1)),by={};wk.forEach(w=>by[w.start]=w);
  const host=el.querySelector('#ldCanvas');
  if(!host)el.innerHTML='<div class="sec">Training load by week</div><div class="ld-seg" id="ldSeg"></div><div id="ldCanvas"></div>';
  $('ldSeg').innerHTML=seg([['min','Time'],['km','Distance'],['n','Sessions']]);
  const yf=_ldMetric==='min'?v=>Math.round(v/60)+'h':_ldMetric==='km'?v=>Math.round(v):v=>Math.round(v);
  mountChart('ldCanvas',{key:'load'+_ldMetric,H:170,span:84,label:'Training load by week',yfmt:yf,
    series:[{name:LD_M[_ldMetric][0],type:'bar',w:7,color:'--t2',fmt:fm,pts:wk.filter(w=>w.total>0).map(w=>({d:w.start,v:w.total})),
        barColor:(v,dt)=>{const r=ldRamp(by[dt]);return r==='high'?'--red':r==='jump'?'--amber':dt===wk[wk.length-1].start?'--t2/.55':'--t2';}},
      {name:'Usual',color:'--text',dash:[4,4],thin:true,noDots:true,fmt:fm,pts:wk.filter(w=>w.base).map(w=>({d:ND(DN(w.start)+3),v:w.base}))}],
    hi:true,
    extra:dt=>{const w=by[dt];if(!w)return'';const parts=Object.entries(w.by).sort((a,b)=>b[1]-a[1]).map(([t,v])=>`${t} ${fm(v)}`);const r=w.base?` · ${Math.round(w.total/w.base*100)}% of usual`:'';return(parts.join(' · ')||'Nothing logged')+r+(w===wk[wk.length-1]?' (so far)':'');},
    stats:{good:(v,dt)=>!ldRamp(by[dt]),label:'without a big jump',unit:'weeks',avg:'weekly average',one:'week'},
    means:info=>loadMeaning(info,wk,fm),
    how:`Each bar is one week, Monday to Sunday; the latest is lighter because it is not finished. The dashed line is your usual week: the average of the 4 weeks before. Amber: ${Math.round((TH.RAMP_CAUTION-1)*100)}% or more above that usual, a big jump. Red: ${Math.round((TH.RAMP_HIGH-1)*100)}% or more above it, too fast. Fitness grows from steady weeks; most overuse injuries follow a sudden jump. Tap a bar to see the sports in that week.`});
}
