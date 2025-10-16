import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { ClientService, Client } from '../../services/client.service';
import { NotificationService, Notification } from '../../services/notification.service';

@Component({
  selector: 'app-notifications',
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.scss']
})
export class NotificationsComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  notifications: Notification[] = [];
  clients: Client[] = [];
  lastVisit: Date | null = null;
  isLoadingNotifications = false;
  pendingUsers: any[] = [];
  isLoadingPendingUsers = false;
  private notificationSubscription: Subscription | null = null;
  private clientSubscription: Subscription | null = null;
  private pendingUsersSubscription: Subscription | null = null;

  constructor(
    private router: Router,
    private authService: AuthService,
    private clientService: ClientService,
    private notificationService: NotificationService,
    private snackBar: MatSnackBar
  ) { }

  ngOnInit(): void {
    this.authService.currentUser.subscribe(user => {
      this.currentUser = user;
      if (user) {
        this.initializeLastVisit();
        this.loadClients();
        this.loadNotifications();
        if (this.isAdmin()) {
          this.loadPendingUsers();
        }
      }
    });
  }

  ngOnDestroy(): void {
    if (this.notificationSubscription) {
      this.notificationSubscription.unsubscribe();
    }
    if (this.clientSubscription) {
      this.clientSubscription.unsubscribe();
    }
    if (this.pendingUsersSubscription) {
      this.pendingUsersSubscription.unsubscribe();
    }
  }

  loadNotifications(): void {
    this.isLoadingNotifications = true;
    this.notificationSubscription = this.notificationService.getNotifications().subscribe(
      notifications => {
        console.log('=== NOTIFICATIONS DEBUG ===');
        console.log('Service notifications:', notifications);
        console.log('Last visit:', this.lastVisit);
        console.log('New clients:', this.getNewClients());
        console.log('Updated clients:', this.getUpdatedClients());
        console.log('Admin status changes:', this.getAdminStatusChanges());
        console.log('Total notification count:', this.getTotalNotificationCount());
        
        this.notifications = notifications;
        this.isLoadingNotifications = false;
      },
      error => {
        console.error('Error loading notifications', error);
        this.isLoadingNotifications = false;
      }
    );
  }

  loadClients(): void {
    this.clientService.getClients().subscribe({
      next: (response) => {
        console.log('=== CLIENTS DATA DEBUG ===');
        console.log('Raw clients response:', response);
        console.log('Clients array:', response.clients);
        response.clients.forEach((client, index) => {
          console.log(`Client ${index}:`, {
            name: client.legal_name || client.user_name,
            created_at: client.created_at,
            updated_at: client.updated_at,
            updated_by_name: client.updated_by_name,
            status: client.status
          });
        });
        
        this.clients = response.clients;
        
        // Reload notifications after clients are loaded
        setTimeout(() => {
          this.loadNotifications();
        }, 100);
      },
      error: (error) => {
        console.error('Error loading clients:', error);
      }
    });
  }

  initializeLastVisit(): void {
    const userRole = this.isAdmin() ? 'admin' : 'user';
    const lastVisitKey = `lastVisit_${userRole}_${this.currentUser?.id || 'default'}`;
    const lastVisit = localStorage.getItem(lastVisitKey);
    
    if (lastVisit) {
      this.lastVisit = new Date(lastVisit);
    } else {
      // Set to 7 days ago to show more notifications for first time users
      this.lastVisit = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      localStorage.setItem(lastVisitKey, this.lastVisit.toISOString());
    }
    
    console.log('Last visit initialized:', this.lastVisit);
  }

  isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  getNewClients(): Client[] {
    if (!this.clients || this.clients.length === 0) {
      return [];
    }

    // Check for client notifications clear timestamp
    const userRole = this.isAdmin() ? 'admin' : 'user';
    const userId = this.currentUser?.id || 'default';
    const clientNotificationsKey = `lastClientNotificationsClear_${userRole}_${userId}`;
    const lastClearTime = localStorage.getItem(clientNotificationsKey);
    
    // Use the more recent timestamp between lastVisit and lastClearTime
    let filterTime: Date = this.lastVisit || new Date(0);
    if (lastClearTime) {
      const clearTime = new Date(lastClearTime);
      if (this.lastVisit && clearTime > this.lastVisit) {
        filterTime = clearTime;
      }
    }
    
    return this.clients.filter(client => {
      if (!client.created_at) return false;
      const createdAt = new Date(client.created_at);
      return createdAt > filterTime;
    }).sort((a, b) => {
      const dateA = new Date(a.created_at!).getTime();
      const dateB = new Date(b.created_at!).getTime();
      return dateB - dateA; // Newest first
    });
  }

  getUpdatedClients(): Client[] {
    if (!this.clients || this.clients.length === 0) {
      return [];
    }

    // Check for client notifications clear timestamp
    const userRole = this.isAdmin() ? 'admin' : 'user';
    const userId = this.currentUser?.id || 'default';
    const clientNotificationsKey = `lastClientNotificationsClear_${userRole}_${userId}`;
    const lastClearTime = localStorage.getItem(clientNotificationsKey);
    
    // Use the more recent timestamp between lastVisit and lastClearTime
    let filterTime: Date = this.lastVisit || new Date(0);
    if (lastClearTime) {
      const clearTime = new Date(lastClearTime);
      if (this.lastVisit && clearTime > this.lastVisit) {
        filterTime = clearTime;
      }
    }

    return this.clients.filter(client => {
      if (!client.updated_at) return false;
      
      const updatedAt = new Date(client.updated_at);
      const createdAt = client.created_at ? new Date(client.created_at) : null;
      
      // Skip if this is a new client (created and updated at same time)
      if (createdAt && Math.abs(updatedAt.getTime() - createdAt.getTime()) < 60000) {
        return false;
      }
      
      // Skip if this is an admin action (updated by someone other than current user)
      // Admin actions should only appear in Admin Actions section
      if (client.updated_by_name && client.updated_by_name !== this.currentUser?.username) {
        return false;
      }
      
      // For admin users, show their own updates in Client Updates section
      // (removed the filter that was hiding admin's own updates)
      
      // Filter by clear timestamp
      return updatedAt > filterTime;
    }).sort((a, b) => {
      const dateA = new Date(a.updated_at!).getTime();
      const dateB = new Date(b.updated_at!).getTime();
      return dateB - dateA; // Newest first
    });
  }

  getAdminStatusChanges(): Client[] {
    // If current user is admin, don't show Admin Actions section at all
    if (this.isAdmin()) {
      return [];
    }

    if (!this.clients || this.clients.length === 0) {
      return [];
    }

    // Check for client notifications clear timestamp
    const userRole = this.isAdmin() ? 'admin' : 'user';
    const userId = this.currentUser?.id || 'default';
    const clientNotificationsKey = `lastClientNotificationsClear_${userRole}_${userId}`;
    const lastClearTime = localStorage.getItem(clientNotificationsKey);
    
    // Use the more recent timestamp between lastVisit and lastClearTime
    let filterTime: Date = this.lastVisit || new Date(0);
    if (lastClearTime) {
      const clearTime = new Date(lastClearTime);
      if (this.lastVisit && clearTime > this.lastVisit) {
        filterTime = clearTime;
      }
    }

    console.log('=== ADMIN ACTIONS DEBUG ===');
    console.log('Current user:', this.currentUser);
    console.log('Filter time:', filterTime);
    
    const adminActions = this.clients.filter(client => {
      console.log(`Checking client: ${client.legal_name || client.user_name}`);
      console.log(`  - updated_at: ${client.updated_at}`);
      console.log(`  - updated_by_name: ${client.updated_by_name}`);
      console.log(`  - current username: ${this.currentUser?.username}`);
      console.log(`  - status: ${client.status}`);
      
      if (!client.updated_at || !client.updated_by_name || !client.status) {
        console.log(`  - FILTERED OUT: Missing required fields`);
        return false;
      }
      
      const updatedAt = new Date(client.updated_at);
      
      // Filter by clear timestamp first
      if (updatedAt <= filterTime) {
        console.log(`  - FILTERED OUT: Updated before clear time`);
        return false;
      }
      
      // Show all updates made by someone other than the current user (admin actions)
      const isAdminAction = client.updated_by_name !== this.currentUser?.username;
      console.log(`  - Is admin action: ${isAdminAction}`);
      
      return isAdminAction;
    }).sort((a, b) => {
      const dateA = new Date(a.updated_at!).getTime();
      const dateB = new Date(b.updated_at!).getTime();
      return dateB - dateA; // Newest first
    });
    
    console.log('Final admin actions count:', adminActions.length);
    return adminActions;
  }

  getTimeAgo(dateString: string | undefined): string {
    if (!dateString) return 'Unknown time';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString();
  }

  formatTimeAgo(date: Date): string {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - new Date(date).getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  }

  getNotificationIcon(type: string): string {
    switch (type) {
      case 'new_client':
        return 'person_add';
      case 'update':
        return 'update';
      case 'system':
        return 'notifications';
      default:
        return 'notifications_none';
    }
  }

  onNotificationClick(notification: Notification): void {
    this.markAsRead(notification);
    if (notification.data?.clientId) {
      this.router.navigate(['/clients', notification.data.clientId]);
    }
  }

  onClientClick(client: Client): void {
    if ((client as any).id) {
      this.router.navigate(['/clients', (client as any).id]);
    }
  }

  markAsRead(notification: Notification): void {
    if (!notification.read) {
      this.notificationService.markAsRead(notification.id);
    }
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead();
    this.snackBar.open('All notifications marked as read', 'Close', {
      duration: 2000,
      horizontalPosition: 'right',
      verticalPosition: 'top'
    });
  }

  clearAllNotifications(): void {
    const now = new Date().toISOString();
    const userRole = this.isAdmin() ? 'admin' : 'user';
    const userId = this.currentUser?.id || 'default';
    const lastVisitKey = `lastVisit_${userRole}_${userId}`;
    
    // Update lastVisit timestamp for current user to clear ALL notification types
    localStorage.setItem(lastVisitKey, now);
    this.lastVisit = new Date(now);
    
    // Also store a separate timestamp for client-related notifications
    const clientNotificationsKey = `lastClientNotificationsClear_${userRole}_${userId}`;
    localStorage.setItem(clientNotificationsKey, now);
    
    // Clear system notifications from service
    this.notificationService.clearAllForUser(userId, userRole);
    
    // Reload notifications to reflect the filtering
    this.loadNotifications();
    
    this.snackBar.open('All notifications cleared', 'Close', {
      duration: 2000,
      horizontalPosition: 'right',
      verticalPosition: 'top'
    });
  }

  clearNotification(notification: Notification): void {
    // Permanently remove individual notification from service
    this.notificationService.clearNotification(notification.id);
    
    // Remove from local array as well
    this.notifications = this.notifications.filter(n => n.id !== notification.id);
    
    this.snackBar.open('Notification cleared', 'Close', {
      duration: 1500,
      horizontalPosition: 'right',
      verticalPosition: 'top'
    });
  }

  getTotalNotificationCount(): number {
    const newClients = this.getNewClients().length;
    const updatedClients = this.getUpdatedClients().length;
    const adminChanges = this.getAdminStatusChanges().length; // Show for both admin and users
    
    return newClients + updatedClients + adminChanges;
  }

  goBack(): void {
    if (this.isAdmin()) {
      this.router.navigate(['/admin-dashboard']);
    } else {
      this.router.navigate(['/dashboard']);
    }
  }

  // Getter methods for template bindings
  get unreadNotificationsCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  get newClientsCount(): number {
    return this.getNewClients().length;
  }

  get updatedClientsCount(): number {
    return this.getUpdatedClients().length;
  }

  get adminStatusChangesCount(): number {
    const count = this.getAdminStatusChanges().length;
    console.log('Admin status changes count:', count);
    return count;
  }

  get newClientsList(): Client[] {
    return this.getNewClients();
  }

  get updatedClientsList(): Client[] {
    return this.getUpdatedClients();
  }

  get adminStatusChangesList(): Client[] {
    return this.getAdminStatusChanges();
  }

  // Pending users methods
  loadPendingUsers(): void {
    if (!this.isAdmin()) {
      return;
    }

    this.isLoadingPendingUsers = true;
    this.pendingUsersSubscription = this.authService.getPendingUsers().subscribe({
      next: (response) => {
        this.pendingUsers = response.pending_users || [];
        this.isLoadingPendingUsers = false;
        console.log('Pending users loaded:', this.pendingUsers.length);
      },
      error: (error) => {
        console.error('Error loading pending users:', error);
        this.isLoadingPendingUsers = false;
        this.pendingUsers = [];
      }
    });
  }

  approveUser(user: any): void {
    if (!this.isAdmin()) {
      return;
    }

    this.authService.approveUser(user._id).subscribe({
      next: (response) => {
        this.snackBar.open(`User ${user.username} approved successfully`, 'Close', {
          duration: 3000,
          horizontalPosition: 'right',
          verticalPosition: 'top'
        });
        // Remove from pending list
        this.pendingUsers = this.pendingUsers.filter(u => u._id !== user._id);
      },
      error: (error) => {
        console.error('Error approving user:', error);
        this.snackBar.open('Failed to approve user', 'Close', {
          duration: 3000,
          horizontalPosition: 'right',
          verticalPosition: 'top'
        });
      }
    });
  }

  rejectUser(user: any): void {
    if (!this.isAdmin()) {
      return;
    }

    const reason = prompt('Please provide a reason for rejection (optional):') || 'No reason provided';
    
    this.authService.rejectUser(user._id, reason).subscribe({
      next: (response) => {
        this.snackBar.open(`User ${user.username} rejected`, 'Close', {
          duration: 3000,
          horizontalPosition: 'right',
          verticalPosition: 'top'
        });
        // Remove from pending list
        this.pendingUsers = this.pendingUsers.filter(u => u._id !== user._id);
      },
      error: (error) => {
        console.error('Error rejecting user:', error);
        this.snackBar.open('Failed to reject user', 'Close', {
          duration: 3000,
          horizontalPosition: 'right',
          verticalPosition: 'top'
        });
      }
    });
  }

  get pendingUsersCount(): number {
    return this.pendingUsers.length;
  }
}
