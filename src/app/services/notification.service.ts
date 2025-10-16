import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Notification {
  id: string;
  type: 'new_client' | 'update' | 'system' | 'client_updated' | 'status_changed';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  clientId?: string;
  clientName?: string;
  changedBy?: string;
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
        this.notifications = JSON.parse(saved);
        // Convert string dates back to Date objects
        this.notifications = this.notifications.map(n => ({
          ...n,
          timestamp: new Date(n.timestamp)
        }));
        this.notificationsSubject.next([...this.notifications]);
      } catch (e) {
        console.error('Error loading notifications', e);
        this.notifications = [];
      }
    }
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

  // Clear individual notification
  clearNotification(notificationId: string) {
    this.notifications = this.notifications.filter(n => n.id !== notificationId);
    this.saveNotifications();
    this.notificationsSubject.next([...this.notifications]);
  }
}
