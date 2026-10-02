-- VitalCore v88: cloud backup for the food log. Run once in Supabase > SQL editor.
create table if not exists food_logs (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  date date not null,
  kcal int, protein int,
  updated_at timestamptz not null default now()
);
alter table food_logs enable row level security;
drop policy if exists "own rows" on food_logs;
create policy "own rows" on food_logs for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create index if not exists food_date on food_logs (user_id, date);
