# VitalCore v153: the AI runs on Claude Haiku 5.5

## Before you use it
- Nothing to run in Supabase or the backend.
- Push from GitHub Desktop, then open the app online on your phone. Settings should show Version 153.

## Changed
- The briefing, the questions under it and the key test in Settings use Claude Haiku 5.5 instead of Claude Sonnet 5.5.
- Why: cost. Haiku 5.5 is $0.10 in and $0.50 out per million tokens against $2 and $10 for Sonnet 5.5, about a twentieth. A briefing reads well under 100,000 tokens, so it stays on the lower price.
- Nothing else in the request changes: low effort, the JSON schema, the cached instructions, streaming and the fallbacks work the same on Haiku.
- The app still works the numbers out itself (Body, Load, the 7-day outline); the AI only explains them, so the call never depends on the model.

## Not yet checked
- How the wording compares with Sonnet. Read a few briefings and answers; if they feel thin, the model is one constant, `CLAUDE_MODEL` in core.js.

## Tests
1252, all passing at phone width, also run as a Monday, a Thursday and a Sunday.
