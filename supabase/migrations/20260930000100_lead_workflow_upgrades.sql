-- SmartGrid Western lead workflow upgrades
-- Adds follow-up email tracking, per-caller attempt counters, and last-caller tracking

alter table hub_project_leads
  add column follow_up_email_sent boolean not null default false,
  add column follow_up_email_sent_at timestamptz,
  add column caller_attempts jsonb not null default '{}'::jsonb,
  add column last_caller_id uuid references hub_users(id),
  add column last_worked_at timestamptz;

create index idx_hub_project_leads_follow_up_pending on hub_project_leads(project_id, follow_up_email_sent) where follow_up_email_sent = false and email is not null;
create index idx_hub_project_leads_last_caller on hub_project_leads(last_caller_id);
create index idx_hub_project_leads_last_worked on hub_project_leads(project_id, last_worked_at);
