# VitalCore

A personal health coach for endurance athletes, built on Claude.

VitalCore brings training, sleep, heart rate variability, daily mood check-ins, body weight, blood tests and injuries into one place. The app works out every number in code. Claude then explains what those numbers mean for you today, in a short morning briefing you can ask questions about.

Live app (invite only): https://pepperparker8.github.io/vitalcore/

## What it does
- **Today.** A recovery score built from your heart rate variability, resting heart rate and sleep, each compared with your own last 28 days. Next to it are a strain gauge and a sleep gauge. Tap any of them to see what is driving the number.
- **Daily briefing by Claude.** A short daily read on how you are, what to do today and what to watch. It also checks whether yesterday's advice worked. You can ask follow-up questions in plain language.
- **Adaptive training.** A 7-day outline with real sessions: warm-up, main set and cool-down, with heart rate, pace or power targets. It levels up when you cope and backs off when you miss sessions. It runs a gradual comeback after time off or an injury. Today's session can be sent to your watch.
- **Workout pages.** Heart rate trace, time in zones, heart rate drift, your hardest efforts and how long to recover.
- **Trends.** Interactive charts (pan, zoom, tap a day) for fitness and fatigue, training load, personal bests, heart rate variability, resting heart rate, breathing, mood, sleep and weight. Each chart has one plain line saying what it means.
- **Health.** Blood markers over time (mg/dL), your baselines, and a report you can share with a doctor or coach.
- **Log.** Check-in with face icons, sleep, workouts with effort and a pain score, body, blood, injuries and food by meal.

## How it uses Claude
- **The app does the maths and Claude explains it.** Scores, thresholds, training plans and correlations are computed in code. Claude gets a compact JSON snapshot and writes the story.
- **Messages API features in use:**
  - structured outputs with a JSON schema;
  - streaming, so the briefing appears as it is written;
  - the effort setting;
  - prompt caching for the system prompt and the data snapshot used in follow-up questions;
  - a fallback path if an option is rejected.
- **Guardrails in the prompt.** Claude never diagnoses. It never invents a pace, wattage or heart rate. It keeps advice inside an injury comeback and uses everyday words instead of jargon.
- **Model and keys.** The model id lives in one constant (`CLAUDE_MODEL` in `js/core.js`). Each person uses their own Anthropic API key, which stays on their phone.

## Built with Claude Code
The whole app was built with Claude Code by a founder who does not write code. It has gone through 125 versions. A test page in the browser runs over 230 automated tests (`tests/index.html`). Recent release notes are in `docs/`.

## How it is built
- **Code:** plain HTML, CSS and JavaScript, with no framework and no build step. Charts are drawn by hand on canvas.
- **Hosting and offline:** hosted on GitHub Pages. It installs as an app on Android and works offline.
- **Accounts and sync:** Supabase. Sign-in is by email code and invite only. Row-level security means each person reads and writes only their own rows.
- **Data in:** workouts and daily wellness from Intervals.icu (Garmin and other watches), and detailed sleep from Polar through a small backend on Vercel.

## Privacy
- Invite only. Nobody can create an account from the app.
- Each person sees only their own data.
- API keys never leave the phone.
- No analytics or trackers.

## Status
Private beta with invited users. Android Chrome first.

## Run the tests
```bash
python3 -m http.server 8118
```
Then open http://localhost:8118/tests/ and it shows "N of N passed".

## Not medical advice
VitalCore is a training and wellbeing tool. It does not diagnose or treat any condition.

Icons: [Tabler Icons](https://tabler.io/icons) (MIT).
