import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'TMIS Business Guru';
  showNavbar = false;

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit() {
    // Restore user session on app initialization for persistent login
    this.authService.restoreSession();
    
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        // Hide navbar on login and register pages
        this.showNavbar = !['/login', '/register'].includes(event.url) && this.authService.isAuthenticated();
        
        // Scroll to top on route navigation
        window.scrollTo(0, 0);
        
        // Handle automatic redirection for authenticated users
        if (this.authService.isAuthenticated() && ['/login', '/register'].includes(event.url)) {
          const user = this.authService.currentUserValue;
          if (user?.role === 'admin') {
            this.router.navigate(['/admin-dashboard']);
          } else {
            this.router.navigate(['/dashboard']);
          }
        }
      }
    });
  }
}
