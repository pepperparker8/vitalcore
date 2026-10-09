// ── STRENGTH & CALISTHENICS ──────────────────────────────────────────────────
// A strength workout stores its sets as a list: [{ex, muscle, kg, reps, secs, rir, kind, bw}]
//   kind: work | warm | fail    rir: reps left in the tank (0,1,2,3 = 3+) or null    bw: calisthenics (kg = added weight)
const MUSCLES=['chest','back','legs','shoulders','arms','core'];
const CAT={
  Weights:[['Squat','legs'],['Front Squat','legs'],['Deadlift','back'],['Romanian Deadlift','legs'],['Leg Press','legs'],['Lunge','legs'],['Hip Thrust','legs'],['Calf Raise','legs'],
    ['Bench Press','chest'],['Incline Press','chest'],['Dumbbell Press','chest'],['Chest Fly','chest'],['Overhead Press','shoulders'],['Lateral Raise','shoulders'],['Face Pull','shoulders'],
    ['Barbell Row','back'],['Lat Pulldown','back'],['Cable Row','back'],['Biceps Curl','arms'],['Triceps Extension','arms'],['Cable Crunch','core']],
  Calisthenics:[['Pull-up','back'],['Chin-up','back'],['Inverted Row','back'],['Muscle-up','back'],['Push-up','chest'],['Archer Push-up','chest'],['Dip','chest'],
    ['Pike Push-up','shoulders'],['Handstand Push-up','shoulders'],['Bodyweight Squat','legs'],['Pistol Squat','legs'],['Bodyweight Lunge','legs'],['Leg Raise','core'],['Hanging Knee Raise','core'],
    ['Plank','core',1],['L-sit','core',1],['Handstand Hold','shoulders',1],['Front Lever','back',1],['Dead Hang','back',1]]
};
const RIR_TXT=['—','0','1','2','3+'];
const KINDS=['work','warm','fail'],KIND_TXT={work:'Set',warm:'Warm',fail:'Fail'};

function exList(type){
  const cat=(CAT[type]||[]).map(([name,muscle,hold])=>({name,muscle,hold:!!hold,cal:type==='Calisthenics'}));
  const cus=(S().profile.customEx||[]).filter(e=>e.type===type).map(e=>({name:e.name,muscle:e.muscle,hold:!!e.hold,cal:type==='Calisthenics'}));
  return cat.concat(cus);
}
function findEx(name){
  for(const t of Object.keys(CAT)){const e=exList(t).find(x=>x.name===name);if(e)return e;}
  return null;
}
const e1rm=(kg,reps)=>kg*(1+Math.min(reps,12)/30);
const isWork=s=>s.kind!=='warm';
const fmtKg=k=>String(Math.round(k*100)/100);

