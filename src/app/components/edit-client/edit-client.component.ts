import { Component, OnInit, ChangeDetectorRef, HostListener } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ClientService, Client } from '../../services/client.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-edit-client',
  templateUrl: './edit-client.component.html',
  styleUrls: ['./edit-client.component.scss']
})
export class EditClientComponent implements OnInit {
  clientForm!: FormGroup;
  clientId: string;
  client: Client | null = null;
  loading = false;
  isLoading = true; // Track initial data loading state
  saving = false;
  documents: { [key: string]: File } = {};
  existingDocuments: { [key: string]: any } = {};
  deletedDocuments: string[] = []; // New property to track deleted documents
  bankStatementsCount = 1;
  businessImagesCount = 1;
  has_business_pan = false;
  filteredNewBankNames: string[] = [];
  hasNewCurrentAccount = false;
  selectedPaymentGateways: string[] = [];
  
  // Custom dropdown properties
  isConstitutionDropdownOpen = false;
  isBusinessPanDropdownOpen = false;
  isBankTypeDropdownOpen = false;
  isNewCurrentAccountDropdownOpen = false;
  isNewBusinessAccountDropdownOpen = false;
  
  // Step management properties
  currentStep = 0;
  totalSteps = 9;
  
  // Track changes per section
  sectionChanged: { [key: number]: boolean } = {
    0: false, // Personal Info
    1: false, // GST Details
    2: false, // IE Code
    3: false, // Business
    4: false, // Owner Details
    5: false, // Financial
    6: false, // Banking
    7: false, // Signature
    8: false  // Payment Gateway
  };
  
  // Store original form values for comparison
  originalFormValues: any = {};
  
  steps = [
    {
      title: 'Personal Info',
      description: 'Personal & address',
      icon: 'person',
      completed: false
    },
    {
      title: 'GST Details',
      description: 'GST and registration',
      icon: 'receipt',
      completed: false
    },
    {
      title: 'IE Code',
      description: 'IE Code details',
      icon: 'qr_code',
      completed: false
    },
    {
      title: 'Business',
      description: 'Business & PAN details',
      icon: 'business',
      completed: false
    },
    {
      title: 'Owner Details',
      description: 'Owner & partnership info',
      icon: 'person_outline',
      completed: false
    },
    {
      title: 'Financial',
      description: 'Financial information',
      icon: 'account_balance_wallet',
      completed: false
    },
    {
      title: 'Banking',
      description: 'Bank account details',
      icon: 'account_balance',
      completed: false
    },
    {
      title: 'Signature',
      description: 'Upload signature',
      icon: 'edit',
      completed: false
    },
    {
      title: 'Payment Gateway',
      description: 'Payment configuration',
      icon: 'payment',
      completed: false
    }
  ];
  
  documentTypes = [
    'gst_document',
    'pan_document',
    'bank_statement',
    'address_proof',
    'photo',
    'signature',
    'msme_certificate',
    'udyam_certificate',
    'ie_code_document'
  ];

  partnerNames: string[] = [];
  partnerDobs: string[] = [];

  // Product Images and User Photos
  productImages: File[] = [];
  userPhotos: File[] = [];
  existingProductImages: any[] = [];
  existingUserPhotos: any[] = [];
  productImagesToDelete: string[] = [];
  userPhotosToDelete: string[] = [];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private clientService: ClientService,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {
    this.clientId = this.route.snapshot.paramMap.get('id') || '';
    
    // Initialize the form with safety check
    try {
      this.clientForm = this.initForm();
      console.log('✅ ClientForm initialized successfully:', !!this.clientForm);
    } catch (error) {
      console.error('❌ Error initializing clientForm:', error);
      // Fallback initialization
      this.clientForm = this.fb.group({});
    }
  }

  ngOnInit(): void {
    // Ensure form is initialized before proceeding
    if (!this.clientForm) {
      console.error('❌ ClientForm not initialized in ngOnInit, attempting to reinitialize...');
      this.clientForm = this.initForm();
    }
    
    console.log('🔍 NgOnInit - ClientForm status:', !!this.clientForm);
    
    this.loadClientDetails();
    
    // Initialize partner arrays
    for (let i = 0; i < 10; i++) {
      this.partnerNames[i] = '';
      this.partnerDobs[i] = '';
    }
    
    // Check for step query parameter to navigate to specific step
    this.route.queryParams.subscribe(params => {
      if (params['step'] !== undefined) {
        const stepNumber = parseInt(params['step'], 10);
        if (!isNaN(stepNumber) && stepNumber >= 0 && stepNumber < this.totalSteps) {
          this.currentStep = stepNumber;
          console.log(`Navigated to step ${stepNumber} from query parameter`);
        }
      }
    });
  }

  private initForm(): FormGroup {
    const form = this.fb.group({
      // Personal Information
      legal_name: [''],
      trade_name: [''],
      user_name: [''],
      user_email: ['', Validators.email],
      company_email: ['', Validators.email],
      mobile_number: ['', Validators.pattern('^[0-9]{10}$')],
      optional_mobile_number: ['', Validators.pattern('^[0-9]{10}$')],
      
      // Address Information
      address: [''],
      district: [''],
      state: [''],
      pincode: ['', Validators.pattern('^[0-9]{6}$')],
      business_address: [''],
      
      // Business Information
      business_name: [''],
      business_type: [''],
      constitution_type: [''],
      has_business_pan: [''],
      gst_number: [''],
      gst_status: [''],
      business_pan: ['', Validators.pattern('^[A-Z]{5}[0-9]{4}[A-Z]{1}$')],
      ie_code: [''],
      ie_code_number: [''],
      ie_code_status: [''],
      website: ['', Validators.pattern('https?://.+')],
      business_url: [''],
      
      // Financial Information
      required_loan_amount: [0, Validators.min(0)],
      loan_purpose: [''],
      repayment_period: [''],
      monthly_income: [0, Validators.min(0)],
      existing_loans: [''],
      
      // Bank Information
      bank_name: [''],
      account_name: [''],
      account_number: [''],
      ifsc_code: ['', Validators.pattern('^[A-Z]{4}0[A-Z0-9]{6}$')],
      bank_type: [''],
      new_current_account: [''],
      gateway: [''],
      transaction_done_by_client: [0, Validators.min(0)],
      total_credit_amount: [0, Validators.min(0)],
      average_monthly_balance: [0, Validators.min(0)],
      transaction_months: [1, Validators.min(1)],
      new_business_account: [''],
      
      // New bank details fields (conditional)
      new_bank_account_number: [''],
      new_ifsc_code: [''],
      new_account_name: [''],
      new_bank_name: [''],
      
      // Partnership Information
      number_of_partners: [0, Validators.min(0)],
      
      // GST Details
      registration_number: [''],
      gst_legal_name: [''],
      gst_trade_name: [''],
      
      // Business PAN Details
      business_pan_name: [''],
      business_pan_date: [''],
      
      // Owner Details
      owner_name: [''],
      owner_dob: ['']
    });

    // Initialize partner form controls
    this.initializePartnerControls(form);
    
    return form;
  }

  private initializePartnerControls(form: FormGroup): void {
    console.log('initializePartnerControls called');
    // Initialize form controls for up to 10 partners
    for (let i = 0; i < 10; i++) {
      const nameControl = `partner_name_${i}`;
      const dobControl = `partner_dob_${i}`;
      form.addControl(nameControl, this.fb.control(''));
      form.addControl(dobControl, this.fb.control(''));
      console.log(`Added form controls: ${nameControl}, ${dobControl}`);
    }
    console.log('All partner controls initialized. Form controls:', Object.keys(form.controls));
  }

  private loadClientDetails(): void {
    this.loading = true;
    this.isLoading = true;
    this.clientService.getClientDetails(this.clientId).subscribe({
      next: (response) => {
        this.client = response.client;
        console.log('Client response:', response);
        console.log('Client processed_documents:', response.client.processed_documents);
        this.existingDocuments = response.client.processed_documents || {};
        console.log('existingDocuments set to:', this.existingDocuments);
        console.log('existingDocuments keys:', Object.keys(this.existingDocuments));
        
        // Load existing product images and user photos
        this.existingProductImages = (response.client as any).product_images || [];
        this.existingUserPhotos = (response.client as any).user_photos || [];
        console.log('Loaded product images:', this.existingProductImages.length);
        console.log('Loaded user photos:', this.existingUserPhotos.length);
        
        // Check for partner-specific document keys
        console.log('Checking for partner document keys:');
        for (let i = 0; i < 10; i++) {
          const aadharKey = `partner_aadhar_${i}`;
          const panKey = `partner_pan_${i}`;
          console.log(`${aadharKey}:`, this.existingDocuments[aadharKey]);
          console.log(`${panKey}:`, this.existingDocuments[panKey]);
        }
        
        // Check for alternative key patterns
        console.log('Checking for alternative document key patterns:');
        Object.keys(this.existingDocuments).forEach(key => {
          if (key.includes('partner') || key.includes('aadhar') || key.includes('pan')) {
            console.log(`Found partner-related document key: ${key}`, this.existingDocuments[key]);
          }
        });
        
        // Also check the client object for partner document references
        console.log('Checking client object for partner document references:');
        Object.keys(response.client).forEach(key => {
          if (key.includes('partner') && (key.includes('aadhar') || key.includes('pan'))) {
            console.log(`Found partner document reference in client: ${key}`, (response.client as any)[key]);
          }
        });
        this.populateForm(response.client);
        this.loading = false;
        this.isLoading = false;
      },
      error: (error) => {
        this.snackBar.open('Error loading client details', 'Close', { duration: 3000 });
        this.loading = false;
        this.isLoading = false;
        this.router.navigate(['/clients']);
      }
    });
  }

