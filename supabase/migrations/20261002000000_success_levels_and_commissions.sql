-- SmartGrid Western: 3-tier success tracking + hidden commission ledger
-- Adds operational tracking (meeting_scheduled, bill_received, next_call_goal)
-- Creates admin-only commission ledger with automatic server-side crediting

-- 1. Operational tracking columns (safe for callers to see, no dollar amounts)
alter table hub_project_leads
  add column meeting_scheduled boolean not null default false,
  add column meeting_scheduled_at timestamptz,
  add column bill_received boolean not null default false,
  add column bill_received_at timestamptz,
  add column next_call_goal text check (next_call_goal in ('email','meeting','bill') or next_call_goal is null);

create index idx_hub_project_leads_meeting_scheduled on hub_project_leads(project_id, meeting_scheduled);
create index idx_hub_project_leads_bill_received on hub_project_leads(project_id, bill_received);

-- 2. Secret commission ledger - only admin can read, trigger is only writer
create table hub_project_commissions (
  id bigint generated always as identity primary key,
  project_id bigint not null references hub_projects(id) on delete cascade,
  lead_id uuid not null references hub_project_leads(id) on delete cascade,
  user_id uuid not null references hub_users(id),
  milestone text not null check (milestone in ('email','meeting','bill')),
  amount numeric(10,2) not null,
  created_at timestamptz not null default now()
);

create index idx_hub_project_commissions_project_user on hub_project_commissions(project_id, user_id);
create index idx_hub_project_commissions_created_at on hub_project_commissions(created_at);

alter table hub_project_commissions enable row level security;

-- Only staff/admin can read - callers have no access at all
create policy "Staff read commissions" on hub_project_commissions
  for select to authenticated
  using (is_hub_staff());

-- 3. Server-side trigger for automatic commission crediting
-- Hardcoded amounts, fires only on false→true transitions to prevent double-crediting
create or replace function fn_credit_commission() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if NEW.last_caller_id is null then
    return NEW;
  end if;

  -- Email: $5 (transition from null/empty to value)
  if (OLD.email is null or OLD.email = '') and (NEW.email is not null and NEW.email != '') then
    insert into hub_project_commissions (project_id, lead_id, user_id, milestone, amount)
    values (NEW.project_id, NEW.id, NEW.last_caller_id, 'email', 5.00);
  end if;

  -- Meeting: $10 (false → true transition)
  if (OLD.meeting_scheduled = false and NEW.meeting_scheduled = true) then
    insert into hub_project_commissions (project_id, lead_id, user_id, milestone, amount)
    values (NEW.project_id, NEW.id, NEW.last_caller_id, 'meeting', 10.00);
  end if;

  -- Bill: $25 (false → true transition)
  if (OLD.bill_received = false and NEW.bill_received = true) then
    insert into hub_project_commissions (project_id, lead_id, user_id, milestone, amount)
    values (NEW.project_id, NEW.id, NEW.last_caller_id, 'bill', 25.00);
  end if;

  return NEW;
end;
$$;

create trigger trg_credit_commission
  after update on hub_project_leads
  for each row
  execute function fn_credit_commission();
