// ── AUTH (email link or code, no password) ───────────────────────────────────────────
let _auth=null;
function loadAuth(){try{_auth=JSON.parse(localStorage.getItem('vitalcore-auth')||'null');}catch(e){_auth=null;}}
function setAuth(a){_auth=a;try{a?localStorage.setItem('vitalcore-auth',JSON.stringify(a)):localStorage.removeItem('vitalcore-auth');}catch(e){}}
const authFrom=j=>({access_token:j.access_token,refresh_token:j.refresh_token,expires_at:Math.floor(Date.now()/1000)+(j.expires_in||3600),user:{id:j.user?.id,email:j.user?.email}});
const errMsg=async r=>{try{const j=await r.json();return j.msg||j.error_description||j.message||j.error||('Error '+r.status);}catch(e){return'Error '+r.status;}};

async function sendCode(){
  const email=$('authEmail').value.trim().toLowerCase();
  if(!/^\S+@\S+\.\S+$/.test(email)){$('authErr').textContent='Enter a valid email address.';return;}
  $('authErr').textContent='';$('authSend').textContent='Sending…';
  try{
    const r=await fetch(SB_URL+'/auth/v1/otp?redirect_to='+encodeURIComponent(location.origin+location.pathname),{method:'POST',headers:{apikey:SB_KEY,'Content-Type':'application/json'},body:JSON.stringify({email,create_user:true})});
    if(!r.ok){const m=await errMsg(r);$('authErr').textContent=r.status===429?'Too many emails sent. Wait a few minutes and try again.':m;return;}
    $('authSent').textContent=`We sent an email to ${email}. Tap the sign-in link in it on this phone. If the email shows a number code instead, type it below.`;
    $('authStep1').style.display='none';$('authStep2').style.display='block';$('authCode').focus();
  }catch(e){$('authErr').textContent='No internet connection.';}
  finally{$('authSend').textContent='Send link';}
}
async function verifyCode(){
  const email=$('authEmail').value.trim().toLowerCase(),token=$('authCode').value.trim();
  if(token.length<6){$('authErr').textContent='Tap the link in the email, or enter the code if it shows one.';return;}
  $('authErr').textContent='';$('authVerify').textContent='Checking…';
  try{
    const r=await fetch(SB_URL+'/auth/v1/verify',{method:'POST',headers:{apikey:SB_KEY,'Content-Type':'application/json'},body:JSON.stringify({type:'email',email,token})});
    if(!r.ok){$('authErr').textContent=(await errMsg(r))+' — codes expire after a few minutes; request a new one if needed.';return;}
    setAuth(authFrom(await r.json()));afterSignIn();
  }catch(e){$('authErr').textContent='No internet connection.';}
  finally{$('authVerify').textContent='Sign in';}
}
function authBack(){$('authStep1').style.display='block';$('authStep2').style.display='none';$('authErr').textContent='';}
function afterSignIn(){
  closeAuth();
  const d=S();
  // first time on this account: queue everything already on the phone
  for(const [n,T] of Object.entries(TBL))d[T.k].forEach(r=>{d.pending[n+'|'+r.id]=r.ts||Date.now();});
  d.insightLog.forEach(e=>{d.pending['insight|'+e.date]=e.ts||Date.now();});
  d.pending['profile|1']=Date.now();d.profileTs=Date.now();
  save(d);
  showToast('Signed in ✓ — syncing…');
  updSyncStatus();syncAll(true);
}
async function signOut(){
  if(!confirm('Sign out? Your data stays on this phone and in the cloud. New entries will not back up until you sign in again.'))return;
  setAuth(null);updSyncStatus();loadSetUI();showToast('Signed out');
}
function openAuth(){closeSettings();$('authErr').textContent='';authBack();const e=_auth?.user?.email;if(e)$('authEmail').value=e;$('authModal').classList.add('open');}
function closeAuth(){$('authModal').classList.remove('open');}
async function handleAuthHash(){
  if(!location.hash.includes('access_token'))return;
  try{
    const p=new URLSearchParams(location.hash.slice(1));
    const at=p.get('access_token');if(!at)return;
    const r=await fetch(SB_URL+'/auth/v1/user',{headers:{apikey:SB_KEY,Authorization:'Bearer '+at}});
    if(!r.ok)throw new Error('user '+r.status);
    const u=await r.json();if(!u.id)throw new Error('no user');
    setAuth({access_token:at,refresh_token:p.get('refresh_token'),expires_at:Math.floor(Date.now()/1000)+(+p.get('expires_in')||3600),user:{id:u.id,email:u.email}});
    afterSignIn();
  }catch(e){showToast('Sign-in link failed. Try signing in again.');}
  finally{history.replaceState(null,'',location.pathname);}
}
async function sbRefresh(){
  if(!_auth?.refresh_token)throw new Error('signed-out');
  const r=await fetch(SB_URL+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{apikey:SB_KEY,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:_auth.refresh_token})});
  if(r.status===400||r.status===401||r.status===403){setAuth(null);updSyncStatus();throw new Error('Session expired — please sign in again');}
  if(!r.ok)throw new Error('Could not refresh session');
  setAuth(authFrom(await r.json()));
}
async function sbFetch(path,opts={},retry=true){
  if(!_auth)throw new Error('signed-out');
  if(_auth.expires_at-60<Date.now()/1000)await sbRefresh();
  const r=await fetch(SB_URL+path,{...opts,headers:{apikey:SB_KEY,Authorization:'Bearer '+_auth.access_token,'Content-Type':'application/json',...(opts.headers||{})}});
  if(r.status===401&&retry){await sbRefresh();return sbFetch(path,opts,false);}
  return r;
}

