# VitalCore v128: Trends charts that look and read the same, 7 days by default

Every chart on Trends now has the same layout, as in the approved mockup. The page opens on the last 7 days, and one range bar at the top moves all the charts together. Each chart explains its trend in one plain line worked out by the app, not the AI.

The new Today, Health and Log screens come next, after a mockup. Athlete insights come after that.

## Before you use it
- Nothing to run in Supabase and nothing to deploy on the backend.
- Push from GitHub Desktop, then open the app online on your phone. Settings should show Version 128.

## Changed
**One range bar**
- At the top of Trends: 7D · 30D · 90D · 1Y, then ‹ and › with the dates in between ("3 to 9 Oct", "Last 7 days").
- Every chart follows it. A pinch or a drag on any chart moves all of them, and no chip is lit until you pick one again.
- › is off when the window ends today. 1Y is always a full year, even with less data.

**Sections instead of More charts**
- Recovery: Recovery, Heart rate variability, Resting heart rate, Breathing rate (shown when there is data).
- Sleep: Time asleep, with the stage bar under it.
- Training: Training load, Fitness and form, Progress and bests, Distance, Strength.
- Mind: Mood and energy, Burnout risk, Mindfulness.
- Body: Body weight, Soreness and coffee.

**Every card looks the same**
- The title with an ⓘ that opens a short explanation in everyday words.
- A header: today's value (or last night's for sleep) and what it means, with the 7-day average or total on the right and the change on last week.
- The chart. At 7 days each point or bar has its value written on it, with weekday names and "Today". At 30 days and more, the numbers move to the right edge.
- A legend under the chart for your usual range and goals.
- One line that says what the trend means.
- Tap a day and the header shows that day.

**Smaller changes**
- Training time per day is now part of Training load. The separate Training card is gone.
- The dark "This week" banner is gone: each header already shows the week.
- A day with no workout shows "–" on the bars, not "Rest".
- Bars switch to weekly above 35 days.
- Time axes read 30m, 1h, 1h 30m, never decimal hours.
- Weight shows one decimal everywhere.
- Zone words such as "Moderate" are no longer written on the Trends charts; the header names the zone.
- The strength line is no longer orange.
- The ⓘ icons are transparent line icons.

## Kept
- No score, threshold, data or sync change. The old readiness, Body, Load and Mind maths are untouched.
- The detail sheets and the blood charts keep their own 1M to All chips.
- Calendar & bests is unchanged.
- Data screens still never name a data source.

## Risks
- Fifteen charts now redraw together on a pinch or drag. The touched chart draws first and the rest follow in one frame. If it feels slow on the phone, say so.
- A chart with little history shows empty space before its first day when the window is wide. This is on purpose, so all charts keep the same dates.
- A tapped day clears when the page redraws, for example after opening an ⓘ.

## Checked
- 416 of 416 tests pass in `tests/index.html`. The new ones cover:
  - the shared window and the range bar;
  - values and weekday ticks at 7 days, y labels at 30 days, weekly bars at 90 days;
  - the dash for days with no workout;
  - the header words, including the period comparisons;
  - every ⓘ, with no source names and no emoji;
  - no zone words on Trends, the minute axis, one-decimal weight and the legend swatch;
  - the strength bars following the window;
  - nothing wider than 360px.
- The suite also passes run as a Monday, a Thursday and a Sunday through the `?day=` setting.
- I looked at the app at 360px in light and dark, with made-up data held in memory only: 7D, 30D, 90D, a zoom, a tap, every ⓘ, no sideways scroll and no console errors. Nothing was saved.
- Settings shows Version 128, and the new cache replaces the old one on update.
- Not tested on the phone itself.
