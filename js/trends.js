// ── TRENDS TAB: charts + calendar in one place ───────────────────────────────
let _trView='charts',_spSport='Run';
function setTrView(v){
  _trView=v;
  $('trCharts').style.display=v==='charts'?'block':'none';$('trCal').style.display=v==='cal'?'block':'none';
  $('segCharts').classList.toggle('active',v==='charts');$('segCal').classList.toggle('active',v==='cal');
  renderTrendsTab();
}
// v128: one range bar for every chart on the page (group 'trends'), an ⓘ on every card, a header with today and the window
const TR_R=[7,30,90,365];
const TR_INFO={read:'How ready your body is for training today, from 0 to 100, against your own usual. Higher means ready for a harder day.',
 hrv:'The small changes in time between heartbeats, measured while you sleep. Above your usual usually means you have recovered; below can mean stress, hard training, short sleep or illness.',
 rhr:'Your heart rate at full rest. A few beats over your usual can mean fatigue, stress, alcohol or a cold coming on.',
 resp:'Breaths a minute while you sleep. It barely changes, so a clear rise together with a higher heart rate can be an early sign of illness.',
 sleep:'Time actually asleep, not time in bed. Your body repairs from training while you sleep, and short nights add up.',
 load:'How much you trained. Building slowly lifts fitness; a week more than a quarter over your usual raises the risk of injury and illness.',
 form:'Fitness grows over weeks of training, fatigue over the last few days. Form is the difference: below zero you are building, above zero you are fresh.',
 pr:'Your best efforts over time, such as fastest pace or heaviest lift. New bests show the training is working.',
 dist:'How far you went in each sport. Distance that grows without big jumps keeps long runs and rides safe.',
 str:`Hard sets per muscle each week. About ${TH.SETS_LO} to ${TH.SETS_HI} builds strength; fewer keeps what you have.`,
 mood:'Your daily check-in: mood, energy, calm and motivation in one score. A few low days in a row are worth a lighter day.',
 bo:'How your mood, energy and calm have run over your last 7 check-ins. High means you need a lighter week, not more effort.',
 mind:'Minutes of mindfulness or breathing practice. Short, regular sessions help calm and sleep.',
 wt:'Your weight with a 7-day average, which smooths out day-to-day swings from water and food.',
 sore:'How sore you felt each day and how many coffees you had. Coffee after 14:00 can shorten that night\'s sleep.'};
