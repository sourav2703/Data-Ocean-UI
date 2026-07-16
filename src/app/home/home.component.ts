import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LeakOsintService } from '../services/leak-osint.service';

interface Field {
  key: string;
  value: any;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent {
  query = '';
  loading = false;
  result: any = null;
  errorMessage = '';

  // Collapsible state
  expandedDatabases: { [key: number]: boolean } = {};
  expandedRecords: { [key: string]: boolean } = {};

  constructor(private leakService: LeakOsintService) { }

  search(): void {
    if (!this.query.trim()) {
      this.errorMessage = 'Please enter Mobile, Email or Username.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.result = null;
    this.expandedDatabases = {};
    this.expandedRecords = {};

    this.leakService.search(this.query.trim()).subscribe({
      next: (res: any) => {
        this.loading = false;

        if (res && res.data && res.data.List) {
          this.result = res.data;
          // Auto-expand first database
          if (this.result.List) {
            const keys = Object.keys(this.result.List);
            if (keys.length > 0) {
              this.expandedDatabases[0] = true;
            }
          }
        } else if (res && res.List) {
          this.result = res;
          // Auto-expand first database
          if (this.result.List) {
            const keys = Object.keys(this.result.List);
            if (keys.length > 0) {
              this.expandedDatabases[0] = true;
            }
          }
        } else {
          this.errorMessage = 'No results found';
          this.result = null;
        }
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
        this.errorMessage = err.error?.error || 'Search failed. Please try again.';
      }
    });
  }

  // Toggle database expansion
  toggleDatabase(index: number): void {
    this.expandedDatabases[index] = !this.expandedDatabases[index];
  }

  // Toggle record expansion
  toggleRecord(dbIndex: number, recordIndex: number): void {
    const key = `${dbIndex}-${recordIndex}`;
    this.expandedRecords[key] = !this.expandedRecords[key];
  }

  // EXPORT FUNCTIONS
  exportJSON(): void {
    if (!this.result) return;

    const data = {
      query: this.query,
      timestamp: new Date().toISOString(),
      results: this.result
    };

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `data-occien-export-${new Date().getTime()}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  exportCSV(): void {
    if (!this.result?.List) return;

    const rows: any[] = [];

    // Create CSV rows
    for (const dbKey in this.result.List) {
      const db = this.result.List[dbKey];
      if (db.Data) {
        db.Data.forEach((record: any) => {
          const row: any = {
            Database: dbKey,
            InfoLeak: db.InfoLeak || ''
          };
          // Add all fields from the record
          for (const fieldKey in record) {
            row[fieldKey] = record[fieldKey];
          }
          rows.push(row);
        });
      }
    }

    if (rows.length === 0) {
      alert('No records to export');
      return;
    }

    // Get all unique headers
    const headers = Array.from(new Set(rows.flatMap(row => Object.keys(row))));

    // Create CSV content
    let csv = headers.join(',') + '\n';
    rows.forEach(row => {
      const values = headers.map(header => {
        const value = row[header] || '';
        // Escape commas and quotes
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      });
      csv += values.join(',') + '\n';
    });

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `data-occien-export-${new Date().getTime()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  exportPDF(): void {
    if (!this.result) {
      alert('No data to export');
      return;
    }

    // Create a printable version
    const printContent = this.generatePrintableContent();
    const win = window.open('', '_blank', 'width=1200,height=800');
    if (!win) {
      alert('Please allow popups to export PDF');
      return;
    }

    win.document.write(`
      <html>
        <head>
          <title>Data-Occien - Search Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
            .header h1 { color: #00ff00; font-size: 28px; }
            .header p { color: #666; }
            .db-card { border: 1px solid #ddd; margin-bottom: 20px; border-radius: 5px; overflow: hidden; }
            .db-header { background: #f5f5f5; padding: 10px 15px; border-bottom: 1px solid #ddd; }
            .db-header h3 { margin: 0; color: #333; }
            .db-header .info { color: #666; font-size: 14px; }
            .record { border-bottom: 1px solid #eee; padding: 10px 15px; }
            .record:last-child { border-bottom: none; }
            .record-title { font-weight: bold; color: #555; margin-bottom: 5px; }
            .field { display: flex; padding: 3px 0; }
            .field-name { font-weight: bold; width: 150px; color: #666; }
            .field-value { flex: 1; color: #333; }
            .status { color: #ff0000; font-weight: bold; }
            .footer { text-align: center; margin-top: 30px; color: #999; font-size: 12px; border-top: 1px solid #ddd; padding-top: 10px; }
            @media print {
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          ${printContent}
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 1000);
            }
          <\/script>
        </body>
      </html>
    `);
    win.document.close();
  }

  private generatePrintableContent(): string {
    let html = `
      <div class="header">
        <h1>🔍 DATA-OCCIEN - Investigation Report</h1>
        <p>Query: ${this.query} | Generated: ${new Date().toLocaleString()}</p>
      </div>
    `;

    for (const dbKey in this.result.List) {
      const db = this.result.List[dbKey];
      html += `
        <div class="db-card">
          <div class="db-header">
            <h3>📊 ${dbKey}</h3>
            <div class="info">${db.InfoLeak || 'No description'}</div>
            <div class="status">⚠️ BREACHED</div>
          </div>
      `;

      if (db.Data) {
        db.Data.forEach((record: any, index: number) => {
          html += `<div class="record">
            <div class="record-title">Record #${index + 1}</div>`;

          for (const key in record) {
            const value = record[key];
            if (value !== null && value !== undefined) {
              html += `
                <div class="field">
                  <div class="field-name">${this.formatFieldName(key)}:</div>
                  <div class="field-value">${value}</div>
                </div>
              `;
            }
          }

          html += `</div>`;
        });
      }

      html += `</div>`;
    }

    html += `
      <div class="footer">
        <p>Data-Occien - Secure Investigation Platform | Generated on ${new Date().toLocaleString()}</p>
      </div>
    `;

    return html;
  }

  // Helper functions
  getDb(value: any): any {
    return value;
  }

  getRow(value: any): any {
    return value;
  }

  // Type-safe field name formatting
  formatFieldName(key: string | unknown): string {
    const str = String(key || '');
    return str
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  // Type-safe field icon
  getFieldIcon(field: Field | any): string {
    const key = String(field.key || '').toLowerCase();

    const iconMap: { [key: string]: string } = {
      'mobile': 'fa-mobile-screen',
      'phone': 'fa-mobile-screen',
      'telephone': 'fa-mobile-screen',
      'phone number': 'fa-mobile-screen',
      'phone_no': 'fa-mobile-screen',
      'email': 'fa-envelope',
      'email address': 'fa-envelope',
      'e-mail': 'fa-envelope',
      'address': 'fa-location-dot',
      'full address': 'fa-location-dot',
      'location': 'fa-location-dot',
      'aadhaar': 'fa-id-card',
      'aadhar': 'fa-id-card',
      'uid': 'fa-id-card',
      'pan': 'fa-address-card',
      'pancard': 'fa-address-card',
      'father': 'fa-user-group',
      'father_name': 'fa-user-group',
      'mother': 'fa-user-group',
      'mother_name': 'fa-user-group',
      'name': 'fa-user',
      'full name': 'fa-user',
      'username': 'fa-user',
      'user name': 'fa-user',
      'dob': 'fa-calendar-days',
      'birthday': 'fa-calendar-days',
      'date of birth': 'fa-calendar-days',
      'birth_date': 'fa-calendar-days',
      'password': 'fa-key',
      'pass': 'fa-key',
      'pwd': 'fa-key',
      'ip': 'fa-globe',
      'ip address': 'fa-globe',
      'url': 'fa-link',
      'website': 'fa-link',
      'city': 'fa-location-dot',
      'state': 'fa-location-dot',
      'country': 'fa-location-dot',
      'pincode': 'fa-location-dot',
      'zip': 'fa-location-dot',
      'bank': 'fa-credit-card',
      'account': 'fa-credit-card',
      'card': 'fa-credit-card',
      'credit card': 'fa-credit-card',
      'gender': 'fa-venus-mars',
      'occupation': 'fa-briefcase',
      'job': 'fa-briefcase',
      'company': 'fa-briefcase',
      'instagram': 'fa-share-alt',
      'facebook': 'fa-share-alt',
      'twitter': 'fa-share-alt',
      'social': 'fa-share-alt'
    };

    return iconMap[key] || 'fa-angle-right';
  }

  // Type-safe field value
  getFieldValue(field: Field | any): string {
    if (field.value === null || field.value === undefined) {
      return 'N/A';
    }
    return String(field.value);
  }

  copy(value: any): void {
    const text = String(value);
    navigator.clipboard.writeText(text).then(() => {
      // Could show a toast notification here
      console.log('Copied:', text);
    }).catch(err => {
      console.error('Copy failed:', err);
    });
  }

  getTotalRecords(): number {
    if (!this.result?.List) return 0;

    let total = 0;
    for (const key in this.result.List) {
      const db = this.result.List[key];
      if (db.Data) {
        total += db.Data.length;
      }
    }
    return total;
  }

  getDatabaseCount(): number {
    if (!this.result?.List) return 0;
    return Object.keys(this.result.List).length;
  }
}
