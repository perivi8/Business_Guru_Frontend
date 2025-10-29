import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { EnquiryService } from '../../services/enquiry.service';
import { Enquiry } from '../../models/enquiry.interface';

@Component({
  selector: 'app-enquiry-details',
  templateUrl: './enquiry-details.component.html',
  styleUrls: ['./enquiry-details.component.scss']
})
export class EnquiryDetailsComponent implements OnInit {
  enquiry: Enquiry | null = null;
  loading = false;
  enquiryId: string | null = null;
  allEnquiries: Enquiry[] = []; // Store all enquiries for locking logic

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private enquiryService: EnquiryService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.enquiryId = this.route.snapshot.paramMap.get('id');
    if (this.enquiryId) {
      this.loadEnquiryDetails();
    } else {
      this.snackBar.open('Invalid enquiry ID', 'Close', { duration: 3000 });
      this.router.navigate(['/enquiry']);
    }
  }

  loadEnquiryDetails(): void {
    if (!this.enquiryId) return;
    
    this.loading = true;
    console.log('Loading enquiry with ID:', this.enquiryId);
    
    // First, try to get all enquiries and find the one we need
    this.enquiryService.getAllEnquiries().subscribe({
      next: (enquiries) => {
        console.log('All enquiries loaded:', enquiries.length);
        this.allEnquiries = enquiries; // Store all enquiries for locking logic
        const foundEnquiry = enquiries.find(e => e._id === this.enquiryId);
        
        if (foundEnquiry) {
          console.log('Enquiry found:', foundEnquiry);
          this.enquiry = foundEnquiry;
          this.loading = false;
        } else {
          console.error('Enquiry not found in list');
          this.snackBar.open('Enquiry not found', 'Close', { duration: 3000 });
          this.loading = false;
          setTimeout(() => {
            this.router.navigate(['/enquiry']);
          }, 1500);
        }
      },
      error: (error) => {
        console.error('Error loading enquiries:', error);
        this.snackBar.open('Error loading enquiry details', 'Close', { duration: 3000 });
        this.loading = false;
        setTimeout(() => {
          this.router.navigate(['/enquiry']);
        }, 1500);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/enquiry']);
  }

  /**
   * Check if edit action should be locked
   * Locks edit until staff is assigned to all previous enquiries
   */
  isEditLocked(): boolean {
    if (!this.enquiry) return true;
    
    // Never lock edit for enquiries that already have staff assigned (not special forms)
    if (this.enquiry.staff && 
        this.enquiry.staff !== 'Public Form' && 
        this.enquiry.staff !== 'WhatsApp Form' && 
        this.enquiry.staff !== 'WhatsApp Bot' && 
        this.enquiry.staff !== 'WhatsApp Web') {
      return false;
    }
    
    // Get all enquiries sorted by date (oldest first)
    const sortedEnquiries = [...this.allEnquiries].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateA - dateB;
    });
    
    // Find the index of current enquiry
    const currentIndex = sortedEnquiries.findIndex(e => e._id === this.enquiry?._id);
    
    // Check if there are any previous enquiries without staff assigned
    for (let i = 0; i < currentIndex; i++) {
      const prevEnquiry = sortedEnquiries[i];
      const hasStaffAssigned = prevEnquiry.staff && 
                               prevEnquiry.staff !== 'Public Form' && 
                               prevEnquiry.staff !== 'WhatsApp Form' && 
                               prevEnquiry.staff !== 'WhatsApp Bot' && 
                               prevEnquiry.staff !== 'WhatsApp Web';
      
      // If any previous enquiry doesn't have staff assigned, lock this one
      if (!hasStaffAssigned) {
        return true;
      }
    }
    
    // All previous enquiries have staff assigned, so unlock this one
    return false;
  }

  editEnquiry(): void {
    if (this.enquiry && this.enquiry._id) {
      // Check if edit is locked
      if (this.isEditLocked()) {
        this.snackBar.open('Please assign staff to older enquiries first', 'Close', { 
          duration: 3000 
        });
        return;
      }
      
      // Navigate back to enquiry page and trigger edit mode
      this.router.navigate(['/enquiry'], { 
        queryParams: { edit: this.enquiry._id } 
      });
    }
  }

  previewDocument(url: string): void {
    if (url) {
      window.open(url, '_blank');
    }
  }

  downloadDocument(url: string, enquiryId?: string): void {
    if (url) {
      const link = document.createElement('a');
      link.href = url;
      link.download = `business_document_${enquiryId || 'download'}.pdf`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  getDisplayMobileNumber(mobileNumber: string): string {
    if (!mobileNumber) {
      return 'N/A';
    }
    const cleanedNumber = mobileNumber.replace(/\D/g, '');
    return cleanedNumber.length > 10 ? cleanedNumber.slice(-10) : cleanedNumber;
  }

  getFullMobileNumber(mobileNumber: string): string {
    if (!mobileNumber) {
      return 'N/A';
    }
    const cleanedNumber = mobileNumber.replace(/\D/g, '');
    if (cleanedNumber.length > 10) {
      const countryCode = cleanedNumber.slice(0, -10);
      const number = cleanedNumber.slice(-10);
      return `+${countryCode} ${number}`;
    }
    return cleanedNumber;
  }

  getStatusColor(comment: string): string {
    const colorMap: { [key: string]: string } = {
      'Will share Doc': '#3B82F6',
      'Doc Shared(Yet to Verify)': '#F59E0B',
      'Verified(Shortlisted)': '#10B981',
      'Not Eligible': '#EF4444',
      'No MSME': '#DC2626',
      'No GST': '#B91C1C',
      'Aadhar/PAN name mismatch': '#F97316',
      'MSME/GST Address Different': '#FB923C',
      'Will call back': '#8B5CF6',
      'Personal Loan': '#6366F1',
      'Start Up': '#EC4899',
      'Asking Less than 5 Laks': '#F43F5E',
      '1st call completed': '#06B6D4',
      '2nd call completed': '#14B8A6',
      '3rd call completed': '#10B981',
      'Switch off': '#6B7280',
      'Not connected': '#9CA3AF',
      'By Mistake': '#64748B',
      'GST Cancelled': '#991B1B'
    };
    return colorMap[comment] || '#6B7280';
  }

  getWhatsAppLink(mobileNumber: string): string {
    if (!mobileNumber) {
      return '#';
    }
    
    // Clean the number - remove all non-digit characters
    const cleanedNumber = mobileNumber.replace(/\D/g, '');
    
    // If number has country code (more than 10 digits), use as is
    // If it's 10 digits, assume it's Indian number and add 91
    let fullNumber = cleanedNumber;
    if (cleanedNumber.length === 10) {
      fullNumber = '91' + cleanedNumber;
    }
    
    // Return WhatsApp link
    return `https://wa.me/${fullNumber}`;
  }
}
