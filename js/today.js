// ── TODAY: reason for the score, guided next step, evening reflection ────────
function readinessReasons(){
  const d=S(),out=[],sl=last(d.sleepLogs.filter(s=>s.score)),ci=last(d.checkins.filter(ciFull)),tsb=d.intervalsData.tsb;
  if(sl)out.push([`Sleep ${sl.score}`,sl.score>=75?1:sl.score>=55?0:-1]);
  if(tsb!==null&&tsb!==undefined)out.push([`Freshness ${tsb>0?'+':''}${tsb}`,tsb>=0?1:tsb>-10?0:-1]);
  if(ci){
    const m=ci.mood,e=ci.energy,s=ci.stress;
    out.push([m>=3?'Mood good':m===2?'Mood so-so':'Mood low',m>=3?1:m===2?0:-1]);
    out.push([e>=3?'Energy good':e===2?'Energy so-so':'Energy low',e>=3?1:e===2?0:-1]);
    out.push([s<=1?'Calm':s===2?'Some stress':'Stressed',s<=1?1:s===2?0:-1]);
  }
  d.injuries.filter(i=>i.active).forEach(i=>out.push([`${i.part} −${i.sev*8}`,-1]));
  return out;
}
function renderWhy(){
  const r=readinessReasons(),el=$('heroWhy');
  el.innerHTML=r.length?r.map(([t,g])=>`<span class="why ${g>0?'up':g<0?'down':''}">${g>0?'▲':g<0?'▼':'●'} ${esc(t)}</span>`).join(''):'';
  const missing=[];
  if(!last(S().sleepLogs.filter(s=>s.score)))missing.push('sleep');
  if(!ciFull(todayCI()))missing.push('a check-in');
  $('heroMissing').textContent=r.length&&missing.length?`More accurate with ${missing.join(' and ')}.`:'';
}

// evening reflection: shown from 5pm, or once written
const reflOf=c=>{if(!c?.reflection)return null;try{const o=JSON.parse(c.reflection);return{gave:o.g||'',drained:o.d||''};}catch(e){return{gave:c.reflection,drained:''};}};
function renderReflect(){
  const c=todayCI(),r=reflOf(c),show=!!r||new Date().getHours()>=17;
  $('reflCard').style.display='block';
  if(document.activeElement!==$('reflGave'))$('reflGave').value=r?.gave||'';
  if(document.activeElement!==$('reflDrain'))$('reflDrain').value=r?.drained||'';
  $('reflBtn').textContent=r?'Update reflection':'Save reflection';
}
function saveReflect(){
  const g=$('reflGave').value.trim(),dr=$('reflDrain').value.trim();
  if(!g&&!dr){showToast('Write a few words in either box');return;}
  const rec=ciRec();rec.reflection=JSON.stringify({g,d:dr});
  put('checkins',rec);showToast('Reflection saved');refreshAll();
}

// race phases from profile.goalDate (the goal card was removed in v111; strategy, fuel and the briefing still use these)
const RACE_PH=[
  {k:'Base',min:56,mult:1.0,tip:'Build steady volume. Keep most sessions easy.'},
  {k:'Build',min:28,mult:1.1,tip:'Add quality sessions: one hard day, the rest easy.'},
  {k:'Peak',min:14,mult:1.15,tip:'Your hardest weeks. Protect sleep and do not add extras.'},
  {k:'Taper',min:7,mult:0.7,tip:'Cut volume, keep a little intensity.'},
  {k:'Race week',min:0,mult:0.4,tip:'Rest, sleep and fuel well. Short easy sessions only.'}
];
function racePhase(){
  const p=S().profile;if(!p.goalDate)return null;
  const n=Math.round((new Date(p.goalDate+'T00:00:00')-new Date(td()+'T00:00:00'))/864e5);
  if(n<0)return{n};
  const idx=RACE_PH.findIndex(x=>n>=x.min);
  return{n,idx,...RACE_PH[idx]};
}
// minutes of training per week: mean of the 4 weeks before this one, and this week so far
function raceLoad(){
  const d=S(),m=new Date(td()+'T12:00:00');m.setDate(m.getDate()-((m.getDay()+6)%7));
  const wk=o=>{const a=new Date(m);a.setDate(a.getDate()+o*7);const b=new Date(a);b.setDate(b.getDate()+7);const A=ymd(a),B=ymd(b);
    return d.workouts.filter(w=>w.date>=A&&w.date<B&&!w.isEx).reduce((t,w)=>t+(w.durMin||0),0);};
  const prev=[-4,-3,-2,-1].map(wk).filter(x=>x>0);
  return{base:prev.length>=2?avg(prev):null,now:wk(0)};
}

