-- Security fix — 2026-08-21
-- Closes two anon-readable leaks found by live probing with the public anon key.
-- Safe to paste into the Supabase Dashboard SQL editor.

-- =====================================================================
-- 1. hub_client_contracts — stop exposing SIGNED contracts to the public
--
-- The original policy was:
--     using (status in ('sent', 'signed'))
-- RLS filters per row and cannot see the caller's `slug` filter, so
-- "readable by slug" and "readable in bulk" are the same thing. Including
-- 'signed' therefore published every completed contract permanently:
-- an anon caller could pull all 6 rows with full `body` text and
-- `total_value` (up to 2,500,000) using only the key from the JS bundle.
--
-- Narrowing to 'sent' means a contract is public only while it is actually
-- awaiting signature. The signing flow is unaffected: the existing
-- "public_sign" policy already gates on status = 'sent' and flips the row
-- to 'signed', which now also removes it from public view.
--
-- TRADE-OFF: after signing, /c/<slug> will 404 for the client. They keep
-- the countersigned copy via the send-signed-contract email. If you want
-- the link to stay live, do the edge-function fix in step 3 instead.
-- =====================================================================
drop policy if exists "public_read_sent" on hub_client_contracts;

create policy "public_read_sent" on hub_client_contracts
  for select
  using (status = 'sent');

-- =====================================================================
-- 2. hub_proposals — stop leaking the client's email address
--
-- "Published proposals are publicly readable" USING (status IN
-- ('published','sent')) is intentional — proposals are shared by link.
-- But select * also hands out `to_email` (client PII) and the internal
-- `submission_id`. The public proposal page renders neither, so revoking
-- the columns costs nothing and keeps the page working.
-- =====================================================================
revoke select (to_email, submission_id) on hub_proposals from anon;

-- =====================================================================
-- 3. VERIFY (run after, expect zero rows leaked)
-- =====================================================================
-- select count(*) from hub_client_contracts where status = 'signed';
--   ^ as admin this returns 6; the anon key should now return 0 rows
--     from: select * from hub_client_contracts;
