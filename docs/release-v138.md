# VitalCore v138: Monitor readings save on their own

## Before you use it
- Nothing to run in Supabase or the backend.
- Push from GitHub Desktop, then open the app online on your phone. Settings should show Version 138.

## Changed
- Log > Body and blood pressure, Read from your monitor: every new reading is saved as soon as it is read, with no question to answer first. Health > Your baselines shows it straight away.
- A monitor with two users: when no user is set on this phone, the readings of the user of the newest reading are saved and that user is remembered. "Your user on the monitor" with 1 and 2 shows under the button; choosing the other user takes those readings back and saves the other user's. Settings keeps the same choice.
- When only the other user's readings came in, the toast says they were left out, so a read never ends silently.

## Tests
1006, all passing at phone width, also run as a Monday, a Thursday and a Sunday.
