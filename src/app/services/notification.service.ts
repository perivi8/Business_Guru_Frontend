import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Notification {
  id: string;
  type: 'new_client' | 'update' | 'system' | 'client_updated' | 'status_changed' | 'approval_request' | 'user_registration' | 'loan_application' | 'document_upload' | 'payment_received' | 'meeting_scheduled';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  clientId?: string;
  clientName?: string;
  changedBy?: string;
  actionRequired?: boolean;
  changes?: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  data?: any;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notifications: Notification[] = [];
  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  
  constructor() {
    this.loadNotifications();
  }

  getNotifications(): Observable<Notification[]> {
    return this.notificationsSubject.asObservable();
  }

  addNotification(notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) {
    const newNotification: Notification = {
      ...notification,
      id: this.generateId(),
      timestamp: new Date(),
      read: false
    };
    
    this.notifications.unshift(newNotification);
    this.saveNotifications();
    this.notificationsSubject.next([...this.notifications]);
    
    // Play notification sound
    this.playNotificationSound();
  }

  markAsRead(notificationId: string) {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
      this.saveNotifications();
      this.notificationsSubject.next([...this.notifications]);
    }
  }

  markAllAsRead() {
    this.notifications.forEach(n => n.read = true);
    this.saveNotifications();
    this.notificationsSubject.next([...this.notifications]);
  }

  clearAll() {
    this.notifications = [];
    this.saveNotifications();
    this.notificationsSubject.next([]);
  }

  getUnreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  // Get unread count observable for reactive updates
  getUnreadCountObservable(): Observable<number> {
    return this.notificationsSubject.asObservable().pipe(
      map(notifications => notifications.filter(n => !n.read).length)
    );
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  private saveNotifications() {
    localStorage.setItem('notifications', JSON.stringify(this.notifications));
  }

  private loadNotifications() {
    const saved = localStorage.getItem('notifications');
    if (saved) {
      try {
        const allNotifications = JSON.parse(saved);
        // Convert string dates back to Date objects and filter for current user
        this.notifications = allNotifications
          .map((n: any) => ({
            ...n,
            timestamp: new Date(n.timestamp)
          }))
          .filter((n: any) => {
            // Show notification if:
            // 1. It has no target user (general notification)
            // 2. It's targeted to current user
            // 3. It's a client status update for current user
            const currentUserId = this.getCurrentUserId();
            return !n.data?.targetUserId || 
                   n.data?.targetUserId === currentUserId ||
                   (n.data?.isClientStatusUpdate && this.isNotificationForCurrentUser(n));
          });
        this.notificationsSubject.next([...this.notifications]);
      } catch (e) {
        console.error('Error loading notifications', e);
        this.notifications = [];
      }
    }
  }

  // Helper method to get current user ID
  private getCurrentUserId(): string | null {
    const currentUser = localStorage.getItem('currentUser');
    if (currentUser) {
      try {
        const user = JSON.parse(currentUser);
        return user.id;
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  // Helper method to check if notification is for current user
  private isNotificationForCurrentUser(notification: any): boolean {
    const currentUserId = this.getCurrentUserId();
    return notification.data?.targetUserId === currentUserId;
  }

  // Clear notifications for current user only
  clearAllForUser(userId: string, userRole: string) {
    // Store the current user's lastVisit timestamp to filter out their notifications
    const now = new Date().toISOString();
    const lastVisitKey = `lastVisit_${userRole}_${userId}`;
    localStorage.setItem(lastVisitKey, now);
    
    // Don't actually remove notifications from localStorage
    // The filtering will be handled by the component based on lastVisit timestamp
    this.notificationsSubject.next([...this.notifications]);
  }

  private playNotificationSound() {
    try {
      // Create a simple beep sound using Web Audio API as fallback
      // This avoids the need for external sound files
      this.playBeepSound();
    } catch (error) {
      console.warn('Notification sound failed:', error);
    }
  }

  private playBeepSound() {
    try {
      // Check if Web Audio API is supported
      if (typeof AudioContext !== 'undefined' || typeof (window as any).webkitAudioContext !== 'undefined') {
        const AudioContextClass = AudioContext || (window as any).webkitAudioContext;
        const audioContext = new AudioContextClass();
        
        // Create a simple beep sound
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Configure the beep
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime); // 800 Hz frequency
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime); // Low volume
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2); // Fade out
        
        // Play the beep for 200ms
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
        
        console.log('Notification beep played successfully');
      } else {
        console.info('Web Audio API not supported - notification sound disabled');
      }
    } catch (error) {
      // Silently fail if audio is not supported or blocked
      console.info('Audio notification not available:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Display an error notification to the user
   * @param message The error message to display
   * @param title Optional title for the notification (defaults to 'Error')
   */
  showError(message: string, title: string = 'Error') {
    this.addNotification({
      type: 'system',
      title: title,
      message: message
    });
    
    // Also log to console for debugging
    console.error(`[${title}] ${message}`);
  }

  // Helper methods for common notification types
  notifyNewClient(clientName: string, clientId: string) {
    this.addNotification({
      type: 'new_client',
      title: 'New Client Added',
      message: `A new client "${clientName}" has been added`,
      data: { clientId }
    });
  }

  notifyClientUpdate(clientName: string, clientId: string, updateType: string) {
    this.addNotification({
      type: 'update',
      title: 'Client Updated',
      message: `Client "${clientName}" has been ${updateType}`,
      data: { clientId }
    });
  }

  notifyStatusChange(clientName: string, clientId: string, newStatus: string, adminName: string, loanStatus?: string) {
    // Get loan status color for display
    const loanStatusColor = this.getLoanStatusColor(loanStatus || 'soon');
    const loanStatusText = loanStatus ? ` | Loan Status: ${loanStatus.toUpperCase()}` : '';
    
    this.addNotification({
      type: 'status_changed',
      title: 'Status Updated',
      message: `Client "${clientName}" status changed to ${newStatus} by ${adminName}${loanStatusText}`,
      data: { clientId, status: newStatus, changedBy: adminName, loanStatus, loanStatusColor }
    });
  }

  // Helper method to get loan status colors
  private getLoanStatusColor(status: string): string {
    switch (status) {
      case 'approved': return '#4caf50'; // Green
      case 'rejected': return '#f44336'; // Red
      case 'hold': return '#ff9800'; // Orange
      case 'processing': return '#00bcd4'; // Sky Blue
      case 'soon': return '#9e9e9e'; // Gray
      default: return '#9e9e9e'; // Gray
    }
  }

  notifyLoanStatusChange(clientName: string, clientId: string, newLoanStatus: string, adminName: string) {
    const loanStatusColor = this.getLoanStatusColor(newLoanStatus);
    
    this.addNotification({
      type: 'status_changed',
      title: 'Loan Status Updated',
      message: `Client "${clientName}" loan status changed to ${newLoanStatus.toUpperCase()} by ${adminName}`,
      data: { clientId, loanStatus: newLoanStatus, changedBy: adminName, loanStatusColor }
    });
  }

  notifyAdminAction(actionType: string, clientName: string, clientId: string, adminName: string, details?: string) {
    this.addNotification({
      type: 'system',
      title: `Admin Action: ${actionType}`,
      message: `${adminName} ${actionType.toLowerCase()} client "${clientName}"${details ? ': ' + details : ''}`,
      data: { clientId, actionType, adminName }
    });
  }

  // New notification methods for approval requests and other types
  notifyApprovalRequest(clientName: string, clientId: string, requestType: string, submittedBy: string) {
    this.addNotification({
      type: 'approval_request',
      title: 'Approval Request',
      message: `${requestType} approval requested for client "${clientName}" by ${submittedBy}`,
      priority: 'high',
      actionRequired: true,
      data: { clientId, requestType, submittedBy }
    });
  }

  // Notify admin about new user registration
  notifyUserRegistration(username: string, email: string, userId: string) {
    this.addNotification({
      type: 'user_registration',
      title: 'New User Registration',
      message: `User "${username}" (${email}) has registered and is waiting for approval`,
      priority: 'high',
      actionRequired: true,
      data: { userId, username, email }
    });
  }

  // Notify staff member about client status update by admin
  notifyClientStatusUpdate(clientName: string, clientId: string, newStatus: string, adminName: string, staffId?: string) {
    // Create notification with target user information
    this.addNotification({
      type: 'status_changed',
      title: 'Client Status Updated',
      message: `Your client "${clientName}" status has been updated to ${newStatus.toUpperCase()} by ${adminName}`,
      priority: 'high',
      data: { 
        clientId, 
        clientName,
        status: newStatus, 
        changedBy: adminName,
        targetUserId: staffId, // The user who should see this notification
        statusColor: this.getStatusColor(newStatus),
        isClientStatusUpdate: true // Flag to identify this type of notification
      }
    });
  }

  // Get status color for display
  private getStatusColor(status: string): string {
    switch (status.toLowerCase()) {
      case 'approved':
      case 'active':
      case 'completed':
        return '#10b981'; // Green
      case 'rejected':
      case 'cancelled':
      case 'inactive':
        return '#ef4444'; // Red
      case 'pending':
      case 'pending_review':
      case 'pending_documents':
        return '#f59e0b'; // Orange
      case 'under_review':
      case 'in_progress':
        return '#3b82f6'; // Blue
      case 'on_hold':
        return '#8b5cf6'; // Purple
      default:
        return '#6b7280'; // Gray
    }
  }

  notifyLoanApplication(clientName: string, clientId: string, loanAmount: number, submittedBy: string) {
    this.addNotification({
      type: 'loan_application',
      title: 'New Loan Application',
      message: `Loan application for ₹${loanAmount.toLocaleString()} submitted by "${clientName}"`,
      priority: 'high',
      actionRequired: true,
      data: { clientId, loanAmount, submittedBy }
    });
  }

  notifyDocumentUpload(clientName: string, clientId: string, documentType: string) {
    this.addNotification({
      type: 'document_upload',
      title: 'Document Uploaded',
      message: `${documentType} uploaded by client "${clientName}"`,
      priority: 'medium',
      data: { clientId, documentType }
    });
  }

  notifyPaymentReceived(clientName: string, clientId: string, amount: number, paymentType: string) {
    this.addNotification({
      type: 'payment_received',
      title: 'Payment Received',
      message: `${paymentType} payment of ₹${amount.toLocaleString()} received from "${clientName}"`,
      priority: 'medium',
      data: { clientId, amount, paymentType }
    });
  }

  notifyMeetingScheduled(clientName: string, clientId: string, meetingDate: string, scheduledBy: string) {
    this.addNotification({
      type: 'meeting_scheduled',
      title: 'Meeting Scheduled',
      message: `Meeting scheduled with "${clientName}" on ${meetingDate} by ${scheduledBy}`,
      priority: 'medium',
      data: { clientId, meetingDate, scheduledBy }
    });
  }

  // Get notifications by priority for admins
  getHighPriorityNotifications(): Notification[] {
    return this.notifications.filter(n => n.priority === 'high' || n.priority === 'urgent');
  }

  // Get action required notifications for admins
  getActionRequiredNotifications(): Notification[] {
    return this.notifications.filter(n => n.actionRequired && !n.read);
  }

  // Clear individual notification
  clearNotification(notificationId: string) {
    this.notifications = this.notifications.filter(n => n.id !== notificationId);
    this.saveNotifications();
    this.notificationsSubject.next([...this.notifications]);
  }
}
