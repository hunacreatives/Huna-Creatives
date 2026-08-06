-- Ported from fs-architects' task_panel_modernization migration. Huna
-- already has its own comment read-receipts column (seen_by, added
-- 20260729000001) — not re-added here.

-- Soft delete — tasks land in a workspace trash instead of disappearing
-- immediately, restorable for 30 days.
alter table hub_project_tasks
  add column if not exists deleted_at timestamptz;

-- Multi-file comment attachments.
alter table hub_project_task_comments
  add column if not exists attachments jsonb;