// ---- session being built in the Log tab ----
let _sess=[],_pickList=[],_customHold=false;
let _gym=false,_cur={};
try{_gym=localStorage.getItem('vc-gym')==='1';}catch(e){}
function toggleGym(){_gym=!_gym;try{localStorage.setItem('vc-gym',_gym?'1':'0');}catch(e){}renderStrength();}
const stepOf=(it,f)=>f==='kg'?(it.cal?1:2.5):f==='secs'?5:1;
function nudge(i,j,f,dir){
  const it=_sess[i],s=it.sets[j],v=(+s[f]||0)+dir*stepOf(it,f);
  s[f]=Math.max(0,Math.round(v*10)/10);delete s.pend;renderStrength();
}
function gymDone(i){
  const a=_sess[i].sets,c=Math.min(_cur[i]??a.length-1,a.length-1),p=a[c];
  delete p.pend;delete _cur[i];
  a.push({kg:p.kg,reps:p.reps,secs:p.secs,rir:p.rir,kind:'work',pend:true});
  renderStrength();restStart();
}
function gymPick(i,j){_cur[i]=j;renderStrength();}
function gymCard(it,i){
  const a=it.sets,c=Math.min(_cur[i]??a.length-1,a.length-1),s=a[c],f2=it.hold?'secs':'reps';
  const lt=lastTime(it.ex),last=lt?`Last time (${lt.date}): ${lt.sets.map(fmtSet).join(', ')}`:'First time logging this';
  const done=a.map((x,j)=>j===c||x.pend?'':`<button class="gym-chip" onclick="gymPick(${i},${j})" aria-label="Edit set ${j+1}">${j+1} · ${fmtSet(x)}</button>`).join('');
  const big=(f,lbl)=>`<div class="gym-f"><div class="gym-l">${lbl}</div><div class="gym-b">
    <button onclick="nudge(${i},${c},'${f}',-1)" aria-label="Less">−</button>
    <input type="number" inputmode="decimal" value="${s[f]}" placeholder="0" oninput="setVal(${i},${c},'${f}',this.value);delete _sess[${i}].sets[${c}].pend">
    <button onclick="nudge(${i},${c},'${f}',1)" aria-label="More">+</button></div></div>`;
  return`<div class="str-card"><div class="str-h"><div><div class="str-nm">${esc(it.ex)}</div><div class="str-mu">${esc(it.muscle).toUpperCase()}${it.hold?' · TIMED':''} · SET ${c+1}</div></div><button class="x" style="min-width:44px;min-height:44px;background:none;border:none;color:var(--t3);font-size:20px" onclick="rmEx(${i})" aria-label="Remove exercise">×</button></div>
    <div class="str-last">${esc(last)}</div>
    ${big('kg',it.cal?'ADDED KG':'KG')}${big(f2,it.hold?'SECONDS':'REPS')}
    <div class="gym-row"><button onclick="cycRir(${i},${c})">RIR ${RIR_TXT[s.rir===null?0:s.rir+1]}</button><button class="kind ${s.kind}" onclick="cycKind(${i},${c})">${KIND_TXT[s.kind]}</button><button onclick="rmSet(${i},${c})" aria-label="Remove set">Delete</button></div>
    <button class="gym-done" onclick="gymDone(${i})">Set done ✓</button>
    ${done?`<div class="gym-chips">${done}</div>`:''}</div>`;
}
const blankSet=()=>({kg:'',reps:'',secs:'',rir:null,kind:'work'});

