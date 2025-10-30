import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { LoggerService } from '../services/logger.service';
import { AuthCookieService } from '../services/auth-cookie.service';

@Injectable()
export class CookieAuthInterceptor implements HttpInterceptor {
  constructor(
    private authService: AuthCookieService,
    private router: Router,
    private logger: LoggerService
  ) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Always include credentials (cookies) for same-origin or CORS requests
    const modifiedRequest = request.clone({
      withCredentials: true
    });

    this.logger.debug('Cookie Auth Interceptor - Request:', modifiedRequest.url);

    return next.handle(modifiedRequest).pipe(
      catchError((error: HttpErrorResponse) => {
        this.logger.debug('Cookie Auth Interceptor - HTTP Error:', error.status, error.message);
        
        if (error.status === 401) {
          // Token expired or invalid
          if (error.error?.error === 'user_deleted') {
            this.logger.warn('Cookie Auth Interceptor - User account deleted');
            alert('Your account has been deleted by an administrator. You will be logged out.');
            this.authService.logout();
            this.router.navigate(['/login']);
          } else if (error.error?.error === 'Token has expired') {
            this.logger.warn('Cookie Auth Interceptor - Token expired');
            this.authService.logout();
            this.router.navigate(['/login']);
          } else {
            // Regular unauthorized
            this.logger.debug('Cookie Auth Interceptor - 401 Unauthorized');
            this.authService.logout();
            this.router.navigate(['/login']);
          }
        }
        
        return throwError(() => error);
      })
    );
  }
}
