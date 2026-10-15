# VitalCore v132: Insights that coach

Insights now opens with Today's call: one word for the day (Train hard, Go long, Train steady, Keep it easy or Rest), the session with its warm-up, main set and cool-down, and up to four reasons from your data. The app makes the call; the AI briefing explains it and never changes it.

Under the call sit Things to watch and a coach summary with seven rows: Recovery, Training, Fitness, Body and health, Eat and drink, Injury (only when there is one) and Your plan. The rules behind them come from the research in `docs/research-v132.md`.

The briefing is shorter: five sections instead of thirteen, and the questions under it are made by the app from your day.

Next: retiring the old readiness once Body has its 14 days, or the nap estimator from daytime heart rate (v133).

## Before you use it
- Nothing to run in Supabase and nothing to deploy on the backend.
- Push from GitHub Desktop, then open the app online on your phone. Settings should show Version 132.
- Insights works without an Anthropic key: only the briefing needs it.

## Changed
**Today's call (top of Insights)**
- Green when the day goes as planned, amber when the app moved it down, red when your signals say rest, grey on a planned rest day.
- A hard day becomes easy when one of these holds: heart rate variability well under your usual, a strained check-in, low energy with sore legs, a night 2 hours or more short of what you needed, or a hard session yesterday. After a short night it also suggests a nap of 20 to 90 minutes in the early afternoon.
- Sleep debt shows as a reason only. It never moves the day.
- Swap for chips and Send to watch moved here from the old outline card.

**Feeling unwell**
- Two nights of body signs (breathing up with resting heart rate up or heart rate variability down), or one night with symptoms, means Rest. One night alone means easy only: "Your body may be fighting something".
- Coming back, the first session is about two thirds of usual and short; hard sessions wait for two days without symptoms (a week after symptoms below the neck).
- On a Rest day for illness the call lists when to see a doctor first. Symptoms for 10 days or more add "Worth getting checked by a doctor" at the top of Things to watch.

**The week**
- Two or more warning days in a week make the next week lighter (three quarters of usual).
- Signs of overreaching for a week (mood and energy under your usual, sessions harder than planned, load over the month's average) show in Things to watch; at two weeks they add a doctor line.
- Your plan has three aims: Maintain, Improve (the default) and Weight goal, and shows the weeks ahead to your race or the next four weeks.

**Things to watch**
- Each item has an icon, the fact once and the action once, and opens its row in the summary.
- Illness, the doctor line and very high blood pressure always come first, then red, amber and the rest.
- New items: heart rate variability down, resting heart rate up, sleep debt, a big jump in training, heart rate up at your usual pace, overreaching, training that is too same-y, too few easy sessions, illness, signs you may not be eating enough, fast weight loss, blood pressure, a blood marker out of range, no check-in yet.

**Eat and drink**
- Daily protein, carbs and fat with food equivalents (Indonesian staples), back from the old Fuel card, now on Insights only.
- Carbs up to 10 g per kg on days of 3 hours or more; during a session nothing under an hour, then 30, 60 or 90 g an hour.
- Protein about 0.25 g per kg a meal, and 2.2 g per kg a day while losing weight.
- A coffee cut-off: your usual bedtime less about 9 hours, rounded down to the half hour.

**Body and health**
- Weight: fast loss (over 0.7 % a week for 2 weeks) is flagged. "Signs you may not be eating enough" needs two signs over four weeks and suggests a sports doctor or dietitian.
- Blood: uric acid is in range up to 6.8 mg/dL (was 7.2); glucose cuts at 100 and 126, cholesterol at 200 and 240, in plain words. Only markers you have results for show.
- Blood pressure: a range (Normal, Elevated, Stage 1 range, Stage 2 range) only from 2 readings on 2 days; 180/120 read twice says "seek advice promptly". Never the word hypertension. Health shows the same range.

**Fitness**
- Your watch's VO2max with its change over 28 days or more, a race guide from your best recent run, and your thresholds.

**Briefing**
- Five sections: The short version, Today, This week, What is working, Focus for the week. Closed, it shows the short version and "Read the full briefing".
- Older 13-section briefings still open with their own sections.
- The question chips come from your day (why today's call, what to eat before the next session, a blood marker worth acting on, when to train hard again). Up to 10 questions a briefing, as before.
- Without the AI, the quick summary is written from the coach summary.

**Page**
- Order: Today's call, Things to watch, Coach summary, Briefing, This week, Earlier briefings. This week and Earlier briefings start closed.
- The coach card and the separate 7-day outline card are gone; the outline now sits inside the Training row.
- Settings > Food goal says it sets the targets on Insights.

## Kept
- Your recovery score, the old readiness, tonight's sleep target and the sleep debt are worked out exactly as before. Tests fail if they change.
- Today still has no verdict and no Fuel card.
- Data screens still never name a data source, and the accent colour stays off the call and the summary.
- Typed values always win.

## Different from the mockup
- The Weight tile shows the latest weigh-in, not a 7-day average.
- One VO2max row (the watch gives one estimate), and no "hardest 20 minutes on the bike".
- On an ill day the outline says "Rest or gentle mobility 15 to 25 min" while the call says "Walk, if you feel like it, up to 30 min".
- History dates read "15 Oct · 07:12". The month pattern shows only when it repeats.

## Risks
- The briefing data is smaller: no month block, 6 weeks of trend instead of 12, and fewer details on workouts 7 to 13 days old. The briefing may say less about the longer view.
- Links between habits and sleep show only when they are clear on enough nights each side; until then they read "no clear link yet".
- Overreaching and under-fuelling signs are rules of thumb, not a diagnosis, and depend on regular check-ins and food logs.
- The race guide assumes a well-paced best run; a marathon guide from shorter runs is marked optimistic.

## Checked
- 887 of 887 tests pass in `tests/index.html`. The new ones cover:
  - each rule at its edges: the easy caps, illness and the return, the lighter week, overreaching, monotony, the session mix, heart rate at pace, fuel, coffee, weight, under-fuelling, blood and blood pressure, habits, VO2max and the race guide;
  - the call words and tones, with and without a plan, and with no call yet;
  - the pins and order in Things to watch, the summary rows, rows staying open, the aims (Improve when none is chosen) and the weeks ahead;
  - the five sections, old briefings, the chips, the Q&A with a canned request, the quick summary, the briefing data under its size limit;
  - the recovery score and the sleep maths unchanged, no source names, no accent colour, nothing wider than 360px.
- The suite also passes run as a Monday, a Thursday and a Sunday through the `?day=` setting.
- I looked at Insights at 360px in light and dark with made-up athletes held in memory only: a normal day, a moved-down day, an ill day and no data. Nothing was saved.
- While checking, the Your plan row showed Maintain pressed for someone who had never chosen an aim, while the week followed Improve. Fixed: it presses Improve.
- Settings shows Version 132, and the new cache replaces the old one on update.
- Not tested on the phone itself.
