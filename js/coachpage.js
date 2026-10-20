// ═══ v132 INSIGHTS: today's call, things to watch, the coach summary ═══
// Worked out by the app from your data; none of it needs a key. The briefing below it is the AI part.
const _cpOpen=new Set();
function cpTog(el){const k=el.dataset.k;if(!k)return;if(el.open)_cpOpen.add(k);else _cpOpen.delete(k);}
function cpIc(k){return (UI[k]||UI.spark).replace('ui-i','ui-i cp-ri');}
const cpChev=()=>UI.chev.replace('ui-i','ui-i cp-chev');
const CP_WORD={hard:'Train hard',long:'Go long',steady:'Train steady',easy:'Keep it easy',gentle:'Keep it easy',strength:'Keep it easy',rest:'Rest',recover:'Rest'};
const CP_WAS={hard:'a hard',long:'a long',steady:'a steady',easy:'an easy'};
const CP_DONE={done:'Done as planned',harder:'Harder than planned',other:'A different session'};
const CP_WD=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const cpWd=dt=>CP_WD[new Date(dt+'T12:00:00').getDay()];
const cpDot=st=>st==='bad'?'bad':st==='ok'||st==='good'?'good':st==='warn'?'warn':'';
function cpWord(x){
  if(x.done){const m=x.match&&(x.match.m||x.match);return CP_DONE[m]||'Done';}
  if(x.role==='race')return x.name||'Race';
  return CP_WORD[x.role]||'Keep it easy';
}
function cpTone(x){
  if(x.done)return 'good';
  const il=illness()||{};
  if(x.role==='recover'||il.lvl==='systemic')return 'bad';
  if(x.role==='rest')return 'rest';
  if(x.cap||x.bent||x.back)return '';
  return 'good';
}
// minutes of a part of a session: steps {min} and one-level blocks {n, set}
// a rest day because the body may be fighting something (systemic illness and today's day is the recover day)
const cpIll=(t,st)=>{const il=illness(t)||{},x=st&&st.days&&st.days[0];return il.lvl==='systemic'&&x&&x.role==='recover'?il:null;};
const CP_WAITS={hard:'hard',long:'long',steady:'steady',easy:'easy'};
const cpMin=a=>(a||[]).reduce((s,x)=>s+(x.set?x.n*x.set.reduce((u,y)=>u+(y.min||0),0):(x.min||0)),0);
function cpWhy(t,x){
  const r=[],il=illness(t)||{},H=(bodyHrvPart(t)||{}).part,R=(bodyRhrPart(t)||{}).part;
  // signs from the night show as their own rows with values; symptoms from the check-in as one line
  if(il.kind==='body')r.push({c:'bad',t:il.nights>1?`Breathing up for ${il.nights} nights`:'Breathing up last night',v:il.resp.toFixed(1)+' /min'});
  else if(il.lvl)r.push({c:'bad',t:il.fact||il.why,v:''});
  if(H&&H.z!=null){if(H.z<=TH.HRV_EASY_Z||il.hrvDown)r.push({c:il.hrvDown?'bad':'warn',t:'HRV under your usual',v:Math.round(H.v7)+' ms'});else r.push({c:'good',t:'HRV in your usual range',v:Math.round(H.v7)+' ms'});}
  if(R&&R.z!=null&&(R.z>=TH.RHR_WATCH_Z||il.rhrUp)){const d=Math.round(R.v-R.m);r.push({c:il.rhrUp?'bad':'warn',t:d>=1?`Resting heart rate ${d} over usual`:'Resting heart rate above usual',v:Math.round(R.v)+' bpm'});}
  const sn=shortNight(t);if(sn)r.push({c:'warn',t:'Short night',v:fmtDur(sn.min)});
  const D=sleepDebt(t);if(D&&D.min>=TH.DEBT_WARN)r.push({c:D.min>=TH.DEBT_BAD?'bad':'warn',t:'Sleep debt building',v:fmtDur(D.min)});
  const fl=feelLow(t);if(fl)r.push({c:'warn',t:fl.k==='mind'?'Check-in reads strained':'Low energy and sore',v:''});
  const c=S().checkins.find(y=>y.date===t);
  if(c&&c.soreness>=3&&!(fl&&fl.k==='sore'))r.push({c:'warn',t:'Sore'+(c.soreArea?': '+c.soreArea.split(',').join(', '):''),v:''});
  const y=stAdd(t,-1);if(wkOn().some(w=>w.date===y&&wkHard(w)))r.push({c:'warn',t:'Hard session yesterday',v:''});
  if(il.lvl&&!symOn(t))r.push({c:'',t:S().checkins.some(y=>y.date===t&&y.symptoms!=null)?'No symptoms in your check-in':'No check-in yet today',v:''});
  const o={bad:0,warn:1,good:2,'':3};
  return r.sort((a,b)=>o[a.c]-o[b.c]).slice(0,4);
}
function cpSwap(dt,ty){stSwapTo(dt,ty);renderInsCall();}
function renderInsCall(){
  const el=document.getElementById('insCall');if(!el)return;
  let st=null;try{st=strategy();}catch(e){console.warn('call',e);}
  const x=st&&st.days&&st.days[0];
  // v134: no Body score and no gate (illness, a severe injury): no call; the outline still runs under Training
  const gated=!coachVerdict()&&!coachGates().lvl;
  if(!x){el.innerHTML=`<div class="cp-call rest"><div class="cp-k"><span>Today's call</span><span>${esc(fmtD(td()))}</span></div><div class="cp-w">No call yet</div><div class="cp-s">It needs last night's sleep or today's check-in.</div><div class="cp-chips"><button class="cp-chip" onclick="logGo('lCheckin')">${UI.check}Check in</button><button class="cp-chip" onclick="logGo('lSleep')">${UI.moon}Log sleep</button></div></div>`;return;}
  if(gated&&!x.done){el.innerHTML=`<div class="cp-call rest"><div class="cp-k"><span>Today's call</span><span>${esc(fmtD(td()))}</span></div><div class="cp-w">No call yet</div><div class="cp-s">It needs heart rate variability or resting heart rate from last night. Sync to refresh.</div><div class="cp-chips"><button class="cp-chip" onclick="openSettings()">${UI.pulse}Open Settings</button></div></div>`;return;}
  const t=td(),tone=cpTone(x),il=illness(t)||{},nh=st.days.slice(1).find(d=>d.role==='hard');
  const ill=il.lvl==='systemic'&&x.role==='recover';
  let s=ill?(il.kind==='body'?'Your body may be fighting something.':il.why)+' Rest today; a walk is fine.':x.why||'';
  if(x.bent&&nh&&!x.done&&!il.lvl)s=(s?s+' ':'')+'Moved to '+cpWd(nh.date)+'.';
  let ses='';
  if(ill){
    const was=x.was?(x.was.role==='strength'?'a strength session':(CP_WAS[x.was.role]||'a')+' '+wkNoun({type:x.was.type})):'';
    ses=`<div class="cp-ses"><div class="cp-h">${ICON.Walk}<b>Walk, if you feel like it · up to ${TH.ILL_WALK} min</b></div>${was?`<span>Plan said ${esc(was)}. It waits until you are back to normal.</span>`:''}</div>`;
  }else if(!x.done&&x.role!=='rest'){
    const dur=x.lo&&x.hi&&x.lo!==x.hi?(x.hi<60?x.lo+' to '+x.hi+' min':fmtDur(x.lo)+' to '+fmtDur(x.hi)):x.lo?fmtDur(x.lo):x.dur||'';
    let L=null;try{L=x.sess?sessLines(x.sess,st.thr):null;}catch(e){}
    // a main set without minutes (strength) fills the middle of the day's range; one plain step names the main part ("Easy 30")
    const w=x.sess?cpMin(x.sess.w):0,c=x.sess?cpMin(x.sess.c):0,m0=x.sess?cpMin(x.sess.m):0,m=m0||(x.sess&&x.lo?Math.max(0,Math.round(((x.lo+(x.hi||x.lo))/2))-w-c):0);
    const m1=x.sess&&x.sess.m&&x.sess.m.length===1&&!x.sess.m[0].set&&m0?x.sess.m[0].lbl:'',ml=m1&&m1.length<=TH.CP_LBL?m1:'Main';
    const bar=w+m+c>0?`<div class="cp-stp">${w?`<i style="flex:${w};background:var(--t3)"></i>`:''}${m?`<i style="flex:${m};background:var(--t2)"></i>`:''}${c?`<i style="flex:${c};background:var(--t3)"></i>`:''}</div><div class="cp-stl">${w?`<span>Warm-up ${w}</span>`:''}${m?`<span>${esc(ml)} ${m}</span>`:''}${c?`<span>Cool-down ${c}</span>`:''}</div>`:'';
    ses=`<div class="cp-ses"><div class="cp-h">${ICON[x.type]||ICON.Other}<b>${esc(x.name||x.type||'')}${dur?' · '+esc(dur):''}</b></div>${L&&L.m&&L.m.length?`<span>${esc(L.m[0])}</span>`:x.how?`<span>${esc(x.how)}</span>`:''}${bar}</div>`;
  }else if(x.done)ses=`<div class="cp-ses"><div class="cp-h">${ICON[x.type]||ICON.Other}<b>${esc(x.name||'')}${x.dur?' · '+esc(x.dur):''}</b></div></div>`;
  const sw=!x.done&&x.swaps&&x.swaps.length?`<div class="cp-chips"><span class="cp-cl">Swap for</span>${x.swaps.slice(0,3).map(ty=>`<button class="cp-chip" onclick="cpSwap('${esc(x.date)}','${esc(ty)}')">${ICON[ty]||ICON.Other}${esc(ty)}</button>`).join('')}</div>`:'';
  const why=cpWhy(t,x);
  const wy=why.length?`<div class="cp-wh">Why</div>${why.map(r=>`<div class="cp-wy ${r.c}"><i></i><span>${esc(r.t)}</span><em>${esc(r.v)}</em></div>`).join('')}`:'';
  const nx=!x.done&&nh&&x.role!=='hard'&&!il.lvl?`<div class="cp-nx">Next hard session: ${esc(cpWd(nh.date))}, ${esc(nh.name||'')}.</div>`:'';
  const back=il.lvl==='systemic'?`<div class="cp-sub"><div class="cp-sh2"><b>Coming back</b></div><ul class="cp-ul"><li>First day back: an easy session at about two thirds of your usual.</li><li>Hard sessions last, after ${TH.ILL_FREE_D} days without symptoms.</li><li>After symptoms below the neck, allow about a week.</li></ul></div><div class="cp-dr"><b>See a doctor first if you have</b><ul class="cp-ul"><li>Chest pain or trouble breathing</li><li>A racing or irregular heartbeat, or dizziness</li><li>A fever, or symptoms lasting more than about ${TH.ILL_DOC_D} days</li></ul></div>`:'';
  const ci=il.lvl&&!symOn(t)?`<div class="cp-chips"><button class="cp-chip" onclick="logGo('lCheckin')">${UI.check}Check in</button></div>`:'';
  const send=!x.done&&typeof stSendHTML==='function'?stSendHTML(x,st)||'':'';
  el.innerHTML=`<div class="cp-call ${tone}"><div class="cp-k"><span>Today's call</span><span>${esc(fmtD(t))}</span></div><div class="cp-w">${esc(cpWord(x))}</div>${s?`<div class="cp-s">${esc(s)}</div>`:''}${ses}${sw}${send}${wy}${ci}${back}${nx}</div>`;
}
function cpGo(go){
  if(go==='checkin'){logGo('lCheckin');return;}
  _cpOpen.add(go);renderInsSum();
  const r=document.querySelector(`#insSum [data-k="${go}"]`);if(r&&r.scrollIntoView)r.scrollIntoView({block:'start'});
}
function renderInsWatch(){
  const el=document.getElementById('insWatch');if(!el)return;
  let fl=[];try{fl=coachFlags()||[];}catch(e){}
  const n=fl.length,dl=daysLogged(14);
  const da=f=>{const c=f.st==='bad'?' bad':f.st==='ok'?' ok':'';
    return `<div class="cp-da${c}" role="button" tabindex="0" data-go="${esc(f.go||'')}" onclick="cpGo(this.dataset.go)" onkeydown="if(event.key==='Enter')cpGo(this.dataset.go)"><div class="cp-dah">${(UI[f.ic]||UI.warn).replace('ui-i','ui-i cp-dai')}<span class="cp-l">${esc(f.t)}</span>${f.v!=null&&f.v!==''?`<div class="cp-vv"><b>${esc(f.v)}</b>${f.w?`<small><i>${esc(f.g||'')}</i>${esc(f.w)}</small>`:''}</div>`:'<span></span>'}${cpChev()}</div>${f.a?`<p>${esc(f.a)}</p>`:''}</div>`;};
  const nt=n?'':dl?'Nothing to watch today.':'Nothing to watch yet.';
  el.innerHTML=`<div class="cp-hd2">Things to watch<span class="cp-cnt${n?' w':''}">${n}</span></div>${n?fl.map(da).join(''):`<div class="cp-card"><p class="cp-sm" style="margin:0">${nt}</p></div>`}${dl<4?`<p class="cp-note">${dl?`Early read: only ${dl} of the last 14 days have data.`:'Nothing logged in the last 14 days yet.'}</p>`:''}`;
}
const cpPm=(v,u)=>(v>0?'+':v<0?'−':'')+Math.abs(v)+(u||'');
// a rounded value against its rounded usual: ▲ over, ▼ under, ● the same
const cpVs=(v,m)=>{const a=Math.round(v),b=Math.round(m);return (a>b?'▲ ':a<b?'▼ ':'● ')+'usual '+b;};
const cpTile=(l,v,e)=>`<div><small>${esc(l)}</small><b>${esc(v)}</b>${e?`<em>${esc(e)}</em>`:''}</div>`;
const cpKv=(l,v,w,g,c,sm)=>`<div class="cp-kv"><div class="cp-l">${esc(l)}${sm?`<small>${esc(sm)}</small>`:''}</div><div class="cp-vv ${c||''}"><b>${esc(v)}</b>${w?`<small><i>${esc(g||'')}</i>${esc(w)}</small>`:''}</div></div>`;
const cpSh=(b,s)=>`<div class="cp-sh2"><b>${esc(b)}</b>${s?`<span>${esc(s)}</span>`:''}</div>`;
const cpP=s=>s?`<p class="cp-sm">${esc(s)}</p>`:'';
function cpTime(min){const s=Math.round(min*60),h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60,p=n=>String(n).padStart(2,'0');return h?`${h}:${p(m)}:${p(x)}`:`${m}:${p(x)}`;}
function cpRec(t,st){
  const H=(bodyHrvPart(t)||{}).part,R=(bodyRhrPart(t)||{}).part,D=sleepDebt(t);
  const low=(H&&H.z!=null&&H.z<=TH.HRV_EASY_Z)||(R&&R.z!=null&&R.z>=TH.RHR_WATCH_Z),none=!(H&&H.z!=null)&&!(R&&R.z!=null);
  let bb=null;try{bb=bounceDays(st.thr);}catch(e){}
  const tiles=`<div class="cp-tiles3">${cpTile('HRV',H&&H.v7!=null?Math.round(H.v7)+' ms':'–',H&&H.m!=null?cpVs(H.v7,H.m):'')}${cpTile('Resting HR',R&&R.v!=null?Math.round(R.v)+' bpm':'–',R&&R.m!=null?cpVs(R.v,R.m):'')}${cpTile('Sleep debt',!D?'–':D.min>0?fmtDur(D.min):'None',D?{building:'▲ Building',paying:'▼ Paying back',steady:'● Steady',cleared:'● Cleared'}[D.state]||'':'')}</div>`;
  const bt=bb&&bb[4]?`After a hard session you usually need ${bb[4]} day${bb[4]>1?'s':''}.`:'';
  let hp='';const hs=habitSleep(t)||[];
  if(hs.length){const mx=Math.max(...hs.map(h=>Math.abs(h.diffMin)))||1;
    hp=`<div class="cp-sub">${cpSh('Goes with better sleep','last '+TH.HAB_DAYS+' nights')}${hs.map(h=>{const w=Math.round(Math.abs(h.diffMin)/mx*50);return `<div class="cp-hp"><span>${esc(h.label)}</span><div class="cp-b"><i style="${h.diffMin>=0?'left:50%;background:var(--teal)':'right:50%;background:var(--amber)'};width:${w}%"></i></div><span class="cp-v">${esc(cpPm(Math.round(h.diffMin),' min'))}</span></div>`;}).join('')}<div class="cp-hpx"><span></span><span>less sleep · more</span><span></span></div></div>`;}
  const il=illness(t)||{};
  if(il.lvl==='systemic'){const sg=il.kind==='body'?['Breathing',il.rhrUp&&'heart rate',il.hrvDown&&'HRV'].filter(Boolean):[];
    const s=sg.length>2?'Breathing, heart rate and HRV all off usual':sg.length?sg.join(' and ')+' off usual':'Symptoms below the neck';
    return {t:'Recovery',ic:'pulse',st:'bad',g:'▼',s,html:tiles+cpP('Rest until the signs settle back to your usual.')+hp};}
  if(none)return {t:'Recovery',ic:'pulse',st:'',g:'',s:'Needs a few days of data',html:tiles+cpP(`Your usual range for HRV and resting heart rate sets after ${TH.MIN_BASE_DAYS} days.`)+hp};
  return {t:'Recovery',ic:'pulse',st:low?'warn':'good',g:low?'▼':'●',s:low?'Below usual'+(bb&&bb[4]?' · back in about '+bb[4]+' days':''):'In your usual range',html:tiles+cpP((low?'Back in your usual range in a few days if sleep holds. ':'')+bt)+hp};
}
function cpTrain(t,st){
  // nothing trained in 28 days and no usual week to plan from: say how to start
  if(!(st.wk&&st.wk.base)&&!wkOn().some(w=>daysAgo(w.date)<28&&stTrains(w)))return {t:'Training',ic:'chartLine',st:'',g:'',s:'No training logged yet',html:cpP('Log a session, or connect your watch in Settings, to see your training here.')+`<div class="cp-chips"><button class="cp-chip" onclick="logGo('lWorkout')">${UI.run}Log a workout</button></div>`};
  const L=calcLoad(),fw=fitWord(),W=st.wk||{},thr=st.thr,ill=cpIll(t,st),xw=ill&&st.days[0].was;
  const mix=sessMix28(t,thr),wd=warnDays(t,thr),ov=overreach(t,thr),mo=monotony(t);
  const rows=stWeeks(W)||[],tg=rows[0]&&rows[0].min;
  const done=wkOn().filter(w=>W.mon&&w.date>=W.mon&&w.date<=t&&stTrains(w)).reduce((s,w)=>s+(w.durMin||0),0);
  // next week is lighter from TH.WARN_N warning days since Monday (stWeek's rule); this week is, after as many last week
  const many=!!W.lightNext,lt=Math.round((1-TH.LIGHT_F)*100);
  const tiles=`<div class="cp-tiles3">${cpTile('Fitness',fw||'–','')}${cpTile('Form',L.formWord||'–','')}${cpTile('This week',fmtDur(done),tg?'of '+fmtDur(tg):'')}</div>`;
  let mx='';
  if(mix&&mix.n){const e=Math.round(mix.easyShare*100),h=Math.round(mix.hard/mix.n*100),s=Math.max(0,100-e-h),lo=Math.round(TH.EASY_AIM_LO*100),hi=Math.round(TH.EASY_AIM_HI*100);
    mx=`<div class="cp-sub">${cpSh('Easy share','last 28 days')}<div class="cp-mx"><div class="cp-bb">${e?`<i style="flex:${e};background:var(--teal)"></i>`:''}${s?`<i style="flex:${s};background:var(--amber)"></i>`:''}${h?`<i style="flex:${h};background:var(--red)"></i>`:''}</div><div class="cp-tz" style="left:${lo}%;width:${hi-lo}%"></div><div class="cp-tl2" style="left:${lo}%">Aim ${lo} to ${hi}%</div></div><div class="cp-mlg"><span><i style="background:var(--teal)"></i>Easy ${e}%</span><span><i style="background:var(--amber)"></i>Steady ${s}%</span><span><i style="background:var(--red)"></i>Hard ${h}%</span></div>${e<lo?cpP('Fewer easy sessions than usual for good progress. Make the in-between days easier.'):''}</div>`;}
  // the warning days of the last 7, one row per kind: how many days it held, HRV with its 7-night value, a single day by its name
  const WW={hrv:['HRV under your usual','night'],feel:['Check-in low','day'],pace:['Heart rate up at your pace','day'],body:['Breathing and resting heart rate up','night']},HV=(bodyHrvPart(t)||{}).part;
  const wg=Object.keys(WW).map(k=>{const ds=wd.days.filter(d=>d.why.includes(k));return ds.length?{k,n:ds.length,d:ds[0].date}:null;}).filter(Boolean);
  const wv=g=>g.k==='hrv'&&HV&&HV.v7!=null?Math.round(HV.v7)+' ms':g.n>1?'':dayWord(g.d);
  const wn=many?W.warnNow:W.light&&!W.ovr?W.warnLast:0;
  const wr=wd.n?`<div class="cp-sub">${cpSh('Warning signs','last 7 days')}${wg.map(g=>`<div class="cp-wy warn"><i></i><span>${esc(WW[g.k][0]+(g.n>1?`, ${g.n} ${WW[g.k][1]}s`:''))}</span><em>${esc(wv(g))}</em></div>`).join('')}${many?cpP(`${wn} warning days this week: next week is about ${lt}% lighter so your body can catch up.`):W.light&&wn?cpP(`${wn} warning days last week: this week is about ${lt}% lighter.`):''}</div>`:'';
  const ovp=ov&&ov.on?cpP(`Tired for ${ov.days} days running.${ov.doc?' If it lasts, it is worth talking to a doctor.':''}`):'';
  const mop=mo&&mo.on?cpP('Your days have been very alike. Mix easy and harder days.'):'';
  const nx=st.days&&st.days.length?`<div class="cp-sub">${cpSh('Next 7 days','')}${stOutlineHTML(st,1)}</div>`:'';
  if(ill)return {t:'Training',ic:'chartLine',st:'',g:'',s:'Rest today'+(xw?' · '+(xw.role==='strength'?'strength session':(CP_WAITS[xw.role]?CP_WAITS[xw.role]+' ':'')+wkNoun({type:xw.type}))+' waits':''),html:tiles+mx+wr+ovp+mop+nx};
  return {t:'Training',ic:'chartLine',st:many||(ov&&ov.on)?'warn':'good',g:many?'▼':'●',s:many?`${W.warnNow} warning days: next week about ${lt}% lighter`:W.light&&W.warnLast>=TH.WARN_N?`Lighter week after ${W.warnLast} warning days`:[fw,L.formWord].filter(Boolean).join(' · ')||'Building your picture',html:tiles+mx+wr+ovp+mop+nx};
}
// heart rate recovery and easy-run drift, each the median of the last TH.FIT_DAYS days against the TH.FIT_BASE days before; e-bike rides left out
const cpMed=a=>{const x=[...a].sort((p,q)=>p-q),m=Math.floor(x.length/2);return x.length%2?x[m]:(x[m-1]+x[m])/2;};
function cpFitMed(t,f,v){
  const a=stAdd(t,-(TH.FIT_DAYS-1)),b=stAdd(a,-TH.FIT_BASE),ws=wkOn().filter(w=>w.date<=t&&w.date>=b&&!wkEb(w)&&f(w)),
    now=ws.filter(w=>w.date>=a).map(v),u=ws.filter(w=>w.date<a).map(v);
  return now.length>=TH.FIT_N?{v:cpMed(now),n:now.length,u:u.length>=TH.FIT_BASE_N?cpMed(u):null}:null;
}
const cpHrr=t=>cpFitMed(t,w=>wIcu(w).hrr>0,w=>wIcu(w).hrr);
const cpDrift=(t,thr)=>cpFitMed(t,w=>w.type==='Run'&&wkDriftOn(w)&&(wkEff(w,thr)||0)<=2,w=>wIcu(w).dec);
function cpFit(t,st){
  const v=vo2Trend(t),thr=st.thr||stThr(),pm=pmOn();let g=null;try{g=raceGuide(t);}catch(e){}
  let h='';
  if(v)h+=cpSh("VO2max, your watch's estimate",'')+cpKv('Now',String(Math.round(v.now)),v.change==null?'':Math.round(v.change)?Math.abs(Math.round(v.change))+' since '+fmtD(stAdd(v.date,-v.daysApart)):'steady',v.change>0?'▲':v.change<0?'▼':'●',v.change>0?'good':'');
  const run=thr.run||{},ride=thr.ride||{},tl=[];
  if(run.pace)tl.push(cpTile('Run pace',(run.est?'about ':'')+fmtPace(1000/run.pace/60)+' /km','threshold'));
  if(pm&&ride.ftp)tl.push(cpTile('Ride power',ride.ftp+' W','power meter'));
  const lt=run.lthr||ride.lthr;if(lt)tl.push(cpTile('Heart rate',((run.est&&run.lthr)?'about ':'')+lt+' bpm','threshold'));
  if(tl.length)h+=cpSh('Thresholds','')+`<div class="cp-tiles3">${tl.join('')}</div>`;
  const hr=cpHrr(t),dr=cpDrift(t,thr);
  if(hr){const d=hr.u==null?null:hr.v-hr.u,near=d!=null&&Math.abs(d)<=TH.HRR_NEAR;
    h+=cpKv('Heart rate recovery',Math.round(hr.v)+' bpm',d==null?'':near?'at your usual':d>0?'more than usual':'less than usual',near?'●':d>0?'▲':'▼',d==null?'':d<0&&!near?'warn':'good','after hard efforts');}
  if(dr){const d=Math.max(0,Math.round(dr.v)),ok=d<TH.DRIFT_OK,hi=d>=TH.DRIFT_HIGH;
    h+=cpKv('Easy runs drift',d+'%',ok?'well paced':hi?'drifting a lot':'some drift',ok?'●':'▲',ok?'good':hi?'bad':'warn','last 4 weeks');}
  if(g){const ph=racePhase(),gg=g.goal;
    h+=`<div class="cp-sub">${cpSh(gg?gg.k:'Race guide',ph&&ph.n>=0&&S().profile.goalDate?fmtD(S().profile.goalDate)+' · '+ph.n+' days':'')}${gg?`<div class="cp-ro"><b>about ${esc(cpTime(gg.min))}</b><span>from your ${esc(fmtKm(g.from.km))} on ${esc(fmtD(g.from.date))}</span></div>`:''}${g.list.filter(r=>!gg||r.k!==gg.k).map(r=>cpKv(r.k,'about '+cpTime(r.min),'','')).join('')}<p class="cp-note">A guide from your best recent effort, not a promise.</p></div>`;}
  if(!h)h=cpP('Thresholds and a fitness estimate show once your watch has recorded a few sessions.');
  const fw=fitWord(),ill=cpIll(t,st);
  return {t:'Fitness',ic:'gauge',st:fw?'good':'',g:{Rising:'▲',Steady:'●',Falling:'▼'}[fw]||'',s:[fw,ill?'a few days off will not change it':v?`VO2max estimate ${Math.round(v.now)}${v.change?(v.change>0?', up ':', down ')+Math.abs(Math.round(v.change)):''}`:''].filter(Boolean).join(' · ')||'Builds with your sessions',html:h};
}
const fmtKm=km=>km>=10||Math.abs(km-Math.round(km))<0.05?Math.round(km)+' km':km.toFixed(1)+' km';
function cpBody(t,st){
  const w=wtTrend(t),bp=bpBand(t);let rd=null;try{rd=redsSigns(t,st.thr);}catch(e){}
  let h='',sum=[],warn=false;
  if(w&&w.now!=null){
    const G=w.toGoal;
    h+=`<div class="cp-tiles3">${cpTile('Weight',w.last.toFixed(1)+' kg',dayWord(w.date).toLowerCase())}${cpTile('Goal',G?G.goal.toFixed(1)+' kg':'–',G?(G.reached?'reached':G.kg.toFixed(1)+' kg to go'):'')}${cpTile('4 weeks',w.ch4!=null?cpPm(+w.ch4.toFixed(1),' kg'):'–',{steady:'steady',down:'going down',up:'going up'}[w.dir]||'')}</div>`;
    if(w.fast){warn=true;h+=cpP(`Losing weight fast for ${w.fastWks} weeks. Check you are eating enough for your training.`);}
    else if(G&&!G.reached&&G.dir==='lose')h+=cpP(`Lose no faster than about ${TH.WT_LOSE_WK} kg a week while training hard.`);
    sum.push(w.fast?'Losing fast':w.dir==='down'?'Weight going down':w.dir==='up'?'Weight going up':'Weight steady');
  }
  const bl=S().bloodLogs.filter(b=>BM.some(m=>b[m[1]]!=null)).sort((a,b)=>b.date<a.date?-1:1)[0];
  if(bl){const rows=BM.filter(m=>bl[m[1]]!=null);
    h+=`<div class="cp-sub">${cpSh('Blood','tested '+fmtD(bl.date))}${rows.map(m=>{const v=bl[m[1]],s=bmState(v,m[1]);if(s.c!=='good'){warn=true;sum.push(m[0].toLowerCase()+' '+(m[1]==='uric'?'worth a mention':'worth a look'));}return cpKv(m[0],String(v),bmWord(m[1],v),s.g,s.c,m[1]==='glucose'?'fasting':'');}).join('')}<p class="cp-note">mg/dL. Small changes between tests are normal.</p></div>`;}
  if(bp){const on=bp.band&&bp.band!=='normal';if(on||bp.high){warn=true;sum.push('blood pressure '+(bp.high?'high':bp.word.toLowerCase()));}
    h+=`<div class="cp-sub">${cpSh('Blood pressure',`${bp.n} reading${bp.n>1?'s':''} on ${bp.days} day${bp.days>1?'s':''}`)}${bp.band?cpKv('Average',bp.sys+'/'+bp.dia,bp.word,on?'▲':'●',bp.band==='normal'?'good':bp.band==='elevated'?'warn':'bad'):cpKv('Latest',bp.last.bpSys+'/'+bp.last.bpDia,`needs readings on ${TH.BP_N} days`,'','')}${bp.high?cpP(`Read twice at ${TH.BP_SYS[3]}/${TH.BP_DIA[2]} or over: seek advice promptly.`):on?cpP('Regular training tends to bring it down. Measure seated after 5 quiet minutes, arm at heart level.'):''}</div>`;}
  if(rd&&rd.on){warn=true;h+=`<div class="cp-sub">${cpSh('Eating enough','')}${cpP('A few signs you may be eating too little for your training. Worth seeing a sports doctor or dietitian.')}</div>`;}
  if(!h)return {t:'Body and health',ic:'scale',st:'',g:'',s:'Nothing logged yet',html:cpP('Log your weight, blood tests or blood pressure to see them here.')+`<div class="cp-chips"><button class="cp-chip" onclick="logGo('lMeas')">${UI.scale}Log weight</button></div>`};
  return {t:'Body and health',ic:'scale',st:warn?'warn':'good',g:warn?'▲':'●',s:sum.slice(0,2).join(' · ')||'Nothing logged yet',html:h};
}
function cpEat(t,st){
  const F=fuelPlan();
  if(!F)return {t:'Eat and drink',ic:'kitchen',st:'',g:'',s:'Needs your weight in Log',html:cpP('Log your weight to see protein, carbs and fat for today.')+`<div class="cp-chips"><button class="cp-chip" onclick="logGo('lMeas')">${UI.scale}Log weight</button></div>`};
  const r1=n=>Math.round(n*10)/10,n=F.next,dw=F.carbLoad&&F.level!=='race'?'Day before your race':CP_DAYW[F.level]||'Today';
  let h=cpSh(dw+(n&&n.tom&&(n.hard||n.eve)&&n.name?', '+n.name.toLowerCase()+' tomorrow':''),r1(F.kg)+' kg')+`<div class="cp-tiles3">${cpTile('Protein',F.p+' g',r1(F.p/F.kg)+' g/kg')}${cpTile('Carbs',F.c+' g',r1(F.c/F.kg)+' g/kg')}${cpTile('Fat',F.f+' g',r1(F.f/F.kg)+' g/kg')}</div>`;
  const ea=F.eaten&&F.eaten.kcal||0,bu=F.burn&&F.burn.total||F.kcal||0;
  if(bu)h+=`<div class="cp-brl"><span>Eaten so far</span><span>${Math.round(ea).toLocaleString('en-US')} of about ${Math.round(bu).toLocaleString('en-US')} kcal</span></div><div class="cp-bar"><i style="width:${Math.min(100,Math.round(ea/bu*100))}%"></i></div>`;
  const fd=(k,l,e)=>{const x=F.foods&&F.foods[k];return x&&x.items&&x.items.length?`<div class="cp-sub">${cpSh(l,'about '+(k==='p'?F.p:F.c)+' g')}${x.items.map(i=>`<div class="cp-fd"><span class="cp-l">${esc(i.txt)}</span><span>${esc(i.g+' g')}</span></div>`).join('')}${e?`<p class="cp-note">${esc(e)}</p>`:''}</div>`:'';};
  h+=fd('p','Protein as food',F.per&&F.per.meal?`Spread it out: at least ${F.per.meal} g every 3 to 4 hours.`:'')+fd('c','Carbs as food');
  const tm=(l,v)=>v&&typeof v==='string'?`<div class="cp-tm"><b>${esc(l)}</b><span>${esc(v)}</span></div>`:'';
  if(n)h+=`<div class="cp-sub">${cpSh((n.tom?"Tomorrow's ":"Today's ")+(n.name||'session').toLowerCase(),n.mins?fmtDur(n.mins):'')}${tm('Tonight',n.night||n.eve)}${tm('Before',n.before)}${tm('During',n.during)}${tm('Drink',n.drink)}${tm('After',F.after&&F.after.p?`${F.after.p} g of protein and ${F.after.c} g of carbs within an hour: ${F.after.ex[0]}.`:'')}</div>`;
  const cf=F.caf||{};
  if(cf.cut||cf.pre)h+=`<div class="cp-sub">${cpSh('Coffee','')}${cf.cut?tm('Last cup',`By ${cf.cut.cut}, about ${cf.cut.gapH} hours before your usual ${cf.cut.bed} bedtime.`):''}${cf.pre&&cf.pre.txt?tm('Hard days',cf.pre.txt):''}</div>`;
  const wk=F.week||{};
  if(wk.days)h+=`<div class="cp-sub">${cpSh('This week',wk.days+' days logged')}${cpP(wk.low?'Well under what you use on most logged days. If it carries on, see a sports doctor or dietitian.':wk.days<TH.FOOD_LOW_N?'Log a few more days to compare with what you use.':wk.gap>=TH.FOOD_NEAR?`About ${wk.gap} kcal a day under what you used: ${F.goal==='build'?'eat a little more to build.':'a slow loss, fine while training.'}`:wk.gap<=-TH.FOOD_NEAR?`About ${-wk.gap} kcal a day over what you used: ${F.goal==='lose'?'eat a little less to lose.':'a slow gain.'}`:'Close to what you use.')}</div>`;
  const s=n&&n.hard?`${n.name||'Hard session'} ${n.tom?'tomorrow':'today'}: ${n.tom?'more carbs tonight':'carbs before'}`:`${F.carbLoad&&F.level!=='race'?'Day before your race':CP_DAYW[F.level]||'Today'}: about ${F.c} g of carbs and ${F.p} g of protein`;
  return {t:'Eat and drink',ic:'kitchen',st:wk.low?'warn':'',g:wk.low?'●':'',s,html:h};
}
const CP_DAYW={rest:'Rest day',easy:'Easy day',mod:'Moderate day',hard:'Hard day',big:'Long day',huge:'Long day',race:'Race day'};
const CP_SEV=['','mild','moderate','severe'];
function cpInj(t,st){
  const act=S().injuries.filter(i=>i.active);let ir=null;try{ir=injRet();}catch(e){}
  if(!act.length&&!ir)return null;
  const hi=ir&&S().injuries.find(x=>!x.active&&x.part===ir.part&&x.ts&&ymd(new Date(x.ts))===ir.healed),i=act[0]||{part:ir.part,sev:hi?hi.sev:2,healed:ir.healed};
  const pw=wkOn().filter(w=>w.sub&&w.sub.pain!=null).sort((a,b)=>b.date<a.date?-1:1)[0],pn=pw?pw.sub.pain:null,pl=pw?wkNoun(pw):'session';
  let h=cpSh(`${i.part} · ${CP_SEV[i.sev]||''}`,i.healed?'healed '+fmtD(i.healed):i.date?'since '+fmtD(i.date):'');
  if(pn!=null)h+=cpKv('Pain on the last '+pl,pn+' of 10',pn>=TH.PAIN_BACK?'step back':pn<=TH.PAIN_OK?'fine':'',pn>=TH.PAIN_BACK?'▲':'●',pn>=TH.PAIN_STOP?'bad':pn>=TH.PAIN_BACK?'warn':'good');
  if(ir)h+=cpP(ir.stage==='ladder'?'Run-walk return: a step up after a run with pain 3 or less.':'Coming back one stage a week.');
  h+=`<div class="cp-sub">${cpSh('Get it checked if','')}<ul class="cp-ul"><li>Pain reaches ${TH.PAIN_STOP}, or keeps rising run after run</li><li>It hurts at night or at rest</li><li>It swells, or hurts when you press on the bone</li><li>You would call it severe</li></ul></div>`;
  return {t:'Injury',ic:'bandage',st:i.sev>=2||(pn!=null&&pn>=TH.PAIN_BACK)?'warn':'',g:'●',s:`${i.part}, ${CP_SEV[i.sev]||''}${pn!=null?' · pain '+pn+' on the last '+pl:''}`,html:h};
}
const CP_AIM={maintain:'Maintain',improve:'Improve',weight:'Weight goal'};
function cpAim(a){if(!CP_AIM[a])return;const d=S();d.profile.aim=a;save(d);markProfile();refreshAll();}
function cpPlan(t,st){
  let W=st.wk;if(!W)try{W=stWeek(progAll());}catch(e){}
  const a=stAim(),rows=W&&W.base?stWeeks(W)||[]:[],mx=Math.max(1,...rows.map(r=>r.min||0)),ph=racePhase();
  let h=`<div class="cp-seg">${Object.keys(CP_AIM).map(k=>`<button class="${k===a?'on':''}" aria-pressed="${k===a}" onclick="cpAim('${k}')">${CP_AIM[k]}</button>`).join('')}</div>`;
  h+=cpP({maintain:'Holds your usual week.',improve:'Builds a little each week, with a lighter week after three.',weight:'Holds your training and sets food for steady loss.'}[a]);
  if(!rows.length)h+=cpP('Your weeks ahead show once you have logged some training.');
  h+=rows.map((r,i)=>`<div class="cp-wk"><span class="cp-d${i?'':' on'}">${i?esc(fmtD(r.from)):'This week'}</span><div class="cp-t"><i class="${/light|easier|back|taper/i.test(r.mode||'')?'lt':''}" style="width:${Math.round((r.min||0)/mx*100)}%"></i></div><div class="cp-v"><b>${esc(fmtDur(r.min||0))}</b><small>${esc(r.word||'')}</small></div></div>`).join('');
  const gn=S().profile.goalName;
  return {t:'Your plan',ic:'target',st:'',g:'',s:CP_AIM[a]+(ph&&ph.n>=0&&gn?` · ${gn} in ${ph.n} days`:''),html:h};
}
const CP_ROWS=[['recovery',cpRec],['training',cpTrain],['fitness',cpFit],['body',cpBody],['eat',cpEat],['injury',cpInj],['plan',cpPlan]];
function renderInsSum(){
  const el=document.getElementById('insSum');if(!el)return;
  const t=td();let st={days:[],thr:stThr(),wk:null};try{st=strategy()||st;}catch(e){}
  const rows=CP_ROWS.map(([k,f])=>{let r=null;try{r=f(t,st);}catch(e){console.warn('coach row',k,e);}
    return r?`<details class="cp-cr ${cpDot(r.st)}" data-k="${k}" ontoggle="cpTog(this)"${_cpOpen.has(k)?' open':''}><summary>${cpIc(r.ic)}<div class="cp-l"><b>${esc(r.t)}</b><small>${r.g?`<i>${esc(r.g)}</i>`:''}${esc(r.s)}</small></div>${cpChev()}</summary><div class="cp-cx">${r.html}</div></details>`:'';}).join('');
  el.innerHTML=`<div class="cp-hd2">From your data</div><div class="cp-card"><div class="cp-ch"><b>Coach summary</b><span>${esc(fmtD(t))}</span></div>${rows}</div>`;
}
