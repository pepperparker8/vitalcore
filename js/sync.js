// ── AUTH (email link or code, no password) ───────────────────────────────────────────
let _auth=null;
function loadAuth(){try{_auth=JSON.parse(localStorage.getItem('vitalcore-auth')||'null');}catch(e){_auth=null;}}
function setAuth(a){_auth=a;try{a?localStorage.setItem('vitalcore-auth',JSON.stringify(a)):localStorage.removeItem('vitalcore-auth');}catch(e){}}
const authFrom=j=>({access_token:j.access_token,refresh_token:j.refresh_token,expires_at:Math.floor(Date.now()/1000)+(j.expires_in||3600),user:{id:j.user?.id,email:j.user?.email}});
const errMsg=async r=>{try{const j=await r.json();return j.msg||j.error_description||j.message||j.error||('Error '+r.status);}catch(e){return'Error '+r.status;}};

// v124: invite only. The app never creates an account: the owner invites people in Supabase (Authentication > Users), and sign-ups are off there
const noInvite=j=>!!j&&(/otp_disabled|signup_disabled|user_not_found/.test(j.error_code||'')||/signups? not allowed|user not found/i.test(j.msg||j.message||j.error_description||''));
async function sendCode(){
  const email=$('authEmail').value.trim().toLowerCase();
  if(!/^\S+@\S+\.\S+$/.test(email)){$('authErr').textContent='Enter a valid email address.';return;}
  $('authErr').textContent='';$('authSend').textContent='Sending…';
  try{
    const r=await fetch(SB_URL+'/auth/v1/otp?redirect_to='+encodeURIComponent(location.origin+location.pathname),{method:'POST',headers:{apikey:SB_KEY,'Content-Type':'application/json'},body:JSON.stringify({email,create_user:false})});
    if(!r.ok){let j=null;try{j=await r.clone().json();}catch(e){}
      $('authErr').textContent=r.status===429?'Too many emails sent. Wait a few minutes and try again.':noInvite(j)?'This email is not on the invite list. Ask for an invite, then try again.':await errMsg(r);return;}
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
  const uid=_auth.user.id;let d=S(),fresh=false;
  // v124: data on this phone that belongs to another account is never uploaded into this one
  if(d.dataUid&&d.dataUid!==uid){
    const n=Object.keys(d.pending).length+d.tomb.length;
    if(!confirm(`This phone holds another account's data. Signing in as ${_auth.user.email||'this account'} clears it from this phone. It stays in that account's cloud${n?`, except ${n} change${n>1?'s':''} that never uploaded`:''}. Continue?`)){setAuth(null);updSyncStatus();showGate();return;}
    _s=JSON.parse(JSON.stringify(DEFAULTS));d=S();fresh=true;
  }
  d.dataUid=uid;
  closeAuth();
  // first time on this account: queue everything already on the phone
  for(const [n,T] of Object.entries(TBL))d[T.k].forEach(r=>{d.pending[n+'|'+r.id]=r.ts||Date.now();});
  d.insightLog.forEach(e=>{d.pending['insight|'+e.date]=e.ts||Date.now();});
  // v124: a phone that never finished setup (the sign-in wall comes first now) takes the account's profile from the cloud instead of overwriting it
  if(d.onboardingDone){d.pending['profile|1']=Date.now();d.profileTs=Date.now();}
  save(d);
  if(fresh){initUI();refreshAll();}
  showToast('Signed in ✓ — syncing…');
  updSyncStatus();
  // the cloud profile marks onboarding done for an account that has used the app before
  Promise.resolve(syncAll(true)).then(()=>{if(S().onboardingDone)$('welcome').style.display='none';}).catch(()=>{});
}
async function signOut(){
  if(!confirm('Sign out? The app locks until you sign in again. Your data stays on this phone and in the cloud.'))return;
  const d=S();if(navigator.onLine&&(Object.keys(d.pending).length||d.tomb.length)){try{await pushAll();}catch(e){}}
  setAuth(null);updSyncStatus();loadSetUI();closeSettings();showGate();showToast('Signed out');
}
// v124: sign-in wall. Until an invited account signs in on this phone, the app shows only the sign-in sheet (it cannot be closed)
const gateOn=()=>!_auth;
function showGate(){const m=$('authModal');if(!m)return;const on=gateOn();m.classList.toggle('gate',on);if(on){$('authErr').textContent='';authBack();m.classList.add('open');}}
// older phones: the data already here belongs to the account signed in now
function ownData(){const d=S();if(_auth&&_auth.user&&_auth.user.id&&!d.dataUid){d.dataUid=_auth.user.id;save(d);}}
function openAuth(){closeSettings();$('authErr').textContent='';authBack();const e=_auth?.user?.email;if(e)$('authEmail').value=e;$('authModal').classList.add('open');}
function closeAuth(){if(gateOn())return;$('authModal').classList.remove('open','gate');}
async function handleAuthHash(){
  if(/[#&]error(_code)?=/.test(location.hash)){const p=new URLSearchParams(location.hash.slice(1));history.replaceState(null,'',location.pathname);
    showToast(p.get('error_code')==='otp_expired'?'That sign-in link has expired. Enter your email for a new one.':'Sign-in link failed. Try signing in again.');return;}
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
// fields left out of a row while empty; the v118 check-in fields too, so check-ins keep syncing before docs/supabase-v118.sql has been run
const SKIP_NULL=new Set(['sets','sub','reflection','symptoms','soreArea','bodyFeel']);
const toRow=(n,r)=>{const o={user_id:_auth.user.id,id:r.id,date:r.date,updated_at:new Date(r.ts||Date.now()).toISOString()};for(const [a,b] of Object.entries(TBL[n].f)){if(SKIP_NULL.has(a)&&r[a]==null)continue;o[b]=r[a]===undefined?null:r[a];}return o;};
const fromRow=(n,x)=>{const r={id:x.id,date:x.date,ts:Date.parse(x.updated_at)||0};for(const [a,b] of Object.entries(TBL[n].f)){if(SKIP_NULL.has(a)&&x[b]==null)continue;r[a]=x[b];}return r;};
// a bulk upsert needs the same keys in every row: a key that one row left out (SKIP_NULL) is sent as null in the others of the same batch
const sameKeys=rows=>{const ks=[...new Set(rows.flatMap(o=>Object.keys(o)))];return rows.map(o=>{const x={};ks.forEach(k=>{x[k]=k in o?o[k]:null;});return x;});};

// v124: rows are keyed by person and id (docs/supabase-v124.sql), so two people can both have 'sl-<date>'. Until that script has run,
// the cloud answers 42P10 (no such key) and the upload falls back to the id alone for the rest of the session
let _idKey=false;
const pgCode=async r=>{try{return (await r.clone().json()).code||'';}catch(e){return'';}};
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
      else{rows=items.map(([k])=>d[TBL[n].k].find(r=>r.id===k.slice(n.length+1))).filter(Boolean).map(r=>toRow(n,r));rows=sameKeys(rows);path=`/rest/v1/${TBL[n].t}?on_conflict=${_idKey?'id':'user_id,id'}`;}
      if(rows.length){
        const post=p=>sbFetch(p,{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(rows)});
        let r=await post(path);
        if(!r.ok&&r.status===400&&TBL[n]&&!_idKey&&await pgCode(r)==='42P10'){_idKey=true;r=await post(path.replace('user_id,id','id'));}
        if(!r.ok){if(TBL[n]?.opt){d[OPT_FLAG[n]]=true;continue;}throw new Error(await errMsg(r));}
        if(TBL[n]?.opt)d[OPT_FLAG[n]]=false;
      }
      items.forEach(([k,ts])=>{if(d.pending[k]===ts)delete d.pending[k];});
    }
    for(const t of [...d.tomb]){
      const r=await sbFetch(`/rest/v1/${TBL[t.n].t}?id=eq.${encodeURIComponent(t.id)}&user_id=eq.${_auth.user.id}`,{method:'DELETE'});
      if(!r.ok){if(TBL[t.n].opt)continue;throw new Error(await errMsg(r));}
      d.tomb=d.tomb.filter(x=>x!==t);
    }
    d.lastSync=new Date().toISOString();_pushErr='';save(d);
  }finally{_pushing=false;updSyncStatus();}
}
// optional tables (added after the first database setup): sync carries on without them and notes it here
const OPT_FLAG={food:'noFoodTbl',polar:'noPolarTbl',pday:'noDayTbl'};
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
      // the band's day (v127): steps, active time and 24/7 heart rate; silent, the nights above are what the toast reports
      try{await pullPolarDay();}catch(e){}
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
const ICU_TYPE={Run:'Run',TrailRun:'Run',VirtualRun:'Run',Ride:'Cycle',VirtualRide:'Cycle',GravelRide:'Cycle',MountainBikeRide:'Cycle',EBikeRide:'Cycle',EMountainBikeRide:'Cycle',WeightTraining:'Weights',Swim:'Swim',OpenWaterSwim:'Swim',Hike:'Hike',Walk:'Walk',Yoga:'Yoga',Workout:'Calisthenics'};
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
  let latest=null,eftp=null;
  const num=v=>typeof v==='number'&&v>0?v:null;
  for(const w of wl){
    const date=w.id;if(!date)continue;
    const cur=d.wellness[date]=d.wellness[date]||{};
    const inc={steps:w.steps??null,rhr:w.restingHR??null,hrv:w.hrv??null,slHr:num(w.avgSleepingHR),spo2:num(w.spO2),sleepScore:w.sleepScore??null,sleepMin:w.sleepSecs?Math.round(w.sleepSecs/60):null,sleepQual:num(w.sleepQuality),resp:num(w.respiration),ctl:w.ctl??null,atl:w.atl??null};
    for(const [k,v] of Object.entries(inc)){if(v!=null)cur[k]=v;else if(!(k in cur))cur[k]=null;}
    // v121: the watch's VO2max, a progress marker only (stored only on days that have one); the Ride eFTP backs up a missing FTP
    const vo=num(w.vo2max);if(vo&&vo>=20&&vo<=95)cur.vo2=Math.round(vo*10)/10;
    const ri=(w.sportInfo||[]).find(x=>x&&x.type==='Ride');if(ri&&num(ri.eftp))eftp=ri.eftp;
    if(w.ctl!=null&&w.atl!=null)latest=w;
    // sleep: new nights are created; on an existing night only empty fields and earlier imports are touched.
    // A night Polar already delivered in detail (v117) takes only "rested" from here: Intervals.icu's duration and
    // score are a flattened copy of the same Polar night, so they would be a second copy of the same data.
    const sm=inc.sleepMin,pn=polarOn(date),sv=pn?{rested:icuRested(w.sleepQuality)}:{score:w.sleepScore?Math.round(w.sleepScore):null,durMin:sm,rested:icuRested(w.sleepQuality)},ex=d.sleepLogs.find(s=>s.date===date);
    if(!pn&&(sv.score||sm)&&!ex&&!isGone('sl-'+date)){const r={id:'sl-'+date,date,score:null,durMin:null,deepH:0,deepM:0,remH:0,remM:0,rested:null};icuFill(r,sv);put('sleep',r);n++;}
    else if(ex){const r={...ex};if(icuFill(r,sv)){put('sleep',r);n++;}}
    n+=icuWeight(d,date,w.weight);
  }
  if(latest){const ctl=Math.round(latest.ctl),atl=Math.round(latest.atl);d.intervalsData={ctl,atl,tsb:ctl-atl};}
  if(ar.ok){
    const acts=await ar.json();
    for(const a of acts){
      const id='icu-'+a.id,date=(a.start_date_local||'').slice(0,10);
      if(!a.id||!date||isGone(id))continue;
      const dm=Math.round((a.moving_time||a.elapsed_time||0)/60);
      const num=(v,lo,hi)=>typeof v==='number'&&v>=lo&&v<=hi?Math.round(v):null;
      // pw/np: average and weighted average watts; dw: 1 when the watts came from a power meter (v121, picks power targets)
      const icu={hr:num(a.average_heartrate,30,230),hrMax:num(a.max_heartrate,30,250),kcal:num(a.calories,1,20000),elev:num(a.total_elevation_gain,1,15000),load:num(a.icu_training_load,1,2000),rpe:num(a.perceived_exertion??a.icu_rpe,1,10),
        pw:num(a.icu_average_watts??a.average_watts,1,2500),np:num(a.icu_weighted_avg_watts,1,2500),dw:a.device_watts===true?1:null,...icuDet(a)};
      Object.keys(icu).forEach(k=>{if(icu[k]==null)delete icu[k];});
      const has=Object.keys(icu).length>0,old=d.workouts.find(w=>w.id===id);
      if(old){
        // already imported: fill in or refresh the Intervals.icu details only (sub.pain and swim details stay).
        // v122: zone details read by the workout sheet from the single activity stay when the list leaves them out
        const oi=wIcu(old);ICU_DET.forEach(k=>{if(icu[k]==null&&oi[k]!=null)icu[k]=oi[k];});
        const chg=has&&ICU_KEYS.some(k=>!icuSame(oi[k],icu[k])),fixDur=!old.durMin&&!old.sets&&dm>0;
        if(chg||fixDur){put('workouts',{...old,...(fixDur?{durMin:dm}:{}),...(chg?{sub:{...(old.sub||{}),icu}}:{})});n++;}
        continue;
      }
      const type=ICU_TYPE[a.type]||'Other',wt=IS_STR(type);
      put('workouts',{id,date,type,distKm:!wt&&a.distance?Math.round(a.distance/100)/10:0,durMin:dm,rpe:null,notes:a.name||'',...(has?{sub:{icu}}:{})});n++;
    }
  }
  // once per phone (v119): weigh-ins from the year before the 90-day window, so the weight chart has your history
  if(!d.wtBack){
    try{const r=await fetch(`${base}/wellness?oldest=${dAgo(365)}&newest=${dAgo(91)}`,H);if(r.ok){for(const w of await r.json())if(w.id)n+=icuWeight(d,w.id,w.weight);d.wtBack=td();}}catch(e){}
  }
  await icuThrPull(d,base,H,eftp);
  save(d);
  return{n};
}
const ICU_KEYS=['hr','hrMax','kcal','elev','load','rpe','pw','np','dw','z','zb','lt','mx','dec','hrr','t','eb','cad','spd'];
// v122: more of each activity for the workout sheet and for reading effort from heart rate (js/workout.js):
// z seconds per heart rate zone, zb zone tops (bpm), lt threshold heart rate at the time, mx max heart rate, dec heart rate drift (%),
// hrr heart rate recovery (bpm in a minute), t start time HH:MM, eb 1 for an e-bike ride, cad average cadence, spd average speed (km/h)
const ICU_DET=['z','zb','lt','mx','dec','hrr'];
function icuDet(a){
  const r1=(v,lo,hi)=>typeof v==='number'&&v>=lo&&v<=hi?Math.round(v*10)/10:null;
  const arr=(v,hi)=>Array.isArray(v)&&v.length>=3&&v.length<=10&&v.every(x=>typeof x==='number'&&x>=0&&x<=hi)?v.map(Math.round):null;
  const n=(v,lo,hi)=>typeof v==='number'&&v>=lo&&v<=hi?Math.round(v):null;
  const t=/T(\d\d:\d\d)/.exec(a.start_date_local||'');
  const z=arr(a.icu_hr_zone_times,86400*3),zb=arr(a.icu_hr_zones,250);
  return{z:z&&z.some(x=>x>0)?z:null,zb,lt:n(a.lthr,100,210),mx:n(a.athlete_max_hr,120,230),dec:r1(a.decoupling,-50,50),hrr:n(a.icu_hrr&&a.icu_hrr.hrr,1,120),
    t:t?t[1]:null,eb:/^E(Mountain)?BikeRide$/.test(a.type||'')?1:null,cad:n(a.average_cadence,10,250),spd:r1(typeof a.average_speed==='number'?a.average_speed*3.6:null,1,110)};
}
// arrays (zones) compare by value, never by reference; everything else as before
const icuSame=(a,b)=>Array.isArray(a)||Array.isArray(b)?String(a??'')===String(b??''):(a??null)===(b??null);
// v121: your thresholds from the Intervals.icu sport settings, kept on this phone only (d.icuThr) and read by
// stThr() in sessions.js. At most once a day; a failure keeps the last ones. Each value is range-checked so a
// typo there cannot set silly targets: LTHR 100-210, max HR 120-230, FTP 50-600 W, threshold pace 2-7 m/s.
async function icuThrPull(d,base,H,eftp){
  const t=d.icuThr=d.icuThr||{},rg=(v,lo,hi)=>typeof v==='number'&&v>=lo&&v<=hi?v:null;
  if(rg(eftp,50,600))t.ride={...(t.ride||{}),eftp:Math.round(eftp)};
  if(t.at&&Date.now()-t.at<864e5)return;
  try{
    const r=await fetch(base,H);if(!r.ok)return;
    const ss=(await r.json()).sportSettings||[],of=k=>ss.find(s=>(s.types||[]).includes(k));
    const pick=(s,run)=>{const o={};if(!s)return o;
      const l=rg(s.lthr,100,210),m=rg(s.max_hr,120,230);if(l)o.lthr=Math.round(l);if(m)o.maxHr=Math.round(m);
      if(run){const p=rg(s.threshold_pace,2,7);if(p)o.pace=Math.round(p*1000)/1000;}else{const f=rg(s.ftp,50,600);if(f)o.ftp=Math.round(f);}
      return o;};
    const ef=t.ride&&t.ride.eftp;
    d.icuThr={run:pick(of('Run'),1),ride:{...pick(of('Ride')),...(ef?{eftp:ef}:{})},at:Date.now()};
  }catch(e){}
}
// one weigh-in from Intervals.icu (your scale's app passes it on); a typed weight that day is never replaced.
// Resting HR is not copied onto the weigh-in (it lives in wellness). Returns 1 when something changed.
function icuWeight(d,date,kg){
  if(!kg||isGone('mi-'+date))return 0;
  const wt=Math.round(kg*10)/10,mi=d.measurements.find(m=>m.id==='mi-'+date);
  if(mi){const r={...mi};if(icuFill(r,{weight:wt})){put('meas',r);return 1;}return 0;}
  if(d.measurements.some(m=>m.date===date&&m.weight))return 0;
  const r={id:'mi-'+date,date,bpSys:null,bpDia:null,weight:null,hr:null};icuFill(r,{weight:wt});put('meas',r);return 1;
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
// ── v121: a planned session to Intervals.icu, which passes it to the watch at the watch's next sync ──
// Only our own events are ever deleted: the id stored when we sent it, or an external_id starting ICU_PFX.
// The owner's own events (no external_id, or one from another app) are never touched.
// Sent state is this phone only: d.icuSent {date:{id, sig, at}}, kept 14 days. TH.SEND_DAYS days can be sent (1 = today).
const ICU_PFX='vc-',ICU_OUT={Run:'Run',Cycle:'Ride',Swim:'Swim'};
const icuOwn=(e,was)=>!!e&&(String(e.external_id||'').startsWith(ICU_PFX)||(!!was&&was.id!=null&&String(e.id)===String(was.id)));
// the event for a plan day, or null when it cannot go to the watch (rest, strength, yoga, no session)
function icuEvent(x,thr){
  const type=x&&x.sess&&ICU_OUT[x.sess.type];if(!type)return null;
  const description=sessIcu(x.sess,thr);if(!description)return null;
  return{category:'WORKOUT',type,start_date_local:x.date+'T00:00:00',name:x.sess.name,description,external_id:ICU_PFX+x.date};
}
// a short fingerprint of the event, so an unchanged session is not sent twice
const icuSig=ev=>{const s=canon(ev);let h=0;for(let i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))|0;return(h>>>0).toString(36);};
async function icuF(url,o){try{return await fetch(url,o);}catch(e){throw new Error('Intervals.icu unreachable — offline?');}}
// delete our own planned workouts on that date; when the list cannot be read, only the id we stored
async function icuDropOurs(base,H,date,was){
  const r=await icuF(`${base}/events?oldest=${date}&newest=${date}&category=WORKOUT`,H);
  if(r.status===401||r.status===403)throw new Error(icuErr(r.status));
  const evs=r.ok?await r.json():null;
  const ids=Array.isArray(evs)?evs.filter(e=>(e.start_date_local||'').slice(0,10)===date&&icuOwn(e,was)).map(e=>e.id):was&&was.id!=null?[was.id]:[];
  for(const id of ids){
    const x=await icuF(`${base}/events/${encodeURIComponent(id)}`,{method:'DELETE',...H});
    if(!x.ok&&x.status!==404)throw new Error(icuErr(x.status));
  }
  return ids.length;
}
let _icuBusy='';
// Send to watch (rm: take ours off instead). A plan that changed replaces ours; an unchanged one is not sent again.
async function icuSendDay(date,rm){
  const d=S();
  if(!d.intervalsKey||!d.intervalsID){showToast('Connect Intervals.icu in Settings first');return;}
  if(_icuBusy)return;
  const st=strategy(),x=st&&st.days.find(y=>y.date===date);
  if(!x||x.i>=TH.SEND_DAYS||x.done)return;
  const ev=rm?null:icuEvent(x,st.thr),was=(d.icuSent||{})[date];
  if(!ev&&!was)return;
  const sig=ev&&icuSig(ev);
  if(ev&&was&&was.sig===sig){showToast('Already on your watch');return;}
  const base=icuBase(d.intervalsID),H={headers:icuHdr(d.intervalsKey)};
  let gone=false,rec=null;
  _icuBusy=date;refreshAll();
  try{
    await icuDropOurs(base,H,date,was);gone=true;
    if(ev){
      const r=await icuF(`${base}/events`,{method:'POST',headers:{...H.headers,'Content-Type':'application/json'},body:JSON.stringify(ev)});
      if(!r.ok)throw new Error(icuErr(r.status));
      const j=await r.json();rec={id:j&&j.id!=null?j.id:null,sig,at:Date.now()};
    }
    showToast(ev?'Sent to Intervals.icu. It reaches your watch at the next sync.':'Taken off Intervals.icu. It leaves your watch at the next sync.');
  }catch(e){showToast(e.message||'Could not send it');}
  finally{
    // our old event is gone once the delete ran, so the stored one goes too, even when the new one failed
    if(gone||rec){const n=S(),k={};Object.entries(n.icuSent||{}).forEach(([dt,v])=>{if(dt!==date&&daysAgo(dt)<=14)k[dt]=v;});if(rec)k[date]=rec;n.icuSent=k;save(n);}
    _icuBusy='';refreshAll();
  }
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
  if(h.batteryRanOut)data.batt=1;   // v127: the band ran out of battery during the night, so the recording stops early
  return{date,data};
}
// ── THE NIGHT CUT (v127) ─────────────────────────────────────────────────────
// A band taken off in the evening and put back on at bedtime can make a night start hours early. The part with the band off is
// cut from the night: trim = {s, e (seconds from the night's start), by}; by 'auto' (clear signs, worked out again on each download),
// 'you' (Adjust) or 'off' (Undo or "It is right": no cut). A change you make is never undone by a download.
const plT=iso=>{const v=Date.parse(iso||'');return isFinite(v)?v:null;};
const plHm=s=>/^\d{4}-\d\d-\d\dT\d\d:\d\d/.test(s||'')?s.slice(11,16):null;
// HH:MM plus seconds, on the night's own clock
const plHmAdd=(hm,sec)=>{const[h,m]=hm.split(':').map(Number),t=((h*60+m+Math.round(sec/60))%1440+1440)%1440;return`${String(Math.floor(t/60)).padStart(2,'0')}:${String(t%60).padStart(2,'0')}`;};
// the night's length in seconds
const plTot=x=>{const a=plT(x.start),b=plT(x.end);return a!=null&&b!=null&&b>a?Math.round((b-a)/1000):(x.span||0)*60;};
// stages as segments [from, to, state] in seconds; time before the first change counts as unknown
function plSegs(x){
  const tot=plTot(x),h=(x.hyp||[]).filter(c=>c[0]>=0&&c[0]<tot),out=[];
  if(!h.length||h[0][0]>0)out.push([0,h.length?h[0][0]:tot,4]);
  h.forEach((c,i)=>{const to=i+1<h.length?h[i+1][0]:tot;if(to>c[0])out.push([c[0],to,c[1]]);});
  return out;
}
// minutes of each stage between s and e (seconds); asleep = light, deep and dreaming
function plWin(n,s,e){
  const m={0:0,1:0,2:0,3:0,4:0};
  for(const[a,b,st]of plSegs(n.data)){const x=Math.max(a,s),y=Math.min(b,e);if(y>x)m[st]=(m[st]||0)+(y-x);}
  const r=v=>Math.round(v/60);
  return{inBed:r(Math.max(0,e-s)),asleep:r(m[1]+m[2]+m[3]),light:r(m[1]),deep:r(m[2]),rem:r(m[3]),wake:r(m[0]),unknown:r(m[4])};
}
// the cut in force, or null
const plCut=n=>{const t=n&&n.trim;return t&&(t.by==='auto'||t.by==='you')&&t.e>t.s?t:null;};
// the band's day record, and its 24/7 heart rate as [ms, bpm] between two moments; null when a day in the range has no heart rate,
// so a day that was never downloaded never reads as "band off"
const dayOn=date=>(S().polarDays||[]).find(x=>x.date===date)||null;
function plHrIn(a,b){
  const out=[],d0=new Date(a),d1=new Date(b);d0.setHours(12,0,0,0);
  for(const dt=new Date(d0);dt<=d1||ymd(dt)===ymd(d1);dt.setDate(dt.getDate()+1)){
    const day=dayOn(ymd(dt));if(!day||!(day.data.hr||[]).length)return null;
    for(const r of day.data.hr){const t0=plT(r.t);if(t0==null)continue;(r.v||[]).forEach((v,i)=>{const ms=t0+i*r.dt*1000;if(v>0&&ms>=a&&ms<=b)out.push([ms,v]);});}
    if(ymd(dt)===ymd(d1))break;
  }
  return out.sort((x,y)=>x[0]-y[0]);
}
// minutes a night kept (its cut, else its span); the usual = median of the TRIM_N to 14 nights before
const plKept=n=>{const c=plCut(n);return c?(c.e-c.s)/60:n.data.span||0;};
function plUsual(date){
  const v=(S().polarNights||[]).filter(x=>x.date<date&&daysAgo(x.date)-daysAgo(date)<=14&&x.data.span).map(plKept).sort((a,b)=>a-b);
  return v.length>=TH.TRIM_N?v[Math.floor(v.length/2)]:null;
}
// when the heart rate settles, in seconds from the night's start: the start of the first TRIM_HR_WIN minutes whose mean is within
// TRIM_HR_UP of the night's sleeping level (median of its second half); null without enough heart rate in the second half
function plHrSet(hs,hv,tot){
  const lv=hv.filter((v,i)=>hs[i]>=tot/2).sort((a,b)=>a-b);if(!hs.length||lv.length*TH.DAY_HR_DT<TH.TRIM_GAP*60)return null;
  const lvl=lv[Math.floor(lv.length/2)],W=TH.TRIM_HR_WIN*60;
  for(let m=hs[0];m+W<=tot;m+=TH.DAY_HR_DT){
    const v=hv.filter((x,i)=>hs[i]>=m&&hs[i]<m+W);
    if(v.length&&v.reduce((a,b)=>a+b,0)/v.length<=lvl+TH.TRIM_HR_UP)return m;
  }
  return null;
}
// the edges of a night, in seconds from its start: band back on / off (24/7 heart rate), first / last sleep, unknown runs, first overnight sample,
// and when the heart rate settled to its sleeping level (hrSet)
function plEdges(n){
  const x=n.data,t0=plT(x.start),tot=plTot(x);if(t0==null||!tot)return null;
  const seg=plSegs(x),sl=seg.filter(g=>g[2]>=1&&g[2]<=3),hr=plHrIn(t0,t0+tot*1000);
  const hs=hr?hr.map(p=>Math.round((p[0]-t0)/1000)):null;
  const sm=[...(x.hrv||[]),...(x.br||[])].filter(r=>(r.v||[]).some(v=>v>0)).map(r=>(plT(r.t)-t0)/1000).filter(v=>isFinite(v));
  return{tot,seg,
    firstSleep:sl.length?sl[0][0]:null,lastSleep:sl.length?last(sl)[1]:null,
    bandOn:hs&&hs.length?hs[0]:null,bandOff:hs&&hs.length?last(hs):null,hrOk:!!(hs&&hs.length),
    u0:seg.length&&seg[0][2]===4?seg[0][1]:0,uN:seg.length&&last(seg)[2]===4?tot-last(seg)[0]:0,
    firstSample:sm.length?Math.min(...sm):null,hrSet:hs&&hs.length?plHrSet(hs,hr.map(p=>p[1]),tot):null};
}
// the end of the last sleep at or before a moment (a band taken off after waking ends the night at the last sleep)
const plSleepEnd=(E,e)=>{const g=E.seg.filter(s=>s[2]>=1&&s[2]<=3&&s[0]<e);if(!g.length)return e;const l=last(g);return l[1]>=e?e:l[1];};
// clear signs give a cut, weak signs ask. Signals: S1 no 24/7 heart rate at the edge while it is there later that night;
// S2 no overnight sample (heart rate variability, breathing) in the start gap; S3 an edge run of unknown; S4 a night 90+ min over your usual;
// S5 the band was on but the heart rate stayed over its sleeping level for TRIM_HR_MIN+ from its first reading (awake in bed); the night then
// starts where it settled. why 'hr' = the start comes from the heart rate
function plTrim(n){
  const E=plEdges(n);if(!E)return null;
  const G=TH.TRIM_GAP*60,us=plUsual(n.date),s4=us!=null&&n.data.span>us+TH.TRIM_LONG;
  const s1=E.hrOk&&E.bandOn>=G,s3=E.u0>=G,s5=E.hrSet!=null&&E.hrSet-E.bandOn>=TH.TRIM_HR_MIN*60;
  const s=s5?E.hrSet:s1||s3?Math.max(s1?E.bandOn:0,s3?E.u0:0):0;
  const s2=s>0&&(E.firstSample==null||E.firstSample>=s-TH.DAY_HR_DT);
  const e1=E.hrOk&&E.tot-E.bandOff>=G,e3=E.uN>=G;
  let e=E.tot;if(e1||e3)e=plSleepEnd(E,Math.min(e1?E.bandOff:E.tot,e3?E.tot-E.uN:E.tot));
  const cs=s>=G&&(s1||s3||s5)&&[s1,s2,s3,s4,s5].filter(Boolean).length>=2,ce=E.tot-e>=G&&(e1||e3)&&[e1,e3,s4].filter(Boolean).length>=2;
  const cut=cs||ce?{s:cs?s:0,e:ce?e:E.tot}:null;
  // a cut has to leave a night: at least TRIM_GAP minutes asleep inside it
  const ok=cut&&cut.e>cut.s&&plWin(n,cut.s,cut.e).asleep>=TH.TRIM_GAP;
  return{cut:ok?cut:null,ask:!ok&&(s4||s1||s3||s5||e1||e3),E,sig:{s1,s2,s3,s4,s5,e1,e3},at:{s,e},us,why:s5?'hr':null};
}
// a night that may hold time with the band off and has no decision yet: Log and the sheet ask
const plAsk=n=>!!(n&&!n.trim&&(plTrim(n)||{}).ask);
// the question's heading: awake in bed when the heart rate is the only edge sign, else the band
const plAskHead=t=>t&&t.sig.s5&&!t.sig.s1&&!t.sig.s3&&!t.sig.e1&&!t.sig.e3?'May include time awake before sleep':'May include time with your band off';
// what a night gives the sleep log: Polar's times (local HH:MM), time asleep (span minus time awake), deep, REM and score;
// inside the cut when there is one (v127), with time asleep and stages counted from the stages inside it
function polarSleepVals(n){
  const x=n.data,c=plCut(n),hm=plHm;
  if(!x.span||!hm(x.start)||!hm(x.end))return null;
  if(c?c.e-c.s>16*3600:x.span>16*60)return null;   // a joined or broken recording: kept as a night, not put in the log
  const hmOf=m=>m?[Math.floor(m/60),m%60]:[null,null];
  if(!c){const[dH,dM]=hmOf(x.stages.deep),[rH,rM]=hmOf(x.stages.rem);
    return{bed:hm(x.start),wake:hm(x.end),durMin:x.asleep||x.span,score:x.score,deepH:dH,deepM:dM,remH:rH,remM:rM};}
  const w=plWin(n,c.s,c.e),[dH,dM]=hmOf(w.deep),[rH,rM]=hmOf(w.rem);
  return{bed:plHmAdd(hm(x.start),c.s),wake:plHmAdd(hm(x.start),c.e),durMin:w.asleep,score:x.score,deepH:dH,deepM:dM,remH:rH,remM:rM};
}
// the night in the sleep log: only empty fields and earlier imports are touched (icuFill, who = 'polar')
function plFillLog(n){
  const d=S(),sv=n&&polarSleepVals(n);if(!sv||isGone('sl-'+n.date))return false;
  const ex=d.sleepLogs.find(s=>s.date===n.date);
  if(!ex){const r={id:'sl-'+n.date,date:n.date,score:null,durMin:null,deepH:0,deepM:0,remH:0,remM:0,rested:null,bed:null,wake:null};icuFill(r,sv,'polar');put('sleep',r);return true;}
  const r={...ex};if(icuFill(r,sv,'polar')){put('sleep',r);return true;}
  return false;
}
// work out the automatic cut again for the nights from a date (a decision you made stays), then refill their sleep log
function plRetrim(from){
  let n=0;
  for(const r of(S().polarNights||[]).filter(x=>x.date>=from)){
    if(!(r.trim&&r.trim.by!=='auto')){
      const t=plTrim(r),nt=t&&t.cut?{s:t.cut.s,e:t.cut.e,by:'auto',...(t.why&&t.cut.s?{why:t.why}:{})}:null;
      if(canon(nt)!==canon(r.trim||null)){put('polar',{...r,trim:nt});n++;}
    }
    plFillLog(polarOn(r.date));
  }
  return n;
}
// Undo, "It is right" and Adjust: your decision for a night, kept over every later download
function plSetTrim(date,trim){
  const r=polarOn(date);if(!r)return;
  put('polar',{...r,trim});plFillLog(polarOn(date));recalc();refreshActive();
  if(typeof loadSleepFor==='function'&&$('slDate')&&$('slDate').value===date)loadSleepFor(date);   // the Log form shows the night as now kept
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
    // a changed night keeps its cut (put replaces the whole record); an automatic one is worked out again below
    if(!old||canon(old.data)!==canon(night.data)){put('polar',{id,date:night.date,data:night.data,trim:old&&old.trim||null});n++;}
  }
  if(d.polarNights.length>TBL.polar.lim)d.polarNights=d.polarNights.slice(-TBL.polar.lim);
  // the cut, then the sleep log (only empty fields and earlier imports are touched)
  plRetrim(from);
  d.polarAt=Date.now();save(d);
  return{n};
}
// ── THE BAND'S DAY (v127) ────────────────────────────────────────────────────
// steps, active time, sitting, MET-hours and 24/7 heart rate: one compact record a day, polarDays[] {id 'pd-<date>', date, data}
// (synced as jsonb). Polar's V4 day (activitySamples per device) is read by plAct; other names are read loosely as a fallback.
// seconds from a number, "123s" or "PT1H2M3S"
const plDur=v=>{
  if(typeof v==='number')return isFinite(v)&&v>=0?v:null;
  if(typeof v!=='string')return null;
  const m=v.match(/^PT?(?:([\d.]+)H)?(?:([\d.]+)M)?(?:([\d.]+)S)?$/);
  if(m&&(m[1]||m[2]||m[3]))return(+m[1]||0)*3600+(+m[2]||0)*60+(+m[3]||0);
  const n=parseFloat(v);return isFinite(n)&&n>=0?n:null;
};
// the first of these keys that holds a plain value, at the top or one level down
function plPick(o,keys,dp=0){
  if(!o||typeof o!=='object'||Array.isArray(o))return null;
  for(const k of keys)if(o[k]!=null&&typeof o[k]!=='object')return o[k];
  if(dp<1)for(const v of Object.values(o)){const x=plPick(v,keys,dp+1);if(x!=null)return x;}
  return null;
}
// a moment as local ISO text without an offset
const plIso=ms=>{const x=new Date(ms);return ymd(x)+'T'+[x.getHours(),x.getMinutes(),x.getSeconds()].map(v=>String(v).padStart(2,'0')).join(':');};
// a sample time: full ISO, or "HH:MM(:SS)" on the day's date
const plLocal=(t,date)=>typeof t!=='string'?null:/^\d\d:\d\d/.test(t)?plT(date+'T'+(t.length===5?t+':00':t.slice(0,8))):plT(t);
const PL_HR_K=['heartRate','heart_rate','hr','bpm','value'],PL_T_K=['sampleTime','sample_time','time','timestamp','startTime','start'];
// 24/7 heart rate, as samples or as runs, into runs {t, dt, v[]} of one mean per DAY_HR_DT seconds (20 to 250 bpm kept).
// The backend sends one mean a minute {date, startTime '00:00:00', sampleInterval '60s', values[]}; a raw Polar sample
// {heartRate, offsetMillis} is milliseconds from the start of its entry's date
function plHrRuns(raw,date){
  const pts=[];
  const walk=(o,dp,dd)=>{
    if(!o||typeof o!=='object'||dp>4)return;
    if(Array.isArray(o)){o.forEach(x=>walk(x,dp+1,dd));return;}
    if(typeof o.date==='string'&&/^\d{4}-\d\d-\d\d/.test(o.date))dd=o.date.slice(0,10);
    const vals=o.values||o.hrValues||o.heartRateValues,t0=plLocal(plPick(o,['startTime','start']),dd),dt=plDur(o.sampleInterval??o.interval);
    if(Array.isArray(vals)&&t0!=null&&dt){vals.forEach((v,i)=>pts.push([t0+i*dt*1000,+v]));return;}
    const hr=PL_HR_K.map(k=>o[k]).find(v=>typeof v==='number');
    const t=typeof o.offsetMillis==='number'?plT(dd+'T00:00:00')+o.offsetMillis:plLocal(PL_T_K.map(k=>o[k]).find(v=>typeof v==='string'),dd);
    if(hr!=null&&t!=null){pts.push([t,hr]);return;}
    Object.values(o).forEach(v=>walk(v,dp+1,dd));
  };
  walk(raw,0,date);
  const bin=TH.DAY_HR_DT*1000,by=new Map();
  for(const[t,v]of pts)if(isFinite(t)&&v>=20&&v<=250){const k=Math.floor(t/bin);const b=by.get(k)||[0,0];b[0]+=v;b[1]++;by.set(k,b);}
  const runs=[];let cur=null,prev=null;
  for(const k of[...by.keys()].sort((a,b)=>a-b)){
    const m=Math.round(by.get(k)[0]/by.get(k)[1]);
    if(cur&&k===prev+1)cur.v.push(m);else runs.push(cur={t:plIso(k*bin),dt:TH.DAY_HR_DT,v:[m]});
    prev=k;
  }
  return runs;
}
// seconds after midnight from "HH:MM(:SS)"
const plClock=t=>typeof t==='string'&&/^\d\d:\d\d/.test(t)?+t.slice(0,2)*3600+ +t.slice(3,5)*60+(+t.slice(6,8)||0):null;
// Polar's V4 day: per device activitySamples [{stepSamples {startTime, interval ms, steps[]}, metSamples {startTime, interval ms, mets[]},
// activityInfos [{activityClass, time}] (the moments the class changes)}]. The device with the most steps counts.
// act = minutes in a moderate or vigorous class (from METs at ACT_MET+ when the day has no classes), sit = sedentary minutes,
// met = MET-hours (about kcal per kg of body weight), sitMax = the longest sitting stretch in minutes (v129). Null when the answer holds no samples.
function plAct(a){
  const devs=[];
  const walk=(o,dp)=>{
    if(!o||typeof o!=='object'||dp>4)return;
    if(Array.isArray(o)){o.forEach(x=>walk(x,dp+1));return;}
    if(Array.isArray(o.activitySamples)){devs.push(o.activitySamples);return;}
    Object.values(o).forEach(v=>walk(v,dp+1));
  };
  walk(a,0);
  let best=null;
  for(const list of devs){
    const r={steps:0,act:0,sit:0,met:0,n:0};let cls=0,hiMet=0,sr=0,sMax=0;
    for(const x of list){
      const st=x&&x.stepSamples||{},me=x&&x.metSamples||{};
      const sv=Array.isArray(st.steps)?st.steps:[],mv=Array.isArray(me.mets)?me.mets:[];
      const si=+st.interval>0?+st.interval:60000,mi=+me.interval>0?+me.interval:30000;
      const s0=plClock(st.startTime)??0,m0=plClock(me.startTime)??0;
      sv.forEach(v=>{if(typeof v==='number'&&v>=0){r.steps+=v;r.n++;}});
      mv.forEach(v=>{if(typeof v==='number'&&v>=0){r.met+=v*mi/3.6e6;r.n++;if(v>=TH.ACT_MET)hiMet+=mi;}});
      // a class lasts until the next change, the last one until the samples end (at most midnight)
      const end=Math.min(86400,Math.max(sv.length?s0+sv.length*si/1000:0,mv.length?m0+mv.length*mi/1000:0));
      const ch=(x&&x.activityInfos||[]).map(c=>[plClock(c&&c.time),String(c&&c.activityClass||'')]).filter(c=>c[0]!=null).sort((p,q)=>p[0]-q[0]);
      ch.forEach((c,i)=>{const to=i+1<ch.length?ch[i+1][0]:end,d=to-c[0];if(d<=0)return;cls++;
        if(/MODERATE|VIGOROUS/.test(c[1]))r.act+=d;else if(/SEDENTARY/.test(c[1]))r.sit+=d;
        // v129: the longest stretch sitting; sedentary changes in a row are one stretch
        if(/SEDENTARY/.test(c[1]))sr+=d;else{sMax=Math.max(sMax,sr);sr=0;}});
      sMax=Math.max(sMax,sr);sr=0;
    }
    if(!r.n&&!cls)continue;
    const out={steps:r.n?r.steps:null,act:cls?Math.round(r.act/60):r.met?Math.round(hiMet/60000):null,sit:cls?Math.round(r.sit/60):null,sitMax:cls?Math.round(sMax/60):null,met:r.met?Math.round(r.met*10)/10:null};
    if(!best||(out.steps||0)>(best.steps||0))best=out;
  }
  return best;
}
// one day in compact form: steps, act (active minutes), sit (sitting minutes), met (MET-hours), kcal (only when Polar gives it),
// hr runs, hrLo / hrHi (lowest and highest 5-minute mean)
function polarDay(raw){
  const date=raw&&raw.date;if(!date)return null;
  const a=raw.activity,hr=plHrRuns(raw.hr,date),mins=v=>{const x=plDur(v);return x!=null&&x/60<=1440?Math.round(x/60):null;};
  const v4=plAct(a);
  const data=v4?{...v4,kcal:plNum(Number(plPick(a,['calories','totalCalories','kcal'])))}:{
    steps:plNum(Number(plPick(a,['steps','stepCount','stepsCount','activeSteps','active-steps','totalSteps']))),
    act:mins(plPick(a,['activeDuration','activeTime','active-time','active-duration','activityTime'])),
    kcal:plNum(Number(plPick(a,['calories','totalCalories','kcal']))),
    sit:mins(plPick(a,['inactivityDuration','inactiveDuration','sedentaryDuration','inactiveTime','sittingTime']))
  };
  const hv=hr.flatMap(r=>r.v);
  if(hv.length)Object.assign(data,{hr,hrLo:Math.min(...hv),hrHi:Math.max(...hv)});
  Object.keys(data).forEach(k=>data[k]==null&&delete data[k]);
  return Object.keys(data).length?{date,data}:null;
}
async function pullPolarDay(){
  const d=S();if(!d.polarKey)return{n:0};
  d.polarDays=d.polarDays||[];
  // first time the last 28 days; after that from two days before the newest stored day, so today refreshes on every sync
  const newest=last(d.polarDays),from=newest?dAgo(Math.min(28,Math.max(0,daysAgo(newest.date))+2)):dAgo(28);
  const j=await polarFetch(`/polar-day?from=${from}&to=${dAgo(-1)}`);
  let n=0;
  for(const raw of j.days||[]){
    const day=polarDay(raw);if(!day)continue;
    const id='pd-'+day.date,old=d.polarDays.find(x=>x.id===id);
    if(!old||canon(old.data)!==canon(day.data)){put('pday',{id,date:day.date,data:day.data});n++;}
  }
  d.polarDays.sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:0);
  if(d.polarDays.length>TBL.pday.lim)d.polarDays=d.polarDays.slice(-TBL.pday.lim);
  // the heart rate shows when the band was off, so the nights next to these days are cut again (from the evening before)
  if(n)plRetrim(ymd(new Date(new Date(from+'T12:00:00').getTime()-864e5)));
  d.polarDayAt=Date.now();save(d);
  return{n};
}
// Settings > Polar
function polarNote(){
  const d=S(),a=d.polarNights||[],l=last(a);
  if(!d.polarKey)return'';
  return(a.length?`${a.length} night${a.length>1?'s':''} stored, newest ${fmtD(l.date)}.`:'No nights pulled yet. Save, then tap Sync.')+(d.noPolarTbl&&_auth?' Cloud backup for them starts after a one-time database update (docs/supabase-v116.sql, then docs/supabase-v127.sql).':'');
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
// v124: the key travels only in the X-App-Key header; the backend answers with Polar's login address, which carries no key
async function polarConnect(){
  const key=$('sPolarKey').value.trim();if(!key){showToast('Enter the app key first');return;}
  const d=S();d.polarKey=key;save(d);flushSave();
  try{const j=await polarFetch('/polar-status',key);if(!j||!/^https:\/\/auth\.polar\.com\//.test(j.connect||''))throw new Error('The backend did not give a Polar login address');location.href=j.connect;}
  catch(e){showToast(e.message);}
}
async function polarDisconnect(){
  const key=$('sPolarKey').value.trim()||S().polarKey;if(!key){showToast('Nothing to disconnect');return;}
  if(!confirm('Disconnect Polar? The nights already pulled stay on the phone. You can connect again any time.'))return;
  try{await polarFetch('/polar-status?disconnect=1',key);$('polTestRes').textContent='';showToast('Polar disconnected');}
  catch(e){showToast(e.message);}
}

