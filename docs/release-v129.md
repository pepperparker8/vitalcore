# VitalCore v129: Today with a day browser and Your day; the sheets, Health and Log to match

Today, its sheets, Health and Log now follow the approved mockups. Today can go back two weeks, and a new card, Your day, shows your heart rate around the clock with your sleep, your workouts and the time your band was off. Health and Log became plain lists that look like Today.

No score maths changed. Body only learned to work out a past day.

Next: duplicate workouts and maps (v130), sleep debt and naps (v131), then Insights (v132).

## Before you use it
- Nothing to run in Supabase and nothing to deploy on the backend.
- Push from GitHub Desktop, then open the app online on your phone. Settings should show Version 129.

## Changed
**Today**
- A day bar at the top: ‹ Today › with the date under it. Go back up to 14 days; › is off on today.
- The three rings, the rows under them and Your day all follow the day you pick. A past day's Strain says "Day total".
- A past day's Recovery is worked out again with the same maths once Body is live, so the ring and its sheet agree. A stored score for that day that differs is corrected; no days are added, so the 14-day count does not move.
- Rows under the rings: "Resting heart rate" in full, sleep as "% of need", check-in as "N of 100", form as its word.
- **Your day:** heart rate from 18:00 the day before to 18:00 on the day, with asleep, band off and workouts behind the line, the lowest point marked, one line on how the night settled or how fast you came down after training, and three tiles (Lowest, Highest, Daytime against your usual). Tap it to open Strain for that day. It shows only when your band's day has been downloaded.
- **Plan and training:** this week as seven day columns with today outlined and one line ("On plan: 5 of 5 so far. Long run on Saturday."), the briefing as a list row, the week's training total, and Training load as three plain tiles.
- Removed: the greeting, the date in the header, the words under the rings (they now lead the Recovery sheet), "What do these mean?" and the habits strip (Log's progress card carries it).

**Recovery sheet**
- The score, its word and one line on what lifted or lowered it most.
- "From your usual day to today": a step chart from a usual day to today's score, one step per part, adding up exactly to the score.
- "Against your usual range": HRV, resting heart rate and sleep, each with its weight, its word and a bar.

**Sleep sheet**
- "7h 05min asleep, 92% of the 7h 40min you needed" with a bar.
- A ring of deep, dreaming and light sleep.
- The night with your heart rate under the stages on one time axis.
- Details: bedtime and wake-up against your usual, time asleep in bed, breaks, lowest heart rate, overnight HRV and breathing, how you rated it.
- The sleep score, a 14-night sleep window chart with one line, then Tonight.
- A battery night says "Night cut short", shows what was recorded and what was not, and offers Add wake-up time.
- The sheet's own 30-day time-asleep chart is gone; Trends keeps it.

**Strain sheet**
- Today: your aim as a bar and a line on what still fits.
- Where it came from: each workout's share and "On your feet".
- Heart rate zones all day, Your day tiles (steps, active time, about how many calories, sitting with its longest stretch), your heart rate through the day with how fast it settled, and This week against the plan.

**Every sheet** opens at its top, and a refresh keeps your place.

**Health**
- Your baselines as rows with the comparison under each value, and a weight goal row ("1.1 kg to lose", "Reached").
- Blood markers as rows: range, value, In range / High / Low and the change. Tap a row for the previous value, the chart (no chips; drag and pinch still work) and what moves it.
- Mark healed on active injuries.
- The report with Last 30 days and Last 90 days.

**Log**
- A progress card: the date, "N of 4 done" and four segments.
- Every section is one row with a short summary and a status mark; tap to open it.
- Check-in: the chosen word beside each question, "Last cup after 14:00" as a switch, the evening reflection from 18:00 (was 17:00).
- Workout: Edit and Delete moved into a ⋯ menu on each row; tapping a row opens the workout; Other in the sport grid.
- "Dreaming sleep" instead of REM.
- Transparent line icons throughout.

## Kept
- The old readiness, Body, Load and Mind maths. A detailed night still fills today only, and a typed value always wins.
- The verdict and the Fuel card stay off Today until the Insights release (v132).
- Trends, the outline and the briefing.
- Data screens still never name a data source.

## Risks
- A past day's Recovery may differ by a point or two from what Today showed that morning, because later data (a late check-in, a downloaded night) now counts. The stored score is corrected to match.
- Your day and the Strain sheet's heart rate need the band's day. Days downloaded before v129 show sitting time without its longest stretch.
- Calories are an estimate from the band's activity and your latest weight, shown as "about".
- Edit and Delete on workouts are one tap deeper, inside ⋯.

## Checked
- 619 of 619 tests pass in `tests/index.html`. The new ones cover:
  - Body and the rows under the rings for a past day, and the stored score correction;
  - the day bar limits, labels and reset on a new day;
  - Your day: the window, band off, lowest and highest, daytime against usual, hidden without a band day;
  - the Recovery steps adding up to the score;
  - the Sleep sheet (need, ring, lowest heart rate, bedtime across midnight, window line), the battery night and Tonight;
  - the Strain sheet (shares adding to 100, zones, calories, sitting, aim line, This week);
  - the scroll on open and on refresh;
  - Health rows, the blood chart without chips, Mark healed;
  - Log summaries, segments, the reflection hour, the ⋯ menu;
  - removed parts, no source names, nothing wider than 360px.
- The suite also passes run as a Monday, a Thursday and a Sunday through the `?day=` setting.
- I looked at the app at 360px in light and dark, with made-up data held in memory only: Today and a past day, every sheet including a battery night, Health with a marker open, Log with every row open, no sideways scroll and no console errors. Nothing was saved.
- Settings shows Version 129, and the new cache replaces the old one on update.
- Not tested on the phone itself.
