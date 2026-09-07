-- Lets a hub_proposals row point at a hand-built proposal page (e.g. /p/dobo)
-- instead of the generated /p/<slug> renderer. When set, the builder's
-- Preview link, public URL, and the Send email all use this path, and the
-- bespoke page binds itself to this row for approval + view tracking.
--
-- Run once in the Supabase SQL editor BEFORE deploying the matching code.
-- Safe to run more than once.

alter table public.hub_proposals
  add column if not exists custom_path text;

create index if not exists hub_proposals_custom_path_idx
  on public.hub_proposals (custom_path)
  where custom_path is not null;

-- The public proposal page reads hub_proposals by an explicit column
-- allow-list (see 20260824000002); a bespoke page also filters on this
-- column, so anon needs SELECT on it.
grant select (custom_path) on public.hub_proposals to anon;
