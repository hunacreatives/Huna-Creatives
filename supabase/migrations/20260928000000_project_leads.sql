-- SmartGrid Western lead tracker
-- New table hub_project_leads for tracking CHLA property records through the cold calling workflow.
-- Uses existing RLS helpers is_hub_staff() and is_assigned_to_project() for access control.

create table if not exists hub_project_leads (
  id uuid primary key default gen_random_uuid(),
  project_id bigint not null references hub_projects(id) on delete cascade,

  -- Original CHLA columns (18 total)
  account_name text,
  number_of_rooms int,
  mailing_street text,
  mailing_city text,
  mailing_state text,
  mailing_zip text,
  phone text,
  physical_street text,
  physical_city text,
  physical_state text,
  county text,
  primary_contact text,
  primary_contact_title text,
  email text,
  operation_type text,
  restaurant_on_site text,
  cabbi_member text,
  notes text,

  -- Tracking columns
  status text not null default 'new' check (status in ('new', 'calling', 'complete', 'attempted')),
  assigned_to uuid references hub_users(id),
  locked_by uuid references hub_users(id),
  locked_at timestamptz,
  attempts_count int not null default 0,
  last_contact_at timestamptz,
  email_found bool not null default false,
  phone_found bool not null default false,
  contact_name_found bool not null default false,
  callback_date date,
  callback_time text,
  outcome text,
  call_notes text,
  disqualification_reason text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_hub_project_leads_project_id on hub_project_leads(project_id);
create index idx_hub_project_leads_status on hub_project_leads(status);
create index idx_hub_project_leads_assigned_to on hub_project_leads(assigned_to);
create index idx_hub_project_leads_locked_by on hub_project_leads(locked_by);

-- Enable RLS
alter table hub_project_leads enable row level security;

-- RLS: staff can read all leads for their hub; contractors can read only leads in projects they're assigned to
create policy "Assigned contractors read project leads" on hub_project_leads
  for select to authenticated
  using (is_hub_staff() or is_assigned_to_project(project_id));

-- RLS: staff can insert/update all; contractors can only modify leads in their assigned projects
create policy "Assigned contractors modify project leads" on hub_project_leads
  for update to authenticated
  using (is_hub_staff() or is_assigned_to_project(project_id))
  with check (is_hub_staff() or is_assigned_to_project(project_id));

create policy "Assigned contractors insert project leads" on hub_project_leads
  for insert to authenticated
  with check (is_hub_staff() or is_assigned_to_project(project_id));
