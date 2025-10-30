import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ClientService, Client } from '../../services/client.service';
import { AuthService } from '../../services/auth.service';
import { UserService, User } from '../../services/user.service';
import { ClientDetailsDialogComponent } from '../client-details-dialog/client-details-dialog.component';
import { ConfirmDeleteDialogComponent } from '../confirm-delete-dialog/confirm-delete-dialog.component';
import { Subject, timer } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-clients',
  templateUrl: './clients.component.html',
  styleUrls: ['./clients.component.scss']
})
export class ClientsComponent implements OnInit, OnDestroy {
  clients: Client[] = [];
  filteredClients: Client[] = [];
  paginatedClients: Client[] = []; // Paginated data for display
  users: User[] = [];
  uniqueStaffMembers: any[] = [];
  loading = true;
  error = '';
  
  // Pagination properties
  currentPage = 1;
  pageSize = 50;
  totalPages = 0;
  
  searchTerm = '';
  statusFilter = 'all';
  staffFilter = 'all';
  sortBy = 'newest';
  commentsFilter = 'all';
  loanStatusFilter = 'all';
  applyNewClientsFilter: Date | null = null;
  applyUpdatedClientsFilter: Date | null = null;
  updatingClientId: string | null = null;
  viewMode: 'table' | 'card' = 'table';
  private destroy$ = new Subject<void>();
  
  // Status update dialog
  showStatusUpdateDialog = false;
  selectedClientForStatus: Client | null = null;
  selectedStatus: string = '';
  statusFeedback: string = '';
  isUpdatingStatus = false;

  // Custom dropdown state management
  openDropdownId: string | null = null;
  currentDropdownClient: Client | null = null;
  private scrollListener?: () => void;
  commentOptions = [
    { value: 'Not Interested', label: 'Not Interested', icon: 'cancel' },
    { value: 'Will call back', label: 'Will call back', icon: 'phone_callback' },
    { value: '1st call completed', label: '1st call completed', icon: 'call_end' },
    { value: '2nd call completed', label: '2nd call completed', icon: 'call_end' },
    { value: '3rd call completed', label: '3rd call completed', icon: 'call_end' },
    { value: '4th call completed', label: '4th call completed', icon: 'call_end' },
    { value: '5th call completed', label: '5th call completed', icon: 'call_end' },
    { value: 'rejected', label: 'rejected', icon: 'block' },
    { value: 'cash free login completed', label: 'cash free login completed', icon: 'check_circle' },
    { value: 'share product images', label: 'share product images', icon: 'image' },
    { value: 'share signature', label: 'share signature', icon: 'draw' }
  ];

  displayedColumns: string[] = ['serial', 'name', 'business', 'mobile', 'staff', 'status', 'loan_status', 'created', 'comments', 'actions'];
  userDisplayedColumns: string[] = ['serial', 'name', 'business', 'mobile', 'staff', 'status', 'loan_status', 'created', 'comments', 'actions']; // Include 'comments' for regular users (read-only)
  adminDisplayedColumns: string[] = ['serial', 'name', 'business', 'mobile', 'staff', 'status', 'loan_status', 'created', 'comments', 'actions'];

  constructor(
    private clientService: ClientService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private userService: UserService
  ) { }