function lastTime(ex){
  const ws=S().workouts;
  for(let i=ws.length-1;i>=0;i--){
    const s=(ws[i].sets||[]).filter(x=>x.ex===ex&&isWork(x));
    if(s.length)return{date:ws[i].date,sets:s};
  }
  return null;
}
function recentEx(type){
  const seen=[],names=new Set(exList(type).map(e=>e.name));
  const ws=S().workouts;
  for(let i=ws.length-1;i>=0&&seen.length<6;i--)(ws[i].sets||[]).forEach(s=>{if(names.has(s.ex)&&!seen.includes(s.ex))seen.push(s.ex);});
  return seen;
}
function strPick(){
  const q=($('strSearch').value||'').trim(),ql=q.toLowerCase(),all=exList(_selEx);
  const inSess=new Set(_sess.map(e=>e.ex)),rec=recentEx(_selEx);
  const order=[...rec.map(n=>all.find(e=>e.name===n)),...all.filter(e=>!rec.includes(e.name))].filter(e=>e&&!inSess.has(e.name)&&(!ql||e.name.toLowerCase().includes(ql)));
  _pickList=order.slice(0,ql?12:10);
  let html=_pickList.map((e,i)=>`<button class="str-chip" onclick="pickEx(${i})">${esc(e.name)}<small>${esc(e.muscle)}</small></button>`).join('');
  if(q&&!all.some(e=>e.name.toLowerCase()===ql)){
    html+=`<div style="width:100%;font-size:11px;color:var(--t2);margin-top:4px">Add “${esc(q)}” as a new exercise for:</div>`;
    if(_selEx==='Calisthenics')html+=`<button class="str-chip ${_customHold?'on':''}" onclick="_customHold=!_customHold;strPick()">${UI.hold} timed hold</button>`;
    html+=MUSCLES.map((m,i)=>`<button class="str-chip" onclick="addCustom(${i})">${m}</button>`).join('');
  }
  $('strPick').innerHTML=html||'<div style="font-size:12px;color:var(--t3)">Everything in this list is already in your session.</div>';
}
function pickEx(i){const e=_pickList[i];if(e)addExercise(e);}
function addCustom(mi){
  const name=$('strSearch').value.trim();if(!name)return;
  const d=S();d.profile.customEx=d.profile.customEx||[];
  d.profile.customEx.push({name,muscle:MUSCLES[mi],type:_selEx,hold:_selEx==='Calisthenics'&&_customHold});
  save(d);markProfile();
  addExercise(exList(_selEx).find(e=>e.name===name));
}
function addExercise(e){
  if(!e)return;
  const item={ex:e.name,muscle:e.muscle,hold:e.hold,cal:e.cal,sets:[]};
  const lt=lastTime(e.name),first=blankSet();
  if(lt){const s=lt.sets[0];first.kg=s.kg||'';first.reps=s.reps||'';first.secs=s.secs||'';}
  item.sets.push(first);_sess.push(item);
  $('strSearch').value='';renderStrength();
}
function renderStrength(){
  $('strLbl').textContent=_selEx==='Calisthenics'?'BODYWEIGHT EXERCISES':'EXERCISES';
  strPick();
  if(!_sess.length){$('strList').innerHTML='<div class="set-note" style="margin-bottom:10px">Pick an exercise above. Each set: weight × reps, how many reps you had left (RIR), and whether it was a warm-up.</div>';return;}
  $('gymTgl').classList.toggle('on',_gym);
  if(_gym){$('strList').innerHTML=_sess.map(gymCard).join('');return;}
  $('strList').innerHTML=_sess.map((it,i)=>{
    const lt=lastTime(it.ex);
    const last=lt?`Last time (${lt.date}): ${lt.sets.map(fmtSet).join(', ')}`:'First time logging this';
    const hd=`<div class="set-h"><span>#</span><span>${it.cal?'+KG':'KG'}</span><span>${it.hold?'SEC':'REPS'}</span><span>RIR</span><span>TYPE</span><span></span></div>`;
    const rows=it.sets.map((s,j)=>`<div class="set-r ${s.kind}">
      <span class="idx">${j+1}</span>
      <input type="number" inputmode="decimal" step="0.5" min="0" placeholder="${it.cal?'0':'kg'}" value="${s.kg}" oninput="setVal(${i},${j},'kg',this.value)">
      <input type="number" inputmode="numeric" min="0" placeholder="${it.hold?'sec':'reps'}" value="${it.hold?s.secs:s.reps}" oninput="setVal(${i},${j},'${it.hold?'secs':'reps'}',this.value)">
      <button onclick="cycRir(${i},${j})" aria-label="Reps in reserve">${RIR_TXT[s.rir===null?0:s.rir+1]}</button>
      <button class="kind ${s.kind}" onclick="cycKind(${i},${j})" aria-label="Set type">${KIND_TXT[s.kind]}</button>
      <button class="x" onclick="rmSet(${i},${j})" aria-label="Remove set">×</button></div>`).join('');
    return`<div class="str-card"><div class="str-h"><div><div class="str-nm">${esc(it.ex)}</div><div class="str-mu">${esc(it.muscle).toUpperCase()}${it.hold?' · TIMED':''}</div></div><button class="x" style="min-width:44px;min-height:44px;background:none;border:none;color:var(--t3);font-size:20px" onclick="rmEx(${i})" aria-label="Remove exercise">×</button></div>
      <div class="str-last">${esc(last)}</div>${hd}${rows}
      <div class="str-act"><button onclick="addSet(${i})">+ Set</button>${lt?`<button onclick="fillLast(${i})">↺ Same as last</button>`:''}</div></div>`;
  }).join('');
}
function setVal(i,j,f,v){_sess[i].sets[j][f]=v===''?'':+v;}
function cycRir(i,j){const s=_sess[i].sets[j];s.rir=s.rir===null?0:s.rir>=3?null:s.rir+1;renderStrength();}
function cycKind(i,j){const s=_sess[i].sets[j];s.kind=KINDS[(KINDS.indexOf(s.kind)+1)%3];renderStrength();}
function addSet(i){
  const a=_sess[i].sets,p=a[a.length-1]||blankSet();
  a.push({kg:p.kg,reps:p.reps,secs:p.secs,rir:p.rir,kind:'work'});renderStrength();restStart();
}
function rmSet(i,j){_sess[i].sets.splice(j,1);if(!_sess[i].sets.length)_sess[i].sets.push(blankSet());renderStrength();}
function rmEx(i){_sess.splice(i,1);renderStrength();}
function fillLast(i){
  const lt=lastTime(_sess[i].ex);if(!lt)return;
  _sess[i].sets=lt.sets.map(s=>({kg:s.kg||'',reps:s.reps||'',secs:s.secs||'',rir:s.rir??null,kind:s.kind||'work'}));renderStrength();
}
function collectSets(){
  const out=[];
  for(const it of _sess){
    let n=0;
    for(const s of it.sets){
      if(s.pend)continue;
      const kg=+s.kg||0,reps=+s.reps||0,secs=+s.secs||0;
      if(!kg&&!reps&&!secs)continue;
      if(it.hold?!secs:!reps)return{err:`${it.ex}: enter ${it.hold?'seconds':'reps'} for every set you log`};
      if(kg<0||kg>500)return{err:`${it.ex}: weight should be 0–500 kg`};
      if(reps>200)return{err:`${it.ex}: reps look too high`};
      if(secs>900)return{err:`${it.ex}: hold should be under 15 minutes`};
      const o={ex:it.ex,muscle:it.muscle,kind:s.kind||'work'};
      if(kg)o.kg=kg;if(reps)o.reps=reps;if(secs)o.secs=secs;if(s.rir!==null&&s.rir!=='')o.rir=s.rir;if(it.cal)o.bw=1;
      out.push(o);n++;
    }
    if(!n)return{err:`Add at least one set for ${it.ex}, or remove it`};
  }
  if(!out.length)return{err:'Add an exercise and at least one set'};
  return{sets:out};
}
function loadSession(sets){
  _sess=[];
  for(const s of sets||[]){
    let it=_sess.find(x=>x.ex===s.ex);
    if(!it){const d=findEx(s.ex);it={ex:s.ex,muscle:s.muscle||d?.muscle||'core',hold:!!s.secs,cal:!!s.bw,sets:[]};_sess.push(it);}
    it.sets.push({kg:s.kg||'',reps:s.reps||'',secs:s.secs||'',rir:s.rir??null,kind:s.kind||'work'});
  }
}

