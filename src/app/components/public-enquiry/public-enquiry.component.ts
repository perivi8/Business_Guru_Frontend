import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-public-enquiry',
  templateUrl: './public-enquiry.component.html',
  styleUrls: ['./public-enquiry.component.scss']
})
export class PublicEnquiryComponent implements OnInit, OnDestroy {
  enquiryForm: FormGroup;
  submitted = false;
  submitting = false;
  success = false;
  mobileExists = false;
  whatsappNumber = '8106811285';
  whatsappSent = false;
  whatsappError = '';

  constructor(
    private fb: FormBuilder,
    private http: HttpClient
  ) {
    this.enquiryForm = this.createForm();
  }

  ngOnInit(): void {
    // Add body class to remove padding-top
    document.body.classList.add('new-enquiry-page');
  }

  createForm(): FormGroup {
    return this.fb.group({
      wati_name: ['', [Validators.required, this.nameValidator]],
      mobile_number: ['', [Validators.required, this.mobileValidator]],
      business_nature: ['']
    });
  }

  // Custom validator for name: 15-20 characters including spaces
  nameValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) {
      return null; // Let required validator handle empty values
    }
    
    const name = control.value.trim();
    
    if (name.length < 15) {
      return { minLength: { requiredLength: 15, actualLength: name.length } };
    }
    
    if (name.length > 20) {
      return { maxLength: { requiredLength: 20, actualLength: name.length } };
    }
    
    // Check if name contains only letters and spaces
    const namePattern = /^[a-zA-Z\s]+$/;
    if (!namePattern.test(name)) {
      return { invalidName: true };
    }
    
    return null;
  }

  // Custom validator for mobile: exactly 10 digits, cannot start with 0
  mobileValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) {
      return null; // Let required validator handle empty values
    }
    
    const mobile = control.value.toString();
    
    // Check if exactly 10 digits
    if (!/^\d{10}$/.test(mobile)) {
      return { invalidMobile: true };
    }
    
    // Check if starts with 0
    if (mobile.startsWith('0')) {
      return { startsWithZero: true };
    }
    
    return null;
  }

  // Allow only letters and spaces for name input
  onNameKeyPress(event: KeyboardEvent): void {
    const char = String.fromCharCode(event.which);
    const pattern = /^[a-zA-Z\s]$/;
    
    if (!pattern.test(char)) {
      event.preventDefault();
    }
  }

  // Allow only digits for mobile input, prevent 0 as first digit
  onMobileKeyPress(event: KeyboardEvent): void {
    const char = String.fromCharCode(event.which);
    const currentValue = (event.target as HTMLInputElement).value;
    
    // Allow only digits
    if (!/^\d$/.test(char)) {
      event.preventDefault();
      return;
    }
    
    // Prevent 0 as first digit
    if (currentValue.length === 0 && char === '0') {
      event.preventDefault();
      return;
    }
  }

  onSubmit(): void {
    if (this.enquiryForm.valid && !this.submitting) {
      this.submitting = true;
      const formData = this.enquiryForm.value;
      
      // Prepare data for backend
      const enquiryData = {
        wati_name: formData.wati_name,
        mobile_number: formData.mobile_number,
        business_nature: formData.business_nature || '',
        staff: 'Public Enquiry',
        comments: 'New Public Enquiry',
        gst: '',
        secondary_mobile_number: null
      };

      // Send to backend
      this.http.post(`${environment.apiUrl}/enquiries/public`, enquiryData)
        .subscribe({
          next: (response: any) => {
            console.log('Enquiry submitted successfully:', response);
            this.submitted = true;
            this.success = true;
            this.submitting = false;
            
            // Show WhatsApp status message
            if (response.whatsapp_sent === true) {
              console.log('WhatsApp message sent successfully');
            } else if (response.whatsapp_error) {
              console.log('WhatsApp message failed:', response.whatsapp_error);
            }
          },
          error: (error) => {
            console.error('Error submitting enquiry:', error);
            this.submitting = false;
            
            // Check if mobile number already exists
            if (error.status === 409 && error.error?.error === 'mobile_exists') {
              this.mobileExists = true;
              this.submitted = true;
              this.success = false;
              
              // Check WhatsApp sending status
              this.whatsappSent = error.error?.whatsapp_sent || false;
              this.whatsappError = error.error?.whatsapp_error || '';
              
              if (this.whatsappSent) {
                console.log('WhatsApp message sent automatically to existing user');
              } else if (this.whatsappError) {
                console.log('WhatsApp message failed:', this.whatsappError);
              }
            } else {
              this.submitted = true;
              this.success = false;
            }
          }
        });
    }
  }

  closeWindow(): void {
    window.close();
  }

  resetForm(): void {
    this.enquiryForm.reset();
    this.submitted = false;
    this.success = false;
    this.mobileExists = false;
    this.whatsappSent = false;
    this.whatsappError = '';
  }

  openWhatsApp(): void {
    const whatsappUrl = `https://wa.me/${this.whatsappNumber}`;
    window.open(whatsappUrl, '_blank');
  }

  ngOnDestroy(): void {
    // Remove body class when component is destroyed
    document.body.classList.remove('new-enquiry-page');
  }
}