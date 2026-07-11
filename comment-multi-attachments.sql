-- Multiple attachments per task comment.
-- Stores an array of {url, name, size, mime}; legacy single-attachment
-- columns stay populated with the first file for backward compatibility.
alter table hub_project_task_comments
  add column if not exists attachments jsonb;
