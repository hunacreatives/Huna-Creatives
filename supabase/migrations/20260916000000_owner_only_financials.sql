-- Lock financial and other sensitive data down to the owner role.
--
-- Context: admin and hr could read (and in most cases write) invoice logs,
-- client payments, revenue figures, contract pricing, employee e-sign
-- contracts, and performance reviews. Payroll (hub_payroll_*, hub_rate_history)
-- is DELIBERATELY left untouched -- admin/hr keep that, per product decision.
--
-- hub_project_payments and hub_project_costs still need to be readable by a
-- contractor for their OWN assigned project (used to compute their payout
-- share on the contractor projects page) -- narrowed to owner + assigned
-- contractor, not thrown open to all staff.

-- ---------------------------------------------------------------------------
-- Invoice log / receipts / payment links
-- ---------------------------------------------------------------------------

drop policy if exists "admins manage invoice log" on hub_invoice_log;
create policy "owner manages invoice log" on hub_invoice_log
  for all to authenticated
  using (exists (select 1 from hub_users where id = auth.uid() and role = 'owner'))
  with check (exists (select 1 from hub_users where id = auth.uid() and role = 'owner'));

drop policy if exists "admins manage receipt log" on hub_payment_receipt_log;
create policy "owner manages receipt log" on hub_payment_receipt_log
  for all to authenticated
  using (exists (select 1 from hub_users where id = auth.uid() and role = 'owner'))
  with check (exists (select 1 from hub_users where id = auth.uid() and role = 'owner'));

drop policy if exists "admins manage invoice payment links" on hub_invoice_payment_links;
create policy "owner manages invoice payment links" on hub_invoice_payment_links
  for all to authenticated
  using (exists (select 1 from hub_users where id = auth.uid() and role = 'owner'))
  with check (exists (select 1 from hub_users where id = auth.uid() and role = 'owner'));

drop policy if exists "admins manage payment proof submissions" on hub_payment_proof_submissions;
create policy "owner manages payment proof submissions" on hub_payment_proof_submissions
  for all to authenticated
  using (exists (select 1 from hub_users where id = auth.uid() and role = 'owner'))
  with check (exists (select 1 from hub_users where id = auth.uid() and role = 'owner'));

-- ---------------------------------------------------------------------------
-- Project payments / costs (revenue) -- was "using (true)" for payments
-- (any authenticated user, contractors included) and staff-or-assigned for
-- costs. Narrow both to owner-or-assigned-contractor.
-- ---------------------------------------------------------------------------

drop policy if exists "Authenticated users can read project payments" on hub_project_payments;
drop policy if exists "Admins can manage project payments" on hub_project_payments;

create policy "Owner manages project payments" on hub_project_payments
  for all to authenticated
  using (exists (select 1 from hub_users where id = auth.uid() and role = 'owner'))
  with check (exists (select 1 from hub_users where id = auth.uid() and role = 'owner'));

create policy "Assigned contractors read project payments" on hub_project_payments
  for select to authenticated
  using (
    exists (
      select 1 from hub_project_contractors pc
      where pc.project_id = hub_project_payments.project_id
        and pc.contractor_id = auth.uid()
    )
  );

drop policy if exists "Assigned contractors read project costs" on hub_project_costs;
drop policy if exists "Admins can manage project costs" on hub_project_costs;

create policy "Owner manages project costs" on hub_project_costs
  for all to authenticated
  using (exists (select 1 from hub_users where id = auth.uid() and role = 'owner'))
  with check (exists (select 1 from hub_users where id = auth.uid() and role = 'owner'));

create policy "Assigned contractors read project costs" on hub_project_costs
  for select to authenticated
  using (
    exists (
      select 1 from hub_project_contractors pc
      where pc.project_id = hub_project_costs.project_id
        and pc.contractor_id = auth.uid()
    )
  );

-- Contract pricing lives on hub_projects itself (contract_price, monthly_rate).
-- Staff (admin/hr) still need to read/manage the row for tasks/team/deadlines,
-- so we can't lock the whole table to owner -- pricing is masked at the UI
-- layer instead (ProjectFormModal, projects page). No RLS change here.

-- ---------------------------------------------------------------------------
-- Employee e-sign contracts (rate_snapshot carries a pay rate at signing time)
-- ---------------------------------------------------------------------------

drop policy if exists "Admins manage sign documents" on hub_sign_documents;
create policy "Owner manages sign documents" on hub_sign_documents
  for all to authenticated
  using (exists (select 1 from hub_users where id = auth.uid() and role = 'owner'));

drop policy if exists "Admins manage sign assignments" on hub_sign_assignments;
create policy "Owner manages sign assignments" on hub_sign_assignments
  for all to authenticated
  using (exists (select 1 from hub_users where id = auth.uid() and role = 'owner'));

-- Client-facing contracts (total_value = deal size)
drop policy if exists "admin_all" on hub_client_contracts;
create policy "owner_all" on hub_client_contracts
  for all to authenticated
  using (exists (select 1 from hub_users where id = auth.uid() and role = 'owner'));

-- ---------------------------------------------------------------------------
-- Performance reviews
-- ---------------------------------------------------------------------------

drop policy if exists "admins manage reviews" on hub_performance_reviews;
create policy "owner manages reviews" on hub_performance_reviews
  for all to authenticated
  using (
    exists (select 1 from hub_users where id = auth.uid() and role = 'owner')
    or contractor_id = auth.uid()
  )
  with check (
    exists (select 1 from hub_users where id = auth.uid() and role = 'owner')
  );

-- VERIFY -- policies should now read role = 'owner' only (contractor self-read
-- policies on hub_sign_documents/hub_sign_assignments/hub_performance_reviews,
-- and the public policies on hub_client_contracts, are untouched on purpose):
--   select tablename, policyname, qual from pg_policies
--   where schemaname = 'public' and tablename in (
--     'hub_invoice_log', 'hub_payment_receipt_log', 'hub_invoice_payment_links',
--     'hub_payment_proof_submissions', 'hub_project_payments', 'hub_project_costs',
--     'hub_sign_documents', 'hub_sign_assignments', 'hub_client_contracts',
--     'hub_performance_reviews'
--   );
