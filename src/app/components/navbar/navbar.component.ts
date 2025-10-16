import { Component, OnInit, OnDestroy, ViewChild, ElementRef, HostListener } from '@angular/core';
import { interval, Subscription } from 'rxjs';
import { Router, NavigationEnd } from '@angular/router';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Location } from '@angular/common';
import { AuthService, User } from '../../services/auth.service';
import { ClientService, Client } from '../../services/client.service';
import { NotificationService, Notification } from '../../services/notification.service';
import { ChatbotService } from '../../services/chatbot.service';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
  animations: [
    trigger('slideInOut', [
      transition(':enter', [
        style({ transform: 'translateX(100%)', opacity: 0 }),
        animate('300ms ease-in', style({ transform: 'translateX(0%)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('300ms ease-out', style({ transform: 'translateX(100%)', opacity: 0 }))
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
  lastVisit: Date | null = null;
  private notificationSubscription: Subscription | null = null;
  private clientSubscription: Subscription | null = null;
  private unreadCountSubscription: Subscription | null = null;
  hasUnreadNotifications = false;
  lastNotificationCount = 0;
  isLoadingNotifications = false;
  unreadNotificationCount = 0;
  showBackButton = false;
  currentRoute = '';

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
    private chatbotService: ChatbotService
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
        console.log('Admin user detected, loading clients...');
        this.loadClients();
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

  clearAllNotifications(): void {
    const now = new Date().toISOString();
    const userRole = this.isAdmin() ? 'admin' : 'user';
    const userId = this.currentUser?.id || 'default';
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
    if (this.currentUser && this.authService.isAdmin()) {
      this.loadClients();
    }
    
    this.snackBar.open('All notifications cleared', 'Close', {
      duration: 2000,
      horizontalPosition: 'right',
      verticalPosition: 'top'
    });
    
    this.closeNotifications();
  }

  getNotificationCount(): number {
    // Ensure clients array is initialized
    if (!this.clients) {
      this.clients = [];
    }
    
    // Get client-based notification counts
    const newClientsCount = this.getNewClients().length;
    const updatedClientsCount = this.getUpdatedClients().length;
    const adminChangesCount = this.getAdminStatusChanges().length;
    
    // Total count includes system notifications + client notifications
    const totalCount = this.unreadNotificationCount + newClientsCount + updatedClientsCount + adminChangesCount;
    
    console.log('Notification count breakdown:', {
      unreadSystemNotifications: this.unreadNotificationCount,
      newClients: newClientsCount,
      updatedClients: updatedClientsCount,
      adminChanges: adminChangesCount,
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
        return 'update';
      case 'system':
        return 'notifications';
      default:
        return 'notifications_none';
    }
  }

  getNotificationClass(type: string): string {
    switch (type) {
      case 'new_client':
        return 'new-client';
      case 'update':
        return 'update';
      case 'system':
        return 'system';
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
    console.log('Toggle notifications clicked. Current state:', this.showNotifications);
    this.showNotifications = !this.showNotifications;
    console.log('New notification state:', this.showNotifications);
    
    if (this.showNotifications) {
      // Load fresh notifications when opening dropdown
      this.loadNotifications();
      // Mark system notifications as read when opening dropdown
      this.notificationService.markAllAsRead();
      console.log('Notifications loaded and marked as read');
    }
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
    
    // Close dropdown if clicking outside of it
    if (!notificationWrapper && this.showNotifications) {
      this.showNotifications = false;
    }
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

  // Navigate to notifications page on double-click
  navigateToNotifications(): void {
    console.log('Double-click detected - navigating to notifications page');
    // Close the dropdown if it's open
    this.showNotifications = false;
    // Navigate to notifications page
    this.router.navigate(['/notifications']);
  }

  // Open chatbot dialog
  openChatbot(): void {
    console.log('Opening AI chatbot...');
    this.chatbotService.openChatbot();
  }
}
