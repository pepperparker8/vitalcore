// ── INSIGHTS ─────────────────────────────────────────────────────────────────
let _insPeriod='weekly';
function selPeriod(p,btn){_insPeriod=p;document.querySelectorAll('.ins-tog').forEach(b=>b.classList.remove('active'));btn.classList.add('active');}
function updateInsNudge(){const n=$('insNudge');if(n)n.classList.toggle('hidden',S().insightLog.some(e=>e.date===td()));}
function insHTML(ins,inj){
  return`<div class="ins-block"><div class="ins-arch">🧠 ${esc(ins.archetype)}</div><div class="ins-bt">OVERALL STATUS</div><div class="ins-text">${esc(ins.overall)}</div></div>
    <div class="ins-block"><div class="ins-bt">PSYCHOLOGICAL PATTERN</div><div class="ins-text">${esc(ins.psychological)}</div></div>
    <div class="ins-block"><div class="ins-bt">PHYSICAL READINESS</div><div class="ins-text">${esc(ins.physical)}</div></div>
    ${ins.warnings?`<div class="ins-block" style="border-color:rgba(184,116,10,0.3)"><div class="ins-bt" style="color:var(--amber)">EARLY WARNINGS</div><div class="ins-text">${esc(ins.warnings)}</div></div>`:''}
    ${inj&&inj.length?`<div class="ins-block" style="border-color:rgba(192,57,43,0.2)"><div class="ins-bt" style="color:var(--red)">INJURY FLAGS</div><div class="ins-text">${inj.map(i=>`${esc(i.part)} (severity ${i.sev})`).join(', ')} — factored into physical readiness assessment.</div></div>`:''}
    <div class="ins-block"><div class="ins-bt">WHAT'S WORKING</div><div class="ins-text">${esc(ins.working)}</div></div>
    <div class="ins-block" style="background:var(--char);border-color:rgba(201,168,76,0.2)"><div class="ins-bt">ONE THING TODAY</div><div class="ins-text" style="color:rgba(255,255,255,0.85)">${esc(ins.today)}</div></div>
    <div class="ins-block"><div class="ins-bt">THIS WEEK'S FOCUS</div><div class="ins-text">${esc(ins.focus)}</div></div>
    <button class="ins-gen" style="margin-top:8px" onclick="regenInsight()">↺ Regenerate</button>`;
}
function saveInsightToLog(ins,period){
  const d=S(),now=new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
  const e={date:td(),time:now,period,ts:Date.now(),archetype:ins.archetype,overall:ins.overall,psychological:ins.psychological,physical:ins.physical,warnings:ins.warnings||'',working:ins.working,today:ins.today,focus:ins.focus};
  d.insightLog=d.insightLog.filter(x=>x.date!==td());d.insightLog.unshift(e);
  if(d.insightLog.length>30)d.insightLog=d.insightLog.slice(0,30);
  d.pending['insight|'+e.date]=e.ts;save(d);queuePush();renderInsightHistory();return e;
}
function renderInsightHistory(){
  const log=S().insightLog,sec=$('insHistSec');
  if(!log.length){sec.style.display='none';return;}
  sec.style.display='block';$('insHistCnt').textContent=log.length;
  const mo=log.filter(e=>e.date.slice(0,7)===td().slice(0,7));
  if(mo.length>=2){const f={};mo.forEach(e=>f[e.archetype]=(f[e.archetype]||0)+1);const top=Object.entries(f).sort((a,b)=>b[1]-a[1])[0];$('archTrend').style.display='block';$('archTrendVal').textContent=`Most common: ${top[0]} (${top[1]}×)`;}
  else $('archTrend').style.display='none';
  $('insHistList').innerHTML=log.map((e,i)=>`
    <div class="ins-hi" onclick="toggleHI(${i})">
      <div class="ins-hi-hdr"><div class="ins-hi-date">${e.date} · ${esc(e.time)} · ${esc(e.period||'')}</div><div class="ins-hi-arch">${esc(e.archetype)}</div></div>
      <div class="ins-hi-prev" id="ihp${i}">${esc((e.overall||'').substring(0,120))}${(e.overall||'').length>120?'…':''}</div>
      <div class="ins-hi-body" id="ihb${i}">
        <div class="ins-hi-sec">OVERALL</div><div class="ins-hi-text">${esc(e.overall)}</div>
        <div class="ins-hi-sec">PSYCHOLOGICAL PATTERN</div><div class="ins-hi-text">${esc(e.psychological)}</div>
        <div class="ins-hi-sec">PHYSICAL READINESS</div><div class="ins-hi-text">${esc(e.physical)}</div>
        ${e.warnings?`<div class="ins-hi-sec" style="color:var(--amber)">EARLY WARNINGS</div><div class="ins-hi-text">${esc(e.warnings)}</div>`:''}
        <div class="ins-hi-sec">WHAT'S WORKING</div><div class="ins-hi-text">${esc(e.working)}</div>
        <div class="ins-hi-sec">ONE THING TODAY</div><div class="ins-hi-text">${esc(e.today)}</div>
        <div class="ins-hi-sec">THIS WEEK'S FOCUS</div><div class="ins-hi-text">${esc(e.focus)}</div>
      </div>
    </div>`).join('');
}
function toggleHI(i){
  const p=$('ihp'+i),b=$('ihb'+i),open=b.classList.contains('open');
  document.querySelectorAll('.ins-hi-prev,.ins-hi-body').forEach(el=>el.classList.remove('open'));
  if(!open){p.classList.add('open');b.classList.add('open');}
}
function showTodayInsight(){
  const e=S().insightLog.find(x=>x.date===td());
  if(e){$('insContent').innerHTML=insHTML(e,S().injuries.filter(i=>i.active));$('insStamp').textContent=`Analysed today at ${e.time}`;return true;}
  return false;
}
function regenInsight(){const d=S();d.insightLog=d.insightLog.filter(e=>e.date!==td());save(d);genInsight();}
async function genInsight(){
  const d=S();
  if(!d.claudeKey){showToast('Add your Claude API key in Settings first');openSettings();return;}
  if(showTodayInsight())return;
  $('insContent').innerHTML='<div class="ins-loading">🧠 Analysing your data…</div>';
  const ci=d.checkins.slice(-14).map(c=>({date:c.date,energy:c.energy??null,mood:c.mood??null,stress:c.stress??null,motivation:c.motivation??null,mindfulMin:c.mindfulMin||0,grateful:c.gratitude||null,reflection:reflOf(c)}));
  const sl=d.sleepLogs.slice(-7).map(s=>({date:s.date,score:s.score??null,deepH:s.deepH??null,remH:s.remH??null}));
  const wk=d.workouts.filter(w=>daysAgo(w.date)<14).map(w=>({date:w.date,type:w.type,durMin:w.durMin,distKm:w.distKm,rpe:w.rpe,notes:w.notes,sets:w.sets?setsText(w):undefined,swim:w.sub?.stroke?w.sub:undefined}));
  const wkSets=weeklySets();
  const bl=last(d.bloodLogs)||{};
  const inj=d.injuries.filter(i=>i.active).map(i=>({part:i.part,sev:i.sev}));
  const prompt=`You are a personal health analyst for an athlete who also tracks mental health and mindfulness. Analyse this data and produce a concise, warm, practical briefing.
Period: ${_insPeriod}
Check-ins, 1-4 scale (stress: 1 = calm, 4 = very stressed; null = no data): ${JSON.stringify(ci)}
Sleep (null = no data): ${JSON.stringify(sl)}
Workouts (strength sessions list sets as kg×reps; calisthenics + = added kg; swim distKm is km): ${JSON.stringify(wk)}
Hard sets per muscle group, last 7 days (10-20 is a typical target): ${JSON.stringify(wkSets)}
Blood markers, mg/dL (null = not measured): ${JSON.stringify({glucose:bl.glucose??null,chol:bl.chol??null,uric:bl.uric??null})}
Training load: CTL=${d.intervalsData.ctl??'unavailable'}, ATL=${d.intervalsData.atl??'unavailable'}, TSB=${d.intervalsData.tsb??'unavailable'}
Active injuries: ${inj.length?JSON.stringify(inj):'none'}
IMPORTANT: Only analyse what is available. Note data gaps. Do not invent patterns from null values. Comment on the link between mindfulness minutes, mood and stress when the data shows one.
Respond ONLY in valid JSON, no markdown:
{"archetype":"Peak Readiness|Overreaching|Work Stress Spillover|Chronic Underrecovery|Motivational Dip|Illness Onset Possible","overall":"2-3 sentences","psychological":"2-3 sentences","physical":"2-3 sentences","warnings":"1-2 sentences or empty string","working":"1-2 sentences","today":"one specific action","focus":"this week main focus"}`;
  try{
    const resp=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':d.claudeKey,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},body:JSON.stringify({model:'claude-sonnet-5-5',max_tokens:1000,messages:[{role:'user',content:prompt}]})});
    if(!resp.ok){const e=await resp.json();throw new Error(e.error?.message||'API error');}
    const data=await resp.json();
    const ins=JSON.parse(data.content[0].text.replace(/```json|```/g,'').trim());
    saveInsightToLog(ins,_insPeriod);showTodayInsight();updateInsNudge();
  }catch(e){
    $('insContent').innerHTML=`<div class="ins-block"><div class="ins-bt">RULE-BASED ANALYSIS</div><div class="ins-text">${esc(buildFallback())}</div></div><div style="font-size:11px;color:var(--t3);margin:8px 0">${esc(e.message)}</div><button class="ins-gen" onclick="genInsight()">Try again</button>`;
  }
}
function buildFallback(){
  const d=S(),ci=last(d.checkins.filter(ciFull)),sl=last(d.sleepLogs.filter(s=>s.score));
  let t='';
  if(sl&&sl.score<65)t+='Sleep quality below baseline — prioritise 7–8h tonight. ';
  if(ci?.stress>=3)t+='Stress elevated. Try a 5-minute breathing session and a lighter day. ';
  if(ci?.energy<=2)t+='Energy is low. Avoid hard training today. ';
  if(d.intervalsData.tsb!==null&&d.intervalsData.tsb<-20)t+='Significant training fatigue detected. A recovery day is appropriate. ';
  const inj=d.injuries.filter(i=>i.active);
  if(inj.length)t+=`Active injury: ${inj[0].part}. Modify training accordingly. `;
  return t||'All indicators look stable. Maintain your current routine.';
}

