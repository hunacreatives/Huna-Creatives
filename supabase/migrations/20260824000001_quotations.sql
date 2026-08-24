-- Quotations — 2026-08-24
--
-- Extends hub_proposals rather than adding a parallel table. The public
-- /p/:slug route, the send path, and the anon column grants are already
-- hardened for this table (see 20260821000001); duplicating it for
-- quotations would mean duplicating all three.
--
-- Existing rows keep doc_type 'proposal' and render exactly as before.
--
-- PART B of this change (the anon re-grant) is a SEPARATE migration that
-- must run only AFTER the frontend deploy. See 20260824000002.

-- ── Document type ────────────────────────────────────────────────────
alter table hub_proposals
  add column if not exists doc_type text not null default 'proposal'
    check (doc_type in ('proposal', 'quotation'));

-- ── Pricing ──────────────────────────────────────────────────────────
-- line_items: [{ description, qty, unit_price, notes }]
alter table hub_proposals
  add column if not exists line_items jsonb not null default '[]',
  add column if not exists currency text not null default 'PHP'
    check (currency in ('PHP', 'USD')),
  -- Flat amount off the subtotal, in `currency`. Percentage discounts are
  -- expressed by the account manager as the resulting amount, so the number
  -- on the quote is always the number the client pays.
  add column if not exists discount numeric not null default 0,
  add column if not exists tax_rate numeric not null default 0,
  add column if not exists valid_until date,
  add column if not exists terms text,
  -- payment_schedule: [{ label, amount, due }]
  add column if not exists payment_schedule jsonb not null default '[]';

-- ── Acceptance ───────────────────────────────────────────────────────
alter table hub_proposals
  add column if not exists viewed_at timestamptz,
  add column if not exists accepted_at timestamptz,
  add column if not exists accepted_by_name text,
  add column if not exists accepted_note text,
  add column if not exists declined_at timestamptz;

-- ── Downstream links ─────────────────────────────────────────────────
alter table hub_proposals
  add column if not exists project_id bigint references hub_projects(id) on delete set null;

-- ── Status set ───────────────────────────────────────────────────────
-- Was: draft | published | sent
alter table hub_proposals drop constraint if exists hub_proposals_status_check;
alter table hub_proposals add constraint hub_proposals_status_check
  check (status in ('draft', 'published', 'sent', 'viewed', 'accepted', 'declined', 'expired'));

-- ── Public acceptance ────────────────────────────────────────────────
-- Mirrors hub_client_contracts' "public_sign": the client is anonymous, so
-- the row policy is the only gate. Scoped to rows that are actually out for
-- decision, and the with-check keeps an accept from being used to rewrite
-- anything else.
--
-- NOTE: RLS cannot see the caller's slug filter, so this is a row-level
-- permission, not a per-link one. That is the same trade-off the existing
-- proposal read policy already makes -- these rows are share-by-link.
drop policy if exists "public_accept" on hub_proposals;
create policy "public_accept" on hub_proposals
  for update
  using (status in ('sent', 'viewed'))
  with check (status in ('viewed', 'accepted', 'declined'));

-- The public page reads published/sent rows; accepted ones must stay
-- readable so the client still sees their quote after accepting.
drop policy if exists "Published proposals are publicly readable" on hub_proposals;
create policy "Published proposals are publicly readable"
  on hub_proposals for select
  using (status in ('published', 'sent', 'viewed', 'accepted', 'declined'));

create index if not exists hub_proposals_doc_type_idx on hub_proposals(doc_type);
create index if not exists hub_proposals_status_idx on hub_proposals(status);

-- ── Column-level lock on the public accept path ──────────────────────
-- RLS gates WHICH ROWS anon may update, never WHICH COLUMNS. Without this,
-- the "public_accept" policy above would let anyone holding the anon key
-- (it ships in the JS bundle) rewrite line_items, discount, or terms on any
-- sent quotation and then accept it at their own price.
--
-- Same trap as the select fix in 20260821000001: a column-level GRANT is a
-- no-op while a table-wide grant still satisfies the privilege check, so the
-- table-wide UPDATE has to be revoked first and the safe columns granted back.
--
-- Admins are unaffected -- they write as `authenticated`, not `anon`.
revoke update on hub_proposals from anon;

grant update (
  status, viewed_at, accepted_at, accepted_by_name, accepted_note, declined_at
) on hub_proposals to anon;
