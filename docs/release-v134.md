# VitalCore v134: Body is the one recovery score

The old readiness score is gone. Body, worked out from heart rate variability, resting heart rate and sleep against your own usual range, is now the only recovery score: on the gauge, the Recovery sheet, Trends, Today's call, the outline and the briefing.

A day without heart rate variability and resting heart rate has no score. The app says so instead of falling back to the old score, and the training outline still runs.

## Before you use it
- Nothing to run in Supabase or the backend.
- Push from GitHub Desktop, then open the app online on your phone. Settings should show Version 134.

## Changed
**Recovery score**
- The old readiness (sleep, form, check-in, heart rate, injuries and soreness blended into one number) and the 14-day side-by-side run are removed. Its daily history is deleted from the phone on the first start.
- The words are Good, Moderate and Low. Primed is gone.
- Check-in, form, soreness and injuries were never part of Body. Their sheets say where they count instead: soreness and injuries shape today's session, form counts under training load, the check-in under Mind.

**A day with no score**
- The gauge says "No score yet".
- The Recovery sheet lists what is missing and offers Open Settings.
- Insights shows "No call yet": it needs heart rate variability or resting heart rate from last night.
- There is no strain aim that day.
- The 7-day outline still follows your plan or your usual training days. Illness, a hard day yesterday, soreness, a short night and injuries still change it.

**Trends**
- The Recovery chart draws one line, Body. The dashed second line is gone.

**Briefing**
- The readiness fields and averages are no longer sent. The weekly trend carries the Body average instead.
- The model is told what a missing score means.

## Tests
956, all passing, also run as a Monday, a Thursday and a Sunday.