// ── CLOUD SYNC ───────────────────────────────────────────────────────────────
let _pushT=null,_pushing=false,_syncing=false;
let _pushErr='';
function queuePush(){if(!_auth)return;clearTimeout(_pushT);_pushT=setTimeout(()=>pushAll().catch(e=>{const m=String(e.message||e);if(m!==_pushErr){_pushErr=m;showToast('Upload failed: '+m.slice(0,80));}}),1500);}
const toRow=(n,r)=>{const o={user_id:_auth.user.id,id:r.id,date:r.date,updated_at:new Date(r.ts||Date.now()).toISOString()};for(const [a,b] of Object.entries(TBL[n].f)){if((a==='sets'||a==='sub'||a==='reflection')&&r[a]==null)continue;o[b]=r[a]===undefined?null:r[a];}return o;};
const fromRow=(n,x)=>{const r={id:x.id,date:x.date,ts:Date.parse(x.updated_at)||0};for(const [a,b] of Object.entries(TBL[n].f)){if((a==='sets'||a==='sub'||a==='reflection')&&x[b]==null)continue;r[a]=x[b];}return r;};

async function pushAll(){
  if(!_auth||_pushing)return;
  _pushing=true;
  try{
    const d=S();
    const sent=Object.entries(d.pending);
    for(const n of [...Object.keys(TBL),'insight','profile']){
      const items=sent.filter(([k])=>k.startsWith(n+'|'));if(!items.length)continue;
      let rows=[],path;
      if(n==='profile'){rows=[{user_id:_auth.user.id,data:d.profile,updated_at:new Date(d.profileTs||Date.now()).toISOString()}];path='/rest/v1/profile?on_conflict=user_id';}
      else if(n==='insight'){rows=items.map(([k])=>d.insightLog.find(e=>e.date===k.slice(8))).filter(Boolean).map(e=>({user_id:_auth.user.id,date:e.date,time:e.time,rendered:JSON.stringify(e)}));path='/rest/v1/insights?on_conflict=user_id,date';}
      else{rows=items.map(([k])=>d[TBL[n].k].find(r=>r.id===k.slice(n.length+1))).filter(Boolean).map(r=>toRow(n,r));path=`/rest/v1/${TBL[n].t}?on_conflict=id`;}
      if(rows.length){
        const r=await sbFetch(path,{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(rows)});
        if(!r.ok){if(TBL[n]?.opt){d[OPT_FLAG[n]]=true;continue;}throw new Error(await errMsg(r));}
        if(TBL[n]?.opt)d[OPT_FLAG[n]]=false;
      }
      items.forEach(([k,ts])=>{if(d.pending[k]===ts)delete d.pending[k];});
    }
    for(const t of [...d.tomb]){
      const r=await sbFetch(`/rest/v1/${TBL[t.n].t}?id=eq.${encodeURIComponent(t.id)}`,{method:'DELETE'});
      if(!r.ok){if(TBL[t.n].opt)continue;throw new Error(await errMsg(r));}
      d.tomb=d.tomb.filter(x=>x!==t);
    }
    d.lastSync=new Date().toISOString();_pushErr='';save(d);
  }finally{_pushing=false;updSyncStatus();}
}
// optional tables (added after the first database setup): sync carries on without them and notes it here
const OPT_FLAG={food:'noFoodTbl',polar:'noPolarTbl'};
async function pullAll(){
  const d=S();
  for(const [n,T] of Object.entries(TBL)){
    const r=await sbFetch(`/rest/v1/${T.t}?select=*&order=date.desc&limit=${T.lim||3000}`);
    if(!r.ok){if(T.opt){d[OPT_FLAG[n]]=true;continue;}throw new Error(await errMsg(r));}
    if(T.opt)d[OPT_FLAG[n]]=false;
    const rows=await r.json();
    const byId=new Map(d[T.k].map(x=>[x.id,x]));
    for(const x of rows){
      if(d.pending[n+'|'+x.id]||d.tomb.some(t=>t.n===n&&t.id===x.id))continue;
      const rec=fromRow(n,x),cur=byId.get(x.id);
      if(!cur)d[T.k].push(rec);
      else if(rec.ts>(cur.ts||0))Object.assign(cur,rec);
    }
    d[T.k].sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:0);
    if(T.lim&&d[T.k].length>T.lim)d[T.k]=d[T.k].slice(-T.lim);   // the phone keeps the newest only
  }
  const pr=await sbFetch('/rest/v1/profile?select=*');
  if(pr.ok){const rows=await pr.json();const x=rows[0];
    if(x&&!d.pending['profile|1']&&Date.parse(x.updated_at)>(d.profileTs||0)){d.profile={...d.profile,...x.data};d.profileTs=Date.parse(x.updated_at);if(d.profile.name)d.onboardingDone=true;}}
  const ir=await sbFetch('/rest/v1/insights?select=*&order=date.desc&limit=30');
  if(ir.ok){
    // newer copy wins (follow-up questions are saved inside the briefing); local unsent edits are never overwritten
    const add=x=>{try{const e=JSON.parse(x.rendered);if(!e||!e.date||d.pending['insight|'+e.date])return;const i=d.insightLog.findIndex(o=>o.date===e.date);if(i<0){e.ts=e.ts||Date.now();d.insightLog.push(e);}else if((e.ts||0)>(d.insightLog[i].ts||0))d.insightLog[i]=e;}catch(err){}};
    (await ir.json()).forEach(add);
    // older briefings: ask for the dates only, then fetch the ones this phone does not have
    if(!d.insLean){
      const lr=await sbFetch('/rest/v1/insights?select=date&order=date.desc&limit=365');
      if(lr.ok){
        const miss=(await lr.json()).map(x=>String(x.date)).filter(dt=>/^\d{4}-\d\d-\d\d$/.test(dt)&&!d.insightLog.some(e=>e.date===dt));
        for(let i=0;i<miss.length;i+=40){const mr=await sbFetch('/rest/v1/insights?select=*&date=in.('+miss.slice(i,i+40).join(',')+')');if(mr.ok)(await mr.json()).forEach(add);}
      }
    }
    d.insightLog.sort((a,b)=>a.date<b.date?1:-1);d.insightLog=d.insightLog.slice(0,d.insLean?60:365);}
  save(d);
}

