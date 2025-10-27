import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(
    private authService: AuthService,
    private router: Router
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
      
      console.log('Auth Interceptor - Adding token to request:', request.url);
      console.log('Auth Interceptor - Token:', authToken.substring(0, 20) + '...');
      console.log('Auth Interceptor - Request body:', request.body);
    } else if (isAuthRequest) {
      console.log('Auth Interceptor - Skipping token for auth request:', request.url);
    } else {
      console.log('Auth Interceptor - No token available for request:', request.url);
    }

    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        console.log('Auth Interceptor - HTTP Error:', error.status, error.message);
        
        if (error.status === 401) {
          // Check if this is a user deletion
          if (error.error?.error === 'user_deleted') {
            console.log('Auth Interceptor - User account deleted, forcing logout');
            alert('Your account has been deleted by an administrator. You will be logged out.');
            this.authService.logout();
            this.router.navigate(['/login']);
          } else {
            // Regular unauthorized - redirect to login
            console.log('Auth Interceptor - 401 Unauthorized, redirecting to login');
            this.authService.logout();
            this.router.navigate(['/login']);
          }
        }
        
        return throwError(error);
      })
    );
  }
}