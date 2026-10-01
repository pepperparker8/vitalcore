# CLAUDE.md: VitalCore

## Project
VitalCore is a personal health intelligence PWA. It combines training load, sleep, daily psychology check-ins, body measurements, blood markers and injuries into one readiness score and an AI-generated daily briefing.

Current version: **7.0**. Built iteratively in claude.ai as an artifact. This repo is the move to a standalone, deployable app.

## User context
- Single user: an endurance athlete (running, cycling, hiking, weights, yoga). Swims (Swim is allowed, distance in metres).
- Primary device: Samsung Galaxy S24 (Android, Chrome). Minimum viewport 360px.
- Wearable: Polar Loop 2. Polar API is not accessible (403). Do not rebuild a Polar connection.
- Training data: Intervals.icu (CTL, ATL, TSB, PRs).
- Blood tests come from Indonesian labs: all markers in **mg/dL**, never mmol/L.
- AI: Anthropic Messages API with the user's own key.

## Architecture
- Vanilla HTML/CSS/JS, no framework, no build step. Hosted on GitHub Pages; Supabase for sync (local-first, RLS own rows).
- Layout: `index.html` (shell), `css/app.css`, `js/` classic scripts sharing globals, loaded in this order: core, sync, strength, log, today, settings, render, recovery, chart, form, trends, progress, plan, review, coach, health, digest, insights, app. `sw.js` caches the shell (add new files to SHELL and bump the cache name).
- External: Google Fonts only (IBM Plex Mono, Outfit, DM Serif Display).
- State: one in-memory object `_s`, accessed via `S()` and written via `save(d)`, which triggers a 400ms debounced persist.
- Charts: hand-drawn on `<canvas>` (mood, weight, fitness/fatigue/form and readiness trend via `lineChart()` in `js/form.js`). Canvas colours come from `cssv('--name')`, so they follow the theme. Readiness is snapshotted daily in `readHist` (local only) and DOM bars (sleep, HRV sparkline, blood sparklines).

### State shape
```
profile        {name, height, age, sleepGoal (decimal hours), wtGoal, stepGoal, hrGoal, goalName, goalDate, plan {0-6 Mon-Sun: {type, note}}}
checkins[]     {date, energy 1-4, mood 1-4, stress 1-4, motivation 1-4, mindfulMin, gratitude, reflection, isEx}
workouts[]     {date, type, distKm, durMin, rpe 1-5, notes, sets[], sub}  (sets: [{ex, muscle, kg, reps, secs, rir, kind, bw}]; sub: swim {pool, stroke})
sleepLogs[]    {date, score 0-100, durMin, deepH, deepM, remH, remM, rested, isEx}
measurements[] {date, bpSys, bpDia, weight, hr, isEx}
bloodLogs[]    {date, glucose, chol, uric, hdl, ldl, isEx}
injuries[]     {date, part, sev 1-3, notes, active}
intervalsData  {ctl, atl, tsb, prs[]}
insightLog[]   max 30, newest first, one per day
lastInsight    {date, time, rendered}  session cache
claudeKey, intervalsKey, intervalsID, lastSync, streak
exDismissed, hasRealData, onboardingDone
```
`isEx: true` marks seeded example data.

