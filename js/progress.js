// ── PROGRESS & PRs: per lift or sport, tap/drag to inspect, gold rings mark new bests ──
let _prKey='',_prMet='',_prRng=180;
const PR_SPORT=['Run','Cycle','Swim','Hike','Walk'];
function prOptions(){
  const d=S(),h=exHistory();
  const lifts=[...h.keys()].sort((a,b)=>last(h.get(b)).date<last(h.get(a)).date?-1:1);
  const sp=PR_SPORT.filter(t=>d.workouts.some(w=>w.type===t&&w.distKm>0&&w.durMin>0));
  return{lifts,sp};
}
// each entry: {date, v (higher is always better on the chart), txt, sub}
function prSeries(key,met){
  const d=S();
  const inR=dt=>!_prRng||daysAgo(dt)<=_prRng;
  if(PR_SPORT.includes(key)){
    const ws=d.workouts.filter(w=>w.type===key&&w.distKm>0&&w.durMin>0&&inR(w.date)).sort((a,b)=>a.date<b.date?-1:1);
    const sw=key==='Swim',cy=key==='Cycle';
    const pace=w=>sw?w.durMin/(w.distKm*10):w.durMin/w.distKm;
    const pl=sw?'/100 m':'/km';
    const dfmt=k=>sw?Math.round(k*1000)+' m':(Math.round(k*10)/10)+' km';
    if(met==='dist')return{unit:'',pts:ws.map(w=>({date:w.date,v:w.distKm,txt:dfmt(w.distKm),sub:fmtDur(Math.round(w.durMin))})),yf:v=>sw?Math.round(v*1000):Math.round(v*10)/10,title:'Distance per session',better:'longer'};
    if(cy)return{pts:ws.map(w=>({date:w.date,v:w.distKm/(w.durMin/60),txt:(w.distKm/(w.durMin/60)).toFixed(1)+' km/h',sub:dfmt(w.distKm)})),yf:v=>Math.round(v),title:'Average speed',better:'faster'};
    return{pts:ws.map(w=>({date:w.date,v:-pace(w),txt:fmtPace(pace(w))+pl,sub:dfmt(w.distKm)})),yf:v=>fmtPace(-v),neg:true,title:'Average pace (higher on the chart = faster)',better:'faster'};
  }
  const a=exHistory().get(key)||[];
  const weighted=a.some(x=>x.e1>0),timed=!weighted&&a.some(x=>x.secs);
  const f={e1:[x=>x.e1,v=>'~'+Math.round(v*10)/10+' kg 1RM'],top:[x=>x.top,v=>fmtKg(v)+' kg'],vol:[x=>x.vol,v=>Math.round(v)+' kg total'],reps:[x=>x.reps,v=>v+' reps'],secs:[x=>x.secs,v=>v+' s']}[met];
  return{pts:a.filter(x=>inR(x.date)&&f[0](x)>0).map(x=>({date:x.date,v:f[0](x),txt:f[1](f[0](x)),sub:x.top?`top ${fmtKg(x.top)} kg`:''})),yf:v=>Math.round(v),title:{e1:'Estimated 1RM',top:'Heaviest set',vol:'Session volume',reps:'Best reps in a set',secs:'Longest hold'}[met],better:'higher'};
}
function prMetrics(key){
  if(PR_SPORT.includes(key))return[[key==='Cycle'?'spd':'pace',key==='Cycle'?'Speed':'Pace'],['dist','Distance']];
  const a=(exHistory().get(key)||[]),w=a.some(x=>x.e1>0),t=!w&&a.some(x=>x.secs);
  return w?[['e1','Est. 1RM'],['top','Top set'],['vol','Volume']]:t?[['secs','Hold time']]:[['reps','Reps']];
}
function renderProgress(){
  const el=$('progCard');if(!el)return;
  const{lifts,sp}=prOptions();
  if(!lifts.length&&!sp.length){el.innerHTML='<div class="sec">Progress &amp; PRs</div><div class="empty-state" style="padding:8px 0"><div class="empty-title">Nothing to chart yet</div><div class="empty-sub">Log a lift with sets, or a run, ride or swim with distance and time. Each one gets a progress chart with your PRs marked.</div><button class="empty-btn" onclick="switchTab(\'log\');openLog(\'lWorkout\')">Log a workout</button></div>';return;}
  const all=[...lifts,...sp];if(!all.includes(_prKey))_prKey=all[0];
  const mets=prMetrics(_prKey);if(!mets.some(m=>m[0]===_prMet))_prMet=mets[0][0];
  const sr=prSeries(_prKey,_prMet==='spd'?'pace':_prMet),pts=sr.pts;
  const opt=`<optgroup label="Lifts">${lifts.map(n=>`<option ${n===_prKey?'selected':''}>${esc(n)}</option>`).join('')}</optgroup><optgroup label="Endurance">${sp.map(n=>`<option ${n===_prKey?'selected':''}>${n}</option>`).join('')}</optgroup>`;
  const seg=(items,cur,fn)=>items.map(([v,l])=>`<button class="${cur===v?'active':''}" onclick="${fn}('${v}')">${l}</button>`).join('');
  let h=`<div class="sec">Progress &amp; PRs</div><select class="sel-inp" onchange="_prKey=this.value;renderProgress()">${opt}</select>
    <div class="ld-seg">${seg(mets,_prMet,'setPrM')}</div><div class="ld-seg">${seg([['90','3 mo'],['180','6 mo'],['365','1 yr'],['0','All']],String(_prRng),'setPrR')}</div>`;
  if(pts.length<1){el.innerHTML=h+'<div class="set-note">No sessions with this measure in the period. Try a longer range.</div>';return;}
  h+='<canvas id="prCanvas" style="width:100%;height:150px;display:block;margin-top:6px"></canvas>';
  // running bests
  let best=-Infinity;const marks=[];pts.forEach((p,i)=>{if(p.v>best+1e-9){if(i>0)marks.push(i);best=p.v;}});
  const bi=pts.reduce((b,p,i)=>p.v>pts[b].v?i:b,0),b=pts[bi],l=last(pts);
  h+=`<div class="pr-sum"><div><div class="pr-k">PR</div><div class="pr-v">${b.txt}</div><div class="pr-s">${b.date}</div></div><div><div class="pr-k">LATEST</div><div class="pr-v">${l.txt}</div><div class="pr-s">${l.date}</div></div><div><div class="pr-k">SESSIONS</div><div class="pr-v">${pts.length}</div><div class="pr-s">${marks.length} new best${marks.length===1?'':'s'}</div></div></div>`;
  h+=`<div class="set-note">${prNext(_prKey,_prMet,b,l,pts)}</div><div class="set-note">Gold rings are sessions where you set a new best. Touch or drag the chart to read a session.</div>`;
  el.innerHTML=h;
  const c=$('prCanvas'),n=pts.length,vs=pts.map(p=>p.v),mn=Math.min(...vs),mx=Math.max(...vs),pad=(mx-mn)*0.15||Math.abs(mx)*0.1||1;
  lineChart(c,150,[{pts:pts.map((p,i)=>({i,v:p.v})),color:'--text',name:_prKey,fmt:v=>{const p=pts.find(q=>q.v===v);return p?p.txt:v;},marks}],{n:Math.max(n,2),min:mn-pad,max:mx+pad,label:i=>(pts[Math.min(i,n-1)]||pts[0]).date.slice(2),yfmt:sr.yf,extra:i=>pts[i]?pts[i].sub:''});
}
function setPrM(v){_prMet=v;renderProgress();}
function setPrR(v){_prRng=+v;renderProgress();}
function prNext(key,met,b,l,pts){
  if(PR_SPORT.includes(key)){
    if(met==='dist')return`Longest so far ${b.txt}. A gradual step of 5 to 10% on your next long session is a safe way to beat it.`;
    return l===b?'Your latest session is your best. Repeat it, then aim for a slightly harder one.':'Beat this by holding your PR effort for a little longer, or bring an easy day into the mix to recover for a hard one.';
  }
  if(met==='e1'){
    const t=b.v+1,pick=[3,5,8].map(r=>{const kg=Math.ceil(t/(1+r/30)/2.5)*2.5;return`${fmtKg(kg)} kg × ${r}`;});
    return`To set a new estimated PR (above ${Math.round(b.v*10)/10} kg), lift ${pick.join(', or ')}.`;
  }
  return l===b?'Your latest session is your best.':'Aim to beat your best next session, and keep recovery in check.';
}
