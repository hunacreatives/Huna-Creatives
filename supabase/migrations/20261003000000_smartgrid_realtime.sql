-- Live updates for the SmartGrid Lead Tracker (admin-only; RLS still applies)
alter publication supabase_realtime add table hub_project_activity, hub_project_leads;

create index if not exists idx_hub_project_activity_project_action_created
  on hub_project_activity (project_id, action, created_at);
