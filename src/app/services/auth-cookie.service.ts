import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { LoggerService } from './logger.service';

export interface User {
  id: string;
  username: string;
  email: string;
  role: string;
}

export interface AuthResponse {
  access_token: string;
  user: User;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthCookieService {
  private currentUserSubject: BehaviorSubject<User | null>;
  public currentUser: Observable<User | null>;
  private userStatusCheckInterval: any;

  constructor(
    private http: HttpClient,
    private logger: LoggerService
  ) {
    // Try to restore session from cookie
    const storedUser = localStorage.getItem('currentUser');
    this.currentUserSubject = new BehaviorSubject<User | null>(
      storedUser ? JSON.parse(storedUser) : null
    );
    this.currentUser = this.currentUserSubject.asObservable();

    // Verify token on initialization
    if (storedUser) {
      this.verifyToken().subscribe({
        next: () => {
          this.logger.debug('Token verified from cookie');
          this.startUserStatusMonitoring();
        },
        error: () => {
          this.logger.warn('Token verification failed, clearing session');
          this.clearSession();
        }
      });
    }
  }

  public get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  /**
   * Login with HttpOnly cookie
   * Token is automatically stored in cookie by backend
   */
  login(email: string, password: string): Observable<User> {
    return this.http.post<AuthResponse>(
      `${environment.apiUrl}/login`,
      { email, password },
      { withCredentials: true } // Important: Send/receive cookies
    ).pipe(
      map(response => {
        // Store user details (NOT the token - it's in HttpOnly cookie)
        localStorage.setItem('currentUser', JSON.stringify(response.user));
        this.currentUserSubject.next(response.user);
        
        this.logger.debug('Login successful, token stored in cookie');
        this.startUserStatusMonitoring();
        
        return response.user;
      })
    );
  }

  /**
   * Register new user
   */
  register(username: string, email: string, password: string, confirmPassword: string): Observable<any> {
    return this.http.post<any>(
      `${environment.apiUrl}/register`,
      { username, email, password, confirmPassword },
      { withCredentials: true }
    );
  }

  /**
   * Logout - clears HttpOnly cookie on backend
   */
  logout(): void {
    this.stopUserStatusMonitoring();
    
    // Call backend to clear cookie
    this.http.post(
      `${environment.apiUrl}/logout`,
      {},
      { withCredentials: true }
    ).subscribe({
      next: () => {
        this.logger.debug('Logout successful, cookie cleared');
      },
      error: (error) => {
        this.logger.error('Logout error:', error);
      }
    });

    // Clear local user data
    this.clearSession();
  }

  /**
   * Verify token from cookie
   */
  verifyToken(): Observable<any> {
    return this.http.get(
      `${environment.apiUrl}/verify-token`,
      { withCredentials: true }
    );
  }

  /**
   * Check if user is authenticated
   * Verifies with backend since token is in HttpOnly cookie
   */
  isAuthenticated(): boolean {
    return !!this.currentUserValue;
  }

  /**
   * Check if user is admin
   */
  isAdmin(): boolean {
    const user = this.currentUserValue;
    return user?.role === 'admin';
  }

  /**
   * Get current user
   */
  getCurrentUser(): User | null {
    return this.currentUserValue;
  }

  /**
   * Clear local session data
   */
  private clearSession(): void {
    localStorage.removeItem('currentUser');
    this.currentUserSubject.next(null);
  }

  /**
   * Start monitoring user status
   */
  private startUserStatusMonitoring(): void {
    if (this.userStatusCheckInterval) {
      return;
    }

    this.userStatusCheckInterval = setInterval(() => {
      if (this.isAuthenticated()) {
        this.checkUserStatus();
      }
    }, 5000);
  }

  /**
   * Stop monitoring user status
   */
  private stopUserStatusMonitoring(): void {
    if (this.userStatusCheckInterval) {
      clearInterval(this.userStatusCheckInterval);
      this.userStatusCheckInterval = null;
    }
  }

  /**
   * Check if user still exists and is active
   */
  private checkUserStatus(): void {
    const currentUser = this.currentUserValue;
    if (!currentUser) return;

    this.http.get(
      `${environment.apiUrl}/user-status`,
      { withCredentials: true }
    ).subscribe({
      next: () => {
        // User is still valid
      },
      error: (error) => {
        if (error.status === 401 && error.error?.error === 'user_deleted') {
          alert('Your account has been deleted by an administrator. You will be logged out.');
          this.logout();
          window.location.reload();
        }
      }
    });
  }

  // ==================== ADMIN METHODS ====================

  getUsers(): Observable<any> {
    return this.http.get<any>(
      `${environment.apiUrl}/users`,
      { withCredentials: true }
    );
  }

  getPendingUsers(): Observable<any> {
    return this.http.get<any>(
      `${environment.apiUrl}/pending-users`,
      { withCredentials: true }
    );
  }

  approveUser(userId: string): Observable<any> {
    return this.http.post<any>(
      `${environment.apiUrl}/approve-user/${userId}`,
      {},
      { withCredentials: true }
    );
  }

  rejectUser(userId: string, reason: string): Observable<any> {
    return this.http.post<any>(
      `${environment.apiUrl}/reject-user/${userId}`,
      { reason },
      { withCredentials: true }
    );
  }

  deleteUser(userId: string): Observable<any> {
    return this.http.delete<any>(
      `${environment.apiUrl}/delete-user/${userId}`,
      { withCredentials: true }
    );
  }

  pauseUser(userId: string): Observable<any> {
    return this.http.post<any>(
      `${environment.apiUrl}/pause-user/${userId}`,
      {},
      { withCredentials: true }
    );
  }

  resumeUser(userId: string): Observable<any> {
    return this.http.post<any>(
      `${environment.apiUrl}/resume-user/${userId}`,
      {},
      { withCredentials: true }
    );
  }

  // ==================== PASSWORD RESET ====================

  forgotPassword(email: string): Observable<any> {
    return this.http.post<any>(
      `${environment.apiUrl}/forgot-password`,
      { email },
      { withCredentials: true }
    );
  }

  verifyResetCode(email: string, resetCode: string): Observable<any> {
    return this.http.post<any>(
      `${environment.apiUrl}/verify-reset-code`,
      { email, reset_code: resetCode },
      { withCredentials: true }
    );
  }

  resetPassword(email: string, resetCode: string, newPassword: string, confirmPassword: string): Observable<any> {
    return this.http.post<any>(
      `${environment.apiUrl}/reset-password`,
      { email, reset_code: resetCode, new_password: newPassword, confirm_password: confirmPassword },
      { withCredentials: true }
    );
  }

  checkRegistrationStatus(email: string): Observable<any> {
    return this.http.get<any>(
      `${environment.apiUrl}/check-registration-status/${email}`,
      { withCredentials: true }
    );
  }
}