// ---- formatting ----
function fmtSet(s){
  if(s.secs)return`${s.kg?'+'+fmtKg(s.kg)+'kg ':''}${s.secs}s`;
  if(s.kg)return`${s.bw?'+':''}${fmtKg(s.kg)}×${s.reps}`;
  return String(s.reps);
}
function setsByEx(w){
  const m=new Map();
  (w.sets||[]).filter(isWork).forEach(s=>{if(!m.has(s.ex))m.set(s.ex,[]);m.get(s.ex).push(s);});
  return[...m.entries()];
}
const setsText=w=>setsByEx(w).map(([ex,a])=>`${ex} ${a.map(fmtSet).join(', ')}`).join(' · ');

// ---- history, personal bests ----
function exHistory(){
  const h=new Map();
  S().workouts.forEach(w=>{
    const byEx=new Map();
    (w.sets||[]).filter(isWork).forEach(s=>{if(!byEx.has(s.ex))byEx.set(s.ex,[]);byEx.get(s.ex).push(s);});
    byEx.forEach((a,ex)=>{
      let top=0,e1=0,reps=0,secs=0,vol=0;
      a.forEach(s=>{
        if(s.kg&&s.reps){top=Math.max(top,s.kg);e1=Math.max(e1,e1rm(s.kg,s.reps));vol+=s.kg*s.reps;}
        reps=Math.max(reps,s.reps||0);secs=Math.max(secs,s.secs||0);
      });
      if(!h.has(ex))h.set(ex,[]);
      h.get(ex).push({date:w.date,top,e1,reps,secs,vol,cal:!!a[0].bw});
    });
  });
  h.forEach(a=>a.sort((x,y)=>x.date<y.date?-1:1));
  return h;
}
function findPRs(sets){
  const hist=exHistory(),msgs=[],by=new Map();
  sets.filter(isWork).forEach(s=>{if(!by.has(s.ex))by.set(s.ex,[]);by.get(s.ex).push(s);});
  by.forEach((a,ex)=>{
    const h=hist.get(ex);if(!h)return;
    const pe=Math.max(...h.map(x=>x.e1)),pr=Math.max(...h.map(x=>x.reps)),ps=Math.max(...h.map(x=>x.secs));
    let best=null;
    a.forEach(s=>{if(s.kg&&s.reps&&pe>0&&e1rm(s.kg,s.reps)>pe+0.01)best=`${ex} ${fmtKg(s.kg)}×${s.reps}`;});
    if(!best&&!a.some(s=>s.kg)){
      const mr=Math.max(...a.map(s=>s.reps||0)),ms=Math.max(...a.map(s=>s.secs||0));
      if(ms>ps&&ps>0)best=`${ex} ${ms}s`;else if(mr>pr&&pr>0&&!ms)best=`${ex} ${mr} reps`;
    }
    if(best)msgs.push(best);
  });
  return msgs;
}
function strBests(){
  const rows=[];
  [...exHistory().entries()].sort((a,b)=>last(b[1]).date<last(a[1]).date?-1:1).slice(0,8).forEach(([ex,a])=>{
    const w=a.reduce((x,y)=>y.e1>x.e1?y:x,a[0]);
    if(w.e1>0){const b=a.reduce((x,y)=>y.e1>x.e1?y:x);rows.push([UI.weight,esc(ex),b.date,`~${Math.round(b.e1)} kg 1RM`]);}
    else if(a.some(x=>x.secs)){const b=a.reduce((x,y)=>y.secs>x.secs?y:x);rows.push([UI.hold,esc(ex),b.date,`${b.secs}s hold`]);}
    else{const b=a.reduce((x,y)=>y.reps>x.reps?y:x);if(b.reps)rows.push([UI.hold,esc(ex),b.date,`${b.reps} reps`]);}
  });
  return rows;
}
// hard sets per muscle from one date to another
function strSetsIn(from,to){
  const c=Object.fromEntries(MUSCLES.map(m=>[m,0]));
  S().workouts.forEach(w=>{if(w.date>=from&&w.date<=to)(w.sets||[]).filter(isWork).forEach(s=>{if(c[s.muscle]!==undefined)c[s.muscle]++;});});
  return c;
}
// per muscle over the days up to end (default today); over 7 days the mean week
function weeklySets(days=7,end=td()){
  const c=strSetsIn(ND(DN(end)-days+1),end);
  if(days>7)Object.keys(c).forEach(m=>c[m]=Math.round(c[m]/(days/7)));
  return c;
}

