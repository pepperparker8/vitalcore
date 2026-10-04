# VitalCore v118: Body, Load and Mind

Phase A of Spec v2. The recovery score is split into three, every signal counts in one place, and a cold or illness now changes the day.

## Before you use it
Run `docs/supabase-v118.sql` in the Supabase SQL editor. It adds three columns to `checkins`. Until it has run, a check-in that uses Body feel, Where or Symptoms stays on the phone and does not sync.

## New
- **Body score.** Heart rate variability (7-night average), resting heart rate and sleep, each against your own usual range. Nothing you type goes into it. Green from 67, yellow from 34, red below.
- **Two weeks side by side.** Body is saved every day next to the old readiness score. For the first 14 days the gauge, verdict and week plan still use the old score. After that they switch to Body. Trends > Readiness trend shows both lines, with "n of 14 recorded" until then.
- **Load and Mind.** Form, weekly ramp and recent hard sessions are read as Load (Fresh, Normal, Tired, Overreached). Energy, mood, calm and motivation are read as Mind (Good, Flat, Strained). Both shape the week plan; neither changes Body.
- **Illness check.** Symptoms below the neck, or breathing up by a breath a minute together with resting heart rate up or HRV down, set the day to Rest. Symptoms above the neck keep the day easy. It shows first in Things to watch. It is a rule of thumb, not a diagnosis.
- **Check-in.** Body feel (five faces, Wrecked to Strong). Where it is sore (Legs, Hips, Back, Shoulders and arms, Core), shown from Moderate soreness. Symptoms (None, Above the neck, Below the neck).
- **Detail sheets.** Tap Recovery for a note on Body during the two weeks. Once Body is live, each sheet says what its part adds to Body, or where it counts instead.

## Changed
- The verdict comes from the score. Only a severe injury or illness overrides it. Low form and a week of low mood now explain; they no longer set Rest on their own.
- Burnout risk is from your check-ins only. Training fatigue is read under Load.
- Correlations in the briefing need 14 paired days (was 8).
- Body only uses the night ending today or yesterday, never an older one.
- All score cuts live in one table in the code, so they can be tuned in one place.

## Kept
- The old readiness score is unchanged during the two weeks.
- Polar's own recovery verdicts are still not imported. A Polar night fills today's HRV or resting heart rate only when Intervals.icu has none yet.

## Checked
- Acceptance tests 2, 10, 11 and 12 pass, with 16 more (20 of 20) in `tests/index.html`.
- Check-in at 360px: the new rows' buttons are 44px or more, no sideways scroll; saves, survives a reload, the sore area clears when soreness drops.
- All tabs and all eleven detail sheets open without errors, in the old-score state and with Body live.
- Not tested on the S24 itself.
