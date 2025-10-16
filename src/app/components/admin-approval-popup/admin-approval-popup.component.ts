import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { SocketService } from '../../services/socket.service';
import { AuthService } from '../../services/auth.service';

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
  currentRequest: ApprovalRequest | null = null;
  showPopup = false;
  processing = false;
  
  private approvalSubscription?: Subscription;
  private processedSubscription?: Subscription;

  constructor(
    private socketService: SocketService,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    // Check if user is admin
    const currentUser = this.authService.currentUserValue;
    if (currentUser && currentUser.role === 'admin') {
      this.initializeAdminSocket(currentUser);
    }
  }

  ngOnDestroy(): void {
    if (this.approvalSubscription) {
      this.approvalSubscription.unsubscribe();
    }
    if (this.processedSubscription) {
      this.processedSubscription.unsubscribe();
    }
  }

  private initializeAdminSocket(user: any): void {
    // Connect to socket and register as admin
    this.socketService.connect();
    this.socketService.adminLogin(user.id, user.role);

    // Listen for approval requests
    this.approvalSubscription = this.socketService.onApprovalRequest().subscribe(
      (request: ApprovalRequest) => {
        this.currentRequest = request;
        this.showPopup = true;
        this.processing = false;
      }
    );

    // Listen for processed confirmations
    this.processedSubscription = this.socketService.onApprovalProcessed().subscribe(
      (response) => {
        this.processing = false;
        this.hidePopup();
      }
    );
  }

  approveUser(): void {
    if (!this.currentRequest || this.processing) return;
    
    this.processing = true;
    this.socketService.sendApprovalResponse(
      this.currentRequest.approval_id,
      'approve'
    );
  }

  rejectUser(): void {
    if (!this.currentRequest || this.processing) return;
    
    const reason = prompt('Please provide a reason for rejection (optional):') || '';
    
    this.processing = true;
    this.socketService.sendApprovalResponse(
      this.currentRequest.approval_id,
      'reject',
      reason
    );
  }

  hidePopup(): void {
    this.showPopup = false;
    this.currentRequest = null;
    this.processing = false;
  }
}
