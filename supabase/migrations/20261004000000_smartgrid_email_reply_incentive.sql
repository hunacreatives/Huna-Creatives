-- SmartGrid bills $5 when a hotel replies to our outreach email (sent from
-- alex@smartgridwestern.com), not when a caller captures an address.

alter table hub_project_leads
  add column if not exists email_reply_received boolean not null default false,
  add column if not exists email_reply_received_at timestamptz;

-- 'email' rows (address captured) stay as history but are no longer billable
alter table hub_project_commissions drop constraint if exists hub_project_commissions_milestone_check;
alter table hub_project_commissions add constraint hub_project_commissions_milestone_check
  check (milestone in ('email', 'reply', 'meeting', 'bill'));

create or replace function fn_credit_commission() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Reply to our outreach email: $5
  if (OLD.email_reply_received = false and NEW.email_reply_received = true) then
    insert into hub_project_commissions (project_id, lead_id, user_id, milestone, amount)
    values (NEW.project_id, NEW.id, coalesce(NEW.last_caller_id, auth.uid()), 'reply', 5.00);
  end if;

  -- Unticked by mistake: drop the $5 unless SmartGrid already paid it
  if (OLD.email_reply_received = true and NEW.email_reply_received = false) then
    delete from hub_project_commissions
    where lead_id = NEW.id and milestone = 'reply' and paid = false;
  end if;

  -- Meeting: $10 (false → true transition)
  if (OLD.meeting_scheduled = false and NEW.meeting_scheduled = true and NEW.last_caller_id is not null) then
    insert into hub_project_commissions (project_id, lead_id, user_id, milestone, amount)
    values (NEW.project_id, NEW.id, NEW.last_caller_id, 'meeting', 10.00);
  end if;

  -- Bill: $25 (false → true transition)
  if (OLD.bill_received = false and NEW.bill_received = true and NEW.last_caller_id is not null) then
    insert into hub_project_commissions (project_id, lead_id, user_id, milestone, amount)
    values (NEW.project_id, NEW.id, NEW.last_caller_id, 'bill', 25.00);
  end if;

  return NEW;
end;
$$;
