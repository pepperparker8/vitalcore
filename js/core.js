// VitalCore v7 — local-first, syncs to Supabase when signed in.
const SB_URL='https://hixmwtwhxypbqmjdzjtz.supabase.co';
const SB_KEY='sb_publishable_5YtuMNMqdVx38MPixZZzZA_ma2wEe2p'; // publishable key: safe in the client, row-level security protects the data

// ── STATE ────────────────────────────────────────────────────────────────────
const DEFAULTS={
  profile:{name:'',height:170,age:37,sleepGoal:7.5,wtGoal:null,stepGoal:8000,hrGoal:55},
  checkins:[],workouts:[],measurements:[],foodLogs:[],sleepLogs:[],bloodLogs:[],injuries:[],
  intervalsData:{ctl:null,atl:null,tsb:null},wellness:{},
  claudeKey:'',intervalsKey:'',intervalsID:'',
  lastSync:null,onboardingDone:false,signBanOff:false,
  insightLog:[],pending:{},tomb:[],profileTs:0,dupOk:[],gone:[]
};
let _s=JSON.parse(JSON.stringify(DEFAULTS));
let _saveTimer=null;

// tables: local list name -> Supabase table + field map (local -> column)
const TBL={
  checkins:{k:'checkins',t:'checkins',f:{energy:'energy',mood:'mood',stress:'stress',motivation:'motivation',mindfulMin:'mindful_min',gratitude:'gratitude',reflection:'reflection',soreness:'soreness',coffee:'coffee',coffeeLate:'coffee_late'}},
  workouts:{k:'workouts',t:'workouts',f:{type:'type',distKm:'dist_km',durMin:'dur_min',rpe:'rpe',notes:'notes',sets:'sets',sub:'sub'}},
  sleep:{k:'sleepLogs',t:'sleep_logs',f:{score:'score',deepH:'deep_h',deepM:'deep_m',remH:'rem_h',remM:'rem_m',rested:'rested',durMin:'dur_min',bed:'bed',wake:'wake'}},
  meas:{k:'measurements',t:'measurements',f:{bpSys:'bp_sys',bpDia:'bp_dia',weight:'weight',hr:'hr'}},
  blood:{k:'bloodLogs',t:'blood_logs',f:{glucose:'glucose',chol:'chol',uric:'uric',hdl:'hdl',ldl:'ldl'}},
  inj:{k:'injuries',t:'injuries',f:{part:'part',sev:'sev',notes:'notes',active:'active'}},
  // opt: the table was added in v88; sync carries on if the database update has not been run yet
  food:{k:'foodLogs',t:'food_logs',opt:true,f:{kcal:'kcal',protein:'protein'}}
};

