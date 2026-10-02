// ── FUEL: daily protein, carbs and fat targets from body weight, today's training and the food goal ──
// Foods: [singular, plural, grams of the nutrient per 100 g (unit 'g') or per piece / spoon]
const FU_FOODS={
  p:[['cooked chicken breast','',31,'g'],['egg','eggs',6.3,'pc'],['tempeh','',19,'g'],['cooked fish','',24,'g'],['firm tofu','',12,'g']],
  c:[['cooked rice','',28,'g'],['banana','bananas',25,'pc'],['slice of bread','slices of bread',14,'pc'],['dry oats','',66,'g'],['cooked sweet potato','',20,'g']],
  f:[['avocado','',15,'g'],['peanuts','',49,'g'],['tbsp cooking oil','tbsp cooking oil',14,'pc']]
};
const FU_GOAL={keep:'keep weight',lose:'lose fat',build:'build muscle'};
const FU_DAY={rest:'Rest or very light day',easy:'Easy training day',mod:'Moderate training day',hard:'Hard or long training day',big:'Very long day',race:'Race day'};
const fuGoal=()=>FU_GOAL[S().profile.nutGoal]?S().profile.nutGoal:'keep';
function fuAmt(g,f){
  if(f[3]==='g')return`${Math.max(10,Math.round(g/f[2]*10)*10)} g ${f[0]}`;
  const n=Math.max(1,Math.round(g/f[2]));return`${n} ${n===1?f[0]:f[1]}`;
}
function fuelPlan(){
  const d=S(),ex=isExampleOnly();
  const m=last(d.measurements.filter(x=>x.weight>=30&&x.weight<=250&&(ex||!x.isEx)).sort((a,b)=>a.date<b.date?-1:1));
  if(!m)return null;
  const kg=m.weight,goal=fuGoal(),t=td(),done=stWs().filter(w=>w.date===t),st=strategy(),x=st&&st.days[0],ph=racePhase();
  let mins=0,hard=false,str=false,race=false;
  if(done.length){mins=done.reduce((a,w)=>a+(w.durMin||0),0);hard=stHard(t,done);str=done.every(w=>IS_STR(w.type));}
  else if(x&&x.role==='race'){race=true;hard=true;mins=120;}
  else if(x&&x.role!=='rest'&&x.role!=='recover'&&x.role!=='gentle'){mins=(x.lo+x.hi)/2;hard=x.role==='hard';str=x.role==='strength';}
  const level=race?'race':mins<20?'rest':mins>=150?'big':hard||mins>=60?'hard':str||mins>=45?'mod':'easy';
  // grams per kg of body weight; carbs follow the day's training
  let ck={rest:3,easy:4,mod:5,hard:mins>=90?7:6,big:8,race:8}[level];
  if(ph&&ph.n===1)ck=Math.max(ck,7);
  if(goal==='lose')ck=Math.max(2.5,ck-1);else if(goal==='build')ck+=0.5;
  const pk=goal!=='keep'?2:level==='rest'||level==='easy'?1.6:1.8,fk=goal==='lose'?0.8:1;
  const r5=n=>Math.round(n/5)*5;
  const p=r5(pk*kg),c=r5(ck*kg),f=r5(fk*kg);
  const ap=r5(0.3*kg),ac=r5((level==='hard'||level==='big'||level==='race'?1:0.5)*kg);
  const F=FU_FOODS;
  return{kg,wDate:m.date,goal,level,label:ph&&ph.n===1&&!race?'Day before your race':FU_DAY[level],done:done.length>0,carbLoad:!!(ph&&ph.n===1),p,c,f,kcal:Math.round((p*4+c*4+f*9)/50)*50,
    after:level==='rest'?null:{p:ap,c:ac,ex:[`${fuAmt(ap,F.p[0])} with ${fuAmt(ac,F.c[0])}`,`${fuAmt(ap,F.p[1])} with ${fuAmt(ac,F.c[2])}`]},
    per:{p:r5(p/4),c:r5(c/4),f:r5(f/4)}};
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
  const age=daysAgo(n.wDate);
  el.innerHTML=`<div class="sg-lbl">Fuel today</div>
   <div class="fu-day">${n.label}${n.done||n.level==='rest'||n.level==='race'||n.carbLoad?'':', from today\'s session'}</div>
   <div class="fu-g">${cell(n.p,'Protein')}${cell(n.c,'Carbs')}${cell(n.f,'Fat')}</div>
   <div class="set-note">About ${n.kcal.toLocaleString('en-US')} kcal at ${n.kg} kg. Goal: ${FU_GOAL[n.goal]}.${n.carbLoad?' Extra carbs today to fill up before your race.':''}${age>30?` Weight was last logged ${age} days ago.`:''}</div>
   ${n.after?`<div class="fu-after"><b>After the session</b>About ${n.after.p} g protein and ${n.after.c} g carbs within an hour. For example ${esc(n.after.ex[0])}, or ${esc(n.after.ex[1])}.</div>`:''}
   <details class="fm-why"><summary>What that looks like in food</summary>
   <p>Split the day over four servings. One serving is any one of these, for each row:</p>${food('p','Protein')}${food('c','Carbs')}${food('f','Fat')}
   <p>Protein and fat follow your body weight. Carbs follow how much you train today. These are general sports nutrition ranges, not medical advice, and they do not use your blood results. Change the goal in Settings.</p></details>`;
}