  ngOnInit(): void {
    this.checkMobileView();
    this.handleQueryParams();
    this.loadClients();
    this.loadUsers();
    
    // Subscribe to client updates
    this.clientService.clientUpdated$.subscribe(clientId => {
      if (clientId) {
        console.log('Client updated notification received for ID:', clientId);
        this.refreshClientData(clientId);
      }
    });
    
    // Auto-refresh clients every 1 second
    timer(1000, 1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        // Silently refresh without showing loading indicator
        this.clientService.getClients().subscribe({
          next: (response) => {
            if (response && response.clients) {
              this.clients = response.clients;
              this.applySpecialFilters();
              this.applyFilters();
            }
          },
          error: (error) => {
            console.error('Auto-refresh failed:', error);
          }
        });
      });
  }

  checkMobileView(): void {
    // Check if device is mobile (screen width < 768px)
    if (window.innerWidth < 768) {
      this.viewMode = 'card';
    }
  }

  handleQueryParams(): void {
    this.route.queryParams.subscribe(params => {
      if (params['sortBy']) {
        this.sortBy = params['sortBy'];
      }
      if (params['filter']) {
        // Handle special filters from admin dashboard
        if (params['filter'] === 'new') {
          this.filterNewClients();
        } else if (params['filter'] === 'updated') {
          this.filterUpdatedClients();
        }
      }
    });
  }

  filterNewClients(): void {
    const lastAdminVisit = localStorage.getItem('lastAdminVisit');
    if (lastAdminVisit) {
      const lastVisitDate = new Date(lastAdminVisit);
      // This will be applied after clients are loaded
      this.applyNewClientsFilter = lastVisitDate;
    }
  }

  filterUpdatedClients(): void {
    const lastAdminVisit = localStorage.getItem('lastAdminVisit');
    if (lastAdminVisit) {
      const lastVisitDate = new Date(lastAdminVisit);
      // This will be applied after clients are loaded
      this.applyUpdatedClientsFilter = lastVisitDate;
    }
  }

  loadClients(retryCount: number = 0): void {
    console.log('=== FRONTEND CLIENT LOADING DEBUG ===');
    console.log('Starting client load process... Attempt:', retryCount + 1);
    
    this.loading = true;
    this.error = '';
    
    this.clientService.getClients().subscribe({
      next: (response) => {
        console.log('Client service response received:', response);
        console.log('Response type:', typeof response);
        console.log('Response keys:', Object.keys(response || {}));
        
        if (response && response.clients) {
          console.log('Clients array found:', response.clients);
          console.log('Number of clients:', response.clients.length);
          
          this.clients = response.clients;
          
          // Log first few clients for debugging
          if (response.clients.length > 0) {
            console.log('First client sample:', response.clients[0]);
            response.clients.slice(0, 3).forEach((client, index) => {
              console.log(`Client ${index + 1}:`, {
                id: client._id,
                name: client.legal_name || client.user_name,
                status: client.status,
                created_at: client.created_at
              });
            });
          } else {
            console.log('No clients found in response');
          }
          
          this.applySpecialFilters();
          this.applyFilters();
          console.log('Filtered clients count:', this.filteredClients.length);
        } else {
          console.log('No clients property in response or response is null');
          this.clients = [];
          this.filteredClients = [];
        }
        
        this.loading = false;
        console.log('Client loading completed successfully');
      },
      error: (error) => {
        console.error('=== CLIENT LOADING ERROR ===');
        console.error('Error object:', error);
        console.error('Error status:', error.status);
        console.error('Error message:', error.message);
        console.error('Error details:', error.error);
        
        // Retry logic for network errors and 404s (server might be deploying)
        if ((error.status === 0 || error.status === 404 || error.status >= 500) && retryCount < 3) {
          console.log(`Retrying client load in ${(retryCount + 1) * 2} seconds... (Attempt ${retryCount + 2}/4)`);
          this.error = `Loading clients... Retrying in ${(retryCount + 1) * 2} seconds`;
          
          setTimeout(() => {
            this.loadClients(retryCount + 1);
          }, (retryCount + 1) * 2000); // 2s, 4s, 6s delays
          return;
        }
        
        if (error.status === 401) {
          this.error = 'Authentication failed. Please login again.';
          console.log('Authentication error - redirecting to login may be needed');
        } else if (error.status === 0) {
          this.error = 'Cannot connect to server. Please check your connection and try again.';
          console.log('Connection error - backend server may be down');
        } else if (error.status === 404) {
          this.error = 'Server is temporarily unavailable. Please try again in a few moments.';
          console.log('404 error - server may be deploying');
        } else if (error.status >= 500) {
          this.error = 'Server error. Please try again later.';
          console.log('Server error - check backend logs');
        } else {
          this.error = error.error?.message || error.message || 'Failed to load clients';
        }
        
        this.clients = [];
        this.filteredClients = [];
        this.loading = false;
        console.log('Client loading failed with error:', this.error);
        
        // Show retry button for failed requests
        if (retryCount >= 3) {
          this.error += ' Click refresh to try again.';
        }
      }
    });
  }

  loadUsers(): void {
    this.userService.getUsers().subscribe({
      next: (response) => {
        console.log('Users loaded successfully:', response);
        // Filter out paused users and only include active users
        this.users = (response.users || []).filter((user: any) => 
          (user.role === 'user' || user.role === 'admin') && 
          (user.status !== 'paused')
        );
        this.getUniqueStaffMembers();
      },
      error: (error) => {
        console.error('Failed to load users:', error);
        // Fallback: extract staff from client data
        this.users = [];
        this.getUniqueStaffMembers();
      }
    });
  }

  applySpecialFilters(): void {
    if (this.applyNewClientsFilter) {
      this.clients = this.clients.filter(client => {
        if (!client.created_at) return false;
        const createdAt = new Date(client.created_at);
        return createdAt > this.applyNewClientsFilter!;
      });
    }

    if (this.applyUpdatedClientsFilter) {
      this.clients = this.clients.filter(client => {
        if (!client.updated_at || !client.created_at) return false;
        const updatedAt = new Date(client.updated_at);
        const createdAt = new Date(client.created_at);
        return updatedAt > createdAt && updatedAt > this.applyUpdatedClientsFilter!;
      });
    }
  }

  applyFilters(): void {
    this.filteredClients = this.clients.filter(client => {
      const matchesSearch = (client.legal_name || client.user_name || '').toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                           (client.trade_name || client.business_name || '').toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                           (client.mobile_number || '').includes(this.searchTerm);
      
      const matchesStatus = this.statusFilter === 'all' || client.status === this.statusFilter;
      
      const matchesStaff = this.staffFilter === 'all' || client.staff_email === this.staffFilter;
      
      const matchesComments = this.commentsFilter === 'all' || client.comments === this.commentsFilter;
      
      const matchesLoanStatus = this.loanStatusFilter === 'all' || this.getLoanStatus(client) === this.loanStatusFilter;
      
      return matchesSearch && matchesStatus && matchesStaff && matchesComments && matchesLoanStatus;
    });
    
    this.applySorting();
    this.updatePagination();
  }

  applySorting(): void {
    this.filteredClients.sort((a, b) => {
      switch (this.sortBy) {
        case 'newest':
          const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return dateB - dateA;
        case 'oldest':
          const dateOldA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const dateOldB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return dateOldA - dateOldB;
        case 'name_asc':
          const nameA = (a.legal_name || a.user_name || '').toLowerCase();
          const nameB = (b.legal_name || b.user_name || '').toLowerCase();
          return nameA.localeCompare(nameB);
        case 'name_desc':
          const nameDescA = (a.legal_name || a.user_name || '').toLowerCase();
          const nameDescB = (b.legal_name || b.user_name || '').toLowerCase();
          return nameDescB.localeCompare(nameDescA);
        default:
          return 0;
      }
    });
  }

  updatePagination(): void {
    // Calculate total pages
    this.totalPages = Math.ceil(this.filteredClients.length / this.pageSize);
    
    // Reset to page 1 if current page exceeds total pages
    if (this.currentPage > this.totalPages && this.totalPages > 0) {
      this.currentPage = 1;
    }
    
    // Get paginated data
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedClients = this.filteredClients.slice(startIndex, endIndex);
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
    return Math.min(this.currentPage * this.pageSize, this.filteredClients.length);
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  onStatusFilterChange(): void {
    this.applyFilters();
  }

  onSortChange(): void {
    this.applyFilters();
  }

  onStaffFilterChange(): void {
    this.applyFilters();
  }

  // Custom dropdown state variables
  isStatusDropdownOpen = false;
  isStaffDropdownOpen = false;
  isSortDropdownOpen = false;
  isCommentsDropdownOpen = false;
  isLoanStatusDropdownOpen = false;
  statusUpdateDropdownClientId: string | null = null;
  statusUpdateDropdownPosition = { top: 0, left: 0 };
  commentsDropdownClientId: string | null = null;
  commentsDropdownPosition = { top: 0, left: 0 };

  // Toggle dropdown methods
  toggleStatusDropdown(): void {
    this.isStatusDropdownOpen = !this.isStatusDropdownOpen;
    this.isStaffDropdownOpen = false;
    this.isSortDropdownOpen = false;
    this.isCommentsDropdownOpen = false;
    this.isLoanStatusDropdownOpen = false;
  }

  toggleStaffDropdown(): void {
    this.isStaffDropdownOpen = !this.isStaffDropdownOpen;
    this.isStatusDropdownOpen = false;
    this.isSortDropdownOpen = false;
    this.isCommentsDropdownOpen = false;
    this.isLoanStatusDropdownOpen = false;
  }

  toggleSortDropdown(): void {
    this.isSortDropdownOpen = !this.isSortDropdownOpen;
    this.isStatusDropdownOpen = false;
    this.isStaffDropdownOpen = false;
    this.isCommentsDropdownOpen = false;
    this.isLoanStatusDropdownOpen = false;
  }

  toggleCommentsDropdown(): void {
    this.isCommentsDropdownOpen = !this.isCommentsDropdownOpen;
    this.isStatusDropdownOpen = false;
    this.isStaffDropdownOpen = false;
    this.isSortDropdownOpen = false;
    this.isLoanStatusDropdownOpen = false;
  }

  toggleLoanStatusDropdown(): void {
    this.isLoanStatusDropdownOpen = !this.isLoanStatusDropdownOpen;
    this.isStatusDropdownOpen = false;
    this.isStaffDropdownOpen = false;
    this.isSortDropdownOpen = false;
    this.isCommentsDropdownOpen = false;
  }

  // Select filter methods
  selectStatusFilter(status: string): void {
    this.statusFilter = status;
    this.isStatusDropdownOpen = false;
    this.onStatusFilterChange();
  }

  selectStaffFilter(staffEmail: string): void {
    this.staffFilter = staffEmail;
    this.isStaffDropdownOpen = false;
    this.onStaffFilterChange();
  }

  selectSortOption(sortOption: string): void {
    this.sortBy = sortOption;
    this.isSortDropdownOpen = false;
    this.onSortChange();
  }

  selectCommentsFilter(comment: string): void {
    this.commentsFilter = comment;
    this.isCommentsDropdownOpen = false;
    this.applyFilters();
  }

  selectLoanStatusFilter(loanStatus: string): void {
    this.loanStatusFilter = loanStatus;
    this.isLoanStatusDropdownOpen = false;
    this.applyFilters();
  }

  // Status update dropdown methods
  toggleStatusUpdateDropdown(clientId: string, event: MouseEvent): void {
    if (this.statusUpdateDropdownClientId === clientId) {
      this.statusUpdateDropdownClientId = null;
    } else {
      this.statusUpdateDropdownClientId = clientId;
      
      // Position dropdown after DOM update
      setTimeout(() => {
        this.positionStatusUpdateDropdown(clientId);
      }, 0);
    }
  }

  positionStatusUpdateDropdown(clientId: string): void {
    const button = document.getElementById('status-btn-' + clientId);
    
    if (button) {
      const rect = button.getBoundingClientRect();
      const viewport = {
        width: window.innerWidth,
        height: window.innerHeight
      };
      
      const dropdownWidth = 224; // 14rem = 224px (w-56)
      const dropdownHeight = 280; // Approximate height of 5 items
      
      // Calculate initial position (below and to the left of button)
      let top = rect.bottom + window.scrollY + 8;
      let left = rect.left + window.scrollX;
      
      // Check if dropdown would go off-screen to the right
      if (left + dropdownWidth > viewport.width) {
        // Align to right edge of button instead
        left = rect.right + window.scrollX - dropdownWidth;
      }
      
      // Check if dropdown would go off-screen at the bottom
      if (top + dropdownHeight > viewport.height + window.scrollY) {
        // Position above the button instead
        top = rect.top + window.scrollY - dropdownHeight - 8;
      }
      
      // Ensure dropdown doesn't go off left edge
      if (left < 10) {
        left = 10;
      }
      
      // Ensure dropdown doesn't go off right edge
      if (left + dropdownWidth > viewport.width - 10) {
        left = viewport.width - dropdownWidth - 10;
      }
      
      this.statusUpdateDropdownPosition = { top, left };
    }
  }

  isStatusUpdateDropdownOpen(clientId: string): boolean {
    return this.statusUpdateDropdownClientId === clientId;
  }

  selectStatusUpdate(client: Client, status: string): void {
    this.statusUpdateDropdownClientId = null;
    this.updateClientStatus(client, status);
  }

  getClientById(clientId: string): Client {
    return this.filteredClients.find(c => c._id === clientId) || this.clients.find(c => c._id === clientId) || {} as Client;
  }

  // Get label methods for dropdowns
  getStatusFilterLabel(): string {
    switch (this.statusFilter) {
      case 'all': return `All Status (${this.getStatusCount('all')})`;
      case 'pending': return `Pending (${this.getStatusCount('pending')})`;
      case 'interested': return `Interested (${this.getStatusCount('interested')})`;
      case 'not_interested': return `Not Interested (${this.getStatusCount('not_interested')})`;
      case 'hold': return `On Hold (${this.getStatusCount('hold')})`;
      case 'processing': return `Processing (${this.getStatusCount('processing')})`;
      default: return 'Select Status';
    }
  }

  getStaffFilterLabel(): string {
    if (this.staffFilter === 'all') {
      return `All Staff (${this.clients.length})`;
    }
    const staff = this.uniqueStaffMembers.find(s => s.email === this.staffFilter);
    if (staff) {
      return `${this.getStaffNameFromFilter(staff)} (${this.getStaffCount(staff.email)})`;
    }
    return 'Select Staff';
  }

  getSortOptionLabel(): string {
    switch (this.sortBy) {
      case 'newest': return 'Newest First';
      case 'oldest': return 'Oldest First';
      case 'name_asc': return 'Name A-Z';
      case 'name_desc': return 'Name Z-A';
      default: return 'Sort By';
    }
  }

  getCommentsFilterLabel(): string {
    if (this.commentsFilter === 'all') {
      return `All Comments (${this.getCommentsCount('all')})`;
    }
    const option = this.commentOptions.find(o => o.value === this.commentsFilter);
    if (option) {
      return `${option.label} (${this.getCommentsCount(this.commentsFilter)})`;
    }
    return 'Select Comment';
  }

  getLoanStatusFilterLabel(): string {
    const labels: { [key: string]: string } = {
      'all': `All Loan Status (${this.getLoanStatusCount('all')})`,
      'approved': `Approved (${this.getLoanStatusCount('approved')})`,
      'rejected': `Rejected (${this.getLoanStatusCount('rejected')})`,
      'hold': `Hold (${this.getLoanStatusCount('hold')})`,
      'processing': `Processing (${this.getLoanStatusCount('processing')})`,
      'soon': `Soon (${this.getLoanStatusCount('soon')})`
    };
    return labels[this.loanStatusFilter] || 'Select Loan Status';
  }

  getCommentsCount(comment: string): number {
    if (comment === 'all') {
      return this.clients.length;
    }
    return this.clients.filter(c => c.comments === comment).length;
  }

  getLoanStatusCount(loanStatus: string): number {
    if (loanStatus === 'all') {
      return this.clients.length;
    }
    return this.clients.filter(c => this.getLoanStatus(c) === loanStatus).length;
  }

  getStatusColor(status: string): string {
    // Handle undefined or null status
    if (!status) {
      return '#666'; // Default gray color
    }
    
    switch (status.toLowerCase()) {
      case 'interested': return '#4caf50';
      case 'not_interested': return '#f44336';
      case 'hold': return '#ff9800';
      case 'pending': return '#9c27b0';
      case 'processing': return '#2196f3';
      default: return '#666';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'interested': return 'check_circle';
      case 'not_interested': return 'cancel';
      case 'hold': return 'pause';
      case 'pending': return 'schedule';
      case 'processing': return 'autorenew';
      default: return 'help_outline';
    }
  }

  getLoanStatusColor(status: string): string {
    switch (status) {
      case 'approved': return '#4caf50'; // Green
      case 'rejected': return '#f44336'; // Red
      case 'hold': return '#ff9800'; // Orange
      case 'processing': return '#00bcd4'; // Sky Blue
      case 'soon': return '#9e9e9e'; // Gray
      default: return '#9e9e9e'; // Gray
    }
  }

  getLoanStatusIcon(status: string): string {
    switch (status) {
      case 'approved': return 'check_circle';
      case 'rejected': return 'cancel';
      case 'hold': return 'pause';
      case 'processing': return 'autorenew';
      case 'soon': return 'schedule';
      default: return 'help_outline';
    }
  }

  getLoanStatus(client: Client): string {
    return (client as any)?.loan_status || 'soon';
  }

  isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  getDisplayedColumns(): string[] {
    // Include 'comments' column for both admin and regular users
    return this.isAdmin() ? this.adminDisplayedColumns : this.userDisplayedColumns;
  }

  editClient(client: Client): void {
    this.router.navigate(['/clients', client._id, 'edit']);
  }

  openWhatsApp(client: Client): void {
    const mobileNumber = client.mobile_number;
    if (mobileNumber) {
      const whatsappUrl = `https://wa.me/${mobileNumber.replace(/[^0-9]/g, '')}`;
      window.open(whatsappUrl, '_blank');
    } else {
      this.snackBar.open('No mobile number available for this client', 'Close', {
        duration: 3000
      });
    }
  }

  updateClientStatus(client: Client, status: string): void {
    this.selectedClientForStatus = client;
    this.selectedStatus = status;
    this.statusFeedback = '';
    this.showStatusUpdateDialog = true;
  }

  confirmStatusUpdate(): void {
    if (!this.selectedClientForStatus) {
      return;
    }

    this.isUpdatingStatus = true;
    this.updatingClientId = this.selectedClientForStatus._id;
    
    this.clientService.updateClientStatus(
      this.selectedClientForStatus._id, 
      this.selectedStatus, 
      '' // Empty feedback
    ).subscribe({
      next: () => {
        if (this.selectedClientForStatus) {
          this.selectedClientForStatus.status = this.selectedStatus;
        }
        this.updatingClientId = null;
        this.isUpdatingStatus = false;
        this.showStatusUpdateDialog = false;
        this.selectedClientForStatus = null;
        this.snackBar.open('Client status updated successfully', 'Close', {
          duration: 3000
        });
      },
      error: (error) => {
        this.updatingClientId = null;
        this.isUpdatingStatus = false;
        this.showStatusUpdateDialog = false;
        this.selectedClientForStatus = null;
        this.snackBar.open('Failed to update client status', 'Close', {
          duration: 3000
        });
      }
    });
  }

  cancelStatusUpdate(): void {
    this.showStatusUpdateDialog = false;
    this.selectedClientForStatus = null;
    this.selectedStatus = '';
    this.statusFeedback = '';
  }

  deleteClient(client: Client): void {
    const dialogRef = this.dialog.open(ConfirmDeleteDialogComponent, {
      width: '400px',
      data: { name: client.legal_name || client.user_name || 'this client' }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Store original data for rollback in case of error
        const originalClients = [...this.clients];
        const originalFilteredClients = [...this.filteredClients];
        
        // Optimistic deletion - remove immediately from UI
        this.clients = this.clients.filter(c => c._id !== client._id);
        this.filteredClients = this.filteredClients.filter(c => c._id !== client._id);
        
        // Show immediate success feedback
        this.snackBar.open('Client deleted successfully', 'Close', {
          duration: 2000
        });
        
        // Make API call in background
        this.clientService.deleteClient(client._id).subscribe({
          next: () => {
            // Already removed from UI, nothing more to do
          },
          error: (error) => {
            // Rollback on error - restore the client
            this.clients = originalClients;
            this.filteredClients = originalFilteredClients;
            this.snackBar.open('Failed to delete client', 'Close', {
              duration: 3000
            });
          }
        });
      }
    });
  }

  downloadDocument(client: Client, documentType: string): void {
    this.clientService.downloadDocument(client._id, documentType).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${client.user_name}_${documentType}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        this.snackBar.open('Failed to download document', 'Close', {
          duration: 3000
        });
      }
    });
  }

  viewClientDetails(client: Client): void {
    // Navigate to client details page instead of opening dialog
    this.router.navigate(['/clients', client._id]);
  }

  getUniqueStaffMembers(): void {
    const staffMap = new Map();
    
    // Add staff from users array (from API)
    this.users.forEach(user => {
      if (user.email && user.email.startsWith('tmis.') && user.role === 'user') {
        staffMap.set(user.email, {
          email: user.email,
          name: user.username,
          source: 'users'
        });
      }
    });
    
    // Add staff from client records
    this.clients.forEach(client => {
      // Check staff_email field
      if (client.staff_email) {
        if (!staffMap.has(client.staff_email)) {
          staffMap.set(client.staff_email, {
            email: client.staff_email,
            name: client.staff_name || this.getNameFromEmail(client.staff_email),
            source: 'clients'
          });
        }
      }
      
      // Check created_by field
      if (client.created_by && client.created_by.includes('@')) {
        if (!staffMap.has(client.created_by)) {
          staffMap.set(client.created_by, {
            email: client.created_by,
            name: (client as any).created_by_name || this.getNameFromEmail(client.created_by),
            source: 'clients'
          });
        }
      }
    });
    
    // Convert map to array and sort
    this.uniqueStaffMembers = Array.from(staffMap.values()).sort((a, b) => 
      a.name.localeCompare(b.name)
    );
    
    console.log('Unique staff members:', this.uniqueStaffMembers);
  }

  getNameFromEmail(email: string): string {
    if (!email) return 'Unknown';
    const username = email.split('@')[0];
    return username.replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  getStaffNameFromFilter(staff: any): string {
    return staff.name || this.getNameFromEmail(staff.email);
  }

  getStaffNameFromEmail(email: string): string {
    const staff = this.uniqueStaffMembers.find(s => s.email === email);
    return staff ? staff.name : this.getNameFromEmail(email);
  }

  hasActiveFilters(): boolean {
    return this.searchTerm !== '' || this.statusFilter !== 'all' || this.staffFilter !== 'all' || 
           this.commentsFilter !== 'all' || this.loanStatusFilter !== 'all';
  }

  clearAllFilters(): void {
    this.searchTerm = '';
    this.statusFilter = 'all';
    this.staffFilter = 'all';
    this.commentsFilter = 'all';
    this.loanStatusFilter = 'all';
    this.applyFilters();
  }

  getSelectedStaff(): any {
    return this.uniqueStaffMembers.find(s => s.email === this.staffFilter) || { name: 'Unknown' };
  }

  isClientUpdating(clientId: string): boolean {
    return this.updatingClientId === clientId;
  }

  refreshClientData(clientId: string): void {
    // Refresh specific client data by fetching updated details
    this.clientService.getClientDetails(clientId).subscribe({
      next: (response) => {
        if (response && response.client) {
          // Find and update the client in the current arrays
          const clientIndex = this.clients.findIndex(c => c._id === clientId);
          if (clientIndex !== -1) {
            this.clients[clientIndex] = response.client;
          }
          
          const filteredIndex = this.filteredClients.findIndex(c => c._id === clientId);
          if (filteredIndex !== -1) {
            this.filteredClients[filteredIndex] = response.client;
          }
          
          console.log('Client data refreshed for ID:', clientId);
        }
      },
      error: (error) => {
        console.error('Failed to refresh client data:', error);
        // Fallback: reload all clients
        this.loadClients();
      }
    });
  }

  goBack(): void {
    window.history.back();
  }

  toggleView(): void {
    this.viewMode = this.viewMode === 'table' ? 'card' : 'table';
  }

  onCommentChange(client: Client, comment: string): void {
    // Set loading state for this specific client
    this.updatingClientId = client._id;
    
    // Immediately update the UI to provide instant feedback
    const previousComment = client.comments;
    client.comments = comment;
    
    // Update the client in the local array immediately for UI responsiveness
    const clientIndex = this.clients.findIndex(c => c._id === client._id);
    if (clientIndex !== -1) {
      this.clients[clientIndex].comments = comment;
    }
    
    const filteredIndex = this.filteredClients.findIndex(c => c._id === client._id);
    if (filteredIndex !== -1) {
      this.filteredClients[filteredIndex].comments = comment;
    }
    
    // Update the client's comment in the database
    this.clientService.updateClient(client._id, { comments: comment }).subscribe({
      next: (response) => {
        // Clear loading state
        this.updatingClientId = null;
        
        // Show appropriate notification based on response
        let message = 'Comment updated successfully';
        let duration = 3000;
        let panelClass = ['success-snackbar'];
        
        // Check if WhatsApp was sent or attempted
        if (response && response.whatsapp_sent === true) {
          message += ', ✅WhatsApp message sent';
        } else if (response && response.whatsapp_quota_exceeded === true) {
          message += ', ⚠️WhatsApp message not sent due to limit reached';
          panelClass = ['warning-snackbar'];
        } else if (response && response.whatsapp_error) {
          message += `, ❌WhatsApp error: ${response.whatsapp_error}`;
          panelClass = ['error-snackbar'];
        } else if (response && response.whatsapp_notification === 'attempted') {
          // For admin users, indicate that WhatsApp notification will be sent
          if (this.isAdmin()) {
            message += ', WhatsApp notification attempted';
          }
        }
        
        this.snackBar.open(message, 'Close', {
          duration: duration,
          panelClass: panelClass
        });
      },
      error: (error) => {
        // Clear loading state on error
        this.updatingClientId = null;
        
        // Revert the comment in the UI if the update failed
        client.comments = previousComment;
        
        const clientIndex = this.clients.findIndex(c => c._id === client._id);
        if (clientIndex !== -1) {
          this.clients[clientIndex].comments = previousComment;
        }
        
        const filteredIndex = this.filteredClients.findIndex(c => c._id === client._id);
        if (filteredIndex !== -1) {
          this.filteredClients[filteredIndex].comments = previousComment;
        }
        
        this.snackBar.open('Failed to update comment', 'Close', {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  // Helper methods for filter counts
  getStatusCount(status: string): number {
    if (status === 'all') {
      return this.clients.length;
    }
    return this.clients.filter(client => client.status === status).length;
  }

  getStaffCount(staffEmail: string): number {
    if (staffEmail === 'all') {
      return this.clients.length;
    }
    return this.clients.filter(client => client.staff_email === staffEmail).length;
  }

  // Custom dropdown methods
  toggleDropdown(clientId: string): void {
    if (this.isClientUpdating(clientId)) return;
    const wasOpen = this.openDropdownId === clientId;
    this.openDropdownId = wasOpen ? null : clientId;
    
    if (!wasOpen) {
      // Find the client and store reference
      this.currentDropdownClient = this.filteredClients.find(c => c._id === clientId) || null;
      // Position dropdown after DOM update
      setTimeout(() => {
        this.positionGlobalDropdown(clientId);
        this.addScrollListeners(clientId);
      }, 0);
    } else {
      this.currentDropdownClient = null;
      this.removeScrollListeners();
    }
    
    console.log('Dropdown toggled for client:', clientId, 'Now open:', !wasOpen);
  }

  closeDropdown(): void {
    this.openDropdownId = null;
    this.currentDropdownClient = null;
    this.removeScrollListeners();
  }

  isDropdownOpen(clientId: string): boolean {
    return this.openDropdownId === clientId;
  }

  selectComment(client: Client, comment: string): void {
    this.onCommentChange(client, comment);
    this.closeDropdown();
  }

  getSelectedCommentLabel(client: Client): string {
    if (!client.comments) return 'Select Comment';
    const option = this.commentOptions.find(opt => opt.value === client.comments);
    return option ? option.label : client.comments;
  }

  onOptionHover(event: Event, client: Client, option: any, isEntering: boolean): void {
    const target = event.target as HTMLElement;
    if (target) {
      if (client.comments === option.value) {
        target.style.backgroundColor = '#3b82f6';
      } else {
        target.style.backgroundColor = isEntering ? '#f3f4f6' : 'transparent';
      }
    }
  }

  // Global dropdown methods
  positionGlobalDropdown(clientId: string): void {
    const buttonElement = document.querySelector(`[data-client-id="${clientId}"]`) as HTMLElement;
    const dropdownElement = document.getElementById(`dropdown-${clientId}`) as HTMLElement;
    
    if (buttonElement && dropdownElement) {
      const rect = buttonElement.getBoundingClientRect();
      const viewport = {
        width: window.innerWidth,
        height: window.innerHeight
      };
      
      // Calculate position relative to viewport with scroll offset
      let top = rect.bottom + window.scrollY + 4; // 4px gap below button
      let left = rect.left + window.scrollX;
      
      // Ensure dropdown doesn't go off-screen horizontally
      const dropdownWidth = 192; // 12rem = 192px
      if (left + dropdownWidth > viewport.width) {
        left = viewport.width - dropdownWidth - 10; // 10px margin from edge
      }
      
      // Ensure dropdown doesn't go off-screen vertically
      const dropdownMaxHeight = 240; // 15rem = 240px
      if (top + dropdownMaxHeight > viewport.height + window.scrollY) {
        // Position above the button if there's not enough space below
        top = rect.top + window.scrollY - dropdownMaxHeight - 4;
      }
      
      // Apply positioning
      dropdownElement.style.position = 'absolute';
      dropdownElement.style.top = top + 'px';
      dropdownElement.style.left = left + 'px';
      
      console.log('Positioning dropdown:', { 
        top, 
        left, 
        buttonRect: rect,
        viewport,
        scrollY: window.scrollY,
        buttonBottom: rect.bottom,
        calculatedTop: rect.bottom + window.scrollY + 4
      });
    }
  }

  getCurrentClientComment(): string {
    return this.currentDropdownClient?.comments || '';
  }

  selectCommentFromGlobalDropdown(comment: string): void {
    if (this.currentDropdownClient) {
      this.onCommentChange(this.currentDropdownClient, comment);
    }
    this.closeDropdown();
  }

  onGlobalOptionHover(event: Event, option: any, isEntering: boolean): void {
    const target = event.target as HTMLElement;
    if (target) {
      const currentComment = this.getCurrentClientComment();
      if (currentComment === option.value) {
        target.style.backgroundColor = '#3b82f6';
      } else {
        target.style.backgroundColor = isEntering ? '#f3f4f6' : 'transparent';
      }
    }
  }

  // Scroll listener methods
  addScrollListeners(clientId: string): void {
    this.scrollListener = () => {
      if (this.openDropdownId === clientId) {
        this.positionGlobalDropdown(clientId);
      }
    };

    // Add listeners to table container and window
    const tableContainer = document.querySelector('.overflow-x-auto');
    if (tableContainer) {
      tableContainer.addEventListener('scroll', this.scrollListener);
    }
    
    // Also listen to window scroll
    window.addEventListener('scroll', this.scrollListener);
    window.addEventListener('resize', this.scrollListener);
  }

  removeScrollListeners(): void {
    if (this.scrollListener) {
      const tableContainer = document.querySelector('.overflow-x-auto');
      if (tableContainer) {
        tableContainer.removeEventListener('scroll', this.scrollListener);
      }
      
      window.removeEventListener('scroll', this.scrollListener);
      window.removeEventListener('resize', this.scrollListener);
      this.scrollListener = undefined;
    }
  }

  ngOnDestroy(): void {
    // Clean up scroll listeners when component is destroyed
    this.removeScrollListeners();
    
    // Clean up auto-refresh subscription
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Handle window resize to switch view mode on mobile
  @HostListener('window:resize', ['$event'])
  onResize(): void {
    this.checkMobileView();
  }

  // Close all dropdowns when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    
    // Check if click is inside the table comment dropdown or its button
    const clickedInsideCommentDropdown = target.closest('[data-client-id]') !== null ||
                                          target.closest('#dropdown-' + this.openDropdownId) !== null;
    
    // Check if click is inside status update dropdown or its button
    const clickedInsideStatusDropdown = target.closest('#status-btn-' + this.statusUpdateDropdownClientId) !== null ||
                                         (this.statusUpdateDropdownClientId && 
                                          target.closest('.fixed.w-56') !== null);
    
    // Check if clicked on filter dropdown elements
    const clickedOnStatusFilter = target.closest('button')?.textContent?.includes(this.getStatusFilterLabel()) ||
                                   target.closest('.absolute.z-50.w-full') !== null;
    const clickedOnStaffFilter = target.closest('button')?.textContent?.includes(this.getStaffFilterLabel()) ||
                                  target.closest('.absolute.z-50.w-full') !== null;
    const clickedOnSortFilter = target.closest('button')?.textContent?.includes(this.getSortOptionLabel()) ||
                                 target.closest('.absolute.z-50.w-full') !== null;
    const clickedOnCommentsFilter = target.closest('button')?.textContent?.includes(this.getCommentsFilterLabel()) ||
                                     target.closest('.absolute.z-50.w-full') !== null;
    const clickedOnLoanStatusFilter = target.closest('button')?.textContent?.includes(this.getLoanStatusFilterLabel()) ||
                                       target.closest('.absolute.z-50.w-full') !== null;
    
    // Close table comment dropdown if clicking outside
    if (this.openDropdownId && !clickedInsideCommentDropdown) {
      this.closeDropdown();
    }
    
    // Close status update dropdown if clicking outside
    if (this.statusUpdateDropdownClientId && !clickedInsideStatusDropdown) {
      this.statusUpdateDropdownClientId = null;
    }
    
    // Close filter dropdowns if clicking outside their respective areas
    const filterDropdownElement = target.closest('.absolute.z-50.w-full');
    if (!filterDropdownElement) {
      // Only close dropdowns if we didn't click on their trigger buttons
      const clickedButton = target.closest('button');
      const buttonText = clickedButton?.textContent || '';
      
      if (!buttonText.includes(this.getStatusFilterLabel())) {
        this.isStatusDropdownOpen = false;
      }
      if (!buttonText.includes(this.getStaffFilterLabel())) {
        this.isStaffDropdownOpen = false;
      }
      if (!buttonText.includes(this.getSortOptionLabel())) {
        this.isSortDropdownOpen = false;
      }
      if (!buttonText.includes(this.getCommentsFilterLabel())) {
        this.isCommentsDropdownOpen = false;
      }
      if (!buttonText.includes(this.getLoanStatusFilterLabel())) {
        this.isLoanStatusDropdownOpen = false;
      }
    }
  }

}