import { Component, OnInit, OnDestroy, ViewChild, ElementRef, HostListener } from '@angular/core';
import { interval, Subscription } from 'rxjs';
import { Router, NavigationEnd } from '@angular/router';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Location } from '@angular/common';
import { AuthService, User } from '../../services/auth.service';
import { ClientService, Client } from '../../services/client.service';
import { NotificationService, Notification } from '../../services/notification.service';


@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
  animations: [
    trigger('slideInOut', [
      transition(':enter', [
        style({ height: '0', opacity: 0, overflow: 'hidden' }),
        animate('300ms ease-out', style({ height: '*', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ height: '0', opacity: 0, overflow: 'hidden' }))
      ])
    ])
  ]
})
export class NavbarComponent implements OnInit, OnDestroy {
  @ViewChild('notificationPanel') notificationPanel!: ElementRef;
  
  currentUser: User | null = null;
  showNotifications = false;
  notifications: Notification[] = [];
  clients: Client[] = [];
  pendingRegistrations: any[] = [];
  pendingUsers: any[] = [];
  lastVisit: Date | null = null;
  private notificationSubscription: Subscription | null = null;
  private clientSubscription: Subscription | null = null;
  private unreadCountSubscription: Subscription | null = null;
  private registrationSubscription: Subscription | null = null;
  hasUnreadNotifications = false;
  lastNotificationCount = 0;
  isLoadingNotifications = false;
  unreadNotificationCount = 0;
  showBackButton = false;
  currentRoute = '';
  isMobileMenuOpen = false;

  // Routes that should show back button
  private backButtonRoutes = [
    '/clients',
    '/contact-us', 
    '/enquiry',
    '/new-client',
    '/team',
    '/client-detail',
    '/edit-client',
    '/notifications'
  ];

  constructor(
    public router: Router,
    private location: Location,
    private authService: AuthService,
    private clientService: ClientService,
    private notificationService: NotificationService,
    private snackBar: MatSnackBar,

  ) { }

