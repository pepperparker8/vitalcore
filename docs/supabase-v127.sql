-- VitalCore v127: cloud backup for the band's day (steps, active time, calories, sitting, 24/7 heart rate) and for the
-- night cut. Run once in Supabase > SQL Editor (New query, paste all of this, Run), after supabase-v124.sql. Safe to run again.
-- It changes no data.
--
-- 1. polar_days: one row per day (id 'pd-YYYY-MM-DD'), keyed by (user_id, id) like every record table since v124,
--    own rows only for signed-in people, nothing for anyone signed out.
-- 2. polar_nights gains trim: the part of a night kept as sleep {s, e seconds from the night's start, by 'auto'|'you'|'off'}.
--    The night itself (data) stays as it was recorded.

create table if not exists polar_days (
  id text not null,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  date date not null,
  data jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
alter table polar_days enable row level security;
drop policy if exists "own rows" on polar_days;
create policy "own rows" on polar_days for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke all on polar_days from anon;
create index if not exists polar_days_date on polar_days (user_id, date);

alter table polar_nights add column if not exists trim jsonb;

-- Check: polar_days shows rls_on = true and the one policy; polar_nights lists trim.
select c.relname as table_name,
       c.relrowsecurity as rls_on,
       (select string_agg(policyname || ' (' || array_to_string(roles, ',') || ')', ', ') from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname) as policies,
       (select string_agg(column_name, ', ' order by ordinal_position) from information_schema.columns i where i.table_schema = 'public' and i.table_name = c.relname) as columns
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname in ('polar_days', 'polar_nights');
