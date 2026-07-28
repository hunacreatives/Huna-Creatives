-- Backfill Jesse's overtime as if he submitted + an admin approved it via the hub,
-- since he only posted "Overtime" / "3" in Slack (not parsed — see slack-attendance/index.ts).
-- Mirrors src/pages/hub/admin/requests/page.tsx: insert approved request, then sync hub_daily_hours.overtime_hours.

with jesse as (
  select id from hub_users where full_name ilike '%jesse%catedral%' limit 1
),
req as (
  insert into hub_overtime_requests (contractor_id, date, hours, reason, status, updated_at)
  select id, '2026-07-17', 3, 'Overtime logged in Slack', 'approved', now()
  from jesse
  returning contractor_id, date, hours
)
insert into hub_daily_hours (user_id, date, overtime_hours, updated_at)
select contractor_id, date, hours, now()
from req
on conflict (user_id, date)
do update set overtime_hours = excluded.overtime_hours, updated_at = excluded.updated_at;
