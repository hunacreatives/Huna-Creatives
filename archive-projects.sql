-- Project archiving: archived projects disappear from active lists but their
-- workspaces stay openable from the Archived tab. Completed projects
-- auto-archive after 30 days of no activity.
-- Run once in the Supabase SQL editor BEFORE deploying the matching app code.
alter table public.hub_projects
  add column if not exists archived_at timestamptz;
