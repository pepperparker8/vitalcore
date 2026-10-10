// ── PROGRESS & PRs: per lift or sport, tap/drag to inspect, gold rings mark new bests ──
let _prKey='',_prMet='',_prRng=0;
const PR_SPORT=['Run','Cycle','Swim','Hike','Walk'];
function prOptions(){
  const d=S(),h=exHistory();
  const lifts=[...h.keys()].sort((a,b)=>last(h.get(b)).date<last(h.get(a)).date?-1:1);
  const sp=PR_SPORT.filter(t=>wkOn().some(w=>w.type===t&&w.distKm>0&&w.durMin>0&&!wkEb(w)));
  return{lifts,sp};
}
// each entry: {date, v (higher is always better on the chart), txt, sub}
function prSeries(key,met){
  const d=S();
  const inR=dt=>!_prRng||daysAgo(dt)<=_prRng;
  if(PR_SPORT.includes(key)){
    // v122: e-bike rides are assisted, so they never set a speed or distance best
    const ws=wkOn().filter(w=>w.type===key&&w.distKm>0&&w.durMin>0&&!wkEb(w)&&inR(w.date)).sort((a,b)=>a.date<b.date?-1:1);
    const sw=key==='Swim',cy=key==='Cycle';
    const pace=w=>sw?w.durMin/(w.distKm*10):w.durMin/w.distKm;
    const pl=sw?'/100 m':'/km';
    const dfmt=k=>sw?Math.round(k*1000)+' m':(Math.round(k*10)/10)+' km';
    if(met==='dist')return{unit:'',pts:ws.map(w=>({date:w.date,v:w.distKm,txt:dfmt(w.distKm),sub:fmtDur(Math.round(w.durMin))})),yf:v=>sw?Math.round(v*1000):Math.round(v*10)/10,title:'Distance per session',better:'longer',f:dfmt,df:dfmt,words:['Longest','Shortest'],ch:['Up','Down']};
    if(cy)return{pts:ws.map(w=>({date:w.date,v:w.distKm/(w.durMin/60),txt:(w.distKm/(w.durMin/60)).toFixed(1)+' km/h',sub:dfmt(w.distKm)})),yf:v=>Math.round(v),title:'Average speed',better:'faster',f:v=>v.toFixed(1)+' km/h',df:v=>v.toFixed(1)+' km/h',words:['Fastest','Slowest'],ch:['Faster by','Slower by']};
    return{pts:ws.map(w=>({date:w.date,v:-pace(w),txt:fmtPace(pace(w))+pl,sub:dfmt(w.distKm)})),yf:v=>fmtPace(-v),neg:true,title:'Average pace (higher on the chart = faster)',better:'faster',f:v=>fmtPace(-v)+pl,df:v=>fmtPace(v)+pl,words:['Fastest','Slowest'],ch:['Faster by','Slower by']};
  }
  const a=exHistory().get(key)||[];
  const weighted=a.some(x=>x.e1>0),timed=!weighted&&a.some(x=>x.secs);
  const f={e1:[x=>x.e1,v=>'~'+Math.round(v*10)/10+' kg 1RM'],top:[x=>x.top,v=>fmtKg(v)+' kg'],vol:[x=>x.vol,v=>Math.round(v)+' kg total'],reps:[x=>x.reps,v=>v+' reps'],secs:[x=>x.secs,v=>v+' s']}[met];
  const df={e1:v=>Math.round(v*10)/10+' kg',top:v=>fmtKg(v)+' kg',vol:v=>Math.round(v)+' kg',reps:v=>Math.round(v)+' reps',secs:v=>Math.round(v)+' s'}[met];
  return{pts:a.filter(x=>inR(x.date)&&f[0](x)>0).map(x=>({date:x.date,v:f[0](x),txt:f[1](f[0](x)),sub:x.top?`top ${fmtKg(x.top)} kg`:''})),yf:v=>Math.round(v),title:{e1:'Estimated 1RM',top:'Heaviest set',vol:'Session volume',reps:'Best reps in a set',secs:'Longest hold'}[met],better:'higher',f:met==='reps'||met==='secs'?df:v=>f[1](Math.round(v*10)/10),df,words:['Best','Lowest'],ch:['Up','Down']};
}
function prMetrics(key){
  if(PR_SPORT.includes(key))return[[key==='Cycle'?'spd':'pace',key==='Cycle'?'Speed':'Pace'],['dist','Distance']];
  const a=(exHistory().get(key)||[]),w=a.some(x=>x.e1>0),t=!w&&a.some(x=>x.secs);
  return w?[['e1','Est. 1RM'],['top','Top set'],['vol','Volume']]:t?[['secs','Hold time']]:[['reps','Reps']];
}
function renderProgress(){
  const el=$('progBody');if(!el)return;
  const{lifts,sp}=prOptions();
  if(!lifts.length&&!sp.length){chUnmount('prCanvas');el.innerHTML='<div class="empty-state" style="padding:8px 0"><div class="empty-title">Nothing to chart yet</div><div class="empty-sub">Log a lift with sets, or a run, ride or swim with distance and time. Each one gets a progress chart with your PRs marked.</div><button class="empty-btn" onclick="switchTab(\'log\');openLog(\'lWorkout\')">Log a workout</button></div>';return;}
  const all=[...lifts,...sp];if(!all.includes(_prKey))_prKey=all[0];
  const mets=prMetrics(_prKey);if(!mets.some(m=>m[0]===_prMet))_prMet=mets[0][0];
  const sr=prSeries(_prKey,_prMet==='spd'?'pace':_prMet),pts=sr.pts;
  const opt=`<optgroup label="Lifts">${lifts.map(n=>`<option ${n===_prKey?'selected':''}>${esc(n)}</option>`).join('')}</optgroup><optgroup label="Endurance">${sp.map(n=>`<option ${n===_prKey?'selected':''}>${n}</option>`).join('')}</optgroup>`;
  const seg=(items,cur,fn)=>items.map(([v,l])=>`<button class="${cur===v?'active':''}" onclick="${fn}('${v}')">${l}</button>`).join('');
  let h=`<select class="sel-inp" onchange="_prKey=this.value;renderProgress()">${opt}</select>
    <div class="ld-seg">${seg(mets,_prMet,'setPrM')}</div>`;
  if(pts.length<1){chUnmount('prCanvas');el.innerHTML=h+'<div class="set-note">No sessions with this measure yet.</div>';return;}
  h+='<div id="prCanvas" style="margin-top:6px"></div>';
  // running bests
  let best=-Infinity;const marks=[];pts.forEach((p,i)=>{if(p.v>best+1e-9){if(i>0)marks.push(i);best=p.v;}});
  el.innerHTML=h;
  const byD=new Map(pts.map(p=>[p.date,p]));
  const md=marks.map(i=>pts[i].date);
  mountChart('prCanvas',{key:'pr'+_prKey+_prMet,group:'trends',tb:false,H:190,yfmt:sr.yf,marks:md,extra:dt=>{const p=byD.get(dt);return p?p.sub:'';},label:_prKey+' progress',
    empty:'One session so far. Log another and your progress shows here.',
    series:[{pts:pts.map(p=>({d:p.date,v:p.v})),color:'--text',name:_prKey,fmt:sr.f,vl:v=>prNU(sr.f(v))[0]}],
    hi:true,stats:{words:sr.words},means:info=>prMeaning(info,sr.df,sr.ch,md,'sessions'),head:prHead(pts,md)});
}
// the header of a progress chart: the session on the day (else the last one before the dates on screen) and whether it was a best; the best in view on the right
// pts [{date, v (higher is better), txt}], md the dates of new bests
function prHead(pts,md){
  const byD=new Map(pts.map(p=>[p.date,p])),bestTo=dt=>pts.filter(p=>p.date<=dt).reduce((m,p)=>!m||p.v>m.v?p:m,null);
  return x=>{
    const w=pts.filter(p=>p.date>=x.from&&p.date<=x.to),wb=w.reduce((m,p)=>!m||p.v>m.v?p:m,null),R=wb?{rl:x.n===365?'Best in a year':`Best in ${x.n} days`,rv:prNU(wb.txt)[0],ru:prNU(wb.txt)[1]}:{};
    const q=x.p?byD.get(x.p.d):x.tap?null:pts.filter(p=>p.date<=x.to).pop();if(!q)return{...R,v:null};
    const b=bestTo(q.date),nb=md.includes(q.date),top=nb||q.v>=b.v-1e-9;   // equal to the best counts as your best
    return{...R,lab:x.p?undefined:'Last session, '+fmtD(q.date),v:prNU(q.txt)[0],u:prNU(q.txt)[1],st:nb?'New best':top?'Your best':`Best so far ${b.txt}`,cls:top?'good':'',sa:top?'●':''};};
}
// '~114 kg 1RM' -> ['~114', 'kg 1RM'], so the unit is small in the header; a pace such as '5:12/km' stays whole
function prNU(t){const m=/^(~?[\d.,:]+) (.+)$/.exec(t);return m?[m[1],m[2]]:[t,''];}
// v123: one line. First few against last few sessions in view, plus the new bests in view
function prMeaning(info,df,ch,marks,unit){
  const v=info.pts,pr=marks.filter(x=>x>=info.from&&x<=info.to),on=x=>{const w=dayWord(x);return w==='Today'?'today':'on '+w;};
  if(v.length<2)return pr.length?`A new best ${on(last(pr))}.`:'';
  const k=v.length>=6?3:1,m=a=>a.reduce((s,p)=>s+p.v,0)/a.length,a=m(v.slice(0,k)),b=m(v.slice(-k)),d=b-a,pct=a?Math.round(Math.abs(d/a)*100):0;
  const t=pct<2?'About level':`${d>0?ch[0]:ch[1]} ${df(Math.abs(d))} over these ${unit}`;
  return t+(pr.length?`; ${pr.length===1?'a new best ':pr.length+' new bests, the latest '}${on(pr[pr.length-1])}.`:'.');
}
function setPrM(v){_prMet=v;renderProgress();}
