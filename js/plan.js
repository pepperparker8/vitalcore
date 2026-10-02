// ── WEEKLY PLAN: a template per weekday, planned vs done, adherence ──────────
const PL_DAYS=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const PL_TYPES=['Run','Cycle','Swim','Weights','Calisthenics','Hike','Walk','Yoga','Rest'];
let _plEdit=false;
const plKey=t=>t==='Calisthenics'?'Weights':t;
function planOf(i){const p=(S().profile.plan||{})[i];return p&&p.type?p:null;}
function weekDates(){
  const m=new Date(td()+'T12:00:00');m.setDate(m.getDate()-((m.getDay()+6)%7));
  return PL_DAYS.map((_,i)=>{const x=new Date(m);x.setDate(x.getDate()+i);return ymd(x);});
}
function planDayState(i,dt){
  const p=planOf(i),ws=S().workouts.filter(w=>w.date===dt);
  if(!p)return{st:'none',p:null,ws};
  if(p.type==='Rest')return{st:dt>td()?'up':ws.length?'bonus':'done',p,ws};
  const hit=ws.some(w=>plKey(w.type)===plKey(p.type));
  return{st:hit?'done':dt>td()?'up':dt===td()?'today':'miss',p,ws};
}
function planWeek(){
  const dts=weekDates();let planned=0,done=0,due=0;
  const days=dts.map((dt,i)=>{
    const s=planDayState(i,dt);
    if(s.p&&s.p.type!=='Rest'){planned++;if(s.st==='done')done++;if(dt<=td()&&s.st!=='today')due++;}
    return{...s,dt,i};
  });
  return{days,planned,done,due};
}
function setPlan(i,field,v){
  const d=S();d.profile.plan=d.profile.plan||{};const p=d.profile.plan[i]||{type:''};
  p[field]=v;if(!p.type)delete d.profile.plan[i];else d.profile.plan[i]=p;
  save(d);renderPlan();renderSuggest();renderFuel();
}
function togglePlanEdit(){_plEdit=!_plEdit;renderPlan();}
function renderPlan(){
  const el=$('planCard');if(!el)return;
  const d=S(),has=Object.values(d.profile.plan||{}).some(p=>p&&p.type);
  if(!has&&!_plEdit){
    el.innerHTML='<div class="sg-lbl">WEEKLY PLAN</div><div class="sg-s">Set what you plan to do each day. The app then shows what you did, how well you followed the plan, and suggests today\'s session from it.</div><button class="btn-out" onclick="togglePlanEdit()">Set up my week</button>';return;
  }
  if(_plEdit){
    el.innerHTML=`<div class="sg-lbl">EDIT WEEKLY PLAN</div>${PL_DAYS.map((n,i)=>{const p=planOf(i)||{};return`<div class="pl-er"><span class="pl-dn">${n}</span><select class="sel-inp" onchange="setPlan(${i},'type',this.value)"><option value="">Nothing</option>${PL_TYPES.map(t=>`<option ${p.type===t?'selected':''}>${t}</option>`).join('')}</select><input class="inp" placeholder="e.g. 10 km" value="${esc(p.note||'')}" maxlength="24" onchange="setPlan(${i},'note',this.value.trim())"></div>`;}).join('')}<button class="btn-gold" onclick="togglePlanEdit()">Done</button>`;return;
  }
  const w=planWeek(),pct=w.due?Math.round(w.days.filter(x=>x.p&&x.p.type!=='Rest'&&x.dt<=td()&&x.st==='done').length/w.due*100):null;
  el.innerHTML=`<div class="pl-h"><div class="sg-lbl">THIS WEEK'S PLAN</div><button class="pl-ed" onclick="togglePlanEdit()">Edit</button></div>
    <div class="pl-row">${w.days.map(x=>{const t=x.p?x.p.type:'';const ic=t&&t!=='Rest'?(ICON[t]||''):t==='Rest'?'<span class="pl-z">zz</span>':'';
      const mk=x.st==='done'?'✓':x.st==='miss'?'✕':x.st==='bonus'?'+':'';
      return`<button class="pl-d ${x.st}${x.dt===td()?' now':''}" onclick="planDay(${x.i})" aria-label="${PL_DAYS[x.i]} ${t||'no plan'}"><span class="pl-n">${PL_DAYS[x.i]}</span><span class="pl-i">${ic||'·'}</span><span class="pl-m">${mk}</span></button>`;}).join('')}</div>
    <div id="planDet" class="set-note"></div>
    <div class="set-note">${w.planned?`${w.done} of ${w.planned} planned sessions done${pct!==null?` · ${pct}% of those due so far`:''}.`:'No training sessions planned this week.'}</div>`;
}
function planDay(i){
  const dts=weekDates(),s=planDayState(i,dts[i]),el=$('planDet');if(!el)return;
  const p=s.p;
  const done=s.ws.map(w=>`${w.type}${w.distKm?' '+(w.type==='Swim'?Math.round(w.distKm*1000)+' m':w.distKm+' km'):''}${w.durMin&&!IS_STR(w.type)?' '+fmtDur(w.durMin):''}`).join(', ');
  el.innerHTML=`<b>${PL_DAYS[i]} ${dts[i].slice(5)}</b> · ${p?`planned ${esc(p.type)}${p.note?' ('+esc(p.note)+')':''}`:'nothing planned'}${done?`<br>Done: ${esc(done)}`:''}${s.st==='miss'?'<br>Missed. Do not double up; just carry on with the plan.':''}`;
}
