# VitalCore v148: the profile merges field by field

## Before you use it
- Nothing to run in Supabase or the backend. The change times travel inside the profile row the app already syncs.
- Push from GitHub Desktop, then open the app online on each phone. Settings should show Version 148.

## New
- Two phones editing the profile no longer lose a change. Before, the phone that uploaded last replaced the whole profile, so a sleep goal set on one phone could undo a plan day set on the other. Now each field merges on its own: your goals, each day of the weekly plan, each date of your naps, your aim, wake time, custom exercises and the rest.
- A field changed on only one phone takes that change. A field changed on both before they synced keeps the later change.
- A nap taken off on one phone is taken off on the other too.

## Phone checklist (S24)
1. Change the sleep goal on one phone and a plan day on another, then sync both, then sync the first again: both phones show both changes.
2. Add a nap on each phone on different days: both naps stay.

## Under the hood
- `profPaths` (core.js) splits the profile into fields, with `plan` and `naps` one level deeper (`PROF_DEEP`); `profBuild` puts it back together.
- `markProfile` stamps the fields that changed since the last stamp in `profile.ft {field: ms}`, which syncs inside the profile. `profSnap` (local only, left out of backups) holds the fields as the cloud last held them (`b`) and as last stamped (`m`).
- `profPull` (sync.js) runs on every pull, waiting change or not, since phone clocks differ. A field only one side changed since `b` takes that side; changed on both, the newer stamp wins, else the newer profile time. With no `b` (the first sync after this update, a new account, a restore) the v124 rule holds: a waiting change on this phone wins, else the newer profile. When the merge holds something the cloud lacks, it is sent; otherwise nothing is waiting.
- A phone still on v147 sends its whole profile without stamps; its changes are still taken field by field against `b`.
- Stamps older than `TH.PROF_FT_DAYS` (60) are dropped at start.

## Tests
1213, all passing, also run as a Monday, a Thursday and a Sunday.
