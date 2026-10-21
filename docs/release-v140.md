# VitalCore v140: Weigh-ins from your scale

## Before you use it
- Run `docs/supabase-v140.sql` once in the Supabase SQL editor. It adds the `imp` column (impedance in ohms) to `measurements`. Until it has run, a weigh-in that carries impedance fails to push.
- Nothing to change in the backend.
- Push from GitHub Desktop, then open the app online on your phone. Settings should show Version 140.

## New
- Log > Body and blood pressure has a "From your scale" block with Read from your scale, under the monitor block. Step on the scale to wake it, then tap and pick it in Chrome's list. Every new weigh-in is saved by itself, with its own time. The line under the button stays: "Saved: 74.6 kg · 07:05. Nothing more to tap." Undo takes the read back.
- Each weigh-in is stored once. A weight you typed that day within 0.3 kg, or a weigh-in already saved, is skipped. A weigh-in you deleted stays deleted. The copy that came through Intervals.icu for the same day gives way to the scale's own record. A weigh-in more than 5 kg from your latest weight is taken as someone else's and left out.
- Scales that measure body composition also send impedance. With your height and age in Settings, Health > Your baselines adds BMI, Body fat, Fat-free mass, Skeletal muscle, Body water and Resting energy, each against your usual. They are estimates from published equations (Sun 2003, Janssen 2000, Katch-McArdle) and are best read as a trend. They never change Recovery, the training outline, the fuel targets or the briefing.
- BMI shows for any weight once your height is set.

## Not included
- Bone mass, visceral fat, protein, metabolic age, body type and the scale app's body score. Their formulas belong to the scale's maker and are not published.
- The Xiaomi Body Composition Scale S400 and newer scales paired with Xiaomi Home. They send encrypted data that a browser cannot read. Their weigh-ins still arrive through Intervals.icu.

## Not yet checked
- Your scale's model, and a read from the real scale. If the button says the scale does not share weigh-ins this way, it is an encrypted model; nothing else changes.

## Tests
1063, all passing at phone width, also run as a Monday, a Thursday and a Sunday.
