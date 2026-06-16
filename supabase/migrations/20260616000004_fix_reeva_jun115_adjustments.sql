-- Clear legacy fields on Reeva's Jun 1-15 payout record and set correct -1624 adjustment.
-- The old -94,192 came from stale admin browser state re-inserting old adjustments data.
update hub_payouts
set
  bonus        = 0,
  incentives   = 0,
  reimbursements = 0,
  deductions   = 0,
  advances     = 0,
  penalties    = 0,
  adjustments  = '[{"label":"Deduction","amount":-1624,"type":"deduction"}]'::jsonb
where contractor_id = (
  select id from hub_users where full_name ilike '%reeva%' limit 1
)
and cutoff_start = '2026-06-01';
