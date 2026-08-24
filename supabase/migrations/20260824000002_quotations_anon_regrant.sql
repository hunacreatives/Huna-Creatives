-- Quotations, PART B — anon SELECT re-grant — 2026-08-24
--
-- !! DO NOT RUN THIS UNTIL src/pages/p/page.tsx IS DEPLOYED. !!
--
-- 20260821000001 revoked anon's table-wide SELECT on hub_proposals and
-- granted back an explicit column list. That list predates the quotation
-- columns, so a deployed public page asking for line_items/currency/totals
-- fails with "permission denied for column" until this runs.
--
-- The reverse order breaks too: running this before the new page deploys is
-- harmless (it only ADDS columns to the grant), but the page must already
-- request an explicit column list -- it does, since 20260821000001.
--
-- to_email and submission_id stay revoked. They are client PII and an
-- internal FK; nothing on the public page needs either.

grant select (
  id, slug, doc_type, client_name, project_title, tagline,
  accent_color, sections, status, sent_at, created_at, updated_at,
  line_items, currency, discount, tax_rate, valid_until, terms,
  payment_schedule, viewed_at, accepted_at, accepted_by_name, declined_at
) on hub_proposals to anon;

-- VERIFY from the anon key (not the SQL editor, which is privileged):
--   select id, slug, line_items, currency from hub_proposals limit 1;  -> works
--   select to_email from hub_proposals limit 1;                        -> denied
