import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, ActivatedRoute } from '@angular/router';
import { EnquiryService } from '../../services/enquiry.service';
import { EnquiryTransferService } from '../../services/enquiry-transfer.service';
import { ClientService } from '../../services/client.service';
import { UserService, User } from '../../services/user.service';
import { Enquiry, COMMENT_OPTIONS } from '../../models/enquiry.interface';
import { Subject, timer } from 'rxjs';
import { takeUntil, switchMap, debounceTime } from 'rxjs/operators';

@Component({
  selector: 'app-enquiry',
  templateUrl: './enquiry.component.html',
  styleUrls: ['./enquiry.component.scss']
})
export class EnquiryComponent implements OnInit, OnDestroy {
  enquiries: Enquiry[] = [];
  filteredEnquiries: Enquiry[] = [];
  paginatedEnquiries: Enquiry[] = []; // Paginated data for display
  displayedColumns: string[] = [
    'sno', 'date', 'owner_name', 'business_name', 'phone_number',
    'gst', 'staff', 'suggested_staff', 'comments', 'shortlist', 'actions'
  ];
  
  // Pagination properties
  currentPage = 1;
  pageSize = 50;
  totalPages = 0;
  
  staffMembers: User[] = [];
  uniqueStaffMembers: string[] = [];
  registrationForm: FormGroup;
  showRegistrationForm = false;
  loading = false; // Only used for form submission, not for data loading
  isBackgroundRefresh = false; // Track if this is a background refresh
  searchTerm = '';
  
  // Filter and Sort Properties
  sortOption = 'date_new'; // Default sort by newest first
  staffFilter = 'all';
  gstFilter = 'all';
  interestFilter = 'all'; // New interest level filter
  shortlistFilter = 'all'; // New shortlist filter
  fromDate: Date | null = null;
  toDate: Date | null = null;
  
  // Edit mode tracking
  isEditMode = false;
  editingEnquiryId: string | null = null;
  originalFormValues: any = null; // Store original values to detect changes
  hasFormChanges = false; // Track if form has been modified
  private formChangeSubscription: any = null; // Track form change subscription
  private isDropdownInteraction = false; // Track if user is interacting with dropdowns
  originalStaffValue: string | null = null; // Track original staff assignment to lock dropdown (public for template access)
  
  // Duplicate mobile number message tracking
  showDuplicateMessage = false;

  // Delete confirmation dialog
  showDeleteDialog = false;
  selectedEnquiryForDelete: Enquiry | null = null;
  isDeleting = false;

  // Cleanup subject for subscriptions
  private destroy$ = new Subject<void>();

  // Track existing clients by mobile number for shortlist functionality
  private existingClientsByMobile = new Map<string, any>();

  // Add debounce subjects for business nature and additional comments
  private businessNatureDebounce = new Subject<{enquiry: Enquiry, value: string}>();
  private additionalCommentsDebounce = new Subject<{enquiry: Enquiry, value: string}>();
  private secondaryMobileDebounce = new Subject<{enquiry: Enquiry, value: string}>();

  // Country codes for mobile numbers
  countryCodes = [
    { code: '+91', country: 'India', flag: '🇮🇳' },
    { code: '+1', country: 'USA/Canada', flag: '🇺🇸' },
    { code: '+44', country: 'United Kingdom', flag: '🇬🇧' },
    { code: '+971', country: 'UAE', flag: '🇦🇪' },
    { code: '+966', country: 'Saudi Arabia', flag: '🇸🇦' },
    { code: '+65', country: 'Singapore', flag: '🇸🇬' },
    { code: '+60', country: 'Malaysia', flag: '🇲🇾' },
    { code: '+61', country: 'Australia', flag: '🇦🇺' },
    { code: '+49', country: 'Germany', flag: '🇩🇪' },
    { code: '+33', country: 'France', flag: '🇫🇷' }
  ];

  predefinedComments = [
    'Will share Doc',
    'Doc Shared(Yet to Verify)',
    'Verified(Shortlisted)',
    'Not Eligible',
    'No MSME',
    'No GST',
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
    'Not connected',
    'By Mistake',
    'GST Cancelled'
  ];

  // Interest level categorization
  interestComments = [
    'Will share Doc',
    'Doc Shared(Yet to Verify)',
    'Verified(Shortlisted)'
  ];

  notInterestedComments = [
    'Not Eligible',
    'No MSME',
    'Start Up',
    'Personal Loan',
    'Asking Less than 5 Laks',
    '3rd call completed',
    'By Mistake'
  ];

  noGstComments = [
    'No GST'
  ];

  gstCancelledComments = [
    'GST Cancelled'
  ];

  pendingComments = [
    'Aadhar/PAN name mismatch',
    'MSME/GST Address Different',
    'Will call back'
  ];

  unknownComments = [
    '1st call completed',
    '2nd call completed',
    'Switch off',
    'Not connected'
  ];

  // Alias for template compatibility
  commentOptions = this.predefinedComments;

  // Business type options
  businessTypeOptions = [
    'Private Limited',
    'Proprietorship', 
    'Partnership'
  ];

  // Custom dropdown properties
  openDropdownId: string | null = null;
  businessTypes = ['Retail', 'Wholesale', 'Manufacturing', 'Service', 'Trading', 'Other'];
  
  // Filter dropdown states
  isStaffDropdownOpen = false;
  isGstDropdownOpen = false;
  isInterestDropdownOpen = false;
  isShortlistDropdownOpen = false;
  isSortDropdownOpen = false;
  
  // Expose Math to template
  Math = Math;

  constructor(
    private fb: FormBuilder,
    private enquiryService: EnquiryService,
    private clientService: ClientService,
    private userService: UserService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private router: Router,
    private route: ActivatedRoute,
    private enquiryTransferService: EnquiryTransferService
  ) {
    this.registrationForm = this.createRegistrationForm();
  }

  ngOnInit(): void {
    this.checkMobileView();
    this.loadEnquiries();
    this.loadStaffMembers();
    this.checkExistingClients();
    
    // Check for edit query parameter
    this.route.queryParams.subscribe(params => {
      if (params['edit']) {
        const enquiryId = params['edit'];
        // Wait for enquiries to load, then trigger edit
        setTimeout(() => {
          const enquiry = this.enquiries.find(e => e._id === enquiryId);
          if (enquiry) {
            this.editEnquiry(enquiry);
          }
        }, 500);
      }
    });
    
    // Listen for window focus to refresh client data
    window.addEventListener('focus', () => {
      this.checkExistingClients();
    });
    
    // Smart refresh: Only update changed rows every 1 second
    timer(1000, 1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        // Only refresh if not currently editing to avoid disrupting user
        if (!this.showRegistrationForm) {
          this.smartRefreshEnquiries(); // Smart refresh - only changed rows
        }
      });
    
    // Set up debouncing for business nature updates (1 second delay)
    this.businessNatureDebounce.pipe(
      debounceTime(1000),
      takeUntil(this.destroy$),
      switchMap(({enquiry, value}) => {
        // Update the local value immediately for UI feedback
        enquiry.business_name = value;
        // Call the service to update the enquiry in the backend
        if (enquiry._id) {
          return this.enquiryService.updateEnquiry(enquiry._id, { business_name: value });
        }
        return [];
      })
    ).subscribe({
      next: (updatedEnquiry: any) => {
        this.handleUpdateResponse(updatedEnquiry, 'Business nature');
      },
      error: (error: any) => {
        console.error('Error updating enquiry business nature:', error);
        this.snackBar.open('Error updating business nature', 'Close', { duration: 3000 });
      }
    });
    
    // Set up debouncing for additional comments updates (1 second delay)
    this.additionalCommentsDebounce.pipe(
      debounceTime(1000),
      takeUntil(this.destroy$),
      switchMap(({enquiry, value}) => {
        // Update the local value immediately for UI feedback
        enquiry.additional_comments = value;
        // Call the service to update the enquiry in the backend
        if (enquiry._id) {
          return this.enquiryService.updateEnquiry(enquiry._id, { additional_comments: value });
        }
        return [];
      })
    ).subscribe({
      next: (updatedEnquiry: any) => {
        this.handleUpdateResponse(updatedEnquiry, 'Additional comment');
      },
      error: (error: any) => {
        console.error('Error updating enquiry additional comments:', error);
        this.snackBar.open('Error updating additional comment', 'Close', { duration: 3000 });
      }
    });
    
