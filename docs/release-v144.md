# VitalCore v144: No more choosing the monitor or the scale each time

## Before you use it
- Nothing to run in Supabase or the backend.
- Push from GitHub Desktop, then open the app online on your phone. Settings should show Version 144.
- Read from your monitor and Read from your scale still need one tap each time: Chrome does not let a web app read Bluetooth in the background.

## New
- After the first read, the app remembers the monitor and the scale on this phone. The next tap reads the same device with no Bluetooth list to pick from:
  - the monitor: tap Read from your monitor, then finish a reading or press the monitor's Bluetooth button. With no signal in 30 seconds: "The monitor did not answer. Finish a reading or press its Bluetooth button, then tap again."
  - the scale: tap Read from your scale, then step on. If it stays asleep: "Could not reach the scale. Step on it to wake it, then tap again."
- Use another monitor and Use another scale, under each button once one is remembered, open the Bluetooth list to pick a different one.
- Where Chrome cannot remember Bluetooth devices, the list opens every time as before and the Use another links stay hidden.
- The remembered devices stay on this phone: left out of backups, kept on restore, never synced.

## Tests
1138, all passing at phone width, also run as a Monday, a Thursday and a Sunday.
