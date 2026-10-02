// ── FUEL: daily protein, carbs and fat targets from body weight, today's training and the food goal ──
// Foods: [singular, plural, grams of the nutrient per 100 g (unit 'g') or per piece / spoon]
const FU_FOODS={
  p:[['cooked chicken breast','',31,'g'],['egg','eggs',6.3,'pc'],['tempeh','',19,'g'],['cooked fish','',24,'g'],['firm tofu','',12,'g']],
  c:[['cooked rice','',28,'g'],['banana','bananas',25,'pc'],['slice of bread','slices of bread',14,'pc'],['dry oats','',66,'g'],['cooked sweet potato','',20,'g']],
  f:[['avocado','',15,'g'],['peanuts','',49,'g'],['tbsp cooking oil','tbsp cooking oil',14,'pc']],
  d:[['banana','bananas',25,'pc'],['energy gel','energy gels',22,'pc'],['date','dates',16,'pc']]
};
const FU_GOAL={keep:'keep weight',lose:'lose fat',build:'build muscle'};
const FU_DAY={rest:'Rest or very light day',easy:'Easy training day',mod:'Moderate training day',hard:'Hard or long training day',big:'Very long day',race:'Race day'};
// rough energy cost by sport and effort 1 to 5, as multiples of resting use
const FU_MET={Run:[6,8,9.5,11,12.5],Cycle:[4,6,8,10,12],Swim:[5,6,8,10,11],Hike:[4.5,5.5,6.5,7.5,8.5],Walk:[2.8,3.3,3.8,4.3,5],Yoga:[2,2.5,3,3.5,4],Weights:[3,3.5,4.5,5.5,6],Calisthenics:[3,3.5,4.5,6,8]};
const FU_TRAIN=r=>r&&!['rest','recover','gentle','done'].includes(r);
const fuGoal=()=>FU_GOAL[S().profile.nutGoal]?S().profile.nutGoal:'keep';
const fuR5=n=>Math.round(n/5)*5,fuR50=n=>Math.round(n/50)*50,fuN=n=>Math.round(n).toLocaleString('en-US');
function fuAmt(g,f){
  if(f[3]==='g')return`${Math.max(10,Math.round(g/f[2]*10)*10)} g ${f[0]}`;
  const n=Math.max(1,Math.round(g/f[2]));return`${n} ${n===1?f[0]:f[1]}`;
}
function fuWeight(){
  const ex=isExampleOnly();
  return last(S().measurements.filter(x=>x.weight>=30&&x.weight<=250&&(ex||!x.isEx)).sort((a,b)=>a.date<b.date?-1:1));
}
// ── Energy use (estimate): resting use x 1.35 for daily living, plus training ──
function fuRest(kg){
  const p=S().profile,sx=p.sex==='m'?5:p.sex==='f'?-161:-78;
  return(p.height>=120&&p.age>=14?10*kg+6.25*p.height-5*p.age+sx:23*kg)*1.35;
}
const fuSess=(type,mins,rpe,kg)=>((FU_MET[type]||FU_MET.Cycle)[Math.max(1,Math.min(5,Math.round(rpe)||3))-1]-1)*kg*mins/60;
// strength workouts have no duration field: about 3 minutes a set
const fuMin=w=>w.durMin||(IS_STR(w.type)?Math.min(90,(w.sets||[]).length*3)||30:0);
function fuWk(w,kg){
  const mins=fuMin(w),k=wIcu(w).kcal;
  return k?Math.max(0,k-kg*mins/60):fuSess(w.type,mins,w.rpe,kg);
}
const fuBurn=(dt,kg)=>fuRest(kg)+stWs().filter(w=>w.date===dt).reduce((a,w)=>a+fuWk(w,kg),0);
const fuFood=dt=>{const r=S().foodLogs.find(x=>x.date===dt);return r&&r.kcal>0?r:null;};

