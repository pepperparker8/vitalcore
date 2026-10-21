# VitalCore v139: No Save for monitor readings

## Before you use it
- Nothing to run in Supabase or the backend.
- Push from GitHub Desktop, then open the app online on your phone. Settings should show Version 139.

## Changed
- Log > Body and blood pressure: "From your monitor" now sits at the top with Read from your monitor. A reading read this way is saved by itself; there is nothing else to tap.
- After a read, the line under the button stays: "Saved: 127/80 mmHg · 07:20. Nothing more to tap." (with the date when the reading is not from today, and how many earlier readings came with it). Undo clears it.
- The typed fields sit under "Or type a reading", and their button is now "Save what you typed", so it is clear Save is only for typed blood pressure, weight and resting heart rate.

## Tests
1009, all passing at phone width, also run as a Monday, a Thursday and a Sunday.
