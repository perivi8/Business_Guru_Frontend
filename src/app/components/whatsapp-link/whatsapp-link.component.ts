import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-whatsapp-link',
  templateUrl: './whatsapp-link.component.html',
  styleUrls: ['./whatsapp-link.component.scss']
})
export class WhatsappLinkComponent implements OnInit {
  // GreenAPI number from .env file: 918106811285
  whatsappNumber = '918106811285';
  message = 'Hi I am interested!';
  whatsappUrl: string;
  sending = false;
  sent = false;
  errorMessage = '';

  constructor(private http: HttpClient) {
    // Create the WhatsApp URL with pre-filled message
    const encodedMessage = encodeURIComponent(this.message);
    this.whatsappUrl = `https://wa.me/${this.whatsappNumber}?text=${encodedMessage}`;
  }

  ngOnInit(): void {
  }

  // New method to send message through our backend for public users
  sendMessageThroughBackend(): void {
    this.sending = true;
    this.errorMessage = '';
    const payload = {
      mobile_number: this.whatsappNumber,
      message_type: 'new_enquiry',
      wati_name: 'Public User'
    };

    this.http.post('http://localhost:5000/api/enquiries/whatsapp/public-send', payload)
      .subscribe({
        next: (response: any) => {
          console.log('Message sent through backend:', response);
          this.sending = false;
          this.sent = true;
          
          // Redirect to WhatsApp after a short delay to allow user to see the success message
          setTimeout(() => {
            this.redirectToWhatsApp();
          }, 2000);
        },
        error: (error) => {
          console.error('Error sending message:', error);
          this.sending = false;
          this.errorMessage = error.error?.error || 'Failed to send message';
          
          // Even if there's an error, we still want to redirect to WhatsApp
          setTimeout(() => {
            this.redirectToWhatsApp();
          }, 2000);
        }
      });
  }

  // Redirect to WhatsApp (original behavior)
  redirectToWhatsApp(): void {
    window.open(this.whatsappUrl, '_blank');
  }
}