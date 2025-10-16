import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit, OnDestroy {
  registerForm!: FormGroup;
  loading = false;
  error = '';
  success = '';
  waitingForApproval = false;
  showResendButton = false;
  approvalId = '';
  sessionId = '';
  showStatusCheck = false;
  statusCheckEmail = '';
  statusMessage = '';
  statusLoading = false;
  registeredEmail = '';
  showWaitingMessage = false;
  checkingApprovalStatus = false;
  
  private registrationSubscription?: Subscription;

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.registerForm = this.formBuilder.group({
      username: ['', Validators.required],
      email: ['', [Validators.required, Validators.email, this.tmisEmailValidator]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    }, {
      validator: this.passwordMatchValidator
    });
    
    // Using regular registration flow (not real-time)
    // Real-time registration with Socket.IO will be implemented later
    this.sessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
  }


  // Custom validator for TMIS email
  tmisEmailValidator(control: any) {
    const email = control.value;
    if (email && !email.startsWith('tmis.') && email !== 'admin@gmail.com') {
      return { tmisEmail: true };
    }
    return null;
  }

  // Custom validator for password match
  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password');
    const confirmPassword = form.get('confirmPassword');
    
    if (password && confirmPassword && password.value !== confirmPassword.value) {
      return { passwordMismatch: true };
    }
    return null;
  }

  get f() { return this.registerForm.controls; }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      return;
    }

    this.loading = true;
    this.error = '';
    this.success = '';
    this.waitingForApproval = true;
    this.showResendButton = false;

    const { username, email, password, confirmPassword } = this.registerForm.value;

    // Use regular registration and then start approval checking
    this.authService.register(username, email, password, confirmPassword)
      .subscribe({
        next: (response) => {
          if (response.status === 'waiting_approval') {
            this.registeredEmail = email;
            this.showWaitingMessage = true;
            this.success = '';  // Don't show success message yet
            this.loading = false;
            
            // Start checking for approval status every 3 seconds
            this.startApprovalStatusChecking();
          } else {
            this.success = 'Registration successful! Redirecting to login...';
            setTimeout(() => {
              this.router.navigate(['/login']);
            }, 2000);
          }
        },
        error: (error) => {
          this.error = error.error?.error || 'Registration failed. Please try again.';
          this.loading = false;
          this.waitingForApproval = false;
        }
      });
  }

  handleRegistrationResult(result: any): void {
    this.loading = false;
    this.waitingForApproval = false;
    this.showResendButton = false;

    switch (result.status) {
      case 'approved':
        this.success = result.message;
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2000);
        break;
      
      case 'rejected':
        this.error = result.message;
        break;
      
      case 'timeout':
        this.error = result.message;
        this.showResendButton = result.show_resend || false;
        break;
      
      default:
        this.error = 'Unknown response from server';
    }
  }

  resendApproval(): void {
    this.showResendButton = false;
    this.onSubmit(); // Resend the registration request
  }

  // Toggle status check form
  toggleStatusCheck(): void {
    this.showStatusCheck = !this.showStatusCheck;
    this.statusMessage = '';
    this.statusCheckEmail = '';
  }

  // Check registration status
  checkStatus(): void {
    if (!this.statusCheckEmail) {
      this.statusMessage = 'Please enter your email address';
      return;
    }

    this.statusLoading = true;
    this.statusMessage = '';

    this.authService.checkRegistrationStatus(this.statusCheckEmail).subscribe({
      next: (response) => {
        this.statusMessage = response.message;
        this.statusLoading = false;
        
        // If approved, suggest login
        if (response.status === 'active') {
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 3000);
        }
      },
      error: (error) => {
        this.statusMessage = error.error?.message || 'Error checking status. Please try again.';
        this.statusLoading = false;
      }
    });
  }

  // Start checking approval status every 3 seconds
  startApprovalStatusChecking(): void {
    this.checkingApprovalStatus = true;
    
    const checkApproval = () => {
      if (!this.checkingApprovalStatus || !this.registeredEmail) {
        return;
      }

      this.authService.checkRegistrationStatus(this.registeredEmail).subscribe({
        next: (response) => {
          if (response.status === 'active') {
            // User has been approved!
            this.checkingApprovalStatus = false;
            this.showWaitingMessage = false;
            this.success = '🎉 Admin approved your registration! Redirecting to login...';
            
            setTimeout(() => {
              this.router.navigate(['/login'], { 
                queryParams: { message: 'Registration approved! You can now login.' }
              });
            }, 2000);
          } else if (response.status === 'pending') {
            // Still pending, continue checking
            setTimeout(checkApproval, 3000);
          }
        },
        error: (error) => {
          // If 404 error, it means the registration was rejected (deleted)
          if (error.status === 404) {
            this.checkingApprovalStatus = false;
            this.showWaitingMessage = false;
            this.loading = false;
            this.error = '❌ Your registration was rejected by admin. You can register again with the same email if needed.';
          } else {
            // Continue checking for other errors
            setTimeout(checkApproval, 3000);
          }
        }
      });
    };

    // Start the first check after 3 seconds
    setTimeout(checkApproval, 3000);
  }

  // Stop approval checking when component is destroyed
  ngOnDestroy(): void {
    this.checkingApprovalStatus = false;
    if (this.registrationSubscription) {
      this.registrationSubscription.unsubscribe();
    }
  }
}
