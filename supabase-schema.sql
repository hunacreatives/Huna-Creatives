-- Huna Creatives Hub Schema
-- Run this in Supabase SQL Editor to set up all required tables

-- ───────────────────────────────────────────────
-- USERS
-- ───────────────────────────────────────────────
create table if not exists hub_users (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  role text not null check (role in ('owner', 'admin', 'contractor')),
  avatar_url text,
  phone text,
  address text,
  emergency_contact text,
  slack_username text,
  department text,
  start_date date,
  status text not null default 'active' check (status in ('active', 'inactive')),
  hourly_rate numeric,
  currency text default 'PHP',
  payment_method text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ───────────────────────────────────────────────
-- ATTENDANCE
-- ───────────────────────────────────────────────
create table if not exists hub_attendance (
  id bigserial primary key,
  contractor_id uuid references hub_users(id) on delete cascade,
  date date not null,
  on_time timestamptz,
  off_time timestamptz,
  total_hours numeric,
  notes text,
  status text not null default 'missing_on' check (status in ('complete', 'missing_on', 'missing_off', 'manual_adjustment')),
  created_at timestamptz default now()
);

-- ───────────────────────────────────────────────
-- TIME OFF
-- ───────────────────────────────────────────────
create table if not exists hub_time_off (
  id bigserial primary key,
  contractor_id uuid references hub_users(id) on delete cascade,
  type text not null check (type in ('vacation', 'sick', 'emergency', 'unpaid', 'other')),
  start_date date not null,
  end_date date not null,
  reason text,
  attachment_url text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_notes text,
  created_at timestamptz default now()
);

-- ───────────────────────────────────────────────
-- REQUESTS
-- ───────────────────────────────────────────────
create table if not exists hub_requests (
  id bigserial primary key,
  contractor_id uuid references hub_users(id) on delete cascade,
  type text not null,
  title text not null,
  description text,
  attachment_url text,
  status text not null default 'open' check (status in ('open', 'in_review', 'resolved', 'closed')),
  admin_notes text,
  created_at timestamptz default now()
);

-- ───────────────────────────────────────────────
-- ANNOUNCEMENTS
-- ───────────────────────────────────────────────
create table if not exists hub_announcements (
  id bigserial primary key,
  title text not null,
  body text not null,
  priority text not null default 'normal' check (priority in ('normal', 'important', 'urgent')),
  category text not null default 'general' check (category in ('general', 'payroll', 'meeting', 'holiday', 'policy')),
  published boolean default true,
  posted_by uuid references hub_users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ───────────────────────────────────────────────
-- SOPs
-- ───────────────────────────────────────────────
create table if not exists hub_sops (
  id bigserial primary key,
  title text not null,
  category text not null,
  content text,
  video_url text,
  file_url text,
  published boolean default true,
  created_by uuid references hub_users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ───────────────────────────────────────────────
-- CLIENTS
-- ───────────────────────────────────────────────
create table if not exists hub_clients (
  id bigserial primary key,
  client_name text not null,
  assigned_contractor_id uuid references hub_users(id),
  role text,
  platform text,
  status text not null default 'active' check (status in ('active', 'inactive', 'paused', 'ended')),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ───────────────────────────────────────────────
-- ASSETS
-- ───────────────────────────────────────────────
create table if not exists hub_assets (
  id bigserial primary key,
  contractor_id uuid references hub_users(id) on delete cascade,
  platform text not null,
  account_name text not null,
  access_level text,
  status text not null default 'active' check (status in ('active', 'revoked', 'pending')),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ───────────────────────────────────────────────
-- PAYOUTS
-- ───────────────────────────────────────────────
create table if not exists hub_payouts (
  id bigserial primary key,
  contractor_id uuid references hub_users(id) on delete cascade,
  cutoff_start date not null,
  cutoff_end date not null,
  approved_hours numeric default 0,
  hourly_rate numeric default 0,
  base_pay numeric default 0,
  bonus numeric default 0,
  incentives numeric default 0,
  reimbursements numeric default 0,
  deductions numeric default 0,
  advances numeric default 0,
  penalties numeric default 0,
  final_payout numeric default 0,
  notes text,
  status text not null default 'draft' check (status in ('draft', 'reviewed', 'approved', 'paid')),
  locked boolean default false,
  payment_date date,
  created_by uuid references hub_users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ───────────────────────────────────────────────
-- DOC REQUESTS
-- ───────────────────────────────────────────────
create table if not exists hub_doc_requests (
  id bigserial primary key,
  contractor_id uuid references hub_users(id) on delete cascade,
  doc_type text not null,
  notes text,
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed', 'rejected')),
  admin_notes text,
  file_url text,
  file_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ───────────────────────────────────────────────
-- AUDIT LOG
-- ───────────────────────────────────────────────
create table if not exists hub_audit_log (
  id bigserial primary key,
  actor_id uuid references hub_users(id),
  actor_name text,
  action text not null,
  entity_type text,
  entity_id text,
  description text,
  metadata jsonb,
  created_at timestamptz default now()
);

-- ───────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ───────────────────────────────────────────────
alter table hub_users enable row level security;
alter table hub_attendance enable row level security;
alter table hub_time_off enable row level security;
alter table hub_requests enable row level security;
alter table hub_announcements enable row level security;
alter table hub_sops enable row level security;
alter table hub_clients enable row level security;
alter table hub_assets enable row level security;
alter table hub_payouts enable row level security;
alter table hub_doc_requests enable row level security;
alter table hub_audit_log enable row level security;

-- Admin/owner can read everything
create policy "Admins read all users" on hub_users for select using (
  exists (select 1 from hub_users u where u.id = auth.uid() and u.role in ('admin', 'owner'))
);
-- Contractors can read their own row
create policy "Contractors read own" on hub_users for select using (auth.uid() = id);
-- Admins can insert/update
create policy "Admins manage users" on hub_users for all using (
  exists (select 1 from hub_users u where u.id = auth.uid() and u.role in ('admin', 'owner'))
);
-- Allow first-time insert (signup flow)
create policy "Allow self insert on signup" on hub_users for insert with check (auth.uid() = id);

-- Generic admin-all / contractor-own policies for other tables
create policy "Admins all attendance" on hub_attendance for all using (
  exists (select 1 from hub_users u where u.id = auth.uid() and u.role in ('admin', 'owner'))
);
create policy "Contractors own attendance" on hub_attendance for all using (contractor_id = auth.uid());

create policy "Admins all timeoff" on hub_time_off for all using (
  exists (select 1 from hub_users u where u.id = auth.uid() and u.role in ('admin', 'owner'))
);
create policy "Contractors own timeoff" on hub_time_off for all using (contractor_id = auth.uid());

create policy "Admins all requests" on hub_requests for all using (
  exists (select 1 from hub_users u where u.id = auth.uid() and u.role in ('admin', 'owner'))
);
create policy "Contractors own requests" on hub_requests for all using (contractor_id = auth.uid());

create policy "All read announcements" on hub_announcements for select using (auth.uid() is not null);
create policy "Admins manage announcements" on hub_announcements for all using (
  exists (select 1 from hub_users u where u.id = auth.uid() and u.role in ('admin', 'owner'))
);

create policy "All read sops" on hub_sops for select using (auth.uid() is not null);
create policy "Admins manage sops" on hub_sops for all using (
  exists (select 1 from hub_users u where u.id = auth.uid() and u.role in ('admin', 'owner'))
);

create policy "Admins all clients" on hub_clients for all using (
  exists (select 1 from hub_users u where u.id = auth.uid() and u.role in ('admin', 'owner'))
);

create policy "Admins all assets" on hub_assets for all using (
  exists (select 1 from hub_users u where u.id = auth.uid() and u.role in ('admin', 'owner'))
);
create policy "Contractors own assets" on hub_assets for select using (contractor_id = auth.uid());

create policy "Admins all payouts" on hub_payouts for all using (
  exists (select 1 from hub_users u where u.id = auth.uid() and u.role in ('admin', 'owner'))
);
create policy "Contractors own payouts" on hub_payouts for select using (contractor_id = auth.uid());

create policy "Admins all docrequests" on hub_doc_requests for all using (
  exists (select 1 from hub_users u where u.id = auth.uid() and u.role in ('admin', 'owner'))
);
create policy "Contractors own docrequests" on hub_doc_requests for all using (contractor_id = auth.uid());

create policy "Admins all auditlog" on hub_audit_log for all using (
  exists (select 1 from hub_users u where u.id = auth.uid() and u.role in ('admin', 'owner'))
);
