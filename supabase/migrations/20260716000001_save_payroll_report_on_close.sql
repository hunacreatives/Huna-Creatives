-- Auto-save the payroll Drive report whenever a period is closed.
-- Fires from the database (pg_net) so it does not depend on the admin's
-- browser completing the close flow — the Jul 1–15, 2026 report was lost
-- exactly that way. save-payroll-report is idempotent via the
-- payroll_pdf_saved_<period_start> flag in hub_settings, so a manual
-- "Save PDF to Drive" click or a retry cannot double-upload.
--
-- NOTE: applied by hand in the SQL editor on 2026-07-16. When reapplying,
-- replace <ANON_KEY> below with the project anon key (same Bearer token as
-- the cron migrations, e.g. 20260529000001_payroll_reminder_cron.sql).

CREATE OR REPLACE FUNCTION save_payroll_report_on_close()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status = 'closed' AND OLD.status IS DISTINCT FROM 'closed' THEN
    PERFORM net.http_post(
      url := 'https://aaqpwobmfofztcbbsonw.supabase.co/functions/v1/save-payroll-report',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer <ANON_KEY>'
      ),
      body := jsonb_build_object(
        'period_start', NEW.period_start,
        'period_end', NEW.period_end,
        'period_label', NEW.period_label
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_save_payroll_report_on_close ON hub_payroll_batches;
CREATE TRIGGER trg_save_payroll_report_on_close
  AFTER UPDATE ON hub_payroll_batches
  FOR EACH ROW
  EXECUTE FUNCTION save_payroll_report_on_close();
