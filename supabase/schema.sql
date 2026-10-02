-- VitalCore database setup. Paste into Supabase > SQL Editor > Run. Safe to run more than once.
-- Every table is locked to the signed-in user (row level security).
-- "id" is created by the app so a log entry is never duplicated when it syncs twice.

create table if not exists profile (
  user_id uuid primary key default auth.uid() references auth.users on delete cascade,
  data jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

create table if not exists checkins (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  date date not null,
  energy int check (energy between 1 and 4),
  mood int check (mood between 1 and 4),
  stress int check (stress between 1 and 4),
  motivation int check (motivation between 1 and 4),
  mindful_min int default 0,
  gratitude text,
  reflection text,
  updated_at timestamptz not null default now()
);

create table if not exists workouts (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  date date not null,
  type text not null,
  dist_km numeric,
  dur_min int,
  rpe int check (rpe between 1 and 5),
  notes text,
  sets jsonb,
  sub jsonb,
  updated_at timestamptz not null default now()
);
alter table workouts add column if not exists sets jsonb;
alter table workouts add column if not exists sub jsonb;
alter table checkins add column if not exists reflection text;

create table if not exists sleep_logs (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  date date not null,
  score int check (score between 0 and 100),
  deep_h int, deep_m int, rem_h int, rem_m int,
  rested int,
  updated_at timestamptz not null default now()
);

create table if not exists measurements (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  date date not null,
  bp_sys int, bp_dia int, weight numeric, hr int,
  updated_at timestamptz not null default now()
);

create table if not exists blood_logs (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  date date not null,
  glucose numeric, chol numeric, uric numeric, hdl numeric, ldl numeric,  -- all mg/dL
  updated_at timestamptz not null default now()
);

create table if not exists injuries (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  date date not null,
  part text not null,
  sev int check (sev between 1 and 3),
  notes text,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

-- Daily briefing history (one per day)
create table if not exists insights (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  date date not null,
  time text,
  rendered text,
  primary key (user_id, date)
);

create table if not exists food_logs (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  date date not null,
  kcal int, protein int,
  updated_at timestamptz not null default now()
);

-- Privacy lock: each user can only see and change their own rows.
do $$
declare t text;
begin
  foreach t in array array['profile','checkins','workouts','sleep_logs','measurements','blood_logs','injuries','insights','food_logs']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "own rows" on %I', t);
    execute format('create policy "own rows" on %I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;

create index if not exists checkins_date on checkins (user_id, date);
create index if not exists workouts_date on workouts (user_id, date);
create index if not exists sleep_date on sleep_logs (user_id, date);
create index if not exists meas_date on measurements (user_id, date);
create index if not exists food_date on food_logs (user_id, date);
create index if not exists blood_date on blood_logs (user_id, date);
