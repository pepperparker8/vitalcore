# VitalCore v150: body feel moves Load, a sore area steers today's session

## Before you use it
- Nothing to run in Supabase or the backend.
- Push from GitHub Desktop, then open the app online on each phone. Settings should show Version 150.

## New
- How your body feels (the check-in's Wrecked to Strong) now counts, in Load and only there. Wrecked or Tired moves Load one step toward Tired (Fresh to Normal, Normal to Tired), never to Overreached. Strong lets Load read Fresh when your form is balanced, you have had no hard session in the last 4 days and your training has not jumped.
- A Wrecked or Tired body keeps today's hard or long session easy: "Your body feels wrecked today." It sits in the order of today's reasons after a strained check-in and before soreness.
- Where you are sore (saved with soreness Moderate or Severe) steers today's session:
  - sore legs or hips: a run or hike moves to the sport you do most of those that spare them, for example "Your legs are sore today. Keep it easy and short. Cycling spares them.";
  - sore shoulders and arms: a swim moves to another sport;
  - a strength day with any sore area is lighter; with a sore back, legs or hips it also leaves out squats and deadlifts.
- Only today is steered, and a sport that loads the sore area drops out of today's swaps.
- Body is unchanged: it still reads only HRV, resting heart rate and sleep.

## Under the hood
- `calcLoad()` (recovery.js) reads today's `bodyFeel` and returns `bodyFeel` and `feel` ('low', 'high' or null, set when it moved the state). Cuts `TH.LOAD_FEEL_LOW` 2 and `TH.LOAD_FEEL_HIGH` 5.
- `strategy()` (strategy.js) reads body feel only through `calcLoad().feel`. `SORE_OFF` lists the sports each area keeps you out of, `SORE_NOLOW` the areas that set `noLower` for today's strength session.
- The briefing's load data adds `bodyFeelMoved`.

## Left for v151
- Body calibration: a usual morning scores 67.5, on the green line at 67. The cuts are to be fitted to the owner's own last 8 weeks from a backup.
- The nap prompt from 5-minute steps (`s5`), tested against a known nap with false positives on other days counted.

## Tests
1228 of 1228, also run as a Monday, a Thursday and a Sunday. New: "v150 Phase B" (Load steps, Body unchanged, the body-feel cap, sore legs, sore shoulders and arms, a sore back or core on a strength day, only today steered).
