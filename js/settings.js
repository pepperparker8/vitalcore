// ── SETTINGS / BACKUP ────────────────────────────────────────────────────────
function setTheme(v){try{localStorage.setItem('vc-theme',v);}catch(e){}if(v==='auto')document.documentElement.removeAttribute('data-theme');else document.documentElement.setAttribute('data-theme',v);refreshActive();if(typeof chRedrawAll==='function')chRedrawAll();}
function themeVal(){try{return localStorage.getItem('vc-theme')||'light';}catch(e){return'light';}}
function openSettings(){$('appVer').textContent='Version '+APP_VER+(typeof _boot==='object'&&_boot.first?` · opened in ${(_boot.first/1e3).toFixed(1)} s`:'');$('sTheme').value=themeVal();$('setModal').classList.add('open');loadSetUI();}
function closeSettings(){$('setModal').classList.remove('open');}
function loadSetUI(){
  const d=S();
  $('sName').value=d.profile.name||'';$('sHeight').value=d.profile.height||'';$('sAge').value=d.profile.age||'';
  $('sSlpH').value=Math.floor(d.profile.sleepGoal)||7;$('sSlpM').value=Math.round(((d.profile.sleepGoal||7.5)%1)*60)||0;
  $('sWt').value=d.profile.wtGoal||'';$('sNut').value=fuGoal();$('sSex').value=d.profile.sex||'';$('sHR').value=d.profile.hrGoal||'';$('sGoalName').value=d.profile.goalName||'';$('sGoalDate').value=d.profile.goalDate||'';
  $('sClaudeKey').value=d.claudeKey||'';$('sInterKey').value=d.intervalsKey||'';$('sInterID').value=d.intervalsID||'';$('sPolarKey').value=d.polarKey||'';
  $('claudeTestRes').textContent='';$('icuTestRes').textContent='';$('polTestRes').textContent='';$('polNote').textContent=polarNote();bpUserUI();renderConn();
  const n=Object.keys(d.pending).length;
  if(_auth){
    $('accBox').innerHTML=`<b>Signed in as ${esc(_auth.user.email||'your account')}</b>${n?`${n} change${n>1?'s':''} waiting to upload.`:'Everything is backed up online.'} Only people you invite can sign in, and each person sees only their own data.`;
    $('accBtn').textContent='Sign out';$('accBtn').onclick=signOut;$('accBtn').className='btn-out';$('accBtn').style.marginTop='0';
  }else{
    $('accBox').innerHTML=`<b>Saved on this phone only</b>Sign in and your data is backed up online, so you never lose it.`;
    $('accBtn').textContent='Sign in';$('accBtn').onclick=openAuth;$('accBtn').className='btn-gold';$('accBtn').style.marginTop='0';
  }
}
function saveSettings(){
  const d=S();
  d.profile.name=$('sName').value.trim();
  d.profile.height=+$('sHeight').value||170;d.profile.age=+$('sAge').value||37;
  d.profile.sleepGoal=(+$('sSlpH').value||7)+(+$('sSlpM').value||0)/60;
  d.profile.wtGoal=+$('sWt').value||null;d.profile.nutGoal=$('sNut').value;d.profile.sex=$('sSex').value;d.profile.hrGoal=+$('sHR').value||55;
  d.profile.goalName=$('sGoalName').value.trim();d.profile.goalDate=$('sGoalDate').value;
  const icuChanged=d.intervalsKey!==$('sInterKey').value.trim()||d.intervalsID!==$('sInterID').value.trim(),polChanged=(d.polarKey||'')!==$('sPolarKey').value.trim();
  d.claudeKey=$('sClaudeKey').value.trim();d.intervalsKey=$('sInterKey').value.trim();d.intervalsID=$('sInterID').value.trim();d.polarKey=$('sPolarKey').value.trim();
  save(d);markProfile();closeSettings();refreshAll();showToast('Settings saved');
  if((icuChanged&&d.intervalsKey&&d.intervalsID)||(polChanged&&d.polarKey))syncAll(true);
}
function download(name,type,text){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;document.body.appendChild(a);a.click();a.remove();}
function backupJSON(){
  const d={...S()};delete d.claudeKey;delete d.intervalsKey;delete d.intervalsID;delete d.polarKey;delete d.pending;delete d.tomb;delete d.icuSent;delete d.dataUid;delete d.napBack;delete d.napBackV;delete d.bpUser;delete d.bpOk;delete d.scUid;delete d.scOk;delete d.bpDev;delete d.scDev;delete d.connLog;delete d.profSnap;
  download(`vitalcore-backup-${td()}.json`,'application/json',JSON.stringify(d));
  showToast('Backup downloaded');
}
function restoreBackup(inp){
  const f=inp.files[0];inp.value='';if(!f)return;
  const rd=new FileReader();
  rd.onload=()=>{
    try{
      const b=JSON.parse(rd.result);
      if(!Array.isArray(b.checkins)||!Array.isArray(b.workouts))throw new Error('bad');
      if(!confirm('Replace the data on this phone with this backup?'))return;
      const d=S();
      const keep={claudeKey:d.claudeKey,intervalsKey:d.intervalsKey,intervalsID:d.intervalsID||b.intervalsID||'',polarKey:d.polarKey,icuSent:d.icuSent,dataUid:d.dataUid,bpUser:d.bpUser,bpOk:d.bpOk,scUid:d.scUid,scOk:d.scOk,bpDev:d.bpDev,scDev:d.scDev,connLog:d.connLog};
      const safe={};for(const k of Object.keys(DEFAULTS))if(k in b)safe[k]=b[k];
      _s={...JSON.parse(JSON.stringify(DEFAULTS)),...safe,...keep,pending:{},tomb:[],onboardingDone:true};
      migrate();
      for(const [n,T] of Object.entries(TBL))_s[T.k].forEach(r=>{_s.pending[n+'|'+r.id]=r.ts||Date.now();});
      _s.insightLog.forEach(e=>{_s.pending['insight|'+e.date]=e.ts;});
      _s.pending['profile|1']=Date.now();_s.profileTs=Date.now();_s.profSnap=null;   // v148: the restored profile wins its first merge
      save(_s);queuePush();closeSettings();initUI();showToast('Backup restored ✓');
    }catch(e){showToast('That file is not a VitalCore backup');}
  };
  rd.readAsText(f);
}
function exportCSV(){
  const d=S(),q=v=>{let t=String(v??'');if(/^[=+\-@\t\r]/.test(t))t="'"+t;return `"${t.replace(/"/g,'""')}"`;};let csv='Date,Type,Value,Detail\n';
  d.checkins.forEach(c=>{csv+=`${c.date},Check-in,${c.mood??''},energy ${c.energy??''} / stress ${c.stress??''} / motivation ${c.motivation??''} / mindful ${c.mindfulMin||0} min ${q(c.gratitude)}\n`;});
  d.workouts.forEach(w=>csv+=`${w.date},Workout,${q(w.type)},${w.durMin||0} min ${w.distKm||0} km RPE ${w.rpe||''} ${q(w.notes)} ${q(w.sets?setsText(w):'')} ${q(fmtIcu(w))}\n`);
  d.sleepLogs.forEach(s=>csv+=`${s.date},Sleep score,${s.score??''},\n`);
  d.measurements.forEach(m=>csv+=`${m.date},Measurement,${m.weight??''},BP ${m.bpSys??''}/${m.bpDia??''} HR ${m.hr??''}\n`);
  d.bloodLogs.forEach(b=>csv+=`${b.date},Blood mg/dL,,glucose ${b.glucose??''} chol ${b.chol??''} uric ${b.uric??''}\n`);
  d.injuries.forEach(i=>csv+=`${i.date},Injury,${q(i.part)},severity ${i.sev}\n`);
  download('vitalcore-export.csv','text/csv',csv);showToast('CSV exported');
}


