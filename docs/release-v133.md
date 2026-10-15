# VitalCore v133: a sleep debt that fades, naps you add, and Your day you can read

Sleep debt no longer drops a night all at once after 14 days. An old shortfall fades: a week later it counts half, two weeks later a quarter. Short nights still add, longer nights and naps still pay back at most 2 hours a day, and the debt still never goes below zero.

Naps you took can now be added in Log > Sleep, and they pay back sleep debt like the naps the band detects.

The Your day heart rate chart is now a chart you can read. Tap or drag for the time, the heart rate and what you were doing. Pinch, scroll or use the 24h · 6h · 1h chips to zoom.

Next: retiring the old readiness once Body has its 14 days.

## Before you use it
- Nothing to run in Supabase.
- Deploy the backend (commit 67c2522): `cd ~/vitalcore-backend && vercel --prod`. Then reconnect Polar in Settings. The band's day then also brings steps per 5 minutes, and the last 14 days are read again once.
- Push from GitHub Desktop, then open the app online on your phone. Settings should show Version 133.

## Changed
**Sleep debt (Today alert, Sleep sheet, Things to watch, briefing)**
- The debt reads the last 42 nights. Each night, what was there before fades with a half-life of 7 nights; there is no sudden drop on day 15. The half-life is the app's choice: no study gives one (`docs/research-v132.md` R7.6).
- A short night adds its shortfall. A longer night or a nap pays back at most 2 hours. A missing night or one where the battery ran out adds and pays nothing; the old debt only fades.
- Building, Paying back and Steady now follow the last counted night, so a missing night never reads as Paying back.
- "To clear about N nights" counts with the same fade.
- The debt shows from 5 counted nights of the last 14 (was 3).
- While paying back with heart rate variability and resting heart rate already back to usual, the line says so and gives no action.
- The 14-night chart, the colours (amber from 2 hours, red from 5) and the alert are unchanged.

**Naps you add (Log > Sleep)**
- A Naps row under bedtime and wake-up lists the naps on that day, with the time and length.
- Add a nap: start and end time. A nap is 10 minutes to 3 hours, cannot be in the future, and cannot overlap the night or another nap. A friendly message says which.
- × removes a nap you added. On a nap the band detected, × marks it as not a nap, so it stops counting. Both come with Undo.
- Naps you add count toward the sleep debt and show as Nap in Your day. They never change your recovery score, the sleep gauge, time asleep on Trends or the night in Log.
- Your nap answers are kept 42 days and sync with your profile.

**Your day chart (Today and the Strain sheet)**
- Tap or drag on the chart to read the time, the heart rate and the state at that moment: Asleep, Nap, the workout's name or Band off. Without a tap it reads the latest value ("Now" today).
- Chips 24h · 6h · 1h, and ‹ › to step earlier or later once zoomed. Pinch or scroll to zoom around a point; zoomed in, drag moves the chart and tap reads it.
- With the keyboard: ← → move 5 minutes, + and − zoom, Esc clears the reading without closing the sheet.
- Heart rate labels sit on the right; the hour marks adapt to the zoom (6 hours down to 15 minutes).
- The card no longer opens Strain when you tap the chart. The › in the card's title opens Strain.
- The Strain sheet uses the same chart.

## Kept
- Your recovery score (Body), the old readiness, the sleep gauge and tonight's sleep target are worked out exactly as before. Sleep debt and naps never lower any of them. Tests fail if they change.
- The band's own nap rule from v131 still counts a nap only when every check holds.
- Data screens still never name a data source, and the accent colour stays off the new parts.
- Typed values always win.

## Different from the mockup
- No "Did you nap?" strip on Your day. The plan was to ask about a nap when daytime heart rate dropped close to your sleeping level. On your own days, heart rate could not tell a nap you took apart from sitting still: any rule that found it also asked on quiet afternoons without one. So the app does not ask. Add the nap in Log > Sleep instead. With steps per 5 minutes from the reconnected band this can be looked at again.
- Because of that, Log > Sleep has no Yes / No row for suggested naps.

## Risks
- Nap answers sit inside the profile, which syncs as one record. Two phones changing the profile at the same time can lose one change.
- A slower fade keeps an old shortfall visible longer. Thirty minutes short every night now settles at about 5 hours of debt (the 14-night window gave 7).
- Steps per 5 minutes arrive only after the backend is deployed and Polar is reconnected. Until then nothing reads them.

## Checked
- 943 of 943 tests pass in `tests/index.html`. The new ones cover:
  - the fade (half in 7 nights, no drop on day 15, a steady shortfall settling where the maths says), the 2-hour cap and the floor at zero, missing and battery nights, the trend word, nights to clear, 5 nights needed, the line within the length rule;
  - the recovery score, the old readiness and the sleep need pinned to the same values;
  - adding and removing naps with each check at its edge, Undo, × on a detected nap, the 42-day pruning, the profile marked for sync, the debt and Your day counting them;
  - steps per 5 minutes on the band's day and the one-time re-read with a canned request;
  - the chart: tap, drag, keys, Esc, pinch, scroll, chips, ‹ ›, the hour marks and heart rate labels, the readout, a theme change, the Strain button, the Strain sheet using the same chart;
  - no source names, no accent colour, nothing wider than 360px.
- The suite also passes run as a Monday, a Thursday and a Sunday through the `?day=` setting.
- I looked at Today (zoomed to 6h and read at 12:35), the Strain sheet, the Sleep sheet's debt section and Log > Sleep at 360px in light and dark, with a made-up athlete held in memory only. Nothing was saved. No errors and no sideways scrolling.
- Settings shows Version 133, and the new cache replaces the old one on update.
- Not tested on the phone itself.
