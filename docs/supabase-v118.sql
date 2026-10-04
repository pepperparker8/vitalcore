-- VitalCore v118: check-in symptoms, sore area and body feeling. Run once in Supabase > SQL editor (after supabase-v116.sql).
-- symptoms: 0 none, 1 above the neck, 2 below the neck. sore_area: comma list (legs,hips,back,upper,core). body_feel: 1 wrecked to 5 strong.
-- Until this has run, a check-in that uses one of these fields does not sync (check-ins without them keep syncing).
alter table checkins add column if not exists symptoms smallint;
alter table checkins add column if not exists sore_area text;
alter table checkins add column if not exists body_feel smallint;
