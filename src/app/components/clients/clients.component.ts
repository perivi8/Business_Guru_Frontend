import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ClientService, Client } from '../../services/client.service';
import { AuthService } from '../../services/auth.service';
import { UserService, User } from '../../services/user.service';
import { ClientDetailsDialogComponent } from '../client-details-dialog/client-details-dialog.component';
import { ConfirmDeleteDialogComponent } from '../confirm-delete-dialog/confirm-delete-dialog.component';

@Component({
  selector: 'app-clients',
  templateUrl: './clients.component.html',
  styleUrls: ['./clients.component.scss']
})
export class ClientsComponent implements OnInit {
  clients: Client[] = [];
  filteredClients: Client[] = [];
  users: User[] = [];
  uniqueStaffMembers: any[] = [];
  loading = true;
  error = '';
  searchTerm = '';
  statusFilter = 'all';
  staffFilter = 'all';
  sortBy = 'newest';
  applyNewClientsFilter: Date | null = null;
  applyUpdatedClientsFilter: Date | null = null;
  updatingClientId: string | null = null;
  viewMode: 'table' | 'card' = 'table';
  
  displayedColumns: string[] = ['serial', 'name', 'business', 'staff', 'status', 'loan_status', 'created', 'comments', 'actions'];
  userDisplayedColumns: string[] = ['serial', 'name', 'business', 'staff', 'status', 'loan_status', 'created', 'comments', 'actions']; // Include 'comments' for regular users (read-only)
  adminDisplayedColumns: string[] = ['serial', 'name', 'business', 'staff', 'status', 'loan_status', 'created', 'comments', 'actions'];

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
      
      return matchesSearch && matchesStatus && matchesStaff;
    });
    
    this.applySorting();
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

  getSerialNumber(index: number): number {
    return index + 1;
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
    const feedback = prompt(`Enter feedback for ${client.legal_name || client.user_name}:`);
    if (feedback !== null) {
      // Set loading state for this specific client
      this.updatingClientId = client._id;
      
      this.clientService.updateClientStatus(client._id, status, feedback).subscribe({
        next: () => {
          client.status = status;
          client.feedback = feedback;
          this.updatingClientId = null; // Clear loading state
          this.snackBar.open('Client status updated successfully', 'Close', {
            duration: 3000
          });
        },
        error: (error) => {
          this.updatingClientId = null; // Clear loading state on error
          this.snackBar.open('Failed to update client status', 'Close', {
            duration: 3000
          });
        }
      });
    }
  }

  deleteClient(client: Client): void {
    const dialogRef = this.dialog.open(ConfirmDeleteDialogComponent, {
      width: '400px',
      data: { name: client.legal_name || client.user_name || 'this client' }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.clientService.deleteClient(client._id).subscribe({
          next: () => {
            this.clients = this.clients.filter(c => c._id !== client._id);
            this.filteredClients = this.filteredClients.filter(c => c._id !== client._id);
            this.snackBar.open('Client deleted successfully', 'Close', {
              duration: 3000
            });
          },
          error: (error) => {
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
    return this.searchTerm !== '' || this.statusFilter !== 'all' || this.staffFilter !== 'all';
  }

  clearAllFilters(): void {
    this.searchTerm = '';
    this.statusFilter = 'all';
    this.staffFilter = 'all';
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
}