  private populateForm(client: Client): void {
    console.log('Client data:', client);
    console.log('Website value:', client.website);
    
    // Determine Business PAN status based on existing documents and constitution type
    const hasBusinessPanDocument = this.hasExistingDocument('business_pan_document');
    const isPrivateLimited = client.constitution_type === 'Private Limited';
    
    // Determine has_business_pan value
    let hasBusinessPan = '';
    if (isPrivateLimited) {
      hasBusinessPan = 'yes';
    } else if (client.has_business_pan !== null && client.has_business_pan !== undefined && client.has_business_pan !== '') {
      // Prioritize the actual has_business_pan value from the database
      const panValue = String(client.has_business_pan).toLowerCase();
      hasBusinessPan = (panValue === 'yes' || panValue === 'true') ? 'yes' : 'no';
    } else {
      // Fallback: Check if client has Business PAN data (name, date, or document)
      const hasBusinessPanData = client.business_pan_name || client.business_pan_date || hasBusinessPanDocument;
      if (hasBusinessPanData) {
        hasBusinessPan = 'yes';
      }
    }
    
    // Set IE Code status based on document existence
    const ieCodeStatus = this.getIECodeDocument() ? 'Yes' : 'No';
    
    this.clientForm.patchValue({
      legal_name: client.legal_name || '',
      trade_name: client.trade_name || '',
      user_name: client.user_name || '',
      user_email: client.user_email || client.email || '',
      company_email: client.company_email || '',
      mobile_number: client.mobile_number || '',
      optional_mobile_number: client.optional_mobile_number || '',
      address: client.address || '',
      district: client.district || '',
      state: client.state || '',
      pincode: client.pincode || '',
      business_address: client.business_address || '',
      business_name: client.business_name || '',
      business_type: client.business_type || '',
      constitution_type: client.constitution_type || '',
      has_business_pan: hasBusinessPan,
      gst_number: client.gst_number || '',
      gst_status: client.gst_status || '',
      business_pan: client.business_pan || '',
      ie_code: client.ie_code || '',
      ie_code_number: (client as any).ie_code_number || '',
      ie_code_status: ieCodeStatus,
      website: client.website || '',
      business_url: client.business_url || '',
      required_loan_amount: client.required_loan_amount || 0,
      loan_purpose: client.loan_purpose || '',
      repayment_period: client.repayment_period || '',
      monthly_income: client.monthly_income || 0,
      existing_loans: client.existing_loans || '',
      bank_name: client.bank_name || '',
      account_name: client.account_name || '',
      account_number: client.account_number || '',
      ifsc_code: client.ifsc_code || '',
      bank_type: client.bank_type || '',
      new_current_account: client.new_current_account || '',
      gateway: client.gateway || '',
      
      // New bank details
      new_bank_account_number: (client as any).new_bank_account_number || '',
      new_ifsc_code: (client as any).new_ifsc_code || '',
      new_account_name: (client as any).new_account_name || '',
      new_bank_name: (client as any).new_bank_name || '',
      transaction_done_by_client: client.transaction_done_by_client || 0,
      total_credit_amount: client.total_credit_amount || 0,
      average_monthly_balance: client.average_monthly_balance || 0,
      transaction_months: client.transaction_months || 1,
      new_business_account: client.new_business_account || '',
      number_of_partners: client.number_of_partners || 0,
      
      // GST Details - Fixed field mapping
      registration_number: client.registration_number || '',
      gst_legal_name: client.gst_legal_name || '',
      gst_trade_name: client.gst_trade_name || '',
      
      // Business PAN Details
      business_pan_name: client.business_pan_name || '',
      business_pan_date: client.business_pan_date || '',
      
      // Owner Details
      owner_name: client.owner_name || '',
      owner_dob: client.owner_dob || ''
    });
    
    // Initialize payment gateways - handle both array and JSON string formats
    const paymentGateways = (client as any).payment_gateways;
    console.log('🔍 Raw payment_gateways from client:', paymentGateways, 'Type:', typeof paymentGateways);
    
    if (Array.isArray(paymentGateways)) {
      this.selectedPaymentGateways = paymentGateways;
      console.log('✅ Payment gateways loaded as array:', this.selectedPaymentGateways);
    } else if (typeof paymentGateways === 'string') {
      try {
        this.selectedPaymentGateways = JSON.parse(paymentGateways);
        console.log('✅ Payment gateways parsed from string:', this.selectedPaymentGateways);
      } catch (e) {
        console.warn('❌ Failed to parse payment gateways:', paymentGateways);
        this.selectedPaymentGateways = [];
      }
    } else {
      this.selectedPaymentGateways = [];
      console.log('⚠️ Payment gateways not found, defaulting to empty array');
    }
    
    console.log('💾 Final selectedPaymentGateways:', this.selectedPaymentGateways);
    
    // Use timeout to ensure form is fully initialized before populating partner data
    setTimeout(() => {
      this.ensurePartnerControlsExist();
      this.populatePartnerData(client);
      // Trigger change detection to ensure view updates
      this.cdr.detectChanges();
    }, 100);
    
    console.log('Form value after patch:', this.clientForm.value);
    console.log('Website form control value:', this.clientForm.get('website')?.value);
    console.log('Constitution type:', this.clientForm.get('constitution_type')?.value);
    console.log('Number of partners:', this.clientForm.get('number_of_partners')?.value);
    console.log('Should Partnership section show:', this.clientForm.get('constitution_type')?.value === 'Partnership');
    
    // Debug the specific fields that are having issues
    console.log('=== DEBUGGING FIELD MAPPING ===');
    console.log('Client registration_number:', client.registration_number);
    console.log('Client company_email:', client.company_email);
    console.log('Client optional_mobile_number:', client.optional_mobile_number);
    console.log('Form registration_number:', this.clientForm.get('registration_number')?.value);
    console.log('Form company_email:', this.clientForm.get('company_email')?.value);
    console.log('Form optional_mobile_number:', this.clientForm.get('optional_mobile_number')?.value);
    console.log('=== END DEBUGGING ===');
    
    // Set IE code number validation if IE document exists
    if (this.hasExistingDocument('ie_code') || this.hasExistingDocument('ie_code_document')) {
      this.clientForm.get('ie_code_number')?.setValidators([Validators.required]);
      this.clientForm.get('ie_code_number')?.updateValueAndValidity();
      console.log('IE code number validation set to required (existing document found)');
    }
    
    // Store original form values for change tracking
    this.originalFormValues = { 
      ...this.clientForm.value,
      payment_gateways: [...this.selectedPaymentGateways] // Store a copy of payment gateways
    };
    
    // Subscribe to form changes to track section modifications
    this.clientForm.valueChanges.subscribe(() => {
      this.trackSectionChanges();
    });
  }
  
