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
            this.submitted = true;
            this.success = false;
            this.submitting = false;
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
  }
}