### Key logic
- `calcReadiness()`: sleep score base, adjusted by TSB, blended 70/30 with latest check-in, HRV and resting HR nudge vs your 30-day baseline (`recoveryAdj()`, only with 7+ days of data), minus 8 per injury severity level. Clamped 20 to 100.
- `calcBurnout()`: 60% psychological (7-day check-in averages), 40% physical (ATL, TSB).
- **Stress is inverted** everywhere it feeds a score: 1 = calm (good), 4 = very stressed (bad). Always use `5 - stress`.
- AI briefing (`genInsight`): prompt includes 12 weekly trends (`insightTrends`), recovery drivers, all blood results with change (`insightBlood`) and code-computed Pearson correlations (`insightCorrelations`, needs 8+ paired days). Model must not diagnose.
- Weekly plan (`js/plan.js`, stored in `profile.plan`): planned vs done per weekday; `suggestWorkout()` follows it when readiness allows and bends it (with a reason) when not. Trends has an interactive load chart (`renderLoad`) and Progress & PRs chart (`js/progress.js`); `lineChart()` supports touch scrubbing, PR `marks`, `yfmt`, `extra`.
- Coach view (`js/coach.js`, top of Insights): verdict (green, hold, back off) from readiness plus hard flags (severe injury, very low form, high burnout); rows for today, plan, load; "Things to watch" list.
- Check-in reminder: `profile.remind {on,time}` (default on, 19:00), strip + nav dot on Today via `renderRemind()` (today.js), optional notification when the app is opened after that time. Save guardrails in log.js use `sane()` (confirm, not block).
- Today shows "What is driving recovery" under the gauges (`readinessFactors()`/`renderFactors()` in render.js: sleep vs goal, form, check-in, HRV and resting HR vs baseline, injuries; rows with no data tap through to Log).
- "Last night" card (`renderSleepStages()` in render.js, `#slStages`): proportional deep / REM / light bar with hours and %, shown only when stages were logged; note when deep <13% or REM <20%.
- Today is results only; all inputs live in Log (opens on the first unfinished daily entry; progress bar; daily vs now-and-then groups) (Check-in, Mindfulness, Sleep, Workout with quick chips, Body, Blood, Injury). Sleep is entered as bedtime + wake-up (`bed`, `wake` on the log, local only; duration is computed, midnight-safe by `slSpan()`), with deep, REM, score and rested optional. Today order: reminder strip, three gauges (Recovery ring, Strain, Sleep; `renderGauges()` in render.js. Strain = 21*(1-exp(-load/(1.2*ref))) from `dayLoad`, ref = 75th percentile of the last 60 days; target range comes from `coachVerdict()`; Sleep = last night vs `sleepGoal`; "Asleep by" line from `profile.wakeTime` minus `sleepNeed()` = goal + up to 45 min for strain + half of recent debt, capped 45), verdict strip (`renderVerdict`, Train / Hold steady / Rest from `coachVerdict()`), weekly review, suggestion, check-in, quick workout, reflection, then a collapsed "More today" holding everything else.
- Race mode (`js/today.js`): `racePhase()` from `profile.goalDate` (Base 56+ days, Build 28-55, Peak 14-27, Taper 7-13, Race week), `raceLoad()` compares this week's minutes to a phase target (4-week mean x phase multiplier). Goal card sits under the suggestion on Today.
- Monthly review (`js/review.js`, `renderMonthly`): Today card on the 1st to 3rd for the previous calendar month vs the month before; dismissed via `profile.monthSeen`.
- Weekly review (`js/review.js`): Today card Mon to Wed summarising the previous Mon-Sun (sessions, distance, plan adherence, sleep, readiness, new bests); dismissed via `profile.reviewSeen` (week key, synced). "Plan this week" opens the plan editor.
- Blood scoring (`scoreBM`): normal 90, borderline 55, high 20.

## Status
Done: persistence, Anthropic header and model, PWA, Supabase sync, file split, strength/swim logger, Today redesign, Trends, Health tab. Redesign plan: `docs/REDESIGN_PLAN.md`.
Intervals.icu allows browser calls from the site origin (checked: CORS allows Authorization), so no proxy is needed.
Open: verify the Intervals.icu connection with real keys, offline check on the S24, real passive activity (steps, kcal).
Verify after each change; don't batch.

## Backlog
- Real push notifications (needs a push server; the in-app check-in reminder is done).

