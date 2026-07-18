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

  // ============================================
  // PDF EXPORT USING WINDOW.PRINT()
  // ============================================
  exportPDF(): void {
    if (!this.result) {
      alert('No data to export');
      return;
    }

    // Show loading state
    this.loading = true;

    // Create the printable content
    const printContent = this.generatePrintableContent();

    // Open new window with print dialog
    const win = window.open('', '_blank', 'width=1200,height=800');
    if (!win) {
      this.loading = false;
      alert('Please allow popups to export PDF. Check your browser settings.');
      return;
    }

    // Write the content to the new window
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Data-Occien - Search Report</title>
          <meta charset="UTF-8">
          <style>
            /* ============================================
               PRINT STYLES
               ============================================ */
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }

            body {
              font-family: 'Segoe UI', Arial, sans-serif;
              padding: 20px;
              background: white;
              color: #333;
            }

            /* Header */
            .print-header {
              text-align: center;
              border-bottom: 3px solid #00ff00;
              padding-bottom: 15px;
              margin-bottom: 25px;
            }

            .print-header h1 {
              color: #00aa00;
              font-size: 28px;
              font-weight: bold;
              letter-spacing: 2px;
            }

            .print-header .subtitle {
              color: #666;
              font-size: 14px;
              margin-top: 5px;
            }

            .print-header .query-info {
              color: #888;
              font-size: 13px;
              margin-top: 8px;
              background: #f5f5f5;
              padding: 5px 15px;
              display: inline-block;
              border-radius: 4px;
            }

            /* Database Cards */
            .db-card {
              border: 1px solid #e0e0e0;
              margin-bottom: 20px;
              border-radius: 6px;
              overflow: hidden;
              page-break-inside: avoid;
            }

            .db-header {
              background: #f8f8f8;
              padding: 12px 18px;
              border-bottom: 1px solid #e0e0e0;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }

            .db-header h3 {
              margin: 0;
              color: #333;
              font-size: 16px;
            }

            .db-header .db-info {
              color: #888;
              font-size: 13px;
            }

            .db-header .breached-status {
              color: #ff0000;
              font-weight: bold;
              font-size: 12px;
              background: #ffe0e0;
              padding: 3px 12px;
              border-radius: 12px;
            }

            /* Records */
            .record {
              padding: 12px 18px;
              border-bottom: 1px solid #f0f0f0;
            }

            .record:last-child {
              border-bottom: none;
            }

            .record-title {
              font-weight: bold;
              color: #555;
              font-size: 13px;
              margin-bottom: 6px;
              padding-bottom: 4px;
              border-bottom: 1px dashed #eee;
            }

            .field {
              display: flex;
              padding: 3px 0;
              font-size: 13px;
              line-height: 1.5;
            }

            .field-name {
              font-weight: bold;
              min-width: 140px;
              color: #666;
            }

            .field-value {
              flex: 1;
              color: #333;
              word-break: break-word;
            }

            /* Footer */
            .print-footer {
              text-align: center;
              margin-top: 30px;
              padding-top: 15px;
              border-top: 1px solid #e0e0e0;
              color: #aaa;
              font-size: 11px;
            }

            /* Page break handling */
            .page-break {
              page-break-before: always;
            }

            /* Print optimization */
            @media print {
              body {
                padding: 10px;
              }

              .db-card {
                break-inside: avoid;
              }

              .record {
                break-inside: avoid;
              }

              .no-print {
                display: none !important;
              }
            }

            /* Screen only (visible in preview) */
            @media screen {
              .print-tip {
                background: #fff3cd;
                border: 1px solid #ffc107;
                color: #856404;
                padding: 10px 15px;
                border-radius: 4px;
                margin-bottom: 20px;
                font-size: 14px;
              }

              .print-tip strong {
                color: #333;
              }
            }

            /* Empty state */
            .no-data {
              text-align: center;
              padding: 40px;
              color: #999;
            }
          </style>
        </head>
        <body>
          <!-- Print Tip (only visible on screen) -->
          <div class="print-tip no-print">
            <strong>📄 Print to PDF:</strong>
            When the print dialog appears, select <strong>"Save as PDF"</strong> as the destination.
            <br>
            <small>Click <strong>Cancel</strong> to close without printing.</small>
          </div>

          ${printContent}

          <div class="print-footer">
            <p>Data-Occien - Secure Investigation Platform</p>
            <p>Generated on ${new Date().toLocaleString()}</p>
          </div>

          <script>
            // Auto-trigger print when window loads
            window.onload = function() {
              // Small delay to ensure content is rendered
              setTimeout(function() {
                window.print();

                // Optional: Close window after printing
                window.onafterprint = function() {
                  // Comment this out if you want to keep the window open
                  // setTimeout(function() { window.close(); }, 2000);
                };
              }, 500);
            };
          <\/script>
        </body>
      </html>
    `);

    win.document.close();

    // Reset loading state (will be reset when window closes)
    setTimeout(() => {
      this.loading = false;
    }, 3000);
  }

  // ============================================
  // GENERATE PRINTABLE CONTENT
  // ============================================
  private generatePrintableContent(): string {
    let html = `
      <div class="print-header">
        <h1>🔍 DATA-OCCIEN - Investigation Report</h1>
        <div class="subtitle">Secure Investigation Console</div>
        <div class="query-info">
          <strong>Query:</strong> ${this.escapeHtml(this.query)} &nbsp;|&nbsp;
          <strong>Generated:</strong> ${new Date().toLocaleString()}
        </div>
      </div>
    `;

    // Check if there are results
    const dbKeys = Object.keys(this.result.List);
    if (dbKeys.length === 0) {
      html += `
        <div class="no-data">
          <p>No databases found for this query.</p>
        </div>
      `;
      return html;
    }

    // Generate content for each database
    for (const dbKey of dbKeys) {
      const db = this.result.List[dbKey];

      html += `
        <div class="db-card">
          <div class="db-header">
            <div>
              <h3>📊 ${this.escapeHtml(dbKey)}</h3>
              <div class="db-info">${this.escapeHtml(db.InfoLeak || 'No description available')}</div>
            </div>
            <div class="breached-status">⚠️ BREACHED</div>
          </div>
      `;

      // Records
      if (db.Data && db.Data.length > 0) {
        db.Data.forEach((record: any, index: number) => {
          html += `<div class="record">
            <div class="record-title">Record #${index + 1}</div>`;

          // Fields
          for (const key in record) {
            const value = record[key];
            if (value !== null && value !== undefined && value !== '') {
              html += `
                <div class="field">
                  <div class="field-name">${this.formatFieldName(key)}:</div>
                  <div class="field-value">${this.escapeHtml(String(value))}</div>
                </div>
              `;
            }
          }

          html += `</div>`;
        });
      } else {
        html += `
          <div class="record">
            <div style="color: #999; padding: 10px 0;">No records found in this database.</div>
          </div>
        `;
      }

      html += `</div>`;
    }

    return html;
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  // Escape HTML to prevent XSS
  private escapeHtml(text: string): string {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

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