async function syncAll(manual){
  if(_syncing)return;
  _syncing=true;$('syncBtn').textContent='…';
  const msgs=[];let cloudErr=null;
  try{
    if(_auth){try{await pullAll();}catch(e){cloudErr=e;}}
    const icu=!!(S().intervalsKey&&S().intervalsID),pol=!!S().polarKey;
    // Polar runs first (v117): a night it delivers is the sleep record, and Intervals.icu then only adds what Polar
    // does not have (how rested you felt). If Polar fails, Intervals.icu still fills the night as before.
    if(pol){
      try{const r=await pullPolar();msgs.push(r.n?`${r.n} night${r.n>1?'s':''} from Polar`:'Polar up to date');}
      catch(e){msgs.push(e.message);}
    }
    if(icu){
      try{const r=await pullIntervals();msgs.push(r.n?`${r.n} new from Intervals.icu`:'Intervals.icu up to date');}
      catch(e){msgs.push(e.message);}
    }
    if(!icu&&!pol&&manual&&!_auth)msgs.push('Nothing to sync yet — connect Intervals.icu or Polar, or sign in in Settings');
    if(_auth&&!cloudErr){try{await pushAll();}catch(e){cloudErr=e;}}
  }finally{
    _syncing=false;$('syncBtn').textContent=_auth?'Sync':'Sign in';
    updSyncStatus();recalc();refreshActive();
  }
  if(cloudErr)msgs.unshift(cloudErr.message==='Failed to fetch'?'Cloud unreachable — will retry':'Cloud: '+cloudErr.message);
  else if(_auth)msgs.unshift('Cloud backup up to date ✓');
  if(manual||cloudErr||msgs.length)showToast(msgs.join(' · '));
}
function syncBtn(){if(!_auth&&!(S().intervalsKey&&S().intervalsID)&&!S().polarKey){openAuth();return;}syncAll(true);}
function updSyncStatus(){
  const d=S(),n=Object.keys(d.pending).length+d.tomb.length;
  let t,c='--amber';
  if(!_auth)t='On this phone only';
  else if(!navigator.onLine){t=n?`${n} to upload`:'Offline';}
  else if(n)t=`${n} to upload`;
  else if(d.lastSync){c='--green';const m=Math.floor((Date.now()-new Date(d.lastSync))/60000);t=m<2?'Synced now':m<60?`Synced ${m}m ago`:m<1440?`Synced ${Math.round(m/60)}h ago`:'Synced';}
  else{c='--green';t='Cloud backup on';}
  const el=$('hdrStatus');el.textContent=t;el.style.setProperty('--dot',`var(${c})`);
  $('syncBtn').textContent=_syncing?'…':_auth?'Sync':'Sign in';
  const sb=$('signBan');if(sb)sb.classList.toggle('hidden',!!_auth||d.signBanOff||!d.onboardingDone);
}

