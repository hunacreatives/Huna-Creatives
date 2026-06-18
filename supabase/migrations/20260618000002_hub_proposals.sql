CREATE TABLE IF NOT EXISTS hub_proposals (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  submission_id bigint REFERENCES contact_submissions(id) ON DELETE SET NULL,
  slug text UNIQUE NOT NULL,
  client_name text NOT NULL,
  to_email text NOT NULL,
  project_title text,
  tagline text,
  accent_color text NOT NULL DEFAULT '#FF6B35',
  sections jsonb NOT NULL DEFAULT '[]',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'sent')),
  sent_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE hub_proposals ENABLE ROW LEVEL SECURITY;

-- Admins and owners can do everything
CREATE POLICY "Admins and owners can manage proposals"
  ON hub_proposals FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM hub_users
      WHERE hub_users.id = auth.uid()
      AND hub_users.role IN ('admin', 'owner')
    )
  );

-- Anyone can read published proposals (public landing page)
CREATE POLICY "Published proposals are publicly readable"
  ON hub_proposals FOR SELECT
  USING (status IN ('published', 'sent'));
