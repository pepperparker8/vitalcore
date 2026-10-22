# VitalCore v146: Connections and cloud in Settings, a shorter CLAUDE.md

## Before you use it
- Nothing to run in Supabase or the backend.
- Push from GitHub Desktop, then open the app online on your phone. Settings should show Version 146.

## New
- Settings > Connections and cloud lists each source with when it last worked: Cloud backup, Intervals.icu, Polar nights, Polar day and the Claude key. Green when it worked within 48 hours, amber when older or when the last try failed (with the reason and when it last worked), a ring when it is not set up, with what to add.
- Check the cloud tables asks Supabase for every table and column the app writes, without reading or changing any data. Each table shows Ready, Missing, or Missing with the column names, and the SQL file that adds it. The line above the list names every file still to run, oldest first. Needs you to be signed in and online.
- If the cloud still uses the old record key, a row says to run `docs/supabase-v124.sql`.

## Phone checklist (S24)
1. Settings > Connections and cloud: each connected source shows a recent time after a sync.
2. Tap Check the cloud tables: every row should read Ready. Run any SQL file it names in the Supabase SQL editor, then check again.
3. Turn on airplane mode and sync: the cloud row turns amber with the reason, and goes green after the next good sync.

## Under the hood
- `connMark` stores each source's last good time and last error (`connLog`, this phone only, left out of backups, kept on restore). `connProbe` asks each table with `limit=0`, then each column alone when a column is missing; `CONN_SQL` maps tables and columns to their SQL files.
- CLAUDE.md now holds the rules and the do-not-bring-back lists; what each release changed is in `docs/history.md` (up to v145) and the release notes.

## Tests
1181, all passing at phone width, also run as a Monday, a Thursday and a Sunday.
