# VitalCore v126: the long session from any weekday

The 7-day outline on Insights now keeps your usual long session whatever day you open it. Before, from a Thursday, someone who usually rides 30, 30 and 120 minutes got a 25 to 30 minute easy ride that Saturday and no long ride, and the week fell well short of its target. The tests no longer assume the week starts today. Scores, data and sync are unchanged.

## Before you use it
1. **Push from GitHub Desktop, then open the app online on your phone** so the new version loads. Settings should show Version 126.

## Changed
- **The long session is planned first.** On its day it now comes before a hard session, so a hard day no longer takes your Saturday.
- **On your usual long day.** The app looks at the weekday of your longest session in each of the last 4 weeks. If 2 or more weeks agree, that is your long day, else Saturday. The long session goes on that day, or on the first free day after it in the same week.
- **One a week, and the one you did counts.** At most one long session per week, Monday to Sunday. A long one you already logged this week counts, so it is not planned again.
- **About as long as usual.** The long session is at least your usual long one (the middle of your 4 weekly longest, e-bike rides left out), scaled for the kind of week, and still under every cap.
- **Easier weeks keep a shorter long session.** A comeback, a recovering week, a taper and race week still have none. Once this week's target is reached, no long session is added.
- **Days in a row follow your habit.** If you often train five days in a row, the outline no longer puts rest days in the middle of that.
- **Walks and yoga no longer make a full week.** The easier week that follows three full weeks now counts training only.

## Kept
- Hard days are never back to back, and there are at most two a week.
- The long caps: at most 1.10 times your longest of that sport in 30 days. A long run is also at most 30% of the week and 150 minutes.
- Comeback and injury return rules work as before. A note in your weekly plan (long, tempo, easy) still wins.
- Scores, the briefing, sending to the watch and sync are unchanged.

## Risks
- **A week can land a little over its target.** When the long session is most of the week, done plus planned time can be up to about a fifth over the target. The weekly growth caps on the target itself still hold.
- **A new long day takes two weeks to follow.** If you move your long ride to another day, the outline keeps the old day until two of the last four weeks show the new one.

## Checked
- 253 of 253 tests pass in `tests/index.html` today, a Thursday. They also pass with the whole suite run as each day from 5 to 11 October, as 31 December and as 29 February 2028 (new `?day=` setting on the tests page). The nine planning tests that failed mid-week now pass.
- 16 tests are new. They run four athletes (rides of 30, 30 and 120 minutes; runs of an hour five days a week; five days a week; every day) with today set to each of the 7 weekdays. Each run checks that the long session is there, once a week, on Saturday or Sunday, that hard days follow the rules, that the long caps hold, and that the week lands near its target.
- I looked at Insights at 360px with a made-up rider held in memory only (30, 30 and 120 minutes). From Thursday it shows a long ride on Saturday, 1h 20min to 1h 40min because this is an easier week. There is no sideways scroll, and nothing was saved.
- Settings shows Version 126, and the new cache replaces the old one on update.
- Not tested on the phone itself.
