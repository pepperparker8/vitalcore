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
  requestAnimationFrame(()=>{renderTrends();renderWtChart();renderStrTrend();renderSportTrend();renderFormChart();renderReadTrend();renderLoad();renderProgress();});
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

// ── Weekly load: tap a bar for the sport breakdown; amber = jump vs recent weeks ──
let _ldMetric='min',_ldWeeks=8,_ldSel=null;
const LD_M={min:['Hours',w=>w.durMin||0,v=>fmtDur(Math.round(v))],km:['Distance',w=>w.type==='Swim'?0:(w.distKm||0),v=>(Math.round(v*10)/10)+' km'],n:['Sessions',()=>1,v=>v+(v===1?' session':' sessions')]};
function setLd(k,v){if(k==='m')_ldMetric=v;else _ldWeeks=v;_ldSel=null;renderLoad();}
function loadWeeks(){
  const d=S(),f=LD_M[_ldMetric][1],out=[];
  const mon=new Date(td()+'T12:00:00');mon.setDate(mon.getDate()-((mon.getDay()+6)%7));
  for(let w=_ldWeeks-1;w>=0;w--){
    const a=new Date(mon);a.setDate(a.getDate()-w*7);const b=new Date(a);b.setDate(b.getDate()+7);
    const A=ymd(a),B=ymd(b),ws=d.workouts.filter(x=>x.date>=A&&x.date<B),by={};
    ws.forEach(x=>{const v=f(x);if(v)by[x.type]=(by[x.type]||0)+v;});
    out.push({start:A,total:Object.values(by).reduce((s,x)=>s+x,0),by});
  }
  out.forEach((o,i)=>{const prev=out.slice(Math.max(0,i-4),i).filter(x=>x.total>0);const b=prev.length?avg(prev.map(x=>x.total)):null;o.jump=b&&o.total>b*1.25&&!(i===out.length-1)?Math.round((o.total/b-1)*100):null;o.base=b;});
  return out;
}
function renderLoad(){
  const el=$('loadCard');if(!el)return;
  const wk=loadWeeks(),fm=LD_M[_ldMetric][2];
  const seg=(k,opts)=>opts.map(([v,l])=>`<button class="${(k==='m'?_ldMetric:_ldWeeks)===v?'active':''}" onclick="setLd('${k}',${typeof v==='string'?`'${v}'`:v})">${l}</button>`).join('');
  if(!wk.some(x=>x.total>0)){el.innerHTML='<div class="sec">Training load by week</div><div class="empty-state" style="padding:8px 0"><div class="empty-title">No workouts in this period</div><div class="empty-sub">Log a workout and weekly load builds here.</div><button class="empty-btn" onclick="switchTab(\'log\');openLog(\'lWorkout\')">Log a workout</button></div>';return;}
  const sel=_ldSel==null?wk.length-1:_ldSel,cur=wk[sel];
  el.innerHTML=`<div class="sec">Training load by week</div>
    <div class="ld-seg">${seg('m',[['min','Time'],['km','Distance'],['n','Sessions']])}</div><div class="ld-seg">${seg('w',[[4,'4 wk'],[8,'8 wk'],[12,'12 wk']])}</div>
    <div class="ld-bars">${(()=>{const mx=Math.max(...wk.map(x=>x.total))||1;return wk.map((x,i)=>`<button class="ld-b${i===sel?' sel':''}${x.jump?' hot':''}" onclick="_ldSel=${i};renderLoad()" aria-label="Week of ${x.start}"><span class="ld-bar" style="height:calc((100% - 16px) * ${Math.max(0.02,x.total/mx).toFixed(3)})"></span><span class="ld-l">${x.start.slice(5).replace('-','/')}</span></button>`).join('');})()}</div>
    <div class="ld-det"><div class="ld-t">Week of ${cur.start} · <b>${fm(cur.total)}</b>${sel===wk.length-1?' (so far)':''}</div>
      ${Object.entries(cur.by).sort((a,b)=>b[1]-a[1]).map(([t,v])=>`<div class="hist-row"><span>${ICON[t]||''} ${t}</span><span class="hist-val">${fm(v)}</span></div>`).join('')||'<div class="set-note">Nothing logged this week.</div>'}
      ${cur.jump?`<div class="dg-out"><b>Big jump</b><br>${cur.jump}% above your recent weekly average. Sudden increases raise injury risk. Keep the next week similar or easier.</div>`:cur.base?`<div class="set-note">Recent weekly average: ${fm(cur.base)}.</div>`:''}</div>`;
}
