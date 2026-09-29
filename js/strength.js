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
  let html=_pickList.map((e,i)=>`<button class="str-chip" onclick="pickEx(${i})">${esc(e.name)}<small>${e.muscle}</small></button>`).join('');
  if(q&&!all.some(e=>e.name.toLowerCase()===ql)){
    html+=`<div style="width:100%;font-size:11px;color:var(--t2);margin-top:4px">Add “${esc(q)}” as a new exercise for:</div>`;
    if(_selEx==='Calisthenics')html+=`<button class="str-chip ${_customHold?'on':''}" onclick="_customHold=!_customHold;strPick()">⏱ timed hold</button>`;
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
    return`<div class="str-card"><div class="str-h"><div><div class="str-nm">${esc(it.ex)}</div><div class="str-mu">${it.muscle.toUpperCase()}${it.hold?' · TIMED':''}</div></div><button class="x" style="min-width:44px;min-height:44px;background:none;border:none;color:var(--t3);font-size:20px" onclick="rmEx(${i})" aria-label="Remove exercise">×</button></div>
      <div class="str-last">${esc(last)}</div>${hd}${rows}
      <div class="str-act"><button onclick="addSet(${i})">+ Set</button>${lt?`<button onclick="fillLast(${i})">↺ Same as last</button>`:''}</div></div>`;
  }).join('');
}
function setVal(i,j,f,v){_sess[i].sets[j][f]=v===''?'':+v;}
function cycRir(i,j){const s=_sess[i].sets[j];s.rir=s.rir===null?0:s.rir>=3?null:s.rir+1;renderStrength();}
function cycKind(i,j){const s=_sess[i].sets[j];s.kind=KINDS[(KINDS.indexOf(s.kind)+1)%3];renderStrength();}
function addSet(i){
  const a=_sess[i].sets,p=a[a.length-1]||blankSet();
  a.push({kg:p.kg,reps:p.reps,secs:p.secs,rir:p.rir,kind:'work'});renderStrength();
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
    if(w.e1>0){const b=a.reduce((x,y)=>y.e1>x.e1?y:x);rows.push(['🏋️',ex,b.date,`~${Math.round(b.e1)} kg 1RM`]);}
    else if(a.some(x=>x.secs)){const b=a.reduce((x,y)=>y.secs>x.secs?y:x);rows.push(['🤸',ex,b.date,`${b.secs}s hold`]);}
    else{const b=a.reduce((x,y)=>y.reps>x.reps?y:x);if(b.reps)rows.push(['🤸',ex,b.date,`${b.reps} reps`]);}
  });
  return rows;
}
function weeklySets(){
  const c=Object.fromEntries(MUSCLES.map(m=>[m,0]));
  S().workouts.forEach(w=>{if(daysAgo(w.date)>=0&&daysAgo(w.date)<7)(w.sets||[]).filter(isWork).forEach(s=>{if(c[s.muscle]!==undefined)c[s.muscle]++;});});
  return c;
}

// ---- Wellbeing card: sets per muscle + progress per exercise ----
let _strEx='';
function renderStrTrend(){
  const card=$('strCard');if(!card)return;
  const hist=exHistory();
  if(!hist.size){
    $('strMuscles').innerHTML='<div class="empty-state" style="padding:8px 0"><div class="empty-title">No strength data yet</div><div class="empty-sub">Log a Weights or Calisthenics workout with sets and your progress shows here.</div><button class="empty-btn" onclick="switchTab(\'log\');openLog(\'lWorkout\')">Log a workout</button></div>';
    $('strSel').style.display='none';$('strCanvas').style.display='none';$('strSum').textContent='';return;
  }
  const wk=weeklySets();
  $('strMuscles').innerHTML=MUSCLES.map(m=>{
    const n=wk[m],col=n<10?'var(--amber)':n<=20?'var(--green)':'var(--red)',lbl=n===0?'none':n<10?'low':n<=20?'on target':'high';
    return`<div class="mu-row"><span class="mu-n">${m}</span><span class="mu-bar"><span class="mu-fill" style="display:block;width:${Math.min(100,n/20*100)}%;background:${col}"></span></span><span class="mu-v" style="color:${col}">${n} · ${lbl}</span></div>`;
  }).join('');
  const names=[...hist.keys()].sort((a,b)=>last(hist.get(b)).date<last(hist.get(a)).date?-1:1);
  if(!names.includes(_strEx))_strEx=names[0];
  const sel=$('strSel');sel.style.display='block';
  sel.innerHTML=names.map(n=>`<option ${n===_strEx?'selected':''}>${esc(n)}</option>`).join('');
  const a=hist.get(_strEx),weighted=a.some(x=>x.e1>0),timed=!weighted&&a.some(x=>x.secs);
  const val=x=>weighted?x.e1:timed?x.secs:x.reps,unit=weighted?'kg (est. 1RM)':timed?'sec':'reps';
  const c=$('strCanvas');c.style.display='block';
  const{ctx,W}=sizeCanvas(c,90),H=90;
  const vals=a.slice(-20).map(val);
  if(vals.length>=2){
    const mn=Math.min(...vals),mx=Math.max(...vals),span=mx-mn||1,xs=(W-20)/(vals.length-1),Y=v=>H-12-(v-mn)/span*(H-24);
    ctx.beginPath();ctx.strokeStyle='#C9A84C';ctx.lineWidth=2;ctx.lineJoin='round';
    vals.forEach((v,i)=>{const x=10+i*xs,y=Y(v);i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.stroke();
    vals.forEach((v,i)=>{ctx.beginPath();ctx.arc(10+i*xs,Y(v),3,0,Math.PI*2);ctx.fillStyle='#C9A84C';ctx.fill();});
  }
  const l=last(a),best=Math.max(...a.map(val));
  $('strSum').textContent=vals.length<2?`Log ${_strEx} once more to see a trend. Latest: ${Math.round(val(l))} ${unit}.`:`${_strEx}: latest ${Math.round(val(l))} ${unit} · best ${Math.round(best)} · ${a.length} sessions`;
}