// Before and during the next session that needs fuelling (today's if still to do, else tomorrow's)
function fuNext(st,kg,done){
  if(!st)return null;
  const c=[!done&&st.days[0],st.days[1]].filter(x=>x&&FU_TRAIN(x.role)).map(x=>{const race=x.role==='race',mins=race?120:(x.lo+x.hi)/2;return{x,race,mins,big:race||x.role==='hard'||mins>=60};});
  const o=c.find(y=>y.big)||c[0];
  if(!o)return null;
  const{x,race,mins}=o,tom=x!==st.days[0],F=FU_FOODS,name=x.name;
  if(!o.big)return{tom,name,mins:Math.round(mins),simple:true,before:'No special fuelling needed. If your last meal was more than 3 hours ago, have a small snack such as a banana.',during:'Water is enough.',night:''};
  const pre=fuR5((race?1.5:1)*kg);
  const before=`2 to 3 hours before: about ${pre} g carbs and little fat, such as ${fuAmt(pre,F.c[0])} or ${fuAmt(pre,F.c[2])}.${race?'':' Training early? A banana 30 minutes before is enough.'}`;
  const rate=IS_STR(x.type)||mins<60?0:mins<90?30:mins<150?45:60;
  const during=rate?`About ${rate} g carbs an hour after the first 30 minutes, such as ${F.d.map(f=>fuAmt(rate,f)).join(' or ')}. Drink about 500 ml of water an hour, more in the heat.`:'Water only. Sip when thirsty.';
  const night=tom&&(race||x.role==='long'||mins>=90)?'Tonight: add an extra serving of rice or noodles at dinner.':'';
  return{tom,name,mins:Math.round(mins),before,during,night};
}
function fuelPlan(){
  const m=fuWeight();
  if(!m)return null;
  const kg=m.weight,goal=fuGoal(),t=td(),done=stWs().filter(w=>w.date===t),st=strategy(),x=st&&st.days[0],ph=racePhase();
  let mins=0,hard=false,str=false,race=false,plan=0;
  if(done.length){mins=done.reduce((a,w)=>a+fuMin(w),0);hard=stHard(t,done);str=done.every(w=>IS_STR(w.type));}
  else if(x&&x.role==='race'){race=true;hard=true;mins=120;plan=fuSess(x.type,mins,5,kg);}
  else if(x&&FU_TRAIN(x.role)){mins=(x.lo+x.hi)/2;hard=x.role==='hard';str=x.role==='strength';plan=fuSess(x.type,mins,x.effort,kg);}
  const level=race?'race':mins<20?'rest':mins>=150?'big':hard||mins>=60?'hard':mins>=45?'mod':'easy';
  // grams per kg of body weight; carbs follow the day's training
  let ck={rest:3,easy:4,mod:5,hard:mins>=90?7:6,big:8,race:8}[level];
  if(ph&&ph.n===1)ck=Math.max(ck,7);
  if(goal==='lose')ck=Math.max(2.5,ck-1);else if(goal==='build')ck+=0.5;
  const pk=goal!=='keep'?2:!str&&(level==='rest'||level==='easy')?1.6:1.8;
  const p=fuR5(pk*kg),c=fuR5(ck*kg);
  // fat fills what is left of the day's estimated energy use, kept between 0.6 and 1.5 g per kg
  const rest=fuRest(kg),train=fuBurn(t,kg)-rest+plan,burn=rest+train,aim=burn+(goal==='lose'?-400:goal==='build'?250:0);
  const f=fuR5(Math.max(0.6*kg,Math.min(1.5*kg,(aim-p*4-c*4)/9)));
  const kcal=fuR50(p*4+c*4+f*9),fd=fuFood(t);
  // logged days in the last week (not today, which is still open): eaten against estimated use
  const wk=[1,2,3,4,5,6,7].map(i=>dAgo(i)).filter(fuFood).map(dt=>({e:fuFood(dt).kcal,b:fuBurn(dt,kg)}));
  const gap=wk.length>=3?avg(wk.map(d=>d.b-d.e)):0;
  const ap=fuR5(0.3*kg),ac=fuR5((level==='hard'||level==='big'||level==='race'?1:0.5)*kg);
  const F=FU_FOODS;
  return{kg,wDate:m.date,goal,level,label:ph&&ph.n===1&&!race?'Day before your race':FU_DAY[level],done:done.length>0,carbLoad:!!(ph&&ph.n===1),p,c,f,kcal,
    burn:{total:fuR50(burn),rest:fuR50(rest),train:fuR50(train),planned:plan>0},
    eaten:fd?{kcal:fd.kcal,protein:fd.protein||0}:null,
    week:wk.length?{days:wk.length,eaten:fuR50(avg(wk.map(d=>d.e))),burn:fuR50(avg(wk.map(d=>d.b))),low:gap>(goal==='lose'?800:500)}:null,
    next:fuNext(st,kg,done.length>0),
    after:level==='rest'?null:{p:ap,c:ac,ex:[`${fuAmt(ap,F.p[0])} with ${fuAmt(ac,F.c[0])}`,`${fuAmt(ap,F.p[1])} with ${fuAmt(ac,F.c[2])}`]},
    per:{p:fuR5(p/4),c:fuR5(c/4),f:fuR5(f/4)}};
}
function fuEatenHTML(n){
  if(!n.eaten)return`<button class="btn-out sg-btn" onclick="logGo('lFood')">Log food</button>`;
  const e=n.eaten,left=n.kcal-e.kcal,pc=Math.min(100,Math.round(e.kcal/n.kcal*100));
  const msg=Math.abs(left)<=150?'On target for today.':left>0?`About ${fuN(fuR50(left))} kcal left for today.`:`About ${fuN(fuR50(-left))} kcal over today's estimate.`;
  return`<div class="gl-bar"><div style="width:${pc}%"></div></div><div class="fu-e"><b>${fuN(e.kcal)} of about ${fuN(n.kcal)} kcal eaten.</b> ${msg}${e.protein?` Protein ${e.protein} of ${n.p} g.`:''}</div><button class="btn-out sg-btn" onclick="logGo('lFood')">Add food</button>`;
}
function renderFuel(){
  const el=$('fuelCard');if(!el)return;
  const n=fuelPlan();
  el.style.display='';
  if(!n){
    if(isExampleOnly()&&!S().measurements.length){el.style.display='none';return;}
    el.innerHTML=`<div class="sg-lbl">Fuel today</div><div class="sg-s" style="margin:0 0 12px">Log your weight once and daily protein, carbs and fat targets appear here, matched to your training.</div><button class="btn-out sg-btn" style="margin-top:0" onclick="logGo('lMeas')">Log weight</button>`;
    return;
  }
  const cell=(v,l)=>`<div><b>${v} g</b><span>${l}</span></div>`;
  const food=(k,l)=>`<div class="fu-f"><b>${l}, ${n.per[k]} g</b>${FU_FOODS[k].map(f=>esc(fuAmt(n.per[k],f))).join(', or ')}</div>`;
  const blk=(h,t)=>`<div class="fu-after"><b>${h}</b>${t}</div>`;
  const age=daysAgo(n.wDate),x=n.next;
  el.innerHTML=`<div class="sg-lbl">Fuel today</div>
   <div class="fu-day">${n.label}${n.done||n.level==='rest'||n.level==='race'||n.carbLoad?'':', from today\'s session'}</div>
   <div class="fu-g">${cell(n.p,'Protein')}${cell(n.c,'Carbs')}${cell(n.f,'Fat')}</div>
   <div class="set-note">About ${fuN(n.kcal)} kcal at ${n.kg} kg. Goal: ${FU_GOAL[n.goal]}.${n.carbLoad?' Extra carbs today to fill up before your race.':''}${age>30?` Weight was last logged ${age} days ago.`:''}</div>
   ${fuEatenHTML(n)}
   ${n.week&&n.week.low?blk('You may be eating too little',`Over your last ${n.week.days} logged days you ate about ${fuN(n.week.eaten)} kcal a day against an estimated ${fuN(n.week.burn)} used. That slows recovery. Add a serving of carbs around training.`):''}
   <details class="fm-why"><summary>Session fuelling and food portions</summary>
   ${x?blk(`${x.tom?'Before tomorrow\'s':'Before today\'s'} ${esc(x.name.toLowerCase())}`,`${x.night?x.night+' ':''}${esc(x.before)}`)+(x.simple?'':blk('During it',esc(x.during))):''}
   ${n.after?blk(n.done?'After today\'s session':'After the session',`About ${n.after.p} g protein and ${n.after.c} g carbs within an hour. For example ${esc(n.after.ex[0])}, or ${esc(n.after.ex[1])}.`):''}
   <p style="margin-top:12px"><b>What that looks like in food.</b> Split the day over four servings. One serving is any one of these, for each row:</p>${food('p','Protein')}${food('c','Carbs')}${food('f','Fat')}
   <p>Protein follows your body weight and carbs follow how much you train today. Fat fills the rest of your estimated energy use: about ${fuN(n.burn.rest)} kcal for resting and daily living plus about ${fuN(n.burn.train)} kcal of training${n.burn.planned?', counting today\'s planned session':''}. The app has no all-day activity data, so treat this as a rough guide.</p>
   <p>These are general sports nutrition ranges, not medical advice, and they do not use your blood results. Change the goal in Settings.</p></details>`;
}

