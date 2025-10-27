import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ChatMessage {
  id: string;
  message: string;
  isUser: boolean;
  timestamp: Date;
  isLoading?: boolean;
}

export interface ChatResponse {
  success: boolean;
  response: string;
  query_type: string;
  timestamp: string;
  error?: string;
}

export interface EnquiryStats {
  total_enquiries: number;
  recent_enquiries: number;
  staff_stats: Array<{_id: string, count: number}>;
}

export interface ClientStats {
  total_clients: number;
  status_stats: Array<{_id: string, count: number}>;
  loan_stats: Array<{_id: string, count: number}>;
  gst_stats: Array<{_id: string, count: number}>;
}

@Injectable({
  providedIn: 'root'
})
export class ChatbotService {
  private apiUrl = environment.apiUrl || 'http://localhost:5000/api';
  private isChatbotOpenSubject = new BehaviorSubject<boolean>(false);
  
  public isChatbotOpen$ = this.isChatbotOpenSubject.asObservable();

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  sendMessage(message: string): Observable<ChatResponse> {
    const payload = { message };
    return this.http.post<ChatResponse>(`${this.apiUrl}/chatbot/chat`, payload, {
      headers: this.getHeaders()
    });
  }

  getEnquiryStats(): Observable<{success: boolean, data: EnquiryStats}> {
    return this.http.get<{success: boolean, data: EnquiryStats}>(`${this.apiUrl}/chatbot/enquiry-stats`, {
      headers: this.getHeaders()
    });
  }

  getClientStats(): Observable<{success: boolean, data: ClientStats}> {
    return this.http.get<{success: boolean, data: ClientStats}>(`${this.apiUrl}/chatbot/client-stats`, {
      headers: this.getHeaders()
    });
  }

  lookupByGST(gstNumber: string): Observable<{success: boolean, data: any}> {
    return this.http.get<{success: boolean, data: any}>(`${this.apiUrl}/chatbot/lookup/gst/${gstNumber}`, {
      headers: this.getHeaders()
    });
  }

  lookupByMobile(mobileNumber: string): Observable<{success: boolean, data: any}> {
    return this.http.get<{success: boolean, data: any}>(`${this.apiUrl}/chatbot/lookup/mobile/${mobileNumber}`, {
      headers: this.getHeaders()
    });
  }

  checkHealth(): Observable<{success: boolean, status: string, services: any}> {
    return this.http.get<{success: boolean, status: string, services: any}>(`${this.apiUrl}/chatbot/health`);
  }

  openChatbot(): void {
    this.isChatbotOpenSubject.next(true);
  }

  closeChatbot(): void {
    this.isChatbotOpenSubject.next(false);
  }

  toggleChatbot(): void {
    this.isChatbotOpenSubject.next(!this.isChatbotOpenSubject.value);
  }

  isChatbotOpen(): boolean {
    return this.isChatbotOpenSubject.value;
  }
}
