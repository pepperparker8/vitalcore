-- VitalCore v98: food by meal. Run once in Supabase > SQL editor (after supabase-v88.sql).
-- meals holds {breakfast|snackAm|lunch|snackPm|dinner|unassigned: {kcal, protein}}; kcal and protein stay the day totals.
alter table food_logs add column if not exists meals jsonb;
