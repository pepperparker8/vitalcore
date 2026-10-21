# Plan: history for every Health indicator (v141)

## What the owner asked
"Make also trend for health indicators, like dynamic chart of something, so I can have historical. Think about what should be included based on your references."

## The idea
Health > Your baselines works the way Blood markers already does:
- You tap a row and it opens in place.
- The open row shows a header with the latest reading and the one before it.
- Below that is a chart you can drag, pinch and tap.
- Under the chart is one line on what the trend means (the v123 rule).
- Then a short "What moves it" note you can expand.

One row is open at a time. Each chart opens on the last 90 days and can be pinched out to all your history. Like the blood charts, there is no toolbar.

## What gets a chart, and why (references from `docs/research-v132.md`)

| Row | What the chart shows | Shaded or marked | Its one line | Evidence |
|---|---|---|---|---|
| Resting heart rate | Every daily value. | Your usual range (`rollBand`, as on Trends). | `bandMeaning`, the same words as Trends. | Your own baseline (section 1). |
| Weight | Every weigh-in as a dot, with the 7-day average as the line. | The weight goal as a line. | The change of the 7-day average over the view. A loss faster than `WT_RATE` (0.7% a week) for `WT_RATE_WKS` weeks says that a slower pace keeps muscle and strength better. | R9.1, Garthe 2011. |
| BMI | The same series divided by height². | 18.5 to 24.9 shaded as "General adult range" (WHO). | The trend only, never a word like "overweight". | WHO adult bands. Not in the review, see question 1. |
| Body fat, Fat-free mass, Skeletal muscle, Body water, Resting energy | One chart, with chips to pick which to show (like Mood and energy). Each weigh-in with impedance is a dot, and the 7-day average is the line. | No target or range. | The change of the average over the view, said to be an estimate. | R9 "do not claim a body fat target". Impedance swings with water and food, so the average is the point. |
| Blood pressure | Systolic and diastolic as two lines, each reading a dot. | Lines at 120, 130 and 140 systolic and 80 and 90 diastolic. The words are AHA/ACC. | The band of the `BP_DAYS`-day average (`bpBand`, only from `BP_N` readings on `BP_N` days), else "One reading". Very high twice keeps its "seek medical advice promptly". | R13.1 to R13.3. |
| VO2max (new row, "your watch's estimate") | Every value from the watch. | Nothing, and no lab norms. | A change only when it holds `VO2_GAP` (28) days apart (`vo2Trend`). | R8.1, Molina-Garcia 2022. |
| Blood markers | Already charted. No change. | | | R12. |

Left off on purpose:
- HRV, sleep and breathing are on Trends already, and Health shows no baseline row for them.
- No fitness age, risk percentage or energy availability number (R8, R9.3, R14).

## Code
- `js/health.js`: `hlOpen(k)` replaces `hlBm` for every row, with `_hlOpen` holding 'rhr', 'wt', 'bmi', 'comp', 'bp', 'vo2' or a blood marker. The rows are `role=button` with 44px height, and Enter and Space open them. The chart builders are `hlChRhr`, `hlChWt`, `hlChBmi`, `hlChComp`, `hlChBp` and `hlChVo2`. The chart ids are `htc_<k>`, unmounted on close and rebuilt on re-render.
- `TH`: `HL_VIEW` 90 (the opening view in days) and `HL_AVG` 7 (the average window). The BMI range sits in `TH.BMI_RNG` [18.5, 25].
- Colours come from `cssv`, with no `--gold`. Dots use the state colours only where a state exists (blood pressure, as on the blood charts).
- Nothing is stored. No sync, Supabase, backend, score or briefing change.

## Tests (about 30 new)
- Each row opens and closes, and only one is open at a time.
- Each chart's series, average and lines, and its line at the edges: the loss rate, the blood pressure band against one reading, the VO2max gap.
- No BMI words, no lab norms, no source names, no accent colour.
- Phone width, and run as three weekdays.

## Questions for the owner
1. BMI range: shade the general adult range 18.5 to 24.9, or show the line only? A muscular athlete often reads over 25.
2. Range: keep blood-chart style (pinch to zoom, no chips), or add 3M · 1Y · All chips to these charts?
