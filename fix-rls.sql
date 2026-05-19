drop policy if exists "Admins read all users" on hub_users;
drop policy if exists "Admins manage users" on hub_users;
drop policy if exists "Admins all attendance" on hub_attendance;
drop policy if exists "Admins all timeoff" on hub_time_off;
drop policy if exists "Admins all requests" on hub_requests;
drop policy if exists "Admins manage announcements" on hub_announcements;
drop policy if exists "Admins manage sops" on hub_sops;
drop policy if exists "Admins all clients" on hub_clients;
drop policy if exists "Admins all assets" on hub_assets;
drop policy if exists "Admins all payouts" on hub_payouts;
drop policy if exists "Admins all docrequests" on hub_doc_requests;
drop policy if exists "Admins all auditlog" on hub_audit_log;

create or replace function is_hub_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from hub_users where id = auth.uid() and role in ('admin', 'owner')
  )
$$;

create policy "Admins read all users" on hub_users for select using (is_hub_admin());
create policy "Admins manage users" on hub_users for all using (is_hub_admin());

create policy "Admins all attendance" on hub_attendance for all using (is_hub_admin());
create policy "Admins all timeoff" on hub_time_off for all using (is_hub_admin());
create policy "Admins all requests" on hub_requests for all using (is_hub_admin());
create policy "Admins manage announcements" on hub_announcements for all using (is_hub_admin());
create policy "Admins manage sops" on hub_sops for all using (is_hub_admin());
create policy "Admins all clients" on hub_clients for all using (is_hub_admin());
create policy "Admins all assets" on hub_assets for all using (is_hub_admin());
create policy "Admins all payouts" on hub_payouts for all using (is_hub_admin());
create policy "Admins all docrequests" on hub_doc_requests for all using (is_hub_admin());
create policy "Admins all auditlog" on hub_audit_log for all using (is_hub_admin());
