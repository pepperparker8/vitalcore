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
  const p=planOf(i),ws=wkOn().filter(w=>w.date===dt);
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
  save(d);markProfile();renderPlan();
}
function togglePlanEdit(){_plEdit=!_plEdit;renderPlan();}
function renderPlan(){
  const el=$('planCard');if(!el)return;
  const d=S(),has=Object.values(d.profile.plan||{}).some(p=>p&&p.type);
  if(!has&&!_plEdit){
    el.innerHTML='<div class="dy-h"><b>Weekly plan</b></div><p class="pl-ln">Set what you plan each day to see how the week is going.</p><button class="btn-out" onclick="togglePlanEdit()">Set up my week</button>';return;
  }
  if(_plEdit){
    el.innerHTML=`<div class="dy-h"><b>Weekly plan</b></div>${PL_DAYS.map((n,i)=>{const p=planOf(i)||{};return`<div class="pl-er"><span class="pl-dn">${n}</span><select class="sel-inp" onchange="setPlan(${i},'type',this.value)"><option value="">Nothing</option>${PL_TYPES.map(t=>`<option ${p.type===t?'selected':''}>${t}</option>`).join('')}</select><input class="inp" placeholder="e.g. 10 km" value="${esc(p.note||'')}" maxlength="24" onchange="setPlan(${i},'note',this.value.trim())"></div>`;}).join('')}<button class="btn-gold" onclick="togglePlanEdit()">Done</button>`;return;
  }
  const w=planWeek();
  el.innerHTML=`<div class="dy-h"><b>This week's plan</b><button class="pl-ed" onclick="togglePlanEdit()">Edit</button></div>
    <div class="pl-wk">${w.days.map(x=>{const t=x.p?x.p.type:'',now=x.dt===td(),mk=PL_MK[x.st];
      const ic=t==='Rest'?UI.moon:t?(ICON[t]||UI.bolt):'<i class="pl-no">–</i>';
      return`<button class="pl-c ${x.st}${now?' now':''}" onclick="planDay(${x.i})" aria-label="${PL_DAYS[x.i]}: ${esc(t||'no plan')}${mk?', '+mk[1]:''}"><small>${now?'Today':PL_DAYS[x.i]}</small>${ic}${mk?UI[mk[0]].replace('ui-i','ui-i pl-mk'):'<i class="pl-sp"></i>'}</button>`;}).join('')}</div>
    <div id="planDet" class="set-note"></div>
    <p class="pl-ln">${[planSoFar(w),planLongDay()].filter(Boolean).join(' ')}</p>`;
}
// v129: one line under the week: how the plan is going so far, then the long session still to come this week
const PL_MK={done:['check','done'],miss:['xc','missed'],bonus:['pc','extra session']};
function planSoFar(w){
  if(!w.planned)return'No training sessions planned this week.';
  return w.due?`On plan: ${w.done} of ${w.due} so far.`:`${w.planned} session${w.planned===1?'':'s'} planned this week.`;
}
function planLongDay(){
  let st=null;try{st=typeof strategy==='function'?strategy():null;}catch(e){st=null;}
  const sun=weekDates()[6],L=st&&st.days.find(x=>x.role==='long'&&x.date<=sun);
  if(!L||!L.name)return'';
  return L.date===td()?`${L.name} today.`:`${L.name} on ${new Date(L.date+'T12:00:00').toLocaleDateString('en-GB',{weekday:'long'})}.`;
}
function planDay(i){
  const dts=weekDates(),s=planDayState(i,dts[i]),el=$('planDet');if(!el)return;
  const p=s.p;
  const done=s.ws.map(w=>`${w.type}${w.distKm?' '+(w.type==='Swim'?Math.round(w.distKm*1000)+' m':w.distKm+' km'):''}${w.durMin&&!IS_STR(w.type)?' '+fmtDur(w.durMin):''}`).join(', ');
  el.innerHTML=`<b>${PL_DAYS[i]} ${fmtD(dts[i])}</b> · ${p?`planned ${esc(p.type)}${p.note?' ('+esc(p.note)+')':''}`:'nothing planned'}${done?`<br>Done: ${esc(done)}`:''}${s.st==='miss'?'<br>Missed. Do not double up; just carry on with the plan.':''}`;
}
