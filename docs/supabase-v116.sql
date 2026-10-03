-- VitalCore v116: cloud backup for the detailed nights from Polar. Run once in Supabase > SQL editor.
-- One row per night (id 'pn-YYYY-MM-DD'); data holds the compact night (stages, score, hypnogram, cycles, HRV and breathing samples).
create table if not exists polar_nights (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  date date not null,
  data jsonb,
  updated_at timestamptz not null default now()
);
alter table polar_nights enable row level security;
drop policy if exists "own rows" on polar_nights;
create policy "own rows" on polar_nights for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create index if not exists polar_nights_date on polar_nights (user_id, date);
