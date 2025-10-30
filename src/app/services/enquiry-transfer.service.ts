import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class EnquiryTransferService {
  private enquiryData$ = new BehaviorSubject<any>(null);

  constructor() { }

  /**
   * Set enquiry data for transfer to client creation
   * @param data Enquiry data to transfer
   */
  setEnquiryData(data: any): void {
    this.enquiryData$.next(data);
  }

  /**
   * Get enquiry data and clear it after retrieval
   * @returns Observable of enquiry data
   */
  getEnquiryData(): Observable<any> {
    return this.enquiryData$.asObservable();
  }

  /**
   * Get enquiry data once and clear it
   * @returns Current enquiry data
   */
  getAndClearEnquiryData(): any {
    const data = this.enquiryData$.value;
    this.enquiryData$.next(null); // Clear after retrieval
    return data;
  }

  /**
   * Clear enquiry data
   */
  clearEnquiryData(): void {
    this.enquiryData$.next(null);
  }

  /**
   * Check if enquiry data exists
   * @returns True if data exists
   */
  hasEnquiryData(): boolean {
    return this.enquiryData$.value !== null;
  }
}
