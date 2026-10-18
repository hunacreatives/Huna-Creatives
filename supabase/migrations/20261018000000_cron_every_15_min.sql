-- Two jobs ran every minute (2,880 edge-function calls a day), which pushed the
-- project over the free plan's log quota. Every 15 minutes is plenty for both:
-- scheduled invoices go out by date, announcements within 15 minutes of their time.
-- Run in the Supabase SQL editor. Safe to re-run.

select cron.alter_job(jobid, schedule := '*/15 * * * *')
from cron.job
where jobname in ('process-scheduled-invoices', 'publish-scheduled-announcements');

select jobname, schedule from cron.job order by jobname;
