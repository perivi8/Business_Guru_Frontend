import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  loading = false;
  error = '';
  approvalMessage = '';
  
  // Registration status check
  checkingStatus = false;
  statusMessage = '';
  statusError = '';
  showStatusCheck = false;

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    // Check for approval message from registration
    this.route.queryParams.subscribe(params => {
      if (params['message']) {
        this.approvalMessage = params['message'];
        // Clear the message after 5 seconds
        setTimeout(() => {
          this.approvalMessage = '';
        }, 5000);
      }
    });

    // Check if already authenticated and redirect immediately
    if (this.authService.isAuthenticated()) {
      this.redirectAuthenticatedUser();
      return;
    }

    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  /**
   * Redirect authenticated user to appropriate dashboard
   */
  private redirectAuthenticatedUser(): void {
    const user = this.authService.currentUserValue;
    if (user?.role === 'admin') {
      this.router.navigate(['/admin-dashboard']);
    } else {
      this.router.navigate(['/dashboard']);
    }
  }

  get f() { return this.loginForm.controls; }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      return;
    }

    this.loading = true;
    this.error = '';

    const { email, password } = this.loginForm.value;

    this.authService.login(email, password)
      .subscribe({
        next: (user) => {
          // Redirect based on user role using helper method
          this.redirectAuthenticatedUser();
        },
        error: (error) => {
          console.error('Login error:', error);
          // Handle different types of errors
          if (error.status === 0) {
            this.error = 'Network error. Please check your connection and try again.';
          } else if (error.status === 401) {
            this.error = error.error?.error || 'Invalid credentials. Please check your email and password.';
          } else if (error.status === 403) {
            this.error = error.error?.error || 'Your account is not approved yet. Please wait for admin approval.';
          } else {
            this.error = error.error?.error || 'Login failed. Please try again.';
          }
          this.loading = false;
        }
      });
  }

  // Toggle registration status check section
  toggleStatusCheck(): void {
    this.showStatusCheck = !this.showStatusCheck;
    this.statusMessage = '';
    this.statusError = '';
  }

  // Check registration status
  checkRegistrationStatus(): void {
    const email = this.loginForm.get('email')?.value;
    
    if (!email) {
      this.statusError = 'Please enter your email address first';
      return;
    }

    this.checkingStatus = true;
    this.statusMessage = '';
    this.statusError = '';

    this.authService.checkRegistrationStatus(email).subscribe({
      next: (response) => {
        this.checkingStatus = false;
        
        if (response.status === 'active') {
          this.statusMessage = '✅ Your registration is approved! You can login now.';
          this.statusError = '';
        } else if (response.status === 'pending') {
          this.statusMessage = '⏳ Your registration is still pending admin approval. Please wait.';
          this.statusError = '';
        }
      },
      error: (error) => {
        this.checkingStatus = false;
        
        if (error.status === 404) {
          // Registration not found - could be rejected or never registered
          this.statusError = '❌ Your registration was rejected by admin or not found. You can register again with the same email.';
          this.statusMessage = '';
        } else {
          this.statusError = 'Error checking registration status. Please try again.';
          this.statusMessage = '';
        }
      }
    });
  }
}