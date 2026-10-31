# VitalCore v154: two briefing rules tightened for Haiku

## Before you use it
- Nothing to run in Supabase or the backend.
- Push from GitHub Desktop, then open the app online on your phone. Settings should show Version 154.

## Changed
- The briefing names each day of the outline by its own session and effort, and never calls a day hard, a key session or a rest day unless the outline does.
- The watch's aerobic fitness estimate is called that in the briefing, never Fitness alone, since Fitness on screen is the training load.

## Why
- Haiku 5.5 and Sonnet 5.5 each wrote the briefing twice from the same snapshot (27 Oct). Neither invented a number, changed the call or diagnosed. Haiku once called Saturday's long easy ride "a hard day" and once called the aerobic estimate "Fitness". Sonnet ran past the sentence limits in today and week more often than Haiku.
- A Haiku briefing cost about $0.001 to $0.002 (about 10,000 tokens in, 500 to 2,000 out) and took 5 to 10 seconds.

## Not yet checked
- Haiku briefings written with the two new rules.

## Tests
1253, all passing at phone width, also run as a Monday, a Thursday and a Sunday.