// ── Food log (Log > Food): one running total per day ─────────────────────────
function addFood(k){
  const kc=k||+$('fdKcal').value||0,pr=k?0:+$('fdProt').value||0;
  if(!k&&$('fdProt').value&&!$('fdKcal').value){showToast('Enter the calories too');return;}
  if(kc<1||kc>5000){showToast('Calories: 1 to 5,000 per entry');return;}
  if(pr<0||pr>300){showToast('Protein: 0 to 300 g per entry');return;}
  const t=td(),cur=S().foodLogs.find(x=>x.date===t),tot=(cur?.kcal||0)+kc;
  if(tot>6000&&!sane(`That brings today to ${fuN(tot)} kcal.`))return;
  put('food',{id:cur?cur.id:'fd-'+t,date:t,kcal:tot,protein:(cur?.protein||0)+pr});
  $('fdKcal').value='';$('fdProt').value='';
  renderFood();showToast(`Added ${fuN(kc)} kcal`);
}
function resetFood(){
  const cur=S().foodLogs.find(x=>x.date===td());if(!cur||!cur.kcal)return;
  const copy={...cur};
  put('food',{...cur,kcal:0,protein:0});renderFood();
  showToast('Today\'s food cleared',{label:'Undo',fn:()=>{put('food',copy);renderFood();}});
}
function renderFood(){
  if(!$('fdToday'))return;
  const d=S(),fd=fuFood(td()),n=fuelPlan();
  $('fdToday').textContent=fd?fuN(fd.kcal):'0';
  $('foodStat').textContent=fd?`${fuN(fd.kcal)} kcal today`:'Optional. Nothing logged today';
  $('fdNote').textContent=fd&&n?`Today's estimate is about ${fuN(n.kcal)} kcal.${fd.protein?` Protein so far: ${fd.protein} of ${n.p} g.`:''}`:fd&&fd.protein?`Protein so far: ${fd.protein} g.`:'Add each meal as you go, or one total at the end of the day. A rough guess is fine.';
  const past=[1,2,3,4,5,6].map(i=>dAgo(i)).filter(fuFood);
  $('fdHist').innerHTML=past.length?`<div class="hist-box"><div class="hist-ttl">EARLIER THIS WEEK</div>${past.map(dt=>`<div class="hist-row"><span>${fmtDay(dt)}</span><span class="hist-val">${fuN(fuFood(dt).kcal)} kcal</span></div>`).join('')}</div>`:'';
  $('fdCloud').style.display=d.noFoodTbl&&_auth?'':'none';
}
