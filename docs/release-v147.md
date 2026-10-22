# VitalCore v147: IndexedDB storage and a faster start

## Before you use it
- Nothing to run in Supabase or the backend.
- Push from GitHub Desktop, then open the app online on your phone. Settings should show Version 147 with how long the app took to open.
- The first start moves your data from localStorage into IndexedDB by itself. Take a backup in Settings first if you want one to hand.

## New
- Your data is kept in IndexedDB instead of localStorage. localStorage stops at about 5 MB, which is why older briefings and Polar nights were trimmed when it was full; IndexedDB has room for years of them, and the write to storage no longer holds up the screen.
- The app should open faster: the scripts load without holding up the page, only Today and the open tab are drawn at start (Log, Trends, Health and Insights draw when you open them), and the splash goes as soon as the first screen is drawn instead of after a fixed 0.7 s.
- Settings shows how long this visit took to open, under the version.
- The app asks Chrome to keep its storage, so it is not cleared when the phone runs short of space.

## Phone checklist (S24)
1. Open the app: everything you had is there (check-ins, workouts, nights, briefings).
2. Log something, close Chrome from the recent apps straight away, open the app again: it is still there.
3. Settings: Version 147 · opened in N s.
4. Airplane mode: the app still opens from the service worker.

## Under the hood
- `persistLoad` reads IndexedDB (`vitalcore`, store `kv`, key `data`, one JSON string); a localStorage `vitalcore-data` copy is always the newer one, so it is read first, written to IndexedDB and removed.
- `flushSave` queues IndexedDB writes in order. On pagehide `flushLast` also writes an unsaved change to localStorage, since an IndexedDB write may not finish while the page closes; that copy is removed once IndexedDB holds the same save. Where IndexedDB will not open, localStorage is the store, as before (`lsSave`, with the old trims).
- All 25 app scripts load with `defer`. `initUI` no longer draws the Log and Insights lists; `refreshActive` draws the Log workout grid the first time Log opens. `_boot` keeps the visit's timing in memory only; the splash goes on the first frame, or after `TH.BOOT_SPLASH_MAX` where no frame is drawn (a page opened in the background).
- The tests page uses its own database (`vitalcore-test`), deleted after the storage tests.

## Tests
1198, all passing, also run as a Monday, a Thursday and a Sunday.
