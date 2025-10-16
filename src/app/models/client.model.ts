export interface Client {
  _id?: string;
  user_name?: string;
  email?: string;
  mobile_number?: string;
  legal_name?: string;
  date_of_birth?: string;
  gender?: string;
  address?: string;
  district?: string;
  state?: string;
  pincode?: string;
  business_name?: string;
  business_type?: string;
  gst_number?: string;
  pan_number?: string;
  aadhar_number?: string;
  business_address?: string;
  business_district?: string;
  business_state?: string;
  business_pincode?: string;
  status?: 'active' | 'pending' | 'rejected' | 'inactive' | string;
  feedback?: string;
  comments?: string;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  created_by_name?: string;
  updated_by?: string;
  updated_by_name?: string;
  trade_name?: string;
  
  // Bank information fields
  bank_name?: string;
  account_name?: string;
  account_number?: string;
  ifsc_code?: string;
  bank_type?: string;
  new_current_account?: string;
  total_credit_amount?: number;
  transaction_months?: number;
  
  // New bank details fields (when new_current_account is 'yes')
  new_bank_account_number?: string;
  new_ifsc_code?: string;
  new_account_name?: string;
  new_bank_name?: string;
  
  // Payment gateway fields
  payment_gateways?: string[] | string;
  payment_gateways_status?: { [gateway: string]: 'approved' | 'not_approved' };
  loan_status?: 'approved' | 'hold' | 'processing' | 'rejected' | 'soon';
  
  // Financial information
  required_loan_amount?: number;
  loan_purpose?: string;
  
  // Business information
  constitution_type?: string;
  gst_status?: string;
  registration_number?: string;
  company_email?: string;
  optional_mobile_number?: string;
  website?: string;
  
  // Owner/Partner information
  owner_name?: string;
  owner_dob?: string;
  number_of_partners?: number;
  
  // Business PAN details
  business_pan_name?: string;
  business_pan_date?: string;
  has_business_pan?: string;
  
  documents?: {
    gst_document?: string;
    bank_statement?: string;
    [key: string]: any;
  };
  
  processed_documents?: {
    [key: string]: {
      file_name: string;
      file_size: number;
      url?: string;
    };
  };
  
  [key: string]: any; // For any additional properties
}