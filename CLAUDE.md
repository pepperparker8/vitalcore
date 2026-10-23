# CLAUDE.md: VitalCore

## Project
VitalCore is a personal health intelligence PWA. It combines training load, sleep, daily psychology check-ins, body measurements, blood markers and injuries into one recovery score (Body) and an AI-generated daily briefing.

Current version: **151**. This file holds the rules. What each release changed and why is in `docs/history.md` (everything up to v145, verbatim) and `docs/release-v*.md` (v118 on). Read the matching release note before changing a feature.

## User context
- Invite only (v124): the owner and the people the owner invites in Supabase; each person sees only their own data. Personal notes about the owner (devices, phone, habits) live in the gitignored `CLAUDE.local.md`; never put them back here, the repo is public.
- Sports: running, cycling (e-bike too), hiking, weights, yoga, swimming (distance in metres).
- Android Chrome first. Minimum viewport 360px.
- Polar (owner only, through the owner's backend, repo `vitalcore-backend`, Vercel functions holding one token row) supplies the detailed night and the band's day (steps, active time, 24/7 heart rate). Workouts come only from Intervals.icu, never from Polar. Intervals.icu stays the source of daily wellness (HRV, resting HR, breathing). Polar's own recovery verdicts are never imported.
- Intervals.icu wellness can mix two devices (a watch for the day, a ring or band for sleep), which is why the resting heart rate baseline uses all imported values rather than one device.
- Blood markers in **mg/dL**, never mmol/L.
- AI: Anthropic Messages API with each user's own key; model id in one constant, `CLAUDE_MODEL` (core.js).

## Architecture
- Vanilla HTML/CSS/JS, no framework, no build step. Hosted on GitHub Pages; Supabase for sync (local-first, RLS own rows).
- `index.html` (shell), `css/app.css` (later releases add a "vN" block at the end; v149 took out every declaration a later rule with the same selector replaced and every rule for a class the app no longer uses, and the "v149 stylesheet" test keeps it that way: change a rule in place rather than restating it further down), `js/` classic scripts sharing globals, loaded in this order. Top-level names are shared across all of them and the tests page, so a new global must not reuse one.
  - core: state, `TH` thresholds, `TBL`, `UI`/`SPORTS` icons, `save`, `migrate`, `wkOn`, formatting.
  - sync: Supabase auth and sync, Intervals.icu, Polar nights and days, the night cut, send to watch, the connection check (v146).
  - strength, log (Log tab forms, Bluetooth monitor and scale), today (race phase, day bar), settings, render (Today gauges and factors, Trends chart renderers), recovery (`calcBody`, `calcLoad`, `calcMind`, illness, sleep debt, strain), detail (detail sheets), chart (`mountChart`), form (`rollBand`), trends (range bar), progress, plan, coach (`coachFlags`, `coachVerdict`), sessions (session library), workout (reading a workout, doubles, the workout sheet, route and map), day (Your day, naps), strategy (7-day outline, levels, comebacks), fuel, health, digest, insights (briefing), coachpage (Insights page), app (starts the app).
- `sw.js` caches the shell: add new files to SHELL and bump the cache name together with `APP_VER` (core.js). It installs with `cache:'reload'` and revalidates same-origin files with `cache:'no-cache'`. It answers with `ignoreSearch:true`, so a new `?r=` does not bypass the cache.
- External: Google Fonts; OpenStreetMap tiles only after Show map (Leaflet 1.9.4 vendored in `vendor/leaflet/`, never a CDN, never cached by `sw.js`).
- State: one in-memory object `_s`, read via `S()`, written via `save(d)` (400 ms debounced persist, v147: IndexedDB `vitalcore`, store `kv`, key `data`, as one JSON string). localStorage `vitalcore-data` is only the fallback where IndexedDB will not open (`lsSave` trims briefings and Polar nights when it is full) and the copy `flushLast` writes on pagehide; a localStorage copy is always the newer one, read first and moved into IndexedDB. Never read or write the data any other way.
- Startup (v147): every app script loads with `defer`; `initUI` draws Today and the open tab only, the other tabs draw when opened (`refreshActive`); `_boot` keeps this visit's timing in memory and Settings shows it under the version.
- Charts: hand-drawn on `<canvas>`. Every time chart goes through `mountChart()` (js/chart.js; options listed in its header comment). The workout trace (`wkDraw`) and Your day (`dyMount`/`dyDraw`) are their own canvases. Colours from `cssv('--name')`; `chRedrawAll()` redraws on a theme change.
- Tests: `tests/index.html` loads every script but app.js and runs the acceptance tests in the page, no library. Serve with `.claude/launch.json` "vitalcore" (`python3 -m http.server 8118`), open `/tests/`; it shows "N of N passed" and sets `window.TEST_RESULT`. It stubs `Storage.prototype.setItem` and replaces `save`, so fixtures never reach the app's storage. `/tests/?day=YYYY-MM-DD` runs the suite as if today were that date; run it as a Monday, a Thursday and a Sunday before every release. The 360px checks need the browser pane at phone width. Never in SHELL. It sets `DB.name` to `vitalcore-test`, so storage tests never touch the app's database.

### State shape
```
profile        {name, height, age, sleepGoal (decimal hours), wtGoal, stepGoal, hrGoal, goalName, goalDate, plan {0-6 Mon-Sun: {type, note}}, ft {field: ms} when each field last changed (v148, `profPaths`; plan days and nap dates are fields of their own)}
profSnap       local only (v148, left out of backups): JSON {b, m} the profile fields as the cloud last held them and as last stamped
checkins[]     {date, energy 1-4, mood 1-4, stress 1-4, motivation 1-4, soreness 1-4, coffee 0-4 (4 = 4+), coffeeLate, mindfulMin, gratitude, reflection, bodyFeel 1-5, soreArea 'legs,back,...', symptoms 0-2, isEx}  (soreness, coffee, coffee_late synced since v79; body_feel, sore_area, symptoms since v118)
workouts[]     {date, type, distKm, durMin, rpe 1-5 or null, notes, sets[], sub}  (sets: [{ex, muscle, kg, reps, secs, rir, kind, bw}]; sub: swim {pool, stroke}, pain 0-10 (v121), Intervals.icu details {icu:{hr,hrMax,kcal,elev,load,rpe 1-10,pw,np,dw,z,zb,lt,mx,dec,hrr,t,eb,cad,spd}} (pw/np average and weighted watts, dw 1 = a real power meter, v121; v122: z seconds per heart rate zone, zb zone tops in bpm, lt threshold and mx max heart rate at the time, dec drift %, hrr heart rate recovery bpm, t start 'HH:MM', eb 1 = e-bike, cad cadence, spd km/h))
wellness       {date: {rhr, hrv, resp, steps, sleepMin, sleepScore, ctl, atl, slHr, spo2, sleepQual, vo2 (v121, only when present)}}
sleepLogs[]    {date, score 0-100, durMin, deepH, deepM, remH, remM, rested, isEx}
measurements[] {date, bpSys, bpDia, weight, hr, isEx}
bloodLogs[]    {date, glucose, chol, uric, hdl, ldl, isEx}
injuries[]     {date, part, sev 1-3, notes, active}
foodLogs[]     {date, kcal, protein, meals{breakfast|snackAm|lunch|snackPm|dinner|unassigned:{kcal,protein}}}  one per day; kcal/protein are the day totals (v88, meals v98)
intervalsData  {ctl, atl, tsb, prs[]}
profile.useSteps  null (not asked) | true | false (v99); local-only effOk[], soreOk
insightLog[]   max 365, newest first, one per day; each may hold questions[] and qa[{q,a,ts}]
lastInsight    gone: an old session cache, deleted by migrate()
wtBack         local only: date of the one-time weight backfill from Intervals.icu (v119)
dataUid        local only: the account this phone's data belongs to (v124, left out of backups)
icuThr, planHist, icuSent, stSwap   local only (v121, top level, never put(), never in profile; icuSent is left out of backups and kept on restore): thresholds {run:{lthr,maxHr,pace m/s}, ride:{ftp,eftp,lthr,maxHr}, at}; what each day's outline asked for {date:{fam,lvl,type,role,effort,lo,hi,kind}} newest 42; sessions sent to the watch {date:{id,sig,at}} 14 days; swaps {date:type}
polarNights[]  {id 'pn-<date>', date, data, trim}  one per night from Polar (v116), newest 120 kept; data described in the v116 section, plus data.batt 1 = the band's battery ran out (v127); trim {s, e seconds from the night's start, by 'auto'|'you'|'off'} the part kept as sleep (v127, synced)
polarDays[]    {id 'pd-<date>', date, data{steps, act (active min), sit (min), met (MET-hours), kcal (only when given), hr[{t, dt, v[]}], hrLo, hrHi}}  the band's day (v127), newest 60 kept
bodyHist  {date: score}  local only, newest 120; Body, one snapshot a day (v118; `readHist`, the old readiness, deleted by `migrate()` in v134)
claudeKey, intervalsKey, intervalsID, polarKey, lastSync, streak
bpUser, bpOk   local only (v135, left out of backups): the user on a two-user blood pressure monitor (null, 1, 2); 1 once a monitor read has worked (hides the first-time hint)
bpDev, scDev   local only (v144, left out of backups, kept on restore): the Bluetooth id of the monitor and the scale read before
connLog        local only (v146, left out of backups, kept on restore): {cloud, icu, polar, pday: {ok, err, at}, probe: {at, res}} the last good pull of each source, the last error, and the last cloud table check (Settings > Connections and cloud)
exDismissed, hasRealData, onboardingDone
```
`isEx: true` marks seeded example data.


## Rules that hold everywhere
- **Thresholds** live in `TH` (core.js), with the research reference in a comment where there is one (`docs/research-v132.md`, R numbers). Never write an inline number for a score band, cut, note or rule. Display labels (sleep score words) are the only exception.
- **Workouts are read through `wkOn()`** (hidden duplicate copies left out). Only id lookups, backup, CSV export, the duplicate scan, sync and delete code read `S().workouts` directly; the "v130 source scan" test enforces it.
- **Fitness, fatigue and form are read through `fitOn(date)` / `fitOf(date)` / `tsbOn(date)`** (recovery.js, v149): the Intervals.icu numbers less what the hidden copies added (`fitHidOn`, time constants `TH.FIT_DAYS` / `TH.FAT_DAYS`). Never read `intervalsData` or `wellness[].ctl/atl` for display or a rule.
- **Body is the one recovery score** (`calcBody()`: HRV 45%, resting HR 20%, sleep 35%, each against your own band). No check-in (body feel and sore area included), form, soreness, injury, burnout, sleep debt or naps in it. `calcBody`, `sleepNeed` and `needOf` are pinned by tests; sleep debt and naps never lower any score. A day without HRV and resting HR has no score (`coachGates()` keeps the outline running).
- **Stress is inverted** wherever it feeds a score: use `5 - stress`.
- **Each signal sits in one place**: form and body feel only in Load (v150: Wrecked or Tired one step toward Tired, never to Overreached; Strong lets a balanced week read Fresh; the outline reads it through `calcLoad().feel`), energy/mood/motivation only in Mind, injuries only in `coachVerdict` and the outline, soreness and sore area only shape the session (v150: today only, `SORE_OFF` sports move to one that spares the area, a sore back, legs or hips leaves the leg lifts out of strength).
- **No source names on data screens** (Today, Log, Trends, Health, sheets, briefing): "recorded automatically", "your watch", "your band", "your scale", "your monitor". Source names only in Settings, sync toasts and "Connect … in Settings" empty states. No device brand names anywhere on screen.
- **One line per chart and sheet sentence** (v123): what matters now, else the trend, else a short steady line; at most two rounded numbers, each with a comparison; at most 2 sentences and 140 characters. No "In view", counts or date lists.
- **The outline is computed in code** (`strategy()`); the AI only explains it and never changes the call. Never invent a pace, wattage or heart rate. Never diagnose.
- **Briefing**: five sections for new entries (`INS_SECS`), old ones render through `INS_SECS_OLD`. App-made question chips, Q&A max 10. The heavy-month data stays under 16,000 characters (tested). Streamed at effort low. Scale estimates (fat %, fat-free and skeletal muscle mass, W/kg) reach the briefing as `health.bodyComp` (v151, `insComp`), read as a trend and never a diagnosis; Body, Load, the outline and the fuel targets never read them.
- **Imports never overwrite what you typed** (`icuFill`, `src` per field; Polar beats Intervals.icu, typed beats both). Deleted imports stay deleted (`gone`).
- **Sync**: whole-record last-write-wins by `ts`; local pending beats remote. The profile alone merges field by field (v148, `profPull`): always change it through `markProfile()`. `SKIP_NULL` fields are left out while null and `sameKeys` evens a bulk upsert. Optional tables (`TBL.*.opt`, `OPT_FLAG`) let sync carry on before their SQL has run. Any new column needs a `docs/supabase-vN.sql` the owner runs, and a line in `CONN_SQL` (sync.js) so Settings names it.
- **Local only** (never synced, left out of backups where noted in the release): `gone`, `dupOk`, `effOk`, `soreOk`, `bodyHist`, `wtBack`, `dataUid`, `icuThr`, `planHist`, `icuSent`, `stSwap`, `napBack`/`napBackV`, `bpUser`, `bpOk`, `bpDev`, `scDev`, `scUid`, `scOk`, `connLog`, `profSnap`.
- **Log groups** (v151): Morning (check-in with the feelings only, sleep), Through the day (workout, mindfulness, food), Afternoon and evening (coffee and reflection, `#lEve`, from `TH.EVE_FROM`, also the late-cup cut-off), Now and then. Both cards write the same check-in record; saving one never clears the other's fields.
- **Bluetooth** (monitor, scale): every read is a tap; Chrome cannot read in the background. Readings save on their own with Undo. Protocol facts from public descriptions only, never GPL code.
- **Workout route** stays in memory only: never stored, synced, backed up, logged or sent to the briefing.
- Dates on screen through `fmtD()`, durations through `fmtDur()` / `fmtHM()`; never raw ISO or decimal hours.
- Everything user-typed or cloud-pulled goes through `esc()` before `innerHTML`. Colours never hardcoded in JS: `cssv()`.

## Security
- CSP meta in `index.html` limits `connect-src` (self, Supabase, Anthropic, Intervals.icu, Google Fonts, the backend) and `img-src` (plus `https://tile.openstreetmap.org`); add any new origin there.
- Invite only: a sign-in wall (`gateOn`, `showGate`), `create_user:false`, every table "own rows" for `authenticated`, nothing for `anon`, records keyed by `(user_id, id)`. Never add a way to create an account from the app, a policy wider than own rows, or a key in an address. The Polar app key travels only in the `X-App-Key` header.
- One account per phone's data (`dataUid`); switching accounts clears the phone first.

## Design system (changed with the owner's approval; ask before further changes)
- Pro light by default (`vc-theme` defaults to `light`; auto and dark in Settings). Page `#F3F4F6`, white cards 14px radius with a soft shadow, text `#14171C`, greys `--t2 #5B6472` / `--t3 #8A93A0`. Dark: `#121316` page, `#1C1E22` cards. All colours are CSS variables with dark overrides.
- Accent orange-red `--gold` `#FF6B1F` (`--gold-dk` `#D4470F` light / `#FF8A4C` dark), reserved for the recovery ring, the active nav, primary buttons and PRs. Amber `#C99A06` for warnings, teal `#0D7A6B` for sleep and HRV only. Selection is a `--text` border, never the accent.
- Logo: white pulse line on an orange-red gradient tile (`assets/mark.svg`), no ring.
- Icons: Tabler Icons 3.19 only, inline SVG (source files and LICENSE in `assets/icons/tabler/`), 1.8 stroke, currentColor. Check-in faces are hand-drawn; `EM` holds their words. No emoji anywhere.
- Inter, weight 600 for scores and headings, tabular numerals; no serif.
- 8px spacing grid; tap targets at least 44px; flat 48px primary buttons; transparent secondary buttons and chips with a hairline border; sentence case, no letter-spacing.
- Floating pill nav (Today, Trends, Health, Insights) with a round Log button beside it. Settings opens from the logo.
- Trends: one range bar (7D · 30D · 90D · 1Y) for every chart, same card anatomy (title with ⓘ, stat header, chart, legend, one line).

## Status
- Open: verify on the S24 itself (offline, the Bluetooth reads, the connection check, the move to IndexedDB); real passive activity.
- Supabase SQL scripts the owner runs, in order: `docs/supabase-v79`, `v88`, `v98`, `v116`, `v118`, `v124`, `v127`, `v140`. Settings > Connections and cloud > Check the cloud tables names any still missing (`connProbe`, `CONN_SQL` in sync.js).

## Backlog
- v152: Body calibration (a usual day sits on the green line at 67; fit the cuts to the owner's last 8 weeks from a backup); the nap prompt with `s5`, tested against a known nap with false positives counted.
- Real push notifications (needs a push server).

## Conventions
- Durations always hours + minutes. Check-in uses face icons, never numbers.
- Plain English labels ("How fresh you are", not "TSB").
- Validate inputs against physiological ranges with a friendly toast, never a silent save.
- Empty states explain what to do next and link to the fix.
- Verify after each change; don't batch. Each release: bump `APP_VER` and the sw cache name, write `docs/release-vN.md`, add a short line to Status if something is left open.

## Do not bring back without asking
- Today: the session card `#sugCard`, the Fuel card, the verdict strip (the call lives on Insights only), the check-in reminder, the 7-day recovery strip, "Training this week", the streak card, the "Last night" card, the goal card, the monthly and weekly review cards, the soreness strip `#soreSug`, the Recovery details card `#recCard`, the "This week" bars and Activity row, the greeting, the date in the header, the words under the gauges, "What do these mean?", the habits strip, the Your day card as one tap-to-Strain button, steps on Today.
- Trends: the HRV spark and zone cards, four mood lines on one chart, the old range buttons and More charts, the week banner, the Training card, the PR summary tiles, the burnout number block, "Shaded: your usual range.", per-chart toolbars, the "In view" line, the drag hint, "How to read this".
- Insights: the coach card `#coachCard`, the standalone `#stratCard`, 13 sections for new briefings, questions written by the model, "What stood out", the outline footnote and "How this is worked out", "Based on N of 14 days" with enough data.
- Log: the Quick workout card, Edit and Delete on every row, "N of 4 daily entries done", "effort not set", a Save button for Bluetooth readings.
- Health: chips on the blood charts.
- Elsewhere: the old readiness score, the motion block (v92), animated icons and Lottie, the cream palette, Lucide or any second icon set, a "Did you nap?" prompt from heart rate alone.
- Never: duration/HR fields for weight training, decimal sleep hours, numeric check-in buttons, a "Rest day" label for unlogged days, Polar's own recovery score.

## Testing checklist
- Fresh install: onboarding appears, finishing clears example data.
- Reload: data persists, onboarding does not reappear.
- Check-in, sleep, workout, measurements, blood, injury: each saves, survives reload, updates dependent views.
- Insight: generates, caches on tab switch, appears in history, regenerate works.
- Offline: banner appears, app still loads from the service worker.
- 360px phone viewport: nothing clips, tooltips and toast positioned correctly.
- The suite passes as a Monday, a Thursday and a Sunday through `?day=`.
