// VitalCore v7 — local-first, syncs to Supabase when signed in.
const SB_URL='https://hixmwtwhxypbqmjdzjtz.supabase.co';
const SB_KEY='sb_publishable_5YtuMNMqdVx38MPixZZzZA_ma2wEe2p'; // publishable key: safe in the client, row-level security protects the data

// ── STATE ────────────────────────────────────────────────────────────────────
const DEFAULTS={
  profile:{name:'',height:170,age:37,sleepGoal:7.5,wtGoal:null,stepGoal:8000,hrGoal:55},
  checkins:[],workouts:[],measurements:[],foodLogs:[],sleepLogs:[],bloodLogs:[],injuries:[],polarNights:[],polarDays:[],
  intervalsData:{ctl:null,atl:null,tsb:null},wellness:{},
  claudeKey:'',intervalsKey:'',intervalsID:'',polarKey:'',
  lastSync:null,onboardingDone:false,signBanOff:false,
  insightLog:[],pending:{},tomb:[],profileTs:0,dupOk:[],gone:[],dataUid:''   // dataUid: the account this phone's data belongs to (v124, local only)
};
let _s=JSON.parse(JSON.stringify(DEFAULTS));
let _saveTimer=null;

// tables: local list name -> Supabase table + field map (local -> column)
const TBL={
  checkins:{k:'checkins',t:'checkins',f:{energy:'energy',mood:'mood',stress:'stress',motivation:'motivation',mindfulMin:'mindful_min',gratitude:'gratitude',reflection:'reflection',soreness:'soreness',coffee:'coffee',coffeeLate:'coffee_late',symptoms:'symptoms',soreArea:'sore_area',bodyFeel:'body_feel'}},
  workouts:{k:'workouts',t:'workouts',f:{type:'type',distKm:'dist_km',durMin:'dur_min',rpe:'rpe',notes:'notes',sets:'sets',sub:'sub'}},
  sleep:{k:'sleepLogs',t:'sleep_logs',f:{score:'score',deepH:'deep_h',deepM:'deep_m',remH:'rem_h',remM:'rem_m',rested:'rested',durMin:'dur_min',bed:'bed',wake:'wake'}},
  meas:{k:'measurements',t:'measurements',f:{bpSys:'bp_sys',bpDia:'bp_dia',weight:'weight',hr:'hr'}},
  blood:{k:'bloodLogs',t:'blood_logs',f:{glucose:'glucose',chol:'chol',uric:'uric',hdl:'hdl',ldl:'ldl'}},
  inj:{k:'injuries',t:'injuries',f:{part:'part',sev:'sev',notes:'notes',active:'active'}},
  // opt: the table was added in v88; sync carries on if the database update has not been run yet
  food:{k:'foodLogs',t:'food_logs',opt:true,f:{kcal:'kcal',protein:'protein',meals:'meals'}},
  // polar (v116): one row per night from Polar, the compact night in `data` (jsonb); lim = how many newest nights are pulled and kept
  // trim (v127): the part of a night kept as sleep {s, e seconds from the night's start, by 'auto'|'you'|'off'}; data stays as Polar sent it
  polar:{k:'polarNights',t:'polar_nights',opt:true,lim:120,f:{data:'data',trim:'trim'}},
  // pday (v127): one row per day from Polar, the compact day (steps, active time, calories, sitting, 24/7 heart rate) in `data`
  pday:{k:'polarDays',t:'polar_days',opt:true,lim:60,f:{data:'data'}}
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
    // storage full: older briefings and Polar nights also live in the database, so keep the newest on the phone and retry
    const trims=[()=>{if(_s.insightLog&&_s.insightLog.length>60){_s.insightLog=_s.insightLog.slice(0,60);_s.insLean=true;return true;}},
      ()=>{if(_s.polarNights&&_s.polarNights.length>30){_s.polarNights=_s.polarNights.slice(-30);return true;}},
      ()=>{if(_s.polarDays&&_s.polarDays.length>14){_s.polarDays=_s.polarDays.slice(-14);return true;}}];
    for(const t of trims){if(!t())continue;try{put();return;}catch(e2){console.log('Storage save:',e2.message);}}
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
// v127: a night the band's battery cut short counts as missing, not as a short night, until you add your own wake-up time
// (a wake-up still the band's, from this phone or from the cloud copy, does not count)
function slCounts(r){
  const n=r&&typeof polarOn==='function'?polarOn(r.date):null;if(!n||!n.data||!n.data.batt)return true;
  const sv=polarSleepVals(n),w=r.src&&r.src.wake;
  return!!(r.wake&&!IMP_SRC.includes(w)&&w!=='est'&&!(sv&&sv.wake===r.wake));
}
const slScore=s=>!s?0:s.score||(s.durMin?Math.round(Math.max(30,Math.min(95,s.durMin/((S().profile.sleepGoal||7.5)*60)*85))):0);
// '2026-09-20' -> '20 Sept' (year added when it is not this year)
const fmtD=iso=>{if(!iso)return'';const x=new Date(iso+'T12:00:00');return x.toLocaleDateString('en-GB',x.getFullYear()===new Date().getFullYear()?{day:'numeric',month:'short'}:{day:'numeric',month:'short',year:'numeric'});};
const daysAgo=date=>Math.round((new Date(td()+'T00:00:00')-new Date(date+'T00:00:00'))/864e5);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cssv=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const last=a=>a[a.length-1];
const $=id=>document.getElementById(id);
const ciFull=c=>!!(c&&c.energy&&c.mood&&c.stress&&c.motivation);
// One set of thresholds (Spec v2, A1): every score band, verdict cut and note reads from here, never an inline number.
const TH={
  BODY_GREEN:67,BODY_YELLOW:34,          // Body score: green 67+, yellow 34 to 66, red under 34
  FORM_FRESH:5,FORM_OK:-10,FORM_TIRED:-20,FORM_DEEP:-30, // form (TSB): fresh from +5, balanced to -10, tired to -20, very tired to -30, overreached below
  RAMP_CAUTION:1.25,RAMP_HIGH:1.5,       // this week's minutes against the 4-week mean
  BURNOUT_HIGH:60,                       // 7-day psychological burnout risk, 0 to 100
  MIN_BASE_DAYS:14,                      // days of a metric before its baseline is trusted
  CORR_MIN_N:14,                         // paired days before a correlation is reported
  HRV_FLOOR:3,RHR_FLOOR:1.5,             // smallest band SD used (ms, bpm), so a flat month does not blow up z
  HRV_SE:Math.sqrt(7),                   // HRV z is for a 7-day mean, so the band SD is divided by this (one knob, tune after 8 weeks)
  HRV_MIN_7:4,                           // nights with HRV needed inside the last 7 before the 7-day mean counts
  Z_GAIN:20,                             // Body points per z unit: 50 ± 20 z
  W_HRV:45,W_RHR:20,W_SLEEP:35,          // Body weights, re-weighted when a part is missing
  SLEEP_FLOOR:0.6,SOLIDITY_W:0.3,        // time asleep at 60 % of need scores 0; Polar solidity share of the sleep part
  MIND_GOOD:70,MIND_FLAT:50,             // today's check-in on 0 to 100 (energy, mood, calm, motivation): Good from 70, Flat from 50, Strained below
  BURNOUT_MOD:30,                        // burnout risk: low under 30, moderate to 59, high from BURNOUT_HIGH
  ILL_RESP:1.0,ILL_RHR_Z:1.5,ILL_HRV_Z:-1.5, // illness gate: breathing above band mean by this, with resting HR z or 7-day HRV z past these
  PARALLEL_DAYS:14,                      // days the old readiness score runs alongside Body before the gauge switches
  SCORE_DROP:10,                         // a fall of this many points within 3 days is called out under the score chart (note only)
  WT_RATE:0.01,                        // weight change per week, as a share of body weight, above which the weight chart says it is fast (note only)
  SETS_LO:10,SETS_HI:20,                 // hard sets per muscle per week: under 10 low, 10 to 20 on target, over 20 high
  OLD_BAD:45,OLD_WARN:65,OLD_MOD:50,OLD_HIGH:80, // the old readiness cuts (verdict bad / warn, zone moderate / primed); retired after the parallel run
  // v121 training sessions (js/sessions.js, js/strategy.js)
  SESS_THR:0.10,SESS_INT:0.08,SESS_REP:0.05, // weekly share of training minutes at steady-hard, hard, and short fast reps (strides, hills)
  LONG_GROW:1.10,LONG_SHARE:0.30,LONG_RUN_MAX:150, // long session: at most 10 % over the longest of the last 30 days; a long run also at most 30 % of the week and 150 min
  WK_UP:1.10,WK_UP2:1.30,                // weekly minutes: at most +10 % on last week and +30 % on two weeks ago
  LV_UP_N:2,LV_DN_N:2,                   // sessions done at or under the target effort before a level goes up; over it before it goes down
  LV_UP_GAP_D:7,LV_LOW_D:3,LV_SEED_HARD:2, // one level up per family per 7 days; none after a low score in the 3 days before; hard sessions in 42 days that seed level 3
  GAP_RESUME:7,GAP_SHORT:14,GAP_MID:28,  // days without training: over 7 starts a comeback; up to 14 short, up to 28 middle, longer long
  RET_LOWER_D:56,RET_STAGE_D:7,          // a lower-body injury healed within 56 days runs the return ladder; each later stage lasts 7 days
  PAIN_OK:3,PAIN_BACK:5,PAIN_STOP:7,     // pain 0 to 10 during a return: 3 or less moves on, 5 or more steps back, 7 or more stop and get it checked
  PM_RIDES:2,THR_RUN_K:0.88,THR_RIDE_K:0.86,HRMAX_PCT:0.98,HRMAX_N:5, // power meter = 2 rides in 42 days; threshold HR estimate = share of max HR (98th percentile of 5+ workouts)
  PLAN_HIST_N:42,SEND_DAYS:1,STR_NOHEAVY_D:10, // days of plan kept; days ahead that can be sent to the watch; no heavy strength this close to a race
  // v122 reading a workout (js/workout.js) and recovery in the outline
  WALK_TR_MIN:60,WALK_TR_STEADY:10,      // a walk counts as training at 60+ min, or with 10+ min steady or harder
  RET_BASE_MIN:60,RET_BASE_WKS:2,        // a comeback needs a usual week of 60+ min from 2+ weeks with training before the break
  ZN_STEADY:0.89,ZN_HARD:0.94,LT_FROM_MAX:0.87, // a heart rate zone whose middle sits at 89 % of threshold heart rate is steady, at 94 % hard; threshold = 87 % of max when unknown
  HARD_MIN:10,HARD_SUM:30,MOD_SUM:10,    // hard session: 10+ min hard, or 30+ min steady and hard together; moderate: 10+ min steady and hard
  BIG_MIN:30,BIG_DUR:90,                 // very hard: 30+ min hard, or hard and 90+ min long
  REC_HARD_D:2,REC_BIG_D:3,              // days until hard training fits again after a hard / very hard session (1 after anything else)
  DRIFT_OK:5,DRIFT_HIGH:10,DRIFT_MIN:30, // heart rate drift (%): under 5 well paced, 10+ high; only for sessions of 30+ min
  WK_PTS:600,                            // points kept from a workout's trace for its chart
  CLIMB_DIP:5,CLIMB_MIN:20,              // a climb may dip 5 m and go on; climbs under 20 m are not mentioned
  SIM_N:5,SIM_DUR:0.25,HR_NEAR:3,HRR_NEAR:5, // workout sheet: compared with your last 5 sessions of the same kind within 25 % of its length; within 3 bpm (average) or 5 beats (recovery) reads "about the same"
  MIX_EASY:0.8,MIX_HARD:0.25,MIX_SH:0.5, // workout sheet words: "mostly easy" at 80 % easy, "plenty of hard work" at 25 % hard, "mostly steady to hard" at 50 % steady and hard
  // v127 the band's day, the night cut, daily activity in strain, your own bounce-back days
  DAY_HR_DT:300,                         // 24/7 heart rate kept at one value per 5 minutes (seconds)
  TRIM_GAP:30,TRIM_LONG:90,TRIM_N:7,     // a band-off stretch at the edge of a night of 30+ min; a night 90+ min over your usual span (median of the 14 before, from 7) is long
  TRIM_HR_UP:5,TRIM_HR_WIN:60,TRIM_HR_MIN:180, // awake in bed with the band on: the 60-min mean heart rate stays more than 5 bpm over the night's sleeping level (median of its second half) for 180+ min from its first reading
  ADJ_STEP:5,ADJ_PAGE:30,ADJ_SNAP:10,   // Adjust a night: arrow keys move 5 min, Page Up / Down 30 min; a drag snaps to a stage change or the band within 10 min
  ACT_K:1.5,STEP_BASE:5000,STEP_RATE:100, // strain load per active minute outside workouts; without active time: minutes = steps over 5000 / 100
  ACT_MET:3,                             // the band's active minutes: moderate and vigorous activity; read from 3+ MET when a day has no activity classes
  BB_MAX:5,BB_MIN_N:5,BB_FREE_D:4,       // bounce-back: back within 5 days counts; a class needs 5 readings; no other hard session in the 4 days after
  BB_DAYS:120,BB_HRV_SD:0.5,BB_RHR_SD:1,BB_CAP:4 // read from the last 120 days; back = HRV at least usual less 0.5 SD, resting HR at most usual plus 1 SD; never more than 4 days
};
const zL=(v,t)=>{
  if(t==='atl')return v>70?'High':v>45?'Moderate':'Low';
  if(t==='sleep')return v>=80?'Excellent':v>=65?'Good':v>=50?'Fair':'Low';
  if(t==='tsb')return v>=TH.FORM_FRESH?'Fresh':v>=TH.FORM_OK?'Balanced':v>=TH.FORM_TIRED?'Tired':'Very tired';
  if(t==='body')return v==null?'—':v>=TH.BODY_GREEN?'Green':v>=TH.BODY_YELLOW?'Yellow':'Red';
  return'—';
};
const EM={energy:['','Exhausted','Low','Good','Full'],mood:['','Low','Flat','Good','Great'],stress:['','Calm','Some','Stressed','Very stressed'],motivation:['','None','Low','Good','Fired up'],soreness:['','None','Mild','Moderate','Severe'],bodyFeel:['','Wrecked','Tired','Okay','Good','Strong'],symptoms:['None','Above the neck','Below the neck'],soreArea:{legs:'Legs',hips:'Hips',back:'Back',upper:'Shoulders and arms',core:'Core'}};
const APP_VER=127; // keep in step with the cache name in sw.js
const CLAUDE_MODEL='claude-sonnet-5-5';
const POLAR_API='https://vitalcore-backend.vercel.app/api'; // the owner's Vercel functions; they hold the Polar tokens, the app sends its app key
const SPORTS=[['Run','<svg class="sp-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M13 4m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"/><path d="M4 17l5 1l.75 -1.5"/><path d="M15 21l0 -4l-4 -3l1 -6"/><path d="M7 12l0 -3l5 -1l3 3l3 1"/></svg>'],['Cycle','<svg class="sp-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 18m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0"/><path d="M19 18m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0"/><path d="M12 19l0 -4l-3 -3l5 -4l2 3l3 0"/><path d="M17 5m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"/></svg>'],['Swim','<svg class="sp-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M16 9m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"/><path d="M6 11l4 -2l3.5 3l-1.5 2"/><path d="M3 16.75a2.4 2.4 0 0 0 1 .25a2.4 2.4 0 0 0 2 -1a2.4 2.4 0 0 1 2 -1a2.4 2.4 0 0 1 2 1a2.4 2.4 0 0 0 2 1a2.4 2.4 0 0 0 2 -1a2.4 2.4 0 0 1 2 -1a2.4 2.4 0 0 1 2 1a2.4 2.4 0 0 0 2 1a2.4 2.4 0 0 0 1 -.25"/></svg>'],['Weights','<svg class="sp-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12h1"/><path d="M6 8h-2a1 1 0 0 0 -1 1v6a1 1 0 0 0 1 1h2"/><path d="M6 7v10a1 1 0 0 0 1 1h1a1 1 0 0 0 1 -1v-10a1 1 0 0 0 -1 -1h-1a1 1 0 0 0 -1 1z"/><path d="M9 12h6"/><path d="M15 7v10a1 1 0 0 0 1 1h1a1 1 0 0 0 1 -1v-10a1 1 0 0 0 -1 -1h-1a1 1 0 0 0 -1 1z"/><path d="M18 8h2a1 1 0 0 1 1 1v6a1 1 0 0 1 -1 1h-2"/><path d="M22 12h-1"/></svg>'],['Calisthenics','<svg class="sp-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 7a1 1 0 1 0 2 0a1 1 0 0 0 -2 0"/><path d="M13 21l1 -9l7 -6"/><path d="M3 11h6l5 1"/><path d="M11.5 8.5l4.5 -3.5"/></svg>'],['Hike','<svg class="sp-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"/><path d="M7 21l2 -4"/><path d="M13 21v-4l-3 -3l1 -6l3 4l3 2"/><path d="M10 14l-1.827 -1.218a2 2 0 0 1 -.831 -2.15l.28 -1.117a2 2 0 0 1 1.939 -1.515h1.439l4 1l3 -2"/><path d="M17 12v9"/><path d="M16 20h2"/></svg>'],['Walk','<svg class="sp-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M13 4m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"/><path d="M7 21l3 -4"/><path d="M16 21l-2 -4l-3 -3l1 -6"/><path d="M6 12l2 -3l4 -1l3 3l3 1"/></svg>'],['Yoga','<svg class="sp-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"/><path d="M4 20h4l1.5 -3"/><path d="M17 20l-1 -5h-5l1 -7"/><path d="M4 10l4 -1l4 -1l4 1.5l4 1.5"/></svg>'],['Other','<svg class="sp-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"/><path d="M12 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"/><path d="M19 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"/></svg>']];
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
// Source of each field on a record: rec.src = {field:'icu'|'polar'|'est'|'man'} (local only, missing = unknown).
// manSrc() marks fields the user typed: an imported ('icu' or 'polar') value that was left as is keeps its mark.
const IMP_SRC=['icu','polar'];
function manSrc(old,rec,keys){
  const o=(old&&old.src)||{},s={};
  keys.forEach(k=>{const v=rec[k];if(v==null||v===''||v===0&&/[HM]$/.test(k))return;s[k]=IMP_SRC.includes(o[k])&&old[k]===v?o[k]:'man';});
  return s;
}
// icuFill() writes imported values only into empty fields (null, or 0 for the hours/minutes pairs) or fields the import wrote before;
// returns true when changed. who = 'icu' (default) or 'polar': Polar also replaces an Intervals.icu value or an estimated time
// (its night is the original, Intervals.icu carries a flattened copy), never a typed one. Intervals.icu never replaces a Polar value.
function icuFill(rec,vals,who='icu'){
  let ch=false;const src={...(rec.src||{})};
  const may=k=>who==='polar'?['icu','polar','est'].includes(src[k]):src[k]==='icu';
  for(const [k,v] of Object.entries(vals)){
    if(v==null)continue;
    const cur=rec[k];
    if(cur!==v&&(cur==null||cur===0&&/[HM]$/.test(k)||may(k))){rec[k]=v;src[k]=who;ch=true;}
  }
  rec.src=src;return ch;
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
  d.wellness=d.wellness||{};
  if(!d.mig95){
    // v95: resting HR lives in wellness only. Imported weigh-ins ('mi-') carried the day's resting HR as well;
    // move it into wellness and mark the weight as imported. Imported nights (no times, no stages) get their marks.
    d.measurements.forEach(m=>{
      if(!/^mi-/.test(String(m.id)))return;
      if(m.hr){const w=d.wellness[m.date]=d.wellness[m.date]||{};if(w.rhr==null)w.rhr=m.hr;m.hr=null;m.ts=Date.now();d.pending['meas|'+m.id]=m.ts;}
      m.src={...(m.src||{}),weight:'icu'};
    });
    d.sleepLogs.forEach(s=>{
      if(s.src||s.bed||s.wake||s.deepH||s.deepM||s.remH||s.remM||s.rested!=null)return;
      if(!/^sl-/.test(String(s.id)))return;
      const src={};if(s.score!=null)src.score='icu';if(s.durMin!=null)src.durMin='icu';s.src=src;
    });
    d.mig95=true;
  }
  // v98: day totals logged before meals existed become one 'unassigned' entry
  if(!d.mig98){
    (d.foodLogs||[]).forEach(r=>{if(!r.meals&&(r.kcal>0||r.protein>0)){r.meals={unassigned:{kcal:r.kcal||0,protein:r.protein||0}};}});
    d.mig98=true;
  }
  // v117: one sleep record per night. Every writer uses the id 'sl-<date>' (manual, Intervals.icu, Polar), so a second
  // record for the same date can only be an old one with a random id that came back from the cloud. It is merged
  // into the 'sl-' record (its values fill empty fields) and removed. Runs every start; it is cheap and idempotent.
  {
    const byDate={};d.sleepLogs.forEach(s=>(byDate[s.date]=byDate[s.date]||[]).push(s));
    Object.values(byDate).filter(a=>a.length>1).forEach(a=>{
      const keep=a.find(s=>String(s.id)==='sl-'+s.date)||a.reduce((x,y)=>(y.ts||0)>(x.ts||0)?y:x);
      let ch=false;
      a.filter(s=>s!==keep).forEach(s=>{
        Object.keys(s).forEach(k=>{if(k==='id'||k==='ts'||k==='src')return;if((keep[k]==null||keep[k]===0)&&s[k]!=null&&s[k]!==0){keep[k]=s[k];if(s.src&&s.src[k])keep.src={...(keep.src||{}),[k]:s.src[k]};ch=true;}});
        if(s.id===keep.id)d.sleepLogs=d.sleepLogs.filter(x=>x!==s);     // the same id twice: just drop the extra copy
        else{d.sleepLogs=d.sleepLogs.filter(x=>x!==s);delete d.pending['sleep|'+s.id];d.tomb.push({n:'sleep',id:s.id});}
      });
      if(ch){keep.ts=Date.now();d.pending['sleep|'+keep.id]=keep.ts;}
    });
  }
  delete d.streak;delete d.exDismissed;delete d.hasRealData;delete d.lastInsight;
}


const UI={clock:`<svg class="ui-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0"/><path d="M12 7v5l3 3"/></svg>`,sun:`<svg class="ui-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0"/><path d="M3 12h1m8 -9v1m8 8h1m-9 8v1m-6.4 -15.4l.7 .7m12.1 -.7l-.7 .7m0 11.4l.7 .7m-12.1 -.7l-.7 .7"/></svg>`,moon:`<svg class="ui-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1 -8.313 -12.454z"/></svg>`,cloud:`<svg class="ui-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M6.657 18c-2.572 0 -4.657 -2.007 -4.657 -4.483c0 -2.475 2.085 -4.482 4.657 -4.482c.393 -1.762 1.794 -3.2 3.675 -3.773c1.88 -.572 3.956 -.193 5.444 1c1.488 1.19 2.162 3.007 1.77 4.769h.99c1.913 0 3.464 1.56 3.464 3.486c0 1.927 -1.551 3.487 -3.465 3.487h-11.878"/></svg>`,flame:`<svg class="ui-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12c2 -2.96 0 -7 -1 -8c0 3.038 -1.773 4.741 -3 6c-1.226 1.26 -2 3.24 -2 5a6 6 0 1 0 12 0c0 -1.532 -1.056 -3.94 -2 -5c-1.786 3 -2.791 3 -4 2z"/></svg>`,spark:`<svg class="ui-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M16 18a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2zm0 -12a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2zm-7 12a6 6 0 0 1 6 -6a6 6 0 0 1 -6 -6a6 6 0 0 1 -6 6a6 6 0 0 1 6 6z"/></svg>`,ruler:`<svg class="ui-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h14a1 1 0 0 1 1 1v5a1 1 0 0 1 -1 1h-7a1 1 0 0 0 -1 1v7a1 1 0 0 1 -1 1h-5a1 1 0 0 1 -1 -1v-14a1 1 0 0 1 1 -1"/><path d="M4 8l2 0"/><path d="M4 12l3 0"/><path d="M4 16l2 0"/><path d="M8 4l0 2"/><path d="M12 4l0 3"/><path d="M16 4l0 2"/></svg>`,dna:`<svg class="ui-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M14.828 14.828a4 4 0 1 0 -5.656 -5.656a4 4 0 0 0 5.656 5.656z"/><path d="M9.172 20.485a4 4 0 1 0 -5.657 -5.657"/><path d="M14.828 3.515a4 4 0 0 0 5.657 5.657"/></svg>`,bandage:`<svg class="ui-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M14 12l0 .01"/><path d="M10 12l0 .01"/><path d="M12 10l0 .01"/><path d="M12 14l0 .01"/><path d="M4.5 12.5l8 -8a4.94 4.94 0 0 1 7 7l-8 8a4.94 4.94 0 0 1 -7 -7"/></svg>`,trophy:`<svg class="ui-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 21l8 0"/><path d="M12 17l0 4"/><path d="M7 4l10 0"/><path d="M17 4v8a5 5 0 0 1 -10 0v-8"/><path d="M5 9m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/><path d="M19 9m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/></svg>`,warn:`<svg class="ui-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 9v4"/><path d="M10.363 3.591l-8.106 13.534a1.914 1.914 0 0 0 1.636 2.871h16.214a1.914 1.914 0 0 0 1.636 -2.87l-8.106 -13.536a1.914 1.914 0 0 0 -3.274 0z"/><path d="M12 16h.01"/></svg>`,run:`<svg class="ui-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M13 4m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"/><path d="M4 17l5 1l.75 -1.5"/><path d="M15 21l0 -4l-4 -3l1 -6"/><path d="M7 12l0 -3l5 -1l3 3l3 1"/></svg>`,bolt:`<svg class="ui-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M13 3l0 7l6 0l-8 11l0 -7l-6 0l8 -11"/></svg>`,chat:`<svg class="ui-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 9h8"/><path d="M8 13h6"/><path d="M18 4a3 3 0 0 1 3 3v8a3 3 0 0 1 -3 3h-5l-5 3v-3h-2a3 3 0 0 1 -3 -3v-8a3 3 0 0 1 3 -3h12z"/></svg>`,lotus:`<svg class="ui-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h8.5a2.5 2.5 0 1 0 -2.34 -3.24"/><path d="M3 12h15.5a2.5 2.5 0 1 1 -2.34 3.24"/><path d="M4 16h5.5a2.5 2.5 0 1 1 -2.34 3.24"/></svg>`,weight:`<svg class="ui-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12h1"/><path d="M6 8h-2a1 1 0 0 0 -1 1v6a1 1 0 0 0 1 1h2"/><path d="M6 7v10a1 1 0 0 0 1 1h1a1 1 0 0 0 1 -1v-10a1 1 0 0 0 -1 -1h-1a1 1 0 0 0 -1 1z"/><path d="M9 12h6"/><path d="M15 7v10a1 1 0 0 0 1 1h1a1 1 0 0 0 1 -1v-10a1 1 0 0 0 -1 -1h-1a1 1 0 0 0 -1 1z"/><path d="M18 8h2a1 1 0 0 1 1 1v6a1 1 0 0 1 -1 1h-2"/><path d="M22 12h-1"/></svg>`,hold:`<svg class="ui-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 7h11"/><path d="M6.5 17h11"/><path d="M6 20v-2a6 6 0 1 1 12 0v2a1 1 0 0 1 -1 1h-10a1 1 0 0 1 -1 -1z"/><path d="M6 4v2a6 6 0 1 0 12 0v-2a1 1 0 0 0 -1 -1h-10a1 1 0 0 0 -1 1z"/></svg>`,sat:`<svg class="ui-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M3.707 6.293l2.586 -2.586a1 1 0 0 1 1.414 0l5.586 5.586a1 1 0 0 1 0 1.414l-2.586 2.586a1 1 0 0 1 -1.414 0l-5.586 -5.586a1 1 0 0 1 0 -1.414z"/><path d="M6 10l-3 3l3 3l3 -3"/><path d="M10 6l3 -3l3 3l-3 3"/><path d="M12 12l1.5 1.5"/><path d="M14.5 17a2.5 2.5 0 0 0 2.5 -2.5"/><path d="M15 21a6 6 0 0 0 6 -6"/></svg>`,check:`<svg class="ui-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0"/><path d="M9 12l2 2l4 -4"/></svg>`,x:`<svg class="ui-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6l-12 12"/><path d="M6 6l12 12"/></svg>`,chev:`<svg class="ui-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6l-6 6"/></svg>`,heart:`<svg class="ui-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M19.5 12.572l-7.5 7.428l-7.5 -7.428a5 5 0 1 1 7.5 -6.566a5 5 0 1 1 7.5 6.572"/></svg>`,lungs:`<svg class="ui-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M6.081 20c1.612 0 2.919 -1.335 2.919 -2.98v-9.763c0 -.694 -.552 -1.257 -1.232 -1.257c-.205 0 -.405 .052 -.584 .15l-.13 .083c-1.46 1.059 -2.432 2.647 -3.404 5.824c-.42 1.37 -.636 2.962 -.648 4.775c-.012 1.675 1.261 3.054 2.877 3.161l.203 .007z"/><path d="M17.92 20c-1.613 0 -2.92 -1.335 -2.92 -2.98v-9.763c0 -.694 .552 -1.257 1.233 -1.257c.204 0 .405 .052 .584 .15l.13 .083c1.46 1.059 2.432 2.647 3.405 5.824c.42 1.37 .636 2.962 .648 4.775c.012 1.675 -1.261 3.054 -2.878 3.161l-.202 .007z"/><path d="M9 12a3 3 0 0 0 3 -3a3 3 0 0 0 3 3"/><path d="M12 4v5"/></svg>`,battery:`<svg class="ui-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 7h11a2 2 0 0 1 2 2v.5a.5 .5 0 0 0 .5 .5a.5 .5 0 0 1 .5 .5v3a.5 .5 0 0 1 -.5 .5a.5 .5 0 0 0 -.5 .5v.5a2 2 0 0 1 -2 2h-11a2 2 0 0 1 -2 -2v-6a2 2 0 0 1 2 -2"/><path d="M7 10l0 4"/><path d="M10 10l0 4"/><path d="M13 10l0 4"/></svg>`,mood:`<svg class="ui-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0"/><path d="M9 10l.01 0"/><path d="M15 10l.01 0"/><path d="M9.5 15a3.5 3.5 0 0 0 5 0"/></svg>`,pulse:`<svg class="ui-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12h4.5l1.5 -6l4 12l2 -9l1.5 3h4.5"/></svg>`,sore:`<svg class="ui-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8v-2a2 2 0 0 1 2 -2h2"/><path d="M4 16v2a2 2 0 0 0 2 2h2"/><path d="M16 4h2a2 2 0 0 1 2 2v2"/><path d="M16 20h2a2 2 0 0 0 2 -2v-2"/><path d="M12 8m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"/><path d="M10 17v-1a2 2 0 1 1 4 0v1"/><path d="M8 10c.666 .666 1.334 1 2 1h4c.666 0 1.334 -.334 2 -1"/><path d="M12 11v3"/></svg>`,cut:`<svg class="ui-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 7m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0"/><path d="M6 17m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0"/><path d="M8.6 8.6l10.4 10.4"/><path d="M8.6 15.4l10.4 -10.4"/></svg>`,battOff:`<svg class="ui-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18"/><path d="M11 7h6a2 2 0 0 1 2 2v.5a.5 .5 0 0 0 .5 .5a.5 .5 0 0 1 .5 .5v3a.5 .5 0 0 1 -.5 .5a.5 .5 0 0 0 -.5 .5v.5m-2 2h-11a2 2 0 0 1 -2 -2v-6a2 2 0 0 1 2 -2h1"/></svg>`,coffee:`<svg class="ui-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 14c.83 .642 2.077 1.017 3.5 1c1.423 .017 2.67 -.358 3.5 -1c.83 -.642 2.077 -1.017 3.5 -1c1.423 -.017 2.67 .358 3.5 1"/><path d="M8 3a2.4 2.4 0 0 0 -1 2a2.4 2.4 0 0 0 1 2"/><path d="M12 3a2.4 2.4 0 0 0 -1 2a2.4 2.4 0 0 0 1 2"/><path d="M3 10h14v5a6 6 0 0 1 -6 6h-2a6 6 0 0 1 -6 -6v-5z"/><path d="M16.746 16.726a3 3 0 1 0 .252 -5.555"/></svg>`};