    // Set up debouncing for secondary mobile updates (1 second delay)
    this.secondaryMobileDebounce.pipe(
      debounceTime(1000),
      takeUntil(this.destroy$),
      switchMap(({enquiry, value}) => {
        // Update the local value immediately for UI feedback
        enquiry.secondary_mobile_number = value;
        // Call the service to update the enquiry in the backend
        if (enquiry._id) {
          return this.enquiryService.updateEnquiry(enquiry._id, { secondary_mobile_number: value });
        }
        return [];
      })
    ).subscribe({
      next: (updatedEnquiry: any) => {
        this.handleUpdateResponse(updatedEnquiry, 'Secondary mobile');
      },
      error: (error: any) => {
        console.error('Error updating enquiry secondary mobile:', error);
        this.snackBar.open('Error updating secondary mobile', 'Close', { duration: 3000 });
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  createRegistrationForm(): FormGroup {
    const form = this.fb.group({
      date: [new Date(), Validators.required],
      wati_name: ['', Validators.required],
      owner_name: [''],
      user_name: [''],
      country_code: ['+91', Validators.required], // Default to India
      mobile_number: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      phone_number: ['', [Validators.pattern(/^\d{10}$/)]],
      email_address: ['', [Validators.email]],
      secondary_mobile_number: [''],
      gst: [''], // Optional - user can leave this unselected
      gst_status: [''],
      business_type: [''],
      business_name: [''],
      loan_amount: [''],
      loan_purpose: [''],
      annual_revenue: [''],
      business_document_url: [''],
      staff: ['', Validators.required],
      comments: [''], // Made optional - removed Validators.required
      additional_comments: ['']
    });
    
    // Add value change listener for comments to dynamically validate business_name
    form.get('comments')?.valueChanges.subscribe(value => {
      const businessNameControl = form.get('business_name');
      if (this.isEditMode && value === 'Not Eligible') {
        businessNameControl?.setValidators([Validators.required]);
      } else {
        businessNameControl?.clearValidators();
      }
      businessNameControl?.updateValueAndValidity();
    });
    
    return form;
  }

  loadEnquiries(isBackgroundRefresh: boolean = false): void {
    // Never show loading indicator for data refresh (instant display)
    this.isBackgroundRefresh = isBackgroundRefresh;
    
    this.enquiryService.getAllEnquiries()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (enquiries) => {
          this.enquiries = enquiries.map((enquiry, index) => ({
            ...enquiry,
            sno: index + 1
          }));
          this.extractUniqueStaffMembers();
          this.applyFilters();
          this.isBackgroundRefresh = false;
        },
        error: (error) => {
          console.error('Error loading enquiries:', error);
          // Only show error snackbar if this is not a background refresh
          if (!isBackgroundRefresh) {
            this.snackBar.open('Error loading enquiries', 'Close', { duration: 3000 });
          }
          this.isBackgroundRefresh = false;
        }
      });
  }

  /**
   * Smart refresh: Only updates rows that have changed
   * Much more efficient for large datasets (5000+ records)
   */
  smartRefreshEnquiries(): void {
    this.enquiryService.getAllEnquiries()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (freshEnquiries) => {
          let hasChanges = false;
          
          // Check if count changed (new enquiries added or deleted)
          if (freshEnquiries.length !== this.enquiries.length) {
            hasChanges = true;
            // Full refresh if count changed
            this.enquiries = freshEnquiries.map((enquiry, index) => ({
              ...enquiry,
              sno: index + 1
            }));
          } else {
            // Compare each enquiry and update only changed ones
            freshEnquiries.forEach((freshEnquiry, index) => {
              const existingEnquiry = this.enquiries[index];
              
              // Check if this enquiry has changed by comparing updated_at or key fields
              if (existingEnquiry && existingEnquiry._id === freshEnquiry._id) {
                // Compare critical fields to detect changes
                const hasFieldChanges = 
                  existingEnquiry.staff !== freshEnquiry.staff ||
                  existingEnquiry.comments !== freshEnquiry.comments ||
                  existingEnquiry.business_name !== freshEnquiry.business_name ||
                  existingEnquiry.additional_comments !== freshEnquiry.additional_comments ||
                  existingEnquiry.business_type !== freshEnquiry.business_type ||
                  existingEnquiry.gst_status !== freshEnquiry.gst_status ||
                  JSON.stringify(existingEnquiry.updated_at) !== JSON.stringify(freshEnquiry.updated_at);
                
                if (hasFieldChanges) {
                  // Update only this specific enquiry
                  this.enquiries[index] = { ...freshEnquiry, sno: index + 1 };
                  hasChanges = true;
                }
              } else if (!existingEnquiry || existingEnquiry._id !== freshEnquiry._id) {
                // IDs don't match, need full refresh
                hasChanges = true;
                this.enquiries = freshEnquiries.map((enquiry, idx) => ({
                  ...enquiry,
                  sno: idx + 1
                }));
                return; // Exit forEach
              }
            });
          }
          
          // Only re-apply filters and update UI if something changed
          if (hasChanges) {
            this.extractUniqueStaffMembers();
            this.applyFilters();
          }
        },
        error: (error) => {
          console.error('Error in smart refresh:', error);
          // Silently fail - don't disrupt user experience
        }
      });
  }

  loadStaffMembers(): void {
    this.userService.getUsers()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          // Handle the response structure properly
          if (response && response.users && Array.isArray(response.users)) {
            // Filter out paused users and only include active users (both admin and regular users)
            // We'll filter admins out when displaying staff options, but keep them in the list for other purposes
            const activeUsers = response.users.filter((user: User) => 
              (user.role === 'user' || user.role === 'admin') && 
              (user.status !== 'paused')
            );
            
            // Sort staff members alphabetically
            this.staffMembers = activeUsers.sort((a, b) => {
              const nameA = a.username || a.email || '';
              const nameB = b.username || b.email || '';
              return nameA.localeCompare(nameB);
            });
          } else {
            console.warn('Unexpected response structure from getUsers:', response);
            this.staffMembers = [];
          }
          this.extractUniqueStaffMembers();
        },
        error: (error) => {
          console.error('Error loading staff members:', error);
          this.staffMembers = [];
          this.extractUniqueStaffMembers();
        }
      });
  }

  extractUniqueStaffMembers(): void {
    const staffSet = new Set<string>();
    
    // Add staff from enquiries (exclude Admin)
    this.enquiries.forEach(enquiry => {
      if (enquiry.staff && enquiry.staff !== 'Admin') {
        staffSet.add(enquiry.staff);
      }
    });
    
    // Add staff from staff members list (exclude Admin role users)
    this.staffMembers.forEach(staff => {
      const staffName = staff.username || staff.email;
      if (staffName && staffName !== 'Admin' && staff.role !== 'admin') {
        staffSet.add(staffName);
      }
    });
    
    // Convert to array and sort with priority order
    const staffArray = Array.from(staffSet);
    
    // Define priority staff members (shown at top) - removed Admin
    const priorityStaff = ['Public Form'];
    
    // Separate priority and regular staff
    const priority: string[] = [];
    const regular: string[] = [];
    
    staffArray.forEach(staff => {
      if (priorityStaff.includes(staff)) {
        priority.push(staff);
      } else {
        regular.push(staff);
      }
    });
    
    // Sort priority staff in defined order
    priority.sort((a, b) => {
      return priorityStaff.indexOf(a) - priorityStaff.indexOf(b);
    });
    
    // Sort regular staff alphabetically
    regular.sort();
    
    // Combine: priority first, then regular staff
    this.uniqueStaffMembers = [...priority, ...regular];
  }

  /**
   * Get staff members in ordered sequence for assignment
   * Special cases (Public Form, WhatsApp Bot) are shown first
   * Regular staff members are shown in alphabetical order
   */
  getOrderedStaffMembers(): any[] {
    // Return only regular staff members (not admins) sorted alphabetically
    return this.staffMembers.filter(staff => staff.role === 'user');
  }

  /**
   * Get staff members for edit mode dropdown (excludes Public Form)
   * Used in edit-enquiry staff assignment dropdown
   */
  getStaffMembersForEdit(): string[] {
    // Filter out Public Form from uniqueStaffMembers
    return this.uniqueStaffMembers.filter(staff => 
      staff !== 'Public Form' && 
      staff !== 'WhatsApp Form' && 
      staff !== 'WhatsApp Bot' && 
      staff !== 'WhatsApp Web'
    );
  }

  /**
   * Get regular staff members (excluding admins) for round-robin assignment
   * Excludes: Admin role, Public Form, WhatsApp Web, WhatsApp Bot, WhatsApp Form
   */
  getRegularStaffMembers(): string[] {
    // Get only regular staff members (role: 'user', exclude admins)
    const regularStaffMembers = this.staffMembers
      .filter(staff => staff.role === 'user') // Only regular staff, not admins
      .map(staff => staff.username || staff.email)
      .filter(name => name && 
              name !== 'Admin' && 
              name !== 'Public Form' && 
              name !== 'WhatsApp Web' && 
              name !== 'WhatsApp Bot' && 
              name !== 'WhatsApp Form');
    
    // Sort staff members alphabetically (case-insensitive) to ensure consistent order
    return regularStaffMembers.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  }

  /**
   * Get the next staff member in round-robin sequence
   * This implements the round-robin logic where staff are assigned in order:
   * Staff members are sorted alphabetically and assigned based on who has the least assignments
   * Excludes: Admin, Public Form, WhatsApp Web
   */
  getNextStaffMember(): string | null {
    const regularStaffMembers = this.getRegularStaffMembers();
    
    if (regularStaffMembers.length === 0) {
      return null;
    }
    
    // Count assignments for each staff member
    const staffAssignmentCount: { [key: string]: number } = {};
    
    // Initialize counts for all staff members
    regularStaffMembers.forEach(staff => {
      staffAssignmentCount[staff] = 0;
    });
    
    // Count how many enquiries have been assigned to each staff member (not special forms)
    this.enquiries.forEach(enquiry => {
      if (enquiry.staff && 
          enquiry.staff !== 'Public Form' && 
          enquiry.staff !== 'WhatsApp Bot' && 
          enquiry.staff !== 'WhatsApp Form' &&
          enquiry.staff !== 'WhatsApp Web' &&
          enquiry.staff !== 'Admin' &&
          staffAssignmentCount.hasOwnProperty(enquiry.staff)) {
        staffAssignmentCount[enquiry.staff]++;
      }
    });
    
    // Find staff member with minimum assignments
    // If there's a tie, alphabetical order determines priority (already sorted)
    let minAssignments = Math.min(...Object.values(staffAssignmentCount));
    
    for (const staff of regularStaffMembers) {
      if (staffAssignmentCount[staff] === minAssignments) {
        return staff;
      }
    }
    
    return regularStaffMembers[0] || null;
  }

  /**
   * Get suggested staff member for an enquiry
   * Returns the next staff in round-robin if actions are unlocked
   */
  getSuggestedStaff(enquiry: Enquiry): string {
    // Only show suggestion if actions are unlocked
    if (this.areActionsLocked(enquiry)) {
      return '-';
    }
    
    // Don't show suggestion if staff is already assigned (not special forms)
    if (enquiry.staff && 
        enquiry.staff !== 'Public Form' && 
        enquiry.staff !== 'WhatsApp Form' && 
        enquiry.staff !== 'WhatsApp Bot' && 
        enquiry.staff !== 'WhatsApp Web') {
      return '-';
    }
    
    // Get the next staff member in round-robin
    const nextStaff = this.getNextStaffMember();
    return nextStaff || '-';
  }

  /**
   * Check if action buttons should be locked for an enquiry
   * Locks actions until staff is assigned to all previous enquiries
   */
  areActionsLocked(enquiry: Enquiry): boolean {
    // Never lock actions for enquiries that already have staff assigned (not special forms)
    if (enquiry.staff && 
        enquiry.staff !== 'Public Form' && 
        enquiry.staff !== 'WhatsApp Form' && 
        enquiry.staff !== 'WhatsApp Bot' && 
        enquiry.staff !== 'WhatsApp Web') {
      return false;
    }
    
    // Get all enquiries sorted by date (oldest first)
    const sortedEnquiries = [...this.enquiries].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateA - dateB;
    });
    
    // Find the index of current enquiry
    const currentIndex = sortedEnquiries.findIndex(e => e._id === enquiry._id);
    
    // Check if there are any previous enquiries without staff assigned
    for (let i = 0; i < currentIndex; i++) {
      const prevEnquiry = sortedEnquiries[i];
      const hasStaffAssigned = prevEnquiry.staff && 
                               prevEnquiry.staff !== 'Public Form' && 
                               prevEnquiry.staff !== 'WhatsApp Form' && 
                               prevEnquiry.staff !== 'WhatsApp Bot' && 
                               prevEnquiry.staff !== 'WhatsApp Web';
      
      // If any previous enquiry doesn't have staff assigned, lock this one
      if (!hasStaffAssigned) {
        return true;
      }
    }
    
    // All previous enquiries have staff assigned, so unlock this one
    return false;
  }

  /**
   * Check if an enquiry should allow staff assignment based on sequential order
   * Enquiries must be processed from oldest to newest
   * Only allow staff assignment for the oldest unassigned enquiry
   */
  canAssignStaff(enquiry: Enquiry): boolean {
    // Always allow assignment for Public Form and WhatsApp Bot
    if (enquiry.staff === 'Public Form' || enquiry.staff === 'WhatsApp Bot' || enquiry.staff === 'WhatsApp Form') {
      return true;
    }
    
    // If staff is already assigned and locked, don't allow changes
    if (enquiry.staff_locked) {
      return false;
    }
    
    // Sort enquiries by date (oldest first)
    const sortedEnquiries = [...this.enquiries].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    // Find the index of the current enquiry in the sorted list
    const enquiryIndex = sortedEnquiries.findIndex(e => e._id === enquiry._id);
    
    // If this is the first enquiry, allow assignment
    if (enquiryIndex === 0) {
      return true;
    }
    
    // Check if all previous enquiries have staff assigned
    for (let i = 0; i < enquiryIndex; i++) {
      const previousEnquiry = sortedEnquiries[i];
      // If any previous enquiry doesn't have a real staff member assigned, block this one
      if (!previousEnquiry.staff || 
          previousEnquiry.staff === 'Public Form' || 
          previousEnquiry.staff === 'WhatsApp Bot' || 
          previousEnquiry.staff === 'WhatsApp Form') {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Check if staff assignment should be available (for Public Form or WhatsApp Bot)
   * Also check if sequential assignment rules allow it
   */
  shouldShowStaffAssignment(enquiry: Enquiry): boolean {
    // Always show for Public Form, WhatsApp Bot, or unassigned
    const isSpecialForm = enquiry.staff === 'Public Form' || 
                         enquiry.staff === 'WhatsApp Bot' || 
                         enquiry.staff === 'WhatsApp Form' || 
                         !enquiry.staff;
    
    // If it's a special form, always show
    if (isSpecialForm) {
      return true;
    }
    
    // For regular staff assignments, check sequential rules
    return this.canAssignStaff(enquiry);
  }

  /**
   * Check if the staff dropdown should be disabled for this enquiry
   * Returns true if the enquiry should be disabled (locked)
   */
  isStaffAssignmentDisabled(enquiry: Enquiry): boolean {
    // Never disable for special forms
    if (enquiry.staff === 'Public Form' || enquiry.staff === 'WhatsApp Bot' || enquiry.staff === 'WhatsApp Form' || !enquiry.staff) {
      return false;
    }
    
    // If already assigned, disable changes
    if (enquiry.staff) {
      return true;
    }
    
    // Check if this enquiry can be assigned based on sequential rules
    return !this.canAssignStaff(enquiry);
  }

  /**
   * Check if staff dropdown should be disabled in edit mode
   * Returns true if staff has already been assigned (not special forms)
   */
  isStaffDropdownDisabledInEditMode(): boolean {
    // Only disable in edit mode
    if (!this.isEditMode) {
      return false;
    }
    
    // Disable if original staff value was set (not a special form)
    return this.originalStaffValue !== null;
  }

  /**
   * Check if comments dropdown should be disabled
   * Returns true if no staff has been assigned yet
   */
  isCommentsDropdownDisabled(): boolean {
    const staffValue = this.registrationForm.get('staff')?.value;
    
    // Disable if no staff is selected or if it's a special form
    if (!staffValue || staffValue === '' || 
        staffValue === 'Public Form' || 
        staffValue === 'WhatsApp Bot' || 
        staffValue === 'WhatsApp Form') {
      return true;
    }
    
    return false;
  }

  /**
   * Auto-select the next staff member in the round-robin sequence
   * This helps guide users to follow the correct assignment order
   */
  autoSelectNextStaff(enquiry: Enquiry): void {
    // Only auto-select if no staff is currently assigned and the enquiry can be assigned
    if ((!enquiry.staff || enquiry.staff === 'Public Form' || enquiry.staff === 'WhatsApp Bot' || enquiry.staff === 'WhatsApp Form') 
        && this.canAssignStaff(enquiry)) {
      const nextStaff = this.getNextStaffMember();
      if (nextStaff) {
        // Automatically select the next staff member in the dropdown
        enquiry.staff = nextStaff;
        // Trigger the update immediately
        this.updateStaff(enquiry, nextStaff);
      }
    }
  }

  // Update staff for an enquiry
  updateStaff(enquiry: Enquiry, staff: string): void {
    // Check if this enquiry can be assigned staff
    if (!this.canAssignStaff(enquiry)) {
      this.snackBar.open('Please assign staff to older enquiries first', 'Close', { 
        duration: 3000,
        panelClass: ['error-snackbar']
      });
      return;
    }
    
    // If this is a regular staff member assignment (not special form), 
    // check if it follows the round-robin sequence
    if (staff !== 'Public Form' && staff !== 'WhatsApp Bot' && staff !== 'WhatsApp Form') {
      const nextStaff = this.getNextStaffMember();
      // If there's a specific next staff member and it doesn't match the selected one,
      // we show a confirmation dialog to the user
      if (nextStaff && nextStaff !== staff) {
        if (!confirm(`The suggested staff member is ${nextStaff}. Are you sure you want to assign ${staff} instead? This breaks the round-robin sequence.`)) {
          // User cancelled the operation, revert to suggested staff
          enquiry.staff = nextStaff;
          // Re-apply filters to update the UI
          this.applyFilters();
          return;
        }
      }
    }
    
    // Update the enquiry locally first
    enquiry.staff = staff;
    
    // Call the service to update the enquiry in the backend
    if (enquiry._id) {
      this.enquiryService.updateEnquiry(enquiry._id, { staff: staff })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (updatedEnquiry: any) => {
            // Update the local enquiry with the response from the server
            const index = this.enquiries.findIndex(e => e._id === enquiry._id);
            if (index !== -1) {
              this.enquiries[index] = { ...this.enquiries[index], ...updatedEnquiry };
              this.applyFilters();
            }
            
            // Show appropriate notification based on WhatsApp status
            let message = 'Staff updated successfully!';
            let panelClass = ['success-snackbar'];
            
            // Check WhatsApp status for staff assignment
            if (updatedEnquiry.whatsapp_sent === true) {
              message += ' 📱 WhatsApp message sent!';
            } else if (updatedEnquiry.whatsapp_error) {
              // Check for quota or other errors
              if (updatedEnquiry.whatsapp_error.includes('quota') || updatedEnquiry.whatsapp_error.includes('Quota') || updatedEnquiry.whatsapp_error.includes('466')) {
                message += ' ⚠️ Limit Reached';
                panelClass = ['warning-snackbar'];
              } else {
                message += ' ❌ Message not sent - ' + updatedEnquiry.whatsapp_error;
                panelClass = ['error-snackbar'];
              }
            }
            
            this.snackBar.open(message, 'Close', { 
              duration: 5000,
              panelClass: panelClass
            });
          },
          error: (error) => {
            console.error('Error updating enquiry staff:', error);
            this.snackBar.open('Error updating staff', 'Close', { duration: 3000, panelClass: ['error-snackbar'] });
          }
        });
    }
  }

  onGstChange(): void {
    const gstValue = this.registrationForm.get('gst')?.value;
    const gstStatusControl = this.registrationForm.get('gst_status');
    
    if (gstValue === 'Yes') {
      gstStatusControl?.setValidators([Validators.required]);
      gstStatusControl?.enable();
    } else {
      gstStatusControl?.clearValidators();
      gstStatusControl?.setValue('');
      gstStatusControl?.disable();
    }
    gstStatusControl?.updateValueAndValidity();
  }

  // Removed secondary country code change handler as we now use a single country code for both numbers

  // Check if mobile number already exists
  checkMobileNumberExists(mobileNumber: string): boolean {
    if (!mobileNumber || mobileNumber.trim() === '') {
      return false;
    }
    
    // If in edit mode, exclude the current enquiry from the check
    if (this.isEditMode && this.editingEnquiryId) {
      return this.enquiries.some(enquiry => 
        enquiry.mobile_number === mobileNumber && enquiry._id !== this.editingEnquiryId
      );
    }
    
    // For new enquiries, check all existing mobile numbers
    return this.enquiries.some(enquiry => enquiry.mobile_number === mobileNumber);
  }

  // Update business type for an enquiry
  updateBusinessType(enquiry: Enquiry, businessType: string): void {
    enquiry.business_type = businessType;
    // Call the service to update the enquiry in the backend
    if (enquiry._id) {
      this.enquiryService.updateEnquiry(enquiry._id, { business_type: businessType })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (updatedEnquiry: any) => {
            // Update the local enquiry with the response from the server
            const index = this.enquiries.findIndex(e => e._id === enquiry._id);
            if (index !== -1) {
              this.enquiries[index] = { ...this.enquiries[index], ...updatedEnquiry };
              this.applyFilters();
            }
            
            // Show appropriate notification based on WhatsApp status
            let message = 'Business type updated successfully!';
            let panelClass = ['success-snackbar'];
            
            if (updatedEnquiry.whatsapp_sent === true) {
              message += ' 📱 WhatsApp message sent!';
            } else if (updatedEnquiry.whatsapp_error) {
              if (updatedEnquiry.whatsapp_error.includes('quota') || updatedEnquiry.whatsapp_error.includes('Quota')) {
                message += ' ⚠️ WhatsApp message not sent due to quota reached.';
              } else {
                message += ' ❌ WhatsApp message error: ' + updatedEnquiry.whatsapp_error;
              }
            }
            
            this.snackBar.open(message, 'Close', { 
              duration: 5000,
              panelClass: panelClass
            });
          },
          error: (error) => {
            console.error('Error updating enquiry business type:', error);
            this.snackBar.open('Error updating business type', 'Close', { duration: 3000 });
          }
        });
    }
  }

  // Update business nature for an enquiry with debouncing
  updateBusinessNature(enquiry: Enquiry, businessNature: string): void {
    // Instead of calling the service directly, emit to the debounce subject
    // This will trigger the update after a 3-second delay
    this.businessNatureDebounce.next({enquiry, value: businessNature});
  }

  // Update comments for an enquiry
  updateComments(enquiry: Enquiry, comments: string): void {
    enquiry.comments = comments;
    
    // Check if the comment is "Verified(Shortlisted)" and redirect to new client page
    if (comments === 'Verified(Shortlisted)') {
      // Validate required data before proceeding
      const ownerName = enquiry.owner_name || enquiry.wati_name;
      const mobileNumber = enquiry.mobile_number || enquiry.phone_number;
      
      if (!ownerName || !mobileNumber) {
        this.snackBar.open('Missing required data (Owner name or mobile number). Please complete the enquiry first.', 'Close', { 
          duration: 5000,
          panelClass: ['error-snackbar']
        });
        return;
      }
      
      // Store enquiry data in session storage for the new client form
      const enquiryData = {
        owner_name: ownerName,
        business_name: enquiry.business_name || '',
        email_address: enquiry.email_address || '',
        mobile_number: mobileNumber,
        secondary_mobile_number: enquiry.secondary_mobile_number || '',
        loan_amount: enquiry.loan_amount || '',
        loan_purpose: enquiry.loan_purpose || '',
        business_document_url: enquiry.business_document_url || null,
        enquiry_id: enquiry._id,
        verified_date: new Date().toISOString()
      };
      
      this.enquiryTransferService.setEnquiryData(enquiryData);
      
      // Update the comment first, then redirect
      if (enquiry._id) {
        this.enquiryService.updateEnquiry(enquiry._id, { comments: comments })
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (updatedEnquiry: any) => {
              // Update the local enquiry with the response from the server
              const index = this.enquiries.findIndex(e => e._id === enquiry._id);
              if (index !== -1) {
                this.enquiries[index] = { ...this.enquiries[index], ...updatedEnquiry };
              }
              
              // Update in filtered list without reordering
              const filteredIndex = this.filteredEnquiries.findIndex(e => e._id === enquiry._id);
              if (filteredIndex !== -1) {
                this.filteredEnquiries[filteredIndex] = { ...this.filteredEnquiries[filteredIndex], ...updatedEnquiry };
              }
              
              // Show success message and redirect
              this.snackBar.open('Enquiry verified! Redirecting to new client form...', 'Close', { 
                duration: 3000,
                panelClass: ['success-snackbar']
              });
              
              // Redirect to new client page after a short delay
              setTimeout(() => {
                this.router.navigate(['/new-client']);
              }, 1500);
            },
            error: (error) => {
              console.error('Error updating enquiry comments:', error);
              this.snackBar.open('Error updating comment', 'Close', { duration: 3000 });
            }
          });
      }
      return;
    }
    
    // Regular comment update for non-verified comments
    if (enquiry._id) {
      this.enquiryService.updateEnquiry(enquiry._id, { comments: comments })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (updatedEnquiry: any) => {
            // Update the local enquiry with the response from the server
            const index = this.enquiries.findIndex(e => e._id === enquiry._id);
            if (index !== -1) {
              this.enquiries[index] = { ...this.enquiries[index], ...updatedEnquiry };
            }
            
            // Update in filtered list without reordering
            const filteredIndex = this.filteredEnquiries.findIndex(e => e._id === enquiry._id);
            if (filteredIndex !== -1) {
              this.filteredEnquiries[filteredIndex] = { ...this.filteredEnquiries[filteredIndex], ...updatedEnquiry };
            }
            
            // Show appropriate notification based on WhatsApp status
            let message = 'Comment updated successfully!';
            let panelClass = ['success-snackbar'];
            
            if (updatedEnquiry.whatsapp_sent === true) {
              message += ' 📱 WhatsApp message sent!';
            } else if (updatedEnquiry.whatsapp_error) {
              if (updatedEnquiry.whatsapp_error.includes('quota') || updatedEnquiry.whatsapp_error.includes('Quota')) {
                message += ' ⚠️ WhatsApp message not sent due to quota reached.';
              } else {
                message += ' ❌ WhatsApp message error: ' + updatedEnquiry.whatsapp_error;
              }
            }
            
            this.snackBar.open(message, 'Close', { 
              duration: 5000,
              panelClass: panelClass
            });
          },
          error: (error) => {
            console.error('Error updating enquiry comments:', error);
            this.snackBar.open('Error updating comment', 'Close', { duration: 3000 });
          }
        });
    }
  }

  // Update additional comments for an enquiry with debouncing
  updateAdditionalComments(enquiry: Enquiry, additionalComments: string): void {
    // Instead of calling the service directly, emit to the debounce subject
    // This will trigger the update after a 3-second delay
    this.additionalCommentsDebounce.next({enquiry, value: additionalComments});
  }

  // Update secondary mobile number for an enquiry with debouncing
  updateSecondaryMobile(enquiry: Enquiry, secondaryMobile: string): void {
    // If user enters a 10-digit number, add country code for storage
    let fullSecondaryMobile = secondaryMobile;
    if (secondaryMobile && secondaryMobile.length === 10 && /^\d{10}$/.test(secondaryMobile)) {
      // Add default country code (+91) for 10-digit numbers
      fullSecondaryMobile = '91' + secondaryMobile;
    }
    
    // Update the local value immediately for UI feedback (keep display format)
    enquiry.secondary_mobile_number = fullSecondaryMobile;
    
    // Instead of calling the service directly, emit to the debounce subject
    // This will trigger the update after a 3-second delay
    this.secondaryMobileDebounce.next({enquiry, value: fullSecondaryMobile});
  }

  // Handle GST change for an enquiry
  onGstChangeForEnquiry(enquiry: Enquiry, gstValue: 'Yes' | 'No' | 'Not Selected' | ''): void {
    enquiry.gst = gstValue;
    // If GST is not 'Yes', clear the GST status
    if (gstValue !== 'Yes') {
      enquiry.gst_status = undefined;
    }
    // Call the service to update the enquiry in the backend
    if (enquiry._id) {
      const updateData: any = { gst: gstValue };
      if (gstValue !== 'Yes') {
        updateData.gst_status = '';
      }
      
      this.enquiryService.updateEnquiry(enquiry._id, updateData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (updatedEnquiry: any) => {
            // Update the local enquiry with the response from the server
            const index = this.enquiries.findIndex(e => e._id === enquiry._id);
            if (index !== -1) {
              this.enquiries[index] = { ...this.enquiries[index], ...updatedEnquiry };
              this.applyFilters();
            }
            
            // Show appropriate notification based on WhatsApp status
            let message = 'GST status updated successfully!';
            let panelClass = ['success-snackbar'];
            
            if (updatedEnquiry.whatsapp_sent === true) {
              message += ' 📱 WhatsApp message sent!';
            } else if (updatedEnquiry.whatsapp_error) {
              if (updatedEnquiry.whatsapp_error.includes('quota') || updatedEnquiry.whatsapp_error.includes('Quota')) {
                message += ' ⚠️ WhatsApp message not sent due to quota reached.';
              } else {
                message += ' ❌ WhatsApp message error: ' + updatedEnquiry.whatsapp_error;
              }
            }
            
            this.snackBar.open(message, 'Close', { 
              duration: 5000,
              panelClass: panelClass
            });
          },
          error: (error) => {
            console.error('Error updating enquiry GST:', error);
            this.snackBar.open('Error updating GST status', 'Close', { duration: 3000 });
          }
        });
    }
  }

  // Handle GST status change for an enquiry
  onGstStatusChangeForEnquiry(enquiry: Enquiry, gstStatus: string): void {
    // Convert empty string to undefined and ensure valid values
    const statusValue = gstStatus === '' || gstStatus === 'In Active' ? undefined : (gstStatus as 'Active' | 'Cancel' | undefined);
    enquiry.gst_status = statusValue;
    // Call the service to update the enquiry in the backend
    if (enquiry._id) {
      this.enquiryService.updateEnquiry(enquiry._id, { gst_status: statusValue })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (updatedEnquiry: any) => {
            // Update the local enquiry with the response from the server
            const index = this.enquiries.findIndex(e => e._id === enquiry._id);
            if (index !== -1) {
              this.enquiries[index] = { ...this.enquiries[index], ...updatedEnquiry };
              this.applyFilters();
            }
            
            // Show appropriate notification based on WhatsApp status
            let message = 'GST status updated successfully!';
            let panelClass = ['success-snackbar'];
            
            if (updatedEnquiry.whatsapp_sent === true) {
              message += ' 📱 WhatsApp message sent!';
            } else if (updatedEnquiry.whatsapp_error) {
              if (updatedEnquiry.whatsapp_error.includes('quota') || updatedEnquiry.whatsapp_error.includes('Quota')) {
                message += ' ⚠️ WhatsApp message not sent due to quota reached.';
              } else {
                message += ' ❌ WhatsApp message error: ' + updatedEnquiry.whatsapp_error;
              }
            }
            
            this.snackBar.open(message, 'Close', { 
              duration: 5000,
              panelClass: panelClass
            });
          },
          error: (error) => {
            console.error('Error updating enquiry GST status:', error);
            this.snackBar.open('Error updating GST status', 'Close', { duration: 3000 });
          }
        });
    }
  }

  onSortChange(): void {
    this.applyFilters();
  }

  applyFilters(): void {
    let filtered = [...this.enquiries];

    // Apply search filter
    if (this.searchTerm.trim()) {
      const searchLower = this.searchTerm.toLowerCase();
      filtered = filtered.filter(enquiry =>
        enquiry.wati_name.toLowerCase().includes(searchLower) ||
        enquiry.user_name?.toLowerCase().includes(searchLower) ||
        enquiry.mobile_number.includes(searchLower) ||
        enquiry.business_type?.toLowerCase().includes(searchLower) ||
        enquiry.staff.toLowerCase().includes(searchLower) ||
        enquiry.comments.toLowerCase().includes(searchLower)
      );
    }

    // Apply staff filter
    if (this.staffFilter !== 'all') {
      filtered = filtered.filter(enquiry => 
        enquiry.staff === this.staffFilter
      );
    }

    // Apply GST filter
    if (this.gstFilter !== 'all') {
      if (this.gstFilter === 'yes') {
        // Show only GST Yes with Active status
        filtered = filtered.filter(enquiry => 
          enquiry.gst === 'Yes' && enquiry.gst_status === 'Active'
        );
      } else if (this.gstFilter === 'not_selected') {
        // Show only enquiries with "Not Selected" or empty GST
        filtered = filtered.filter(enquiry => 
          enquiry.gst === 'Not Selected' || enquiry.gst === '' || !enquiry.gst
        );
      }
    }

    // Apply interest level filter
    if (this.interestFilter !== 'all') {
      if (this.interestFilter === 'interested') {
        filtered = filtered.filter(enquiry => 
          this.interestComments.includes(enquiry.comments)
        );
      } else if (this.interestFilter === 'not_interested') {
        filtered = filtered.filter(enquiry => 
          this.notInterestedComments.includes(enquiry.comments)
        );
      } else if (this.interestFilter === 'no_gst') {
        filtered = filtered.filter(enquiry => 
          this.noGstComments.includes(enquiry.comments)
        );
      } else if (this.interestFilter === 'gst_cancelled') {
        filtered = filtered.filter(enquiry => 
          this.gstCancelledComments.includes(enquiry.comments)
        );
      } else if (this.interestFilter === 'pending') {
        filtered = filtered.filter(enquiry => 
          this.pendingComments.includes(enquiry.comments)
        );
      } else if (this.interestFilter === 'unknown') {
        filtered = filtered.filter(enquiry => 
          this.unknownComments.includes(enquiry.comments)
        );
      }
    }

    // Apply shortlist filter
    if (this.shortlistFilter !== 'all') {
      if (this.shortlistFilter === 'shortlist') {
        // Show only enquiries that can be shortlisted (verified but not submitted)
        filtered = filtered.filter(enquiry => this.canShowShortlistButton(enquiry));
      } else if (this.shortlistFilter === 'shortlisted') {
        // Show only enquiries that are already shortlisted/submitted
        filtered = filtered.filter(enquiry => this.isEnquirySubmitted(enquiry));
      } else if (this.shortlistFilter === 'not_shortlist') {
        // Show only enquiries that cannot be shortlisted (not verified)
        filtered = filtered.filter(enquiry => 
          !this.canShowShortlistButton(enquiry) && !this.isEnquirySubmitted(enquiry)
        );
      }
    }

    // Apply date range filter
    if (this.fromDate || this.toDate) {
      filtered = filtered.filter(enquiry => {
        const enquiryDate = new Date(enquiry.date);
        enquiryDate.setHours(0, 0, 0, 0); // Reset time for accurate date comparison
        
        if (this.fromDate && this.toDate) {
          const fromDateObj = new Date(this.fromDate);
          const toDateObj = new Date(this.toDate);
          fromDateObj.setHours(0, 0, 0, 0);
          toDateObj.setHours(23, 59, 59, 999);
          return enquiryDate >= fromDateObj && enquiryDate <= toDateObj;
        } else if (this.fromDate) {
          const fromDateObj = new Date(this.fromDate);
          fromDateObj.setHours(0, 0, 0, 0);
          return enquiryDate >= fromDateObj;
        } else if (this.toDate) {
          const toDateObj = new Date(this.toDate);
          toDateObj.setHours(23, 59, 59, 999);
          return enquiryDate <= toDateObj;
        }
        
        return true;
      });
    }

    // Apply sorting
    filtered = this.applySorting(filtered);

    // Update serial numbers
    this.filteredEnquiries = filtered.map((enquiry, index) => ({
      ...enquiry,
      sno: index + 1
    }));
    
    // Update pagination
    this.updatePagination();
  }
  
  updatePagination(): void {
    // Calculate total pages
    this.totalPages = Math.ceil(this.filteredEnquiries.length / this.pageSize);
    
    // Reset to page 1 if current page exceeds total pages
    if (this.currentPage > this.totalPages && this.totalPages > 0) {
      this.currentPage = 1;
    }
    
    // Get paginated data
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedEnquiries = this.filteredEnquiries.slice(startIndex, endIndex);
  }
  
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagination();
    }
  }
  
  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePagination();
    }
  }
  
  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePagination();
    }
  }
  
  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxPagesToShow = 5;
    
    if (this.totalPages <= maxPagesToShow) {
      // Show all pages if total is less than max
      for (let i = 1; i <= this.totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show pages around current page
      let startPage = Math.max(1, this.currentPage - 2);
      let endPage = Math.min(this.totalPages, this.currentPage + 2);
      
      // Adjust if at the beginning or end
      if (this.currentPage <= 3) {
        endPage = maxPagesToShow;
      } else if (this.currentPage >= this.totalPages - 2) {
        startPage = this.totalPages - maxPagesToShow + 1;
      }
      
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
    }
    
    return pages;
  }
  
  getSerialNumber(index: number): number {
    return (this.currentPage - 1) * this.pageSize + index + 1;
  }
  
  getMaxDisplayed(): number {
    return Math.min(this.currentPage * this.pageSize, this.filteredEnquiries.length);
  }

  applySorting(enquiries: Enquiry[]): Enquiry[] {
    switch (this.sortOption) {
      case 'name_asc':
        return enquiries.sort((a, b) => a.wati_name.localeCompare(b.wati_name));
      
      case 'name_desc':
        return enquiries.sort((a, b) => b.wati_name.localeCompare(a.wati_name));
      
      case 'date_new':
        return enquiries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      case 'date_old':
        return enquiries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      default:
        return enquiries;
    }
  }

  hasActiveFilters(): boolean {
    return this.staffFilter !== 'all' || 
           this.gstFilter !== 'all' || 
           this.interestFilter !== 'all' || 
           this.fromDate !== null || 
           this.toDate !== null ||
           this.searchTerm.trim() !== '';
  }

  clearAllFilters(): void {
    this.staffFilter = 'all';
    this.gstFilter = 'all';
    this.interestFilter = 'all';
    this.fromDate = null;
    this.toDate = null;
    this.searchTerm = '';
    this.applyFilters();
  }

  clearStaffFilter(): void {
    this.staffFilter = 'all';
    this.applyFilters();
  }

  clearGstFilter(): void {
    this.gstFilter = 'all';
    this.applyFilters();
  }

  clearInterestFilter(): void {
    this.interestFilter = 'all';
    this.applyFilters();
  }

  clearShortlistFilter(): void {
    this.shortlistFilter = 'all';
    this.applyFilters();
  }

  clearDateRange(): void {
    this.fromDate = null;
    this.toDate = null;
    this.applyFilters();
  }

  getShortlistCount(filter: string): number {
    if (filter === 'all') {
      return this.enquiries.length;
    } else if (filter === 'shortlist') {
      return this.enquiries.filter(e => this.canShowShortlistButton(e)).length;
    } else if (filter === 'shortlisted') {
      return this.enquiries.filter(e => this.isEnquirySubmitted(e)).length;
    } else if (filter === 'not_shortlist') {
      return this.enquiries.filter(e => 
        !this.canShowShortlistButton(e) && !this.isEnquirySubmitted(e)
      ).length;
    }
    return 0;
  }

  formatDateRange(): string {
    if (this.fromDate && this.toDate) {
      return `${this.formatDate(this.fromDate)} - ${this.formatDate(this.toDate)}`;
    } else if (this.fromDate) {
      return `From ${this.formatDate(this.fromDate)}`;
    } else if (this.toDate) {
      return `Until ${this.formatDate(this.toDate)}`;
    }
    return '';
  }

  viewMode: 'table' | 'card' = 'table';

  checkMobileView(): void {
    // Check if device is mobile (screen width < 768px)
    if (window.innerWidth < 768) {
      this.viewMode = 'card';
    }
  }

  // Handle window resize to switch view mode on mobile
  @HostListener('window:resize', ['$event'])
  onResize(): void {
    this.checkMobileView();
  }

  toggleView(): void {
    this.viewMode = this.viewMode === 'table' ? 'card' : 'table';
  }

  goBack(): void {
    window.history.back();
  }

  getStaffCount(staff: string): number {
    if (staff === 'all') {
      return this.enquiries.length;
    }
    return this.enquiries.filter(enquiry => enquiry.staff === staff).length;
  }

  getGstCount(gstType: string): number {
    if (gstType === 'all') {
      return this.enquiries.length;
    } else if (gstType === 'yes') {
      return this.enquiries.filter(enquiry => enquiry.gst === 'Yes' && enquiry.gst_status === 'Active').length;
    } else if (gstType === 'not_selected') {
      return this.enquiries.filter(enquiry => !enquiry.gst || enquiry.gst === 'Not Selected').length;
    }
    return 0;
  }

  getInterestCount(interestType: string): number {
    if (interestType === 'all') {
      return this.enquiries.length;
    } else if (interestType === 'interested') {
      return this.enquiries.filter(enquiry => this.interestComments.includes(enquiry.comments)).length;
    } else if (interestType === 'not_interested') {
      return this.enquiries.filter(enquiry => this.notInterestedComments.includes(enquiry.comments)).length;
    } else if (interestType === 'no_gst') {
      return this.enquiries.filter(enquiry => this.noGstComments.includes(enquiry.comments)).length;
    } else if (interestType === 'gst_cancelled') {
      return this.enquiries.filter(enquiry => this.gstCancelledComments.includes(enquiry.comments)).length;
    } else if (interestType === 'pending') {
      return this.enquiries.filter(enquiry => this.pendingComments.includes(enquiry.comments)).length;
    } else if (interestType === 'unknown') {
      return this.enquiries.filter(enquiry => this.unknownComments.includes(enquiry.comments)).length;
    }
    return 0;
  }

  // Add missing display methods
  getGstFilterDisplay(): string {
    switch (this.gstFilter) {
      case 'yes': return 'GST Active';
      case 'not_selected': return 'Not Selected';
      default: return 'All';
    }
  }

  getInterestLevelDisplay(): string {
    switch (this.interestFilter) {
      case 'interested': return 'Interested';
      case 'not_interested': return 'Not Interested';
      case 'no_gst': return 'No GST';
      case 'gst_cancelled': return 'GST Cancelled';
      case 'pending': return 'Pending';
      case 'unknown': return 'Unknown';
      default: return 'All';
    }
  }

  // Get status icon for enquiry comments
  getStatusIcon(comment: string): string {
    if (this.interestComments.includes(comment)) {
      return 'check_circle';
    } else if (this.notInterestedComments.includes(comment)) {
      return 'cancel';
    } else if (this.pendingComments.includes(comment)) {
      return 'schedule';
    } else if (this.noGstComments.includes(comment) || this.gstCancelledComments.includes(comment)) {
      return 'error';
    } else {
      return 'help_outline';
    }
  }

  // Get display comment - filter out default form comments
  getDisplayComment(comment: string | null | undefined, staff?: string): string {
    // If staff is "Public Form", return "-" instead of "No Comments"
    if (staff === 'Public Form') {
      return '-';
    }

    // If no comment or empty, return 'No Comments'
    if (!comment || comment.trim() === '') {
      return 'No Comments';
    }
    
    // Filter out default FinGrowth form comments
    const defaultComments = [
      'New Enquiry - FinGrowth Form',
      'New Public Enquiry',
      'New Enquiry'
    ];
    
    if (defaultComments.includes(comment)) {
      return 'No Comments';
    }
    
    return comment;
  }

  // Get status color for enquiry comments
  getStatusColor(comment: string): string {
    // If it's '-' (Public Form with no comments), return light gray
    if (comment === '-') {
      return '#d1d5db'; // Gray-300 (lighter gray for "-")
    }

    // If it's 'No Comments', return gray
    if (comment === 'No Comments') {
      return '#9ca3af'; // Gray-400
    }
    
    // Light blue for "Will share doc"
    if (comment === 'Will share Doc') {
      return '#60a5fa'; // Light blue (blue-400)
    }
    // Darker blue for "Doc shared (yet to verify)"
    else if (comment === 'Doc Shared(Yet to Verify)') {
      return '#2563eb'; // Darker blue (blue-600)
    }
    else if (this.interestComments.includes(comment)) {
      return '#4caf50'; // Green
    } else if (this.notInterestedComments.includes(comment)) {
      return '#f44336'; // Red
    } else if (this.pendingComments.includes(comment)) {
      return '#ff9800'; // Orange
    } else if (this.noGstComments.includes(comment) || this.gstCancelledComments.includes(comment)) {
      return '#f44336'; // Red
    } else {
      return '#666'; // Gray
    }
  }

  // Get row color class based on comment status and GST status
  getRowColorClass(enquiry: any): string {
    // Check if staff is "Public Form" - always show white background
    if (enquiry.staff === 'Public Form') {
      return 'bg-white hover:bg-gray-50 border-l-4 border-l-gray-300';
    }

    // First check for GST Cancelled status
    if (enquiry.gst === 'Yes' && enquiry.gst_status === 'Cancel') {
      return 'bg-red-50 hover:bg-red-100 border-l-4 border-l-red-500';
    }

    const comment = enquiry.comments;
    
    // Light blue for "Will share doc"
    if (comment === 'Will share Doc') {
      return 'bg-blue-50 hover:bg-blue-100 border-l-4 border-l-blue-400';
    }
    // Darker blue for "Doc shared (yet to verify)"
    else if (comment === 'Doc Shared(Yet to Verify)') {
      return 'bg-blue-100 hover:bg-blue-200 border-l-4 border-l-blue-600';
    }
    else if (this.interestComments.includes(comment)) {
      return 'bg-green-50 hover:bg-green-100 border-l-4 border-l-green-500';
    } else if (this.notInterestedComments.includes(comment) || 
               this.noGstComments.includes(comment) || 
               this.gstCancelledComments.includes(comment)) {
      return 'bg-red-50 hover:bg-red-100 border-l-4 border-l-red-500';
    } else if (this.pendingComments.includes(comment)) {
      return 'bg-orange-50 hover:bg-orange-100 border-l-4 border-l-orange-500';
    } else if (this.unknownComments.includes(comment)) {
      return 'bg-gray-50 hover:bg-gray-100 border-l-4 border-l-gray-400';
    } else {
      // Default: if staff is assigned (not Public Form) and no specific comment, show gray
      return 'bg-gray-50 hover:bg-gray-100 border-l-4 border-l-gray-400';
    }
  }

  // Get card color class based on comment status and GST status
  getCardColorClass(enquiry: any): string {
    // Check if staff is "Public Form" - always show white background
    if (enquiry.staff === 'Public Form') {
      return 'bg-white border-gray-300 hover:bg-gray-50';
    }

    // First check for GST Cancelled status
    if (enquiry.gst === 'Yes' && enquiry.gst_status === 'Cancel') {
      return 'bg-red-50/60 border-red-500 hover:bg-red-100/70';
    }

    const comment = enquiry.comments;
    
    // Light blue for "Will share doc"
    if (comment === 'Will share Doc') {
      return 'bg-blue-50/60 border-blue-400 hover:bg-blue-100/70';
    }
    // Darker blue for "Doc shared (yet to verify)"
    else if (comment === 'Doc Shared(Yet to Verify)') {
      return 'bg-blue-100/60 border-blue-600 hover:bg-blue-200/70';
    }
    else if (this.interestComments.includes(comment)) {
      return 'bg-green-50/60 border-green-500 hover:bg-green-100/70';
    } else if (this.notInterestedComments.includes(comment) || 
               this.noGstComments.includes(comment) || 
               this.gstCancelledComments.includes(comment)) {
      return 'bg-red-50/60 border-red-500 hover:bg-red-100/70';
    } else if (this.pendingComments.includes(comment)) {
      return 'bg-orange-50/60 border-orange-500 hover:bg-orange-100/70';
    } else if (this.unknownComments.includes(comment)) {
      return 'bg-gray-50/60 border-gray-400 hover:bg-gray-100/70';
    } else {
      // Default: if staff is assigned (not Public Form) and no specific comment, show gray
      return 'bg-gray-50/60 border-gray-400 hover:bg-gray-100/70';
    }
  }

  showAddForm(): void {
    this.showRegistrationForm = true;
    this.registrationForm.reset();
    this.registrationForm.patchValue({
      date: new Date(),
      gst: '' // Set default to empty, making it clear that GST selection is optional
    });
    this.isEditMode = false;
    this.editingEnquiryId = null;
  }

  // Edit enquiry method
  editEnquiry(enquiry: Enquiry): void {
    this.isEditMode = true;
    this.editingEnquiryId = enquiry._id || null;
    this.showRegistrationForm = true;
    this.hasFormChanges = false;
    
    // Split mobile number into country code and number
    const { countryCode, number } = this.splitMobileNumber(enquiry.mobile_number);
    
    // Store original staff value to determine if dropdown should be locked
    // Only lock if staff is assigned and not a special form
    const staffValue = enquiry.staff || '';
    const isSpecialForm = staffValue === 'Public Form' || staffValue === 'WhatsApp Bot' || staffValue === 'WhatsApp Form' || staffValue === '';
    this.originalStaffValue = isSpecialForm ? null : staffValue;
    
    // Populate form with enquiry data
    // Format date for HTML date input (YYYY-MM-DD)
    const enquiryDate = new Date(enquiry.date);
    const formattedDate = enquiryDate.toISOString().split('T')[0];
    
    const formValues = {
      date: formattedDate,
      wati_name: enquiry.wati_name || '',
      owner_name: enquiry.owner_name || '',
      user_name: enquiry.user_name || '',
      country_code: countryCode,
      mobile_number: number,
      phone_number: this.getDisplayMobileNumber(enquiry.phone_number || '') || '',
      email_address: enquiry.email_address || '',
      secondary_mobile_number: this.getDisplayMobileNumber(enquiry.secondary_mobile_number || '') || '',
      gst: enquiry.gst || '',
      gst_status: enquiry.gst_status || '',
      business_type: enquiry.business_type || '',
      business_name: enquiry.business_name || '',
      loan_amount: enquiry.loan_amount || '',
      loan_purpose: enquiry.loan_purpose || '',
      annual_revenue: enquiry.annual_revenue || '',
      business_document_url: enquiry.business_document_url || '',
      staff: enquiry.staff || '',
      comments: enquiry.comments || '',
      additional_comments: enquiry.additional_comments || ''
    };
    
    this.registrationForm.patchValue(formValues);
    
    // Store original values for comparison
    this.originalFormValues = { ...formValues };
    
    // Clean up any existing form change subscription
    if (this.formChangeSubscription) {
      this.formChangeSubscription.unsubscribe();
      this.formChangeSubscription = null;
    }
    
    // Add a longer delay before setting up change listener to prevent immediate detection
    // This prevents the "unsaved changes" dialog from appearing when just selecting dropdown options
    setTimeout(() => {
      // Listen for form changes with debounce to avoid rapid fire changes
      this.formChangeSubscription = this.registrationForm.valueChanges
        .pipe(
          takeUntil(this.destroy$),
          debounceTime(300) // Wait 300ms after user stops typing/selecting
        )
        .subscribe(() => {
          this.checkFormChanges();
        });
    }, 500); // 500ms delay to allow form to fully stabilize
    
    // Scroll to top to show the form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  
  // Check if form has changes compared to original values
  checkFormChanges(): void {
    if (!this.isEditMode || !this.originalFormValues) {
      this.hasFormChanges = false;
      return;
    }
    
    // Skip change detection if user is interacting with dropdowns
    if (this.isDropdownInteraction) {
      console.log('Skipping change detection - dropdown interaction in progress');
      return;
    }
    
    const currentValues = this.registrationForm.value;
    
    // More intelligent comparison that handles null/undefined/empty string equivalence
    this.hasFormChanges = this.hasActualFormChanges(currentValues, this.originalFormValues);
  }

  // Helper method to detect actual meaningful changes
  private hasActualFormChanges(current: any, original: any): boolean {
    const currentKeys = Object.keys(current);
    const originalKeys = Object.keys(original);
    
    // Check if any key has a meaningful change
    const allKeys = new Set([...currentKeys, ...originalKeys]);
    
    for (const key of allKeys) {
      const currentValue = this.normalizeValue(current[key]);
      const originalValue = this.normalizeValue(original[key]);
      
      if (currentValue !== originalValue) {
        console.log(`Form change detected in field '${key}': '${originalValue}' -> '${currentValue}'`);
        return true;
      }
    }
    
    return false;
  }

  // Normalize values to handle null/undefined/empty string equivalence
  private normalizeValue(value: any): string {
    if (value === null || value === undefined || value === '') {
      return '';
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value).trim();
  }

  // Delete enquiry method
  deleteEnquiry(enquiry: Enquiry): void {
    this.selectedEnquiryForDelete = enquiry;
    this.showDeleteDialog = true;
  }

  confirmDelete(): void {
    if (!this.selectedEnquiryForDelete || !this.selectedEnquiryForDelete._id) {
      return;
    }

    this.isDeleting = true;
    this.enquiryService.deleteEnquiry(this.selectedEnquiryForDelete._id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          // Remove from local arrays
          this.enquiries = this.enquiries.filter(e => e._id !== this.selectedEnquiryForDelete!._id);
          this.applyFilters();
          
          this.isDeleting = false;
          this.showDeleteDialog = false;
          this.selectedEnquiryForDelete = null;
          
          this.snackBar.open('Enquiry deleted successfully', 'Close', {
            duration: 3000,
            panelClass: ['success-snackbar']
          });
        },
        error: (error) => {
          console.error('Error deleting enquiry:', error);
          this.isDeleting = false;
          this.showDeleteDialog = false;
          this.selectedEnquiryForDelete = null;
          
          this.snackBar.open('Error deleting enquiry', 'Close', {
            duration: 3000,
            panelClass: ['error-snackbar']
          });
        }
      });
  }

  cancelDelete(): void {
    this.showDeleteDialog = false;
    this.selectedEnquiryForDelete = null;
  }

  hideAddForm(): void {
    // Check if form has unsaved changes
    this.checkFormChanges();
    
    // If in edit mode and there are unsaved changes, ask for confirmation
    if (this.isEditMode && this.hasFormChanges) {
      const confirmClose = confirm('You have unsaved changes. Are you sure you want to close without saving?');
      if (!confirmClose) {
        return; // Don't close if user cancels
      }
    }
    
    // Close the form
    this.showRegistrationForm = false;
    this.registrationForm.reset();
    this.isEditMode = false;
    this.editingEnquiryId = null;
    this.hasFormChanges = false;
    this.originalFormValues = null;
    this.originalStaffValue = null;
    
    // Clean up form change subscription
    if (this.formChangeSubscription) {
      this.formChangeSubscription.unsubscribe();
      this.formChangeSubscription = null;
    }
  }

  // Handle clicks on modal backdrop - only close modal if clicking outside modal content
  onModalBackdropClick(event: Event): void {
    const target = event.target as HTMLElement;
    
    // Check if click is on a dropdown option or dropdown container
    // Dropdowns are positioned absolute with high z-index and contain buttons
    const isDropdownElement = target.classList.contains('absolute') || 
                              target.closest('.absolute') !== null ||
                              (target.tagName === 'BUTTON' && target.getAttribute('type') === 'button') ||
                              target.closest('button[type="button"]') !== null;
    
    // Check if click is directly on the backdrop (not on modal content or its children or dropdown)
    if (!target.closest('.modal-content') && !isDropdownElement) {
      this.hideAddForm();
    }
  }

  // Close duplicate message and open new enquiry form
  closeDuplicateMessage(): void {
    this.showDuplicateMessage = false;
    this.showRegistrationForm = true;
    this.registrationForm.reset();
    this.isEditMode = false;
    this.editingEnquiryId = null;
    this.originalStaffValue = null;
    
    // Clean up form change subscription
    if (this.formChangeSubscription) {
      this.formChangeSubscription.unsubscribe();
      this.formChangeSubscription = null;
    }
  }

  onSubmit(): void {
    if (this.registrationForm.valid) {
      const formData = this.registrationForm.value;
      
      // Clean up GST status if GST is Yes
      if (formData.gst === 'Yes') {
        // GST status is already handled by the form validation
      } else {
        // For No or empty GST, clear the GST status
        formData.gst_status = '';
      }

      // Combine country code with mobile numbers FIRST
      const countryCodeDigits = formData.country_code.replace('+', ''); // Remove + sign
      const fullMobileNumber = countryCodeDigits + formData.mobile_number;
      
      console.log('📱 Country code digits:', countryCodeDigits);
      console.log('📱 Mobile number digits:', formData.mobile_number);
      console.log('📱 Full mobile number:', fullMobileNumber);
      
      // Check for duplicate mobile number AFTER combining with country code
      if (this.checkMobileNumberExists(fullMobileNumber)) {
        this.showDuplicateMessage = true;
        this.showRegistrationForm = false;
        return;
      }
      
      // Set the combined mobile number
      formData.mobile_number = fullMobileNumber;

      // Handle secondary mobile number - use the same country code as primary
      if (formData.secondary_mobile_number && formData.secondary_mobile_number.trim() !== '') {
        formData.secondary_mobile_number = countryCodeDigits + formData.secondary_mobile_number;
        console.log('📱 Secondary full mobile number:', formData.secondary_mobile_number);
      } else {
        formData.secondary_mobile_number = null;
      }

      // Handle phone number - add country code if it's a 10-digit number
      if (formData.phone_number && formData.phone_number.trim() !== '') {
        if (/^\d{10}$/.test(formData.phone_number)) {
          formData.phone_number = countryCodeDigits + formData.phone_number;
          console.log('📱 Phone number with country code:', formData.phone_number);
        }
      } else {
        formData.phone_number = null;
      }

      // Remove country code fields from form data (don't send to backend)
      delete formData.country_code;

      // Set default comment if empty
      if (!formData.comments || formData.comments.trim() === '') {
        formData.comments = 'No comment provided';
      }

      // Handle GST field - preserve empty values for optional GST selection
      // Backend will store empty values as "Not Selected" for display purposes
      if (!formData.gst || formData.gst.trim() === '') {
        formData.gst = ''; // Send empty string to backend to indicate "Not Selected"
      }

      // Log the form data being sent for debugging
      console.log('📤 Form data being sent to backend:', formData);
      console.log('📤 Form validation status:', this.registrationForm.valid);
      console.log('📤 Form errors:', this.registrationForm.errors);

      if (this.isEditMode && this.editingEnquiryId) {
        // Optimistic update - close form immediately
        this.showRegistrationForm = false;
        this.isEditMode = false;
        const editingId = this.editingEnquiryId;
        this.editingEnquiryId = null;
        this.hasFormChanges = false;
        this.originalFormValues = null;
        this.originalStaffValue = null;
        
        // Show immediate success feedback
        this.snackBar.open('Enquiry updated successfully!', 'Close', { 
          duration: 2000,
          panelClass: ['success-snackbar']
        });
        
        // Clean up form change subscription
        if (this.formChangeSubscription) {
          this.formChangeSubscription.unsubscribe();
          this.formChangeSubscription = null;
        }
        
        // Reset form
        this.registrationForm.reset();
        
        // Make API call in background
        this.enquiryService.updateEnquiry(editingId, formData)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
          next: (response: any) => {
            // Extract the updated enquiry from response (handle different response structures)
            const updatedEnquiry = response.enquiry || response.data || response;
            
            // Update the specific enquiry in place without reordering
            const index = this.enquiries.findIndex(e => e._id === editingId);
            if (index !== -1) {
              // Preserve the original date and sno
              const originalDate = this.enquiries[index].date;
              const originalSno = this.enquiries[index].sno;
              this.enquiries[index] = { ...updatedEnquiry, date: originalDate, sno: originalSno };
            }
            
            // Update in filtered list without reordering
            const filteredIndex = this.filteredEnquiries.findIndex(e => e._id === editingId);
            if (filteredIndex !== -1) {
              // Preserve the original date and sno
              const originalDate = this.filteredEnquiries[filteredIndex].date;
              const originalSno = this.filteredEnquiries[filteredIndex].sno;
              this.filteredEnquiries[filteredIndex] = { ...updatedEnquiry, date: originalDate, sno: originalSno };
            }
            
            // Trigger change detection by creating new array references
            this.enquiries = [...this.enquiries];
            this.filteredEnquiries = [...this.filteredEnquiries];
            
            // Show WhatsApp status notification if available
            if (updatedEnquiry.whatsapp_sent === true) {
              this.snackBar.open('📱 WhatsApp status message sent!', 'Close', { 
                duration: 3000,
                panelClass: ['success-snackbar']
              });
            } else if (updatedEnquiry.whatsapp_error) {
              const whatsappError = updatedEnquiry.whatsapp_error || 'WhatsApp message failed to send';
              this.snackBar.open(`⚠️ ${whatsappError}`, 'Close', { 
                duration: 5000,
                panelClass: ['warning-snackbar']
              });
            }
          },
          error: (error) => {
            console.error('Error updating enquiry:', error);
            
            let errorMessage = 'Error updating enquiry';
            if (error.error && error.error.error) {
              errorMessage = error.error.error;
            }
            
            this.snackBar.open(errorMessage, 'Close', { 
              duration: 5000,
              panelClass: ['error-snackbar']
            });
          }
        });
      } else {
        this.enquiryService.createEnquiry(formData)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
          next: (newEnquiry: any) => {
            let message = 'Enquiry added successfully!';
            let panelClass = ['success-snackbar'];
            
            // Add WhatsApp status to notification
            if (newEnquiry.whatsapp_sent === true) {
              message += ' 📱 WhatsApp welcome message sent!';
              // Show additional notification if available
              if (newEnquiry.whatsapp_notification) {
                this.snackBar.open(newEnquiry.whatsapp_notification, 'Close', { 
                  duration: 10000,
                  panelClass: ['success-snackbar']
                });
              }
            } else if (newEnquiry.whatsapp_sent === false) {
              // Show specific error message if available
              const whatsappError = newEnquiry.whatsapp_error || 'WhatsApp message failed to send';
              message += ` ⚠️ ${whatsappError}`;
              panelClass = ['error-snackbar'];
              
              // Show quota exceeded notification if applicable
              if (newEnquiry.whatsapp_notification) {
                this.snackBar.open(newEnquiry.whatsapp_notification, 'Close', { 
                  duration: 15000,
                  panelClass: ['warning-snackbar']
                });
              }
            }
            
            this.snackBar.open(message, 'Close', { 
              duration: 5000,
              panelClass: panelClass
            });
            this.closeDuplicateMessage(); // This will reset form and keep it open for new enquiry
            this.loadEnquiries();
          },
          error: (error) => {
            console.error('Error creating enquiry:', error);
            console.error('Error response body:', error.error);
            console.error('Error status:', error.status);
            console.error('Error message:', error.message);
            
            let errorMessage = 'Error adding enquiry';
            if (error.error && error.error.error) {
              errorMessage = error.error.error;
            }
            
            this.snackBar.open(errorMessage, 'Close', { duration: 5000 });
          }
        });
      }
    } else {
      console.log('Form is invalid. Errors:', this.registrationForm.errors);
      console.log('Form controls status:');
      Object.keys(this.registrationForm.controls).forEach(key => {
        const control = this.registrationForm.get(key);
        if (control && control.errors) {
          console.log(`${key}:`, control.errors);
        }
      });
      this.snackBar.open('Please fill all required fields', 'Close', { duration: 3000 });
    }
  }


  formatDate(date: string | Date): string {
    return new Date(date).toLocaleDateString('en-IN');
  }

  // WhatsApp Status Methods
  getWhatsAppStatusIcon(enquiry: Enquiry): string {
    if (enquiry.whatsapp_sent === true) {
      return 'check_circle';
    } else if (enquiry.whatsapp_sent === false) {
      return 'error';
    }
    return 'help_outline';
  }

  getWhatsAppStatusColor(enquiry: Enquiry): string {
    if (enquiry.whatsapp_sent === true) {
      return 'success';
    } else if (enquiry.whatsapp_sent === false) {
      return 'error';
    }
    return 'disabled';
  }

  getWhatsAppStatusTooltip(enquiry: Enquiry): string {
    if (enquiry.whatsapp_sent === true) {
      return `WhatsApp message sent successfully${enquiry.whatsapp_message_type ? ' (' + enquiry.whatsapp_message_type + ')' : ''}`;
    } else if (enquiry.whatsapp_sent === false) {
      return `WhatsApp message failed: ${enquiry.whatsapp_error || 'Unknown error'}`;
    }
    return 'WhatsApp status unknown';
  }

  // WhatsApp Test Method (Admin only)
  testWhatsApp(enquiry: Enquiry): void {
    if (confirm(`Send test WhatsApp message to ${enquiry.wati_name} (${this.displayMobileNumber(enquiry.mobile_number)})?`)) {
      this.loading = true;
      
      // Validate phone number format before sending
      const phoneNumber = enquiry.mobile_number;
      if (!phoneNumber) {
        this.loading = false;
        this.snackBar.open(`❌ WhatsApp test failed: Mobile number is required`, 'Close', { 
          duration: 10000,
          panelClass: ['error-snackbar']
        });
        return;
      }
      
      const testData = {
        mobile_number: phoneNumber,
        wati_name: enquiry.wati_name,
        message_type: 'new_enquiry'
      };

      this.enquiryService.testWhatsApp(testData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
        next: (response: any) => {
          this.loading = false;
          
          if (response.success) {
            // Check if this is a test mode response
            if (response.test_mode) {
              this.snackBar.open(`🧪 WhatsApp test simulated successfully for ${enquiry.wati_name} (${this.displayMobileNumber(phoneNumber)}) - Test mode bypasses quota restrictions`, 'Close', { 
                duration: 8000,
                panelClass: ['success-snackbar']
              });
            } else if (response.mock_response && response.quota_exceeded) {
              this.snackBar.open(`🧪 WhatsApp test simulated for ${enquiry.wati_name} (${this.displayMobileNumber(phoneNumber)}) - Quota exceeded, showing mock success`, 'Close', { 
                duration: 8000,
                panelClass: ['warning-snackbar']
              });
            } else {
              // Real success message
              this.snackBar.open(`✅ WhatsApp message sent successfully to ${enquiry.wati_name} (${this.displayMobileNumber(phoneNumber)})`, 'Close', { 
                duration: 6000,
                panelClass: ['success-snackbar']
              });
            }
          } else {
            // Handle different error types
            if (response.status_code === 466 || response.quota_exceeded) {
              // Show quota reached message
              this.snackBar.open(`📊 Quota reached in GreenAPI - Upgrade plan to send more messages`, 'Close', { 
                duration: 8000,
                panelClass: ['warning-snackbar']
              });
            } else {
              // Handle other errors with appropriate messages
              let errorMessage = response.error || 'Unknown error';
              
              if (response.status_code === 401) {
                errorMessage = 'GreenAPI authentication failed - Check API credentials';
              } else if (response.status_code === 403) {
                errorMessage = 'GreenAPI access forbidden - Check API permissions';
              } else if (response.status_code === 400) {
                errorMessage = 'Invalid phone number format or WhatsApp not available for this number';
              } else if (response.status_code === 404) {
                errorMessage = 'GreenAPI endpoint not found - Check API configuration';
              }
              
              this.snackBar.open(`❌ WhatsApp test failed: ${errorMessage}`, 'Close', { 
                duration: 10000,
                panelClass: ['error-snackbar']
              });
            }
          }
        }
      });
    }
  }

  // Check if current user is admin (for WhatsApp test button)
  isAdmin(): boolean {
    // Add your admin check logic here
    // This could be based on user role, permissions, etc.
    return true; // For now, allow all users to test
  }


  // Display mobile number in readable format for table
  displayMobileNumber(mobileNumber: string): string {
    if (!mobileNumber) return '-';
    
    // Handle different country codes
    const countryCodeMap: { [key: string]: string } = {
      '91': '+91',   // India
      '1': '+1',     // USA/Canada
      '44': '+44',   // UK
      '971': '+971', // UAE
      '966': '+966', // Saudi Arabia
      '65': '+65',   // Singapore
      '60': '+60',   // Malaysia
      '61': '+61',   // Australia
      '49': '+49',   // Germany
      '33': '+33'    // France
    };
    
    // Check for different country code patterns
    for (const [code, display] of Object.entries(countryCodeMap)) {
      if (mobileNumber.startsWith(code)) {
        const number = mobileNumber.substring(code.length);
        if (number.length >= 10) {
          // Format as +CC XXXXX XXXXX for 10+ digit numbers
          return `${display} ${number.substring(0, 5)} ${number.substring(5)}`;
        }
      }
    }
    
    // If no country code pattern matches, return as is
    return mobileNumber;
  }

  // Split combined mobile number into country code and number
  splitMobileNumber(mobileNumber: string): { countryCode: string; number: string } {
    if (!mobileNumber) {
      return { countryCode: '+91', number: '' }; // Default to India
    }
    
    // Check for different country codes in order of length (longest first)
    const countryCodes = ['971', '966', '65', '61', '60', '49', '44', '33', '91', '1'];
    
    for (const code of countryCodes) {
      if (mobileNumber.startsWith(code)) {
        const number = mobileNumber.substring(code.length);
        const countryCode = `+${code}`;
        return { countryCode, number };
      }
    }
    
    // If no country code matches, default to India
    return { countryCode: '+91', number: mobileNumber };
  }

  // Add method to show notification when GreenAPI limit is reached
  showGreenApiLimitNotification(): void {
    this.snackBar.open(
      '⚠️ GreenAPI monthly quota exceeded. Please upgrade your GreenAPI plan to send messages to more numbers.', 
      'Close', 
      { 
        duration: 15000,
        panelClass: ['warning-snackbar']
      }
    );
  }

  // Add method to show message sent notification
  showMessageSentNotification(enquiry: Enquiry): void {
    this.snackBar.open(
      `✅ WhatsApp message sent to ${enquiry.wati_name} (${this.displayMobileNumber(enquiry.mobile_number)})`, 
      'Close', 
      { 
        duration: 5000,
        panelClass: ['success-snackbar']
      }
    );
  }

  // Handle the response from update operations
  private handleUpdateResponse(updatedEnquiry: any, fieldName: string): void {
    // Update the local enquiry with the response from the server
    const index = this.enquiries.findIndex(e => e._id === updatedEnquiry._id);
    if (index !== -1) {
      this.enquiries[index] = { ...this.enquiries[index], ...updatedEnquiry };
      this.applyFilters();
    }
    
    // Show appropriate notification based on WhatsApp status
    let message = `${fieldName} updated successfully!`;
    let panelClass = ['success-snackbar'];
    
    if (updatedEnquiry.whatsapp_sent === true) {
      message += ' 📱 WhatsApp message sent!';
    } else if (updatedEnquiry.whatsapp_error) {
      if (updatedEnquiry.whatsapp_error.includes('quota') || updatedEnquiry.whatsapp_error.includes('Quota')) {
        message += ' ⚠️ WhatsApp message not sent due to quota reached.';
      } else {
        message += ' ❌ WhatsApp message error: ' + updatedEnquiry.whatsapp_error;
      }
    }
    
    this.snackBar.open(message, 'Close', { 
      duration: 5000,
      panelClass: panelClass
    });
  }

  // Check if staff is assigned to an enquiry (real staff member, not Public Form or WhatsApp Bot)
  isStaffAssigned(enquiry: Enquiry): boolean {
    // Staff is considered assigned only if there's a real staff member (not special form values)
    return !!enquiry.staff && enquiry.staff !== 'Public Form' && enquiry.staff !== 'WhatsApp Bot' && enquiry.staff !== 'WhatsApp Form';
  }

  // Check if comments should be locked (no real staff assigned)
  shouldLockComments(enquiry: Enquiry): boolean {
    // Comments should be locked if no real staff member is assigned
    // Only enable comments when a real staff member is assigned (not Public Form or WhatsApp Bot)
    return !this.isStaffAssigned(enquiry);
  }


  // Reset form to initial state
  resetForm(): void {
    this.registrationForm.reset();
    this.registrationForm.patchValue({
      date: new Date(),
      country_code: '+91',
      gst: ''
    });
    
    // Clean up form change subscription
    if (this.formChangeSubscription) {
      this.formChangeSubscription.unsubscribe();
      this.formChangeSubscription = null;
    }
  }

  // Custom dropdown methods
  toggleDropdown(dropdownId: string): void {
    this.isDropdownInteraction = true;
    if (this.openDropdownId === dropdownId) {
      this.openDropdownId = null;
    } else {
      this.openDropdownId = dropdownId;
    }
    // Reset flag after delay to cover debounce period
    setTimeout(() => {
      this.isDropdownInteraction = false;
    }, 500);
  }

  isDropdownOpen(dropdownId: string): boolean {
    return this.openDropdownId === dropdownId;
  }

  closeDropdown(): void {
    this.openDropdownId = null;
  }

  // Country Code dropdown methods
  getSelectedCountry(): any {
    const countryCode = this.registrationForm.get('country_code')?.value;
    return this.countryCodes.find(country => country.code === countryCode);
  }

  selectCountryCode(code: string): void {
    this.isDropdownInteraction = true;
    this.registrationForm.patchValue({ country_code: code });
    this.closeDropdown();
    // Manually set hasFormChanges if in edit mode
    if (this.isEditMode) {
      this.hasFormChanges = true;
    }
    // Reset flag after delay to cover debounce period
    setTimeout(() => {
      this.isDropdownInteraction = false;
    }, 500);
  }

  // Business Type dropdown methods
  selectBusinessType(type: string): void {
    this.isDropdownInteraction = true;
    this.registrationForm.patchValue({ business_type: type });
    this.closeDropdown();
    // Manually set hasFormChanges if in edit mode
    if (this.isEditMode) {
      this.hasFormChanges = true;
    }
    // Reset flag after delay to cover debounce period
    setTimeout(() => {
      this.isDropdownInteraction = false;
    }, 500);
  }

  // GST dropdown methods
  selectGst(value: string): void {
    this.isDropdownInteraction = true;
    this.registrationForm.patchValue({ gst: value });
    // Clear GST status if GST is not Yes
    if (value !== 'Yes') {
      this.registrationForm.patchValue({ gst_status: '' });
    }
    this.closeDropdown();
    // Manually set hasFormChanges if in edit mode
    if (this.isEditMode) {
      this.hasFormChanges = true;
    }
    // Reset flag after delay to cover debounce period
    setTimeout(() => {
      this.isDropdownInteraction = false;
    }, 500);
  }

  // GST Status dropdown methods
  selectGstStatus(status: string): void {
    this.isDropdownInteraction = true;
    this.registrationForm.patchValue({ gst_status: status });
    this.closeDropdown();
    // Manually set hasFormChanges if in edit mode
    if (this.isEditMode) {
      this.hasFormChanges = true;
    }
    // Reset flag after delay to cover debounce period
    setTimeout(() => {
      this.isDropdownInteraction = false;
    }, 500);
  }

  // Staff dropdown methods
  selectStaff(staff: string): void {
    this.isDropdownInteraction = true;
    this.registrationForm.patchValue({ staff: staff });
    this.closeDropdown();
    // Manually set hasFormChanges if in edit mode
    if (this.isEditMode) {
      this.hasFormChanges = true;
    }
    // Reset flag after delay to cover debounce period
    setTimeout(() => {
      this.isDropdownInteraction = false;
    }, 500);
  }

  /**
   * Check if a staff member is the next in round-robin sequence
   * Used to highlight the suggested staff in the dropdown
   */
  isNextStaffInRoundRobin(staff: string): boolean {
    // Only apply round-robin logic when editing enquiries from special forms
    if (!this.isEditMode) {
      return false;
    }
    
    // Check if original staff was a special form
    const isFromSpecialForm = this.originalStaffValue === 'Public Form' || 
                              this.originalStaffValue === 'WhatsApp Form' || 
                              this.originalStaffValue === 'WhatsApp Bot' || 
                              this.originalStaffValue === 'WhatsApp Web' || 
                              !this.originalStaffValue;
    
    if (!isFromSpecialForm) {
      return false;
    }
    
    // Get the next staff member in round-robin
    const nextStaff = this.getNextStaffMember();
    
    return staff === nextStaff;
  }

  /**
   * Check if staff selection should be blocked (disabled)
   * Blocks all staff except the next one in round-robin sequence
   */
  shouldBlockStaffSelection(staff: string): boolean {
    // Only block when editing enquiries from special forms
    if (!this.isEditMode) {
      return false;
    }
    
    // Check if original staff was a special form
    const isFromSpecialForm = this.originalStaffValue === 'Public Form' || 
                              this.originalStaffValue === 'WhatsApp Form' || 
                              this.originalStaffValue === 'WhatsApp Bot' || 
                              this.originalStaffValue === 'WhatsApp Web' || 
                              !this.originalStaffValue;
    
    if (!isFromSpecialForm) {
      return false;
    }
    
    // Don't block special forms (Public Form, WhatsApp Form, etc.)
    if (staff === 'Public Form' || staff === 'WhatsApp Form' || 
        staff === 'WhatsApp Bot' || staff === 'WhatsApp Web' || staff === 'Admin') {
      return false;
    }
    
    // Get the next staff member in round-robin
    const nextStaff = this.getNextStaffMember();
    
    // Block if this is NOT the next staff member
    return staff !== nextStaff;
  }

  // Comments dropdown methods
  selectComment(comment: string): void {
    this.isDropdownInteraction = true;
    this.registrationForm.patchValue({ comments: comment });
    this.closeDropdown();
    // Manually set hasFormChanges if in edit mode
    if (this.isEditMode) {
      this.hasFormChanges = true;
    }
    // Reset flag after delay to cover debounce period
    setTimeout(() => {
      this.isDropdownInteraction = false;
    }, 500);
  }

  // Preview business document
  previewDocument(documentUrl: string): void {
    if (!documentUrl) {
      this.snackBar.open('Document URL not available', 'Close', { duration: 3000 });
      return;
    }

    console.log('📄 Previewing document:', documentUrl);

    // Check if it's a PDF by URL extension or file format
    // Enhanced PDF detection for Cloudinary uploads
    const isPdf = documentUrl.toLowerCase().includes('.pdf') || 
                  documentUrl.includes('pdf') ||
                  // Assume business documents are PDFs unless clearly an image format
                  (!documentUrl.toLowerCase().includes('.jpg') && 
                   !documentUrl.toLowerCase().includes('.jpeg') && 
                   !documentUrl.toLowerCase().includes('.png') && 
                   !documentUrl.toLowerCase().includes('.gif') &&
                   !documentUrl.toLowerCase().includes('.webp') &&
                   !documentUrl.toLowerCase().includes('.doc') &&
                   !documentUrl.toLowerCase().includes('.docx'));
    
    if (isPdf) {
      // Create a more robust PDF preview
      this.previewPdfDocument(documentUrl);
    } else {
      // For images and other documents, use direct opening
      this.previewImageDocument(documentUrl);
    }
  }

  // Preview PDF documents with better handling
  private previewPdfDocument(documentUrl: string): void {
    try {
      // Optimize Cloudinary URL for PDF viewing
      const optimizedUrl = this.optimizeCloudinaryPdfUrl(documentUrl);
      console.log('Original URL:', documentUrl);
      console.log('Optimized URL:', optimizedUrl);

      // Try to open PDF in a new window with multiple fallback methods
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>PDF Preview - Business Document</title>
              <style>
                body, html { 
                  margin: 0; 
                  padding: 0; 
                  height: 100%; 
                  overflow: hidden; 
                  background: #525659;
                  font-family: Arial, sans-serif;
                }
                .pdf-container {
                  width: 100%;
                  height: 100vh;
                  display: flex;
                  flex-direction: column;
                }
                .pdf-header {
                  background: #323639;
                  color: white;
                  padding: 10px 20px;
                  font-size: 14px;
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                }
                .pdf-viewer {
                  flex: 1;
                  width: 100%;
                  border: none;
                }
                .error-message {
                  display: flex;
                  flex-direction: column;
                  justify-content: center;
                  align-items: center;
                  height: 100vh;
                  background: #f5f5f5;
                  color: #333;
                  text-align: center;
                  padding: 20px;
                }
                .retry-btn {
                  background: #2563eb;
                  color: white;
                  border: none;
                  padding: 10px 20px;
                  border-radius: 5px;
                  cursor: pointer;
                  margin: 5px;
                  min-width: 120px;
                }
                .retry-btn:hover {
                  background: #1d4ed8;
                }
                .loading-message {
                  display: flex;
                  flex-direction: column;
                  justify-content: center;
                  align-items: center;
                  height: 100vh;
                  background: #f5f5f5;
                  color: #333;
                  text-align: center;
                }
              </style>
            </head>
            <body>
              <div class="pdf-container">
                <div class="pdf-header">
                  <span>📄 Business Document Preview</span>
                  <div>
                    <a href="${optimizedUrl}" target="_blank" style="color: #60a5fa; text-decoration: none; margin-right: 15px;">
                      ⬇ Download
                    </a>
                    <button onclick="tryAlternativeViewer()" style="background: #10b981; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">
                      Alternative View
                    </button>
                  </div>
                </div>
                
                <!-- Loading message -->
                <div id="loadingDiv" class="loading-message">
                  <h3>📄 Loading PDF...</h3>
                  <p>Please wait while the document loads.</p>
                </div>

                <!-- Primary PDF viewer (embed) -->
                <embed id="pdfEmbed" 
                       class="pdf-viewer" 
                       src="${optimizedUrl}" 
                       type="application/pdf"
                       style="display: none;"
                       onload="onPdfLoad()"
                       onerror="tryIframeMethod()">

                <!-- Fallback PDF viewer (iframe) -->
                <iframe id="pdfIframe" 
                        class="pdf-viewer" 
                        src="${optimizedUrl}"
                        style="display: none;"
                        onload="onPdfLoad()"
                        onerror="tryObjectMethod()">
                </iframe>

                <!-- Second fallback (object) -->
                <object id="pdfObject" 
                        class="pdf-viewer" 
                        data="${optimizedUrl}" 
                        type="application/pdf"
                        style="display: none;"
                        onload="onPdfLoad()">
                  <p>Your browser doesn't support PDF viewing.</p>
                </object>

                <!-- Error message -->
                <div id="errorDiv" class="error-message" style="display: none;">
                  <h3>⚠️ Unable to preview PDF</h3>
                  <p>The PDF viewer couldn't load this document.</p>
                  <p><strong>Possible causes:</strong></p>
                  <ul style="text-align: left; max-width: 400px;">
                    <li>Browser security settings blocking the PDF</li>
                    <li>Cloudinary CORS configuration</li>
                    <li>PDF file format issues</li>
                    <li>Network connectivity problems</li>
                  </ul>
                  <div style="margin-top: 20px;">
                    <button class="retry-btn" onclick="window.open('${optimizedUrl}', '_blank')">
                      📱 Open in New Tab
                    </button>
                    <button class="retry-btn" onclick="downloadPdf()">
                      💾 Download PDF
                    </button>
                    <button class="retry-btn" onclick="location.reload()">
                      🔄 Retry Preview
                    </button>
                  </div>
                </div>
              </div>
              
              <script>
                let currentMethod = 0;
                const methods = ['pdfEmbed', 'pdfIframe', 'pdfObject'];
                let loadTimeout;

                function onPdfLoad() {
                  clearTimeout(loadTimeout);
                  document.getElementById('loadingDiv').style.display = 'none';
                  console.log('PDF loaded successfully with method:', methods[currentMethod]);
                }

                function tryNextMethod() {
                  if (currentMethod < methods.length - 1) {
                    // Hide current method
                    document.getElementById(methods[currentMethod]).style.display = 'none';
                    currentMethod++;
                    
                    // Show next method
                    const nextElement = document.getElementById(methods[currentMethod]);
                    nextElement.style.display = 'block';
                    
                    console.log('Trying method:', methods[currentMethod]);
                    
                    // Set timeout for next method
                    loadTimeout = setTimeout(() => {
                      if (currentMethod < methods.length - 1) {
                        tryNextMethod();
                      } else {
                        showError();
                      }
                    }, 4000);
                  } else {
                    showError();
                  }
                }

                function tryIframeMethod() {
                  console.log('Embed method failed, trying iframe...');
                  tryNextMethod();
                }

                function tryObjectMethod() {
                  console.log('Iframe method failed, trying object...');
                  tryNextMethod();
                }

                function showError() {
                  clearTimeout(loadTimeout);
                  document.getElementById('loadingDiv').style.display = 'none';
                  methods.forEach(method => {
                    document.getElementById(method).style.display = 'none';
                  });
                  document.getElementById('errorDiv').style.display = 'flex';
                  console.log('All PDF viewing methods failed');
                }

                function tryAlternativeViewer() {
                  // Try Google Docs viewer as alternative
                  const googleViewerUrl = 'https://docs.google.com/viewer?url=' + encodeURIComponent('${optimizedUrl}') + '&embedded=true';
                  window.open(googleViewerUrl, '_blank');
                }

                function downloadPdf() {
                  const link = document.createElement('a');
                  link.href = '${optimizedUrl}';
                  link.download = 'business-document.pdf';
                  link.target = '_blank';
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }

                // Start with first method
                document.getElementById(methods[0]).style.display = 'block';
                
                // Set initial timeout
                loadTimeout = setTimeout(() => {
                  tryNextMethod();
                }, 4000);

                // Hide loading after 10 seconds regardless
                setTimeout(() => {
                  if (document.getElementById('loadingDiv').style.display !== 'none') {
                    document.getElementById('loadingDiv').style.display = 'none';
                  }
                }, 10000);
              </script>
            </body>
          </html>
        `);
        newWindow.document.close();
      } else {
        // Fallback if popup blocked
        this.fallbackPreview(documentUrl);
      }
    } catch (error) {
      console.error('Error opening PDF preview:', error);
      this.fallbackPreview(documentUrl);
    }
  }

  // Optimize Cloudinary URL for better PDF viewing
  private optimizeCloudinaryPdfUrl(url: string): string {
    try {
      // Check if it's a Cloudinary URL
      if (url.includes('cloudinary.com')) {
        // For PDFs, we want to preserve the raw format without any transformations
        // that might convert it to an image. Just return the original URL.
        // This ensures PDFs are displayed as actual PDFs, not converted to images.
        return url;
      }
      
      // If not Cloudinary, return original URL
      return url;
    } catch (error) {
      console.error('Error processing Cloudinary URL:', error);
      return url;
    }
  }

  // Preview image documents
  private previewImageDocument(documentUrl: string): void {
    try {
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Image Preview - Business Document</title>
              <style>
                body { 
                  margin: 0; 
                  padding: 20px; 
                  display: flex; 
                  justify-content: center; 
                  align-items: center; 
                  min-height: 100vh; 
                  background: #f5f5f5; 
                  font-family: Arial, sans-serif;
                }
                img { 
                  max-width: 90%; 
                  max-height: 90vh; 
                  object-fit: contain; 
                  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
                  border-radius: 8px;
                }
                .error-message {
                  text-align: center;
                  color: #666;
                }
              </style>
            </head>
            <body>
              <img src="${documentUrl}" 
                   onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
              <div class="error-message" style="display: none;">
                <h3>⚠️ Unable to load image</h3>
                <p>The image could not be displayed.</p>
                <a href="${documentUrl}" target="_blank">View Original</a>
              </div>
            </body>
          </html>
        `);
        newWindow.document.close();
      } else {
        this.fallbackPreview(documentUrl);
      }
    } catch (error) {
      console.error('Error opening image preview:', error);
      this.fallbackPreview(documentUrl);
    }
  }

  // Fallback preview method
  private fallbackPreview(documentUrl: string): void {
    this.snackBar.open('Opening document in new tab...', 'Close', { duration: 2000 });
    
    // Try direct URL opening as last resort
    try {
      window.open(documentUrl, '_blank');
    } catch (error) {
      console.error('All preview methods failed:', error);
      this.snackBar.open('Unable to preview document. Please check the document URL.', 'Close', { duration: 5000 });
    }
  }

  // Download business document
  downloadDocument(documentUrl: string, enquiryId?: string): void {
    if (!documentUrl) {
      this.snackBar.open('Document URL not available', 'Close', { duration: 3000 });
      return;
    }

    console.log('📥 Downloading document:', documentUrl);

    try {
      // Create a temporary anchor element for download
      const link = document.createElement('a');
      link.href = documentUrl;
      
      // Generate a meaningful filename
      const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      const enquiryPrefix = enquiryId ? `enquiry-${enquiryId}-` : 'business-document-';
      
      // Determine file extension from URL or default to pdf
      let fileExtension = 'pdf';
      if (documentUrl.toLowerCase().includes('.jpg') || documentUrl.toLowerCase().includes('.jpeg')) {
        fileExtension = 'jpg';
      } else if (documentUrl.toLowerCase().includes('.png')) {
        fileExtension = 'png';
      } else if (documentUrl.toLowerCase().includes('.doc')) {
        fileExtension = 'doc';
      } else if (documentUrl.toLowerCase().includes('.docx')) {
        fileExtension = 'docx';
      }
      
      link.download = `${enquiryPrefix}${timestamp}.${fileExtension}`;
      link.target = '_blank';
      
      // Append to body, click, and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      this.snackBar.open('Document download started', 'Close', { 
        duration: 2000,
        panelClass: ['success-snackbar']
      });
    } catch (error) {
      console.error('Error downloading document:', error);
      
      // Fallback: open in new tab
      try {
        window.open(documentUrl, '_blank');
        this.snackBar.open('Opening document in new tab for download', 'Close', { duration: 3000 });
      } catch (fallbackError) {
        console.error('Fallback download method failed:', fallbackError);
        this.snackBar.open('Unable to download document. Please try again.', 'Close', { 
          duration: 5000,
          panelClass: ['error-snackbar']
        });
      }
    }
  }

  // Close dropdown when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    
    // Check if the click is inside a dropdown menu (the actual dropdown options)
    // Dropdown toggle buttons have stopPropagation, so clicks on them won't reach here
    const clickedInsideDropdownMenu = target.closest('.absolute.z-\\[9999\\]');
    
    // If click is outside dropdown menu, close all dropdowns
    if (!clickedInsideDropdownMenu) {
      this.closeDropdown();
      // Close filter dropdowns
      this.isStaffDropdownOpen = false;
      this.isGstDropdownOpen = false;
      this.isInterestDropdownOpen = false;
      this.isShortlistDropdownOpen = false;
      this.isSortDropdownOpen = false;
    }
  }

  // Check for existing clients by mobile number
  checkExistingClients(): void {
    this.clientService.getClients().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response) => {
        const clients = response.clients || [];
        this.existingClientsByMobile.clear();
        
        clients.forEach(client => {
          if (client.mobile_number) {
            const cleanedMobile = this.cleanMobileNumber(client.mobile_number);
            if (cleanedMobile) {
              this.existingClientsByMobile.set(cleanedMobile, client);
            }
          }
        });
        
        console.log('Existing clients loaded for shortlist check:', this.existingClientsByMobile.size);
      },
      error: (error) => {
        console.error('Error loading clients for shortlist check:', error);
      }
    });
  }

  // Helper method to clean mobile number to 10 digits
  private cleanMobileNumber(mobile: string): string {
    if (!mobile) return '';
    
    // Remove all non-digit characters
    const cleaned = mobile.replace(/\D/g, '');
    
    // Extract last 10 digits if more than 10
    if (cleaned.length >= 10) {
      return cleaned.substring(cleaned.length - 10);
    }
    
    return cleaned;
  }

  // Check if enquiry mobile matches existing client
  hasExistingClient(enquiry: Enquiry): boolean {
    const mobileNumber = enquiry.mobile_number || enquiry.phone_number;
    if (!mobileNumber) return false;
    
    const cleanedMobile = this.cleanMobileNumber(mobileNumber);
    return this.existingClientsByMobile.has(cleanedMobile);
  }

  // Shortlist button logic methods
  canShowShortlistButton(enquiry: Enquiry): boolean {
    // Show red shortlist button only when:
    // 1. Comment is "Verified(Shortlisted)"
    // 2. Enquiry is not yet submitted (no client created)
    // 3. No existing client with same mobile number
    return enquiry.comments === 'Verified(Shortlisted)' && 
           !enquiry.client_submitted && 
           !this.hasExistingClient(enquiry);
  }

  isEnquirySubmitted(enquiry: Enquiry): boolean {
    // Show green submitted button when:
    // 1. Client has been created from this enquiry, OR
    // 2. Existing client with same mobile number exists
    return enquiry.client_submitted === true || this.hasExistingClient(enquiry);
  }

  shortlistEnquiry(enquiry: Enquiry): void {
    // Check if client already exists with this mobile number
    if (this.hasExistingClient(enquiry)) {
      this.snackBar.open('Client already exists with this mobile number. Cannot create duplicate client.', 'Close', { 
        duration: 5000,
        panelClass: ['error-snackbar']
      });
      return;
    }

    // Validate required data before proceeding
    const ownerName = enquiry.owner_name || enquiry.wati_name;
    const mobileNumber = enquiry.mobile_number || enquiry.phone_number;
    
    if (!ownerName || !mobileNumber) {
      this.snackBar.open('Missing required data (Owner name or mobile number). Please complete the enquiry first.', 'Close', { 
        duration: 5000,
        panelClass: ['error-snackbar']
      });
      return;
    }
    
    // Store enquiry data in session storage for the new client form
    const enquiryData = {
      owner_name: ownerName,
      business_name: enquiry.business_name || '',
      email_address: enquiry.email_address || '',
      mobile_number: mobileNumber,
      secondary_mobile_number: enquiry.secondary_mobile_number || '',
      loan_amount: enquiry.loan_amount || '',
      loan_purpose: enquiry.loan_purpose || '',
      annual_revenue: enquiry.annual_revenue || '',
      business_document_url: enquiry.business_document_url || null,
      enquiry_id: enquiry._id,
      verified_date: new Date().toISOString(),
      shortlisted_via_button: true // Flag to indicate this came from shortlist button
    };
    
    sessionStorage.setItem('enquiry_data_for_client', JSON.stringify(enquiryData));
    
    // Show success message and redirect
    this.snackBar.open('Enquiry shortlisted! Redirecting to new client form...', 'Close', { 
      duration: 3000,
      panelClass: ['success-snackbar']
    });
    
    // Redirect to new client page after a short delay
    setTimeout(() => {
      this.router.navigate(['/new-client']);
    }, 1500);
  }

  // Helper methods for green button display
  getShortlistedText(enquiry: Enquiry): string {
    if (this.hasExistingClient(enquiry)) {
      return 'Shortlisted';
    }
    return enquiry.client_id ? 'Synced' : 'Shortlisted';
  }

  getShortlistedIcon(enquiry: Enquiry): string {
    if (this.hasExistingClient(enquiry)) {
      return 'person_check';
    }
    return enquiry.client_id ? 'sync' : 'check_circle';
  }

  getShortlistedTooltip(enquiry: Enquiry): string {
    if (this.hasExistingClient(enquiry)) {
      return 'Client already exists with this mobile number';
    }
    return enquiry.client_id ? 'Client created and data synchronized' : 'Client already created from this enquiry';
  }

  // Navigate to view client details
  viewClient(clientId: string): void {
    if (clientId) {
      this.router.navigate(['/client-detail', clientId]);
    }
  }

  // Filter dropdown toggle methods
  toggleStaffDropdown(): void {
    this.isStaffDropdownOpen = !this.isStaffDropdownOpen;
    this.isGstDropdownOpen = false;
    this.isInterestDropdownOpen = false;
    this.isSortDropdownOpen = false;
  }

  toggleGstDropdown(): void {
    this.isGstDropdownOpen = !this.isGstDropdownOpen;
    this.isStaffDropdownOpen = false;
    this.isInterestDropdownOpen = false;
    this.isSortDropdownOpen = false;
  }

  toggleInterestDropdown(): void {
    this.isInterestDropdownOpen = !this.isInterestDropdownOpen;
    this.isStaffDropdownOpen = false;
    this.isGstDropdownOpen = false;
    this.isShortlistDropdownOpen = false;
    this.isSortDropdownOpen = false;
  }

  toggleShortlistDropdown(): void {
    this.isShortlistDropdownOpen = !this.isShortlistDropdownOpen;
    this.isStaffDropdownOpen = false;
    this.isGstDropdownOpen = false;
    this.isInterestDropdownOpen = false;
    this.isSortDropdownOpen = false;
  }

  toggleSortDropdown(): void {
    this.isSortDropdownOpen = !this.isSortDropdownOpen;
    this.isStaffDropdownOpen = false;
    this.isGstDropdownOpen = false;
    this.isInterestDropdownOpen = false;
    this.isShortlistDropdownOpen = false;
  }

  selectStaffFilter(value: string): void {
    this.staffFilter = value;
    this.isStaffDropdownOpen = false;
    this.applyFilters();
  }

  selectGstFilter(value: string): void {
    this.gstFilter = value;
    this.isGstDropdownOpen = false;
    this.applyFilters();
  }

  selectInterestFilter(value: string): void {
    this.interestFilter = value;
    this.isInterestDropdownOpen = false;
    this.applyFilters();
  }

  selectShortlistFilter(value: string): void {
    this.shortlistFilter = value;
    this.isShortlistDropdownOpen = false;
    this.applyFilters();
  }

  selectSortOption(value: string): void {
    this.sortOption = value;
    this.isSortDropdownOpen = false;
    this.onSortChange();
  }

  getStaffFilterLabel(): string {
    return this.staffFilter === 'all' ? `All Staff (${this.getStaffCount('all')})` : `${this.staffFilter} (${this.getStaffCount(this.staffFilter)})`;
  }

  getGstFilterLabel(): string {
    if (this.gstFilter === 'all') return `All GST (${this.getGstCount('all')})`;
    if (this.gstFilter === 'yes') return `GST Active (${this.getGstCount('yes')})`;
    return `Not Selected (${this.getGstCount('not_selected')})`;
  }

  getInterestFilterLabel(): string {
    const labels: { [key: string]: string } = {
      'all': 'All Interest',
      'interested': 'Interested',
      'not_interested': 'Not Interested',
      'no_gst': 'No GST',
      'gst_cancelled': 'GST Cancelled',
      'pending': 'Pending',
      'unknown': 'Unknown'
    };
    return `${labels[this.interestFilter]} (${this.getInterestCount(this.interestFilter)})`;
  }

  getShortlistFilterLabel(): string {
    const labels: { [key: string]: string } = {
      'all': 'All',
      'shortlist': 'Can Shortlist',
      'shortlisted': 'Shortlisted',
      'not_shortlist': 'Not Eligible'
    };
    return `${labels[this.shortlistFilter]} (${this.getShortlistCount(this.shortlistFilter)})`;
  }

  getSortOptionLabel(): string {
    const labels: { [key: string]: string } = {
      'date_new': 'Newest First',
      'date_old': 'Oldest First',
      'name_asc': 'Name A-Z',
      'name_desc': 'Name Z-A'
    };
    return labels[this.sortOption];
  }

  // Navigate to enquiry details page
  viewEnquiryDetails(enquiry: Enquiry): void {
    if (enquiry._id) {
      this.router.navigate(['/enquiry-details', enquiry._id]);
    }
  }

  // Helper method to extract last 10 digits from mobile number (remove country code)
  getDisplayMobileNumber(mobileNumber: string): string {
    if (!mobileNumber) {
      return '';
    }
    // Extract last 10 digits
    const cleanedNumber = mobileNumber.replace(/\D/g, ''); // Remove non-digits
    return cleanedNumber.length > 10 ? cleanedNumber.slice(-10) : cleanedNumber;
  }

  // Generate WhatsApp link from mobile number
  getWhatsAppLink(mobileNumber: string): string {
    if (!mobileNumber) {
      return '#';
    }
    
    // Clean the number - remove all non-digit characters
    const cleanedNumber = mobileNumber.replace(/\D/g, '');
    
    // If number has country code (more than 10 digits), use as is
    // If it's 10 digits, assume it's Indian number and add 91
    let fullNumber = cleanedNumber;
    if (cleanedNumber.length === 10) {
      fullNumber = '91' + cleanedNumber;
    }
    
    // Return WhatsApp link
    return `https://wa.me/${fullNumber}`;
  }
}
