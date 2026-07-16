import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LeakOsintService } from '../services/leak-osint.service';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-fullhistory',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './fullhistory.component.html',
  styleUrls: ['./fullhistory.component.css']
})
export class FullHistoryComponent implements OnInit {

  fullHistory: any[] = [];
  filteredHistory: any[] = [];
  loading = false;
  errorMessage = '';

  // Filters
  searchTerm = '';
  filterStatus = 'all';
  filterDateFrom: string = '';
  filterDateTo: string = '';

  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalItems = 0;

  // Stats
  stats: any = null;

  // Expanded items
  expandedId: number | null = null;

  // Make Math available in template
  Math = Math;

  constructor(private leakService: LeakOsintService) { }

  ngOnInit(): void {
    this.loadFullHistory();
    this.loadStats();
  }

  loadFullHistory(): void {
    this.loading = true;
    this.errorMessage = '';

    this.leakService.getFullHistory(500).subscribe({
      next: (response: any) => {
        this.loading = false;
        if (response.success) {
          this.fullHistory = response.history;
          this.totalItems = response.total;
          this.applyFilters();
          console.log('Full history loaded:', this.fullHistory);
        }
      },
      error: (err) => {
        this.loading = false;
        console.error('Error loading full history:', err);
        this.errorMessage = 'Failed to load history. Please try again.';
      }
    });
  }

  loadStats(): void {
    this.leakService.getStats().subscribe({
      next: (response: any) => {
        if (response.success) {
          this.stats = response.stats;
        }
      },
      error: (err) => {
        console.error('Error loading stats:', err);
      }
    });
  }

  applyFilters(): void {
    let filtered = [...this.fullHistory];

    // Filter by status
    if (this.filterStatus !== 'all') {
      filtered = filtered.filter(item => item.status === this.filterStatus);
    }

    // Filter by search term
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.trim().toLowerCase();
      filtered = filtered.filter(item =>
        item.query.toLowerCase().includes(term)
      );
    }

    // Filter by date range
    if (this.filterDateFrom) {
      const fromDate = new Date(this.filterDateFrom);
      filtered = filtered.filter(item => new Date(item.createdAt) >= fromDate);
    }

    if (this.filterDateTo) {
      const toDate = new Date(this.filterDateTo);
      toDate.setHours(23, 59, 59);
      filtered = filtered.filter(item => new Date(item.createdAt) <= toDate);
    }

    this.filteredHistory = filtered;
    this.totalItems = filtered.length;
    this.currentPage = 1;
  }

  getPaginatedData(): any[] {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    return this.filteredHistory.slice(start, end);
  }

  getTotalPages(): number {
    return Math.ceil(this.filteredHistory.length / this.pageSize);
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.getTotalPages()) {
      this.currentPage = page;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  getPageNumbers(): number[] {
    const totalPages = this.getTotalPages();
    const pages: number[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (this.currentPage > 3) {
        pages.push(-1);
      }
      const start = Math.max(2, this.currentPage - 1);
      const end = Math.min(totalPages - 1, this.currentPage + 1);
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) {
          pages.push(i);
        }
      }
      if (this.currentPage < totalPages - 2) {
        pages.push(-1);
      }
      pages.push(totalPages);
    }

    return pages;
  }

  toggleExpand(id: number): void {
    this.expandedId = this.expandedId === id ? null : id;
  }

  getStatusClass(status: string): string {
    switch (status?.toLowerCase() || '') {
      case 'completed':
        return 'status-success';
      case 'failed':
        return 'status-failed';
      case 'pending':
        return 'status-pending';
      default:
        return '';
    }
  }

  getStatusIcon(status: string): string {
    switch (status?.toLowerCase() || '') {
      case 'completed':
        return 'fa-check-circle';
      case 'failed':
        return 'fa-times-circle';
      case 'pending':
        return 'fa-clock';
      default:
        return 'fa-circle';
    }
  }

  formatDate(date: string): string {
    if (!date) return 'N/A';
    try {
      return new Date(date).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return date;
    }
  }

  getFieldIcon(fieldKey: string | any): string {
    if (!fieldKey) return 'fa-angle-right';

    const key = String(fieldKey).toLowerCase();

    switch (key) {
      case 'mobile':
      case 'phone':
      case 'telephone':
      case 'phone number':
      case 'phone_no':
        return 'fa-mobile-screen';

      case 'email':
      case 'email address':
      case 'e-mail':
        return 'fa-envelope';

      case 'address':
      case 'full address':
      case 'location':
        return 'fa-location-dot';

      case 'aadhaar':
      case 'aadhar':
      case 'uid':
        return 'fa-id-card';

      case 'pan':
      case 'pancard':
        return 'fa-address-card';

      case 'father':
      case 'father_name':
      case 'mother':
      case 'mother_name':
        return 'fa-user-group';

      case 'name':
      case 'full name':
      case 'username':
        return 'fa-user';

      case 'dob':
      case 'birthday':
      case 'date of birth':
        return 'fa-calendar-days';

      case 'password':
      case 'pass':
      case 'pwd':
        return 'fa-key';

      case 'ip':
      case 'ip address':
        return 'fa-globe';

      case 'url':
      case 'website':
        return 'fa-link';

      case 'city':
      case 'state':
      case 'country':
      case 'pincode':
        return 'fa-location-dot';

      case 'bank':
      case 'account':
      case 'card':
        return 'fa-credit-card';

      case 'gender':
        return 'fa-venus-mars';

      case 'occupation':
      case 'job':
      case 'company':
        return 'fa-briefcase';

      default:
        return 'fa-angle-right';
    }
  }

  copyToClipboard(value: any): void {
    const text = String(value || '');
    if (text) {
      navigator.clipboard.writeText(text).then(() => {
        console.log('Copied:', text);
      }).catch(err => {
        console.error('Copy failed:', err);
      });
    }
  }

  getTotalRecords(databases: any[]): number {
    let total = 0;
    if (databases) {
      databases.forEach(db => {
        total += db.recordCount || 0;
      });
    }
    return total;
  }

  getQueryTypeLabel(type: string): string {
    if (!type) return 'Unknown';
    return type.charAt(0).toUpperCase() + type.slice(1);
  }

  refreshData(): void {
    this.loadFullHistory();
    this.loadStats();
  }

  exportCSV(): void {
    alert('CSV Export Coming Soon');
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.filterStatus = 'all';
    this.filterDateFrom = '';
    this.filterDateTo = '';
    this.applyFilters();
  }

  // Safe key extraction for ngFor
  trackByFn(index: number, item: any): number {
    return item.id || index;
  }

  getRecordEntries(record: any): { key: string, value: any }[] {
    if (!record) return [];
    return Object.entries(record).map(([key, value]) => ({ key, value }));
  }
}
