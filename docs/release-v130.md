# VitalCore v130: one copy of each workout, and the route on a map

The same session can come in twice when both your watch and your band record it. Until now both copies counted everywhere: strain, load, the outline, levels, Trends, bests and the briefing. Now the app finds the pair and counts it once. Nothing is deleted.

A workout recorded with GPS now shows its route on the workout sheet, coloured like the trace, and can open it on a street map.

No score maths, thresholds or schedule rules changed. They only stop reading the hidden copy.

Next: sleep debt and naps (v131), then Insights (v132).

## Before you use it
- Nothing to run in Supabase and nothing to deploy on the backend.
- Push from GitHub Desktop, then open the app online on your phone. Settings should show Version 130.
- Older workouts from the last 90 days learn whether they have a route on the next sync.

## Changed
**A session recorded twice**
- Two imported workouts on the same day that overlap by at least half of the shorter one are treated as one session, whatever sport each is labelled.
- The more detailed copy counts. A route weighs most, then a power meter, then heart rate zones, cadence, distance, climb and heart rate. On a tie the longer copy counts.
- The other copy is hidden from every list and total, but stays stored.
- Anything you typed on the hidden copy (effort, sets, pain, pool, stroke) fills empty fields on the copy that counts. Your note stays where you wrote it, and nothing you typed is replaced.
- The workout sheet says "Also recorded by another device. Hidden so it counts once." with **Show both**. With both shown, each copy says "Recorded twice; both count." with **Hide the copy**. The choice syncs to your other phone, and Undo is in the message.
- Deleting the copy that counts deletes its hidden copy too, so the copy cannot pop up in its place. Undo brings both back.
- Workouts you logged by hand keep the existing "logged twice" strip with Combine and Keep both.

**Route**
- A new Route section on the workout sheet, for workouts with GPS only.
- The line is coloured like the chart under it: by heart rate, a run's pace against your threshold pace, or power from a real power meter. Anything else is one plain line.
- Start and finish marks, and a mark every 1, 2, 5 or 10 km so there are at most 12 labels.
- Tap the route to read that moment on the chart, and tap the chart to see where you were on the route.

**Street map**
- **Show map** draws the same route on an OpenStreetMap street map, with pinch, drag and zoom buttons.
- The map code is part of the app and loads only on that tap. Map pictures come from OpenStreetMap only after the tap and are never kept for offline use.
- Offline the sheet says "The map needs a connection.", and the route shape stays.
- The map is dimmed in dark mode, and the OpenStreetMap credit is always visible.

**Workout sheet**
- The sections sit in white cards, like the other sheets.

## Kept
- Your route stays in the phone's memory while the sheet is open (the last 10 workouts). It is never saved, synced, backed up or sent to the briefing.
- Data screens still never name a data source. The map's OpenStreetMap credit is a required credit, not a data source.
- The old readiness, Body, Load and Mind maths, and the outline's rules.
- Typed values always win.

## Risks
- Fitness and fatigue come from Intervals.icu, which still counts a double. That stays until one copy is removed there, or the band's activity import is turned off there.
- A double without a start time is not found, so both copies still count.
- The map needs OpenStreetMap's servers. If they are slow or refuse, the route shape still shows.

## Checked
- 692 of 692 tests pass in `tests/index.html`. The new ones cover:
  - pairs: overlap at half and just under, any sport, no start time, hand-logged workouts and example data never paired, three copies as one session;
  - which copy counts: route first, then detail, duration and id; Show both;
  - every reader counting a doubled ride once (load, strain, the outline, levels, bounce-back, fuel, Trends, bests, Log and Today lists, the briefing, the report), and a scan of the code for any other reader;
  - typed values filled in once, never over your own, the note never copied;
  - delete and Undo with a hidden copy;
  - the route fields from the import;
  - the route: both stream shapes, bad points dropped, km marks, colours, the linked dot, no section without GPS;
  - the map with a stand-in map library: nothing requested before Show map, the map address, credit and zoom limit, removed on close, the offline note;
  - the security policy holding the map address, no source names, nothing wider than 360px.
- The suite also passes run as a Monday, a Thursday and a Sunday through the `?day=` setting.
- I looked at the workout sheet at 360px in light and dark with a made-up ride held in memory only: the hidden-copy line in both states, the route, and the street map open with real OpenStreetMap pictures, once. Nothing was saved.
- Settings shows Version 130, and the new cache replaces the old one on update.
- Not tested on the phone itself.
