-- SmartGrid: retire hotels under 30 rooms from the calling list.
-- Retired leads leave callers' queues, the tracker's counts and Chris's dashboard,
-- but keep their call history. Clearing retired_at puts a lead back in the pool.
-- Hotels that already produced a result (email captured, reply, meeting, bill,
-- complete) are left alone, as are the ones with no room count.

alter table hub_project_leads
  add column if not exists retired_at timestamptz,
  add column if not exists retired_reason text;

-- Preview (run first): how many would be retired, by current status
-- select l.status, count(*)
-- from hub_project_leads l
-- join hub_projects p on p.id = l.project_id and p.project_name = 'SmartGrid Western'
-- where l.number_of_rooms < 30
--   and l.retired_at is null
--   and l.status <> 'complete'
--   and not coalesce(l.meeting_scheduled, false) and not coalesce(l.bill_received, false) and not coalesce(l.email_reply_received, false)
--   and not exists (select 1 from hub_project_commissions c where c.lead_id = l.id)
--   and not exists (
--     select 1 from hub_project_activity a
--     where a.entity_id::text = l.id::text and a.action = 'lead_outcome_logged'
--       and coalesce((a.meta->>'email_found')::boolean, false)
--   )
-- group by l.status order by 2 desc;

update hub_project_leads l
set retired_at = now(),
    retired_reason = 'Under 30 rooms',
    locked_by = null,
    locked_at = null
from hub_projects p
where p.id = l.project_id
  and p.project_name = 'SmartGrid Western'
  and l.number_of_rooms < 30
  and l.retired_at is null
  and l.status <> 'complete'
  and not coalesce(l.meeting_scheduled, false) and not coalesce(l.bill_received, false) and not coalesce(l.email_reply_received, false)
  and not exists (select 1 from hub_project_commissions c where c.lead_id = l.id)
  and not exists (
    select 1 from hub_project_activity a
    where a.entity_id::text = l.id::text and a.action = 'lead_outcome_logged'
      and coalesce((a.meta->>'email_found')::boolean, false)
  );
