import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LeakOsintService {
  private http = inject(HttpClient);
  // private apiUrl = 'https://localhost:7143/api';
  private apiUrl = 'https://leakdatabackend.onrender.com/api';

// https://leakdatabackend.onrender.com/api/history/full
  search(q: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/search`, {
      query: q,
      limit: 1000,
      lang: 'en'
    });
  }
  // Add these methods to your service
getFullHistory(limit: number = 100): Observable<any> {
  return this.http.get<any>(`${this.apiUrl}/history/full?limit=${limit}`);
}

getStats(): Observable<any> {
  return this.http.get<any>(`${this.apiUrl}/stats`);
}

getSearchResult(searchId: number): Observable<any> {
  return this.http.get<any>(`${this.apiUrl}/result/${searchId}`);
}
}
