// ── FUEL: daily protein, carbs and fat targets from body weight, today's training and the food goal ──
// Foods: [singular, plural, grams of the nutrient per 100 g (unit 'g') or per piece / spoon]
const FU_FOODS={
  p:[['cooked chicken breast','',31,'g'],['egg','eggs',6.3,'pc'],['tempeh','',19,'g'],['cooked fish','',24,'g'],['firm tofu','',12,'g']],
  c:[['cooked rice','',28,'g'],['banana','bananas',25,'pc'],['slice of bread','slices of bread',14,'pc'],['dry oats','',66,'g'],['cooked sweet potato','',20,'g']],
  f:[['avocado','',15,'g'],['peanuts','',49,'g'],['tbsp cooking oil','tbsp cooking oil',14,'pc']],
  d:[['banana','bananas',25,'pc'],['energy gel','energy gels',22,'pc'],['date','dates',16,'pc']]
};
const FU_GOAL={keep:'keep weight',lose:'lose fat',build:'build muscle'};
const FU_DAY={rest:'Rest or very light day',easy:'Easy training day',mod:'Moderate training day',hard:'Hard or long training day',big:'Very long day',huge:'Very long day',race:'Race day'};
// v132: a day's protein and carbs as everyday foods: [index in FU_FOODS, share of the grams]
const FU_MIX={p:[[0,.5],[1,.15],[2,.2],[4,.15]],c:[[0,.55],[3,.15],[1,.15],[2,.15]]};
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
  return last(S().measurements.filter(x=>x.weight>=30&&x.weight<=250&&(ex||!x.isEx)).sort(msCmp));
}
// ── Energy use (estimate): resting use x 1.35 for daily living, plus training ──
// steps for a day from Intervals.icu wellness (Polar), when the watch counted them
const fuSteps=dt=>{const w=(S().wellness||{})[dt];return w&&w.steps>0?w.steps:null;};
// daily-living factor: 1.35 flat, or from the day's steps once the user allowed it (about 1.2 at rest, 1.6 at 10,000 steps)
function fuAct(dt){const st=S().profile.useSteps&&dt?fuSteps(dt):null;return st?Math.max(TH.LIVE_K,Math.min(TH.LIVE_MAX,TH.LIVE_K+st/TH.LIVE_STEPS)):1.35;}
// resting use (Mifflin-St Jeor; sex unset = the average of the two)
function fuBmr(kg){
  const p=S().profile,sx=p.sex==='m'?5:p.sex==='f'?-161:-78;
  return p.height>=120&&p.age>=14?10*kg+6.25*p.height-5*p.age+sx:23*kg;
}
const fuRest=(kg,dt)=>fuBmr(kg)*fuAct(dt);
const fuSess=(type,mins,rpe,kg)=>((FU_MET[type]||FU_MET.Cycle)[Math.max(1,Math.min(5,Math.round(rpe)||3))-1]-1)*kg*mins/60;
// strength workouts have no duration field: about 3 minutes a set
const fuMin=w=>w.durMin||(IS_STR(w.type)?Math.min(90,(w.sets||[]).length*3)||30:0);
function fuWk(w,kg){
  const mins=fuMin(w),k=wIcu(w).kcal;
  return k?Math.max(0,k-kg*mins/60):fuSess(w.type,mins,w.rpe,kg);
}
const fuBurn=(dt,kg)=>fuRest(kg,dt)+stWs().filter(w=>w.date===dt).reduce((a,w)=>a+fuWk(w,kg),0);
const fuFood=dt=>{const r=S().foodLogs.find(x=>x.date===dt);return r&&r.kcal>0?r:null;};

