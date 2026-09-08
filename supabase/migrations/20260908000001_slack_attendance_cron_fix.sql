-- The slack-attendance-daily-backfill cron (20260801000001) has never run
-- successfully: it authenticates with the anon key, and slack-attendance
-- rejects anything that isn't a signed-in hub user or the service role. So
-- the "self-healing" backfill 401s every night and attendance only ever
-- updates when an admin manually clicks "Sync Slack".
--
-- This re-schedules it with the Vault service-role key (the pattern the
-- working invoice/reminder crons use) and adds an hourly sync of the
-- current PH day so the board stays current, not just healed at payroll.
--
-- Run once in the Supabase SQL editor. Safe to run more than once.

do $$
begin
  perform cron.unschedule('slack-attendance-daily-backfill');
exception when others then null;
end $$;

do $$
begin
  perform cron.unschedule('slack-attendance-hourly-today');
exception when others then null;
end $$;

-- Yesterday, once all shifts (incl. overnight ~7am close-outs) have ended.
select cron.schedule(
  'slack-attendance-daily-backfill',
  '0 2 * * *', -- 02:00 UTC = 10:00 Asia/Manila
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'SUPABASE_URL') || '/functions/v1/slack-attendance',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'SUPABASE_SERVICE_ROLE_KEY')
    ),
    body := jsonb_build_object('date', to_char((now() AT TIME ZONE 'Asia/Manila')::date - 1, 'YYYY-MM-DD'))
  );
  $$
);

-- Current PH day, every hour, so the live board reflects punches without
-- anyone hitting sync.
select cron.schedule(
  'slack-attendance-hourly-today',
  '7 * * * *', -- 7 past every hour
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'SUPABASE_URL') || '/functions/v1/slack-attendance',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'SUPABASE_SERVICE_ROLE_KEY')
    ),
    body := jsonb_build_object('date', to_char((now() AT TIME ZONE 'Asia/Manila')::date, 'YYYY-MM-DD'))
  );
  $$
);
