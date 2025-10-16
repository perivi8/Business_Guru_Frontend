import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface User {
  id: string;
  username: string;
  email: string;
  role: string;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

export interface RegistrationStatusResponse {
  status: string;
  message: string;
  username?: string;
  email?: string;
  created_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject: BehaviorSubject<User | null>;
  public currentUser: Observable<User | null>;
  private userStatusCheckInterval: any;

  constructor(private http: HttpClient) {
    // Initialize with stored user data for persistent login
    const storedUser = localStorage.getItem('currentUser');
    const storedToken = localStorage.getItem('token');
    
    // Only set user if both user data and token exist
    if (storedUser && storedToken) {
      this.currentUserSubject = new BehaviorSubject<User | null>(JSON.parse(storedUser));
      // Start monitoring for existing logged-in user
      this.startUserStatusMonitoring();
    } else {
      // Clear any incomplete data
      localStorage.removeItem('currentUser');
      localStorage.removeItem('token');
      this.currentUserSubject = new BehaviorSubject<User | null>(null);
    }
    this.currentUser = this.currentUserSubject.asObservable();
  }

  public get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }
  register(username: string, email: string, password: string, confirmPassword: string): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/register`, {
      username,
      email,
      password,
      confirmPassword
    });
  }

  login(email: string, password: string): Observable<User> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/login`, { email, password })
      .pipe(map(response => {
        // Store user details and jwt token in local storage
        localStorage.setItem('currentUser', JSON.stringify(response.user));
        localStorage.setItem('token', response.access_token);
        this.currentUserSubject.next(response.user);
        
        // Start monitoring user status for automatic logout
        this.startUserStatusMonitoring();
        
        return response.user;
      }));
  }


  isAuthenticated(): boolean {
    const token = localStorage.getItem('token');
    const user = this.currentUserValue;
    console.log('Auth check - Token exists:', !!token);
    console.log('Auth check - User exists:', !!user);
    console.log('Auth check - Token value:', token);
    console.log('Auth check - User value:', user);
    return !!token && !!user;
  }

  isAdmin(): boolean {
    const user = this.currentUserValue;
    return user?.role === 'admin';
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  getUsers(): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/users`);
  }

  // Debug method to check all users in database
  debugAllUsersForTroubleshooting(): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/debug/users/troubleshooting`);
  }

  /**
   * Restore user session from localStorage
   * This method is called on app initialization to maintain persistent login
   */
  restoreSession(): boolean {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('currentUser');
    
    if (token && storedUser) {
      try {
        const user = JSON.parse(storedUser);
        this.currentUserSubject.next(user);
        console.log('Session restored successfully for user:', user.email);
        return true;
      } catch (error) {
        console.error('Error parsing stored user data:', error);
        this.clearSession();
        return false;
      }
    }
    
    console.log('No valid session found to restore');
    return false;
  }

  /**
   * Clear all session data
   */
  private clearSession(): void {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('token');
    this.currentUserSubject.next(null);
  }

  // Forgot password methods
  forgotPassword(email: string): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/forgot-password`, { email });
  }

  verifyResetCode(email: string, resetCode: string): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/verify-reset-code`, { 
      email, 
      reset_code: resetCode 
    });
  }

  resetPassword(email: string, resetCode: string, newPassword: string, confirmPassword: string): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/reset-password`, { 
      email, 
      reset_code: resetCode,
      new_password: newPassword,
      confirm_password: confirmPassword
    });
  }

  // Admin user approval methods
  getPendingUsers(): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/pending-users`);
  }

  approveUser(userId: string): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/approve-user/${userId}`, {});
  }

  rejectUser(userId: string, reason: string): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/reject-user/${userId}`, { reason });
  }

  deleteUser(userId: string): Observable<any> {
    return this.http.delete<any>(`${environment.apiUrl}/delete-user/${userId}`);
  }

  // Debug and cleanup methods
  debugAllUsers(): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/debug/all-users`);
  }

  cleanupRejectedUsers(): Observable<any> {
    return this.http.delete<any>(`${environment.apiUrl}/cleanup/rejected-users`);
  }

  // User pause/resume methods
  pauseUser(userId: string): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/pause-user/${userId}`, {});
  }

  resumeUser(userId: string): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/resume-user/${userId}`, {});
  }

  // Check registration status
  checkRegistrationStatus(email: string): Observable<RegistrationStatusResponse> {
    return this.http.get<RegistrationStatusResponse>(`${environment.apiUrl}/check-registration-status/${email}`);
  }

  // Real-time registration method
  registerRealtime(username: string, email: string, password: string, confirmPassword: string, sessionId: string): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/register-realtime`, {
      username,
      email,
      password,
      confirmPassword,
      session_id: sessionId
    });
  }

  // Start monitoring user status for automatic logout
  startUserStatusMonitoring(): void {
    if (this.userStatusCheckInterval) {
      return; // Already monitoring
    }

    // Check user status every 5 seconds
    this.userStatusCheckInterval = setInterval(() => {
      if (this.isAuthenticated()) {
        this.checkUserStatus();
      }
    }, 5000);
  }

  // Stop monitoring user status
  stopUserStatusMonitoring(): void {
    if (this.userStatusCheckInterval) {
      clearInterval(this.userStatusCheckInterval);
      this.userStatusCheckInterval = null;
    }
  }

  // Check if current user still exists and is active
  private checkUserStatus(): void {
    const currentUser = this.currentUserValue;
    if (!currentUser) return;

    // Make a simple API call to check if user still exists
    this.http.get(`${environment.apiUrl}/user-status`).subscribe({
      next: (response: any) => {
        // User is still valid
      },
      error: (error) => {
        if (error.status === 401 && error.error?.error === 'user_deleted') {
          // User has been deleted, force logout
          alert('Your account has been deleted by an administrator. You will be logged out.');
          this.logout();
          window.location.reload(); // Force page refresh
        }
      }
    });
  }

  // Override logout to stop monitoring
  logout(): void {
    this.stopUserStatusMonitoring();
    // Remove user from local storage
    localStorage.removeItem('currentUser');
    localStorage.removeItem('token');
    this.currentUserSubject.next(null);
  }
}
