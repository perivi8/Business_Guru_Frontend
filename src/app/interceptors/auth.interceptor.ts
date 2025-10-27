import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { LoggerService } from '../services/logger.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(
    private authService: AuthService,
    private router: Router,
    private logger: LoggerService
  ) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Get the auth token from the service
    const authToken = this.authService.getToken();
    
    // Clone the request and add the authorization header if token exists
    // But don't add token to login/register requests
    const isAuthRequest = request.url.includes('/login') || request.url.includes('/register');
    
    if (authToken && !isAuthRequest) {
      request = request.clone({
        setHeaders: {
          Authorization: `Bearer ${authToken}`
        }
      });
      
      this.logger.debug('Auth Interceptor - Adding token to request:', request.url);
    } else if (isAuthRequest) {
      this.logger.debug('Auth Interceptor - Skipping token for auth request:', request.url);
    } else {
      this.logger.debug('Auth Interceptor - No token available for request:', request.url);
    }

    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        this.logger.debug('Auth Interceptor - HTTP Error:', error.status, error.message);
        
        if (error.status === 401) {
          // Check if this is a user deletion
          if (error.error?.error === 'user_deleted') {
            this.logger.warn('Auth Interceptor - User account deleted, forcing logout');
            alert('Your account has been deleted by an administrator. You will be logged out.');
            this.authService.logout();
            this.router.navigate(['/login']);
          } else {
            // Regular unauthorized - redirect to login
            this.logger.debug('Auth Interceptor - 401 Unauthorized, redirecting to login');
            this.authService.logout();
            this.router.navigate(['/login']);
          }
        }
        
        return throwError(error);
      })
    );
  }
}