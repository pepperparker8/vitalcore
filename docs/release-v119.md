# VitalCore v119: readable charts, bigger check-in, faster briefing

Every chart now pans, zooms and says what it means. The check-in buttons are easier to tap. The AI briefing starts showing in a few seconds instead of after a long blank wait.

## Before you use it
Nothing to run. No database change.

## New
- **Charts you can move.** Drag to pan, pinch or use the chips (1M, 3M, 6M, 1Y, All) to zoom, tap a day to inspect it. This works on every chart in Trends and Health and in the detail sheets.
- **Thresholds on the charts.** Shaded zones and lines show where a value turns good, borderline or high. Examples: the form zones (Fresh to Overreached), the score cuts on the readiness chart, the "Big jump" and "Too fast" lines on weekly load, your sleep goal on the sleep bars, the illness watch line on breathing, and the normal and borderline ranges on each blood marker (mg/dL).
- **What the chart means.** Under each chart: an "In view" line (average, high, low, days in range) and one plain sentence about the part you are looking at. Both update as you pan and zoom. "How to read this" explains the zones.
- **High, low and latest.** Each chart marks the high and the low in view and the latest value.
- **Detail sheets.** Tapping a gauge or factor on Today now opens a 30-day chart you can move, with the same zones as Trends.
- **Weight from your scale.** Weigh-ins that reach Intervals.icu from your scale's app now come in on every sync. The first sync on a phone also brings in the year before, so the weight chart has your history. A weight you typed yourself is never replaced.

## Changed
- **Check-in.** Each question is a full-width row with its label above. Every button is at least 48px tall and 44px wide on a 360px screen, and "Moderate" fits.
- **Faster briefing.** The AI is asked to think less (the app has already done the maths), and the briefing appears section by section while it is written. Follow-up questions also appear as they are written, and come back faster within 5 minutes of each other.
- **Less data sent to the AI.** Empty fields are left out. Written notes and the detailed night are sent for the last 7 days only, blood for the latest 3 tests, and the last 2 briefings. All 13 sections stay.
- **No source names.** Today, Log, Trends, Health, the sheets and the briefing no longer say where a value came from. Settings still names Polar and Intervals.icu, because that is where you connect them.
- **Weekly load, sleep, mindfulness, training and distance** are now bar charts on the same engine as the others.

## Removed
- In More charts: "Nervous System Recovery", "Training Fatigue" and "How Fresh You Are". They repeated the heart rate and form charts above.

## Kept
- All scores and verdicts are unchanged. The new thresholds only shade charts and write notes.
- The week field in the briefing still compares the last 7 days with the 7 before.
- Polar's own recovery verdicts are still not imported.

## Checked
- 47 of 47 tests pass in `tests/index.html` (27 new: chart zones and stats, the streamed briefing and its fallbacks with a canned reply, the size of the briefing data, no source names, the weight import).
- At 360px, light and dark: check-in buttons are 44px or more with no sideways scroll; every chart pans, zooms and inspects, and its "In view" line and sentence update; detail sheets open and close their chart cleanly; no console errors.
- The streamed briefing and a follow-up were checked with a canned reply. The real speed needs your own key: open Insights and press Generate.
- If only a few weights arrive, check that your scale's weights show in Intervals.icu > Wellness.
- Not tested on the S24 itself.
