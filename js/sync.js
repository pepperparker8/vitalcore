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
        if(!r.ok)throw new Error(await errMsg(r));
      }
      items.forEach(([k,ts])=>{if(d.pending[k]===ts)delete d.pending[k];});
    }
    for(const t of [...d.tomb]){
      const r=await sbFetch(`/rest/v1/${TBL[t.n].t}?id=eq.${encodeURIComponent(t.id)}`,{method:'DELETE'});
      if(!r.ok)throw new Error(await errMsg(r));
      d.tomb=d.tomb.filter(x=>x!==t);
    }
    d.lastSync=new Date().toISOString();_pushErr='';save(d);
  }finally{_pushing=false;updSyncStatus();}
}
async function pullAll(){
  const d=S();
  for(const [n,T] of Object.entries(TBL)){
    const r=await sbFetch(`/rest/v1/${T.t}?select=*&order=date.desc&limit=3000`);
    if(!r.ok)throw new Error(await errMsg(r));
    const rows=await r.json();
    const byId=new Map(d[T.k].map(x=>[x.id,x]));
    for(const x of rows){
      if(d.pending[n+'|'+x.id]||d.tomb.some(t=>t.n===n&&t.id===x.id))continue;
      const rec=fromRow(n,x),cur=byId.get(x.id);
      if(!cur)d[T.k].push(rec);
      else if(rec.ts>(cur.ts||0))Object.assign(cur,rec);
    }
    d[T.k].sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:0);
  }
  const pr=await sbFetch('/rest/v1/profile?select=*');
  if(pr.ok){const rows=await pr.json();const x=rows[0];
    if(x&&!d.pending['profile|1']&&Date.parse(x.updated_at)>(d.profileTs||0)){d.profile={...d.profile,...x.data};d.profileTs=Date.parse(x.updated_at);if(d.profile.name)d.onboardingDone=true;}}
  const ir=await sbFetch('/rest/v1/insights?select=*&order=date.desc&limit=60');
  if(ir.ok){for(const x of await ir.json()){
    if(d.insightLog.some(e=>e.date===x.date)||d.pending['insight|'+x.date])continue;
    try{const e=JSON.parse(x.rendered);e.ts=e.ts||Date.now();d.insightLog.push(e);}catch(err){}}
    d.insightLog.sort((a,b)=>a.date<b.date?1:-1);d.insightLog=d.insightLog.slice(0,60);}
  save(d);
}

