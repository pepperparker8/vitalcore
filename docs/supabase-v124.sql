-- VitalCore v124: each person sees only their own rows, and nobody signed out sees anything.
-- Run once in Supabase > SQL Editor (New query, paste all of this, Run). Safe to run again. It changes no data.
-- If it stops with an error, nothing was changed: send the message along.
--
-- 1. Every VitalCore table: row-level security on, any older policy removed, one policy "own rows" for signed-in
--    people (they read and write only rows with their own user_id), and no access at all for anyone signed out.
-- 2. Record tables are keyed by (user_id, id) instead of id alone, so two people can each have a record named
--    'sl-2026-10-04' (sleep, check-ins, weights, food and nights use the date in their id).
-- 3. polar_tokens (the backend's Polar login): no access from the app at all; only the backend's service key reads it.
-- The result at the end lists every table in the public schema. Each VitalCore table should show
-- rls_on = true, policies = own rows (authenticated), signed_out_can_read = false.

do $$
declare
  t text;
  rel regclass;
  p record;
  c record;
  has_pk boolean;
  has_pair boolean;
begin
  foreach t in array array['checkins','workouts','sleep_logs','measurements','blood_logs','injuries','food_logs','polar_nights','profile','insights'] loop
    rel := to_regclass(format('public.%I', t));
    if rel is null then
      raise notice 'skipped %: no such table (fine for food_logs or polar_nights if you never set them up)', t;
      continue;
    end if;

    -- 1. own rows only
    execute format('alter table public.%I enable row level security', t);
    for p in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
      execute format('drop policy %I on public.%I', p.policyname, t);
    end loop;
    execute format('create policy "own rows" on public.%I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
    execute format('revoke all on public.%I from anon', t);

    -- 2. key by person and id (profile is keyed by user_id, insights by user_id and date: both already per person)
    if t in ('profile', 'insights') then continue; end if;
    has_pair := false;
    for c in
      select con.conname,
             array(select a.attname::text from pg_attribute a
                   where a.attrelid = con.conrelid and a.attnum = any(con.conkey) order by a.attname::text) as cols
      from pg_constraint con
      where con.conrelid = rel and con.contype in ('p', 'u')
    loop
      if c.cols = array['id'] then
        execute format('alter table public.%I drop constraint %I', t, c.conname);
      elsif c.cols = array['id', 'user_id'] then
        has_pair := true;
      end if;
    end loop;
    if not has_pair then
      select exists(select 1 from pg_constraint where conrelid = rel and contype = 'p') into has_pk;
      if has_pk then
        execute format('alter table public.%I add constraint %I unique (user_id, id)', t, t || '_user_id_id_key');
      else
        execute format('alter table public.%I add primary key (user_id, id)', t);
      end if;
    end if;
  end loop;

  -- 3. the backend's Polar tokens
  if to_regclass('public.polar_tokens') is not null then
    execute 'alter table public.polar_tokens enable row level security';
    for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'polar_tokens' loop
      execute format('drop policy %I on public.polar_tokens', p.policyname);
    end loop;
    execute 'revoke all on public.polar_tokens from anon, authenticated';
  end if;
end $$;

-- the check
select c.relname as table_name,
       c.relrowsecurity as rls_on,
       coalesce((select string_agg(p.policyname || ' (' || array_to_string(p.roles, ',') || ')', '; ')
                 from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname), 'none') as policies,
       (select string_agg(a.attname::text, ', ' order by array_position(con.conkey, a.attnum))
          from pg_constraint con join pg_attribute a on a.attrelid = con.conrelid and a.attnum = any(con.conkey)
         where con.conrelid = c.oid and con.contype = 'p') as row_key,
       has_table_privilege('anon', c.oid, 'select') as signed_out_can_read
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
order by 1;
