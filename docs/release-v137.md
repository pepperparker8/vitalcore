# VitalCore v137: Health rows that fit, the full briefing open

## Before you use it
- Nothing to run in Supabase or the backend.
- Push from GitHub Desktop, then open the app online on your phone. Settings should show Version 137.

## Changed
- Health > Your baselines: the label stays on one line and the line under the value wraps on the right, so a long blood pressure line ("Stage 2 range · average of 2 readings · 3 Oct") no longer covers the label.
- Insights: the briefing opens in full (The short version, Today, This week, What is working, Focus for the week). Show less folds it to the short version. A section the model left empty is still hidden.

## Tests
1002, all passing, also run as a Monday, a Thursday and a Sunday.
