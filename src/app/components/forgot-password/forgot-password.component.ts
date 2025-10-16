import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss']
})
export class ForgotPasswordComponent implements OnInit {
  forgotPasswordForm!: FormGroup;
  verifyCodeForm!: FormGroup;
  resetPasswordForm!: FormGroup;
  
  loading = false;
  error = '';
  success = '';
  
  currentStep = 1; // 1: Email, 2: Verify Code, 3: Reset Password
  email = '';

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.forgotPasswordForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]]
    });

    this.verifyCodeForm = this.formBuilder.group({
      resetCode: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]]
    });

    this.resetPasswordForm = this.formBuilder.group({
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    }, {
      validator: this.passwordMatchValidator
    });
  }

  // Custom validator for password match
  passwordMatchValidator(form: FormGroup) {
    const newPassword = form.get('newPassword');
    const confirmPassword = form.get('confirmPassword');
    
    if (newPassword && confirmPassword && newPassword.value !== confirmPassword.value) {
      return { passwordMismatch: true };
    }
    return null;
  }

  get f1() { return this.forgotPasswordForm.controls; }
  get f2() { return this.verifyCodeForm.controls; }
  get f3() { return this.resetPasswordForm.controls; }

  onSubmitEmail(): void {
    if (this.forgotPasswordForm.invalid) {
      return;
    }

    this.loading = true;
    this.error = '';
    this.success = '';

    this.email = this.forgotPasswordForm.value.email;

    this.authService.forgotPassword(this.email)
      .subscribe({
        next: (response) => {
          this.success = 'Reset code sent to your email. Please check your inbox.';
          this.currentStep = 2;
          this.loading = false;
        },
        error: (error) => {
          this.error = error.error?.error || 'Failed to send reset code. Please try again.';
          this.loading = false;
        }
      });
  }

  onSubmitVerifyCode(): void {
    if (this.verifyCodeForm.invalid) {
      return;
    }

    this.loading = true;
    this.error = '';
    this.success = '';

    const resetCode = this.verifyCodeForm.value.resetCode;

    this.authService.verifyResetCode(this.email, resetCode)
      .subscribe({
        next: (response) => {
          this.success = 'Code verified successfully. Please enter your new password.';
          this.currentStep = 3;
          this.loading = false;
        },
        error: (error) => {
          this.error = error.error?.error || 'Invalid or expired reset code.';
          this.loading = false;
        }
      });
  }

  onSubmitResetPassword(): void {
    if (this.resetPasswordForm.invalid) {
      return;
    }

    this.loading = true;
    this.error = '';
    this.success = '';

    const { newPassword, confirmPassword } = this.resetPasswordForm.value;
    const resetCode = this.verifyCodeForm.value.resetCode;

    this.authService.resetPassword(this.email, resetCode, newPassword, confirmPassword)
      .subscribe({
        next: (response) => {
          this.success = 'Password reset successfully! Redirecting to login...';
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 2000);
        },
        error: (error) => {
          this.error = error.error?.error || 'Failed to reset password. Please try again.';
          this.loading = false;
        }
      });
  }

  goBack(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.error = '';
      this.success = '';
    } else {
      this.router.navigate(['/login']);
    }
  }

  resendCode(): void {
    this.loading = true;
    this.error = '';
    this.success = '';

    this.authService.forgotPassword(this.email)
      .subscribe({
        next: (response) => {
          this.success = 'New reset code sent to your email.';
          this.loading = false;
        },
        error: (error) => {
          this.error = error.error?.error || 'Failed to resend code.';
          this.loading = false;
        }
      });
  }
}
