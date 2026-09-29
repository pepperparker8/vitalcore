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
  renderWeekBanner();renderBurnout();renderSleepBars();renderHRVSpark();
  requestAnimationFrame(()=>{renderTrends();renderWtChart();renderStrTrend();renderSportTrend();renderFormChart();renderReadTrend();});
}
// weekly distance for one sport, over the selected range (at least 4 weeks)
function renderSportTrend(){
  const d=S(),sports=['Run','Cycle','Swim','Hike','Walk'],swim=_spSport==='Swim';
  $('spChips').className='chip-row sp';$('spChips').innerHTML=sports.map(s=>`<button class="chip ${s===_spSport?'sel':''}" onclick="_spSport='${s}';renderSportTrend()">${ICON[s]} ${s}</button>`).join('');
  const wks=Math.max(4,Math.round(_range/7)),ser=[];
  for(let i=wks-1;i>=0;i--){
    const ws=d.workouts.filter(w=>w.type===_spSport&&daysAgo(w.date)>=i*7&&daysAgo(w.date)<i*7+7);
    ser.push({date:dAgo(i*7+6),v:ws.reduce((a,w)=>a+(w.distKm||0),0),wk:true,n:ws.length});
  }
  const all=d.workouts.filter(w=>w.type===_spSport&&daysAgo(w.date)<wks*7&&w.distKm>0);
  const fmt=v=>swim?Math.round(v*1000)+' m':(Math.round(v*10)/10)+' km';
  if(!all.length){
    $('spSum').textContent='';$('spBars').innerHTML='';
    $('spNote').textContent=`No ${_spSport.toLowerCase()} distance logged in this period. Log one in the Log tab.`;return;
  }
  const tot=all.reduce((a,w)=>a+w.distKm,0),tm=all.reduce((a,w)=>a+(w.durMin||0),0);
  $('spSum').textContent=`${fmt(tot)} · ${all.length} session${all.length!==1?'s':''}`;
  $('spBars').innerHTML=barsHTML(ser,'train',Math.max(swim?1:5,...ser.map(x=>x.v)));
  let pace='';
  if(tm>0){
    if(swim)pace=`Average pace ${fmtPace(tm/(tot*10))} per 100 m`;
    else if(_spSport==='Cycle')pace=`Average speed ${(tot/(tm/60)).toFixed(1)} km/h`;
    else pace=`Average pace ${fmtPace(tm/tot)} per km`;
  }
  $('spNote').textContent=`Each bar is one week (labels show the first day). ${pace}`;
}