// ── INTERVALS.ICU ────────────────────────────────────────────────────────────
const ICU_TYPE={Run:'Run',TrailRun:'Run',VirtualRun:'Run',Ride:'Cycle',VirtualRide:'Cycle',GravelRide:'Cycle',MountainBikeRide:'Cycle',EBikeRide:'Cycle',WeightTraining:'Weights',Swim:'Swim',OpenWaterSwim:'Swim',Hike:'Hike',Walk:'Walk',Yoga:'Yoga',Workout:'Calisthenics'};
const icuHdr=key=>({Authorization:'Basic '+btoa('API_KEY:'+key.trim())});
const icuBase=id=>`https://intervals.icu/api/v1/athlete/${encodeURIComponent(id.trim())}`;
function icuErr(status){
  if(status===401)return'Intervals.icu rejected the API key';
  if(status===403||status===404)return'Athlete ID not found (it looks like i12345)';
  return'Intervals.icu error '+status;
}
// Intervals.icu sleep quality is 1 (poor) to 4 (great), the same scale as "rested" here
const icuRested=q=>typeof q==='number'&&q>=1&&q<=4?Math.round(q):null;
async function pullIntervals(){
  const d=S();
  const oldest=dAgo(90),newest=td(),H={headers:icuHdr(d.intervalsKey)},base=icuBase(d.intervalsID);
  let wr,ar;
  try{[wr,ar]=await Promise.all([fetch(`${base}/wellness?oldest=${oldest}&newest=${newest}`,H),fetch(`${base}/activities?oldest=${oldest}&newest=${newest}`,H)]);}
  catch(e){throw new Error('Intervals.icu unreachable — offline?');}
  if(!wr.ok)throw new Error(icuErr(wr.status));
  let n=0;
  const wl=await wr.json();
  // wellness is kept per day and merged field by field (never wiped); a day older than 400 days is dropped
  d.wellness=d.wellness||{};
  Object.keys(d.wellness).forEach(k=>{if(daysAgo(k)>400)delete d.wellness[k];});
  let latest=null;
  const num=v=>typeof v==='number'&&v>0?v:null;
  for(const w of wl){
    const date=w.id;if(!date)continue;
    const cur=d.wellness[date]=d.wellness[date]||{};
    const inc={steps:w.steps??null,rhr:w.restingHR??null,hrv:w.hrv??null,slHr:num(w.avgSleepingHR),spo2:num(w.spO2),sleepScore:w.sleepScore??null,sleepMin:w.sleepSecs?Math.round(w.sleepSecs/60):null,sleepQual:num(w.sleepQuality),resp:num(w.respiration),ctl:w.ctl??null,atl:w.atl??null};
    for(const [k,v] of Object.entries(inc)){if(v!=null)cur[k]=v;else if(!(k in cur))cur[k]=null;}
    if(w.ctl!=null&&w.atl!=null)latest=w;
    // sleep: new nights are created; on an existing night only empty fields and earlier imports are touched.
    // A night Polar already delivered in detail (v117) takes only "rested" from here: Intervals.icu's duration and
    // score are a flattened copy of the same Polar night, so they would be a second copy of the same data.
    const sm=inc.sleepMin,pn=polarOn(date),sv=pn?{rested:icuRested(w.sleepQuality)}:{score:w.sleepScore?Math.round(w.sleepScore):null,durMin:sm,rested:icuRested(w.sleepQuality)},ex=d.sleepLogs.find(s=>s.date===date);
    if(!pn&&(sv.score||sm)&&!ex&&!isGone('sl-'+date)){const r={id:'sl-'+date,date,score:null,durMin:null,deepH:0,deepM:0,remH:0,remM:0,rested:null};icuFill(r,sv);put('sleep',r);n++;}
    else if(ex){const r={...ex};if(icuFill(r,sv)){put('sleep',r);n++;}}
    // weight: resting HR is no longer copied onto the weigh-in (it lives in wellness)
    if(w.weight&&!isGone('mi-'+date)){
      const wt=Math.round(w.weight*10)/10,mi=d.measurements.find(m=>m.id==='mi-'+date);
      if(mi){const r={...mi};if(icuFill(r,{weight:wt})){put('meas',r);n++;}}
      else if(!d.measurements.some(m=>m.date===date&&m.weight)){const r={id:'mi-'+date,date,bpSys:null,bpDia:null,weight:null,hr:null};icuFill(r,{weight:wt});put('meas',r);n++;}
    }
  }
  if(latest){const ctl=Math.round(latest.ctl),atl=Math.round(latest.atl);d.intervalsData={ctl,atl,tsb:ctl-atl};}
  if(ar.ok){
    const acts=await ar.json();
    for(const a of acts){
      const id='icu-'+a.id,date=(a.start_date_local||'').slice(0,10);
      if(!a.id||!date||isGone(id))continue;
      const dm=Math.round((a.moving_time||a.elapsed_time||0)/60);
      const num=(v,lo,hi)=>typeof v==='number'&&v>=lo&&v<=hi?Math.round(v):null;
      const icu={hr:num(a.average_heartrate,30,230),hrMax:num(a.max_heartrate,30,250),kcal:num(a.calories,1,20000),elev:num(a.total_elevation_gain,1,15000),load:num(a.icu_training_load,1,2000),rpe:num(a.perceived_exertion??a.icu_rpe,1,10)};
      Object.keys(icu).forEach(k=>{if(icu[k]==null)delete icu[k];});
      const has=Object.keys(icu).length>0,old=d.workouts.find(w=>w.id===id);
      if(old){
        // already imported: fill in or refresh the Intervals.icu details only
        const oi=wIcu(old),chg=has&&['hr','hrMax','kcal','elev','load','rpe'].some(k=>(oi[k]??null)!==(icu[k]??null)),fixDur=!old.durMin&&!old.sets&&dm>0;
        if(chg||fixDur){put('workouts',{...old,...(fixDur?{durMin:dm}:{}),...(chg?{sub:{...(old.sub||{}),icu}}:{})});n++;}
        continue;
      }
      const type=ICU_TYPE[a.type]||'Other',wt=IS_STR(type);
      put('workouts',{id,date,type,distKm:!wt&&a.distance?Math.round(a.distance/100)/10:0,durMin:dm,rpe:null,notes:a.name||'',...(has?{sub:{icu}}:{})});n++;
    }
  }
  save(d);
  return{n};
}
async function testIntervals(){
  const res=$('icuTestRes'),key=$('sInterKey').value,id=$('sInterID').value;
  if(!key||!id){res.textContent='Enter both first';res.className='api-test-res fail';return;}
  res.textContent='Testing…';res.className='api-test-res';
  try{
    const r=await fetch(`${icuBase(id)}/wellness?oldest=${td()}&newest=${td()}`,{headers:icuHdr(key)});
    if(r.ok){res.textContent='Connected ✓';res.className='api-test-res ok';}
    else{res.textContent=icuErr(r.status);res.className='api-test-res fail';}
  }catch(e){res.textContent='Network error';res.className='api-test-res fail';}
}
async function testClaudeKey(){
  const key=$('sClaudeKey').value.trim(),res=$('claudeTestRes');
  if(!key){res.textContent='Enter a key first';res.className='api-test-res fail';return;}
  res.textContent='Testing…';res.className='api-test-res';
  try{
    const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},body:JSON.stringify({model:CLAUDE_MODEL,max_tokens:10,messages:[{role:'user',content:'hi'}]})});
    if(r.ok){res.textContent='Connected ✓';res.className='api-test-res ok';}
    else{const e=await r.json();res.textContent=e.error?.message||'Invalid key';res.className='api-test-res fail';}
  }catch(e){res.textContent='Network error';res.className='api-test-res fail';}
}

