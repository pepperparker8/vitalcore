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
- Today order: ring, verdict strip (`renderVerdict`, Train / Hold steady / Rest from `coachVerdict()`), weekly review, suggestion, check-in, quick workout, reflection, then a collapsed "More today" holding everything else.
- Weekly review (`js/review.js`): Today card Mon to Wed summarising the previous Mon-Sun (sessions, distance, plan adherence, sleep, readiness, new bests); dismissed via `profile.reviewSeen` (week key, synced). "Plan this week" opens the plan editor.
- Blood scoring (`scoreBM`): normal 90, borderline 55, high 20.

## Status
Done: persistence, Anthropic header and model, PWA, Supabase sync, file split, strength/swim logger, Today redesign, Trends, Health tab. Redesign plan: `docs/REDESIGN_PLAN.md`.
Intervals.icu allows browser calls from the site origin (checked: CORS allows Authorization), so no proxy is needed.
Open: verify the Intervals.icu connection with real keys, offline check on the S24, real passive activity (steps, kcal).
Verify after each change; don't batch.

## Backlog
- Read-only share link for a coach or doctor.
- Reminders.

## Design system (changed with the owner's approval; ask before further changes)
- Light: cream background `#F7F5F0`, charcoal text. Dark: `#141414` background, `#1E1E1E` surfaces. Dark follows the phone or Settings > Appearance (`vc-theme`: auto/light/dark). All colours are CSS variables with dark overrides; never hardcode colours in JS, use `cssv()`.
- Gold `#D4AF37` (`--gold-dk` `#B08F1E`), amber `#D97706` (warnings, distinct from gold), teal `#0D7A6B` for sleep and HRV only.
- Gold is reserved for: readiness ring, active nav, primary buttons, PRs, streaks.
- Logo: white ring with an orange-red pulse line (`assets/mark.svg`, gradient `#FF8A1F` to `#FF3B2E`), not gold. Icons on `#1A1A1A`, incl. maskable.
- Icons: inline SVG line icons (1.8 stroke, currentColor) for nav and sports (`SPORTS`/`ICON` in core.js). Check-in emoticons stay emoji.
- DM Serif Display for scores and headings, Inter (tabular numerals) for everything else: labels, data, body. Changed from IBM Plex Mono/Outfit with the owner's request.
- 8px spacing grid. Tap targets minimum 44px.
- Tabs: Today, Trends (charts + calendar & bests), Log, Health (baselines, blood timeline, doctor/coach report), Insights. Settings opens from the logo.

- Time charts (`js/chart.js`, `mountChart(id,cfg)`): real date axis, drag to pan, pinch/wheel to zoom, 1M/3M/6M/1Y/All chips, ‹ › to move, tap to inspect. Used by fitness/fatigue/form, readiness and Progress & PRs.

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