// ── CONNECTIONS AND CLOUD (v146) ─────────────────────────────────────────────
// when each source last pulled, a failure newer than that, and (on a tap) which cloud tables and columns exist
function connAgo(ms){
  const m=Math.round((Date.now()-ms)/60000);
  if(m<1)return'just now';if(m<60)return`${m} min ago`;
  const h=Math.round(m/60);if(h<24)return`${h} h ago`;
  const t=new Date(ms);return`${fmtD(t.toISOString().slice(0,10))}, ${String(t.getHours()).padStart(2,'0')}:${String(t.getMinutes()).padStart(2,'0')}`;
}
function connRows(){
  const d=S(),L=d.connLog||{},ls=d.lastSync?Date.parse(d.lastSync):0,n=Object.keys(d.pending||{}).length;
  const src=(k,lbl,on,off,old)=>{
    if(!on)return{k,lbl,st:'off',v:'Not set up',n:off};
    const c=L[k]||{},ok=c.ok||old||0,bad=c.at&&c.at>ok;
    if(bad)return{k,lbl,st:'bad',v:'Failed '+connAgo(c.at),n:c.err+(ok?` Last worked ${connAgo(ok)}.`:'')};
    if(!ok)return{k,lbl,st:'off',v:'Not pulled yet',n:'Pulls on the next sync.'};
    return{k,lbl,st:Date.now()-ok>TH.CONN_STALE_H*3600000?'warn':'ok',v:connAgo(ok),n:''};
  };
  const pk=!!d.polarKey,icu=!!(d.intervalsKey&&d.intervalsID);
  const cloud=src('cloud','Cloud backup',!!_auth,'Sign in to back up online.',ls);
  if(_auth&&n&&cloud.st!=='bad')cloud.n=`${n} change${n>1?'s':''} waiting to upload.`;
  return[cloud,
    src('icu','Intervals.icu',icu,'Add the athlete ID and API key above.'),
    src('polar','Polar nights',pk,'Add the Polar app key above.',d.polarAt),
    src('pday','Polar day',pk,'Add the Polar app key above.',d.polarDayAt),
    {k:'claude',lbl:'Claude key',st:d.claudeKey?'ok':'off',v:d.claudeKey?'Set':'Not set',n:d.claudeKey?'':'Needed for the AI briefing only.'}];
}
const CN_MARK={ok:'●',warn:'●',bad:'▲',off:'○'};
function renderConn(){
  const box=$('connBox');if(!box)return;
  box.innerHTML=connRows().map(r=>`<div class="cn-r cn-${r.st}" id="cn_${r.k}"><span class="cn-l">${esc(r.lbl)}</span><span class="cn-v"><i aria-hidden="true">${CN_MARK[r.st]}</i>${esc(r.v)}</span>${r.n?`<span class="cn-n">${esc(r.n)}</span>`:''}</div>`).join('');
  const p=(S().connLog||{}).probe;$('connChk').hidden=!_auth;
  $('connTbl').innerHTML=!_auth?'':!p?'':connTblHTML(p);
}
function connTblHTML(p){
  const miss=p.res.filter(x=>!x.ok),sql=[...new Set(miss.flatMap(x=>x.sql||[]))].sort((a,b)=>parseInt(a.split('-v')[1])-parseInt(b.split('-v')[1]));
  const row=x=>{
    const w=x.ok?'Ready':x.none?'Missing':x.miss?'Missing '+x.miss.join(', '):'Could not check';
    const fix=x.ok?'':x.err?x.err:(x.sql&&x.sql.length)?'Run '+x.sql.join(' and '):'Run the first database setup';
    return`<div class="cn-r cn-${x.ok?'ok':x.err?'warn':'bad'}" data-t="${esc(x.t)}"><span class="cn-l">${x.t==='key'?'Row key per person':esc(x.t)}</span><span class="cn-v"><i aria-hidden="true">${x.ok?'✓':'▲'}</i>${esc(w)}</span>${fix?`<span class="cn-n">${esc(fix)}</span>`:''}</div>`;
  };
  const head=miss.length?`${miss.length} to fix. In Supabase, open the SQL editor and run ${sql.length?sql.join(', '):'the first database setup'}, oldest first.`:'Every table and column the app writes is there.';
  return`<div class="cn-h">${esc(head)} Checked ${esc(connAgo(p.at))}.</div>`+p.res.map(row).join('');
}
async function connCheck(){
  if(!_auth||!navigator.onLine){showToast(!_auth?'Sign in first':'Needs a connection');return;}
  const b=$('connChk');b.disabled=true;b.textContent='Checking…';
  try{const res=await connProbe(),d=S();(d.connLog=d.connLog||{}).probe={at:Date.now(),res};save(d);connMark('cloud');}
  catch(e){connMark('cloud',e);showToast('Could not check: '+((e&&e.message)||e));}
  b.disabled=false;b.textContent='Check the cloud tables';renderConn();
}
