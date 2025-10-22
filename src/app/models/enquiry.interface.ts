export interface Enquiry {
  _id?: string;
  sno?: number;
  date: Date;
  wati_name: string;
  owner_name?: string; // New field for owner name
  user_name?: string;
  mobile_number: string;
  phone_number?: string; // New field for phone number
  secondary_mobile_number?: string;
  email_address?: string; // New field for email address
  gst: 'Yes' | 'No' | 'Not Selected' | '';
  gst_status?: 'Active' | 'Cancel';
  business_type?: string;
  business_name?: string; // New field for business name
  loan_amount?: string; // New field for loan amount
  loan_purpose?: string; // New field for loan purpose
  annual_revenue?: string; // New field for annual revenue
  business_document_url?: string; // New field for business document URL
  staff: string;
  staff_locked?: boolean; // Add this property to track if staff assignment is locked
  comments: string;
  additional_comments?: string;
  created_at?: Date;
  updated_at?: Date;
  // WhatsApp integration fields
  whatsapp_sent?: boolean;
  whatsapp_message_id?: string;
  whatsapp_message_type?: string;
  whatsapp_error?: string;
  // Staff assignment locking fields from backend
  staff_assignment_locked?: boolean;
  can_assign_staff?: boolean;
  staff_dropdown_enabled?: boolean;
  staff_dropdown_clickable?: boolean;
  staff_dropdown_reason?: string;
  staff_dropdown_ui_state?: 'enabled' | 'enabled_priority' | 'disabled_locked' | 'disabled_error';
  is_old_enquiry?: boolean;
  enquiry_age_days?: number;
  // Client submission tracking
  client_submitted?: boolean; // Track if client has been created from this enquiry
}

export interface StaffLockStatus {
  locked: boolean;
  reason: string;
  unassigned_old_enquiries: number;
  assigned_enquiries: number;
}

export const COMMENT_OPTIONS = [
  'Will share Doc',
  'Doc Shared(Yet to Verify)',
  'Verified(Shortlisted)',
  'Not Eligible',
  'No MSME',
  'Aadhar/PAN name mismatch',
  'MSME/GST Address Different',
  'Will call back',
  'Personal Loan',
  'Start Up',
  'Asking Less than 5 Laks',
  '1st call completed',
  '2nd call completed',
  '3rd call completed',
  'Switch off',
  'Not connected'
];