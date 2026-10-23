# VitalCore v151: Log by time of day, a Body fat chart, body composition in the briefing

## Before you use it
- Nothing to run in Supabase or the backend.
- Push from GitHub Desktop, then open the app online on your phone. Settings should show Version 151.

## New
- Log is grouped by when you fill it in:
  - Morning: the check-in (how you feel, body feel, sore area, symptoms) and sleep.
  - Through the day: workout, mindfulness and food.
  - Afternoon and evening: a new Coffee and reflection card with your cups, Last cup after 14:00, Grateful for, What gave me energy and What drained me. Before 14:00 its header says "From 14:00"; it saves at any time.
  - Now and then: unchanged.
- The two cards fill the same day's check-in. Saving the morning part keeps what you saved in the afternoon, and the other way round. Nothing moves in the cloud.
- The coffee sheet's link opens the new card.
- Trends: a Body fat card under Body weight, on the same range bar. It shows fat % with its 7-day average, fat-free mass in the header, and one line such as "18.3 %, down 0.5 points since Monday. Fat-free mass holding." It appears once two weigh-ins have body measurement.
- The AI briefing now reads your scale's body composition: the latest fat %, fat-free mass and skeletal muscle, how they moved over 4 weeks, what share of a weight change was fat, and power per kilogram with a power meter. It treats them as estimates read over weeks, never a diagnosis. When fat-free mass falls during a loss it ties that to protein and strength work. When composition moved, the week section runs 4 to 5 sentences and the focus up to 4.
- Body, Load, the 7-day outline and the fuel targets still never read the scale estimates.

## Under the hood
- `TH.EVE_FROM` (14) replaces `TH.REFL_FROM`; it opens the card and is the late-cup cut-off.
- `insComp()` builds `health.bodyComp` from the published equations already used on Health (`scComp`), with `TH.COMP_DAYS`, `TH.COMP_SPAN` and `TH.COMP_MOVE_PCT`. The heavy-month briefing data stays under 16,000 characters with it.

## Tests
1251, all passing at phone width, also run as a Monday, a Thursday and a Sunday.
