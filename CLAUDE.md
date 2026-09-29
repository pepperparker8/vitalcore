# CLAUDE.md: VitalCore

## Project
VitalCore is a personal health intelligence PWA. It combines training load, sleep, daily psychology check-ins, body measurements, blood markers and injuries into one readiness score and an AI-generated daily briefing.

Current version: **7.0**. Built iteratively in claude.ai as an artifact. This repo is the move to a standalone, deployable app.

## User context
- Single user: an endurance athlete (running, cycling, hiking, weights, yoga). Does not swim.
- Primary device: Samsung Galaxy S24 (Android, Chrome). Minimum viewport 360px.
- Wearable: Polar Loop 2. Polar API is not accessible (403). Do not rebuild a Polar connection.
- Training data: Intervals.icu (CTL, ATL, TSB, PRs).
- Blood tests come from Indonesian labs: all markers in **mg/dL**, never mmol/L.
- AI: Anthropic Messages API with the user's own key.

## Architecture
- Single file: `index.html` (HTML + CSS + vanilla JS). No framework, no build step. Keep it that way until Phase 1–3 (Supabase sync) is done.
- External: Google Fonts only (IBM Plex Mono, Outfit, DM Serif Display).
- State: one in-memory object `_s`, accessed via `S()` and written via `save(d)`, which triggers a 400ms debounced persist.
- Charts: hand-drawn on `<canvas>` (mood trend, weight trend) and DOM bars (sleep, HRV sparkline, blood sparklines).

### State shape
```
profile        {name, height, age, sleepGoal (decimal hours), wtGoal, stepGoal, hrGoal}
checkins[]     {date, energy 1-4, mood 1-4, stress 1-4, motivation 1-4, isEx}
workouts[]     {date, type, distKm, durMin, rpe 1-5, notes, isEx}
sleepLogs[]    {date, score 0-100, deepH, deepM, remH, remM, rested, isEx}
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
- `calcReadiness()`: sleep score base, adjusted by TSB, blended 70/30 with latest check-in, minus 8 per injury severity level. Clamped 20 to 100.
- `calcBurnout()`: 60% psychological (7-day check-in averages), 40% physical (ATL, TSB).
- **Stress is inverted** everywhere it feeds a score: 1 = calm (good), 4 = very stressed (bad). Always use `5 - stress`.
- Blood scoring (`scoreBM`): normal 90, borderline 55, high 20.

## Phase 1–3 (Supabase sync): blockers (fix first, in this order)
1. **Persistence.** Replace `window.storage` (claude.ai only) with IndexedDB, or localStorage as a simpler first step. Keep the `persistLoad()` / `persistSave()` interface so nothing else changes.
2. **Anthropic API header.** Add `'anthropic-dangerous-direct-browser-access': 'true'` to both fetch calls (`genInsight`, `testClaudeKey`). Update the model string from `claude-sonnet-4-20250514` to a current Sonnet model.
3. **Intervals.icu proxy.** Browser calls likely fail on CORS. Add a small serverless proxy (Vercel function at `/api/intervals`) that forwards requests with Basic auth. Point `syncAll()` at it.
4. **CSS calc bugs.** `calc(100%+6px)` and `calc(var(--nav)+12px)` need spaces around `+`. Affects `.sb-tip` and `#toast`.
5. **Canvas colours.** `renderWtChart()` passes `'var(--teal)'` and `'var(--amber)'` to canvas. Canvas can't read CSS variables. Use hex values or read them with `getComputedStyle`.
6. **Hardcoded dates.** `syncAll()` uses `oldest=2026-04-01`. Make it relative (last 90 days).
7. **PWA.** Create `manifest.json` (name, icons, theme `#2A2A2A`, display standalone) and a real `sw.js` with cache-first for the shell. Register from the correct path.

Verify after each fix. Don't batch.

## Phase 4 backlog (after Phase 1–3 (Supabase sync))
- Real passive activity (steps, kcal) from Intervals.icu wellness data instead of example values.
- Blood marker 90-day trend chart on tap.
- Weekly digest (same seven insight sections).
- Read-only share view for a coach or doctor.
- Split into modules only if the file becomes hard to maintain.

## Design system (do not change without asking)
- Charcoal `#2A2A2A`, gold `#C9A84C`, cream background `#F7F5F0`, teal `#0D7A6B` for sleep and HRV only.
- Gold is reserved for: readiness ring, active nav, primary buttons, PRs, streaks.
- DM Serif Display for scores and headings, IBM Plex Mono for labels and data, Outfit for body.
- 8px spacing grid. Tap targets minimum 44px.
- 5 tabs: Today, Wellbeing, History, Log, Insights. Settings opens from the logo.

## Conventions
- Durations always hours + minutes via `fmtDur()` / `fmtHM()`. Never decimal hours in the UI.
- Check-in uses emoticons, never numbers.
- Plain English labels ("How Fresh You Are", not "TSB") with a "Why this matters" expandable for the technical term.
- Validate inputs against physiological ranges with a friendly toast, never a silent save.
- Empty states always explain what to do next and link to the fix.

## Do not reintroduce
Polar connection section, Swim in the exercise grid, duration/HR fields for weight training, decimal sleep hours, numeric check-in buttons, "Rest day" label for unlogged days.

## Testing checklist
- Fresh install: onboarding appears, finishing clears example data.
- Reload: data persists, onboarding does not reappear.
- Check-in, sleep, workout, measurements, blood, injury: each saves, survives reload, updates dependent views.
- Insight: generates, caches on tab switch, appears in history, regenerate works.
- Offline: banner appears, app still loads from service worker.
- S24 viewport: nothing clips, tooltips and toast positioned correctly.
