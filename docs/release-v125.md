# VitalCore v125: new icons and a WHOOP-style layout

Every icon in the app is now from Tabler, a cleaner line set. The screens are arranged the way WHOOP does it. The navigation bar floats above the page, with Log as its own round button. Each row under the gauges on Today has an icon, and its comparison sits under the value. Scores, data and sync are unchanged.

## Before you use it
1. **Push from GitHub Desktop, then open the app online on your phone** so the new version loads. Settings should show Version 125.

## Changed
- **New icons everywhere.** Tabler line icons replace the old set in the nav, sports, Log, Today, Insights and Settings. Several are better matches: a barbell for weights, a swimmer, a hiker, lungs for breathing, a coffee cup, a smiling face for check-in.
- **Floating navigation.** Today, Trends, Health and Insights sit in a rounded bar that floats above the page, and the page fades out behind it. Log is a round button beside the bar: dark in light mode, orange when you are on Log. The last card on every page still scrolls clear of the bar.
- **Rows under the gauges.** Each row now starts with its icon: sleep, form, check-in, HRV, resting heart rate, breathing, soreness, coffee and injury. The value sits on the right with the comparison under it, for example "▼ 3 under usual" or "▲ 0.2 over usual". The arrow takes the row's colour: green, amber or red.
- **Icon tiles.** Workouts in the training list have a larger rounded tile and a line arrow. Log sections have a tile that turns green when done and amber when part done. Their arrow turns when you open them.
- **Sport picker.** In Log > Workout each sport is a bordered tile with the icon above the name. The one you pick gets a dark border, not orange, so orange stays for the recovery ring, the nav, main buttons and personal bests.

## Kept
- The gauge order: Recovery, Strain, Sleep.
- Every score, chart line, the briefing, the outline and sync work as before.
- Check-in faces stay hand-drawn. No emoji.

## Risks
- **The floating bar covers a little more of the bottom of the screen.** Pages have extra room at the bottom so nothing is hidden. Tell me if anything still sits under it.
- **Found while testing, not changed here.** Nine planning tests fail when run mid-week, and they fail on Version 124 too. Most only assume a Monday. One shows a real gap. From a Thursday, someone who usually rides 120 minutes on Saturday gets a 25 to 30 minute easy ride that Saturday, and no long ride in the week. I left it for its own release, so the icon change stays separate.

## Checked
- 220 of 229 tests pass in `tests/index.html` today, a Thursday. The 8 new ones all pass. They cover the nav layout, no old icons left, an icon for every sport and row, the "under usual" wording, the row layout, the workout tile and arrow, and the version matching the app cache. The 9 failures are the planning tests above. The committed Version 124 fails the same 9 today.
- I looked at Today, Log, Trends, Health and Insights at 360px, light and dark, with a made-up athlete held in memory only. There is no sideways scroll, no console errors, and toasts sit above the nav.
- Settings shows Version 125.
- Not tested on the phone itself.

Icons: Tabler Icons (MIT), files and licence in `assets/icons/tabler/`.
