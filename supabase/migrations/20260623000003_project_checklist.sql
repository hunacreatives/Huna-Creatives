ALTER TABLE hub_projects ADD COLUMN IF NOT EXISTS client_checklist jsonb DEFAULT '{}'::jsonb NOT NULL;