// ── POLAR (v116) ─────────────────────────────────────────────────────────────
// Detailed nights come from Polar AccessLink through the VitalCore backend (POLAR_API), which keeps the Polar
// tokens and renews them. The app only holds the backend's app key (polarKey, this phone only).
function polErr(status,j){
  if(status===401)return'The backend rejected the app key (Settings > Polar)';
  if(status===409)return'Polar is not connected yet — tap Connect to Polar in Settings';
  if(status===403)return'Polar refused. Accept every consent at account.polar.com, then connect again';
  if(status===429)return'Polar is busy (rate limit) — try again in a few minutes';
  return'Polar backend error '+status+(j&&j.error?': '+j.error:'');
}
async function polarFetch(path,key){
  let r;
  try{r=await fetch(POLAR_API+path,{headers:{'X-App-Key':(key||S().polarKey||'').trim()}});}
  catch(e){throw new Error('Polar backend unreachable — offline?');}
  let j=null;try{j=await r.json();}catch(e){}
  if(!r.ok){const e=new Error(polErr(r.status,j));e.status=r.status;throw e;}
  return j;
}
// Polar's "26280s" -> seconds / minutes; 0 means Polar has no value
const plSec=s=>typeof s==='number'?s:typeof s==='string'?Math.round(parseFloat(s))||0:0;
const plMin=s=>Math.round(plSec(s)/60);
const plNum=(v,dp=0)=>typeof v==='number'&&isFinite(v)&&v>0?Math.round(v*10**dp)/10**dp:null;
const PL_STATE={SLEEP_STATE_WAKE:0,SLEEP_STATE_NON_REM1:1,SLEEP_STATE_NON_REM2:1,SLEEP_STATE_NON_REM3:2,SLEEP_STATE_REM:3};
// the user's own rating in the Polar app, 1 (very badly) to 5 (very well), 0 when not given
const plRating=r=>{r=String(r||'');return/NEITHER/.test(r)?3:/VERY_WELL/.test(r)?5:/WELL/.test(r)?4:/VERY_BAD|VERY_POOR/.test(r)?1:/BAD|POOR/.test(r)?2:0;};
// One night in compact form, stored as polarNights[].data (synced as jsonb). Times are Polar's local ISO strings,
// durations are minutes. hyp = [[secondsFromStart, 0 wake | 1 light | 2 deep | 3 REM | 4 unknown]]; cycles = [[seconds, depth]];
// hrv and br = sample runs {t, dt seconds, v[]}; rc = the night's physiology and 28-day baselines (ms).
// Polar's own recovery verdicts (recoveryIndicator, ansStatus, tips) are deliberately left out.
function polarNight(day){
  const s=day&&day.sleep,r=s&&s.sleepResult,h=r&&r.hypnogram,sc=s&&s.sleepScore,ev=s&&s.sleepEvaluation,rc=day&&day.recharge,date=day&&day.date;
  if(!date||!h||!h.sleepStart||!h.sleepEnd)return null;
  const pd=ev&&ev.phaseDurations||{},it=ev&&ev.interruptions||{},an=ev&&ev.analysis||{};
  const data={
    start:h.sleepStart,end:h.sleepEnd,span:plMin(ev&&ev.sleepSpan)||Math.max(0,Math.round((Date.parse(h.sleepEnd)-Date.parse(h.sleepStart))/60000))||0,
    asleep:plMin(ev&&ev.asleepDuration),goal:plMin(h.sleepGoal),rating:plRating(h.sleepRating),
    stages:{wake:plMin(pd.wake),rem:plMin(pd.rem),light:plMin(pd.light),deep:plMin(pd.deep),unknown:plMin(pd.unknown),remPct:plNum(pd.remPercentage),deepPct:plNum(pd.deepPercentage)},
    score:plNum(sc&&sc.sleepScore),
    parts:sc?{ownTarget:plNum(sc.sleepTimeOwnTargetScore),recommended:plNum(sc.sleepTimeRecommendationScore),continuity:plNum(sc.continuityScore),efficiency:plNum(sc.efficiencyScore),rem:plNum(sc.remScore),deep:plNum(sc.n3Score),interruptions:plNum(sc.longInterruptionsTimeScore),duration:plNum(sc.groupDurationScore),solidity:plNum(sc.groupSolidityScore),refresh:plNum(sc.groupRefreshScore)}:null,
    eff:plNum(an.efficiencyPercent),cont:plNum(an.continuityIndex,1),contClass:an.continuityClass??null,
    inter:{total:plMin(it.totalDuration),long:plMin(it.longDuration),short:plMin(it.shortDuration),n:it.totalCount??null,nLong:it.longCount??null,nShort:it.shortCount??null},
    hyp:(h.sleepStateChanges||[]).map(c=>[plSec(c.offsetFromStart),PL_STATE[c.newState]??4]),
    cycles:(r.sleepCycles||[]).map(c=>[plSec(c.secondsFromSleepStart),Math.round((c.sleepDepthAtCycleStart||0)*100)/100]),
    hrv:(rc&&rc.hrvSamples||[]).map(x=>({t:x.startTime,dt:plSec(x.sampleInterval),v:(x.hrvValues||[]).map(v=>Math.round(v))})),
    br:(rc&&rc.breathingRateSamples||[]).map(x=>({t:x.startTime,dt:plSec(x.sampleInterval),v:(x.breathingRateValues||[]).map(v=>Math.round(v*10)/10)})),
    rc:rc?{rri:plNum(rc.meanNightlyRecoveryRri),rmssd:plNum(rc.meanNightlyRecoveryRmssd),resp:plNum(rc.meanNightlyRecoveryRespirationInterval),baseRri:plNum(rc.meanBaselineRri),baseRmssd:plNum(rc.meanBaselineRmssd),baseResp:plNum(rc.meanBaselineRespirationInterval),sdRri:plNum(rc.sdBaselineRri),sdRmssd:plNum(rc.sdBaselineRmssd),sdResp:plNum(rc.sdBaselineRespirationInterval)}:null
  };
  return{date,data};
}
// what a night gives the sleep log: Polar's times (local HH:MM), time asleep (span minus time awake), deep, REM and score
function polarSleepVals(n){
  const x=n.data,hm=s=>/^\d{4}-\d\d-\d\dT\d\d:\d\d/.test(s||'')?s.slice(11,16):null;
  if(!x.span||x.span>16*60||!hm(x.start)||!hm(x.end))return null;   // a joined or broken recording: kept as a night, not put in the log
  const hmOf=m=>m?[Math.floor(m/60),m%60]:[null,null],[dH,dM]=hmOf(x.stages.deep),[rH,rM]=hmOf(x.stages.rem);
  return{bed:hm(x.start),wake:hm(x.end),durMin:x.asleep||x.span,score:x.score,deepH:dH,deepM:dM,remH:rH,remM:rM};
}
// the stored Polar night that ended on this date (Polar's sleep date = the wake-up date, the same date Intervals.icu uses)
const polarOn=date=>(S().polarNights||[]).find(x=>x.date===date)||null;
// mean of a night's sample runs (hrv or br), used when Polar gives no nightly mean
const plMean=runs=>{const v=(runs||[]).flatMap(r=>(r.v||[]).filter(x=>x>0));return v.length?v.reduce((a,b)=>a+b,0)/v.length:null;};
// stable text for comparing two nights (jsonb from the cloud reorders keys, so never compare JSON strings)
const canon=o=>Array.isArray(o)?'['+o.map(canon).join(',')+']':o&&typeof o==='object'?'{'+Object.keys(o).sort().map(k=>k+':'+canon(o[k])).join(',')+'}':JSON.stringify(o);
async function pullPolar(){
  const d=S();if(!d.polarKey)return{n:0};
  d.polarNights=d.polarNights||[];
  // first time the last 28 nights; after that from two days before the newest stored night (Polar can revise a night)
  const newest=last(d.polarNights),from=newest?dAgo(Math.min(28,Math.max(0,daysAgo(newest.date))+2)):dAgo(28);
  const j=await polarFetch(`/polar-sleep?from=${from}&to=${dAgo(-1)}`);
  let n=0;
  for(const day of j.days||[]){
    const night=polarNight(day);if(!night)continue;
    const id='pn-'+night.date,old=d.polarNights.find(x=>x.id===id);
    if(!old||canon(old.data)!==canon(night.data)){put('polar',{id,date:night.date,data:night.data});n++;}
    // the night in the sleep log: only empty fields and earlier imports are touched (icuFill, who = 'polar')
    const sv=polarSleepVals(night);if(!sv||isGone('sl-'+night.date))continue;
    const ex=d.sleepLogs.find(s=>s.date===night.date);
    if(!ex){const r={id:'sl-'+night.date,date:night.date,score:null,durMin:null,deepH:0,deepM:0,remH:0,remM:0,rested:null,bed:null,wake:null};icuFill(r,sv,'polar');put('sleep',r);}
    else{const r={...ex};if(icuFill(r,sv,'polar'))put('sleep',r);}
  }
  if(d.polarNights.length>TBL.polar.lim)d.polarNights=d.polarNights.slice(-TBL.polar.lim);
  d.polarAt=Date.now();save(d);
  return{n};
}
// Settings > Polar
function polarNote(){
  const d=S(),a=d.polarNights||[],l=last(a);
  if(!d.polarKey)return'';
  return(a.length?`${a.length} night${a.length>1?'s':''} stored, newest ${fmtD(l.date)}.`:'No nights pulled yet. Save, then tap Sync.')+(d.noPolarTbl&&_auth?' Cloud backup for them starts after a one-time database update (docs/supabase-v116.sql).':'');
}
async function testPolar(){
  const res=$('polTestRes'),key=$('sPolarKey').value.trim();
  if(!key){res.textContent='Enter the app key first';res.className='api-test-res fail';return;}
  res.textContent='Checking…';res.className='api-test-res';
  try{
    const j=await polarFetch('/polar-status',key);
    if(j.connected){res.textContent='Polar connected ✓'+(j.missingScopes&&j.missingScopes.length?' (some permissions missing: connect again)':'');res.className='api-test-res ok';}
    else{res.textContent='Key accepted. Polar is not connected yet: tap Connect to Polar';res.className='api-test-res fail';}
  }catch(e){res.textContent=e.message;res.className='api-test-res fail';}
}
// saves the typed key, then goes to Polar to approve the app; Polar sends you back to the app with ?polar=connected
function polarConnect(){
  const key=$('sPolarKey').value.trim();if(!key){showToast('Enter the app key first');return;}
  const d=S();d.polarKey=key;save(d);flushSave();
  location.href=`${POLAR_API}/polar-login?key=${encodeURIComponent(key)}`;
}
async function polarDisconnect(){
  const key=$('sPolarKey').value.trim()||S().polarKey;if(!key){showToast('Nothing to disconnect');return;}
  if(!confirm('Disconnect Polar? The nights already pulled stay on the phone. You can connect again any time.'))return;
  try{await polarFetch('/polar-status?disconnect=1',key);$('polTestRes').textContent='';showToast('Polar disconnected');}
  catch(e){showToast(e.message);}
}