  // Track which sections have been modified
  trackSectionChanges(): void {
    const currentValues = this.clientForm.value;
    
    // Reset all section changes
    Object.keys(this.sectionChanged).forEach(key => {
      this.sectionChanged[parseInt(key)] = false;
    });
    
    // Check each section for changes
    // Section 0: Personal Info
    if (this.hasFieldChanged(['legal_name', 'trade_name', 'user_name', 'user_email', 'company_email', 'mobile_number', 'optional_mobile_number', 'address', 'district', 'state', 'pincode', 'website'])) {
      this.sectionChanged[0] = true;
    }
    
    // Section 1: GST Details
    if (this.hasFieldChanged(['registration_number', 'gst_legal_name', 'gst_trade_name', 'gst_number', 'gst_status'])) {
      this.sectionChanged[1] = true;
    }
    // Check for GST and MSME document uploads
    if (this.documents['gst_document'] || this.documents['msme_document']) {
      this.sectionChanged[1] = true;
    }
    
    // Section 2: IE Code
    if (this.hasFieldChanged(['ie_code', 'ie_code_number', 'ie_code_status'])) {
      this.sectionChanged[2] = true;
    }
    // Check for IE Code document upload
    if (this.documents['ie_code_document'] || this.documents['ie_code']) {
      this.sectionChanged[2] = true;
    }
    
    // Section 3: Business
    let section3Changed = false;
    
    if (this.hasFieldChanged(['business_name', 'business_type', 'constitution_type', 'has_business_pan', 'business_pan', 'business_pan_name', 'business_pan_date', 'business_url'])) {
      section3Changed = true;
    }
    // Check for business document uploads
    if (this.documents['business_document'] || this.documents['business_pan_document']) {
      section3Changed = true;
    }
    
    // Special validation for Business PAN
    const hasBusinessPan = currentValues['has_business_pan'];
    const hasBusinessPanChanged = this.hasFieldChanged(['has_business_pan']);
    
    if (hasBusinessPan === 'yes') {
      const businessPan = currentValues['business_pan'];
      const businessPanName = currentValues['business_pan_name'];
      const businessPanDate = currentValues['business_pan_date'];
      
      // Check if Business PAN fields have changed
      const businessPanFieldsChanged = this.hasFieldChanged(['business_pan', 'business_pan_name', 'business_pan_date']);
      
      // If has_business_pan itself changed (e.g., from "no" to "yes"), show button immediately
      if (hasBusinessPanChanged) {
        this.sectionChanged[3] = section3Changed;
      }
      // If Business PAN fields changed, require all 3 to be filled
      else if (businessPanFieldsChanged) {
        if (businessPan && businessPanName && businessPanDate) {
          this.sectionChanged[3] = true;
        } else {
          this.sectionChanged[3] = false;
        }
      } else {
        // If only other fields changed (not Business PAN fields), show button normally
        this.sectionChanged[3] = section3Changed;
      }
    } else {
      // For non-Business PAN cases or when Business PAN is "no", use normal logic
      this.sectionChanged[3] = section3Changed;
    }
    
    // Section 4: Owner Details
    const ownerFields = ['owner_name', 'owner_dob', 'number_of_partners'];
    // Add partner fields dynamically
    for (let i = 0; i < 10; i++) {
      ownerFields.push(`partner_name_${i}`, `partner_dob_${i}`);
    }
    if (this.hasFieldChanged(ownerFields)) {
      this.sectionChanged[4] = true;
    }
    // Check for owner document uploads
    if (this.documents['owner_aadhar'] || this.documents['owner_pan']) {
      this.sectionChanged[4] = true;
    }
    // Also check for partner document uploads
    for (let i = 0; i < 10; i++) {
      if (this.documents[`partner_aadhar_${i}`] || this.documents[`partner_pan_${i}`]) {
        this.sectionChanged[4] = true;
        break;
      }
    }
    
    // Section 5: Financial
    if (this.hasFieldChanged(['required_loan_amount', 'loan_purpose', 'repayment_period', 'monthly_income', 'existing_loans', 'transaction_done_by_client', 'total_credit_amount', 'average_monthly_balance', 'transaction_months'])) {
      this.sectionChanged[5] = true;
    }
    // Check for document uploads in financial section
    if (this.documents['msme_certificate'] || this.documents['udyam_certificate']) {
      this.sectionChanged[5] = true;
    }
    
    // Section 6: Banking
    if (this.hasFieldChanged(['bank_name', 'account_name', 'account_number', 'ifsc_code', 'bank_type', 'new_current_account', 'new_bank_account_number', 'new_ifsc_code', 'new_account_name', 'new_bank_name', 'new_business_account'])) {
      this.sectionChanged[6] = true;
    }
    // Check for bank statement uploads
    for (let i = 0; i < 6; i++) {
      if (this.documents[`bank_statement_${i}`]) {
        this.sectionChanged[6] = true;
        break;
      }
    }
    
    // Section 7: Signature - check if new signature file uploaded or images/photos changed
    if (this.documents['signature']) {
      this.sectionChanged[7] = true;
    }
    // Check for product images and user photos
    if (this.productImages.length > 0 || this.userPhotos.length > 0 || 
        this.productImagesToDelete.length > 0 || this.userPhotosToDelete.length > 0) {
      this.sectionChanged[7] = true;
    }
    
    // Section 8: Payment Gateway - check if payment gateways changed from original
    const originalGateways = this.originalFormValues.payment_gateways || [];
    const currentGateways = this.selectedPaymentGateways || [];
    
    // Compare arrays - check if they're different
    const gatewaysChanged = JSON.stringify(originalGateways.sort()) !== JSON.stringify(currentGateways.sort());
    if (gatewaysChanged) {
      this.sectionChanged[8] = true;
    }
  }
  
  // Helper method to check if specific fields have changed
  hasFieldChanged(fields: string[]): boolean {
    const currentValues = this.clientForm.value;
    return fields.some(field => {
      const current = currentValues[field];
      const original = this.originalFormValues[field];
      return current !== original;
    });
  }
  
