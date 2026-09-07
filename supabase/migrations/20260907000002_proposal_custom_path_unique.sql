-- One proposal per custom_path, so two rows can never both claim the same
-- bespoke page (e.g. /p/dobo). Run AFTER deduping existing rows or it errors
-- on the duplicate. Safe to run more than once.

drop index if exists hub_proposals_custom_path_idx;

create unique index hub_proposals_custom_path_idx
  on public.hub_proposals (custom_path)
  where custom_path is not null;
