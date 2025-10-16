import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-public-enquiry',
  templateUrl: './public-enquiry.component.html',
  styleUrls: ['./public-enquiry.component.scss']
})
export class PublicEnquiryComponent implements OnInit {
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
  }

  createForm(): FormGroup {
    return this.fb.group({
      wati_name: ['', [Validators.required, Validators.minLength(2)]],
      mobile_number: ['', [Validators.required, Validators.pattern(/^\d{10,15}$/)]],
      business_nature: ['']
    });
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
}