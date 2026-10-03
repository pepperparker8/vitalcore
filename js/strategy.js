// ── STRATEGY: today's session and a rolling 7-day outline, computed from recovery, load, plan and history ──
const LOWER=/knee|ankle|hip|calf|foot|feet|shin|hamstring|quad|achilles|thigh|groin|glute|leg/i;
const ST_DEF={Run:40,Cycle:60,Swim:40,Weights:45,Calisthenics:30,Hike:90,Walk:40,Yoga:30};
const ST_HARD=/interval|tempo|hard|threshold|speed|race|hill|fast|quality/i,ST_LONG=/long/i,ST_EASY=/easy|recover|light|gentle/i;
const ST_MODE={
  start:['Getting started','Log two full weeks of training and a weekly time target appears here.'],
  taper:['Taper','Your goal is close. Training time comes down so you arrive fresh.'],
  recover:['Recovering','Recovery has been low this week, so training time comes down until it lifts.'],
  easier:['Easier week','Three full weeks in a row. An easier week lets your body absorb the work.'],
  hold:['Holding steady','Training time stays where it is until recovery is clearly good.'],
  build:['Building','Recovery is good, so training time goes up a little, about 7 percent.']
};
const stWs=()=>{const d=S();return isExampleOnly()?d.workouts:d.workouts.filter(w=>!w.isEx);};
// a hard day: effort 4 or 5 logged, or a watch-recorded day in the top quarter of your loads
function stHard(dt,ws){
  if(ws.some(w=>(w.rpe||0)>=4))return true;
  return ws.some(w=>wIcu(w).load>0&&!w.rpe)&&strainOf(dayLoad(dt))>=12;
}
// this week's minutes target: usual week x a factor chosen from recovery, the last three weeks and the race phase
function stWeek(){
  const L=raceLoad(),ph=racePhase(),d=S(),ws=stWs();
  const m=new Date(td()+'T12:00:00');m.setDate(m.getDate()-((m.getDay()+6)%7));
  const wk=o=>{const a=new Date(m);a.setDate(a.getDate()+o*7);const b=new Date(a);b.setDate(b.getDate()+7);const A=ymd(a),B=ymd(b);
    return ws.filter(w=>w.date>=A&&w.date<B).reduce((t,w)=>t+(w.durMin||0),0);};
  const base=L.base,p3=[-3,-2,-1].map(wk);
  const rh=Object.entries(d.readHist||{}).filter(([k,v])=>v!=null&&daysAgo(k)>=1&&daysAgo(k)<7).map(x=>x[1]);
  const sc=calcReadiness();if(sc!=null)rh.push(sc);
  const rAvg=rh.length>=3?avg(rh):sc;
  const full=base&&p3.every(x=>x>=base*0.9);
  const pm=ph&&ph.n>=0?ph.mult:1;
  let mode,f;
  if(pm<1){mode='taper';f=pm;}
  else if(!base){mode='start';f=1;}
  else if((rAvg!=null&&rAvg<50)||calcBurnout().score>=60){mode='recover';f=0.85;}
  else if(full){mode='easier';f=0.75;}
  else if(rAvg==null||rAvg<65||p3[2]>base*1.25){mode='hold';f=Math.min(1.2,pm);}
  else{mode='build';f=Math.min(1.2,1.07*pm);}
  const r5=n=>Math.max(5,Math.round(n/5)*5);
  // next week: easier if this one would be the third full week; back to normal after an easier week
  const nextF=mode==='easier'||mode==='recover'?1:mode!=='taper'&&mode!=='start'&&p3[1]>=base*0.9&&p3[2]>=base*0.9?0.75:f;
  // factor for the day i days from now; the taper follows the race calendar day by day
  const fAt=(i,next)=>{
    if(ph&&ph.n>=0){const n=ph.n-i;if(n<0)return 0.5;const x=RACE_PH.find(r=>n>=r.min);if(x.mult<1)return x.mult;}
    return next?nextF:f;
  };
  return{mode,f,base,now:Math.round(L.now),target:base?r5(base*f):null,label:mode==='taper'&&ph?ph.k:ST_MODE[mode][0],why:ST_MODE[mode][1],fAt,ph};
}
function strategy(){
  const sc=calcReadiness();if(sc===null)return null;
  const d=S(),t=td(),ws=stWs(),W=stWeek(),v=coachVerdict(),tsb=d.intervalsData&&d.intervalsData.tsb;
  const rec=ws.filter(w=>daysAgo(w.date)>=0&&daysAgo(w.date)<=42);
  const cnt=ty=>rec.filter(w=>w.type===ty).length;
  const med=ty=>{const a=rec.filter(w=>w.type===ty&&w.durMin).map(w=>w.durMin).sort((x,y)=>x-y);return a.length?a[Math.floor(a.length/2)]:ST_DEF[ty]||40;};
  const mx=ty=>Math.max(0,...rec.filter(w=>w.type===ty).map(w=>w.durMin||0));
  const inj=d.injuries.filter(i=>i.active),sev=inj.length?Math.max(...inj.map(i=>i.sev)):0;
  const lowerHurt=inj.some(i=>LOWER.test(i.part)&&i.sev>=2);
  const ranked=['Run','Cycle','Swim'].sort((a,b)=>cnt(b)-cnt(a));
  const main=ranked[0],alt=cnt(ranked[1])>=Math.max(2,cnt(main)*0.25)?ranked[1]:null;
  const strT=cnt('Calisthenics')>cnt('Weights')?'Calisthenics':'Weights';
  // usual training days per week, from the weeks in the last four that had any training
  const wkN=[0,1,2,3].map(k=>new Set(ws.filter(w=>daysAgo(w.date)>=1+k*7&&daysAgo(w.date)<=7+k*7).map(w=>w.date)).size).filter(x=>x>0);
  const N=Math.max(3,Math.min(6,wkN.length?Math.round(avg(wkN)):3)),maxRun=N<=3?1:N<=4?2:N<=5?3:6;
  const plans=PL_DAYS.map((_,i)=>planOf(i)),hasPlan=plans.some(Boolean);
  const planHas=re=>plans.some(p=>p&&re.test(p.note||''));
  const planHard=planHas(ST_HARD),planLong=planHas(ST_LONG);
  const sore=(d.checkins.find(c=>c.date===t)||{}).soreness||0;
  const r5=n=>Math.max(10,Math.round(n/5)*5);
  const wd0=(new Date(t+'T12:00:00').getDay()+6)%7;
  // what actually happened on the six days before today, then the outline is appended day by day
  const seq=[];
  for(let i=6;i>=1;i--){const dt=dAgo(i),x=ws.filter(w=>w.date===dt);seq.push({tr:x.length>0,hard:stHard(dt,x),str:x.some(w=>IS_STR(w.type)),end:x.some(w=>!IS_STR(w.type)&&w.type!=='Yoga'&&w.type!=='Walk')});}
  let gapStr=Math.min(99,...rec.filter(w=>IS_STR(w.type)&&daysAgo(w.date)>=1).map(w=>daysAgo(w.date)));
  let longDone=false,flip=false;
  const days=[];
  for(let i=0;i<7;i++){
    const dt=dAgo(-i),wd=(wd0+i)%7,pl=planOf(wd),inWk=i<=6-wd0,f=W.fAt(i,!inWk);
    const p6=seq.slice(-6),nTr=p6.filter(x=>x.tr).length,nHard=p6.filter(x=>x.hard).length,prev=last(seq);
    let run=0;for(let k=seq.length-1;k>=0&&seq[k].tr;k--)run++;
    const o={i,date:dt,wd,planned:pl?{type:pl.type,note:pl.note||''}:null,bent:false};
    const today=ws.filter(w=>w.date===dt);
    if(i===0&&today.length){
      seq.push({tr:true,hard:stHard(dt,today),str:today.some(w=>IS_STR(w.type))});
      if(today.some(w=>IS_STR(w.type)))gapStr=0;else gapStr++;
      const min=today.reduce((a,w)=>a+(w.durMin||0),0);
      days.push({...o,done:true,role:'done',type:today[0].type,effort:0,name:'Done: '+[...new Set(today.map(w=>w.type))].join(', '),dur:min?fmtDur(min):'',how:'',why:'Logged today.'});
      continue;
    }
    const maxHard=f<=0.4||rec.length<4?0:W.mode==='easier'||W.mode==='recover'||W.mode==='start'||N<=3||f<1?1:2;
    const canHard=!prev.hard&&nHard<maxHard&&sev<2;
    const pick=()=>rec.length<4?'easy':canHard?'hard':gapStr>=4&&sev<2&&f>0.5&&p6.filter(x=>x.str).length<2?'strength':wd>=5&&!longDone&&f>=0.9?'long':'easy';
    let role,type=main,why='';
    if(W.ph&&W.ph.n===i){role='race';why='Race day. Trust your training.';}
    else if(W.ph&&W.ph.n===i-1){role='rest';why='Recover after your race.';}
    else if(hasPlan){
      if(!pl||pl.type==='Rest'){role='rest';why=pl?'Rest is on your plan. Recovery is when you adapt.':'Nothing planned for this day.';}
      else if(IS_STR(pl.type)){role='strength';type=pl.type;why=sev>=2?'On your plan. Do not load the injured area.':'On your plan.';}
      else if(pl.type==='Yoga'||pl.type==='Walk'){role='gentle';type=pl.type;why='On your plan.';}
      else{
        type=pl.type;const n=pl.note||'';
        const want=ST_HARD.test(n)?'hard':ST_LONG.test(n)?'long':ST_EASY.test(n)?'easy':type==='Hike'?'steady':null;
        role=want||(canHard&&!planHard?'hard':wd>=5&&!longDone&&!planLong&&f>=0.9?'long':'easy');
        why='On your plan.';
        if(role==='hard'&&!canHard){role='easy';o.bent=true;why=sev>=2?'Plan says hard. Kept easy while your injury is active.':prev.hard?'Plan says hard. Kept easy because the day before is hard too.':'Plan says hard. Kept easy to limit hard days this week.';}
      }
    }else{
      if(run>=maxRun||nTr>=N){role='rest';why=nTr>=N?`${nTr} sessions in the last 6 days. Rest lets the work sink in.`:run>1?`${run} training days in a row. Rest lets the work sink in.`:'A rest day after training. That is when you adapt.';}
      else{
        role=pick();
        why=role==='hard'?'Fresh after an easier day. A good day to push.':role==='strength'?(gapStr>=99?'No strength work logged lately.':`No strength work for ${gapStr} days.`):role==='long'?'Your longer session of the week.':prev.hard?'Easy day after a hard one.':'Easy volume builds fitness without much fatigue.';
        if(role==='strength')type=strT;
        else if(role==='easy'&&alt){type=flip?alt:main;flip=!flip;}
      }
    }
    // today bends to the body's signals
    if(i===0&&role!=='race'){
      const hf=coachFlags().find(x=>x.hard);
      if(sev>=3||(v&&v.lvl==='bad')){
        const was=pl&&pl.type!=='Rest'?` Your plan says ${pl.type}. Move it a day.`:'';
        role='recover';o.bent=!!was;
        why=(sev>=3?'A serious injury is active.':sc<45?'Recovery is low, so rest is the training today.':hf?hf.t+'.':'Recovery is the priority today.')+was;
      }else if(role!=='rest'&&role!=='gentle'){
        const cap=prev.hard?'You trained hard yesterday.':sore>=3?'You are sore today.':sc<65?'Recovery is moderate.':(tsb!=null&&tsb<-12)?'You are carrying fatigue.':v&&v.lvl==='warn'?'Some recovery signals are off.':'';
        if(cap){
          if(role==='hard'||role==='long'||role==='steady'){o.bent=hasPlan;role='easy';why=cap+' Keep it easy and short.'+(hasPlan&&pl?` Plan: ${pl.type}${pl.note?', '+pl.note:''}.`:'');}
          else if(role==='strength'){o.light=true;why=cap+' Lift lighter than usual.';}
          else why=cap+' Build base without adding stress.';
        }else if(role==='hard')why=hasPlan?'On your plan, and you are recovered enough to do it well.':'You are recovered and yesterday was easy. A good day to push.';
      }
    }
    // this week's target already reached: no more hard or long sessions this week
    if(inWk&&W.target&&W.now>=W.target&&(role==='hard'||role==='long')){role='easy';o.bent=hasPlan;why='This week\'s time target is already reached. Keep it easy.';}
    if(lowerHurt&&['Run','Cycle','Hike','Walk'].includes(type)&&role!=='rest'&&role!=='recover'&&role!=='race'&&role!=='strength'){type='Swim';o.bent=o.bent||hasPlan;why+=' Low impact because of your leg injury.';}
    if(i>0&&sev>=3&&role!=='rest'&&role!=='race')why='Only if your injury allows. Otherwise rest.';
    if(f<=0.5&&role==='easy'&&/^(Easy volume|Easy day|On your plan\.$)/.test(why))why=f===0.5?'Easy days after your race.':'Race week. Keep the legs fresh.';
    let dur=0,effort=0,name,how;
    if(role==='rest'){name='Rest';how='No training. Sleep and eat well.';}
    else if(role==='recover'){name='Rest or gentle mobility';dur=20;effort=1;how='Gentle stretching, yoga or a walk. Full rest is fine too.';type='Yoga';}
    else if(role==='race'){name=d.profile.goalName||'Race day';effort=5;how='Warm up well and start slower than you think.';}
    else if(role==='gentle'){name=type==='Walk'?'Easy walk':'Yoga';dur=med(type);effort=1;how='Very easy. This is recovery, not training.';}
    else if(role==='strength'){name=type==='Weights'?'Strength session':'Calisthenics session';dur=med(type)*Math.min(1,f);effort=o.light?2:3;how=o.light?'Lighter than usual. Stop each set with 3 or more reps left.':'Steady effort. Stop each set with 1 to 3 reps left.';}
    else if(role==='hard'){name='Hard '+type.toLowerCase();dur=med(type)*f;effort=4;how=f<1?'Warm up 10 min easy, then a few short hard efforts with easy breaks.':'Warm up 10 min easy, then hard efforts with easy breaks, for example 4 to 6 times 3 min.';}
    else if(role==='long'){name='Long '+type.toLowerCase();dur=Math.min(med(type)*1.5,Math.max(mx(type)*1.05,med(type)*1.2))*f;effort=2;how='Easy pace all the way. The length is the training.';}
    else if(role==='steady'){name=type;dur=med(type)*f;effort=3;how='Steady effort. Talking takes some work.';}
    else{name='Easy '+type.toLowerCase();dur=med(type)*0.8*f;effort=2;how='Easy. You can talk in full sentences.';}
    let lo=0,hi=0,txt='';
    if(dur){lo=r5(dur*0.9);hi=Math.max(lo+5,r5(dur*1.1));if(role==='recover'){lo=15;hi=25;}txt=`${fmtDur(lo)} to ${fmtDur(hi)}`;}
    const tr=role!=='rest'&&role!=='recover'&&role!=='gentle';
    seq.push({tr,hard:role==='hard'||role==='race',str:role==='strength'});
    if(role==='strength')gapStr=0;else gapStr++;
    if(role==='long')longDone=true;
    days.push({...o,role,type,effort,name,lo,hi,dur:txt,how,why:why.trim()});
  }
  const fut=days.filter(x=>!x.done);
  return{mode:W.mode,label:W.label,why:W.why,target:W.target,now:W.now,base:W.base?Math.round(W.base):null,hasPlan,days,
    hardN:fut.filter(x=>x.role==='hard'||x.role==='race').length,restN:fut.filter(x=>x.role==='rest'||x.role==='recover').length,
    lo:fut.reduce((a,x)=>a+x.lo,0),hi:fut.reduce((a,x)=>a+x.hi,0)};
}
// today's session in the short form used by the coach view and the briefing; null once you have trained
function suggestWorkout(){
  const st=strategy();if(!st)return null;
  const x=st.days[0];if(x.done)return null;
  return{type:x.role==='rest'?'Yoga':x.type,title:x.name+(x.dur?', '+x.dur:''),why:x.why};
}
const stBars=n=>n?`<span class="st-e" role="img" aria-label="Effort ${n} of 5">${[1,2,3,4,5].map(k=>`<i${k<=n?' class="on"':''}></i>`).join('')}</span>`:'';
const stMeta=x=>[x.dur,x.effort?`effort ${x.effort} of 5`:''].filter(Boolean).join(' · ');
function renderSuggest(){
  const el=$('sugCard');if(!el)return;
  const st=strategy();
  if(!st){el.style.display='none';return;}
  const a=st.days[0],x=a.done?st.days[1]:a,rest=x.role==='rest';
  const ty=PL_TYPES.includes(x.type)&&x.type!=='Rest'?x.type:'Run';
  el.style.display='';
  el.innerHTML=`<div class="sg-lbl">${a.done?'Next session, tomorrow':'Today\'s session'}</div>
   <div class="sg-row"><div class="sg-ico">${rest?UI.moon:(ICON[x.type]||'')}</div><div style="flex:1;min-width:0"><div class="sg-t">${esc(x.name)}</div>
   ${stMeta(x)?`<div class="sg-m">${esc(stMeta(x))}${stBars(x.effort)}</div>`:''}
   <div class="sg-s">${esc(x.how)}</div><div class="sg-s sg-why">${esc(x.why)}</div></div></div>
   <div class="sg-btns">${a.done||rest||x.role==='race'?'':`<button class="btn-out sg-btn" onclick="switchTab('log');openLog('lWorkout');wkPrefill(true);$('exGrid').scrollIntoView({block:'center'})">Log ${ty.toLowerCase()}</button>`}<button class="btn-out sg-btn" onclick="switchTab('insights');$('stratCard').scrollIntoView({block:'start'})">Next 7 days</button></div>`;
}
// Insights: the 7-day outline with this week's time target
function renderStrategy(){
  const el=$('stratCard');if(!el)return;
  const st=strategy();
  if(!st){el.style.display='none';return;}
  el.style.display='';
  const pc=st.target?Math.min(100,Math.round(st.now/st.target*100)):0;
  const head=st.target?`<div class="st-tg"><b>${fmtDur(st.now)}</b> of about ${fmtDur(st.target)} this week</div><div class="gl-bar"><div style="width:${pc}%"></div></div>`:'';
  const rows=st.days.map(x=>{
    const dt=new Date(x.date+'T12:00:00');
    return`<div class="st-r${x.i===0?' now':''}${x.role==='rest'||x.role==='recover'?' off':''}"><div class="st-d">${x.i===0?'Today':PL_DAYS[x.wd]}<small>${dt.getDate()}</small></div>
     <div class="st-b"><div class="st-n">${esc(x.name)}</div>${stMeta(x)?`<div class="st-s">${esc(stMeta(x))}</div>`:''}<div class="st-s st-w">${esc(x.why)}</div></div>${stBars(x.effort)}</div>`;
  }).join('');
  el.innerHTML=`<div class="sec">Next 7 days</div><div class="st-mode">${esc(st.label)}</div><div class="set-note" style="margin:2px 0 10px">${esc(st.why)}</div>${head}
   <div class="st-list">${rows}</div>
   <div class="set-note" style="margin-top:12px">${st.hardN} hard ${st.hardN===1?'day':'days'}, ${st.restN} rest ${st.restN===1?'day':'days'}${st.hi?`, about ${fmtDur(st.lo)} to ${fmtDur(st.hi)} in total`:''}. ${st.hasPlan?'Follows your weekly plan and bends it when your body needs it.':'No weekly plan set, so this is built from your recent training.'} Worked out again every morning from your sleep, recovery, soreness and load.</div>
   <details class="fm-why"><summary>How this is worked out</summary><p>Your usual week is the average of the last four weeks${st.base?` (${fmtDur(st.base)})`:''}. When recovery is good the target rises by about 7 percent. After three full weeks an easier week follows at about three quarters. Hard days are never back to back and there are at most two in any seven days. Low recovery, soreness, injuries or a hard day yesterday turn today into an easy day or rest.</p></details>`;
}
