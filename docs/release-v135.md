# VitalCore v135: Blood pressure from your monitor

Log > Body has a new button, Read from your monitor. It reads new blood pressure readings over Bluetooth from a monitor that uses the standard Bluetooth Blood Pressure service, such as an Omron. Each reading is saved as its own entry, with the time the monitor took it.

The cuff pulse is not saved as resting heart rate. It appears only in the toast after a read.

## Before you use it
- Use Chrome on Android. The button stays hidden in browsers that cannot use Bluetooth, such as Safari on the iPhone.
- First pairing: hold the monitor's Bluetooth button until P blinks, then tap Read from your monitor and pick the monitor in the chooser.
- Omron Connect can stay in use. The monitor hands each reading to whichever app reads it first, so a reading Omron Connect has already taken does not come to VitalCore, and the other way round.
- The app does not set the monitor's clock. If the clock is off, the toast says so: set the time on the monitor itself. Until then the app uses the phone's time for readings it receives.
- Nothing to run in Supabase or the backend.
- Push from GitHub Desktop, then open the app online on your phone. Settings should show Version 135.

## Changed
**Reading from the monitor**
- One tap connects, collects every new reading the monitor sends, and stops when the monitor disconnects or goes quiet for 8 seconds.
- Each reading becomes one entry, named after its date and time. A reading the monitor sends again is recognised as the same entry, not added twice.
- A reading that matches one you typed by hand on the same day is not added again.
- A reading you delete stays deleted when the monitor sends it again.
- The toast gives the count of readings added, the latest pulse, and Undo. It also reports readings taken while moving, readings with the cuff loose, readings skipped as outside the usual range, and readings over a year old that were left out.
- When a read fails, the toast says why: Bluetooth is off, the monitor could not be reached, or the monitor does not share readings this way. Closing the chooser saves nothing and shows no toast.
- The hint under the button disappears after the first read that works.

**Two users on one monitor**
- If a read brings readings from both users, the app asks which user you are and saves nothing until you choose.
- After that, only your readings are saved. You can change the user in Settings.
- The user choice is kept on this phone only and is left out of backups.

**Body log**
- The latest blood pressure shows with its time: "127/80 mmHg · 07:20".
- Typed blood pressure and resting heart rate are checked against the same ranges as monitor readings: systolic 60 to 250, diastolic 40 to 180, heart rate 30 to 200.
- Monitor readings count in the blood pressure words on Health, on Insights and in the report, the same as typed ones.

## Tests
996, all passing, also run as a Monday, a Thursday and a Sunday.