// ---- Wellbeing card: sets per muscle + progress per exercise ----
let _strEx='';
function renderStrTrend(){
  const card=$('strCard');if(!card)return;
  const hist=exHistory();
  if(!hist.size){
    chUnmount('strCanvas');$('strHd').innerHTML='';$('strMuscles').innerHTML='<div class="empty-state" style="padding:8px 0"><div class="empty-title">No strength data yet</div><div class="empty-sub">Log a Weights or Calisthenics workout with sets and your progress shows here.</div><button class="empty-btn" onclick="switchTab(\'log\');openLog(\'lWorkout\')">Log a workout</button></div>';
    $('strSel').style.display='none';$('strCanvas').innerHTML='';return;
  }
  renderStrMuscles();
  const names=[...hist.keys()].sort((a,b)=>last(hist.get(b)).date<last(hist.get(a)).date?-1:1);
  if(!names.includes(_strEx))_strEx=names[0];
  const sel=$('strSel');sel.style.display='block';
  sel.innerHTML=names.map(n=>`<option ${n===_strEx?'selected':''}>${esc(n)}</option>`).join('');
  const a=hist.get(_strEx),weighted=a.some(x=>x.e1>0),timed=!weighted&&a.some(x=>x.secs);
  const val=x=>weighted?x.e1:timed?x.secs:x.reps;
  const fu=v=>Math.round(v)+' '+(weighted?'kg':timed?'s':'reps'),md=a.map(x=>x.date).filter((dt,i)=>i&&val(a[i])>Math.max(...a.slice(0,i).map(val)));
  mountChart('strCanvas',{key:'str'+_strEx,group:'trends',tb:false,H:170,yfmt:v=>Math.round(v),label:_strEx,
    empty:`Log ${esc(_strEx)} once more to see a trend.`,
    series:[{pts:a.map(x=>({d:x.date,v:val(x)})),color:'--text',name:_strEx,fmt:fu,vl:v=>String(Math.round(v))}],
    hi:true,stats:{words:['Best','Lowest']},head:prHead(a.map(x=>({date:x.date,v:val(x),txt:fu(val(x))})),md),
    means:info=>prMeaning(info,v=>fu(v),['Up','Down'],md,'sessions')});
}
// the muscle bars and their header follow the Trends window: sets in it, muscles in the target zone, and sets per week (or muscles trained in a 7-day window)
function renderStrMuscles(){
  const hd=$('strHd'),el=$('strMuscles');if(!hd||!el||!exHistory().size)return;
  const days=trSpan(),to=trEnd(),from=ND(DN(to)-days+1),pto=ND(DN(from)-1),pfrom=ND(DN(from)-days);
  const raw=strSetsIn(from,to),prv=strSetsIn(pfrom,pto),wk=weeklySets(days,to),tot=o=>Object.values(o).reduce((s,v)=>s+v,0);
  const lo=TH.SETS_LO,hi=TH.SETS_HI,grp={on:[],low:[],high:[],none:[]},pw=v=>days>7?Math.round(v/(days/7)):v;
  el.innerHTML=MUSCLES.map(m=>{
    const n=wk[m],k=n===0?'none':n<lo?'low':n<=hi?'on':'high',col=k==='low'||k==='none'?'var(--amber)':k==='on'?'var(--green)':'var(--red)',lbl={none:'none',low:'low',on:'on target',high:'high'}[k];
    grp[k].push(m);
    return`<div class="mu-row"><span class="mu-n">${m}</span><span class="mu-bar"><span class="mu-fill" style="display:block;width:${Math.min(100,n/hi*100)}%;background:${col}"></span></span><span class="mu-v" style="color:${col}">${n} · ${lbl}</span></div>`;
  }).join('')+`<div class="vc-mean">${grp.high.length?`Over ${hi} sets: ${grp.high.join(', ')}. Fewer, harder sets work as well.`:grp.low.length?`Under ${lo} sets: ${grp.low.join(', ')}.`:grp.on.length?'On target for every muscle you trained.':''}</div>`;
  // the window before counts only once there are sets from before it
  const first=S().workouts.filter(w=>(w.sets||[]).some(isWork)).reduce((m,w)=>!m||w.date<m?w.date:m,null),before=first&&DN(first)<=DN(pfrom)+days/2;
  const nT=grp.on.length+grp.low.length+grp.high.length,on=grp.on.length;
  const rv=days>7?pw(tot(raw)):nT,pv=before?(days>7?pw(tot(prv)):Object.values(prv).filter(v=>v>0).length):null,dv=pv==null?null:rv-pv;
  const now=to===td(),lab=now?`Last ${days} days`:`${fmtD(from)} to ${fmtD(to)}`;
  hd.innerHTML=`<div class="vc-hd"><div><small>${esc(lab)}</small><b class="v1">${tot(raw)}<em> hard set${tot(raw)===1?'':'s'}</em></b>`
    +(nT?`<span class="${on&&!grp.low.length&&!grp.high.length?'good':''}"><i>●</i>${on} muscle${on===1?'':'s'} on target</span>`:'')+`</div>`
    +`<div><small>${days>7?'Sets per week':'Muscles trained'}</small><b class="v2">${rv}</b>`
    +(dv!=null?`<span><i>${dv>0?'▲':dv<0?'▼':'●'}</i>${dv?Math.abs(dv)+' on '+chPer(days):'Same as '+chPer(days)}</span>`:'')+`</div></div>`;
}

// ---- rest timer: starts when you add the next set; end time based so it survives screen-off ----
let _restEnd=0,_restTick=null,_restLen=+(()=>{try{return localStorage.getItem('vc-rest')}catch(e){return 0}})()||90;
function restStart(){_restEnd=Date.now()+_restLen*1000;$('restBar').classList.add('show');clearInterval(_restTick);_restTick=setInterval(restTick,250);restTick();}
function restTick(){
  const left=Math.ceil((_restEnd-Date.now())/1000);
  if(left<=0){clearInterval(_restTick);$('restTime').textContent='Go!';$('restBar').classList.add('done');try{navigator.vibrate?.([300,120,300]);}catch(e){}setTimeout(restStop,4000);return;}
  $('restTime').textContent=Math.floor(left/60)+':'+String(left%60).padStart(2,'0');
}
function restStop(){clearInterval(_restTick);$('restBar').classList.remove('show','done');}
function restLen(n){_restLen=n;try{localStorage.setItem('vc-rest',n);}catch(e){}if($('restBar').classList.contains('show'))restStart();else showToast('Rest set to '+fmtDur(n/60|0)+(n%60?' '+n%60+'s':''));}
