// VitalCore v7 — local-first, syncs to Supabase when signed in.
const SB_URL='https://hixmwtwhxypbqmjdzjtz.supabase.co';
const SB_KEY='sb_publishable_5YtuMNMqdVx38MPixZZzZA_ma2wEe2p'; // publishable key: safe in the client, row-level security protects the data

// ── STATE ────────────────────────────────────────────────────────────────────
const DEFAULTS={
  profile:{name:'',height:170,age:37,sleepGoal:7.5,wtGoal:72,stepGoal:8000,hrGoal:55},
  checkins:[],workouts:[],measurements:[],sleepLogs:[],bloodLogs:[],injuries:[],
  intervalsData:{ctl:null,atl:null,tsb:null},wellness:{},
  claudeKey:'',intervalsKey:'',intervalsID:'',
  lastSync:null,onboardingDone:false,signBanOff:false,
  insightLog:[],pending:{},tomb:[],profileTs:0
};
let _s=JSON.parse(JSON.stringify(DEFAULTS));
let _saveTimer=null;

// tables: local list name -> Supabase table + field map (local -> column)
const TBL={
  checkins:{k:'checkins',t:'checkins',f:{energy:'energy',mood:'mood',stress:'stress',motivation:'motivation',mindfulMin:'mindful_min',gratitude:'gratitude'}},
  workouts:{k:'workouts',t:'workouts',f:{type:'type',distKm:'dist_km',durMin:'dur_min',rpe:'rpe',notes:'notes',sets:'sets',sub:'sub'}},
  sleep:{k:'sleepLogs',t:'sleep_logs',f:{score:'score',deepH:'deep_h',deepM:'deep_m',remH:'rem_h',remM:'rem_m',rested:'rested'}},
  meas:{k:'measurements',t:'measurements',f:{bpSys:'bp_sys',bpDia:'bp_dia',weight:'weight',hr:'hr'}},
  blood:{k:'bloodLogs',t:'blood_logs',f:{glucose:'glucose',chol:'chol',uric:'uric',hdl:'hdl',ldl:'ldl'}},
  inj:{k:'injuries',t:'injuries',f:{part:'part',sev:'sev',notes:'notes',active:'active'}}
};

async function persistLoad(){
  try{
    const v=localStorage.getItem('vitalcore-data');
    if(v){_s={...JSON.parse(JSON.stringify(DEFAULTS)),...JSON.parse(v)};migrate();return true;}
  }catch(e){console.log('Storage load:',e.message);}
  return false;
}
function persistSave(){
  if(_saveTimer)clearTimeout(_saveTimer);
  _saveTimer=setTimeout(flushSave,400);
}
function flushSave(){
  try{localStorage.setItem('vitalcore-data',JSON.stringify(_s));}catch(e){console.log('Storage save:',e.message);}
}
window.addEventListener('pagehide',flushSave);
document.addEventListener('visibilitychange',()=>{if(document.hidden)flushSave();});

const S=()=>_s;
function save(d){_s=d;persistSave();}

// ── HELPERS ──────────────────────────────────────────────────────────────────
const fmtDur=m=>{if(!m)return'—';const h=Math.floor(m/60),r=m%60;return h>0?(r?`${h}h ${r}min`:`${h}h`):`${r}min`;};
const fmtHM=(h,m)=>h>0?(m?`${h}h ${m}min`:`${h}h`):(m?`${m}min`:'—');
const ymd=dt=>`${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
const td=()=>ymd(new Date());
const dAgo=n=>{const x=new Date();x.setDate(x.getDate()-n);return ymd(x);};
const daysAgo=date=>Math.round((new Date(td()+'T00:00:00')-new Date(date+'T00:00:00'))/864e5);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const last=a=>a[a.length-1];
const $=id=>document.getElementById(id);
const ciFull=c=>!!(c&&c.energy&&c.mood&&c.stress&&c.motivation);
const zL=(v,t)=>{
  if(t==='atl')return v>70?'High':v>45?'Moderate':'Low';
  if(t==='sleep')return v>=80?'Excellent':v>=65?'Good':v>=50?'Fair':'Low';
  if(t==='tsb')return v>10?'Fresh':v>0?'Neutral':v>-15?'Fatigued':'Tired';
  return'—';
};
const EM={energy:['','😴','😐','⚡','🚀'],mood:['','😔','😐','😊','😄'],stress:['','😌','😐','😬','😰'],motivation:['','😩','😐','💪','🔥']};
const SPORTS=[['Run','🏃'],['Cycle','🚴'],['Swim','🏊'],['Weights','🏋️'],['Calisthenics','🤸'],['Hike','🥾'],['Walk','🚶'],['Yoga','🧘'],['Other','⚡']];
const ICON=Object.fromEntries(SPORTS);
const HAS_DIST=['Run','Cycle','Hike','Walk'];
const IS_STR=t=>t==='Weights'||t==='Calisthenics';
const mkId=()=>'x'+Date.now().toString(36)+Math.random().toString(36).slice(2,7);

// ── RECORD STORE (every change is queued for the cloud) ──────────────────────
function put(n,rec){
  const d=S(),arr=d[TBL[n].k];
  rec.ts=Date.now();
  const i=arr.findIndex(r=>r.id===rec.id);
  if(i>=0)arr[i]=rec;else arr.push(rec);
  arr.sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:(a.ts||0)-(b.ts||0));
  d.pending[n+'|'+rec.id]=rec.ts;
  save(d);queuePush();updSyncStatus();
}
function del(n,id){
  const d=S();
  d[TBL[n].k]=d[TBL[n].k].filter(r=>r.id!==id);
  delete d.pending[n+'|'+id];
  d.tomb.push({n,id});
  save(d);queuePush();updSyncStatus();
}
function markProfile(){const d=S();d.profileTs=Date.now();d.pending['profile|1']=d.profileTs;save(d);queuePush();}
function migrate(){
  const d=_s;
  for(const [n,T] of Object.entries(TBL)){
    d[T.k]=(d[T.k]||[]).filter(r=>!r.isEx);      // example data from older versions
    d[T.k].forEach(r=>{
      if(!r.id){r.id=n==='checkins'?'ci-'+r.date:n==='sleep'?'sl-'+r.date:mkId();r.ts=Date.now();d.pending[n+'|'+r.id]=r.ts;}
    });
  }
  d.insightLog.forEach(e=>{if(!e.ts)e.ts=Date.now();});
  delete d.streak;delete d.exDismissed;delete d.hasRealData;delete d.lastInsight;
}