// v132: the grams as foods (FU_MIX): weighed foods to 10 g, from 100 g to 50 g, pieces whole; g = the nutrient they add up to
function fuMix(g,k){
  const it=FU_MIX[k].map(([i,sh])=>{
    const f=FU_FOODS[k][i],a=g*sh/f[2];
    if(f[3]==='g'){const r=a*100>=100?50:10,n=Math.max(r,Math.round(a*100/r)*r);return{f,n,g:n*f[2]/100,txt:`${n} g ${f[0]}`};}
    const n=Math.max(1,Math.round(a));return{f,n,g:n*f[2],txt:`${n} ${n===1?f[0]:f[1]}`};
  });
  const R=it.map(x=>({...x,g:Math.round(x.g)}));
  return{g:R.reduce((a,x)=>a+x.g,0),items:R};
}
// Before and during the next session that needs fuelling (today's if still to do, else tomorrow's)
// v132: carbs during by length (R10.3: TH.FUEL_H* / TH.FUEL_G*, mixed sugars from TH.FUEL_H3), what to drink and lose at most
// TH.SWEAT_LOSS of body weight (R10.4), and TH.CARB_EVE g/kg more the evening before a long session or a race (eve)
function fuNext(st,kg,done){
  if(!st)return null;
  const c=[!done&&st.days[0],st.days[1]].filter(x=>x&&FU_TRAIN(x.role)).map(x=>{const race=x.role==='race',mins=race?120:(x.lo+x.hi)/2;return{x,race,mins,hard:race||x.role==='hard',big:race||x.role==='hard'||mins>=TH.FUEL_H1};});
  const o=c.find(y=>y.big)||c[0];
  if(!o)return null;
  const{x,race,mins,hard}=o,tom=x!==st.days[0],F=FU_FOODS,name=x.name;
  if(!o.big)return{tom,name,mins:Math.round(mins),simple:true,hard:false,rate:0,before:'No special fuelling needed. If your last meal was more than 3 hours ago, have a small snack such as a banana.',during:'Water is enough.',drink:'',night:'',eve:0};
  const pre=fuR5((race?1.5:1)*kg);
  const before=`About ${pre} g of carbs 2 to 3 hours before, with little fat: ${fuAmt(pre,F.c[0])}, or ${fuAmt(pre,F.c[2])}.${race?'':' Training early? A banana 30 minutes before is enough.'}`;
  const rate=fuRate(x.type,mins),mixed=rate>=TH.FUEL_G3,sweat=Math.floor(TH.SWEAT_LOSS*kg*10)/10;
  const during=rate?`About ${rate} g of carbs an hour after the first 30 minutes${mixed?', from mixed sugars (glucose with fructose)':''}, such as ${F.d.map(f=>fuAmt(rate,f)).join(' or ')}.`:'Water only. Sip when thirsty.';
  const drink=rate?`About 500 ml an hour, more in the heat. Lose less than ${sweat} kg.`:'';
  const eve=tom&&(race||x.role==='long'||mins>=90)?fuR5(TH.CARB_EVE*kg):0;
  const night=eve?`An extra ${fuAmt(eve,F.c[0])} at dinner, about ${eve} g of carbs.`:'';
  return{tom,name,type:x.type,mins:Math.round(mins),hard,rate,mixed,sweat,before,during,drink,night,eve};
}
// carbs an hour during a session (R10.3): none under TH.FUEL_H1 minutes or for strength, then TH.FUEL_G1 / G2 / G3 from H1 / H2 / H3
const fuRate=(type,mins)=>IS_STR(type)||mins<TH.FUEL_H1?0:mins<TH.FUEL_H2?TH.FUEL_G1:mins<TH.FUEL_H3?TH.FUEL_G2:TH.FUEL_G3;
// ── v132 coffee: the last cup from your own bedtime (R7.3) and caffeine before a hard session only when it fits before that (R10.6) ──
const fuClk=m=>{const x=((Math.round(m)%1440)+1440)%1440;return String(Math.floor(x/60)).padStart(2,'0')+':'+String(x%60).padStart(2,'0');};
// the median bedtime of your newest TH.CAF_BED_N nights (within twice that many days) minus TH.CAF_GAP, down to TH.CAF_ROUND minutes;
// null under TH.CAF_MIN_N nights
function cafCut(t=td()){
  const ex=isExampleOnly(),o=daysAgo(t);
  const B=S().sleepLogs.filter(r=>slHmOk(r.bed)&&(ex||!r.isEx)&&daysAgo(r.date)>=o&&daysAgo(r.date)<o+2*TH.CAF_BED_N)
    .sort((a,b)=>a.date<b.date?1:-1).slice(0,TH.CAF_BED_N).map(r=>slNoon(r.bed));
  if(B.length<TH.CAF_MIN_N)return null;
  const bed=dyMed(B),cut=Math.floor((bed+720-TH.CAF_GAP)/TH.CAF_ROUND)*TH.CAF_ROUND;
  return{cut:fuClk(cut),cutMin:((cut%1440)+1440)%1440,bed:fuClk(bed+720),gapH:Math.round(TH.CAF_GAP/60),n:B.length};
}
// your usual start: the median start time of TH.CAF_MIN_N+ timed training sessions in the last TH.CAF_T_D days (minutes from midnight)
function cafStart(t=td()){
  const o=daysAgo(t),T=wkOn().filter(w=>{const d=daysAgo(w.date);return d>=o&&d<o+TH.CAF_T_D&&stTrains(w)&&slHmOk(wIcu(w).t);})
    .map(w=>{const[h,m]=wIcu(w).t.split(':').map(Number);return h*60+m;});
  return T.length>=TH.CAF_MIN_N?dyMed(T):null;
}
// TH.CAF_MGKG mg/kg TH.CAF_PRE minutes before a hard session or a race, only when that falls by the cut-off: with a usual start
// after it, nothing; without one, "if it starts by" the cut-off plus TH.CAF_PRE
function cafPre(kg,nx,t=td()){
  if(!nx||!nx.hard)return null;
  const C=cafCut(t);if(!C)return null;
  const st=cafStart(t);if(st!=null&&st-TH.CAF_PRE>C.cutMin)return null;
  const mg=fuR5(TH.CAF_MGKG*kg),cups=Math.max(1,Math.round(mg/TH.CAF_CUP)),by=st==null?fuClk(C.cutMin+TH.CAF_PRE):null;
  return{mg,cups,by,start:st==null?null:fuClk(st),txt:`${cups} ${cups===1?'cup':'cups'} of coffee, about ${mg} mg of caffeine, an hour before the session${by?`, if it starts by ${by}`:''}.`};
}
// the logged days of the 7 days ending on `end`, eaten against estimated use; low when TH.FOOD_LOW_N+ days average
// TH.FOOD_LOW kcal (TH.FOOD_LOW_LOSE when losing) under it, null with fewer days (shared by fuelPlan and redsSigns)
function fuWeekLow(end,kg){
  const wk=[0,1,2,3,4,5,6].map(i=>stAdd(end,-i)).filter(fuFood).map(dt=>({e:fuFood(dt).kcal,b:fuBurn(dt,kg)}));
  if(!wk.length)return null;
  const ok=wk.length>=TH.FOOD_LOW_N,gap=ok?avg(wk.map(d=>d.b-d.e)):0;
  return{days:wk.length,eaten:avg(wk.map(d=>d.e)),burn:avg(wk.map(d=>d.b)),gap,low:ok?gap>(fuGoal()==='lose'?TH.FOOD_LOW_LOSE:TH.FOOD_LOW):null};
}
function fuelPlan(){
  const m=fuWeight();
  if(!m)return null;
  const kg=m.weight,goal=fuGoal(),t=td(),done=stWs().filter(w=>w.date===t),st=strategy(),x=st&&st.days[0],ph=racePhase();
  let mins=0,hard=false,str=false,race=false,plan=0;
  if(done.length){mins=done.reduce((a,w)=>a+fuMin(w),0);hard=stHard(t,done);str=done.every(w=>IS_STR(w.type));}
  else if(x&&x.role==='race'){race=true;hard=true;mins=120;plan=fuSess(x.type,mins,5,kg);}
  else if(x&&FU_TRAIN(x.role)){mins=(x.lo+x.hi)/2;hard=x.role==='hard';str=x.role==='strength';plan=fuSess(x.type,mins,x.effort,kg);}
  // v132: 'huge' from TH.CARB_LONG_MIN minutes, up to TH.CARB_LONG g/kg of carbs (R10.1)
  const level=race?'race':mins<20?'rest':mins>=TH.CARB_LONG_MIN?'huge':mins>=150?'big':hard||mins>=60?'hard':mins>=45?'mod':'easy';
  const nx=fuNext(st,kg,done.length>0),carbLoad=!!(ph&&ph.n===1);
  // grams per kg of body weight; carbs follow the day's training, plus TH.CARB_EVE the evening before a long session
  let ck={rest:3,easy:4,mod:5,hard:mins>=90?7:6,big:8,huge:TH.CARB_LONG,race:8}[level];
  if(carbLoad)ck=Math.max(ck,7);else if(nx&&nx.eve)ck+=TH.CARB_EVE;
  if(goal==='lose')ck=Math.max(2.5,ck-1);else if(goal==='build')ck+=0.5;
  const pk=goal==='lose'?TH.PRO_LOSE:goal==='build'?2:!str&&(level==='rest'||level==='easy')?1.6:1.8;
  const p=fuR5(pk*kg),c=fuR5(ck*kg);
  // fat fills what is left of the day's estimated energy use, kept between 0.6 and 1.5 g per kg
  const rest=fuRest(kg,t),train=fuBurn(t,kg)-rest+plan,burn=rest+train,aim=burn+(goal==='lose'?-400:goal==='build'?250:0);
  const f=fuR5(Math.max(0.6*kg,Math.min(1.5*kg,(aim-p*4-c*4)/9)));
  const kcal=fuR50(p*4+c*4+f*9),fd=fuFood(t);
  // logged days in the last week (not today, which is still open): eaten against estimated use
  const W=fuWeekLow(dAgo(1),kg);
  const ap=fuR5(0.3*kg),ac=fuR5((['hard','big','huge','race'].includes(level)?1:0.5)*kg);
  const F=FU_FOODS,meal=Math.round(TH.PRO_MEAL*kg),cut=cafCut(t);
  return{kg,wDate:m.date,wSrc:m.src&&m.src.weight==='icu'?'icu':'man',steps:fuSteps(t),useSteps:S().profile.useSteps,goal,level,label:carbLoad&&!race?'Day before your race':FU_DAY[level],done:done.length>0,carbLoad,p,c,f,kcal,pk,ck,
    burn:{total:fuR50(burn),rest:fuR50(rest),train:fuR50(train),planned:plan>0},
    eaten:fd?{kcal:fd.kcal,protein:fd.protein||0}:null,
    week:W?{days:W.days,eaten:fuR50(W.eaten),burn:fuR50(W.burn),gap:fuR50(W.gap),low:!!W.low}:null,
    next:nx,
    after:level==='rest'?null:{p:ap,c:ac,ex:[`${fuAmt(ap,F.p[0])} with ${fuAmt(ac,F.c[0])}`,`${fuAmt(ap,F.p[1])} with ${fuAmt(ac,F.c[2])}`]},
    per:{p:fuR5(p/4),c:fuR5(c/4),f:fuR5(f/4),meal,mealEx:[fuAmt(meal,F.p[0]),fuAmt(meal,F.p[1])]},
    foods:{p:fuMix(p,'p'),c:fuMix(c,'c')},
    caf:cut?{cut,pre:cafPre(kg,nx,t)}:null};
}
// ── Food log (Log > Food): one record per day, five meal slots (v98) ─────────
// foodLogs[] {date, kcal, protein, meals:{breakfast|snackAm|lunch|snackPm|dinner|unassigned:{kcal,protein}}}
// kcal and protein stay the day totals, so fuelPlan, sync and the briefing read them unchanged (the Fuel card was removed in v112).
const FD_SLOTS=[['breakfast','Breakfast'],['snackAm','Morning snack'],['lunch','Lunch'],['snackPm','Afternoon snack'],['dinner','Dinner']];
const FD_NAME=Object.fromEntries(FD_SLOTS.concat([['unassigned','Not assigned']]));
let _fdSlot=null;
// meals of a record; a record from before v98 or from a device without the column counts as unassigned
const fdMeals=r=>r&&r.meals&&typeof r.meals==='object'?r.meals:r&&(r.kcal>0||r.protein>0)?{unassigned:{kcal:r.kcal||0,protein:r.protein||0}}:{};
const fdTot=m=>Object.values(m).reduce((a,x)=>({kcal:a.kcal+(+x.kcal||0),protein:a.protein+(+x.protein||0)}),{kcal:0,protein:0});
// the slot the clock suggests: breakfast until 10, lunch 12 to 15, dinner from 18
const fdSlotNow=()=>{const h=new Date().getHours();return h<10?'breakfast':h<12?'snackAm':h<15?'lunch':h<18?'snackPm':'dinner';};
const fdSlot=()=>_fdSlot||fdSlotNow();
function pickMeal(k){_fdSlot=k;renderFood();}
function fdSave(t,meals){const cur=S().foodLogs.find(x=>x.date===t),tot=fdTot(meals);put('food',{id:cur?cur.id:'fd-'+t,date:t,kcal:tot.kcal,protein:tot.protein,meals});}
function addFood(k){
  const kc=k||+$('fdKcal').value||0,pr=k?0:+$('fdProt').value||0;
  if(!k&&$('fdProt').value&&!$('fdKcal').value){showToast('Enter the calories too');return;}
  if(kc<1||kc>5000){showToast('Calories: 1 to 5,000 per entry');return;}
  if(pr<0||pr>300){showToast('Protein: 0 to 300 g per entry');return;}
  const t=td(),cur=S().foodLogs.find(x=>x.date===t),meals={...fdMeals(cur)},slot=fdSlot(),m=meals[slot]||{kcal:0,protein:0};
  const tot=fdTot(meals).kcal+kc;
  if(tot>6000&&!sane(`That brings today to ${fuN(tot)} kcal.`))return;
  meals[slot]={kcal:(+m.kcal||0)+kc,protein:(+m.protein||0)+pr};
  fdSave(t,meals);
  $('fdKcal').value='';$('fdProt').value='';
  renderFood();showToast(`Added ${fuN(kc)} kcal to ${FD_NAME[slot].toLowerCase()}`);
}
function clearMeal(k){
  const t=td(),cur=S().foodLogs.find(x=>x.date===t);if(!cur)return;
  const meals={...fdMeals(cur)};if(!meals[k])return;
  const copy={...cur,meals:fdMeals(cur)};delete meals[k];fdSave(t,meals);renderFood();
  showToast(`${FD_NAME[k]} cleared`,{label:'Undo',fn:()=>{put('food',copy);renderFood();}});
}
function resetFood(){
  const cur=S().foodLogs.find(x=>x.date===td());if(!cur||!cur.kcal)return;
  const copy={...cur,meals:fdMeals(cur)};
  put('food',{...cur,kcal:0,protein:0,meals:{}});renderFood();
  showToast('Today\'s food cleared',{label:'Undo',fn:()=>{put('food',copy);renderFood();}});
}
function fdSlotsHTML(rec){
  const m=fdMeals(rec),sel=fdSlot();
  const row=(k,l)=>{const x=m[k],has=x&&(x.kcal>0||x.protein>0);
    return`<div class="fd-slot ${k===sel?'sel':''} ${has?'has':''}" role="button" tabindex="0" onclick="pickMeal('${k}')"><span class="fd-l">${l}</span><span class="fd-v">${has?fuN(x.kcal)+' kcal'+(x.protein?' · '+x.protein+' g':''):''}</span>${has?`<button class="fd-x" onclick="event.stopPropagation();clearMeal('${k}')" aria-label="Clear ${l}">×</button>`:'<span></span>'}</div>`;};
  return FD_SLOTS.map(([k,l])=>row(k,l)).join('')+(m.unassigned&&(m.unassigned.kcal>0||m.unassigned.protein>0)?row('unassigned',FD_NAME.unassigned):'');
}
function renderFood(){
  if(!$('fdToday'))return;
  const d=S(),t=td(),rec=d.foodLogs.find(x=>x.date===t),fd=fuFood(t),n=fuelPlan();
  $('fdToday').textContent=fd?fuN(fd.kcal):'0';
  lgStat();
  $('fdNote').textContent=fd&&n?`Today's estimate is about ${fuN(n.kcal)} kcal.${fd.protein?` Protein so far: ${fd.protein} of ${n.p} g.`:''}`:fd&&fd.protein?`Protein so far: ${fd.protein} g.`:'Pick a meal, then add what you ate. A rough guess is fine.';
  $('fdSlots').innerHTML=fdSlotsHTML(rec);
  $('fdAddTo').textContent=`Add to ${FD_NAME[fdSlot()].toLowerCase()}`;
  const past=[1,2,3,4,5,6].map(i=>dAgo(i)).filter(fuFood);
  $('fdHist').innerHTML=past.length?`<div class="hist-box"><div class="hist-ttl">EARLIER THIS WEEK</div>${past.map(dt=>`<div class="hist-row"><span>${fmtDay(dt)}</span><span class="hist-val">${fuN(fuFood(dt).kcal)} kcal</span></div>`).join('')}</div>`:'';
  $('fdCloud').style.display=d.noFoodTbl&&_auth?'':'none';
}