  ngOnInit(): void {
    console.log('=== NAVBAR INIT DEBUG ===');
    console.log('Initial token check:', localStorage.getItem('token'));
    console.log('Initial user check:', localStorage.getItem('currentUser'));
    
    this.authService.currentUser.subscribe(user => {
      this.currentUser = user;
      console.log('Auth service user subscription:', user);
      console.log('Is admin check:', this.authService.isAdmin());
      
      if (user && this.authService.isAdmin()) {
        console.log('Admin user detected, loading clients and pending registrations...');
        this.loadClients();
        this.loadPendingRegistrations();
        this.loadPendingUsers();
        this.setupAutoRefresh();
      } else {
        console.log('Not admin or no user, skipping client load');
      }
    });
    
    // Subscribe to router events to show/hide back button
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.currentRoute = event.url;
        this.updateBackButtonVisibility();
      }
    });
    
    // Initial check for back button
    this.currentRoute = this.router.url;
    this.updateBackButtonVisibility();
    
    this.loadNotifications();
    this.initializeLastVisit();
    this.subscribeToUnreadCount();
    
    // Clear error notifications on component load
    setTimeout(() => {
      this.clearErrorNotifications();
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.notificationSubscription) {
      this.notificationSubscription.unsubscribe();
    }
    if (this.clientSubscription) {
      this.clientSubscription.unsubscribe();
    }
    if (this.unreadCountSubscription) {
      this.unreadCountSubscription.unsubscribe();
    }
    if (this.registrationSubscription) {
      this.registrationSubscription.unsubscribe();
    }
  }

  loadNotifications(): void {
    this.isLoadingNotifications = true;
    this.notificationSubscription = this.notificationService.getNotifications().subscribe(
      notifications => {
        this.notifications = notifications;
        this.hasUnreadNotifications = this.notifications.some(n => !n.read);
        this.isLoadingNotifications = false;
      },
      error => {
        console.error('Error loading notifications', error);
        this.isLoadingNotifications = false;
      }
    );
  }

  subscribeToUnreadCount(): void {
    this.unreadCountSubscription = this.notificationService.getUnreadCountObservable().subscribe(
      count => {
        this.unreadNotificationCount = count;
      }
    );
  }

  markAsRead(notification: Notification): void {
    if (!notification.read) {
      this.notificationService.markAsRead(notification.id);
    }
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead();
  }

  removeNotification(notification: Notification): void {
    // Remove individual notification
    this.notificationService.clearNotification(notification.id);
    
    // Show confirmation
    this.snackBar.open('Notification removed', 'Close', {
      duration: 2000,
      horizontalPosition: 'right',
      verticalPosition: 'top'
    });
    
    // Reload notifications to update the display
    this.loadNotifications();
  }

  clearAllNotifications(): void {
    const now = new Date().toISOString();
    const userRole = this.isAdmin() ? 'admin' : 'user';
    const userId = this.currentUser?.id || 'default';
    
    if (this.isAdmin()) {
      // For admin: Clear pending user approvals (no action needed as they handle individually)
      this.snackBar.open('Pending user approvals cannot be cleared - handle them individually', 'Close', {
        duration: 3000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
    } else {
      // For non-admin: Clear all notifications as before
      const lastVisitKey = `lastVisit_${userRole}_${userId}`;
      
      // Update lastVisit timestamp to clear client-based notifications
      localStorage.setItem(lastVisitKey, now);
      this.lastVisit = new Date(now);
      
      // Also store a separate timestamp for client-related notifications
      const clientNotificationsKey = `lastClientNotificationsClear_${userRole}_${userId}`;
      localStorage.setItem(clientNotificationsKey, now);
      
      // Clear system notifications from service
      this.notificationService.clearAll();
      
      // Reload clients to refresh the counts
      this.loadClients();
      
      this.snackBar.open('All notifications cleared', 'Close', {
        duration: 2000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
    }
    
    this.closeNotifications();
  }

  getNotificationCount(): number {
    // If dropdown is open, always return 0 (hide badge)
    if (this.showNotifications) {
      return 0;
    }
    
    // For admin users: only count pending user approvals
    if (this.isAdmin()) {
      const pendingUsersCount = this.pendingUsers.length;
      
      console.log('Admin notification count breakdown:', {
        pendingUsers: pendingUsersCount,
        total: pendingUsersCount
      });
      
      return pendingUsersCount;
    }
    
    // For non-admin users: keep all existing notification types
    // Ensure clients array is initialized
    if (!this.clients) {
      this.clients = [];
    }
    
    // Get client-based notification counts
    const newClientsCount = this.getNewClients().length;
    const updatedClientsCount = this.getUpdatedClients().length;
    const adminChangesCount = this.getAdminStatusChanges().length;
    
    // Get client status notifications count for staff members
    const clientStatusNotificationsCount = this.getClientStatusNotifications().length;
    
    // Total count includes system notifications + client notifications + status notifications
    const totalCount = this.unreadNotificationCount + newClientsCount + updatedClientsCount + adminChangesCount + clientStatusNotificationsCount;
    
    console.log('Non-admin notification count breakdown:', {
      unreadSystemNotifications: this.unreadNotificationCount,
      newClients: newClientsCount,
      updatedClients: updatedClientsCount,
      adminChanges: adminChangesCount,
      clientStatusNotifications: clientStatusNotificationsCount,
      total: totalCount,
      clientsLoaded: this.clients.length
    });
    
    return totalCount;
  }

  getNotificationIcon(type: string): string {
    switch (type) {
      case 'new_client':
        return 'person_add';
      case 'update':
      case 'client_updated':
        return 'edit';
      case 'system':
        return 'notifications';
      case 'status_changed':
        return 'swap_horiz';
      case 'approval_request':
        return 'approval';
      case 'user_registration':
        return 'person_add_alt';
      case 'loan_application':
        return 'account_balance';
      case 'document_upload':
        return 'upload_file';
      case 'payment_received':
        return 'payment';
      case 'meeting_scheduled':
        return 'event';
      default:
        return 'notifications_none';
    }
  }

  getNotificationClass(type: string): string {
    switch (type) {
      case 'new_client':
        return 'new-client';
      case 'update':
      case 'client_updated':
        return 'update';
      case 'system':
        return 'system';
      case 'status_changed':
        return 'status-change';
      case 'approval_request':
        return 'approval-request';
      case 'user_registration':
        return 'user-registration';
      case 'loan_application':
        return 'loan-application';
      case 'document_upload':
        return 'document-upload';
      case 'payment_received':
        return 'payment-received';
      case 'meeting_scheduled':
        return 'meeting-scheduled';
      default:
        return '';
    }
  }

  formatTimeAgo(date: Date): string {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - new Date(date).getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  }

  onNotificationClick(notification: Notification): void {
    this.markAsRead(notification);
    if (notification.data?.clientId) {
      this.router.navigate(['/clients', notification.data.clientId]);
    }
    this.toggleNotifications();
  }

  private setupAutoRefresh(): void {
    // Initial load
    this.loadClients();
    
    // Set up auto-refresh every 30 seconds
    this.notificationSubscription = interval(30000).subscribe(() => {
      const previousCount = this.getNotificationCount();
      this.loadClients(() => {
        const newCount = this.getNotificationCount();
        if (newCount > previousCount) {
          this.hasUnreadNotifications = true;
          this.lastNotificationCount = newCount - previousCount;
        }
      });
      // Also refresh pending registrations and users for admin
      if (this.isAdmin()) {
        this.loadPendingRegistrations();
        this.loadPendingUsers();
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
      // Set to 24 hours ago for first time users
      this.lastVisit = new Date(Date.now() - 24 * 60 * 60 * 1000);
      localStorage.setItem(lastVisitKey, this.lastVisit.toISOString());
    }
  }

  loadClients(callback?: () => void, retryCount: number = 0): void {
    console.log('=== NAVBAR LOAD CLIENTS DEBUG ===');
    console.log('Token in localStorage:', localStorage.getItem('token'));
    console.log('User in localStorage:', localStorage.getItem('currentUser'));
    console.log('Is authenticated:', this.authService.isAuthenticated());
    console.log('Is admin:', this.authService.isAdmin());
    console.log('Current user value:', this.authService.currentUserValue);
    console.log('Load attempt:', retryCount + 1);
    
    this.clientService.getClients().subscribe({
      next: (response) => {
        this.clients = response.clients || [];
        console.log('Navbar - Clients loaded successfully:', this.clients.length);
        if (callback) callback();
      },
      error: (error) => {
        console.error('Error loading clients in navbar:', error);
        
        // Retry logic for network errors and 404s (server might be deploying)
        if ((error.status === 0 || error.status === 404 || error.status >= 500) && retryCount < 2) {
          console.log(`Navbar - Retrying client load in ${(retryCount + 1) * 2} seconds... (Attempt ${retryCount + 2}/3)`);
          
          setTimeout(() => {
            this.loadClients(callback, retryCount + 1);
          }, (retryCount + 1) * 2000); // 2s, 4s delays
          return;
        }
        
        // Set empty array on error to prevent undefined issues
        this.clients = [];
        if (callback) callback();
      }
    });
  }

  isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  hasNewUpdates(): boolean {
    if (this.isAdmin()) {
      return this.getNewClients().length > 0 || this.getUpdatedClients().length > 0;
    } else {
      return this.getNewClients().length > 0 || this.getUpdatedClients().length > 0 || this.getAdminStatusChanges().length > 0;
    }
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
      
      // Check if this specific client notification was hidden
      const clientId = (client as any)._id || (client as any).id;
      const notificationKey = `hiddenClient_new_${clientId}_${userRole}_${userId}`;
      const hiddenTime = localStorage.getItem(notificationKey);
      if (hiddenTime) {
        return false; // Hide this specific notification
      }
      
      const createdAt = new Date(client.created_at);
      return createdAt > filterTime;
    }).sort((a, b) => {
      const dateA = new Date(a.created_at!).getTime();
      const dateB = new Date(b.created_at!).getTime();
      return dateB - dateA; // Newest first
    }).slice(0, 10);
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
      
      // Check if this specific client notification was hidden
      const clientId = (client as any)._id || (client as any).id;
      const notificationKey = `hiddenClient_updated_${clientId}_${userRole}_${userId}`;
      const hiddenTime = localStorage.getItem(notificationKey);
      if (hiddenTime) {
        return false; // Hide this specific notification
      }
      
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
      
      // Filter by clear timestamp
      return updatedAt > filterTime;
    }).sort((a, b) => {
      const dateA = new Date(a.updated_at!).getTime();
      const dateB = new Date(b.updated_at!).getTime();
      return dateB - dateA; // Newest first
    }).slice(0, 10);
  }

  // Get admin status changes for regular users
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

    return this.clients.filter(client => {
      if (!client.updated_at || !client.updated_by_name || !client.status) {
        return false;
      }
      
      // Check if this specific client notification was hidden
      const clientId = (client as any)._id || (client as any).id;
      const notificationKey = `hiddenClient_admin_${clientId}_${userRole}_${userId}`;
      const hiddenTime = localStorage.getItem(notificationKey);
      if (hiddenTime) {
        return false; // Hide this specific notification
      }
      
      const updatedAt = new Date(client.updated_at);
      
      // Filter by clear timestamp first
      if (updatedAt <= filterTime) {
        return false;
      }
      
      // Show all updates made by someone other than the current user (admin actions)
      const isAdminAction = client.updated_by_name !== this.currentUser?.username;
      
      return isAdminAction;
    }).sort((a, b) => {
      const dateA = new Date(a.updated_at!).getTime();
      const dateB = new Date(b.updated_at!).getTime();
      return dateB - dateA; // Newest first
    }).slice(0, 5);
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

  toggleNotifications(): void {
    const wasOpen = this.showNotifications;
    this.showNotifications = !this.showNotifications;
    
    if (this.showNotifications) {
      // Opening dropdown - reset counts and mark as read
      this.loadNotifications();
      this.resetNotificationCounts();
      this.markAllAsRead();
    } else {
      // Closing dropdown - start fresh counting from this point
      this.startFreshCounting();
    }
  }

  // Start fresh counting when dropdown is closed
  startFreshCounting(): void {
    const now = new Date().toISOString();
    const userRole = this.isAdmin() ? 'admin' : 'user';
    const userId = this.currentUser?.id || 'default';
    
    // Update last visit timestamp to current time (this becomes the new baseline)
    const lastVisitKey = `lastVisit_${userRole}_${userId}`;
    localStorage.setItem(lastVisitKey, now);
    this.lastVisit = new Date(now);
    
    // Update client notifications clear timestamp
    const clientNotificationsKey = `lastClientNotificationsClear_${userRole}_${userId}`;
    localStorage.setItem(clientNotificationsKey, now);
    
    // Reset counters to start fresh
    this.unreadNotificationCount = 0;
    this.hasUnreadNotifications = false;
  }

  // Reset all notification counts and timestamps
  resetNotificationCounts(): void {
    const now = new Date().toISOString();
    const userRole = this.isAdmin() ? 'admin' : 'user';
    const userId = this.currentUser?.id || 'default';
    
    // Update last visit timestamp to current time
    const lastVisitKey = `lastVisit_${userRole}_${userId}`;
    localStorage.setItem(lastVisitKey, now);
    this.lastVisit = new Date(now);
    
    // Update client notifications clear timestamp
    const clientNotificationsKey = `lastClientNotificationsClear_${userRole}_${userId}`;
    localStorage.setItem(clientNotificationsKey, now);
    
    // Reset unread notification count
    this.unreadNotificationCount = 0;
    this.hasUnreadNotifications = false;
  }

  // Remove individual client notification
  removeClientNotification(client: any, type: 'new' | 'updated' | 'admin', event: Event): void {
    event.stopPropagation();
    
    const now = new Date().toISOString();
    const userRole = this.isAdmin() ? 'admin' : 'user';
    const userId = this.currentUser?.id || 'default';
    
    // Create a unique key for this specific client notification
    const clientId = client._id || client.id;
    const notificationKey = `hiddenClient_${type}_${clientId}_${userRole}_${userId}`;
    localStorage.setItem(notificationKey, now);
    
    // Reload clients to refresh the notification lists
    this.loadClients();
  }

  private updateLastVisit(): void {
    const now = new Date().toISOString();
    const userRole = this.isAdmin() ? 'admin' : 'user';
    const lastVisitKey = `lastVisit_${userRole}_${this.currentUser?.id || 'default'}`;
    localStorage.setItem(lastVisitKey, now);
    this.lastVisit = new Date(now);
  }

  closeNotifications(): void {
    this.showNotifications = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    const notificationWrapper = target.closest('.notifications-wrapper');
    const mobileMenuButton = target.closest('.mobile-menu-button');
    const mobileMenu = target.closest('.mobile-menu');
    
    // Close dropdown if clicking outside of it
    if (!notificationWrapper && this.showNotifications) {
      this.showNotifications = false;
    }
    
    // Close mobile menu if clicking outside of it
    if (!mobileMenuButton && !mobileMenu && this.isMobileMenuOpen) {
      this.isMobileMenuOpen = false;
    }
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen = false;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  // Back button functionality
  updateBackButtonVisibility(): void {
    // Check if current route should show back button
    this.showBackButton = this.backButtonRoutes.some(route => 
      this.currentRoute.startsWith(route)
    );
  }

  goBack(): void {
    this.location.back();
  }

  // Navigate to admin dashboard and scroll to Client Status Report section
  navigateToStatusReport(): void {
    this.router.navigate(['/admin-dashboard']).then(() => {
      // Wait for navigation to complete, then scroll to the section
      setTimeout(() => {
        const element = document.getElementById('client-status-report');
        if (element) {
          // Get the navbar height (70px) and add some padding
          const navbarHeight = 70;
          const additionalOffset = 20; // Extra space for better visibility
          const elementPosition = element.offsetTop - navbarHeight - additionalOffset;
          
          // Smooth scroll to the calculated position
          window.scrollTo({
            top: elementPosition,
            behavior: 'smooth'
          });
        }
      }, 100);
    });
  }


  // Get approval requests for admin
  getApprovalRequests(): Notification[] {
    if (!this.isAdmin()) return [];
    return this.notifications.filter(n => n.type === 'approval_request' && !n.read).slice(0, 3);
  }

  // Get high priority notifications
  getHighPriorityNotifications(): Notification[] {
    return this.notifications.filter(n => 
      (n.priority === 'high' || n.priority === 'urgent') && !n.read
    ).slice(0, 3);
  }

  // Get filtered notifications (excluding error messages)
  getFilteredNotifications(): Notification[] {
    return this.notifications.filter(n => 
      !n.title.toLowerCase().includes('error') && 
      !n.message.toLowerCase().includes('cannot connect to server') &&
      !n.message.toLowerCase().includes('error')
    ).slice(0, 3);
  }

  // Clear all error notifications
  clearErrorNotifications(): void {
    const errorNotifications = this.notifications.filter(n => 
      n.title.toLowerCase().includes('error') || 
      n.message.toLowerCase().includes('cannot connect to server') ||
      n.message.toLowerCase().includes('error')
    );
    
    errorNotifications.forEach(notification => {
      this.notificationService.clearNotification(notification.id);
    });
    
    // Reload notifications
    this.loadNotifications();
  }

  // Get action required notifications for admin
  getActionRequiredNotifications(): Notification[] {
    if (!this.isAdmin()) return [];
    return this.notifications.filter(n => n.actionRequired && !n.read).slice(0, 3);
  }

  // Get client status update notifications for staff members
  getClientStatusNotifications(): Notification[] {
    if (this.isAdmin()) {
      return []; // Admins don't see client status notifications
    }
    
    return this.notifications.filter(n => 
      n.type === 'status_changed' && 
      n.data?.isClientStatusUpdate === true && 
      n.data?.targetUserId === this.currentUser?.id && 
      !n.read
    ).slice(0, 3);
  }

  // Get status color from notification data
  getStatusColor(notification: Notification): string {
    return notification.data?.statusColor || '#6b7280';
  }

  // Get status badge class based on status
  getStatusBadgeClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'approved':
      case 'active':
      case 'completed':
        return 'status-approved';
      case 'rejected':
      case 'cancelled':
      case 'inactive':
        return 'status-rejected';
      case 'pending':
      case 'pending_review':
      case 'pending_documents':
        return 'status-pending';
      case 'under_review':
      case 'in_progress':
        return 'status-in-progress';
      case 'on_hold':
        return 'status-on-hold';
      default:
        return 'status-default';
    }
  }

  // Test methods to demonstrate different notification types
  testApprovalRequest(): void {
    this.notificationService.notifyApprovalRequest(
      'John Doe', 
      'client123', 
      'Loan Application', 
      'Jane Smith'
    );
  }

  testLoanApplication(): void {
    this.notificationService.notifyLoanApplication(
      'Alice Johnson', 
      'client456', 
      500000, 
      'Alice Johnson'
    );
  }

  testDocumentUpload(): void {
    this.notificationService.notifyDocumentUpload(
      'Bob Wilson', 
      'client789', 
      'Income Certificate'
    );
  }

  testPaymentReceived(): void {
    this.notificationService.notifyPaymentReceived(
      'Carol Brown', 
      'client101', 
      25000, 
      'EMI'
    );
  }

  testMeetingScheduled(): void {
    this.notificationService.notifyMeetingScheduled(
      'David Lee', 
      'client202', 
      '2024-10-20 10:00 AM', 
      'Admin User'
    );
  }



  // Load pending registrations for admin
  loadPendingRegistrations(): void {
    if (!this.isAdmin()) {
      return;
    }

    this.registrationSubscription = this.authService.getPendingRegistrations().subscribe({
      next: (response) => {
        this.pendingRegistrations = response.users || [];
        console.log('Pending registrations loaded:', this.pendingRegistrations.length);
      },
      error: (error) => {
        console.error('Error loading pending registrations:', error);
        this.pendingRegistrations = [];
      }
    });
  }

  // Get pending registrations for display
  getPendingRegistrations(): any[] {
    if (!this.isAdmin()) {
      return [];
    }
    return this.pendingRegistrations.slice(0, 5); // Show max 5 in dropdown
  }

  // Load pending users (same as notifications page)
  loadPendingUsers(): void {
    if (!this.isAdmin()) {
      return;
    }

    this.authService.getPendingUsers().subscribe({
      next: (response) => {
        this.pendingUsers = response.pending_users || [];
        console.log('Pending users loaded in navbar:', this.pendingUsers.length);
      },
      error: (error) => {
        console.error('Error loading pending users in navbar:', error);
        this.pendingUsers = [];
      }
    });
  }

  // Get pending users for display
  getPendingUsers(): any[] {
    if (!this.isAdmin()) {
      return [];
    }
    return this.pendingUsers.slice(0, 5); // Show max 5 in dropdown
  }

  // Approve user registration
  approveRegistration(user: any, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }

    this.authService.approveRegistration(user.id).subscribe({
      next: (response) => {
        // Remove from pending list
        this.pendingRegistrations = this.pendingRegistrations.filter(u => u.id !== user.id);
        
        // Show success notification
        this.notificationService.addNotification({
          type: 'system',
          title: 'Registration Approved',
          message: `User "${user.username}" has been approved and can now login`,
          priority: 'medium'
        });
        
        console.log('User approved successfully:', user.username);
      },
      error: (error) => {
        console.error('Error approving user:', error);
        this.notificationService.showError(
          'Failed to approve user registration. Please try again.',
          'Approval Error'
        );
      }
    });
  }

  // Reject user registration
  rejectRegistration(user: any, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }

    const reason = 'Registration rejected by admin';
    this.authService.rejectRegistration(user.id, reason).subscribe({
      next: (response) => {
        // Remove from pending list
        this.pendingRegistrations = this.pendingRegistrations.filter(u => u.id !== user.id);
        
        // Show success notification
        this.notificationService.addNotification({
          type: 'system',
          title: 'Registration Rejected',
          message: `User "${user.username}" registration has been rejected`,
          priority: 'medium'
        });
        
        console.log('User rejected successfully:', user.username);
      },
      error: (error) => {
        console.error('Error rejecting user:', error);
        this.notificationService.showError(
          'Failed to reject user registration. Please try again.',
          'Rejection Error'
        );
      }
    });
  }

  // Approve user (same as notifications page)
  approveUser(user: any, event?: Event): void {
    if (!this.isAdmin()) {
      return;
    }

    if (event) {
      event.stopPropagation();
    }

    this.authService.approveUser(user._id).subscribe({
      next: (response) => {
        // Remove from pending list
        this.pendingUsers = this.pendingUsers.filter(u => u._id !== user._id);
        
        // Show success notification
        this.notificationService.addNotification({
          type: 'system',
          title: 'User Approved',
          message: `User "${user.username}" has been approved and can now login`,
          priority: 'medium'
        });
        
        console.log('User approved successfully:', user.username);
      },
      error: (error) => {
        console.error('Error approving user:', error);
        this.notificationService.showError(
          'Failed to approve user. Please try again.',
          'Approval Error'
        );
      }
    });
  }

  // Reject user (same as notifications page)
  rejectUser(user: any, event?: Event): void {
    if (!this.isAdmin()) {
      return;
    }

    if (event) {
      event.stopPropagation();
    }

    const reason = 'Registration rejected by admin';
    
    this.authService.rejectUser(user._id, reason).subscribe({
      next: (response) => {
        // Remove from pending list
        this.pendingUsers = this.pendingUsers.filter(u => u._id !== user._id);
        
        // Show success notification
        this.notificationService.addNotification({
          type: 'system',
          title: 'User Rejected',
          message: `User "${user.username}" registration has been rejected`,
          priority: 'medium'
        });
        
        console.log('User rejected successfully:', user.username);
      },
      error: (error) => {
        console.error('Error rejecting user:', error);
        this.notificationService.showError(
          'Failed to reject user. Please try again.',
          'Rejection Error'
        );
      }
    });
  }

  // Get time ago for pending registrations
  getRegistrationTimeAgo(dateString: string): string {
    if (!dateString) return 'Unknown time';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return date.toLocaleDateString();
  }

  // Get pending users count
  get pendingUsersCount(): number {
    return this.pendingUsers.length;
  }
}
