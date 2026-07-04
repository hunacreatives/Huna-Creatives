-- Monthly deliverables quota + client-facing status page.
-- Run once in the Supabase SQL editor BEFORE deploying the matching app code.
-- Safe to run more than once.

-- Retainer quota: how many deliverables this project owes per month (null = off)
alter table public.hub_projects
  add column if not exists monthly_deliverables integer;

-- Client status page: unguessable share token (null = sharing disabled)
alter table public.hub_projects
  add column if not exists client_status_token text;

create unique index if not exists hub_projects_client_status_token_idx
  on public.hub_projects (client_status_token)
  where client_status_token is not null;

-- When a task was actually completed (drives the monthly delivered count)
alter table public.hub_project_tasks
  add column if not exists completed_at timestamptz;
