# VitalCore v143: An empty scale read says why, with details you can copy

## Before you use it
- Nothing to run in Supabase or the backend. `docs/supabase-v140.sql` is still needed if you have not run it yet.
- Push from GitHub Desktop, then open the app online on your phone. Settings should show Version 143.

## Fixed
- "No new weigh-ins on the scale" no longer covers every empty read. The toast now says what happened:
  - "The weight never settled (last 74.6 kg). Stand still until the scale shows it, then tap again." when weights came in but none was final;
  - "The scale sent no weigh-in. Tap, step on and stand still until the weight shows here." when nothing came at all;
  - "N weigh-ins you deleted left out" when the only weigh-ins were ones you deleted before.
- More weigh-ins now save:
  - a weight the scale marks final and stepped off in the same message is saved (before, it was dropped as stepped off);
  - a weight that holds within 0.05 kg for 8 seconds is saved even when the scale never marks it final;
  - a scale that sends its weight in its Bluetooth broadcast, not over a connection, is read from the broadcast.

## New
- Read details under Read from your scale, after each read: when the read ended and why, which service answered, the scale's memory, live messages, broadcasts, what happened to each weigh-in, and the last 12 messages as bytes. Copy puts it on the clipboard, so you can send it if a read still saves nothing. It names no brand and holds no weight history beyond this read.

## Tests
1124, all passing at phone width, also run as a Monday, a Thursday and a Sunday.
