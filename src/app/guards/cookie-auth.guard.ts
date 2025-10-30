import { Injectable } from '@angular/core';
import { Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthCookieService } from '../services/auth-cookie.service';
import { LoggerService } from '../services/logger.service';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class CookieAuthGuard implements CanActivate {

  constructor(
    private router: Router,
    private authService: AuthCookieService,
    private logger: LoggerService
  ) { }

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
    // Check if user data exists locally
    if (!this.authService.isAuthenticated()) {
      this.logger.warn('Cookie Auth Guard - No user data, redirecting to login');
      this.router.navigate(['/login']);
      return of(false);
    }

    // Verify token with backend (cookie-based)
    return this.authService.verifyToken().pipe(
      map(response => {
        if (response.valid) {
          this.logger.debug('Cookie Auth Guard - Token valid');
          return true;
        } else {
          this.logger.warn('Cookie Auth Guard - Token invalid');
          this.authService.logout();
          this.router.navigate(['/login']);
          return false;
        }
      }),
      catchError(error => {
        this.logger.error('Cookie Auth Guard - Token verification failed:', error);
        this.authService.logout();
        this.router.navigate(['/login']);
        return of(false);
      })
    );
  }
}
