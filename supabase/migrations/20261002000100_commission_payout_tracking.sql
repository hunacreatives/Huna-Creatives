-- Add payout tracking to commission ledger
alter table hub_project_commissions
  add column paid boolean not null default false,
  add column paid_at timestamptz;

-- Index for pending commissions queries
create index idx_hub_project_commissions_paid_status on hub_project_commissions(project_id, paid, created_at);
