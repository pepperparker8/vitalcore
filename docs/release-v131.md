# VitalCore v131: sleep debt you can watch build and clear, naps your band detects

A few short nights now build a sleep debt you can see. Longer nights and naps pay it back, and the app tells you on the morning it clears, along with whether your heart rate variability and resting heart rate are back to usual.

The debt is an alert only. It never lowers your recovery score, the sleep gauge or tonight's sleep target.

Daily activity in Strain now comes from one source a day. On a day you leave the band at home, the steps your watch or phone counted (through Intervals.icu) still count.

Next: Insights (v132).

## Before you use it
- Nothing to run in Supabase and nothing to deploy on the backend.
- Push from GitHub Desktop, then open the app online on your phone. Settings should show Version 131.
- The first sync on v131 downloads your band's last 14 days again, once, so naps can be found in them. It takes a few seconds.

## Changed
**Sleep debt**
- Measured against your sleep goal over the last 14 nights.
- A short night adds what it fell short of your goal. A longer night or a nap pays back, up to 2 hours a day.
- It never goes below zero, so sleep cannot be banked ahead. Debt older than 14 nights drops out.
- A missing night or a night the band's battery ran out adds nothing and pays nothing back.
- It needs at least 3 nights before it shows.

**Today**
- A sleep debt strip under the factor rows from 2 hours of debt: the debt, whether it is building, paying back or steady, and one line such as "Short every night since Wednesday. An extra hour a night clears it in about 4 nights."
- Amber from 2 hours, red from 5 hours. On the morning it clears it turns green: "Cleared", with what paid it back and whether heart rate variability and resting heart rate are back to usual.
- Under 2 hours nothing shows.
- It follows the day bar, and a tap opens the Sleep sheet at the debt section.

**Sleep sheet**
- A new section, "Sleep debt, 14 nights": the debt and its word, how many nights it takes to clear, and a chart of the debt with each night over or under your goal under it. Naps are stacked on their day; a missing or battery night is a ring.
- Tap a night (or use ← →) to read it: time asleep, any nap, over or under your goal, and the debt that morning.
- "Does not change your recovery score." under it.

**Naps**
- A nap counts only when your band marked sleep and every check agrees: 20 to 90 minutes, at least 2 hours after you woke and 2 hours before the next night, almost no steps, no workout at the same time, and heart rate close to your sleeping level that night.
- Your band often marks sitting still as sleep, so its mark alone is not enough. Until a real nap, the rule may find none.
- A nap shows in Your day, drawn as asleep and labelled "Nap", and pays back sleep debt. It never counts in your recovery score, the sleep gauge or time asleep.

**Daily activity in Strain**
- Each day takes its steps, active time, sitting time and calories from one source: your band, or the steps from your watch or phone if they counted more that day.
- From steps alone, active time and calories are estimates and say so; sitting time needs your band.
- A day with nothing recorded says so on the Strain sheet, with a button to Settings.
- Settings > Intervals.icu explains that daily steps there count in Strain on days your band counted fewer.

**Elsewhere**
- Things to watch on Insights and the Trends sleep card read the same sleep debt (they used two different 7-night sums before).
- The briefing gets the debt, whether it is building or clearing, the nights to clear it and the naps, and is told it never lowers the score.

## Kept
- Your recovery score, the old readiness, the sleep gauge and tonight's sleep target are worked out exactly as before. A test fails if any of them reads the debt.
- The debt is worked out when shown and never stored.
- Data screens still never name a data source.
- Typed values always win.

## Risks
- Naps depend on your band's own sleep marks and on its heart rate during the day. A nap with too few heart rate readings is not counted.
- On a day the steps come from your watch or phone, calories are an estimate from steps, your weight and your workouts.
- If your sleep goal in Settings is far from what you need, the debt follows the goal you set.

## Checked
- 766 of 766 tests pass in `tests/index.html`. The new ones cover:
  - the debt: building, paying back with the 2-hour cap, never below zero, missing and battery nights, the 14-night window, naps paying back, a past date, under 3 nights, each state and its line within the length limit;
  - the recovery score, the old readiness and tonight's sleep target unchanged and never reading the debt;
  - Things to watch, the Trends sleep line and the briefing data, still under its size limit;
  - naps: the band's sleep stretches, each rule just inside and just outside its limit, no night or no heart rate meaning no nap, the one-time re-read;
  - one activity source a day, the estimates, the "not recorded" day;
  - the Today strip at each cut and on the morning it clears, the tap opening the Sleep sheet at the section, the day bar, the section and its readout on normal and battery nights, naps in Your day, no source names, nothing wider than 360px.
- The suite also passes run as a Monday, a Thursday and a Sunday through the `?day=` setting.
- I looked at Today, the Sleep sheet and Your day at 360px in light and dark with a made-up athlete held in memory only: debt building, cleared after long nights and a nap, and a battery night. Nothing was saved.
- Settings shows Version 131, and the new cache replaces the old one on update.
- Not tested on the phone itself.