const TR_I_SVG='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0"/><path d="M12 9h.01"/><path d="M11 12h1v4h1"/></svg>';
let _trInf={},_trT=null,_trSK='';
// the ⓘ button after each card title and its text under it, added once; which ones are open survives re-renders
function trDecor(){
  document.querySelectorAll('#trCharts .kh[data-i]').forEach(h=>{if(h.querySelector('.ib'))return;const k=h.dataset.i,t=h.querySelector('b').textContent;
    h.insertAdjacentHTML('beforeend',`<button class="ib" aria-label="About ${esc(t)}" aria-expanded="false" aria-controls="inf-${k}" onclick="trInfo('${k}')">${TR_I_SVG}</button>`);
    h.insertAdjacentHTML('afterend',`<div class="inf" id="inf-${k}" hidden>${esc(TR_INFO[k]||'')}</div>`);});
  Object.keys(TR_INFO).forEach(k=>trInfoSet(k,!!_trInf[k]));
}
function trInfoSet(k,on){const h=document.querySelector(`#trCharts .kh[data-i="${k}"]`),b=h&&h.querySelector('.ib'),p=$('inf-'+k);if(!b||!p)return;b.classList.toggle('on',on);b.setAttribute('aria-expanded',on);p.hidden=!on;}
function trInfo(k){_trInf[k]=!_trInf[k];trInfoSet(k,_trInf[k]);}
// the window: [end-n+0.5, end+0.5] in day numbers
function trView(){const g=_chG.trends,T=DN(td());return g?g.view:[T-TH.TR_DEF+0.5,T+0.5];}
function trSpan(){const v=trView();return Math.round(v[1]-v[0]);}
function trEnd(){return ND(Math.min(Math.floor(trView()[1]),DN(td())));}
function trGo(n){const T=DN(td());chGSet('trends',[T-n+0.5,T+0.5]);}
function trShift(f){const v=trView(),s=v[1]-v[0],T=DN(td())+0.5;let a=v[0]+s*f,b=v[1]+s*f;if(b>T){b=T;a=b-s;}chGSet('trends',[a,b]);}
function trLo(){let lo=null;Object.values(_ch).forEach(o=>{if(o.on&&o.tr&&o.cfg.group==='trends'&&(lo==null||o.dmin<lo))lo=o.dmin;});return lo==null?null:lo-0.5;}
// the window and the one before it: a total (tot) or a mean; the earlier one only with enough data in it
function trAgg(pts,x,tot){
  const inR=(p,f,t)=>p.v!=null&&p.d>=f&&p.d<=t,cur=pts.filter(p=>inR(p,x.from,x.to)),prv=pts.filter(p=>inR(p,x.pfrom,x.pto)),sum=a=>a.reduce((s,p)=>s+p.v,0);
  if(tot){const first=pts.reduce((m,p)=>!m||p.d<m?p.d:m,null);return{v:sum(cur),pv:first&&DN(first)<=DN(x.pfrom)+x.n/2?sum(prv):null};}
  return{v:cur.length?sum(cur)/cur.length:null,pv:prv.length>=Math.max(2,Math.ceil(x.n/4))?sum(prv)/prv.length:null};
}
const trRl=(n,tot)=>(n===365?'1-year':n+'-day')+(tot?' total':' average');
function trCh(v,pv,r,fmt){if(v==null||pv==null)return{};const dv=r(v)-r(pv);return{dv,dd:fmt(Math.abs(dv))};}
// the right half of a header: the window's average or total and the change on the window before
function trRight(pts,x,o){const g=trAgg(pts,x,o.tot);if(g.v==null)return{};const[rv,ru]=o.f(g.v);
  return{rl:o.rl||trRl(x.n,o.tot),rv,ru,...trCh(g.v,g.pv,o.r||Math.round,v=>o.f(v).join(' ').trim())};}
