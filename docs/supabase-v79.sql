-- VitalCore v79: new synced columns. Run once in Supabase > SQL editor.
alter table checkins
  add column if not exists soreness smallint,
  add column if not exists coffee smallint,
  add column if not exists coffee_late boolean;
alter table sleep_logs
  add column if not exists bed text,
  add column if not exists wake text;
