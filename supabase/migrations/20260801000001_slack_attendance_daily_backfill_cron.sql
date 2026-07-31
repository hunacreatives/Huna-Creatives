-- Slack punches only reach hub_daily_hours via the real-time Slack Events
-- webhook or the payroll/attendance page's rolling 18h live re-sync. If the
-- webhook ever misses a punch (cold start, transient error), that day's
-- hours stay at zero permanently — nothing else re-checks it, which is why
-- admins have had to manually hit "Sync Slack" on payday.
--
-- This backfills the prior PH calendar day every morning (once all shifts,
-- including overnight ones ending ~7am, have closed out), self-healing any
-- gap without a person noticing and clicking sync.
select cron.schedule(
  'slack-attendance-daily-backfill',
  '0 2 * * *', -- 02:00 UTC = 10:00 AM Asia/Manila
  $$
  select net.http_post(
    url := 'https://aaqpwobmfofztcbbsonw.supabase.co/functions/v1/slack-attendance',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhcXB3b2JtZm9menRjYmJzb253Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyMDA1NTcsImV4cCI6MjA5NDc3NjU1N30.t7vFL_lHKX-WmXBPtrgsDMwztH5nfC_-0-fVQjEQ9bo'
    ),
    body := jsonb_build_object('date', to_char((now() AT TIME ZONE 'Asia/Manila')::date - 1, 'YYYY-MM-DD'))
  );
  $$
);