// the value on the left: that day, or that week (a total or a mean)
function trLeft(pts,x,tot){
  if(x.wk){const a=DN(x.d),w=pts.filter(p=>p.v!=null&&DN(p.d)>=a&&DN(p.d)<=a+6),s=w.reduce((t,p)=>t+p.v,0);return w.length?(tot?s:s/w.length):tot?0:null;}
  const p=pts.find(q=>q.d===x.d);return p?p.v:tot?0:null;
}
// what n days usually hold: the mean day of the TH.TR_USUAL days before the window, times n (needs TH.MIN_BASE_DAYS of history)
function trUsual(pts,from,n,first){
  if(!first)return null;const f=DN(from),b=f-1,a=Math.max(f-TH.TR_USUAL,DN(first));
  if(DN(first)>f-TH.MIN_BASE_DAYS||b<a)return null;
  const s=pts.reduce((t,p)=>{const x=DN(p.d);return p.v!=null&&x>=a&&x<=b?t+p.v:t;},0);
  return s>0?s/(b-a+1)*n:null;
}
// training days in a row up to today (or yesterday when today has none yet); yoga and short walks do not count
function trRunDays(thr){
  const s=new Set(S().workouts.filter(w=>stTrains(w,thr)).map(w=>w.date));
  let d=DN(td()),n=0;if(!s.has(ND(d)))d--;
  while(s.has(ND(d))){n++;d--;}
  return n;
}
// the range bar follows the window: the lit chip, the dates, ‹ › and the strength bars
function trOnView(){
  const v=trView(),T=DN(td()),now=Math.abs(v[1]-(T+0.5))<0.01,a=Math.ceil(v[0]),end=Math.min(Math.floor(v[1]),T),days=end-a+1,sp=Math.round(v[1]-v[0]);
  TR_R.forEach(r=>{const b=$('trR'+r);if(!b)return;const on=now&&sp===r;b.classList.toggle('on',on);b.setAttribute('aria-pressed',on);});
  const from=ND(a),to=ND(end),dt=$('trDates'),sl=$('trSpanLbl'),lo=trLo();
  if(dt)dt.textContent=from.slice(0,7)===to.slice(0,7)?`${+from.slice(8,10)} to ${fmtD(to)}`:`${fmtD(from)} to ${fmtD(to)}`;
  if(sl)sl.textContent=(now?'Last ':'')+days+' days';
  if($('trNext'))$('trNext').disabled=now;
  if($('trPrev'))$('trPrev').disabled=lo==null||v[0]<=lo+0.01;
  const k=from+'|'+to;if(k!==_trSK){_trSK=k;if(typeof renderStrMuscles==='function')renderStrMuscles();}
}
function renderTrendsTab(){
  if(_trView==='cal'){renderCalendar();renderBests();renderWeekSum();return;}
  // a window that ended today moves with the day when the app stays open past midnight
  const T=DN(td()),g=_chG.trends;
  if(g&&_trT!=null&&T!==_trT&&Math.abs(g.view[1]-(_trT+0.5))<0.01)g.view=[g.view[0]+T-_trT,g.view[1]+T-_trT];
  _trT=T;trDecor();renderSleepBars();renderBurnout();
  requestAnimationFrame(()=>{renderReadTrend();renderRecTrend();renderTrends();renderWtChart();renderStrTrend();renderSportTrend();renderFormChart();renderLoad();renderProgress();trOnView();});
}
// distance for one sport: by day up to TH.TR_WEEKLY days, by week beyond
const spVU=(v,swim)=>swim?[Math.round(v*1000)+'','m']:[(Math.round(v*10)/10)+'','km'];
function renderSportTrend(){
  const d=S(),sports=['Run','Cycle','Swim','Hike','Walk'],swim=_spSport==='Swim';
  $('spChips').className='chip-row sp';$('spChips').innerHTML=sports.map(s=>`<button class="chip ${s===_spSport?'sel':''}" aria-pressed="${s===_spSport}" onclick="_spSport='${s}';renderSportTrend()">${ICON[s]} ${s}</button>`).join('');
  const every=d.workouts.filter(w=>w.type===_spSport&&w.distKm>0);
  const fmt=v=>spVU(v,swim).join(' ');
  if(!every.length){chUnmount('spBars');$('spBars').innerHTML='';$('spNote').textContent=`No ${_spSport.toLowerCase()} distance logged yet. Log one in the Log tab.`;return;}
  $('spNote').textContent='';
  const bd={},nd={};every.forEach(w=>{bd[w.date]=(bd[w.date]||0)+w.distKm;nd[w.date]=(nd[w.date]||0)+1;});
  const dp=Object.keys(bd).sort().map(k=>({d:k,v:bd[k]})),first=dp[0].d;
  // every week from the first one with this sport, empty weeks included, so "usual" counts the weeks you skipped
  const by=new Map(weekBuckets(dp).map(w=>[DN(w.d),w.v])),f0=Math.min(...by.keys()),now=DN(td()),nowW=now-((now+3)%7+7)%7,wk=[];
  for(let k=f0;k<=nowW;k+=7){const prev=[1,2,3,4].map(i=>k-i*7).filter(x=>x>=f0);wk.push({d:ND(k),v:by.get(k)||0,base:prev.length?prev.reduce((a,x)=>a+(by.get(x)||0),0)/prev.length:null});}
  const bw={};wk.forEach(w=>bw[w.d]=w);
  const r=swim?v=>Math.round(v*1000)/1000:v=>Math.round(v*10)/10,sn=k=>`${k} session${k!==1?'s':''}`;
  mountChart('spBars',{key:'sp'+_spSport,group:'trends',tb:false,H:150,label:_spSport+' distance',empty:'One session so far. Log another to see the trend.',
    yfmt:v=>swim?Math.round(v*1000):Math.round(v),
    series:[{name:'Distance',type:'bar',color:'--t2',zero:'–',fmt,vl:v=>spVU(v,swim)[0],pts:dp}],
    head:x=>{
      const R=trRight(dp,x,{tot:true,f:v=>spVU(v,swim),r});
      if(x.wk){const w=x.p&&bw[x.p.d];if(!w)return{...R,v:null};const[v,u]=spVU(w.v,swim),q=w.base?w.v/w.base:null;
        return{...R,v,u,st:q!=null?`${Math.round(q*100)}% of a usual week`+(x.lab==='This week'?' so far':''):'',cls:q!=null&&q>=TH.RAMP_HIGH?'warn':'',sa:q!=null&&q>=TH.RAMP_HIGH?'▲':''};}
      if(!x.p)return{...R,v:null};const[v,u]=spVU(x.p.v,swim);return{...R,v,u,st:sn(nd[x.d]||0),sa:''};},
    means:info=>{
      if(info.wk){const w=bw[info.last.d];if(!w)return'';
        const cur=w.d===ND(nowW),when=cur?'so far this week':'the week of '+fmtD(w.d);
        if(!w.base)return`${fmt(w.v)} ${when}.`;
        if(cur)return`${fmt(w.v)} so far this week; a usual week is about ${fmt(w.base)}.`;
        const q=w.v/w.base;
        return q>=TH.RAMP_HIGH?`${fmt(w.v)} ${when}, well above your usual ${fmt(w.base)}.`:`${fmt(w.v)} ${when}, ${q>=1.1?'above':q<=0.9?'below':'about'} your usual ${fmt(w.base)}.`;}
      const tot=info.pts.reduce((s,p)=>s+p.v,0),n=info.days,when=info.to===td()?`in the last ${n} days`:`in ${n} days`,u=trUsual(dp,info.from,n,first);
      if(u==null)return`${fmt(tot)} ${when}.`;
      const q=tot/u,word=q>=TH.RAMP_HIGH?'well above':q>=1+TH.TR_STEADY?'above':q>1-TH.TR_STEADY?'about':'below';
      return`${fmt(tot)} ${when}, ${word} your usual ${fmt(u)}.`;},
    weekly:{hi:true,
      series:[{name:'Distance',type:'bar',w:7,color:'--t2',fmt,pts:wk.filter(w=>w.v>0).map(w=>({d:w.d,v:w.v})),barColor:(v,dt)=>dt===ND(nowW)?'--t2/.55':'--t2'},
        {name:'Usual',color:'--text',dash:[4,4],thin:true,noDots:true,fmt,pts:wk.filter(w=>w.base).map(w=>({d:ND(DN(w.d)+3),v:w.base}))}],
      extra:dt=>{const w=bw[dt];if(!w)return'';const k=every.filter(x=>x.date>=dt&&DN(x.date)<DN(dt)+7).length;return sn(k)+(w.base?` · ${Math.round(w.v/w.base*100)}% of usual`:'')+(dt===ND(nowW)?' (so far)':'');}}});
}

