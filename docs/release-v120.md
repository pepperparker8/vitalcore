# VitalCore v120: a mood chart you can read

The Mood & energy chart drew four lines on top of each other, so most of them hid behind the others. It now shows one line at a time.

## Before you use it
Nothing to run. No database change.

## Changed
- **One line, with zones.** The chart opens on "All four": one score from your four check-in answers, from 25 (all Low) to 100 (all Great). Shading shows Good, Flat and Strained, the same cuts as the Mind part of the app.
- **One answer at a time.** Tap Mood, Energy, Calm or Motivation above the chart to see that answer on its own, from Low to Great, with a dashed line at Good. Calm is the opposite of stress.
- **Tap a day for all four.** Tapping any day shows the four answers in words, for example "Mood Fair · Energy Low · Calm Low · Motivation Fair".
- **What it means.** The sentence under the chart counts your good, flat and strained check-ins in view and names the answer that pulls the score down most. If even the lowest one is still Good, it says so.

## Kept
- Your check-ins, the Mind score and every other score are unchanged.
- The check-in sheet on Today uses the same zones as this chart.

## Checked
- 52 of 52 tests pass in `tests/index.html` (5 new for the mood chart: the 25 to 100 range, the zone cuts, the single line, the tapped-day words and the chips).
- At 360px, light and dark: the five chips fit on one row and are 44px or more; the chart pans, zooms and inspects; no sideways scroll; no console errors.
- Not tested on the S24 itself.
