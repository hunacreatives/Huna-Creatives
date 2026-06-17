alter table hub_project_contractors
  add column if not exists exclude_from_payout boolean not null default false;
