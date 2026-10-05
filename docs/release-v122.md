# VitalCore v122: recovery that reads your heart rate, and a page for every workout

The 7-day outline now judges how hard a workout was from your heart rate when you did not rate it, gives you recovery days after a hard session, and no longer treats a short walk or a single short week as your normal training. Every workout now opens its own page with a heart rate chart, time in zones and a few plain sentences about the session.

## Before you use it
- **Let it sync once.** The next sync reads the heart rate zones, drift and start time for your workouts from the last 90 days. Older workouts keep what they had.
- **Then open today's e-bike ride.** Tap it in Log > Workout ("Last 7 days") or in Today's "Training, last 7 days". The heart rate chart needs a connection the first time you open a workout.
- **Check the outline on Insights.** After the ride it should no longer say "Coming back", and the day after a hard ride should be easy.
- No database change.

## Added
- **Effort from heart rate.** A workout you did not rate gets its effort from the watch's rating, else from the time it spent in each heart rate zone, else from its average heart rate. The outline, the levels and the briefing all use it, so a gentle ride no longer counts as a hard day.
- **Recovery days.** After a hard session, hard training waits two days; after a very hard one, three. The outline keeps those days easy and says why ("Kept easy: still recovering from yesterday's e-bike ride"). The workout page gives the same advice in words, such as "Keep the next two days easy; ready for hard training from Thursday."
- **A fairer "Coming back".** A comeback now needs a real usual week before the break: at least two weeks with training and an hour a week. It also ends early once any 7 days in a row since you restarted reach that usual week.
- **Walks and yoga.** A walk under an hour is recovery and does not use up a training day, unless 10 or more minutes of it were steady or harder. Yoga never does.
- **E-bike rides.** They show as "E-bike ride" and count as cycling by time and heart rate. They never set speed or power targets, never set a cycling best, and are never compared on speed with your other rides.
- **A page for every workout.** Tap any workout row (Today, Log, the day panel in Trends, or "Workout details" on a done day in the outline). It shows:
  - date, start time, duration, distance and climb, and a grid with heart rate, energy, speed or pace, power (only with a power meter), cadence, effort and pain;
  - a heart rate chart over the whole session with your zones shaded and the height of the route underneath. Switch to speed, pace, power or cadence. Tap or drag to read any moment;
  - time in each heart rate zone, grouped as easy, steady and hard;
  - "What it shows": the mix of easy and hard minutes, how much your heart rate drifted, your hardest 5 and 20 minutes, the biggest climb, how fast your heart rate came down, and how this session compares with your last few of the same kind;
  - recovery advice for the last three days' sessions, planned against done, your sets and note, and Edit in Log.
- **Your briefing knows more about each session.** It gets the easy, steady and hard minutes and the drift for the last 7 days, whether an effort came from heart rate, and which rides were on an e-bike.

## Kept
- Your readiness and Body scores and the verdict are worked out as before.
- The heart rate trace is fetched only when you open a workout, kept in memory for the last 10, and never stored on the phone or in the cloud. The zones and numbers show without a connection.
- Your own effort, note, sets, pain and swim details stay when a workout is refreshed.
- The Today session card stays gone, and data screens still never name an app or a device.

## Risks
- Garmin's recovery hours and training effect cannot be read through Intervals.icu, so the app gives its own advice by day instead.
- It is not yet confirmed on your account that the workout list carries the heart rate zones. If it does not, the workout page reads them from the single workout when you open it, and the outline uses the average heart rate until then.
- Workouts that reached Intervals.icu through Strava have no trace to draw. Their numbers and zones still show.
- The briefing data is close to its size limit: a heavy month is about 15,700 characters (16,000 is the limit in the tests).

## Checked
- 196 of 196 tests pass in `tests/index.html` (53 new: walks and yoga, the heart rate mix, effort from heart rate, recovery days, the new import fields, the comeback base and early end, the e-bike case that went wrong, levels from heart rate, e-bike rules, the trace request, its analysis and its failures, the workout page and chart, and the briefing data).
- At 360px, light and dark, with a made-up ride: rows and the day panel open the page, the chart reads on tap and drag, chips are 44px, no sideways scroll, nothing orange, no console errors.
- Settings shows Version 122.
- Not tested on the S24 itself, and not tested with a real Intervals.icu account.
