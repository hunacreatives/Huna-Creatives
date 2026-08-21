-- Security fix — 2026-08-21
-- Closes two anon-readable leaks found by live probing with the public anon key.
--
-- ORDER MATTERS. Part A is safe to run any time. Part B must run only AFTER
-- the matching frontend change is deployed -- see the note above it.

-- =====================================================================
-- PART A — hub_client_contracts: stop exposing SIGNED contracts publicly
--
-- The original policy was:
--     using (status in ('sent', 'signed'))
-- RLS filters per row and cannot see the caller's `slug` filter, so
-- "readable by slug" and "readable in bulk" are the same permission.
-- Including 'signed' therefore published every completed contract
-- permanently: an anon caller could pull all 6 rows with full `body` text
-- and `total_value` (up to 2,500,000) using only the key in the JS bundle.
--
-- Narrowing to 'sent' means a contract is public only while it is actually
-- awaiting signature. Signing is unaffected -- the existing "public_sign"
-- policy already gates on status = 'sent' and flips the row to 'signed',
-- which now also removes it from public view.
--
-- TRADE-OFF: after signing, /c/<slug> returns not-found for the client.
-- They keep the countersigned copy from the send-signed-contract email.
-- =====================================================================
drop policy if exists "public_read_sent" on hub_client_contracts;

create policy "public_read_sent" on hub_client_contracts
  for select
  using (status = 'sent');

-- =====================================================================
-- PART B — hub_proposals: stop leaking the client's email address
--
-- Proposals are meant to be shared by link, so the row policy stays. The
-- problem is only that select * hands out `to_email` (client PII) and the
-- internal `submission_id`.
--
-- !! DO NOT RUN THIS UNTIL src/pages/p/page.tsx is deployed. !!
-- A column-level REVOKE makes select('*') fail outright with "permission
-- denied for column" rather than quietly omitting the column, so running
-- this against the old frontend breaks every public proposal link. The
-- deployed page must already request an explicit column list.
-- =====================================================================
-- NOTE: `revoke select (col) ... from anon` alone is a NO-OP here -- anon
-- holds a table-wide SELECT grant, which keeps satisfying the privilege
-- check, and the revoke succeeds without changing anything. The table-level
-- grant has to go first, then the safe columns are granted back explicitly.
revoke select on hub_proposals from anon;

grant select (
  id, slug, client_name, project_title, tagline,
  accent_color, sections, status, sent_at, created_at, updated_at
) on hub_proposals to anon;

-- =====================================================================
-- VERIFY — run these after, from the anon key (not the SQL editor, which
-- is privileged and will still see everything):
--   hub_client_contracts -> expect 0 rows
--   hub_proposals        -> expect 1 row, with no to_email column
-- =====================================================================
