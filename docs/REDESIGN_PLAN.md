# VitalCore redesign plan

Owner: pepperparker8. Device: Galaxy S24, Chrome PWA, min width 360px. Backend: Supabase (sync already working).
Purpose: daily multi-sport training + mental-health / mindfulness check-in, with data kept safe online.

## 1. Product principles
1. Today answers three questions: how ready am I, what should I do, what have I done.
2. Every score shows its reason. No score is shown without enough data.
3. Compare to the user's own baseline (30-day average), not fixed goals.
4. Fast capture: a set is 2 taps, a check-in is 4 taps. Detail is optional.
5. Local-first: works offline, syncs when online. Never lose an entry.
6. Design system unchanged: charcoal / gold / cream / teal, DM Serif + IBM Plex Mono + Outfit, 8px grid, 44px targets.

## 2. Navigation (4 tabs + menu)
| Tab | Purpose |
|---|---|
| Today | Readiness + reason, today's plan, guided daily flow, streak |
| Trends | Wellbeing + History merged: 7/30/90-day charts, calendar, personal bests |
| Log | Workouts (all sports), sleep, measurements, injuries |
| Health | Blood-test timeline, baselines, doctor/coach report |
| Insights | AI briefing + history |
Settings/account open from the logo. (Insights may fold into Today later.)

## 3. Sports and data captured
Sports: Run, Cycle, Swim, Weights, Calisthenics, Hike, Walk, Yoga, Other. (No Ball sport. Swim allowed again: update CLAUDE.md.)

- Cardio (Run, Cycle, Hike, Walk): distance, duration, effort 1-5, pace/speed computed, elevation (hike), avg HR if imported.
- Swim: distance in metres (stored km), duration, pool/open water, main stroke, effort, pace per 100 m computed.
- Weights, per set: exercise, kg x reps, reps in reserve (0,1,2,3+), set type (warm-up / working / failure). Exercise tagged by muscle group. Prefill from last session. No duration, no HR.
- Calisthenics, per set: reps or hold seconds, added weight, bodyweight of the day, variation + progression level, skill goals (muscle-up, handstand, front lever).
- Yoga/Other: duration, effort, notes.
- Optional after any session: soreness by body part (links to injuries).

Computed: session load (cardio effort x duration; strength volume x intensity), estimated 1RM, top set, hard sets per muscle per week (target 10-20), "beat last time".

## 4. Screens
### Today
1. Readiness ring + one-line reason ("Sleep 82, stress low, knee -8").
2. Daily flow card: check-in -> mindfulness -> workout, one guided sequence, each step skippable.
3. Habit tiles + streak (from consecutive active days).
4. This week: sessions, mindful minutes, mood bars.
5. Evening reflection (30 s): what drained / gave energy.

### Log
- Workout logger by sport type (see section 3), repeat-last, recent exercises first.
- Sleep, measurements (BP, weight, resting HR), injuries.

### Trends
- Range toggle 7 / 30 / 90 days.
- Mood/energy/calm/motivation lines, mindfulness bars, training load, sleep, weight vs goal, resting HR vs baseline.
- Strength: per-exercise top weight and est. 1RM chart, weekly sets per muscle.
- Swim/run/cycle weekly distance and pace.
- Calendar with day detail (edit/delete). Personal bests per exercise and sport.

### Health
- Blood markers (mg/dL): timeline, reference ranges, 90-day trend on tap.
- Baselines: resting HR, weight, BP vs own average.
- Doctor/coach report: read-only one-page 30-day summary (sleep, weight, BP, load, mood, injuries, labs), exportable as PDF.

### Insights
- AI briefing (same sections) now also sees strength trend, weekly volume per muscle, swim/run load, mindfulness vs mood link.

## 5. Data model changes (Supabase)
- workouts: `alter table workouts add column if not exists sets jsonb;` plus optional `sub jsonb` for sport-specific fields (pool/open water, stroke, elevation).
- sets JSON: [{ex, muscle, kg, reps, secs, rir, kind, variation, level}]
- checkins: add `reflection text` (evening note).
- measurements: nothing new. profile.data: skill goals, custom exercises.
- No change to RLS. Each change is sent to the user as SQL to paste; nothing destructive.

## 6. Engineering plan
Keep one app shell; split code, load per tab, cache all in the service worker. No build step.
```
index.html          shell + nav
css/base.css  css/{today,trends,log,health,insights}.css
js/core.js  js/sync.js  js/intervals.js
js/today.js  js/trends.js  js/log.js  js/strength.js  js/health.js  js/insights.js
```

## 7. Delivery order (each step verified and committed separately)
1. File split. Same behaviour. Regression check: all saves, reload, sync, tabs.
2. Strength + calisthenics + swim logger (with `sets` SQL).
3. Today redesign (reason on score, guided flow, reflection).
4. Trends (merge Wellbeing + History, strength and sport charts).
5. Health tab + doctor/coach report.
6. Polish: fix "type the code" wording, offline check on S24, update CLAUDE.md (Swim allowed, new state shape, file layout).

## 8. Definition of done
- Every entry survives reload and appears on a second signed-in device.
- Works offline and syncs on reconnect.
- No JS errors at 360px; all tap targets 44px+.
- Empty states say what to do next; inputs validated with a friendly toast.
- CLAUDE.md matches the code.

## 9. Backlog
Weekly digest, read-only share link for coach/doctor, Intervals.icu power/heart-rate detail, rest timer between sets, reminders.
