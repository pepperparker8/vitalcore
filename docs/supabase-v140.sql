-- v140: impedance from the body scale (ohms), read over Bluetooth in Log > Body and blood pressure.
-- Run once in the Supabase SQL editor. Until it has run, a weigh-in with impedance fails to push.
alter table measurements add column if not exists imp integer;