async function persistLoad(){
  try{
    const v=localStorage.getItem('vitalcore-data');
    if(v){const p=JSON.parse(v);_s={...JSON.parse(JSON.stringify(DEFAULTS)),...p,intervalsData:{...DEFAULTS.intervalsData,...(p.intervalsData||{})}};migrate();return true;}
  }catch(e){console.log('Storage load:',e.message);}
  return false;
}
function persistSave(){
  if(_saveTimer)clearTimeout(_saveTimer);
  _saveTimer=setTimeout(flushSave,400);
}
function flushSave(){
  const put=()=>localStorage.setItem('vitalcore-data',JSON.stringify(_s));
  try{put();}catch(e){
    console.log('Storage save:',e.message);
    // storage full: older briefings also live in the database, so keep the newest 60 on the phone and retry
    try{if(_s.insightLog&&_s.insightLog.length>60){_s.insightLog=_s.insightLog.slice(0,60);_s.insLean=true;put();}}catch(e2){console.log('Storage save:',e2.message);}
  }
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
const isGone=id=>(S().gone||[]).includes(id)||S().tomb.some(t=>t.id===id);
// sleep score for a night; without one, estimated from time asleep vs the goal (goal = 85)
const slScore=s=>!s?0:s.score||(s.durMin?Math.round(Math.max(30,Math.min(95,s.durMin/((S().profile.sleepGoal||7.5)*60)*85))):0);
// '2026-09-20' -> '20 Sept' (year added when it is not this year)
const fmtD=iso=>{if(!iso)return'';const x=new Date(iso+'T12:00:00');return x.toLocaleDateString('en-GB',x.getFullYear()===new Date().getFullYear()?{day:'numeric',month:'short'}:{day:'numeric',month:'short',year:'numeric'});};
const daysAgo=date=>Math.round((new Date(td()+'T00:00:00')-new Date(date+'T00:00:00'))/864e5);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cssv=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const last=a=>a[a.length-1];
const $=id=>document.getElementById(id);
const ciFull=c=>!!(c&&c.energy&&c.mood&&c.stress&&c.motivation);
const zL=(v,t)=>{
  if(t==='atl')return v>70?'High':v>45?'Moderate':'Low';
  if(t==='sleep')return v>=80?'Excellent':v>=65?'Good':v>=50?'Fair':'Low';
  if(t==='tsb')return v>=5?'Fresh':v>=-10?'Balanced':v>=-25?'Tired':'Very tired';
  return'—';
};
const EM={energy:['','Exhausted','Low','Good','Full'],mood:['','Low','Flat','Good','Great'],stress:['','Calm','Some','Stressed','Very stressed'],motivation:['','None','Low','Good','Fired up'],soreness:['','None','Mild','Moderate','Severe']};
const APP_VER=90; // keep in step with the cache name in sw.js
const CLAUDE_MODEL='claude-sonnet-5-5';
const SPORTS=[['Run','<svg class="sp-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5.5c0 3.11-2 5.66-2 8.68V16a2 2 0 1 1-4 0Z" /><path d="M20 20v-2.38c0-2.12 1.03-3.12 1-5.62-.03-2.72-1.49-6-4.5-6C14.63 6 14 7.8 14 9.5c0 3.11 2 5.66 2 8.68V20a2 2 0 1 0 4 0Z" /><path d="M16 17h4" /><path d="M4 13h4" /></svg>'],['Cycle','<svg class="sp-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="18.5" cy="17.5" r="3.5" /><circle cx="5.5" cy="17.5" r="3.5" /><circle cx="15" cy="5" r="1" /><path d="M12 17.5V14l-3-3 4-3 2 3h2" /></svg>'],['Swim','<svg class="sp-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M19 5a2 2 0 0 0-2 2v11" /><path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" /><path d="M7 13h10" /><path d="M7 9h10" /><path d="M9 5a2 2 0 0 0-2 2v11" /></svg>'],['Weights','<svg class="sp-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17.596 12.768a2 2 0 1 0 2.829-2.829l-1.768-1.767a2 2 0 0 0 2.828-2.829l-2.828-2.828a2 2 0 0 0-2.829 2.828l-1.767-1.768a2 2 0 1 0-2.829 2.829z" /><path d="m2.5 21.5 1.4-1.4" /><path d="m20.1 3.9 1.4-1.4" /><path d="M5.343 21.485a2 2 0 1 0 2.829-2.828l1.767 1.768a2 2 0 1 0 2.829-2.829l-6.364-6.364a2 2 0 1 0-2.829 2.829l1.768 1.767a2 2 0 0 0-2.828 2.829z" /><path d="m9.6 14.4 4.8-4.8" /></svg>'],['Calisthenics','<svg class="sp-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="1" /><path d="m9 20 3-6 3 6" /><path d="m6 8 6 2 6-2" /><path d="M12 10v4" /></svg>'],['Hike','<svg class="sp-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m8 3 4 8 5-5 5 15H2L8 3z" /></svg>'],['Walk','<svg class="sp-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="19" r="3" /><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15" /><circle cx="18" cy="5" r="3" /></svg>'],['Yoga','<svg class="sp-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5a3 3 0 1 1 3 3m-3-3a3 3 0 1 0-3 3m3-3v1M9 8a3 3 0 1 0 3 3M9 8h1m5 0a3 3 0 1 1-3 3m3-3h-1m-2 3v-1" /><circle cx="12" cy="8" r="2" /><path d="M12 10v12" /><path d="M12 22c4.2 0 7-1.667 7-5-4.2 0-7 1.667-7 5Z" /><path d="M12 22c-4.2 0-7-1.667-7-5 4.2 0 7 1.667 7 5Z" /></svg>'],['Other','<svg class="sp-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15.914 4a1.5 1.5 0 00-2.474-1.561l-9 9A1.5 1.5 0 005.5 14h4.002a.5.5 0 01.471.666L8.086 20a1.5 1.5 0 002.475 1.56l9-9A1.5 1.5 0 0018.5 10h-3.997a.5.5 0 01-.472-.667z" /></svg>']];
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
  // saving again cancels an earlier delete of the same record
  d.tomb=d.tomb.filter(t=>!(t.n===n&&t.id===rec.id));
  save(d);queuePush();updSyncStatus();
}
function del(n,id){
  const d=S();
  d[TBL[n].k]=d[TBL[n].k].filter(r=>r.id!==id);
  delete d.pending[n+'|'+id];
  d.tomb.push({n,id});
  // imported records (Intervals.icu) stay deleted: remembered on this phone after the tombstone is sent
  if(/^(icu-|sl-|mi-)/.test(String(id)))d.gone=[...(d.gone||[]).filter(x=>x!==id),id].slice(-400);
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


const UI={sun:`<svg class="ui-i" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" /></svg>`,moon:`<svg class="ui-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401" /></svg>`,cloud:`<svg class="ui-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" /></svg>`,flame:`<svg class="ui-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4" /></svg>`,spark:`<svg class="ui-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z" /><path d="M20 2v4" /><path d="M22 4h-4" /><circle cx="4" cy="20" r="2" /></svg>`,ruler:`<svg class="ui-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z" /><path d="m14.5 12.5 2-2" /><path d="m11.5 9.5 2-2" /><path d="m8.5 6.5 2-2" /><path d="m17.5 15.5 2-2" /></svg>`,dna:`<svg class="ui-i" viewBox="0 0 24 24" aria-hidden="true"><path d="m10 16 1.5 1.5" /><path d="m14 8-1.5-1.5" /><path d="M15 2c-1.798 1.998-2.518 3.995-2.807 5.993" /><path d="m16.5 10.5 1 1" /><path d="m17 6-2.891-2.891" /><path d="M2 15c6.667-6 13.333 0 20-6" /><path d="m20 9 .891.891" /><path d="M3.109 14.109 4 15" /><path d="m6.5 12.5 1 1" /><path d="m7 18 2.891 2.891" /><path d="M9 22c1.798-1.998 2.518-3.995 2.807-5.993" /></svg>`,bandage:`<svg class="ui-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M10 10.01h.01" /><path d="M10 14.01h.01" /><path d="M14 10.01h.01" /><path d="M14 14.01h.01" /><path d="M18 6v12" /><path d="M6 6v12" /><rect x="2" y="6" width="20" height="12" rx="2" /></svg>`,trophy:`<svg class="ui-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M10 14.66V17a1 1 0 0 1-1 1 2 2 0 0 0-2 2v2" /><path d="M14 14.66V17a1 1 0 0 0 1 1 2 2 0 0 1 2 2v2" /><path d="M17.916 10H19.5A2.5 2.5 0 0 0 22 7.5V5a1 1 0 0 0-1-1h-3" /><path d="M4 22h16" /><path d="M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z" /><path d="M6.084 10H4.5A2.5 2.5 0 0 1 2 7.5V5a1 1 0 0 1 1-1h3" /></svg>`,warn:`<svg class="ui-i" viewBox="0 0 24 24" aria-hidden="true"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>`,run:`<svg class="ui-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5.5c0 3.11-2 5.66-2 8.68V16a2 2 0 1 1-4 0Z" /><path d="M20 20v-2.38c0-2.12 1.03-3.12 1-5.62-.03-2.72-1.49-6-4.5-6C14.63 6 14 7.8 14 9.5c0 3.11 2 5.66 2 8.68V20a2 2 0 1 0 4 0Z" /><path d="M16 17h4" /><path d="M4 13h4" /></svg>`,bolt:`<svg class="ui-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M15.914 4a1.5 1.5 0 00-2.474-1.561l-9 9A1.5 1.5 0 005.5 14h4.002a.5.5 0 01.471.666L8.086 20a1.5 1.5 0 002.475 1.56l9-9A1.5 1.5 0 0018.5 10h-3.997a.5.5 0 01-.472-.667z" /></svg>`,chat:`<svg class="ui-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z" /></svg>`,lotus:`<svg class="ui-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M12.8 19.6A2 2 0 1 0 14 16H2" /><path d="M17.5 8a2.5 2.5 0 1 1 2 4H2" /><path d="M9.8 4.4A2 2 0 1 1 11 8H2" /></svg>`,weight:`<svg class="ui-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M17.596 12.768a2 2 0 1 0 2.829-2.829l-1.768-1.767a2 2 0 0 0 2.828-2.829l-2.828-2.828a2 2 0 0 0-2.829 2.828l-1.767-1.768a2 2 0 1 0-2.829 2.829z" /><path d="m2.5 21.5 1.4-1.4" /><path d="m20.1 3.9 1.4-1.4" /><path d="M5.343 21.485a2 2 0 1 0 2.829-2.828l1.767 1.768a2 2 0 1 0 2.829-2.829l-6.364-6.364a2 2 0 1 0-2.829 2.829l1.768 1.767a2 2 0 0 0-2.828 2.829z" /><path d="m9.6 14.4 4.8-4.8" /></svg>`,hold:`<svg class="ui-i" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="5" r="1" /><path d="m9 20 3-6 3 6" /><path d="m6 8 6 2 6-2" /><path d="M12 10v4" /></svg>`,sat:`<svg class="ui-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 12a6 6 0 00-6-6" /><path d="M2.824 10.459a8 8 0 0010.717 10.717c.558-.276.623-1.012.183-1.452l-9.448-9.448c-.44-.44-1.176-.375-1.452.183" /><path d="M22 12A10 10 0 0012 2" /><path d="m9 15 4-4" /></svg>`,check:`<svg class="ui-i" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="m16 9-5.5 5.5L8 12" /></svg>`,x:`<svg class="ui-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>`,chev:`<svg class="ui-i" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>`};
