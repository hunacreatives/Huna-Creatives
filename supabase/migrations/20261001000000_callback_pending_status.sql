-- Add callback_pending status to hub_project_leads
alter table hub_project_leads drop constraint hub_project_leads_status_check;
alter table hub_project_leads add constraint hub_project_leads_status_check
  check (status in ('new', 'calling', 'complete', 'attempted', 'callback_pending'));

-- Index for efficient callback date queries
create index idx_hub_project_leads_callback_pending on hub_project_leads(assigned_to, callback_date)
  where status = 'callback_pending';
