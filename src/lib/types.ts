export type UserRole = 'owner' | 'admin' | 'contractor';

export interface HubUser {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  avatar_url?: string;
  phone?: string;
  birthday?: string;
  address?: string;
  emergency_contact?: string;
  emergency_contact_name?: string;
  emergency_contact_relationship?: string;
  emergency_contact_phone?: string;
  slack_username?: string;
  department?: string;
  start_date?: string;
  status: 'active' | 'inactive';
  payment_type?: 'hourly' | 'fixed';
  hourly_rate?: number;
  monthly_rate?: number;
  currency?: string;
  payment_method?: string;
  bank_name?: string;
  bank_account_name?: string;
  bank_account_number?: string;
  bank_account_type?: string;
  notes?: string;
  onboarding_completed?: boolean;
  shift_start?: string;
  shift_end?: string;
  work_days?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface HubAttendance {
  id: number;
  contractor_id: string;
  date: string;
  on_time?: string;
  off_time?: string;
  total_hours?: number;
  notes?: string;
  status: 'complete' | 'missing_on' | 'missing_off' | 'manual_adjustment';
  created_at?: string;
  hub_users?: HubUser;
}

export interface HubTimeOff {
  id: number;
  contractor_id: string;
  type: 'vacation' | 'sick' | 'emergency' | 'unpaid' | 'other';
  start_date: string;
  end_date: string;
  reason?: string;
  attachment_url?: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes?: string;
  created_at?: string;
  hub_users?: HubUser;
}

export interface HubRequest {
  id: number;
  contractor_id: string;
  type: string;
  title: string;
  description?: string;
  attachment_url?: string;
  status: 'open' | 'in_review' | 'resolved' | 'closed';
  admin_notes?: string;
  created_at?: string;
  hub_users?: HubUser;
}

export interface HubAnnouncement {
  id: number;
  title: string;
  body: string;
  priority: 'normal' | 'important' | 'urgent';
  category: 'general' | 'payroll' | 'meeting' | 'holiday' | 'policy';
  published: boolean;
  posted_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface HubSop {
  id: number;
  title: string;
  category: string;
  content?: string;
  video_url?: string;
  file_url?: string;
  published: boolean;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

// Keep old alias for compat
export type HubSOPOld = HubSop;

export interface HubClientAssignment {
  id: number;
  client_id: number;
  contractor_id: string;
  role: string | null;
  created_at?: string;
  hub_users?: Pick<HubUser, 'id' | 'full_name' | 'avatar_url' | 'department'>;
}

export interface HubClient {
  id: number;
  client_name: string;
  assigned_contractor_id?: string;
  role?: string;
  platform?: string;
  status: 'active' | 'inactive' | 'paused' | 'ended';
  notes?: string;
  created_at?: string;
  updated_at?: string;
  hub_users?: HubUser;
  hub_client_assignments?: HubClientAssignment[];
}

export interface HubAsset {
  id: number;
  contractor_id: number;
  platform: string;
  account_name: string;
  access_level?: string;
  status: 'active' | 'revoked' | 'pending';
  notes?: string;
  created_at?: string;
  updated_at?: string;
  hub_users?: HubUser;
}

export interface HubPayout {
  id: number;
  contractor_id: string;
  cutoff_start: string;
  cutoff_end: string;
  approved_hours: number;
  hourly_rate: number;
  base_pay: number;
  bonus: number;
  incentives: number;
  reimbursements: number;
  deductions: number;
  advances: number;
  penalties: number;
  final_payout: number;
  notes?: string;
  status: 'draft' | 'reviewed' | 'approved' | 'paid';
  locked: boolean;
  payment_date?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  hub_users?: HubUser;
}

export interface HubDocRequest {
  id: number;
  contractor_id: string;
  doc_type: string;
  notes?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'rejected';
  admin_notes?: string;
  file_url?: string;
  file_name?: string;
  created_at?: string;
  updated_at?: string;
  hub_users?: HubUser;
}

export interface HubSignDocument {
  id: string;
  title: string;
  description?: string;
  file_url?: string;
  file_name?: string;
  content?: string;
  is_generated?: boolean;
  amendment_type?: string;
  rate_snapshot?: number;
  uploaded_by?: string;
  created_at?: string;
  hub_sign_assignments?: HubSignAssignment[];
}

export interface HubSignAssignment {
  id: string;
  document_id: string;
  contractor_id: string;
  status: 'pending' | 'signed';
  signed_at?: string;
  signed_name?: string;
  created_at?: string;
  hub_users?: HubUser;
  hub_sign_documents?: HubSignDocument;
}

export interface HubAuditLog {
  id: number;
  actor_id?: string;
  actor_name?: string;
  action: string;
  entity_type?: string;
  entity_id?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  created_at?: string;
  hub_users?: HubUser;
}