async function syncAll(manual){
  if(_syncing)return;
  _syncing=true;$('syncBtn').textContent='…';
  const msgs=[];let cloudErr=null;
  try{
    if(_auth){try{await pullAll();}catch(e){cloudErr=e;}}
    if(S().intervalsKey&&S().intervalsID){
      try{const r=await pullIntervals();msgs.push(r.n?`${r.n} new from Intervals.icu`:'Intervals.icu up to date');}
      catch(e){msgs.push(e.message);}
    }else if(manual&&!_auth)msgs.push('Nothing to sync yet — connect Intervals.icu or sign in in Settings');
    if(_auth&&!cloudErr){try{await pushAll();}catch(e){cloudErr=e;}}
  }finally{
    _syncing=false;$('syncBtn').textContent=_auth?'SYNC':'SIGN IN';
    updSyncStatus();recalc();refreshActive();
  }
  if(cloudErr)msgs.unshift(cloudErr.message==='Failed to fetch'?'Cloud unreachable — will retry':'Cloud: '+cloudErr.message);
  else if(_auth)msgs.unshift('Cloud backup up to date ✓');
  if(manual||cloudErr||msgs.length)showToast(msgs.join(' · '));
}
function syncBtn(){if(!_auth&&!(S().intervalsKey&&S().intervalsID)){openAuth();return;}syncAll(true);}
function updSyncStatus(){
  const d=S(),n=Object.keys(d.pending).length+d.tomb.length;
  let t,c='--amber';
  if(!_auth)t='On this phone only';
  else if(!navigator.onLine){t=n?`${n} to upload`:'Offline';}
  else if(n)t=`${n} to upload`;
  else if(d.lastSync){c='--green';const m=Math.floor((Date.now()-new Date(d.lastSync))/60000);t=m<2?'Synced now':m<60?`Synced ${m}m ago`:m<1440?`Synced ${Math.round(m/60)}h ago`:'Synced';}
  else{c='--green';t='Cloud backup on';}
  const el=$('hdrStatus');el.textContent=t;el.style.setProperty('--dot',`var(${c})`);
  $('syncBtn').textContent=_syncing?'…':_auth?'SYNC':'SIGN IN';
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
async function pullIntervals(){
  const d=S();
  const oldest=dAgo(90),newest=td(),H={headers:icuHdr(d.intervalsKey)},base=icuBase(d.intervalsID);
  let wr,ar;
  try{[wr,ar]=await Promise.all([fetch(`${base}/wellness?oldest=${oldest}&newest=${newest}`,H),fetch(`${base}/activities?oldest=${oldest}&newest=${newest}`,H)]);}
  catch(e){throw new Error('Intervals.icu unreachable — offline?');}
  if(!wr.ok)throw new Error(icuErr(wr.status));
  let n=0;
  const wl=await wr.json();
  d.wellness={};
  let latest=null;
  for(const w of wl){
    const date=w.id;if(!date)continue;
    d.wellness[date]={steps:w.steps??null,rhr:w.restingHR??null,hrv:w.hrv??null,sleepScore:w.sleepScore??null,sleepMin:w.sleepSecs?Math.round(w.sleepSecs/60):null,resp:typeof w.respiration==='number'&&w.respiration>0?w.respiration:null,ctl:w.ctl??null,atl:w.atl??null};
    if(w.ctl!=null&&w.atl!=null)latest=w;
    const sm=w.sleepSecs?Math.round(w.sleepSecs/60):null,ex=d.sleepLogs.find(s=>s.date===date);
    if((w.sleepScore||sm)&&!ex){put('sleep',{id:'sl-'+date,date,score:w.sleepScore?Math.round(w.sleepScore):null,durMin:sm,deepH:0,deepM:0,remH:0,remM:0,rested:null});n++;}
    else if(ex&&sm&&!ex.durMin){put('sleep',{...ex,durMin:sm});n++;}
    if(w.weight&&!d.measurements.some(m=>m.date===date&&m.weight)){put('meas',{id:'mi-'+date,date,bpSys:null,bpDia:null,weight:Math.round(w.weight*10)/10,hr:w.restingHR||null});n++;}
  }
  if(latest){const ctl=Math.round(latest.ctl),atl=Math.round(latest.atl);d.intervalsData={ctl,atl,tsb:ctl-atl};}
  if(ar.ok){
    const acts=await ar.json();
    for(const a of acts){
      const id='icu-'+a.id,date=(a.start_date_local||'').slice(0,10);
      if(!a.id||!date||d.tomb.some(t=>t.id===id))continue;
      const num=(v,lo,hi)=>typeof v==='number'&&v>=lo&&v<=hi?Math.round(v):null;
      const icu={hr:num(a.average_heartrate,30,230),hrMax:num(a.max_heartrate,30,250),kcal:num(a.calories,1,20000),elev:num(a.total_elevation_gain,1,15000),load:num(a.icu_training_load,1,2000)};
      Object.keys(icu).forEach(k=>{if(icu[k]==null)delete icu[k];});
      const has=Object.keys(icu).length>0,old=d.workouts.find(w=>w.id===id);
      if(old){
        // already imported: fill in or refresh the Intervals.icu details only
        const oi=wIcu(old);
        if(has&&['hr','hrMax','kcal','elev','load'].some(k=>(oi[k]??null)!==(icu[k]??null))){put('workouts',{...old,sub:{...(old.sub||{}),icu}});n++;}
        continue;
      }
      const type=ICU_TYPE[a.type]||'Other',wt=IS_STR(type);
      put('workouts',{id,date,type,distKm:!wt&&a.distance?Math.round(a.distance/100)/10:0,durMin:wt?0:Math.round((a.moving_time||a.elapsed_time||0)/60),rpe:a.icu_rpe?Math.max(1,Math.min(5,Math.round(a.icu_rpe/2))):3,notes:a.name||'',...(has?{sub:{icu}}:{})});n++;
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

