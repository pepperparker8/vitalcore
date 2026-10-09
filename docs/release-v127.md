# VitalCore v127: your band's day, the night cut, battery nights and your own bounce-back days

This release adds the data and the logic. The new WHOOP-style Today and sheets from the approved mockups come in v128, and the athlete insights come in v129.

What changes:
- Your band's daily steps, active time and 24/7 heart rate are now downloaded and kept.
- A night that started hours early is cut back to the time you actually slept. This happens when the band was off in the evening and back on at bedtime.
- A night where the battery ran out counts as missing, not as a short night.
- Time on your feet outside workouts now counts in strain.
- After a hard session, the outline waits as long as your body usually takes to bounce back.

## Before you use it
1. **Run `docs/supabase-v127.sql` once** in Supabase > SQL Editor. It adds the table for the band's day and the night cut column, and it changes no data. Until it runs, nights still download and show on the phone, but their cloud backup pauses. Settings says so under Polar.
2. **Deploy the backend:** run `vercel --prod` in `vitalcore-backend`. This adds the new `polar-day` route. Until then the app falls back to the step count from Intervals.icu for strain, and the night cut works without 24/7 heart rate (see Risks).
3. **Tell Claude once it is deployed.** Claude runs one check that reads only the field names (never values), fixes the names if Polar's differ from the expected ones, and you deploy once more.
4. **Push from GitHub Desktop, then open the app online on your phone.** Settings should show Version 127.

## Changed
**The night cut**
- A night that clearly includes time with the band off is cut automatically. There are four signs:
  - no 24/7 heart rate at the start or end while there is some later that night;
  - no overnight readings in that stretch;
  - a stretch the band could not read;
  - a night 90 minutes or more over your usual.
- A cut needs at least 30 minutes and two of these signs. It starts when the band was back on and ends at your last sleep. Time asleep, deep sleep and dreaming sleep are counted again inside the cut.
- **The sleep sheet** says what was left out, for example "Your band was off from 19:35 to 22:40, so the night starts at 22:40: 7h 5min asleep, not 10h 10min." It has Undo and Adjust.
- **Weaker signs only ask.** Log > Sleep shows "May include time with your band off" with Check the night. The sleep sheet offers Adjust and "It is right".
- **Adjust** shows the night's stages and heart rate with a handle at each end:
  - drag a handle, tap the chart, or use the arrow keys;
  - start chips: Band back on, First sleep, As recorded;
  - end chips: As recorded, Last sleep, Band off;
  - tiles show In bed, Asleep (with what it was), Deep and Dreaming.
- What you choose is kept: a new download never undoes it. A time you type in Log > Sleep still wins over everything.

**Battery nights**
- When the band's battery ran out, the night counts as missing, not as a short night. The sleep sheet says "Battery ran out at 03:12. Counted as missing, not short."
- The Body score works without that night's sleep part, at low confidence. Sleep debt, the sleep gauge, the sleep chart and the briefing averages leave it out.
- Add your wake-up time in Log > Sleep and the night counts again.

**Strain**
- Daily activity counts. The band's active time outside workouts adds to the day's strain. Without the band's day, steps over 5,000 count as one minute per 100 steps.
- Workout minutes come off, so a session is never counted twice.
- The strain sheet says "plus daily activity", or "Daily activity only" on a day without training.
- No steps on Today, as you asked. The briefing gets the day's steps and active minutes.

**Bounce-back days**
- Once 5 hard sessions have a clear reading, the app knows how many days your heart rate variability and resting heart rate usually take to come back. It reads up to 4 days.
- The outline keeps hard days off until then. The workout page says, for example, "ready for hard training from Sunday (you usually need three days)".
- With fewer readings, the defaults from v122 stay.

## Kept
- The old readiness score, the Body maths and Polar's own score are unchanged. The cut changes only time asleep and stages.
- Hard days in the outline, the recovery drivers and the briefing's training pairs still use training only, not daily activity.
- Data screens never name Polar, Intervals.icu or Garmin. They say "your band".
- Polar's recovery verdicts are still not imported.

## Risks
- **The `polar-day` field names are not confirmed.** The route asks Polar for daily activity and 24/7 heart rate, but Polar's newer API paths and field names were not documented where I could check them. The app reads the names loosely and ignores what it cannot read. The check after the deploy settles it.
- **Strain may run high with the band's active time.** Polar counts active time generously. Each minute outside workouts counts 1.5 load points. If strain looks high on easy days, the number to lower is `ACT_K` in core.js. Worth a look after a week.
- **Without 24/7 heart rate, the cut relies on the other signs.** The other signs are a stretch the band could not read, no overnight readings and a long night. Without heart rate, more nights will ask instead of being cut.
- **The cut syncs as its own column.** Before the SQL runs, night pushes fail quietly, so a second phone would not see a cut. A cut that is later worked out again to no cut is cleared from the cloud too.
- **Bounce-back reads only clear cases:** a hard session with no other hard one in the 4 days after. Someone who trains hard often may take a long time to reach 5 readings.

## Checked
- 347 of 347 tests pass in `tests/index.html`. 94 are new, covering:
  - the band's day and its heart rate runs;
  - the clear and weak night cuts;
  - Undo, Adjust and typed times;
  - battery nights in Body, debt and Log;
  - strain with activity, with steps only and with neither;
  - bounce-back days, including the default with fewer readings, the 4-day cap and very hard sessions;
  - the day download with a canned answer;
  - no source names in the new text.
- The suite also passes run as a Monday, a Thursday and a Sunday through the `?day=` setting.
- I looked at the app at 360px, in light and dark, with made-up nights and workouts held in memory only:
  - a trimmed night with its sheet line;
  - Adjust with handles and chips;
  - a battery night;
  - Log > Sleep statuses;
  - the workout page with your own bounce-back days.

  There was no sideways scroll, and nothing was saved.
- Settings shows Version 127, and the new cache replaces the old one on update.
- The `polar-day` route is written in the backend but not deployed yet, so it has not been called against Polar.
- Not tested on the phone itself.