## Design system (changed with the owner's approval; ask before further changes)
- **Pro light (v72, owner asked for a light, professional look like Garmin Connect):** light is the default regardless of the phone setting (`vc-theme` defaults to `light`; auto/dark still available in Settings > Appearance). Neutral palette: page `#F3F4F6`, white cards `#FFFFFF` with 14px radius and a 1-2px soft shadow, text `#14171C`, greys `--t2 #5B6472` / `--t3 #8A93A0`. Dark: `#121316` page, `#1C1E22` cards. The cream palette is gone; do not bring it back. All colours are CSS variables with dark overrides; never hardcode colours in JS, use `cssv()`.
- Accent is orange-red to match the logo (changed with the owner's approval): `--gold` `#FF6B1F` (variable name kept), `--gold-dk` `#D4470F` (light) / `#FF8A4C` (dark), amber now yellow `#C99A06` (warnings, kept distinct from the accent), teal `#0D7A6B` for sleep and HRV only.
- Chrome is light and flat (owner asked for a cleaner, lighter look): header, nav and hero use `--chrome*` / `--hero-*` / `--ring-trk` variables (dark overrides keep the charcoal look). Nav and small labels are sentence case, no letter-spacing. Primary buttons (`.btn-gold`) are flat, 48px; secondary (`.btn-out`) and chips are transparent with a hairline border.
- The accent (`--gold`) is reserved for: readiness ring, active nav, primary buttons, PRs, streaks.
- Logo (changed with the owner's choice, concept C): white pulse line on an orange-red gradient tile (`assets/mark.svg`, `#FF8A1F` to `#FF3B2E`, 22% corner radius). App icons use the same tile and line; the maskable icon is full-bleed with the line inside the safe zone. No ring.
- Icons: inline SVG line icons from Lucide (MIT, source files and LICENSE in `assets/icons/lucide/`; inlined into the `UI` map and `SPORTS`/`ICON` in core.js and the nav in index.html; 1.8 stroke, currentColor). Check-in emoticons stay emoji.
- Inter (sans-serif, weight 600 for scores and headings; owner dislikes serif)  with tabular numerals for everything: labels, data, body. Changed from IBM Plex Mono/Outfit with the owner's request.
- 8px spacing grid. Tap targets minimum 44px.
- Tabs: Today, Trends (charts + calendar & bests), Log, Health (baselines, blood timeline, doctor/coach report), Insights. Settings opens from the logo.

- Charts take an optional `band` (shaded usual range, from `rollBand()` in form.js: mean ± 1 SD of the prior 28 days). Used on readiness, HRV and resting HR (Trends).
- Time charts (`js/chart.js`, `mountChart(id,cfg)`): real date axis, drag to pan, pinch/wheel to zoom, 1M/3M/6M/1Y/All chips, ‹ › to move, tap to inspect. Used by fitness/fatigue/form, readiness and Progress & PRs.

- **Data-first style (v66, owner-approved; v72 put sections back into white cards):** big plain numbers; sections are white cards on the grey page; verdict, reminder and week banners use a 3px coloured left rule instead of a fill. No emoji in the UI chrome: use the `UI` line-icon set in `js/core.js` (`UI.flame`, `UI.moon`, ...) and `SPORTS`/`ICON`. Check-in emoticons stay emoji. Form inputs keep their filled boxes (tap targets). Overrides live at the end of `css/app.css`.

## Conventions
- Durations always hours + minutes via `fmtDur()` / `fmtHM()`. Never decimal hours in the UI.
- Check-in uses emoticons, never numbers.
- Plain English labels ("How Fresh You Are", not "TSB") with a "Why this matters" expandable for the technical term.
- Validate inputs against physiological ranges with a friendly toast, never a silent save.
- Empty states always explain what to do next and link to the fix.

## Do not reintroduce
Polar connection section, duration/HR fields for weight training, decimal sleep hours, numeric check-in buttons, "Rest day" label for unlogged days.

## Testing checklist
- Fresh install: onboarding appears, finishing clears example data.
- Reload: data persists, onboarding does not reappear.
- Check-in, sleep, workout, measurements, blood, injury: each saves, survives reload, updates dependent views.
- Insight: generates, caches on tab switch, appears in history, regenerate works.
- Offline: banner appears, app still loads from service worker.
- S24 viewport: nothing clips, tooltips and toast positioned correctly.
