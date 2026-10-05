# VitalCore v123: less text, one plain line per chart

The app said too much. Charts stacked up to five lines of text, the same fact showed up in two or three places, and many screens explained how they were worked out. Now every chart gives its number and one plain line about what matters. Repeated cards and method notes are gone, and the AI briefing is shorter.

## Before you use it
- **Nothing to set up.** Open the app once online so the new version loads, then check that Settings shows Version 123.
- **Generate a new briefing** to see the shorter style. Old briefings in History stay as they were.
- No database change.

## Added
- **One line under each chart.** It leads with what matters now, such as "Below your usual for 3 days. Keep today easy." If nothing stands out, it gives the trend or a short "Steady, inside your usual range." It uses at most one or two numbers, each with something to compare it with.
- **The readout says "Today"** for today's value instead of "Latest".
- **A shorter briefing.** Each section is 1 or 2 short sentences, and the short version at the top is up to 3. A section with nothing new is left out. No greetings, filler, praise or recaps, and at most one number per sentence. Answers to follow-up questions are 1 to 4 sentences.
- **Things to watch** states each point once in the title and once as an action, for example "Sleep debt: 1h 19min this week", then "A few earlier nights will clear it."
- **Plainer workout text.** The workout page opens "What it shows" with plain lines such as "Mostly easy." and "Well paced: heart rate held steady against pace." Workout rows show effort only when it is known.
- **Training load on Today** says Rising, Steady or Falling for fitness.

## Removed
- Under charts: the "In view: average · high · low" line, the "Drag to move, pinch to zoom" hint and "How to read this".
- Today: the "Recovery details" card, which repeated the rows under the gauges. The collapsed section is now called "Plan and training".
- Insights: the outline's footnote and "How this is worked out". A rest reason now shows only once when several rest days in a row share it. The week summary's "What stood out" is gone, because Things to watch already covers it. The coach card's "Based on N of 14 days" now shows only when there are fewer than 4 days of data.
- Trends: the weight summary line, the sleep-debt line, the burnout breakdown and the readiness parallel-run note. Their facts are now in the chart's line. The coffee note shows only for a real difference, the empty sleep-stages bar is hidden, and the average pace moved into the distance card's header.
- Detail sheets: the method notes. The effect on recovery is now one short line.
- Log: "Start with what is still open today", "Editing the saved night" and the blood pressure hint. A half-entered blood pressure still gets a friendly message. "Resting hr (morning, proxy for hrv)" now reads "Resting heart rate (morning)". The symptoms note is shorter.

## Kept
- All scores, thresholds, the verdict, the outline, data and sync work exactly as before. This release changes only text and layout.
- Charts keep their range chips, ‹ ›, zones, usual-range shading, tap, drag and pinch.
- The briefing keeps its 13 sections, its format and your history and questions.
- Settings text, empty states that say what to do next, and the blood reference note are unchanged.
- Cards removed in earlier versions stay removed, and the mood chart still shows one line at a time.

## Risks
- The shorter briefing depends on the model following the new length rules. If a section still runs long, it can be tightened further.
- The chart lines are written by the app, so a rare data shape may give a plain line where a sharper one would fit. Tell me which chart and what it said.

## Checked
- 210 of 210 tests pass in `tests/index.html`. 14 are new: no stats line, hint or how-to under a chart; short lines for HRV, form, readiness, progress and coffee; no counting or method words in any chart line; workout rows; no Recovery details card; the outline and coach card; the week summary; and the shorter briefing rules.
- I read every tab and several detail sheets at 360px, in light and dark, with a made-up athlete held in memory only. Each chart has one line, Today and Insights no longer repeat each other, there is no sideways scroll and no console errors.
- Settings shows Version 123.
- Not tested on the S24 itself.
