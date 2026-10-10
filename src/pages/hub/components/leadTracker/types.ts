export interface TrackerLead {
  id: string;
  account_name: string;
  primary_contact: string | null;
  phone: string | null;
  email: string | null;
  status: 'new' | 'calling' | 'complete' | 'attempted' | 'callback_pending' | string;
  outcome: string | null;
  assigned_to: string | null;
  locked_by: string | null;
  locked_at: string | null;
  attempts_count: number;
  callback_date: string | null;
  callback_time: string | null;
  next_call_goal: 'email' | 'meeting' | 'bill' | null;
  last_worked_at: string | null;
  last_caller_id: string | null;
  meeting_scheduled: boolean;
  meeting_scheduled_at: string | null;
  bill_received: boolean;
  bill_received_at: string | null;
  follow_up_email_sent: boolean;
  email_reply_received: boolean;
  email_reply_received_at: string | null;
  call_notes: string | null;
  number_of_rooms: number | null;
  retired_at: string | null;
  retired_reason: string | null;
}

export interface CallLogEntry {
  id: number;
  entity_id: string;
  user_id: string | null;
  created_at: string;
  meta: {
    outcome?: string;
    new_status?: string;
    email_found?: boolean;
    phone_found?: boolean;
    notes?: string;
    follow_up_email_sent?: boolean;
    callback_date?: string | null;
  } | null;
}

export interface Caller {
  id: string;
  name: string;
}

export const LEAD_FIELDS =
  'id, account_name, primary_contact, phone, email, status, outcome, assigned_to, locked_by, locked_at, attempts_count, ' +
  'callback_date, callback_time, next_call_goal, last_worked_at, last_caller_id, meeting_scheduled, meeting_scheduled_at, ' +
  'bill_received, bill_received_at, follow_up_email_sent, email_reply_received, email_reply_received_at, call_notes, ' +
  'number_of_rooms, retired_at, retired_reason';

export const OUTCOME_LABEL: Record<string, string> = {
  interested: 'Interested',
  not_interested: 'Not interested',
  callback: 'Callback',
  voicemail: 'Voicemail',
  no_answer: 'No answer',
  skip: 'Skipped',
};

export const GOAL_LABEL: Record<string, string> = {
  email: 'Get email',
  meeting: 'Book meeting',
  bill: 'Get utility bill',
};

// Plain-language status for admins; the database keeps its own values.
export function leadStatusLabel(lead: TrackerLead): { label: string; tone: string } {
  if (lead.retired_at) return { label: 'Retired', tone: 'bg-stone-200 text-stone-600' };
  switch (lead.status) {
    case 'new':
      return lead.last_worked_at
        ? { label: 'Retry later', tone: 'bg-gray-100 text-gray-600' }
        : { label: 'Not called', tone: 'bg-gray-100 text-gray-600' };
    case 'calling':
      return lead.locked_by
        ? { label: 'In a queue', tone: 'bg-sky-100 text-sky-700' }
        : { label: 'Retry later', tone: 'bg-gray-100 text-gray-600' };
    case 'callback_pending':
      return { label: 'Callback', tone: 'bg-amber-100 text-amber-700' };
    case 'complete':
      return { label: 'Complete', tone: 'bg-emerald-100 text-emerald-700' };
    case 'attempted':
      return { label: 'Out of attempts', tone: 'bg-rose-100 text-rose-700' };
    default:
      return { label: lead.status, tone: 'bg-gray-100 text-gray-600' };
  }
}

// Property size from the CHLA room count (median ≈ 90 rooms)
export type RoomSize = 'small' | 'medium' | 'large' | 'xl';

export const ROOM_SIZES: { value: RoomSize; label: string; min: number; tone: string }[] = [
  { value: 'small', label: 'Under 50 rooms', min: 0, tone: 'bg-gray-100 text-gray-600' },
  { value: 'medium', label: '50–99 rooms', min: 50, tone: 'bg-teal-50 text-teal-700' },
  { value: 'large', label: '100–199 rooms', min: 100, tone: 'bg-indigo-50 text-indigo-700' },
  { value: 'xl', label: '200+ rooms', min: 200, tone: 'bg-violet-100 text-violet-700' },
];

export function roomSize(rooms: number | null) {
  if (rooms == null) return null;
  return [...ROOM_SIZES].reverse().find(s => rooms >= s.min)!;
}
