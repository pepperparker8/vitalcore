# VitalCore v149: fitness and fatigue count a double ride once, and a leaner stylesheet

## Before you use it
- Nothing to run in Supabase or the backend.
- Push from GitHub Desktop, then open the app online on each phone. Settings should show Version 149.

## New
- Fitness, fatigue and form leave out the hidden copy of a session recorded twice. Since v130 the app counted a doubled ride once everywhere except these three numbers, which came straight from Intervals.icu, and Intervals.icu counts both copies until one is removed there. A doubled hard ride could push form a whole band lower than it really was ("Very tired" instead of "Tired") for days after.
- The correction reaches every place the numbers show or count: the Fitness, Fatigue and Form tiles, the Form chart and sheet, Load's form band, the things to watch on Insights, the briefing and the health report.
- With Show both on a pair, both copies count, as they do everywhere else.

## Under the hood
- `fitHidOn(date)` (recovery.js) sums what each hidden copy (`wkHidW()`, workout.js) still adds on that day: a load L on day d adds L·k·(1−k)^(t−d) on day t, with k = 1 − e^(−1/τ) and τ = `TH.FIT_DAYS` (42) for fitness or `TH.FAT_DAYS` (7) for fatigue, the model Intervals.icu uses. The load is the session's own Intervals.icu load (`icu.load`).
- `fitOf(date)` is that day's wellness fitness and fatigue less the hidden share; `fitOn(date)` the same with today taken from the last sync. The sync now stores the date of the latest values (`intervalsData.date`); older data falls back to the newest wellness day that has them. `tsbOn` reads `fitOn`.
- `formDaysBack` reads `TH.FIT_DAYS`, `TH.FAT_DAYS` and `TH.FORM_BACK_DAYS` instead of inline numbers.
- The stylesheet: every declaration that a later rule with the same selector replaced (in the same `@media`, or at the top level) is gone, and so is every rule for a class or id the app no longer uses (the old status bars, passive chips, Log tiles, readiness dots, Quick workout card and others from before v129). css/app.css went from 127,887 to 112,789 bytes and 1,638 to 1,535 lines: 341 replaced declarations and 19 unused selectors gone, 138 rules removed. Comments, order and the vN blocks are kept. Computed styles were compared with the old stylesheet on the same page, element by element in both themes, for every tab, every detail sheet and Settings: no differences.
- A new test, "v149 stylesheet", fails on a declaration a later same-selector rule replaces or a class or id the app never uses.

## Tests
1220 of 1220, also run as a Monday, a Thursday and a Sunday.
