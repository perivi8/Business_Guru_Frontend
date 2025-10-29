import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { ClientService, Client } from '../../services/client.service';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  currentUser: User | null = null;
  clients: Client[] = [];
  paginatedClients: Client[] = []; // Paginated data for display
  loading = true;
  
  // Pagination properties
  currentPage = 1;
  pageSize = 10;
  totalPages = 0;
  
  stats = {
    totalClients: 0,
    todayNewClients: 0,
    pendingClients: 0,
    interestedClients: 0,
    notInterestedClients: 0,
    onHoldClients: 0,
    processingClients: 0,
    totalTeam: 0
  };

  constructor(
    private authService: AuthService,
    private clientService: ClientService,
    private userService: UserService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.currentUser = this.authService.currentUserValue;
    this.loadClients();
    this.loadUserStats();
    
    // Subscribe to client updates
    this.clientService.clientUpdated$.subscribe(clientId => {
      if (clientId) {
        console.log('Client updated notification received in dashboard for ID:', clientId);
        this.refreshClientData(clientId);
      }
    });
  }

  loadClients(): void {
    // Use getMyClients instead of getClients to show only clients created by current user
    this.clientService.getMyClients().subscribe({
      next: (response) => {
        this.clients = response.clients || [];
        this.calculateStats();
        this.updatePagination();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading clients:', error);
        
        // Handle specific error types
        if (error.status === 404) {
          console.warn('Clients endpoint returned 404 - API may be deploying or unavailable');
          alert('Unable to load clients. The server may be updating. Please try again in a few moments.');
        } else if (error.status === 0) {
          console.warn('Network error - server may be unreachable');
          alert('Network error. Please check your connection and try again.');
        } else {
          alert('Failed to load clients. Please try again later.');
        }
        
        // Set empty array to prevent undefined issues
        this.clients = [];
        this.calculateStats();
        this.updatePagination();
        this.loading = false;
      }
    });
  }

  calculateStats(): void {
    this.stats.totalClients = this.clients.length;
    this.stats.todayNewClients = this.getTodayNewClientsCount();
    this.stats.pendingClients = this.clients.filter(c => c.status === 'pending').length;
    this.stats.interestedClients = this.clients.filter(c => c.status === 'interested').length;
    this.stats.notInterestedClients = this.clients.filter(c => c.status === 'not_interested').length;
    this.stats.onHoldClients = this.clients.filter(c => c.status === 'hold').length;
    this.stats.processingClients = this.clients.filter(c => c.status === 'processing').length;
  }

  getTodayNewClientsCount(): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.clients.filter(client => {
      if (!client.created_at) return false;
      const clientDate = new Date(client.created_at);
      clientDate.setHours(0, 0, 0, 0);
      return clientDate.getTime() === today.getTime();
    }).length;
  }

  loadUserStats(): void {
    this.userService.getUsers().subscribe({
      next: (response) => {
        console.log('All users from API:', response.users); // Debug log
        
        // Filter users with TMIS email domain AND only approved/active users
        const tmisUsers = response.users.filter(user => {
          const hasValidEmail = user.email && user.email.toLowerCase().includes('tmis');
          const isApproved = !user.status || user.status === 'active'; // No status (legacy) or active status
          
          console.log(`User ${user.username}: email=${user.email}, status=${user.status}, approved=${isApproved}`);
          
          return hasValidEmail && isApproved;
        });
        
        console.log('Filtered approved TMIS users:', tmisUsers);
        this.stats.totalTeam = tmisUsers.length;
      },
      error: (error) => {
        console.error('Error loading user stats:', error);
        this.stats.totalTeam = 1; // Fallback to 1
      }
    });
  }

  // Admin utility methods
  debugAllUsers(): void {
    if (this.currentUser?.role !== 'admin') {
      alert('Admin access required');
      return;
    }

    this.authService.debugAllUsers().subscribe({
      next: (response) => {
        console.log('Debug - All users in database:', response);
        alert(`Found ${response.total_count} total users in database. Check console for details.`);
      },
      error: (error) => {
        console.error('Error debugging users:', error);
        alert('Error debugging users');
      }
    });
  }

  cleanupRejectedUsers(): void {
    if (this.currentUser?.role !== 'admin') {
      alert('Admin access required');
      return;
    }

    const confirmCleanup = confirm('Are you sure you want to remove all rejected users from the database? This action cannot be undone.');
    
    if (confirmCleanup) {
      this.authService.cleanupRejectedUsers().subscribe({
        next: (response) => {
          console.log('Cleanup result:', response);
          alert(`Successfully removed ${response.deleted_count} rejected users`);
          
          // Reload stats to reflect changes
          this.loadUserStats();
        },
        error: (error) => {
          console.error('Error cleaning up rejected users:', error);
          alert('Error cleaning up rejected users');
        }
      });
    }
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'interested': return '#4caf50';
      case 'not_interested': return '#f44336';
      case 'hold': return '#ff9800';
      case 'pending': return '#9c27b0';
      case 'processing': return '#2196f3';
      default: return '#666';
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

  getLoanStatus(client: Client): string {
    return (client as any)?.loan_status || 'soon';
  }

  viewClientDetails(client: Client): void {
    this.router.navigate(['/clients', client._id]);
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
      alert('No mobile number available for this client');
    }
  }

  deleteClient(client: Client): void {
    const clientName = client.legal_name || client.user_name || 'this client';
    const confirmed = confirm(`Are you sure you want to delete ${clientName}? This action cannot be undone.`);

    if (confirmed) {
      this.clientService.deleteClient(client._id).subscribe({
        next: () => {
          this.clients = this.clients.filter(c => c._id !== client._id);
          this.calculateStats();
          this.updatePagination();
          alert('Client deleted successfully');
        },
        error: (error) => {
          alert('Failed to delete client');
        }
      });
    }
  }

  refreshClientData(clientId: string): void {
    // Refresh specific client data by fetching updated details
    this.clientService.getClientDetails(clientId).subscribe({
      next: (response) => {
        if (response && response.client) {
          // Find and update the client in the current array
          const clientIndex = this.clients.findIndex(c => c._id === clientId);
          if (clientIndex !== -1) {
            this.clients[clientIndex] = response.client;
            // Recalculate stats since loan status might have changed
            this.calculateStats();
            this.updatePagination();
          }
          
          console.log('Client data refreshed in dashboard for ID:', clientId);
        }
      },
      error: (error) => {
        console.error('Failed to refresh client data in dashboard:', error);
        // Fallback: reload all clients
        this.loadClients();
      }
    });
  }

  updatePagination(): void {
    // Calculate total pages
    this.totalPages = Math.ceil(this.clients.length / this.pageSize);
    
    // Reset to page 1 if current page exceeds total pages
    if (this.currentPage > this.totalPages && this.totalPages > 0) {
      this.currentPage = 1;
    }
    
    // Get paginated data
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedClients = this.clients.slice(startIndex, endIndex);
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
    return Math.min(this.currentPage * this.pageSize, this.clients.length);
  }
}
