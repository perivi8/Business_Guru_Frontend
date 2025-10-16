import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class OptimizedStatusService {

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) { }

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  /**
   * OPTIMIZED: Fast payment gateway status update
   * Uses lightweight endpoint for instant updates
   */
  updatePaymentGatewayStatus(clientId: string, gateway: string, status: 'approved' | 'not_approved' | 'pending'): Observable<any> {
    const url = `${environment.apiUrl}/clients/${clientId}/status/payment-gateway`;
    const data = { gateway, status };

    console.log(`🚀 Fast gateway update: ${gateway} -> ${status}`);

    return this.http.put<any>(url, data, {
      headers: this.getHeaders(),
      withCredentials: true
    }).pipe(
      tap(response => {
        console.log(`✅ Gateway status updated successfully:`, response);
      }),
      catchError(error => {
        console.error(`❌ Gateway status update failed:`, error);
        // Return error in a format that can be handled gracefully
        return of({
          success: false,
          error: error.error?.error || error.message || 'Update failed',
          status_code: error.status || 500
        });
      })
    );
  }

  /**
   * OPTIMIZED: Fast loan status update
   * Uses lightweight endpoint for instant updates
   */
  updateLoanStatus(clientId: string, loanStatus: 'approved' | 'hold' | 'processing' | 'rejected' | 'soon'): Observable<any> {
    const url = `${environment.apiUrl}/clients/${clientId}/status/loan`;
    const data = { loan_status: loanStatus };

    console.log(`🚀 Fast loan status update: ${loanStatus}`);

    return this.http.put<any>(url, data, {
      headers: this.getHeaders(),
      withCredentials: true
    }).pipe(
      tap(response => {
        console.log(`✅ Loan status updated successfully:`, response);
      }),
      catchError(error => {
        console.error(`❌ Loan status update failed:`, error);
        // Return error in a format that can be handled gracefully
        return of({
          success: false,
          error: error.error?.error || error.message || 'Update failed',
          status_code: error.status || 500
        });
      })
    );
  }

  /**
   * OPTIMIZED: Batch update multiple statuses
   * Efficient for bulk operations
   */
  batchUpdateStatuses(clientId: string, updates: {
    payment_gateways_status?: { [gateway: string]: string },
    loan_status?: string
  }): Observable<any> {
    const url = `${environment.apiUrl}/clients/${clientId}/status/batch`;

    console.log(`🚀 Batch status update:`, updates);

    return this.http.put<any>(url, updates, {
      headers: this.getHeaders(),
      withCredentials: true
    }).pipe(
      tap(response => {
        console.log(`✅ Batch status update successful:`, response);
      }),
      catchError(error => {
        console.error(`❌ Batch status update failed:`, error);
        return of({
          success: false,
          error: error.error?.error || error.message || 'Batch update failed',
          status_code: error.status || 500
        });
      })
    );
  }

  /**
   * Health check for optimized status endpoints
   */
  checkStatusEndpointsHealth(): Observable<any> {
    const url = `${environment.apiUrl}/status/health`;
    
    return this.http.get<any>(url, {
      headers: this.getHeaders(),
      withCredentials: true
    }).pipe(
      tap(response => {
        console.log(`✅ Status endpoints health check:`, response);
      }),
      catchError(error => {
        console.error(`❌ Status endpoints health check failed:`, error);
        return of({
          status: 'unhealthy',
          error: error.error?.error || error.message || 'Health check failed'
        });
      })
    );
  }
}
