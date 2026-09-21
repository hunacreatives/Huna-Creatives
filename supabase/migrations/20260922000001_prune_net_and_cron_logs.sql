-- Disk IO Budget warning root cause: pg_net and pg_cron log tables grow
-- unbounded and were never pruned. net._http_response (every edge
-- function/webhook call fired via pg_net triggers) and cron.job_run_details
-- (every scheduled job run) had ballooned to ~89MB combined (~70% of total
-- DB size), driving constant autovacuum/WAL churn even during quiet traffic.
--
-- Daily cron: keep 3 days of HTTP response logs, 7 days of cron run history.
-- Both tables are pure logging, safe to prune -- nothing in the app reads
-- historical rows from either.

select cron.schedule(
  'prune-net-http-response-log',
  '0 4 * * *',
  $$
  delete from net._http_response
  where created < now() - interval '3 days';
  $$
);

select cron.schedule(
  'prune-cron-job-run-details',
  '0 4 * * *',
  $$
  delete from cron.job_run_details
  where end_time < now() - interval '7 days';
  $$
);