  // Save changes for a specific section
  saveSectionChanges(sectionIndex: number): void {
    this.saving = true;
    
    const formData = new FormData();
    
    // Get raw form value (includes disabled fields)
    const formValue = this.clientForm.getRawValue();
    
    // Fields that should always be included, even if empty
    const alwaysIncludeFields = ['account_name', 'registration_number', 'company_email', 'optional_mobile_number', 'ie_code_number'];
    
    // If Business PAN is "no", explicitly include Business PAN fields as empty to clear them in backend
    if (formValue.has_business_pan === 'no') {
      alwaysIncludeFields.push('business_pan', 'business_pan_name', 'business_pan_date');
    }
    
    // Add all form fields using the same logic as saveClient()
    Object.keys(formValue).forEach(key => {
      const value = formValue[key];
      const shouldInclude = (value !== null && value !== undefined && value !== '') || alwaysIncludeFields.includes(key);
      
      if (shouldInclude) {
        // For nested objects, stringify them
        if (typeof value === 'object' && value !== null) {
          formData.append(key, JSON.stringify(value));
        } else {
          // Always convert to string, even if empty (for alwaysIncludeFields)
          const stringValue = value !== null && value !== undefined ? value.toString() : '';
          formData.append(key, stringValue);
        }
      }
    });
    
    // Add payment gateways
    if (this.selectedPaymentGateways && this.selectedPaymentGateways.length > 0) {
      formData.append('payment_gateways', JSON.stringify(this.selectedPaymentGateways));
    }
    
    // Add uploaded documents
    Object.keys(this.documents).forEach(key => {
      if (this.documents[key]) {
        formData.append(key, this.documents[key]);
      }
    });
    
    // Add product images
    if (this.productImages && this.productImages.length > 0) {
      this.productImages.forEach((image, index) => {
        formData.append('product_images', image);
      });
    }
    
    // Add user photos
    if (this.userPhotos && this.userPhotos.length > 0) {
      this.userPhotos.forEach((photo, index) => {
        formData.append('user_photos', photo);
      });
    }
    
    // Add images to delete
    if (this.productImagesToDelete && this.productImagesToDelete.length > 0) {
      formData.append('delete_product_images', JSON.stringify(this.productImagesToDelete));
    }
    
    if (this.userPhotosToDelete && this.userPhotosToDelete.length > 0) {
      formData.append('delete_user_photos', JSON.stringify(this.userPhotosToDelete));
    }
    
    // Add deleted documents
    if (this.deletedDocuments && this.deletedDocuments.length > 0) {
      this.deletedDocuments.forEach(docType => {
        formData.append('deleted_documents[]', docType);
      });
    }
    
    // Add partner data
    if (this.partnerNames && this.partnerNames.length > 0) {
      this.partnerNames.forEach((name, index) => {
        if (name) {
          formData.append(`partner_name_${index}`, name);
        }
      });
    }
    
    if (this.partnerDobs && this.partnerDobs.length > 0) {
      this.partnerDobs.forEach((dob, index) => {
        if (dob) {
          formData.append(`partner_dob_${index}`, dob);
        }
      });
    }
    
    console.log('Saving section:', sectionIndex, this.steps[sectionIndex].title);
    console.log('FormData entries:');
    const formDataEntries: any = {};
    formData.forEach((value, key) => {
      formDataEntries[key] = value;
      console.log(`${key}:`, value, `(type: ${typeof value})`);
    });
    console.log('Total FormData fields:', Object.keys(formDataEntries).length);
    
    this.clientService.updateClientDetails(this.clientId, formData).subscribe({
      next: (response) => {
        this.saving = false;
        this.sectionChanged[sectionIndex] = false;
        
        // Update original values to current values
        this.originalFormValues = { 
          ...this.clientForm.value,
          payment_gateways: [...this.selectedPaymentGateways] // Update payment gateways in original values
        };
        
        // Clear uploaded documents for this save
        this.documents = {};
        this.productImages = [];
        this.userPhotos = [];
        this.productImagesToDelete = [];
        this.userPhotosToDelete = [];
        this.deletedDocuments = [];
        
        this.snackBar.open(`${this.steps[sectionIndex].title} saved successfully!`, 'Close', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
        
        // Reload client data to get updated information
        this.loadClientDetails();
      },
      error: (error) => {
        this.saving = false;
        console.error('Error saving section:', error);
        console.error('Error details:', error.error);
        
        const errorMessage = error.error?.error || error.error?.message || error.message || 'Unknown error';
        this.snackBar.open('Error saving changes: ' + errorMessage, 'Close', {
          duration: 5000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  private populatePartnerData(client: Client): void {
    console.log('Populating partner data for client:', client);
    console.log('Client keys:', Object.keys(client));
    
    // Log all partner-related fields
    console.log('Checking partner fields:');
    for (let i = 0; i < 10; i++) {
      const nameField = `partner_name_${i}`;
      const dobField = `partner_dob_${i}`;
      const nameValue = (client as any)[nameField];
      const dobValue = (client as any)[dobField];
      console.log(`${nameField}:`, nameValue, `${dobField}:`, dobValue);
      
      // Populate the arrays
      this.partnerNames[i] = nameValue || '';
      this.partnerDobs[i] = dobValue || '';
    }
    
    // Also check for alternative field names that might be used in the backend
    console.log('Checking for alternative partner field names:');
    const partnerKeys = Object.keys(client).filter(key => key.includes('partner'));
    console.log('All partner-related keys:', partnerKeys);
    
    // Populate partner data for up to 10 partners
    const patchData: any = {};
    for (let i = 0; i < 10; i++) {
      // Try multiple possible field name patterns
      const possibleNameFields = [
        `partner_name_${i}`,
        `partner${i}_name`,
        `partner_name${i}`,
        `partner_${i}_name`
      ];
      
      const possibleDobFields = [
        `partner_dob_${i}`,
        `partner${i}_dob`,
        `partner_dob${i}`,
        `partner_${i}_dob`
      ];
      
      // Find the first available field name pattern
      let partnerName = '';
      for (const field of possibleNameFields) {
        if ((client as any)[field]) {
          partnerName = (client as any)[field];
          console.log(`Found partner name using field: ${field} = ${partnerName}`);
          break;
        }
      }
      
      let partnerDob = '';
      for (const field of possibleDobFields) {
        if ((client as any)[field]) {
          partnerDob = (client as any)[field];
          console.log(`Found partner DOB using field: ${field} = ${partnerDob}`);
          break;
        }
      }
      
      console.log(`Partner ${i}: Name=${partnerName}, DOB=${partnerDob}`);
      
      patchData[`partner_name_${i}`] = partnerName;
      patchData[`partner_dob_${i}`] = partnerDob;
    }
    
    // Apply all partner data at once
    this.clientForm.patchValue(patchData);
    console.log('Patched all partner data:', patchData);
    
    // Force form update and change detection
    this.clientForm.updateValueAndValidity();
    
    // Trigger change detection to ensure form controls update in view
    this.cdr.detectChanges();
    
    // Additional timeout to ensure Angular processes the changes
    setTimeout(() => {
      this.cdr.detectChanges();
      
      // Verify the data was set correctly
      console.log('Verifying partner data in form after timeout:');
      for (let i = 0; i < 10; i++) {
        const nameControl = this.clientForm.get(`partner_name_${i}`);
        const dobControl = this.clientForm.get(`partner_dob_${i}`);
        console.log(`Partner ${i} - Name control:`, nameControl?.value, 'DOB control:', dobControl?.value);
      }
      
      // Debug form controls
      this.debugPartnerFormControls();
    }, 50);
    
    // Log the array values
    console.log('Partner arrays populated:');
    console.log('partnerNames:', this.partnerNames);
    console.log('partnerDobs:', this.partnerDobs);
  }

  // Debug method to check partner form controls
  debugPartnerFormControls(): void {
    console.log('=== DEBUGGING PARTNER FORM CONTROLS ===');
    console.log('All form controls:', Object.keys(this.clientForm.controls));
    
    for (let i = 0; i < 10; i++) {
      const nameControlName = `partner_name_${i}`;
      const dobControlName = `partner_dob_${i}`;
      
      const nameControl = this.clientForm.get(nameControlName);
      const dobControl = this.clientForm.get(dobControlName);
      
      console.log(`Partner ${i}:`);
      console.log(`  - ${nameControlName} exists:`, !!nameControl, 'value:', nameControl?.value);
      console.log(`  - ${dobControlName} exists:`, !!dobControl, 'value:', dobControl?.value);
    }
    console.log('=== END DEBUGGING ===');
  }

  // Method to ensure partner controls exist
  private ensurePartnerControlsExist(): void {
    console.log('=== ENSURING PARTNER CONTROLS EXIST ===');
    
    for (let i = 0; i < 10; i++) {
      const nameControlName = `partner_name_${i}`;
      const dobControlName = `partner_dob_${i}`;
      
      // Check if controls exist, if not create them
      if (!this.clientForm.get(nameControlName)) {
        console.log(`Creating missing control: ${nameControlName}`);
        this.clientForm.addControl(nameControlName, this.fb.control(''));
      }
      
      if (!this.clientForm.get(dobControlName)) {
        console.log(`Creating missing control: ${dobControlName}`);
        this.clientForm.addControl(dobControlName, this.fb.control(''));
      }
    }
    
    console.log('All partner controls verified/created');
    console.log('=== END ENSURING CONTROLS ===');
  }

  // Helper method to get partner control names
  getPartnerControlName(type: 'name' | 'dob', index: number): string {
    const controlName = `partner_${type}_${index}`;
    console.log(`getPartnerControlName called - type: ${type}, index: ${index}, controlName: ${controlName}`);
    
    // Ensure the control exists
    if (!this.clientForm.get(controlName)) {
      console.warn(`Form control ${controlName} does not exist, creating it...`);
      this.clientForm.addControl(controlName, this.fb.control(''));
    }
    
    const control = this.clientForm.get(controlName);
    console.log(`Form control exists:`, !!control, 'Value:', control?.value);
    
    return controlName;
  }

  // Helper method to create array for partner iteration
  getPartnerArray(): number[] {
    const numPartners = this.clientForm.get('number_of_partners')?.value || 0;
    const constitutionType = this.clientForm.get('constitution_type')?.value;
    
    console.log('getPartnerArray called - number_of_partners:', numPartners);
    console.log('Constitution type:', constitutionType);
    console.log('Form value:', this.clientForm.value);
    
    // Check if we have actual partner data
    let actualPartners = 0;
    console.log('Checking for actual partner data:');
    for (let i = 0; i < 10; i++) {
      const nameValue = this.clientForm.get(`partner_name_${i}`)?.value;
      const dobValue = this.clientForm.get(`partner_dob_${i}`)?.value;
      const aadharDoc = this.existingDocuments[`partner_aadhar_${i}`];
      const panDoc = this.existingDocuments[`partner_pan_${i}`];
      
      console.log(`Partner ${i}: name=${nameValue}, dob=${dobValue}, aadharDoc=${!!aadharDoc}, panDoc=${!!panDoc}`);
      
      if (nameValue || dobValue || aadharDoc || panDoc) {
        actualPartners = i + 1;
        console.log(`Found partner data at index ${i}, setting actualPartners to ${actualPartners}`);
      }
    }
    
    console.log('Actual partners found:', actualPartners);
    
    // For Partnership constitution, determine partner count
    let partnerCount;
    
    if (constitutionType === 'Partnership') {
      // For partnerships, use the maximum of:
      // 1. number_of_partners from form
      // 2. actual partners found in data
      // 3. minimum of 2 partners for partnerships
      partnerCount = Math.max(numPartners, actualPartners, 2);
      
      // Cap at 10 partners maximum
      partnerCount = Math.min(partnerCount, 10);
    } else {
      // For other types, use actual partners found
      partnerCount = actualPartners;
    }
    
    console.log('Final partner count:', partnerCount);
    
    const partnerArray = Array(partnerCount).fill(0).map((_, i) => i);
    console.log('Partner array created:', partnerArray);
    return partnerArray;
  }

  // Helper methods for safe partner input handling
  getPartnerNameValue(index: number): string {
    const controlName = `partner_name_${index}`;
    const control = this.clientForm.get(controlName);
    const value = control?.value || '';
    console.log(`getPartnerNameValue(${index}): controlName=${controlName}, controlExists=${!!control}, value='${value}'`);
    return value;
  }

  getPartnerDobValue(index: number): string {
    const controlName = `partner_dob_${index}`;
    const control = this.clientForm.get(controlName);
    const value = control?.value || '';
    console.log(`getPartnerDobValue(${index}): controlName=${controlName}, controlExists=${!!control}, value='${value}'`);
    return value;
  }

  onPartnerNameChange(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    if (input) {
      this.clientForm.get(`partner_name_${index}`)?.setValue(input.value);
    }
  }

  onPartnerDobChange(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    if (input) {
      this.clientForm.get(`partner_dob_${index}`)?.setValue(input.value);
    }
  }

  // Helper method to get existing partner document
  getExistingPartnerDocument(type: 'aadhar' | 'pan', index: number): any {
    const documentKey = `partner_${type}_${index}`;
    console.log(`getExistingPartnerDocument called - type: ${type}, index: ${index}, key: ${documentKey}`);
    console.log(`existingDocuments object:`, this.existingDocuments);
    console.log(`existingDocuments keys:`, Object.keys(this.existingDocuments));
    console.log(`existingDocuments[${documentKey}]:`, this.existingDocuments[documentKey]);
    
    // Check for alternative key patterns
    const alternativeKeys = [
      documentKey,
      `partner_${type}_${index}_document`,
      `${type}_${index}`,
      `partner_${index}_${type}`
    ];
    
    console.log('Checking alternative keys:', alternativeKeys);
    for (const altKey of alternativeKeys) {
      if (this.existingDocuments[altKey]) {
        console.log(`Found document with alternative key: ${altKey}`, this.existingDocuments[altKey]);
        return this.existingDocuments[altKey];
      }
    }
    
    return this.existingDocuments[documentKey];
  }

  // Helper method to download partner document
  downloadPartnerDocument(type: 'aadhar' | 'pan', index: number): void {
    const documentKey = `partner_${type}_${index}`;
    console.log(`downloadPartnerDocument called - type: ${type}, index: ${index}, key: ${documentKey}`);
    
    if (this.existingDocuments[documentKey]) {
      this.clientService.downloadDocument(this.clientId, documentKey).subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = this.existingDocuments[documentKey].file_name;
          a.click();
          window.URL.revokeObjectURL(url);
        },
        error: (error) => {
          this.snackBar.open('Error downloading document', 'Close', { duration: 3000 });
        }
      });
    }
  }


  removeExistingDocument(documentType: string): void {
    console.log('removeExistingDocument called with documentType:', documentType);
    console.log('existingDocuments before removal:', this.existingDocuments);
    
    // Show confirmation dialog
    const documentName = this.getDocumentTypeName(documentType);
    const confirmDelete = confirm(`Are you sure you want to remove the ${documentName}? This action cannot be undone.`);
    
    if (confirmDelete) {
      console.log('User confirmed deletion');
      
      // Remove from existingDocuments object
      delete this.existingDocuments[documentType];
      
      // Mark for deletion on save by adding to a deletedDocuments array
      if (!this.deletedDocuments) {
        this.deletedDocuments = [];
      }
      this.deletedDocuments.push(documentType);
      
      console.log('Document marked for deletion:', documentType);
      console.log('deletedDocuments array:', this.deletedDocuments);
      console.log('existingDocuments after removal:', this.existingDocuments);
      
      // Force change detection
      this.cdr.detectChanges();
      
      this.snackBar.open(`${documentName} marked for removal`, 'Close', { 
        duration: 3000 
      });
    } else {
      console.log('User cancelled deletion');
    }
  }

  addBankStatement(): void {
    if (this.bankStatementsCount < 6) {
      this.bankStatementsCount++;
    }
  }

  saveClient(): void {
    if (this.clientForm.invalid) {
      this.snackBar.open('Please fill all required fields', 'Close', { duration: 3000 });
      return;
    }

    this.saving = true;
    const formData = new FormData();

    // Add form fields
    const formValue = this.clientForm.getRawValue();
    
    // Debug the specific fields we're having issues with
    console.log('=== SAVE CLIENT DEBUGGING ===');
    console.log('Form is valid:', this.clientForm.valid);
    console.log('Full form value:', formValue);
    console.log('registration_number from form:', formValue.registration_number);
    console.log('company_email from form:', formValue.company_email);
    console.log('optional_mobile_number from form:', formValue.optional_mobile_number);
    console.log('ie_code_number from form:', formValue.ie_code_number);
    
    // Fields that should always be included, even if empty
    const alwaysIncludeFields = ['account_name', 'registration_number', 'company_email', 'optional_mobile_number', 'ie_code_number'];
    
    Object.keys(formValue).forEach(key => {
      const value = formValue[key];
      const shouldInclude = (value !== null && value !== undefined && value !== '') || alwaysIncludeFields.includes(key);
      
      if (shouldInclude) {
        // Debug the specific fields we're tracking
        if (key === 'registration_number' || key === 'company_email' || key === 'optional_mobile_number' || key === 'account_name' || key === 'ie_code_number') {
          console.log(`✅ Adding to FormData - ${key}: "${value}" (type: ${typeof value})`);
        }
        
        // For nested objects, stringify them
        if (typeof value === 'object' && value !== null) {
          formData.append(key, JSON.stringify(value));
        } else {
          // Always convert to string, even if empty (for alwaysIncludeFields)
          const stringValue = value !== null && value !== undefined ? value.toString() : '';
          formData.append(key, stringValue);
          
          // Extra logging for ie_code_number
          if (key === 'ie_code_number') {
            console.log(`🔍 IE Code Number - Original: "${value}", Converted: "${stringValue}"`);
          }
        }
      } else {
        // Log when fields are empty/null/undefined and not in always include list
        if (key === 'registration_number' || key === 'company_email' || key === 'optional_mobile_number' || key === 'account_name' || key === 'ie_code_number') {
          console.log(`❌ NOT adding to FormData - ${key}: ${value} (empty/null/undefined)`);
        }
      }
    });

    // Debug FormData contents
    console.log('FormData contents logged above in individual field processing');

    // Add payment gateways
    console.log('💾 Saving payment gateways:', this.selectedPaymentGateways);
    formData.append('payment_gateways', JSON.stringify(this.selectedPaymentGateways));
    console.log('💾 Payment gateways JSON string:', JSON.stringify(this.selectedPaymentGateways));

    // Add files
    Object.keys(this.documents).forEach(key => {
      if (this.documents[key]) {
        formData.append(key, this.documents[key]);
      }
    });

    // Add product images
    if (this.productImages && this.productImages.length > 0) {
      this.productImages.forEach((image, index) => {
        formData.append('product_images', image);
      });
      console.log('Added product images:', this.productImages.length);
    }

    // Add user photos
    if (this.userPhotos && this.userPhotos.length > 0) {
      this.userPhotos.forEach((photo, index) => {
        formData.append('user_photos', photo);
      });
      console.log('Added user photos:', this.userPhotos.length);
    }

    // Add images to delete
    if (this.productImagesToDelete && this.productImagesToDelete.length > 0) {
      formData.append('delete_product_images', JSON.stringify(this.productImagesToDelete));
      console.log('Product images to delete:', this.productImagesToDelete);
    }

    if (this.userPhotosToDelete && this.userPhotosToDelete.length > 0) {
      formData.append('delete_user_photos', JSON.stringify(this.userPhotosToDelete));
      console.log('User photos to delete:', this.userPhotosToDelete);
    }

    // Add deleted documents
    if (this.deletedDocuments && this.deletedDocuments.length > 0) {
      this.deletedDocuments.forEach(docType => {
        formData.append(`delete_${docType}`, 'true');
      });
    }

    console.log('Calling updateClientDetails with clientId:', this.clientId);
    console.log('=== END SAVE CLIENT DEBUGGING ===');

    this.clientService.updateClientDetails(this.clientId, formData).subscribe({
      next: (response: any) => {
        this.saving = false;
        
        console.log('✅ Client update response:', response);
        
        // Check if this was a comment update and handle WhatsApp status
        const isCommentUpdate = formValue.comments !== undefined;
        
        if (isCommentUpdate) {
          // Handle comment update with WhatsApp status
          if (response.whatsapp_sent) {
            this.snackBar.open('Comment updated successfully, WhatsApp message sent', 'Close', { duration: 4000 });
          } else if (response.whatsapp_quota_exceeded) {
            this.snackBar.open('Comment updated successfully, WhatsApp message not sent due to limit reached', 'Close', { duration: 5000 });
          } else if (response.whatsapp_error) {
            this.snackBar.open('Comment updated successfully, WhatsApp message failed', 'Close', { duration: 4000 });
          } else {
            this.snackBar.open('Comment updated successfully', 'Close', { duration: 3000 });
          }
        } else {
          // Handle regular update
          if (response.whatsapp_sent) {
            this.snackBar.open('Client updated successfully, WhatsApp message sent', 'Close', { duration: 4000 });
          } else if (response.whatsapp_quota_exceeded) {
            this.snackBar.open('Client updated successfully, WhatsApp message not sent due to limit reached', 'Close', { duration: 5000 });
          } else {
            this.snackBar.open('Client updated successfully', 'Close', { duration: 3000 });
          }
        }
        
        // Navigate back to client detail page with reload flag and timestamp to force refresh
        this.router.navigate(['/clients', this.clientId], { 
          queryParams: { reload: true, t: new Date().getTime() } 
        });
      },
      error: (error) => {
        console.error('Error updating client:', error);
        this.snackBar.open('Error updating client', 'Close', { duration: 3000 });
        this.saving = false;
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/clients']);
  }

  getDocumentTypeName(documentType: string): string {
    return documentType.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // New methods for enhanced functionality
  getExistingBankStatements(): any[] {
    const statements = [];
    for (let i = 0; i < 6; i++) {
      const key = `bank_statement_${i}`;
      if (this.existingDocuments[key]) {
        statements.push({
          ...this.existingDocuments[key],
          document_type: key
        });
      }
    }
    return statements;
  }

  getExistingDocuments(): Array<{file_name: string; file_size: number; document_type: string}> {
    const docs: Array<{file_name: string; file_size: number; document_type: string}> = [];
    console.log('getExistingDocuments called. existingDocuments:', this.existingDocuments);
    console.log('existingDocuments keys:', Object.keys(this.existingDocuments));
    
    Object.keys(this.existingDocuments).forEach(key => {
      if (this.existingDocuments[key]) {
        const doc = {
          ...this.existingDocuments[key],
          document_type: key
        };
        docs.push(doc);
        console.log(`Added document: ${key}`, doc);
      }
    });
    
    console.log('Final documents array:', docs);
    return docs;
  }

  hasExistingDocument(documentType: string): boolean {
    const hasDoc = !!this.existingDocuments[documentType];
    console.log(`hasExistingDocument called for ${documentType}:`, hasDoc, 'Document data:', this.existingDocuments[documentType]);
    return hasDoc;
  }

  addBusinessImage(): void {
    if (this.businessImagesCount < 10) {
      this.businessImagesCount++;
    }
  }

  removeBusinessImage(): void {
    if (this.businessImagesCount > 1) {
      // Remove the last image document if it exists
      const lastImageKey = `business_image_${this.businessImagesCount - 1}`;
      delete this.documents[lastImageKey];
      this.businessImagesCount--;
    }
  }

  previewDocument(documentType: string): void {
    console.log('previewDocument called with documentType:', documentType);
    console.log('existingDocuments:', this.existingDocuments);
    console.log('Document exists:', !!this.existingDocuments[documentType]);
    
    if (this.existingDocuments[documentType]) {
      console.log('Attempting to preview document:', this.existingDocuments[documentType]);
      this.clientService.downloadDocument(this.clientId, documentType).subscribe({
        next: (blob) => {
          console.log('Document blob received:', blob);
          const url = window.URL.createObjectURL(blob);
          const fileName = this.existingDocuments[documentType].file_name;
          console.log('File name:', fileName);
          
          // Check if it's an image or PDF for preview
          if (this.canPreviewDocument(fileName)) {
            console.log('Opening preview in new tab');
            // Open in new tab for preview
            window.open(url, '_blank');
          } else {
            console.log('File type not previewable');
            this.snackBar.open('Preview not available for this file type', 'Close', { duration: 3000 });
          }
          
          // Clean up the blob URL after a delay
          setTimeout(() => {
            window.URL.revokeObjectURL(url);
          }, 1000);
        },
        error: (error) => {
          console.error('Error previewing document:', error);
          this.snackBar.open('Error previewing document', 'Close', { duration: 3000 });
        }
      });
    } else {
      console.error('Document not found in existingDocuments:', documentType);
      this.snackBar.open('Document not found', 'Close', { duration: 3000 });
    }
  }

  canPreviewDocument(fileName: string): boolean {
    const previewableExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'pdf'];
    const extension = fileName.split('.').pop()?.toLowerCase();
    return previewableExtensions.includes(extension || '');
  }

  getIECodeDocument(): any {
    return this.existingDocuments['ie_code'] || this.existingDocuments['ie_code_document'] || null;
  }

  removeBankStatement(): void {
    if (this.bankStatementsCount > 1) {
      // Remove the last bank statement document if it exists
      const lastStatementKey = `bank_statement_${this.bankStatementsCount - 1}`;
      delete this.documents[lastStatementKey];
      this.bankStatementsCount--;
    }
  }

  // Bank names list (same as in new-client component)
  bankNames = [
    // Major Public Sector Banks
    'State Bank of India', 'Punjab National Bank', 'Bank of Baroda', 'Canara Bank', 'Union Bank of India',
    'Bank of India', 'Central Bank of India', 'Indian Bank', 'Indian Overseas Bank', 'UCO Bank',
    'Bank of Maharashtra', 'Punjab & Sind Bank',
    
    // Major Private Sector Banks
    'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'Kotak Mahindra Bank', 'Yes Bank', 'IndusInd Bank',
    'Federal Bank', 'South Indian Bank', 'Karnataka Bank', 'City Union Bank', 'DCB Bank',
    'RBL Bank', 'IDFC First Bank', 'Bandhan Bank', 'CSB Bank', 'Equitas Small Finance Bank',
    
    // Small Finance Banks
    'AU Small Finance Bank', 'Capital Small Finance Bank', 'Esaf Small Finance Bank',
    'Fincare Small Finance Bank', 'Jana Small Finance Bank', 'North East Small Finance Bank',
    'Suryoday Small Finance Bank', 'Ujjivan Small Finance Bank', 'Utkarsh Small Finance Bank',
    
    // Regional Rural Banks
    'Andhra Pradesh Grameena Vikas Bank', 'Andhra Pragathi Grameena Bank', 'Arunachal Pradesh Rural Bank',
    'Assam Gramin Vikash Bank', 'Bihar Gramin Bank', 'Chhattisgarh Rajya Gramin Bank',
    'Ellaquai Dehati Bank', 'Himachal Pradesh Gramin Bank', 'J&K Grameen Bank',
    'Jharkhand Rajya Gramin Bank', 'Karnataka Gramin Bank', 'Kerala Gramin Bank',
    'Madhya Pradesh Gramin Bank', 'Maharashtra Gramin Bank', 'Manipur Rural Bank',
    'Meghalaya Rural Bank', 'Mizoram Rural Bank', 'Nagaland Rural Bank', 'Odisha Gramya Bank',
    'Paschim Banga Gramin Bank', 'Puduvai Bharathiar Grama Bank', 'Punjab Gramin Bank',
    'Rajasthan Marudhara Gramin Bank', 'Sarva Haryana Gramin Bank', 'Tamil Nadu Grama Bank',
    'Telangana Grameena Bank', 'Tripura Gramin Bank', 'Utkal Grameen Bank', 'Uttar Bihar Gramin Bank',
    'Uttarakhand Gramin Bank', 'Uttaranchal Gramin Bank', 'Vidharbha Konkan Gramin Bank',
    
    // Cooperative Banks
    'Saraswat Cooperative Bank', 'Cosmos Cooperative Bank', 'Abhyudaya Cooperative Bank',
    'TJSB Sahakari Bank', 'Bassein Catholic Cooperative Bank', 'Kalupur Commercial Cooperative Bank',
    'Nutan Nagarik Sahakari Bank', 'Shamrao Vithal Cooperative Bank', 'The Mumbai District Central Cooperative Bank',
    
    // Foreign Banks
    'Citibank', 'Standard Chartered Bank', 'HSBC Bank', 'Deutsche Bank', 'Barclays Bank',
    'Bank of America', 'JPMorgan Chase Bank', 'DBS Bank', 'Mizuho Bank', 'MUFG Bank',
    
    // Payment Banks
    'Paytm Payments Bank', 'Airtel Payments Bank', 'India Post Payments Bank', 'Fino Payments Bank',
    'Jio Payments Bank', 'NSDL Payments Bank'
  ];

  // New Current Account Management
  onNewCurrentAccountChange(value: string): void {
    this.hasNewCurrentAccount = value === 'yes';
    
    if (this.hasNewCurrentAccount) {
      // Set validators for new bank details fields
      this.clientForm.get('new_bank_account_number')?.setValidators([Validators.required]);
      this.clientForm.get('new_ifsc_code')?.setValidators([Validators.required]);
      this.clientForm.get('new_account_name')?.setValidators([Validators.required]);
      this.clientForm.get('new_bank_name')?.setValidators([Validators.required]);
    } else {
      // Clear validators and values for new bank details fields
      this.clientForm.get('new_bank_account_number')?.clearValidators();
      this.clientForm.get('new_ifsc_code')?.clearValidators();
      this.clientForm.get('new_account_name')?.clearValidators();
      this.clientForm.get('new_bank_name')?.clearValidators();
      
      this.clientForm.get('new_bank_account_number')?.setValue('');
      this.clientForm.get('new_ifsc_code')?.setValue('');
      this.clientForm.get('new_account_name')?.setValue('');
      this.clientForm.get('new_bank_name')?.setValue('');
    }
    
    // Update validity
    this.clientForm.get('new_bank_account_number')?.updateValueAndValidity();
    this.clientForm.get('new_ifsc_code')?.updateValueAndValidity();
    this.clientForm.get('new_account_name')?.updateValueAndValidity();
    this.clientForm.get('new_bank_name')?.updateValueAndValidity();
  }

  onNewBankNameInput(event: any): void {
    const value = event.target.value;
    this.filterNewBankNames(value);
  }

  filterNewBankNames(searchTerm: string): void {
    if (!searchTerm || searchTerm.trim() === '' || searchTerm.length < 2) {
      this.filteredNewBankNames = [];
    } else {
      this.filteredNewBankNames = this.bankNames.filter(bank =>
        bank.toLowerCase().includes(searchTerm.toLowerCase().trim())
      ).slice(0, 10);
    }
  }

  selectNewBank(bankName: string): void {
    this.clientForm.get('new_bank_name')?.setValue(bankName);
    this.filteredNewBankNames = [];
  }

  // Payment Gateway Management
  availableGateways = [
    'Razorpay',
    'PayU',
    'CCAvenue',
    'Paytm',
    'Instamojo',
    'PayPal',
    'Stripe',
    'Cashfree',
    'PayKun',
    'EBS',
    'Atom',
    'BillDesk',
    'Easebuzz',
    'HDFC Payment Gateway',
    'ICICI Payment Gateway',
    'SBI ePay',
    'Axis Bank Payment Gateway'
  ];

  // Get appropriate icon for each payment gateway
  getGatewayIcon(gateway: string): string {
    const iconMap: { [key: string]: string } = {
      'Razorpay': 'credit_card',
      'PayU': 'payment',
      'CCAvenue': 'account_balance_wallet',
      'Paytm': 'mobile_friendly',
      'Instamojo': 'storefront',
      'PayPal': 'account_balance',
      'Stripe': 'credit_score',
      'Cashfree': 'monetization_on',
      'PayKun': 'local_atm',
      'EBS': 'account_balance_wallet',
      'Atom': 'payments',
      'BillDesk': 'receipt_long',
      'Easebuzz': 'flash_on',
      'HDFC Payment Gateway': 'account_balance',
      'ICICI Payment Gateway': 'account_balance',
      'SBI ePay': 'account_balance',
      'Axis Bank Payment Gateway': 'account_balance'
    };
    return iconMap[gateway] || 'payment';
  }

  // Get gateway color theme
  getGatewayColor(gateway: string): string {
    const colorMap: { [key: string]: string } = {
      'Razorpay': '#3395ff',
      'PayU': '#17b978',
      'CCAvenue': '#ff6b35',
      'Paytm': '#00baf2',
      'Instamojo': '#3d5afe',
      'PayPal': '#0070ba',
      'Stripe': '#635bff',
      'Cashfree': '#0d47a1',
      'PayKun': '#f57c00',
      'EBS': '#4caf50',
      'Atom': '#9c27b0',
      'BillDesk': '#ff5722',
      'Easebuzz': '#ff9800',
      'HDFC Payment Gateway': '#004c8f',
      'ICICI Payment Gateway': '#b8860b',
      'SBI ePay': '#1976d2',
      'Axis Bank Payment Gateway': '#8e24aa'
    };
    return colorMap[gateway] || 'var(--primary)';
  }

  isGatewaySelected(gateway: string): boolean {
    return this.selectedPaymentGateways.includes(gateway);
  }

  onGatewayChange(gateway: string, isSelected: boolean): void {
    console.log(`Gateway change: ${gateway} - ${isSelected ? 'selected' : 'deselected'}`);
    if (isSelected) {
      if (!this.selectedPaymentGateways.includes(gateway)) {
        this.selectedPaymentGateways.push(gateway);
      }
    } else {
      const index = this.selectedPaymentGateways.indexOf(gateway);
      if (index > -1) {
        this.selectedPaymentGateways.splice(index, 1);
      }
    }
    console.log('Updated payment gateways:', this.selectedPaymentGateways);
    
    // Track section changes when payment gateways are modified
    this.trackSectionChanges();
  }

  getSelectedGateways(): string[] {
    return this.selectedPaymentGateways;
  }

  // Step Navigation Methods
  goToStep(stepIndex: number): void {
    if (stepIndex >= 0 && stepIndex < this.totalSteps) {
      this.currentStep = stepIndex;
    }
  }

  nextStep(): void {
    if (this.currentStep < this.totalSteps - 1) {
      // Mark current step as completed
      this.steps[this.currentStep].completed = this.isStepValid(this.currentStep);
      this.currentStep++;
    }
  }

  previousStep(): void {
    if (this.currentStep > 0) {
      this.currentStep--;
    }
  }

  isStepValid(stepIndex: number): boolean {
    // Validate each step based on required fields
    switch (stepIndex) {
      case 0: // Personal Info & Address
        return (this.clientForm.get('legal_name')?.valid ?? false) && 
               (this.clientForm.get('mobile_number')?.valid ?? false) &&
               (this.clientForm.get('address')?.valid ?? false);
      case 1: // GST Details
        return true; // Optional fields
      case 2: // IE Code
        return true; // Optional fields
      case 3: // Business & Business PAN
        return this.clientForm.get('constitution_type')?.valid ?? false;
      case 4: // Owner Details & Partnership
        const constitutionType = this.clientForm.get('constitution_type')?.value;
        if (constitutionType === 'Partnership') {
          return this.clientForm.get('number_of_partners')?.valid ?? false;
        }
        return true;
      case 5: // Financial
        return true; // Optional fields
      case 6: // Banking
        return true; // Optional fields
      case 7: // Signature
        return true; // Optional file
      case 8: // Payment Gateway
        return true; // Optional selection
      default:
        return true;
    }
  }

  isCurrentStepValid(): boolean {
    return this.isStepValid(this.currentStep);
  }

  canProceedToNext(): boolean {
    return this.isCurrentStepValid() && this.currentStep < this.totalSteps - 1;
  }

  canGoBack(): boolean {
    return this.currentStep > 0;
  }

  isLastStep(): boolean {
    return this.currentStep === this.totalSteps - 1;
  }

  getStepTitle(): string {
    return this.steps[this.currentStep]?.title || 'Unknown Step';
  }

  getStepDescription(): string {
    return this.steps[this.currentStep]?.description || '';
  }

  // Check if we should show Partnership step
  shouldShowPartnershipStep(): boolean {
    return this.clientForm.get('constitution_type')?.value === 'Partnership';
  }

  // Check if we should show Business PAN step
  shouldShowBusinessPANStep(): boolean {
    const constitutionType = this.clientForm.get('constitution_type')?.value;
    const hasBusinessPan = this.clientForm.get('has_business_pan')?.value;
    return (constitutionType === 'Proprietorship' || 
            constitutionType === 'Partnership' || 
            constitutionType === 'Private Limited') && 
           (hasBusinessPan === 'yes' || this.hasExistingDocument('business_pan_document'));
  }

  // Check if we should show Owner Details step
  shouldShowOwnerDetailsStep(): boolean {
    const constitutionType = this.clientForm.get('constitution_type')?.value;
    const hasBusinessPan = this.clientForm.get('has_business_pan')?.value;
    return constitutionType === 'Private Limited' || 
           (constitutionType === 'Proprietorship' && 
            (hasBusinessPan === 'yes' || 
             this.hasExistingDocument('owner_aadhar') || 
             this.hasExistingDocument('owner_pan')));
  }

  // Custom dropdown methods
  toggleConstitutionDropdown(): void {
    this.isConstitutionDropdownOpen = !this.isConstitutionDropdownOpen;
    if (this.isConstitutionDropdownOpen) {
      this.isBusinessPanDropdownOpen = false;
    }
  }

  toggleBusinessPanDropdown(): void {
    this.isBusinessPanDropdownOpen = !this.isBusinessPanDropdownOpen;
    if (this.isBusinessPanDropdownOpen) {
      this.isConstitutionDropdownOpen = false;
    }
  }

  selectConstitution(value: string): void {
    this.clientForm.patchValue({ constitution_type: value });
    this.isConstitutionDropdownOpen = false;
  }

  selectBusinessPan(value: string): void {
    this.clientForm.patchValue({ has_business_pan: value });
    this.isBusinessPanDropdownOpen = false;
    
    // Add validators when Business PAN is "yes"
    if (value === 'yes') {
      this.clientForm.get('business_pan')?.setValidators([Validators.required, Validators.pattern('^[A-Z]{5}[0-9]{4}[A-Z]{1}$')]);
      this.clientForm.get('business_pan_name')?.setValidators([Validators.required]);
      this.clientForm.get('business_pan_date')?.setValidators([Validators.required]);
    } else {
      // Remove required validators and clear values when Business PAN is "no"
      this.clientForm.get('business_pan')?.setValidators([Validators.pattern('^[A-Z]{5}[0-9]{4}[A-Z]{1}$')]);
      this.clientForm.get('business_pan_name')?.clearValidators();
      this.clientForm.get('business_pan_date')?.clearValidators();
      
      // Clear Business PAN field values when selecting "no"
      this.clientForm.patchValue({
        business_pan: '',
        business_pan_name: '',
        business_pan_date: ''
      });
      
      // Remove Business PAN document if it exists
      if (this.documents['business_pan_document']) {
        delete this.documents['business_pan_document'];
      }
    }
    
    // Update validity
    this.clientForm.get('business_pan')?.updateValueAndValidity();
    this.clientForm.get('business_pan_name')?.updateValueAndValidity();
    this.clientForm.get('business_pan_date')?.updateValueAndValidity();
    
    // Track section changes
    this.trackSectionChanges();
  }

  getConstitutionLabel(value: string): string {
    if (!value) return 'Select Constitution Type';
    return value;
  }

  getBusinessPanLabel(value: string): string {
    if (!value) return 'Select Option';
    return value === 'yes' ? 'Yes' : 'No';
  }

  // Bank dropdown methods
  toggleBankTypeDropdown(): void {
    this.isBankTypeDropdownOpen = !this.isBankTypeDropdownOpen;
    if (this.isBankTypeDropdownOpen) {
      this.isNewCurrentAccountDropdownOpen = false;
      this.isNewBusinessAccountDropdownOpen = false;
    }
  }

  toggleNewCurrentAccountDropdown(): void {
    this.isNewCurrentAccountDropdownOpen = !this.isNewCurrentAccountDropdownOpen;
    if (this.isNewCurrentAccountDropdownOpen) {
      this.isBankTypeDropdownOpen = false;
      this.isNewBusinessAccountDropdownOpen = false;
    }
  }

  toggleNewBusinessAccountDropdown(): void {
    this.isNewBusinessAccountDropdownOpen = !this.isNewBusinessAccountDropdownOpen;
    if (this.isNewBusinessAccountDropdownOpen) {
      this.isBankTypeDropdownOpen = false;
      this.isNewCurrentAccountDropdownOpen = false;
    }
  }

  selectBankType(value: string): void {
    this.clientForm.patchValue({ bank_type: value });
    this.isBankTypeDropdownOpen = false;
  }

  selectNewCurrentAccount(value: string): void {
    this.clientForm.patchValue({ new_current_account: value });
    this.isNewCurrentAccountDropdownOpen = false;
    this.onNewCurrentAccountChange(value);
  }

  selectNewBusinessAccount(value: string): void {
    this.clientForm.patchValue({ new_business_account: value });
    this.isNewBusinessAccountDropdownOpen = false;
  }

  getBankTypeLabel(value: string): string {
    if (!value) return 'Select Account Type';
    return value;
  }

  getNewCurrentAccountLabel(value: string): string {
    if (!value) return 'Select Option';
    return value === 'yes' ? 'Yes' : 'No';
  }

  getNewBusinessAccountLabel(value: string): string {
    if (!value) return 'Select';
    return value === 'yes' ? 'Yes' : 'No';
  }

  // Document handling methods
  onFileSelected(event: any, documentType: string): void {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        this.snackBar.open('Please select a valid file type (PDF, JPG, PNG)', 'Close', { duration: 3000 });
        return;
      }

      // Validate file size (5MB limit)
      const maxSize = 5 * 1024 * 1024; // 5MB in bytes
      if (file.size > maxSize) {
        this.snackBar.open('File size must be less than 5MB', 'Close', { duration: 3000 });
        return;
      }

      // If there's an existing document, mark it for deletion and remove from existingDocuments
      if (this.existingDocuments[documentType]) {
        if (!this.deletedDocuments.includes(documentType)) {
          this.deletedDocuments.push(documentType);
          console.log(`Marked existing document for deletion: ${documentType}`);
        }
        // Remove from existingDocuments to prevent showing old document in UI
        delete this.existingDocuments[documentType];
      }

      this.documents[documentType] = file;
      console.log(`File selected for ${documentType}:`, file.name);
      
      // Handle IE code document upload
      if (documentType === 'ie_code_document') {
        // Reset IE code number and make it required
        this.clientForm.get('ie_code_number')?.setValue('');
        this.clientForm.get('ie_code_number')?.setValidators([Validators.required]);
        this.clientForm.get('ie_code_number')?.updateValueAndValidity();
        
        this.snackBar.open('Please enter the IE Code Number for the uploaded document', 'Close', { duration: 4000 });
      }
      
      // Track section changes when documents are uploaded
      this.trackSectionChanges();
    }
  }

  removeDocument(documentType: string): void {
    delete this.documents[documentType];
    // Reset the file input
    const fileInput = document.getElementById(documentType) as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
    console.log(`Document removed: ${documentType}`);
    
    // Handle IE code document removal
    if (documentType === 'ie_code_document') {
      // Check if there's no existing IE document
      if (!this.hasExistingDocument('ie_code') && !this.hasExistingDocument('ie_code_document')) {
        // Clear validators if no existing document
        this.clientForm.get('ie_code_number')?.clearValidators();
        this.clientForm.get('ie_code_number')?.updateValueAndValidity();
      }
    }
    
    // Track section changes when documents are removed
    this.trackSectionChanges();
  }

  downloadDocument(documentType: string): void {
    if (!this.client?._id) {
      this.snackBar.open('Client information not available', 'Close', { duration: 3000 });
      return;
    }

    if (!this.hasExistingDocument(documentType)) {
      this.snackBar.open('Document not found', 'Close', { duration: 3000 });
      return;
    }

    this.clientService.downloadDocument(this.client._id, documentType).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = this.existingDocuments[documentType].file_name || `${documentType}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        this.snackBar.open('Document downloaded successfully', 'Close', { duration: 3000 });
      },
      error: (error) => {
        console.error('Download error:', error);
        this.snackBar.open('Failed to download document', 'Close', { duration: 3000 });
      }
    });
  }

  // Handle multiple file selection for product images and user photos
  onMultipleFilesSelected(event: any, type: 'product_images' | 'user_photos'): void {
    const files: FileList = event.target.files;
    if (!files || files.length === 0) return;

    const maxFiles = 10;
    const currentArray = type === 'product_images' ? this.productImages : this.userPhotos;
    const existingArray = type === 'product_images' ? this.existingProductImages : this.existingUserPhotos;
    
    const totalCount = currentArray.length + existingArray.length;
    const availableSlots = maxFiles - totalCount;

    if (availableSlots <= 0) {
      this.snackBar.open(`Maximum ${maxFiles} ${type === 'product_images' ? 'product images' : 'user photos'} allowed`, 'Close', { duration: 3000 });
      return;
    }

    const filesToAdd = Math.min(files.length, availableSlots);
    const newFiles: File[] = [];

    for (let i = 0; i < filesToAdd; i++) {
      const file = files[i];
      // Validate file type
      if (!file.type.match(/image\/(jpeg|jpg|png)/)) {
        this.snackBar.open('Only JPG and PNG images are allowed', 'Close', { duration: 3000 });
        continue;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        this.snackBar.open(`${file.name} is too large. Maximum size is 5MB`, 'Close', { duration: 3000 });
        continue;
      }
      newFiles.push(file);
    }

    if (type === 'product_images') {
      this.productImages = [...this.productImages, ...newFiles];
    } else {
      this.userPhotos = [...this.userPhotos, ...newFiles];
    }

    if (filesToAdd < files.length) {
      this.snackBar.open(`Only ${filesToAdd} files added. Maximum ${maxFiles} files allowed`, 'Close', { duration: 3000 });
    } else {
      this.snackBar.open(`${newFiles.length} file(s) added successfully`, 'Close', { duration: 2000 });
    }

    // Reset input
    event.target.value = '';
    
    // Track section changes when images/photos are added
    this.trackSectionChanges();
  }

  // Get product images count
  getProductImagesCount(): number {
    return this.productImages.length + this.existingProductImages.length;
  }

  // Get user photos count
  getUserPhotosCount(): number {
    return this.userPhotos.length + this.existingUserPhotos.length;
  }

  // Get image preview URL
  getImagePreview(file: File): string {
    return URL.createObjectURL(file);
  }

  // Remove product image
  removeProductImage(index: number): void {
    this.productImages.splice(index, 1);
    this.snackBar.open('Image removed', 'Close', { duration: 2000 });
    this.trackSectionChanges();
  }

  // Remove user photo
  removeUserPhoto(index: number): void {
    this.userPhotos.splice(index, 1);
    this.snackBar.open('Photo removed', 'Close', { duration: 2000 });
    this.trackSectionChanges();
  }

  // Delete existing product image
  deleteExistingProductImage(index: number): void {
    const image = this.existingProductImages[index];
    if (image && image.public_id) {
      this.productImagesToDelete.push(image.public_id);
    }
    this.existingProductImages.splice(index, 1);
    this.snackBar.open('Image marked for deletion', 'Close', { duration: 2000 });
    this.trackSectionChanges();
  }

  // Delete existing user photo
  deleteExistingUserPhoto(index: number): void {
    const photo = this.existingUserPhotos[index];
    if (photo && photo.public_id) {
      this.userPhotosToDelete.push(photo.public_id);
    }
    this.existingUserPhotos.splice(index, 1);
    this.snackBar.open('Photo marked for deletion', 'Close', { duration: 2000 });
    this.trackSectionChanges();
  }

  // Close dropdowns when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.relative')) {
      this.isConstitutionDropdownOpen = false;
      this.isBusinessPanDropdownOpen = false;
      this.isBankTypeDropdownOpen = false;
      this.isNewCurrentAccountDropdownOpen = false;
      this.isNewBusinessAccountDropdownOpen = false;
    }
  }
}
