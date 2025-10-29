import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-enquiry-exists',
  templateUrl: './enquiry-exists.component.html',
  styleUrls: ['./enquiry-exists.component.scss']
})
export class EnquiryExistsComponent implements OnInit {
  whatsappNumber = '8106811285';

  constructor(private router: Router) {}

  ngOnInit(): void {
    // Add body class to remove padding-top
    document.body.classList.add('new-enquiry-page');
  }

  ngOnDestroy(): void {
    // Remove body class when component is destroyed
    document.body.classList.remove('new-enquiry-page');
  }

  openWhatsApp(): void {
    const whatsappUrl = `https://wa.me/${this.whatsappNumber}`;
    window.open(whatsappUrl, '_blank');
  }

  goBack(): void {
    this.router.navigate(['/new-enquiry']);
  }

  closeWindow(): void {
    window.close();
  }
}
