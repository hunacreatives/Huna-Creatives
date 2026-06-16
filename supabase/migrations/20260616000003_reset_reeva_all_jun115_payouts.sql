-- Delete ALL of Reeva's Jun 1-15 payout records (old weekly system left multiple stale records)
delete from hub_payouts
where contractor_id = (
  select id from hub_users where full_name ilike '%reeva%' limit 1
)
and cutoff_start = '2026-06-01';
