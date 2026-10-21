# VitalCore v142: Scale reads that finish and save on their own

## Before you use it
- Nothing to run in the backend. If you have not run `docs/supabase-v140.sql` yet, run it in Supabase. Until you do, a weigh-in with body measurement saves on the phone but cannot sync.
- Push from GitHub Desktop, then open the app online on your phone. Settings should show Version 142.

## Fixed
- Read from your scale no longer stays on "Reading…":
  - connecting, each Bluetooth step and each write now has a time limit;
  - the whole read stops after 60 seconds at most;
  - if the scale cannot be reached, the toast says to step on it to wake it and tap again.

## New
- A weigh-in made right now is read live:
  - tap Read from your scale, then step on. The status line shows the weight while it settles, then "measuring…";
  - the weigh-in saves by itself, like a monitor reading. There is no Save step;
  - the read waits up to 20 seconds for you to step on;
  - a scale that also measures body composition waits up to 6 seconds for it after the weight settles. If you step off sooner, the weight is saved without it.
- Weigh-ins stored on the scale are still read in the same tap.
- A weigh-in that is both read live and stored on the scale (same weight, within 2 minutes) is saved once.

## Tests
1110, all passing at phone width, also run as a Monday, a Thursday and a Sunday.
