-- Reeva's Jun 1-15 row mixed old PHP-unit final_payout with new USD-raw base_pay,
-- causing double currency conversion on display (5336 PHP shown as 309,488).
-- Delete so she gets a clean submission with consistent raw units.
delete from hub_payouts
where contractor_id = (
  select id from hub_users where full_name ilike '%reeva%' limit 1
)
and cutoff_start = '2026-06-01';
