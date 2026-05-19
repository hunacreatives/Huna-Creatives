-- Run this in Supabase SQL editor

-- Add payment type fields to hub_users
ALTER TABLE hub_users
  ADD COLUMN IF NOT EXISTS payment_type text DEFAULT 'hourly' CHECK (payment_type IN ('hourly', 'fixed')),
  ADD COLUMN IF NOT EXISTS monthly_rate numeric;

-- Daily hours table (persisted from Slack attendance)
CREATE TABLE IF NOT EXISTS hub_daily_hours (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES hub_users(id) ON DELETE CASCADE,
  date date NOT NULL,
  hours_raw numeric NOT NULL DEFAULT 0,
  hours_capped numeric NOT NULL DEFAULT 0,
  first_on timestamptz,
  last_off timestamptz,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

ALTER TABLE hub_daily_hours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage daily hours"
  ON hub_daily_hours FOR ALL
  USING (is_hub_admin())
  WITH CHECK (is_hub_admin());

CREATE POLICY "Contractors view own hours"
  ON hub_daily_hours FOR SELECT
  USING (user_id = auth.uid());
