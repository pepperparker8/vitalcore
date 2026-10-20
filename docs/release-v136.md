# VitalCore v136: Blood pressure easy to find in Log

## Before you use it
- Nothing to run in Supabase or the backend.
- Push from GitHub Desktop, then open the app online on your phone. Settings should show Version 136.

## How to enter blood pressure
- Log > Body and blood pressure. Type the two numbers and tap Save results, or tap Read from your monitor.
- First time with the monitor: hold its Bluetooth button until P blinks, tap Read from your monitor, then pick the monitor in Chrome's list.
- After that: take a reading on the monitor, then tap Read from your monitor. New readings are saved with their time.
- Chrome cannot read the monitor in the background, so each read needs a tap.

## Changed
- The Log section is named Body and blood pressure, and its summary shows the latest blood pressure.
- Read from your monitor now shows while the phone's Bluetooth is off, with a line to turn it on. Before, the button was hidden.
- Where the browser has no Bluetooth, a line says to type the reading instead.

## Tests
1000, all passing, also run as a Monday, a Thursday and a Sunday.
