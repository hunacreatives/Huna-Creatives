-- Read receipts for task comments: array of user ids who have viewed the
-- comment. Auto-populated by the client when the task panel is open.
alter table hub_project_task_comments
  add column if not exists seen_by jsonb not null default '[]'::jsonb;
