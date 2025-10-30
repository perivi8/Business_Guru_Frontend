import { Injectable } from '@angular/core';
import { Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthCookieService } from '../services/auth-cookie.service';
import { LoggerService } from '../services/logger.service';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class CookieAdminGuard implements CanActivate {

  constructor(
    private router: Router,
    private authService: AuthCookieService,
    private logger: LoggerService
  ) { }

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
    // Check if user is authenticated
    if (!this.authService.isAuthenticated()) {
      this.logger.warn('Cookie Admin Guard - Not authenticated');
      this.router.navigate(['/login']);
      return of(false);
    }

    // Verify token and check admin role
    return this.authService.verifyToken().pipe(
      map(response => {
        if (response.valid && response.role === 'admin') {
          this.logger.debug('Cookie Admin Guard - Admin access granted');
          return true;
        } else if (response.valid) {
          this.logger.warn('Cookie Admin Guard - Not admin, redirecting to dashboard');
          this.router.navigate(['/dashboard']);
          return false;
        } else {
          this.logger.warn('Cookie Admin Guard - Token invalid');
          this.authService.logout();
          this.router.navigate(['/login']);
          return false;
        }
      }),
      catchError(error => {
        this.logger.error('Cookie Admin Guard - Verification failed:', error);
        this.authService.logout();
        this.router.navigate(['/login']);
        return of(false);
      })
    );
  }
}