// ── Training load: by day, or by week with the jump colours; tap a bar for the sports ──
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
// v123: one line. A big jump in the window leads (with what to do); else this week against a usual week
function loadMeaning(info,wk,fm){
  const by={};wk.forEach(w=>by[w.start]=w);
  const cur=by[info.last.d],now=wk[wk.length-1],j=info.pts.filter(p=>p.d!==now.start&&ldRamp(by[p.d]));
  if(j.length){const l=by[last(j).d],r=ldRamp(l);
    return`The week of ${fmtD(l.start)} jumped ${Math.round((l.total/l.base-1)*100)}%: ${r==='high'?'too fast':'a big step'}.`+(l===wk[wk.length-2]?' Keep this week similar or easier.':'');}
  if(!cur)return'';
  if(cur===now)return cur.base?`${fm(cur.total)} so far; a usual week is about ${fm(cur.base)}.`:`${fm(cur.total)} so far this week.`;
  return cur.base?`${fm(cur.total)} the week of ${fmtD(cur.start)}; the usual was about ${fm(cur.base)}.`:`${fm(cur.total)} the week of ${fmtD(cur.start)}.`;
}
const ldVU=v=>_ldMetric==='min'?(Math.round(v)?[fmtDur(Math.round(v)),'']:['0','min']):_ldMetric==='km'?[String(Math.round(v*10)/10),'km']:[String(Math.round(v)),Math.round(v)===1?'session':'sessions'];
// v128: by day up to TH.TR_WEEKLY days (a day with nothing shows a dash, never "Rest"), by week with the jump colours beyond
function ldDaily(info,dp,wk,fm,first,thr){
  const T=td(),n=info.days,end=info.to===T;
  if(end){const r=trRunDays(thr);if(r>=TH.TR_RUN)return`${r} days in a row without a rest day. Take one soon.`;}
  if(n>TH.TR_VALS){
    const cw=wk.filter(w=>w.start>=info.from&&ND(DN(w.start)+6)<=info.to&&DN(w.start)+6<DN(T));
    if(cw.length>=2){
      const j=cw.filter(w=>ldRamp(w));
      if(j.length){const l=last(j),r=ldRamp(l);return`The week of ${fmtD(l.start)} jumped ${Math.round((l.total/l.base-1)*100)}%: ${r==='high'?'too fast':'a big step'}.`+(end&&l===wk[wk.length-2]?' Keep this week similar or easier.':'');}
      const t=cw.map(w=>w.total),a=t[0],b=t[t.length-1];
      if(!t.some(Boolean))return'No training logged in these weeks.';
      if(t.every((v,i)=>!i||v>=t[i-1])&&b>a*TH.TR_BUILD)return'A steady build: each week a little more than the one before.';
      if(b<a*TH.TR_EASE)return b?`Easing off: the last full week was ${Math.round((1-b/a)*100)}% lighter than the first.`:'No training in the last full week.';
      return'Steady: about the same each week.';
    }
  }
  const tot=info.pts.reduce((s,p)=>s+p.v,0),u=trUsual(dp,info.from,n,first);
  if(!tot)return end?`No training in the last ${n} days.`:`No training in these ${n} days.`;
  if(u==null)return _ldMetric==='min'?`${fm(tot)} of training in ${n} days.`:`${fm(tot)} in ${n} days.`;
  const q=tot/u,pc=Math.round(Math.abs(q-1)*100),uw=n===7?'a usual week':`usual for ${n} days`;
  if(q>=TH.RAMP_HIGH)return`${pc}% more than ${uw}: too fast.`+(end?' Keep the next days easy.':'');
  if(q>=TH.RAMP_CAUTION)return`${pc}% more than ${uw}: a big step.`+(end?' Keep the next days similar.':'');
  if(q>=1+TH.TR_STEADY)return`Building steadily: ${pc}% more than ${uw}.`;
  if(q>1-TH.TR_STEADY)return`Steady: about ${n===7?'your usual week':`your usual for ${n} days`}.`;
  return`${q>=TH.TR_LIGHT?'Lighter':'Much lighter'}: ${pc}% less than ${uw}.`;
}
function renderLoad(){
  const el=$('loadBody');if(!el)return;
  const d=S(),f=LD_M[_ldMetric][1],fm=LD_M[_ldMetric][2],seg=opts=>opts.map(([v,l])=>`<button class="${_ldMetric===v?'active':''}" aria-pressed="${_ldMetric===v}" onclick="setLd('m','${v}')">${l}</button>`).join('');
  const first=d.workouts.reduce((a,w)=>!a||w.date<a?w.date:a,null);
  if(!first){chUnmount('ldCanvas');el.innerHTML='<div class="empty-state" style="padding:8px 0"><div class="empty-title">No workouts yet</div><div class="empty-sub">Log a workout and your training load builds here.</div><button class="empty-btn" onclick="switchTab(\'log\');openLog(\'lWorkout\')">Log a workout</button></div>';return;}
  if(!el.querySelector('#ldCanvas'))el.innerHTML='<div class="ld-seg" id="ldSeg"></div><div id="ldCanvas"></div>';
  $('ldSeg').innerHTML=seg([['min','Time'],['km','Distance'],['n','Sessions']]);
  const thr=stThr(),day={},sp={};
  d.workouts.forEach(w=>{const v=f(w);if(!v)return;day[w.date]=(day[w.date]||0)+v;(sp[w.date]=sp[w.date]||{})[w.type]=(sp[w.date][w.type]||0)+v;});
  const dp=Object.keys(day).sort().map(k=>({d:k,v:day[k]})),f0=dp.length?dp[0].d:null;
  // every week from the first workout (at least 8), so the chart can pan back through all of it
  const wk=loadWeeks(Math.max(8,Math.ceil(daysAgo(first)/7)+1)),by={};wk.forEach(w=>by[w.start]=w);
  const km=_ldMetric==='km',sports=dt=>Object.entries(sp[dt]||{}).sort((a,b)=>b[1]-a[1]);
  mountChart('ldCanvas',{key:'load'+_ldMetric,group:'trends',tb:false,H:170,label:'Training load',empty:'Log another workout to see your training load.',
    yfmt:_ldMetric==='min'?axMin:Math.round,ysteps:_ldMetric==='min'?CH_MIN_STEPS:undefined,
    series:[{name:LD_M[_ldMetric][0],type:'bar',color:'--t2',zero:'–',fmt:fm,pts:dp,
      vl:_ldMetric==='min'?v=>fmtDur(Math.round(v)).split(' '):km?v=>(Math.round(v*10)/10)+'':v=>Math.round(v)+''}],
    extra:dt=>{const s=sports(dt);return s.length>1?s.map(([t,v])=>_ldMetric==='n'?`${t}${v>1?' '+fm(v):''}`:`${t} ${fm(v)}`).join(' · '):'';},
    head:x=>{
      const R=trRight(dp,x,{tot:true,f:ldVU,r:km?v=>Math.round(v*10)/10:Math.round});
      if(x.wk){const w=x.p&&by[x.p.d];if(!w)return{...R,v:null,st:'No training logged',sa:''};const[v,u]=ldVU(w.total),r=ldRamp(w);
        return{...R,v,u,st:w.base?`${Math.round(w.total/w.base*100)}% of a usual week`+(x.lab==='This week'?' so far':''):'',cls:r==='high'?'bad':r==='jump'?'warn':'',sa:r?'▲':''};}
      if(!x.p)return{...R,v:null,st:'No training logged',sa:''};
      const[v,u]=ldVU(x.p.v);return{...R,v,u,st:sports(x.d).map(([t])=>t).join(' · '),sa:''};},
    means:info=>info.wk?loadMeaning(info,wk,fm):ldDaily(info,dp,wk,fm,f0,thr),
    weekly:{hi:true,
      series:[{name:LD_M[_ldMetric][0],type:'bar',w:7,color:'--t2',fmt:fm,pts:wk.filter(w=>w.total>0).map(w=>({d:w.start,v:w.total})),
          barColor:(v,dt)=>{const r=ldRamp(by[dt]);return r==='high'?'--red':r==='jump'?'--amber':dt===wk[wk.length-1].start?'--t2/.55':'--t2';}},
        {name:'Usual',color:'--text',dash:[4,4],thin:true,noDots:true,fmt:fm,pts:wk.filter(w=>w.base).map(w=>({d:ND(DN(w.start)+3),v:w.base}))}],
      extra:dt=>{const w=by[dt];if(!w)return'';const parts=Object.entries(w.by).sort((a,b)=>b[1]-a[1]).map(([t,v])=>`${t} ${fm(v)}`);const r=w.base?` · ${Math.round(w.total/w.base*100)}% of usual`:'';return(parts.join(' · ')||'Nothing logged')+r+(w===wk[wk.length-1]?' (so far)':'');}}});
}
