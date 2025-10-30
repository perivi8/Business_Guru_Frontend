import { Component, OnInit, OnDestroy, ChangeDetectorRef, NgZone } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
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
  showOtherLoanPurpose = false;
  selectedFile: File | null = null;
  fileUploading = false;
  businessDocumentUrl = '';
  loanAmountInWords = '';

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    private router: Router
  ) {
    this.enquiryForm = this.createForm();
  }

  ngOnInit(): void {
    // Add body class to remove padding-top
    document.body.classList.add('new-enquiry-page');
  }

  createForm(): FormGroup {
    return this.fb.group({
      business_name: ['', [Validators.required, Validators.minLength(3)]],
      owner_name: ['', [Validators.required, Validators.minLength(3)]],
      email_address: ['', [Validators.required, Validators.email]],
      phone_number: ['', [Validators.required, this.mobileValidator.bind(this)]],
      loan_amount: ['', [Validators.required, this.loanAmountValidator.bind(this)]],
      loan_purpose: ['', [Validators.required]],
      loan_purpose_other: [''],
      annual_revenue: ['', [Validators.required]]
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

  // Custom validator for loan amount: must be between 500000 and 50000000
  loanAmountValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) {
      return null; // Let required validator handle empty values
    }
    
    const amount = parseFloat(control.value.toString().replace(/,/g, ''));
    
    if (isNaN(amount)) {
      return { invalidAmount: true };
    }
    
    if (amount < 500000) {
      return { minAmount: { requiredMin: 500000, actualAmount: amount } };
    }
    
    if (amount > 50000000) {
      return { maxAmount: { requiredMax: 50000000, actualAmount: amount } };
    }
    
    return null;
  }

  // Convert number to Indian currency words
  convertToIndianCurrency(amount: number): string {
    if (!amount || amount === 0) {
      return '';
    }

    const crore = Math.floor(amount / 10000000);
    const lakh = Math.floor((amount % 10000000) / 100000);
    const thousand = Math.floor((amount % 100000) / 1000);
    const hundred = Math.floor((amount % 1000) / 100);
    const remainder = amount % 100;

    let result = '';

    if (crore > 0) {
      result += crore + (crore === 1 ? ' Crore ' : ' Crores ');
    }

    if (lakh > 0) {
      result += lakh + (lakh === 1 ? ' Lakh ' : ' Lakhs ');
    }

    if (thousand > 0) {
      result += thousand + ' Thousand ';
    }

    if (hundred > 0) {
      result += hundred + ' Hundred ';
    }

    if (remainder > 0) {
      result += remainder + (remainder === 1 ? ' Rupee' : ' Rupees');
    }

    return result.trim();
  }

  // Handle loan amount input change
  onLoanAmountChange(event: any): void {
    const value = event.target.value;
    const amount = parseFloat(value);
    
    if (!isNaN(amount) && amount > 0) {
      this.loanAmountInWords = this.convertToIndianCurrency(amount);
    } else {
      this.loanAmountInWords = '';
    }
  }

  // Handle loan purpose change to show/hide custom input
  onLoanPurposeChange(event: any): void {
    const selectedValue = event.target.value;
    this.showOtherLoanPurpose = selectedValue === 'Other';
    
    const loanPurposeOtherControl = this.enquiryForm.get('loan_purpose_other');
    
    if (this.showOtherLoanPurpose) {
      // Make custom input required when "Other" is selected
      loanPurposeOtherControl?.setValidators([Validators.required]);
    } else {
      // Clear validators and value when not "Other"
      loanPurposeOtherControl?.clearValidators();
      this.enquiryForm.patchValue({ loan_purpose_other: '' });
    }
    
    loanPurposeOtherControl?.updateValueAndValidity();
  }

  // Allow only letters and spaces for name input
  onNameKeyPress(event: KeyboardEvent): void {
    const char = String.fromCharCode(event.which);
    const pattern = /^[a-zA-Z\s]$/;
    
    if (!pattern.test(char)) {
      event.preventDefault();
    }
  }

  // Allow only digits for mobile input, prevent + symbol, auto-handle country codes
  onMobileKeyPress(event: KeyboardEvent): void {
    const char = String.fromCharCode(event.which);
    const input = event.target as HTMLInputElement;
    const currentValue = input.value;
    
    // Prevent + symbol
    if (char === '+') {
      event.preventDefault();
      return;
    }
    
    // Allow only digits (0-9)
    if (!/^\d$/.test(char)) {
      event.preventDefault();
      return;
    }
    
    // If current value is already 10 or more digits, keep only last 9 and add new digit
    if (currentValue.length >= 10) {
      event.preventDefault();
      const newValue = currentValue.slice(-9) + char; // Keep last 9 digits + new digit = 10 digits
      input.value = newValue;
      this.enquiryForm.patchValue({ phone_number: newValue });
      return;
    }
  }

  // Handle paste event to prevent country codes and invalid formats
  onMobilePaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pastedText = event.clipboardData?.getData('text') || '';
    
    // Remove all non-digit characters (including +, spaces, hyphens, country codes)
    let cleanedNumber = pastedText.replace(/\D/g, '');
    
    // If more than 10 digits, take only the last 10 digits
    // This handles cases like 919876543210 -> 9876543210
    if (cleanedNumber.length > 10) {
      cleanedNumber = cleanedNumber.slice(-10);
    }
    
    // Update the input value
    const input = event.target as HTMLInputElement;
    input.value = cleanedNumber;
    
    // Trigger form control update
    this.enquiryForm.patchValue({ phone_number: cleanedNumber });
  }

  // Handle file selection
  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }
      
      // Validate file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 
                           'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.type)) {
        alert('Only PDF, JPG, PNG, DOC, and DOCX files are allowed');
        return;
      }
      
      this.selectedFile = file;
      console.log('File selected:', file.name);
    }
  }

  // Remove selected file
  removeFile(event: Event): void {
    event.stopPropagation();
    this.selectedFile = null;
    this.businessDocumentUrl = '';
  }

  // Upload file to backend
  async uploadFileToBackend(file: File): Promise<string> {
    this.fileUploading = true;
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await this.http.post<any>(
        `${environment.apiUrl}/upload-document`,
        formData
      ).toPromise();
      
      this.fileUploading = false;
      return response.file_url;
    } catch (error) {
      this.fileUploading = false;
      console.error('File upload failed:', error);
      throw error;
    }
  }

  async onSubmit(): Promise<void> {
    if (this.enquiryForm.valid && !this.submitting) {
      this.submitting = true;
      const formData = this.enquiryForm.value;
      
      try {
        // Upload file to backend if selected
        let businessDocumentUrl = '';
        if (this.selectedFile) {
          businessDocumentUrl = await this.uploadFileToBackend(this.selectedFile);
        }
        
        // Prepare data for backend
        const finalLoanPurpose = formData.loan_purpose === 'Other' ? formData.loan_purpose_other : formData.loan_purpose;
        
        const enquiryData = {
          business_name: formData.business_name,
          owner_name: formData.owner_name,
          wati_name: formData.owner_name, // Use owner_name as wati_name for compatibility
          email_address: formData.email_address,
          phone_number: formData.phone_number,
          mobile_number: formData.phone_number, // Use phone_number as mobile_number for compatibility
          loan_amount: formData.loan_amount,
          loan_purpose: finalLoanPurpose,
          annual_revenue: formData.annual_revenue,
          business_document_url: businessDocumentUrl,
          staff: 'Public Enquiry',
          comments: 'New Public Enquiry - FinGrowth Form',
        gst: '',
        secondary_mobile_number: null
      };

      // Debug logging
      console.log('Form Data:', formData);
      console.log('Enquiry Data being sent:', enquiryData);

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
              console.error('Error status:', error.status);
              console.error('Error response:', error.error);
              this.submitting = false;
              
              // Check if mobile number already exists - check multiple possible error formats
              const isMobileExists = error.status === 409 || 
                                     error.error?.error === 'mobile_exists' ||
                                     error.error?.message?.includes('already exists') ||
                                     error.error?.message?.includes('Mobile number already registered');
              
              if (isMobileExists) {
                console.log('Mobile number already exists - redirecting to enquiry-exists page');
                
                // Navigate to the enquiry-exists page
                this.router.navigate(['/enquiry-exists']);
              } else {
                console.log('General error - showing error message');
                this.ngZone.run(() => {
                  this.submitted = true;
                  this.success = false;
                  this.mobileExists = false;
                  this.submitting = false;
                });
              }
            }
          });
      } catch (error) {
        console.error('Error during form submission:', error);
        this.submitting = false;
        alert('An error occurred while submitting the form. Please try again.');
      }
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
    this.selectedFile = null;
    this.businessDocumentUrl = '';
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