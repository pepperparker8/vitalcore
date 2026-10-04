# VitalCore v121: training sessions that adapt to you

The 7-day outline on Insights now gives a real session for each training day: a warm-up, a main set with targets, and a cool-down. Sessions get harder slowly as you complete them, ease off when they are too much, and rebuild after time off or an injury. You can send today's session to your watch, and workouts now take a pain score.

## Before you use it
- **To send sessions to your watch:** in Intervals.icu, open Settings, find your watch's connection and turn on **Upload planned workouts**. Without it the session reaches Intervals.icu but not the watch.
- **Check your thresholds in Intervals.icu** (Settings, sports): threshold pace and threshold heart rate for running, FTP and threshold heart rate for cycling. The app reads them once a day. Without them, targets use heart rate estimated from your workouts (shown as "about") or effort words, and nothing estimated is sent to the watch.
- No database change.

## Added
- **A session for every training day.** Tap a day in the 7-day outline on Insights to open it: warm-up, main set and cool-down, each with a target. Running uses pace when Intervals.icu has your threshold pace, else heart rate. Cycling uses power when your recent rides had a power meter, else heart rate. Swims use distances.
- **Levels that move with you.** Each kind of session (easy, long, steady hard, hard, hills, strides; for running, cycling and swimming) has 10 levels. Two sessions done at or under the planned effort move it up one level, at most once a week, and not after a low recovery score. Two sessions harder than planned, or one missed, move it down. Editing or deleting a workout corrects the level.
- **Gradual growth.** Weekly time grows at most 10% on last week and 30% on two weeks ago. In a week after a level went up, the time holds ("Harder sessions"): more intensity or more time, not both. Most of the week stays easy; hard minutes have a weekly limit; long sessions grow at most 10% on your recent longest.
- **Coming back after time off.** After more than a week without training, the outline says "Coming back" and starts lower: shorter weeks, lower levels and no hard days at first. The longer the break, the slower the climb.
- **Coming back after an injury.** After a moderate or severe leg injury is marked healed, running restarts as run-walk (seven steps, from 1 minute running and 4 walking up to 30 minutes running). A run with pain of 3 or less and no extra soreness next morning moves you up a step; pain of 5 or more moves you back. Then one thing returns each week: more time, strides, steady hard, hills, then long runs. Cycling, swimming, weights and yoga fill the gaps.
- **Swap a session.** Each open day offers "Swap for": for example a run for a ride, or weights for calisthenics. The swap keeps the same kind of day and time. Running is not offered with a leg injury.
- **Pain score on workouts.** Log > Workout, under "Date, effort and note": 0 (none) to 10 (worst). It opens by itself while an injury or a comeback is running. Pain of 7 or more tells you to stop training on it and get it checked.
- **Send to your watch.** An open training day for today has "Send to watch". It goes to Intervals.icu, which passes it to the watch at its next sync. The row then says "On your watch" or, if the plan changed, "Changed since you sent it" with "Send the new version". "Take it off" removes it. Only running, cycling and swimming are sent; weights and yoga stay on the phone. For now only today can be sent, until you have checked one session on the watch.
- **Your briefing knows the plan.** It gets each day's main set, how the targets are set, any comeback, the pain on your recent workouts, and your watch's fitness estimate (VO2max) when it changed over four weeks or more. It is told never to make up a pace, a wattage or a heart rate, and never to diagnose an injury.

## Kept
- Your readiness and Body scores and the verdict are worked out as before. The outline still follows your weekly plan and bends today for a bad day; v121 adds the session inside each day and the comeback limits.
- The Today session card stays gone; the detail lives only on Insights.
- Your own events in Intervals.icu are never changed or deleted: the app only ever removes events it created itself.
- Your data screens still never name an app or a device.

## Risks
- Weights, calisthenics and yoga are not sent to the watch.
- On a new phone the app no longer remembers what it sent. It finds its own events by their marker in Intervals.icu; if Intervals.icu does not return that marker, a resend could leave a second copy.
- Pace targets need threshold pace set in Intervals.icu.
- The briefing data limit in the tests went from 15,000 to 16,000 characters for a heavy month. v120 already sent about 14,900; the plan detail adds about 600 (roughly 150 tokens).

## Checked
- 143 of 143 tests pass in `tests/index.html` (91 new: the session library, targets, watch text, fitting sessions to the day, hard-minute limits, long sessions, weekly growth, levels, comebacks, the injury ladder, swaps, the plan snapshot, the pain score, the threshold and power-meter import, sending with canned requests, the briefing data and no source names).
- At 360px, light and dark: open days have no sideways scroll, swap chips and the send button are 44px, nothing orange in the card, the pain chips sit in two rows, no console errors.
- Settings shows Version 121.
- Not tested on the S24 itself, and not tested with a real Intervals.icu account or watch.
