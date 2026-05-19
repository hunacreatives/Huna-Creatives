-- Add columns to hub_time_off
alter table hub_time_off
  add column if not exists half_day boolean default false,
  add column if not exists half_day_period text,
  add column if not exists hr_notes text,
  add column if not exists forwarded_to_owner boolean default false;

-- Widen type constraint to include 'pto'
alter table hub_time_off drop constraint if exists hub_time_off_type_check;
alter table hub_time_off add constraint hub_time_off_type_check
  check (type in ('pto', 'vacation', 'sick', 'emergency', 'unpaid', 'other'));

-- Widen status constraint to include 'forwarded'
alter table hub_time_off drop constraint if exists hub_time_off_status_check;
alter table hub_time_off add constraint hub_time_off_status_check
  check (status in ('pending', 'forwarded', 'approved', 'rejected'));

-- Blackout dates table
create table if not exists hub_blackout_dates (
  id bigserial primary key,
  start_date date not null,
  end_date date not null,
  reason text,
  created_by uuid references hub_users(id),
  created_at timestamptz default now()
);

alter table hub_blackout_dates enable row level security;
create policy "All read blackout dates" on hub_blackout_dates for select using (auth.uid() is not null);
create policy "Admins manage blackout dates" on hub_blackout_dates for all using (is_hub_admin());
