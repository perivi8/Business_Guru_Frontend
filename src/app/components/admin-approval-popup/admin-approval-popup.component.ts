import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { AdminNotificationService, PendingRegistration } from '../../services/admin-notification.service';

interface ApprovalRequest {
  approval_id: string;
  username: string;
  email: string;
  message: string;
  created_at: string;
}

@Component({
  selector: 'app-admin-approval-popup',
  templateUrl: './admin-approval-popup.component.html',
  styleUrls: ['./admin-approval-popup.component.scss']
})
export class AdminApprovalPopupComponent implements OnInit, OnDestroy {
  currentRequest: PendingRegistration | null = null;
  showPopup = false;
  processing = false;
  
  private pendingSubscription?: Subscription;
  private lastPendingCount = 0;

  constructor(
    private adminNotificationService: AdminNotificationService,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    console.log('🚀 AdminApprovalPopup ngOnInit called');
    
    // Check if user is admin
    const currentUser = this.authService.currentUserValue;
    console.log('👤 Current user:', currentUser);
    
    if (currentUser && currentUser.role === 'admin') {
      console.log('✅ User is admin, initializing approval popup');
      this.initializeAdminSocket(currentUser);
    } else {
      console.log('❌ User is not admin or not logged in, skipping approval popup');
    }
  }

  ngOnDestroy(): void {
    if (this.pendingSubscription) {
      this.pendingSubscription.unsubscribe();
    }
    this.adminNotificationService.stopPolling();
  }

  private initializeAdminSocket(user: any): void {
    // Start polling for pending registrations
    this.adminNotificationService.startPolling();

    // Listen for pending registrations
    this.pendingSubscription = this.adminNotificationService.getPendingRegistrations().subscribe(
      (pendingRegistrations: PendingRegistration[]) => {
        console.log('🔔 AdminApprovalPopup received pending registrations:', pendingRegistrations.length);
        
        // Show popup if there are pending registrations
        if (pendingRegistrations.length > 0) {
          // Check if this is a new registration or initial load
          const isNewRegistration = pendingRegistrations.length > this.lastPendingCount;
          const isInitialLoad = this.lastPendingCount === 0;
          
          if (isNewRegistration || isInitialLoad) {
            // Get the newest registration (first in array, assuming backend sorts by created_at desc)
            this.currentRequest = pendingRegistrations[0];
            this.showPopup = true;
            this.processing = false;
            
            console.log('🚨 SHOWING POPUP for registration:', this.currentRequest.username, this.currentRequest.email);
          }
        } else {
          // No pending registrations, hide popup if showing
          if (this.showPopup) {
            console.log('✅ No more pending registrations, hiding popup');
            this.hidePopup();
          }
        }
        
        this.lastPendingCount = pendingRegistrations.length;
      }
    );
  }

  approveUser(): void {
    if (!this.currentRequest || this.processing) return;
    
    this.processing = true;
    this.adminNotificationService.approveRegistration(this.currentRequest._id).subscribe({
      next: (response) => {
        console.log('✅ Registration approved successfully');
        this.processing = false;
        this.hidePopup();
      },
      error: (error) => {
        console.error('❌ Error approving registration:', error);
        this.processing = false;
        alert('Error approving registration. Please try again.');
      }
    });
  }

  rejectUser(): void {
    if (!this.currentRequest || this.processing) return;
    
    const reason = prompt('Please provide a reason for rejection (optional):') || '';
    
    this.processing = true;
    this.adminNotificationService.rejectRegistration(this.currentRequest._id, reason).subscribe({
      next: (response) => {
        console.log('❌ Registration rejected successfully');
        this.processing = false;
        this.hidePopup();
      },
      error: (error) => {
        console.error('❌ Error rejecting registration:', error);
        this.processing = false;
        alert('Error rejecting registration. Please try again.');
      }
    });
  }

  hidePopup(): void {
    this.showPopup = false;
    this.currentRequest = null;
    this.processing = false;
  }
}
