-- One-time data heal: settle stale duplicate invoice-log rows.
-- Resends/reminders created duplicate rows per invoice; settling only updated
-- the newest row, leaving hidden unsettled duplicates that kept invoices
-- (e.g. Peak Coffee Roasters #0003) stuck on the dashboard's outstanding
-- banner. Marks any unsettled row settled when a settled row already exists
-- for the same invoice number + project. Safe to run more than once.
update public.hub_invoice_log l
set settled = true,
    settled_at = coalesce(
      (select max(s.settled_at) from public.hub_invoice_log s
        where s.invoice_number = l.invoice_number
          and s.project_id is not distinct from l.project_id
          and s.settled = true),
      now()),
    balance = 0
where l.settled = false
  and exists (
    select 1 from public.hub_invoice_log s
    where s.invoice_number = l.invoice_number
      and s.project_id is not distinct from l.project_id
      and s.settled = true
  );
