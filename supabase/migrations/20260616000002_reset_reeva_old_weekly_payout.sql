-- Remove Reeva's stale payout record created by the old weekly payment system.
-- The record had cutoff_start = 2026-06-01, final_payout = 1624, status = paid (paid June 6)
-- which was from the removed weekly hourly flow. She will resubmit under the new bi-monthly system.
delete from hub_payouts
where contractor_id = (
  select id from hub_users where full_name ilike '%reeva%' limit 1
)
and cutoff_start = '2026-06-01'
and status = 'paid'
and payment_date < '2026-06-16';
