// Notice to explain decisions. Kept in sync with DECISION_LABELS in
// supabase/functions/notify-notice-to-explain/email.ts (the emailed decision).
export const NOTICE_DECISIONS: Record<string, string> = {
  no_action: 'Explanation accepted, no action',
  warning: 'Written warning',
  final_warning: 'Final written warning',
  suspension: 'Suspension',
  dismissal: 'Dismissal',
};
