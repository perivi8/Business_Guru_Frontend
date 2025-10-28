import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, interval, of } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';

export interface PendingRegistration {
  _id: string;
  username: string;
  email: string;
  created_at: string;
  status: string;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AdminNotificationService {
  private pendingRegistrations = new BehaviorSubject<PendingRegistration[]>([]);
  private isPolling = false;
  private pollingInterval = 5000; // 5 seconds

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  // Start polling for pending registrations (admin only)
  startPolling(): void {
    const currentUser = this.authService.currentUserValue;
    if (!currentUser || currentUser.role !== 'admin' || this.isPolling) {
      return;
    }

    this.isPolling = true;

    // Fetch initial data immediately
    this.fetchPendingRegistrations().subscribe(registrations => {
      this.pendingRegistrations.next(registrations);
    });

    // Then poll every 5 seconds
    interval(this.pollingInterval)
      .pipe(
        switchMap(() => this.fetchPendingRegistrations()),
        catchError(error => {
          console.error('Error polling pending registrations:', error);
          return of([]);
        })
      )
      .subscribe(registrations => {
        this.pendingRegistrations.next(registrations);
      });
  }

  // Stop polling
  stopPolling(): void {
    this.isPolling = false;
  }

  // Get pending registrations observable
  getPendingRegistrations(): Observable<PendingRegistration[]> {
    return this.pendingRegistrations.asObservable();
  }

  // Fetch pending registrations from server
  private fetchPendingRegistrations(): Observable<PendingRegistration[]> {
    return this.authService.getPendingRegistrations()
      .pipe(
        switchMap(response => of(response.users || [])),
        catchError(error => {
          console.error('Error fetching pending registrations:', error);
          return of([]);
        })
      );
  }

  // Approve a registration
  approveRegistration(userId: string): Observable<any> {
    return this.authService.approveRegistration(userId);
  }

  // Reject a registration
  rejectRegistration(userId: string, reason?: string): Observable<any> {
    return this.authService.rejectRegistration(userId, reason);
  }

  // Get current pending count
  getPendingCount(): number {
    return this.pendingRegistrations.value.length;
  }

  // Check if there are new registrations
  hasNewRegistrations(): boolean {
    return this.pendingRegistrations.value.length > 0;
  }
}
