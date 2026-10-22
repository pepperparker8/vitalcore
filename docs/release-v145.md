# VitalCore v145: Weight with body fat, power to weight, a fuller briefing

## Before you use it
- Nothing to run in Supabase or the backend.
- Push from GitHub Desktop, then open the app online on your phone. Settings should show Version 145.
- If Read from your scale still opens the Bluetooth list every time: on the phone open `chrome://flags`, turn on "Web Bluetooth new permissions backend" (`#enable-web-bluetooth-new-permissions-backend`), restart Chrome, then pick the scale once more. Without that flag Chrome on Android cannot remember a Bluetooth device for a web app.

## New
- Health > Your baselines > Weight: body fat is charted under the weight, on the same dates. The two charts drag, pinch and tap together.
- Under the body fat chart, one line on what the weight change in view is made of, once it is 1 kg or more: "Most of the 3.9 kg lost looks like fat. Muscle is holding." or "Part of the 3.9 kg lost may be muscle, an estimate. A slower loss and protein at each meal help keep it." It is an estimate from the scale and never changes a score.
- With a real power meter on your rides: "Threshold power 3.5 W/kg at 75.0 kg. On a climb, each kilogram less is worth about 1.3% if power holds." When you are losing weight fast it says instead that losing this fast can cost power.
- The AI briefing writes two or three sentences per section (the week three or four), so the full version has more in it; with too little data a section says so in one sentence.

## Tests
1156, all passing at phone width, also run as a Monday, a Thursday and a Sunday.
