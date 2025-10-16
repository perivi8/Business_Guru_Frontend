import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private connected = new BehaviorSubject<boolean>(false);
  
  constructor() {
    // Socket.IO completely disabled to prevent connection errors
    console.log('Socket.IO service disabled - using regular HTTP requests only');
  }

  connect(): void {
    // Disabled - no socket connection
    console.log('Socket connect called but disabled');
  }

  disconnect(): void {
    // Disabled - no socket connection
    console.log('Socket disconnect called but disabled');
  }

  isConnected(): Observable<boolean> {
    return this.connected.asObservable();
  }

  // All socket methods disabled - returning empty observables
  adminLogin(userId: string, role: string): void {
    console.log('adminLogin called but disabled');
  }

  onApprovalRequest(): Observable<any> {
    return of(null);
  }

  sendApprovalResponse(approvalId: string, action: 'approve' | 'reject', reason?: string): void {
    console.log('sendApprovalResponse called but disabled');
  }

  onRegistrationResult(): Observable<any> {
    return of(null);
  }

  onAdminRegistered(): Observable<any> {
    return of(null);
  }

  onApprovalProcessed(): Observable<any> {
    return of(null);
  }

  generateSessionId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  getSocketId(): string {
    return '';
  }
}
