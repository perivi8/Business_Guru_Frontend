import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface User {
  _id: string;
  username: string;
  email: string;
  role: string;
  created_at: string;
  status?: string; // Optional status field (active, pending, rejected, paused)
}

@Injectable({
  providedIn: 'root'
})
export class UserService {

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

  getUsers(): Observable<{ users: User[] }> {
    // Use the team endpoint for general user access
    return this.http.get<{ users: User[] }>(`${environment.apiUrl}/team`, {
      headers: this.getHeaders()
    });
  }

  // Admin-only method to get all users
  getAllUsers(): Observable<{ users: User[] }> {
    return this.http.get<{ users: User[] }>(`${environment.apiUrl}/users`, {
      headers: this.getHeaders()
    });
  }
}
