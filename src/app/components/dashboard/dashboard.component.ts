import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService, User } from '../../services/auth.service';
import { ClientService, Client } from '../../services/client.service';
import { UserService } from '../../services/user.service';
import { ConfirmDeleteDialogComponent } from '../confirm-delete-dialog/confirm-delete-dialog.component';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  currentUser: User | null = null;
  clients: Client[] = [];
  loading = true;
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
    private router: Router,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
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
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading clients:', error);
        
        // Handle specific error types
        if (error.status === 404) {
          console.warn('Clients endpoint returned 404 - API may be deploying or unavailable');
          this.snackBar.open('Unable to load clients. The server may be updating. Please try again in a few moments.', 'Close', {
            duration: 5000
          });
        } else if (error.status === 0) {
          console.warn('Network error - server may be unreachable');
          this.snackBar.open('Network error. Please check your connection and try again.', 'Close', {
            duration: 5000
          });
        } else {
          this.snackBar.open('Failed to load clients. Please try again later.', 'Close', {
            duration: 3000
          });
        }
        
        // Set empty array to prevent undefined issues
        this.clients = [];
        this.calculateStats();
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
      this.snackBar.open('Admin access required', 'Close', { duration: 3000 });
      return;
    }

    this.authService.debugAllUsers().subscribe({
      next: (response) => {
        console.log('Debug - All users in database:', response);
        this.snackBar.open(`Found ${response.total_count} total users in database. Check console for details.`, 'Close', { duration: 5000 });
      },
      error: (error) => {
        console.error('Error debugging users:', error);
        this.snackBar.open('Error debugging users', 'Close', { duration: 3000 });
      }
    });
  }

  cleanupRejectedUsers(): void {
    if (this.currentUser?.role !== 'admin') {
      this.snackBar.open('Admin access required', 'Close', { duration: 3000 });
      return;
    }

    const confirmCleanup = confirm('Are you sure you want to remove all rejected users from the database? This action cannot be undone.');
    
    if (confirmCleanup) {
      this.authService.cleanupRejectedUsers().subscribe({
        next: (response) => {
          console.log('Cleanup result:', response);
          this.snackBar.open(`Successfully removed ${response.deleted_count} rejected users`, 'Close', { duration: 5000 });
          
          // Reload stats to reflect changes
          this.loadUserStats();
        },
        error: (error) => {
          console.error('Error cleaning up rejected users:', error);
          this.snackBar.open('Error cleaning up rejected users', 'Close', { duration: 3000 });
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
      this.snackBar.open('No mobile number available for this client', 'Close', {
        duration: 3000
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
            this.calculateStats();
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
}
