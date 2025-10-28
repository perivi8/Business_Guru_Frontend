import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService, User } from '../../services/auth.service';
import { ClientService, Client } from '../../services/client.service';
import { ConfirmDeleteDialogComponent } from '../confirm-delete-dialog/confirm-delete-dialog.component';

declare var Chart: any;

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss']
})
export class AdminDashboardComponent implements OnInit {
  currentUser: User | null = null;
  clients: Client[] = [];
  users: User[] = [];
  loading = true;
  displayedColumns: string[] = ['serial', 'name', 'business', 'staff', 'status', 'created', 'actions'];
  
  
  stats = {
    totalClients: 0,
    todayNewClients: 0,
    pendingClients: 0,
    interestedClients: 0,
    notInterestedClients: 0,
    onHoldClients: 0,
    processingClients: 0,
    totalTeam: 0
  };

  chartData: any[] = [];
  chartSegments: any[] = [];
  
  userStats = {
    totalUsers: 0,
    loggedInUsers: 0,
    loggedOutUsers: 0
  };
  
  todayStats = {
    newClientsToday: 0,
    userClientCounts: [] as { username: string, count: number }[]
  };

  // User Performance Filter
  selectedUserPerformanceFilter: string = 'today';
  userPerformanceStartDate: string = '';
  userPerformanceEndDate: string = '';
  isUserPerformanceDropdownOpen: boolean = false;
  filteredUserStats: { username: string, count: number }[] = [];

  newClientsCount = 0;
  updatedClientsCount = 0;
  lastAdminVisit: Date | null = null;

  // Weekly Data for Report 1
  weeklyData: any[] = [];

  // Week Selection Properties
  selectedWeekOption: string = 'current';
  customStartDate: string = '';
  customEndDate: string = '';
  showComparison: boolean = false;
  selectedWeekData: any[] = [];
  previousWeekData: any[] = [];
  
  // Week ranges for filtering
  weekRanges: { [key: string]: { start: Date; end: Date } } = {};

  // Custom dropdown properties
  isWeekDropdownOpen: boolean = false;

  constructor(
    private authService: AuthService,
    private clientService: ClientService,
    private router: Router,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) { }

  ngOnInit(): void {
    console.log('Admin Dashboard - ngOnInit started');
    console.log('Current user:', this.authService.currentUserValue);
    
    this.currentUser = this.authService.currentUserValue;
    this.loadLastAdminVisit();
    
    // Add loading state management
    this.loading = true;
    
    // Debug: Check all users in database first
    this.debugAllUsers();
    
    // Load data with proper error handling
    Promise.all([
      this.loadClientsAsync(),
      this.loadUserStatsAsync()
    ]).then(() => {
      console.log('Admin Dashboard - All data loaded successfully');
      console.log('Final clients count:', this.clients.length);
      console.log('Final stats:', this.stats);
      
      // Initialize week filtering after data is loaded
      this.filterWeeklyData();
      
      this.loading = false;
    }).catch((error) => {
      console.error('Error loading dashboard data:', error);
      this.loading = false;
    });
    
    this.initializeWeekRanges();
  }


  // Chart initialization removed - dashboard uses CSS-based charts instead of Chart.js
  initializeChartsWithRetry(attempt: number = 1): void {
    // No-op: Charts are now CSS-based, not Canvas-based
    return;
  }

  initializeCharts(): void {
    // No-op: Charts are now CSS-based
  }

  initializeWeeklyChart(): void {
    // No-op: Using CSS-based charts
    return;
  }

  initializeStatusChart(): void {
    // No-op: Using CSS-based charts
    return;
  }

  initializeTeamChart(): void {
    // No-op: Using CSS-based charts
    return;
  }

  private loadClientsAsync(retryCount: number = 0): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('Admin Dashboard - Starting to load clients... Attempt:', retryCount + 1);
      // Admin dashboard should still show all clients
      this.clientService.getClients().subscribe({
        next: (response) => {
          console.log('Admin Dashboard - Raw API response:', response);
          this.clients = response.clients || [];
          console.log('Admin Dashboard - Total clients loaded:', this.clients.length);
          console.log('Admin Dashboard - Sample client data:', this.clients[0]);
          
          // Calculate stats immediately after loading clients
          this.calculateStats();
          console.log('Admin Dashboard - Stats calculated:', this.stats);
          resolve();
        },
        error: (error) => {
          console.error('Error loading clients:', error);
          
          // Retry logic for network errors and 404s (server might be deploying)
          if ((error.status === 0 || error.status === 404 || error.status >= 500) && retryCount < 2) {
            console.log(`Admin Dashboard - Retrying client load in ${(retryCount + 1) * 2} seconds... (Attempt ${retryCount + 2}/3)`);
            
            setTimeout(() => {
              this.loadClientsAsync(retryCount + 1).then(resolve).catch(resolve);
            }, (retryCount + 1) * 2000); // 2s, 4s delays
            return;
          }
          
          // Handle specific error types
          if (error.status === 404) {
            console.warn('Clients endpoint returned 404 - API may be deploying or unavailable');
            this.showError('Unable to load clients. The server may be updating. Please try again in a few moments.');
          } else if (error.status === 0) {
            console.warn('Network error - server may be unreachable');
            this.showError('Network error. Please check your connection and try again.');
          } else {
            console.error('Unexpected error loading clients:', error);
            this.showError('Failed to load clients. Please try again later.');
          }
          
          // Set empty array on error to prevent undefined issues
          this.clients = [];
          this.calculateStats(); // Calculate with empty data
          
          // Don't reject - resolve with empty data to continue loading other components
          resolve();
        }
      });
    });
  }

  private loadUserStatsAsync(): Promise<void> {
    return new Promise((resolve) => {
      this.loadUserStats();
      resolve();
    });
  }

  loadLastAdminVisit(): void {
    const lastVisit = localStorage.getItem('lastAdminVisit');
    if (lastVisit) {
      this.lastAdminVisit = new Date(lastVisit);
    }
    // Update last visit time to current time
    localStorage.setItem('lastAdminVisit', new Date().toISOString());
  }

  calculateStats(): void {
    console.log('Admin Dashboard - calculateStats called with clients:', this.clients.length);
    
    if (!this.clients || !Array.isArray(this.clients)) {
      console.warn('Admin Dashboard - clients is not an array:', this.clients);
      this.clients = [];
    }
    
    // Calculate Total Team - if API fails, check if current user exists and show at least 1
    let totalTeam = 0;
    if (this.users && this.users.length > 0) {
      // Normal calculation when API works
      totalTeam = this.users.filter(u => u.email && u.email.startsWith('tmis.') && u.role === 'user').length;
    } else {
      // Fallback: If we have a current user and they're logged in, assume at least some team exists
      // Check if there are any clients created by tmis users
      const clientsWithTmisCreators = this.clients.filter(c => 
        c.created_by_name && (
          c.created_by_name.toLowerCase().includes('tmis') || 
          c.staff_email && c.staff_email.startsWith('tmis.')
        )
      );
      
      // If clients exist with tmis creators, estimate team count
      if (clientsWithTmisCreators.length > 0) {
        const uniqueCreators = new Set(clientsWithTmisCreators.map(c => c.created_by_name || c.staff_email));
        totalTeam = uniqueCreators.size;
        console.log('Admin Dashboard - Estimated team count from client creators:', totalTeam);
      }
    }
    
    this.stats = {
      totalClients: this.clients.length,
      todayNewClients: this.getTodaysNewClientsCount(),
      pendingClients: this.clients.filter(c => c.status === 'pending').length,
      interestedClients: this.clients.filter(c => c.status === 'interested').length,
      notInterestedClients: this.clients.filter(c => c.status === 'not_interested').length,
      onHoldClients: this.clients.filter(c => c.status === 'hold').length,
      processingClients: this.clients.filter(c => c.status === 'processing').length,
      totalTeam: totalTeam
    };
    
    console.log('Admin Dashboard - Stats breakdown:');
    console.log('- Total clients:', this.stats.totalClients);
    console.log('- Today new clients:', this.stats.todayNewClients);
    console.log('- Pending clients:', this.stats.pendingClients);
    console.log('- Interested clients:', this.stats.interestedClients);
    console.log('- Not interested clients:', this.stats.notInterestedClients);
    console.log('- On hold clients:', this.stats.onHoldClients);
    console.log('- Processing clients:', this.stats.processingClients);
    console.log('- Total users array:', this.users);
    console.log('- Total team (final):', this.stats.totalTeam);
    
    // Log client status distribution for debugging
    if (this.clients.length > 0) {
      const statusCounts = this.clients.reduce((acc: { [key: string]: number }, client) => {
        const status = client.status || 'unknown';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});
      console.log('Admin Dashboard - Client status distribution:', statusCounts);
    }
    
    this.generateChartData();
    this.generateWeeklyData();
    this.generatePieChartData();
    
    // Calculate new clients and updates since last visit
    this.calculateNewClientsAndUpdates();
    this.calculateTodayStats();
    
    // Initialize user performance filter
    this.filterUserPerformanceData();
    
    // Update charts after all data is ready - use proper timing
    setTimeout(() => {
      this.updateChartsWithData();
    }, 300);
  }

  getTodaysNewClientsCount(): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.clients.filter(client => {
      if (!client.created_at) return false;
      const clientDate = new Date(client.created_at);
      clientDate.setHours(0, 0, 0, 0);
      return clientDate.getTime() === today.getTime();
    }).length;
  }

  generateChartData(): void {
    // Only include statuses that have actual values > 0
    const allStatuses = [
      {
        label: 'New Clients',
        value: this.stats.todayNewClients,
        color: '#ff9800'
      },
      {
        label: 'Interested',
        value: this.stats.interestedClients,
        color: '#4caf50'
      },
      {
        label: 'Not Interested',
        value: this.stats.notInterestedClients,
        color: '#f44336'
      },
      {
        label: 'On Hold',
        value: this.stats.onHoldClients,
        color: '#ff9800'
      },
      {
        label: 'Processing',
        value: this.stats.processingClients,
        color: '#2196f3'
      },
      {
        label: 'Pending Review',
        value: this.stats.pendingClients,
        color: '#9c27b0'
      }
    ];

    // Include all statuses for legend (even zero values)
    this.chartData = allStatuses.map(status => ({
      ...status,
      percentage: this.stats.totalClients > 0 ? Math.round((status.value / this.stats.totalClients) * 100) : 0
    }));

    console.log('Generated Chart Data:', this.chartData);
    console.log('Client Stats:', this.stats);
    
    this.generatePieSegments();
  }

  // Report 1: New Clients Report Methods
  getTodayNewClients() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.clients.filter(client => {
      if (!client.created_at) return false;
      const clientDate = new Date(client.created_at);
      return this.isSameDay(clientDate, today);
    });
  }

  formatDateTime(dateString: string | undefined): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Report 2: Client Status Report Methods
  getStatusChartData() {
    const statusData = [
      {
        label: 'Interested',
        value: this.stats.interestedClients,
        color: '#4caf50'
      },
      {
        label: 'Not Interested',
        value: this.stats.notInterestedClients,
        color: '#f44336'
      },
      {
        label: 'On Hold',
        value: this.stats.onHoldClients,
        color: '#ff9800'
      },
      {
        label: 'Pending Review',
        value: this.stats.pendingClients,
        color: '#9c27b0'
      },
      {
        label: 'Processing',
        value: this.stats.processingClients,
        color: '#2196f3'
      }
    ];

    const total = statusData.reduce((sum, item) => sum + item.value, 0);
    return statusData.map(item => ({
      ...item,
      percentage: total > 0 ? Math.round((item.value / total) * 100) : 0
    }));
  }

  getStatusSegmentOffset(index: number): number {
    const statusData = this.getStatusChartData();
    let totalPercentage = 0;
    for (let i = 0; i < index; i++) {
      if (statusData[i].value > 0) {
        totalPercentage += statusData[i].percentage;
      }
    }
    const circumference = 753.98;
    return -(totalPercentage / 100) * circumference;
  }

  getStatusTotal(): number {
    return this.stats.interestedClients + this.stats.notInterestedClients + 
           this.stats.onHoldClients + this.stats.pendingClients + this.stats.processingClients;
  }

  // Weekly Data for Report 1
  generateWeeklyData(): void {
    console.log('=== GENERATING WEEKLY DATA ===');
    
    // Get the selected week range
    const selectedRange = this.weekRanges[this.selectedWeekOption];
    if (!selectedRange) {
      console.warn('No selected range found, using current week');
      const today = new Date();
      const currentWeekStart = this.getWeekStart(today);
      const currentWeekEnd = new Date(currentWeekStart);
      currentWeekEnd.setDate(currentWeekStart.getDate() + 6);
      this.generateWeeklyDataForRange(currentWeekStart, currentWeekEnd);
      return;
    }
    
    console.log('Selected range:', selectedRange);
    this.generateWeeklyDataForRange(selectedRange.start, selectedRange.end);
  }

  generateWeeklyDataForRange(startDate: Date, endDate: Date): void {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Calculate number of days in range (inclusive of both start and end dates)
    // For a week: Mon to Sun = 7 days
    const daysDifference = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    // For standard weeks (Mon-Sun), ensure we only show 7 days
    const daysToShow = (daysDifference === 8) ? 7 : daysDifference;
    console.log('Generating data for', daysToShow, 'days (calculated:', daysDifference, ')');
    
    // Initialize weekly data array
    this.weeklyData = [];
    
    // For exactly 7 days (normal week), ensure we show Mon-Sun with dates
    const isNormalWeek = daysToShow === 7;
    
    // Process each day in the range
    for (let i = 0; i < daysToShow; i++) {
      const dayDate = new Date(startDate);
      dayDate.setDate(startDate.getDate() + i);
      dayDate.setHours(0, 0, 0, 0);
      
      // Count clients for this day from selectedWeekData
      const dayClients = this.selectedWeekData.filter(client => {
        if (!client.created_at) return false;
        const clientDate = new Date(client.created_at);
        return this.isSameDay(clientDate, dayDate);
      });
      
      const isHoliday = dayDate.getDay() === 0; // Sunday is holiday
      const dayOfWeek = dayNames[dayDate.getDay()];
      
      // For normal week (7 days), show day names with dates (Mon 27/10)
      // For ranges > 7 days, show date only
      let displayLabel: string;
      if (daysToShow === 7) {
        // Show day name with date for normal week (Mon-Sun)
        displayLabel = `${dayOfWeek} ${dayDate.getDate()}/${dayDate.getMonth() + 1}`;
      } else if (daysToShow > 7) {
        // Show date only for longer ranges
        displayLabel = `${dayDate.getDate()}/${dayDate.getMonth() + 1}`;
      } else {
        // For shorter ranges, show day name only
        displayLabel = dayOfWeek;
      }
      
      this.weeklyData.push({
        day: displayLabel,
        fullDay: dayOfWeek,
        date: new Date(dayDate),
        count: dayClients.length,
        isToday: this.isSameDay(dayDate, today),
        barHeight: 0, // Will be calculated based on max count
        isHoliday: isHoliday
      });
      
      console.log(`${displayLabel} (${dayDate.toDateString()}): ${dayClients.length} clients`);
    }
    
    // Calculate max count for scaling
    const maxCount = Math.max(...this.weeklyData.map(day => day.count), 1);
    console.log('Max count for scaling:', maxCount);
    
    // Update bar heights based on max count with better scaling
    this.weeklyData = this.weeklyData.map(day => ({
      ...day,
      barHeight: day.count > 0 ? Math.max((day.count / maxCount) * 80, 20) + 10 : 0
    }));
    
    console.log('Generated weekly data:', this.weeklyData);
  }

  getWeekStart(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0); // Reset time to start of day
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday as start
    const weekStart = new Date(d.setDate(diff));
    weekStart.setHours(0, 0, 0, 0); // Ensure start of day
    return weekStart;
  }

  isSameDay(date1: Date, date2: Date): boolean {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  }

  // Pie Chart Data and Methods
  pieChartData: any[] = [];
  pieSegments: any[] = [];

  generatePieChartData(): void {
    this.pieChartData = [
      {
        label: 'Interested',
        value: this.stats.interestedClients,
        color: '#4caf50',
        percentage: this.stats.totalClients > 0 ? Math.round((this.stats.interestedClients / this.getStatusTotal()) * 100) : 0
      },
      {
        label: 'Not Interested',
        value: this.stats.notInterestedClients,
        color: '#f44336',
        percentage: this.stats.totalClients > 0 ? Math.round((this.stats.notInterestedClients / this.getStatusTotal()) * 100) : 0
      },
      {
        label: 'On Hold',
        value: this.stats.onHoldClients,
        color: '#ff9800',
        percentage: this.stats.totalClients > 0 ? Math.round((this.stats.onHoldClients / this.getStatusTotal()) * 100) : 0
      },
      {
        label: 'Pending Review',
        value: this.stats.pendingClients,
        color: '#9c27b0',
        percentage: this.stats.totalClients > 0 ? Math.round((this.stats.pendingClients / this.getStatusTotal()) * 100) : 0
      },
      {
        label: 'Processing',
        value: this.stats.processingClients,
        color: '#2196f3',
        percentage: this.stats.totalClients > 0 ? Math.round((this.stats.processingClients / this.getStatusTotal()) * 100) : 0
      }
    ].filter(item => item.value > 0);

    this.generatePieSegments();
  }

  generatePieSegments(): void {
    let currentAngle = 0;
    const centerX = 150;
    const centerY = 150;
    const radius = 120;

    this.pieSegments = this.pieChartData.map(item => {
      const angle = (item.percentage / 100) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;

      const startAngleRad = (startAngle - 90) * (Math.PI / 180);
      const endAngleRad = (endAngle - 90) * (Math.PI / 180);

      const x1 = centerX + radius * Math.cos(startAngleRad);
      const y1 = centerY + radius * Math.sin(startAngleRad);
      const x2 = centerX + radius * Math.cos(endAngleRad);
      const y2 = centerY + radius * Math.sin(endAngleRad);

      const largeArcFlag = angle > 180 ? 1 : 0;

      const path = `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

      currentAngle += angle;

      return {
        path: path,
        color: item.color
      };
    });
  }

  // Update 3D Pie Chart Data for Report 2
  updateStatusChart(): void {
    // No-op: Using CSS-based charts
    return;
  }

  updateWeeklyChart(): void {
    // No-op: Using CSS-based charts
    return;
  }

  // Helper method to lighten colors for hover effect
  lightenColor(color: string, percent: number): string {
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
  }

  // Report 3: Team Performance Report Methods
  getAverageClientsPerMember(): number {
    const tmisUsers = this.users.filter(u => u.email && u.email.startsWith('tmis.') && u.role === 'user');
    return tmisUsers.length > 0 ? Math.round(this.stats.totalClients / tmisUsers.length) : 0;
  }

  getUserPerformanceStats(): any[] {
    console.log('Getting user performance stats...');
    console.log('Available users:', this.users);
    console.log('Available clients:', this.clients.length);
    
    // First try to get team members from users array
    let teamMembers = this.users.filter(u => u.role === 'user');
    console.log('Team members from users API:', teamMembers);
    
    // If no team members from API, extract from client data
    if (teamMembers.length === 0 && this.clients.length > 0) {
      console.log('No team members from API, extracting from client data...');
      
      // Get unique creators from clients who have tmis emails or are staff
      const uniqueCreators = new Map();
      
      this.clients.forEach(client => {
        let creatorEmail = '';
        let creatorName = '';
        
        // Check various fields for creator information
        if (client.created_by && client.created_by.includes('@')) {
          creatorEmail = client.created_by;
        } else if (client.staff_email && client.staff_email.includes('@')) {
          creatorEmail = client.staff_email;
        }
        
        // Get creator name
        if (client.created_by_name) {
          creatorName = client.created_by_name;
        } else if (client.staff_name) {
          creatorName = client.staff_name;
        } else if (creatorEmail) {
          // Extract name from email (e.g., tmis.john@example.com -> john)
          const emailParts = creatorEmail.split('@')[0].split('.');
          creatorName = emailParts.length > 1 ? emailParts[1] : emailParts[0];
          creatorName = creatorName.charAt(0).toUpperCase() + creatorName.slice(1);
        }
        
        // Only include if it's a tmis user or has valid creator info
        if (creatorEmail && (creatorEmail.startsWith('tmis.') || creatorName)) {
          if (!uniqueCreators.has(creatorEmail)) {
            uniqueCreators.set(creatorEmail, {
              id: creatorEmail, // Add 'id' property
              email: creatorEmail,
              username: creatorName || creatorEmail.split('@')[0],
              role: 'user'
            });
          }
        }
      });
      
      teamMembers = Array.from(uniqueCreators.values());
      console.log('Team members extracted from clients:', teamMembers);
    }
    
    // If still no team members, create mock data to show the chart structure
    if (teamMembers.length === 0) {
      console.log('No team members found, creating sample data...');
      teamMembers = [
        { id: 'mock-user-1', email: 'tmis.user1@example.com', username: 'User1', role: 'user' },
        { id: 'mock-user-2', email: 'tmis.user2@example.com', username: 'User2', role: 'user' }
      ];
    }
    
    console.log('Final team members for chart:', teamMembers);
    
    // Calculate performance stats for each team member
    const performanceStats = teamMembers.map(user => {
      const userClients = this.getClientsByUser(user.email);
      const clientCount = userClients.length;
      
      return {
        id: user.id, // Add 'id' property
        username: user.username || user.email.split('@')[0],
        email: user.email,
        totalClients: clientCount,
        today: this.getTodayClientsByUser(user.email),
        thisMonth: this.getThisMonthClientsByUser(user.email)
      };
    });
    
    console.log('Performance stats calculated:', performanceStats);
    return performanceStats;
  }

  getClientsByUser(email: string): any[] {
    if (!email) return [];
    
    // First try to get clients by created_by field
    let userClients = this.clients.filter(client => {
      // Check multiple fields for user association
      return client.created_by === email || 
             client.staff_email === email ||
             (client.created_by && client.created_by.toLowerCase() === email.toLowerCase()) ||
             (client.staff_email && client.staff_email.toLowerCase() === email.toLowerCase());
    });
    
    // If no clients found and email is a TMIS email, also check by username
    if (userClients.length === 0 && email.startsWith('tmis.')) {
      const username = email.split('.')[1]; // Extract username from tmis.username@domain.com
      userClients = this.clients.filter(client => {
        // Check if created_by_name or staff_name matches the username
        return (client.created_by_name && client.created_by_name.toLowerCase().includes(username.toLowerCase())) ||
               (client.staff_name && client.staff_name.toLowerCase().includes(username.toLowerCase()));
      });
    }
    
    return userClients;
  }

  getTodayClientsByUser(email: string): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.getClientsByUser(email).filter(client => {
      if (!client.created_at) return false;
      const createdAt = new Date(client.created_at);
      createdAt.setHours(0, 0, 0, 0);
      return createdAt.getTime() === today.getTime();
    }).length;
  }

  getThisMonthClientsByUser(email: string): number {
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);
    return this.getClientsByUser(email).filter(client => {
      if (!client.created_at) return false;
      const clientDate = new Date(client.created_at);
      return clientDate >= thisMonth;
    }).length;
  }

  loadUserStats(): void {
    console.log('Admin Dashboard - Loading user stats...');
    this.authService.getUsers().subscribe({
      next: (response: any) => {
        console.log('Admin Dashboard - Raw users API response:', response);
        this.users = response.users || [];
        console.log('Admin Dashboard - Total users loaded:', this.users.length);
        console.log('Admin Dashboard - Users data:', this.users);
        
        // Debug: Check each user's email and role
        this.users.forEach((user, index) => {
          console.log(`User ${index + 1}: Email=${user.email}, Role=${user.role}, Starts with tmis=${user.email?.startsWith('tmis.')}`);
        });
        
        // Calculate user stats
        this.userStats = {
          totalUsers: this.users.length,
          loggedInUsers: this.users.filter((u: User) => (u as any).isLoggedIn).length,
          loggedOutUsers: this.users.filter((u: User) => !(u as any).isLoggedIn).length
        };
        
        console.log('Admin Dashboard - User stats calculated:', this.userStats);
        
        // Debug Total Team calculation
        const tmisUsers = this.users.filter(u => u.email && u.email.startsWith('tmis.') && u.role === 'user');
        console.log('Admin Dashboard - TMIS users for Total Team:', tmisUsers);
        console.log('Admin Dashboard - Total Team count will be:', tmisUsers.length);
        
        // Recalculate main stats with updated user data
        this.calculateStats();
      },
      error: (error) => {
        console.error('Admin Dashboard - Error loading users from API:', error);
        console.log('Admin Dashboard - API Error Details:', {
          status: error.status,
          statusText: error.statusText,
          message: error.message,
          url: error.url
        });
        console.log('Admin Dashboard - Setting empty users array due to API error');
        // Set empty array and recalculate stats
        this.users = [];
        
        this.userStats = {
          totalUsers: 0,
          loggedInUsers: 0,
          loggedOutUsers: 0
        };
        
        console.log('Admin Dashboard - Empty user stats set:', this.userStats);
        
        // Still calculate stats with empty user data
        this.calculateStats();
      }
    });
  }

  loadMockUserData(): void {
    // This method is no longer used to prevent incorrect Total Team counts
    console.log('Admin Dashboard - Mock user data method called but not loading mock data');
    this.users = [];
    
    this.userStats = {
      totalUsers: 0,
      loggedInUsers: 0,
      loggedOutUsers: 0
    };
    
    console.log('Admin Dashboard - No mock users loaded to ensure accurate Total Team count');
    
    if (this.clients.length > 0) {
      this.calculateStats();
    }
  }

  calculateNewClientsAndUpdates(): void {
    if (!this.lastAdminVisit) {
      // If no previous visit, consider all clients as new
      this.newClientsCount = this.clients.length;
      this.updatedClientsCount = 0;
      return;
    }

    // Count clients created after last admin visit
    this.newClientsCount = this.clients.filter(client => {
      if (!client.created_at) return false;
      const createdAt = new Date(client.created_at);
      return createdAt > this.lastAdminVisit!;
    }).length;

    // Count clients updated after last admin visit (if they have updated_at field)
    this.updatedClientsCount = this.clients.filter(client => {
      if (!client.updated_at || !client.created_at) return false;
      const updatedAt = new Date(client.updated_at);
      const createdAt = new Date(client.created_at);
      // Only count as update if updated after creation and after last admin visit
      return updatedAt > createdAt && updatedAt > this.lastAdminVisit!;
    }).length;
  }

  calculateTodayStats(): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Count clients created today
    this.todayStats.newClientsToday = this.clients.filter(client => {
      if (!client.created_at) return false;
      const createdAt = new Date(client.created_at);
      createdAt.setHours(0, 0, 0, 0);
      return createdAt.getTime() === today.getTime();
    }).length;

    // Calculate user-wise client counts for today
    const userCounts = new Map<string, number>();
    
    this.clients.forEach(client => {
      if (!client.created_at) return;
      const createdAt = new Date(client.created_at);
      createdAt.setHours(0, 0, 0, 0);
      
      if (createdAt.getTime() === today.getTime()) {
        const username = client.created_by_name || 'Unknown User';
        userCounts.set(username, (userCounts.get(username) || 0) + 1);
      }
    });

    this.todayStats.userClientCounts = Array.from(userCounts.entries()).map(([username, count]) => ({
      username,
      count
    })).sort((a, b) => b.count - a.count);
  }

  getTodaysNewClients(): Client[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return this.clients.filter(client => {
      if (!client.created_at) return false;
      const createdAt = new Date(client.created_at);
      createdAt.setHours(0, 0, 0, 0);
      return createdAt.getTime() === today.getTime();
    }).sort((a, b) => {
      const dateA = new Date(a.created_at!).getTime();
      const dateB = new Date(b.created_at!).getTime();
      return dateB - dateA; // Newest first
    });
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'interested': return '#4caf50';
      case 'not_interested': return '#f44336';
      case 'hold': return '#ff9800';
      case 'pending': return '#9c27b0';
      case 'processing': return '#2196f3';
      default: return '#666';
    }
  }

  getDisplayedColumns(): string[] {
    return this.displayedColumns;
  }

  getMaxChartValue(): number {
    return Math.max(...this.chartData.map(item => item.value), 1);
  }

  getSegmentDashArray(percentage: number): string {
    const circumference = 2 * Math.PI * 120;
    const segmentLength = (percentage / 100) * circumference;
    return `${segmentLength} ${circumference}`;
  }

  getSegmentOffset(index: number): number {
    let totalPercentage = 0;
    for (let i = 0; i < index; i++) {
      if (this.chartData[i].value > 0) {
        totalPercentage += this.chartData[i].percentage;
      }
    }
    const circumference = 753.98;
    return -(totalPercentage / 100) * circumference;
  }

  getSegmentRotation(index: number): number {
    let totalPercentage = 0;
    for (let i = 0; i < index; i++) {
      if (this.chartData[i].value > 0) {
        totalPercentage += this.chartData[i].percentage;
      }
    }
    return (totalPercentage / 100) * 360 - 90; // -90 to start from top
  }

  get pendingClients(): Client[] {
    return this.clients.filter(c => c.status === 'pending');
  }

  get pendingClientsCount(): number {
    return this.pendingClients.length;
  }

  get limitedPendingClients(): Client[] {
    return this.pendingClients.slice(0, 5);
  }

  getClientsByStatus(status: string): Client[] {
    if (status === 'pending') {
      return this.clients.filter(c => c.status === 'pending' || c.status === 'Pending');
    }
    return this.clients.filter(c => c.status === status);
  }

  // Client action methods
  viewClientDetails(client: Client): void {
    this.router.navigate(['/clients', client._id]);
  }

  editClient(client: Client): void {
    this.router.navigate(['/clients', client._id, 'edit']);
  }

  updateClientStatus(client: Client, newStatus: string): void {
    console.log(`🚀 Admin updating client status: ${client.legal_name || client.user_name} -> ${newStatus}`);
    
    this.clientService.updateClientStatus(client._id, newStatus, client.feedback || '').subscribe({
      next: (response) => {
        console.log('🔍 Admin status update response:', response);
        
        // Update the client in the local array
        const index = this.clients.findIndex(c => c._id === client._id);
        if (index !== -1) {
          this.clients[index] = response.client;
        }
        
        // Recalculate stats
        this.calculateStats();
        
        // Check email notification status
        let message = `Client status updated to ${newStatus}`;
        let panelClass = ['success-snackbar'];
        
        if (response.email_sent === true) {
          console.log('📧 Admin action: Email notifications sent successfully');
          message += ' & email notifications sent';
        } else if (response.email_sent === false) {
          console.warn('⚠️ Admin action: Email notifications failed');
          message += ' but email notifications failed';
          panelClass = ['warning-snackbar'];
        } else {
          console.log('📧 Admin action: Email notification status unknown');
        }
        
        this.snackBar.open(message, 'Close', {
          duration: 4000,
          horizontalPosition: 'right',
          verticalPosition: 'top',
          panelClass: panelClass
        });
      },
      error: (error) => {
        console.error('❌ Error updating client status:', error);
        this.snackBar.open('Failed to update client status', 'Close', {
          duration: 3000,
          horizontalPosition: 'right',
          verticalPosition: 'top',
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  openWhatsApp(mobileNumber: string): void {
    if (!mobileNumber) {
      this.snackBar.open('No mobile number available', 'Close', {
        duration: 3000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
      return;
    }
    
    // Remove any non-digit characters and ensure it starts with country code
    const cleanNumber = mobileNumber.replace(/\D/g, '');
    const whatsappNumber = cleanNumber.startsWith('91') ? cleanNumber : `91${cleanNumber}`;
    const whatsappUrl = `https://wa.me/${whatsappNumber}`;
    
    window.open(whatsappUrl, '_blank');
  }

  deleteClient(client: Client): void {
    const dialogRef = this.dialog.open(ConfirmDeleteDialogComponent, {
      data: {
        title: 'Delete Client',
        message: `Are you sure you want to delete ${client.user_name}? This action cannot be undone.`
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.clientService.deleteClient(client._id).subscribe({
          next: () => {
            // Remove the client from the local array
            this.clients = this.clients.filter(c => c._id !== client._id);
            
            // Recalculate stats
            this.calculateStats();
            
            this.snackBar.open('Client deleted successfully', 'Close', {
              duration: 3000,
              horizontalPosition: 'right',
              verticalPosition: 'top'
            });
          },
          error: (error) => {
            console.error('Error deleting client:', error);
            this.snackBar.open('Failed to delete client', 'Close', {
              duration: 3000,
              horizontalPosition: 'right',
              verticalPosition: 'top'
            });
          }
        });
      }
    });
  }

  getStatusRowClass(status: string): string {
    return `${status}-row`;
  }

  // Notification management methods
  hasNewUpdates(): boolean {
    return this.getNewClients().length > 0 || this.getUpdatedClients().length > 0;
  }

  hasNotificationsToClear(): boolean {
    const clearedNotifications = localStorage.getItem('clearedNotifications');
    return clearedNotifications !== null;
  }

  getNewClients(): Client[] {
    if (!this.lastAdminVisit) return [];
    
    return this.clients.filter(client => {
      if (!client.created_at) return false;
      const createdAt = new Date(client.created_at);
      return createdAt > this.lastAdminVisit!;
    }).slice(0, 5); // Limit to 5 most recent
  }

  getUpdatedClients(): Client[] {
    if (!this.lastAdminVisit) return [];
    
    return this.clients.filter(client => {
      if (!client.updated_at || !client.created_at) return false;
      const updatedAt = new Date(client.updated_at);
      const createdAt = new Date(client.created_at);
      return updatedAt > createdAt && updatedAt > this.lastAdminVisit!;
    }).slice(0, 5); // Limit to 5 most recent
  }

  getTimeAgo(dateString: string | undefined): string {
    if (!dateString) return 'Unknown time';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString();
  }

  clearAllNotifications(): void {
    // Update the last admin visit to current time to clear notifications
    const now = new Date().toISOString();
    localStorage.setItem('lastAdminVisit', now);
    this.lastAdminVisit = new Date(now);
    
    // Recalculate stats to update counts
    this.calculateStats();
    
    this.snackBar.open('All notifications cleared', 'Close', {
      duration: 2000,
      horizontalPosition: 'right',
      verticalPosition: 'top'
    });
  }

  // Helper method to safely get client properties
  getClientProperty(client: Client, property: string): any {
    return client[property as keyof Client] || 'N/A';
  }

  getHighestStatusPercentage(): number {
    const statusData = this.getStatusChartData();
    if (!statusData || statusData.length === 0) return 0;
    return Math.max(...statusData.map(item => item.percentage));
  }

  debugAllUsers(): void {
    console.log('=== DEBUGGING ALL USERS IN DATABASE ===');
    this.authService.debugAllUsers().subscribe({
      next: (response) => {
        console.log('Debug Users Response:', response);
        console.log('Total users in DB:', response.counts?.total || 0);
        console.log('Admin users:', response.counts?.admin || 0);
        console.log('Regular users:', response.counts?.user || 0);
        console.log('TMIS email users:', response.counts?.tmis_email || 0);
        console.log('TMIS users (for Total Team):', response.counts?.tmis_users || 0);
        
        if (response.users && response.users.length > 0) {
          console.log('All users in database:');
          response.users.forEach((user: any, index: number) => {
            console.log(`${index + 1}. ${user.email} - Role: ${user.role} - Username: ${user.username}`);
          });
        } else {
          console.log('NO USERS FOUND IN DATABASE!');
        }
      },
      error: (error) => {
        console.error('Error debugging users:', error);
      }
    });
  }

  updateChartsWithData(): void {
    // No-op: Using CSS-based charts
    return;
  }

  // Week Selection Methods
  initializeWeekRanges() {
    const today = new Date();
    const currentWeekStart = this.getWeekStart(today);
    
    console.log('=== INITIALIZING WEEK RANGES ===');
    console.log('Today:', today);
    console.log('Today ISO:', today.toISOString());
    console.log('Current week start:', currentWeekStart);
    console.log('Current week start ISO:', currentWeekStart.toISOString());
    console.log('Current week end:', this.getWeekEnd(currentWeekStart));
    console.log('Current week end ISO:', this.getWeekEnd(currentWeekStart).toISOString());

    this.weekRanges = {
      'current': {
        start: currentWeekStart,
        end: this.getWeekEnd(currentWeekStart)
      },
      'last1': {
        start: this.getWeekStart(this.subtractDays(currentWeekStart, 7)),
        end: this.getWeekEnd(this.getWeekStart(this.subtractDays(currentWeekStart, 7)))
      },
      'last2': {
        start: this.getWeekStart(this.subtractDays(currentWeekStart, 14)),
        end: this.getWeekEnd(this.getWeekStart(this.subtractDays(currentWeekStart, 14)))
      },
      'last3': {
        start: this.getWeekStart(this.subtractDays(currentWeekStart, 21)),
        end: this.getWeekEnd(this.getWeekStart(this.subtractDays(currentWeekStart, 21)))
      },
      'last4': {
        start: this.getWeekStart(this.subtractDays(currentWeekStart, 28)),
        end: this.getWeekEnd(this.getWeekStart(this.subtractDays(currentWeekStart, 28)))
      }
    };
    
    console.log('Week ranges initialized:', this.weekRanges);
    console.log('Current week range details:');
    console.log('- Start:', this.weekRanges['current'].start);
    console.log('- End:', this.weekRanges['current'].end);
    console.log('- Today falls in range?', today >= this.weekRanges['current'].start && today <= this.weekRanges['current'].end);
  }

  getWeekEnd(startDate: Date): Date {
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6); // Sunday as end of week
    endDate.setHours(23, 59, 59, 999); // End of Sunday
    return endDate;
  }

  subtractDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() - days);
    return result;
  }

  onWeekSelectionChange() {
    this.filterWeeklyData();
    // Chart will update automatically via weeklyData binding
  }

  onCustomDateChange() {
    console.log('Custom date change:', this.customStartDate, this.customEndDate);
    if (this.customStartDate && this.customEndDate) {
      const startDate = new Date(this.customStartDate);
      const endDate = new Date(this.customEndDate);
      
      // Validate dates
      if (startDate > endDate) {
        alert('Start date must be before end date');
        return;
      }
      
      // Calculate date difference
      const daysDifference = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Validate maximum range (31 days)
      if (daysDifference > 31) {
        alert('Date range cannot exceed 31 days (1 month)');
        return;
      }
      
      console.log('Setting custom range:', startDate, endDate, 'Days:', daysDifference);
      this.weekRanges['custom'] = {
        start: startDate,
        end: endDate
      };
      this.filterWeeklyData();
      // Chart will update automatically via weeklyData binding
    }
  }

  filterWeeklyData() {
    const selectedRange = this.weekRanges[this.selectedWeekOption];
    if (!selectedRange) {
      console.log('No selected range found for:', this.selectedWeekOption);
      return;
    }

    console.log('=== FILTERING WEEKLY DATA ===');
    console.log('Selected week option:', this.selectedWeekOption);
    console.log('Selected range:', selectedRange);
    console.log('Total clients to filter:', this.clients.length);
    console.log('Sample client data:', this.clients.slice(0, 3));

    // Filter clients for selected week
    this.selectedWeekData = this.clients.filter(client => {
      if (!client.created_at) {
        console.log('Client missing created_at:', client);
        return false;
      }
      
      const clientDate = new Date(client.created_at);
      // Normalize client date to start of day for comparison
      const clientDateNormalized = new Date(clientDate.getFullYear(), clientDate.getMonth(), clientDate.getDate());
      
      // Normalize range dates for comparison
      const rangeStart = new Date(selectedRange.start.getFullYear(), selectedRange.start.getMonth(), selectedRange.start.getDate());
      const rangeEnd = new Date(selectedRange.end.getFullYear(), selectedRange.end.getMonth(), selectedRange.end.getDate());
      
      const isInRange = clientDateNormalized >= rangeStart && clientDateNormalized <= rangeEnd;
      
      console.log('Client date check:', {
        clientId: client._id,
        originalDate: client.created_at,
        clientDate: clientDate.toISOString(),
        clientDateNormalized: clientDateNormalized.toISOString(),
        rangeStart: rangeStart.toISOString(),
        rangeEnd: rangeEnd.toISOString(),
        isInRange: isInRange
      });
      
      return isInRange;
    });

    console.log('Filtered selectedWeekData count:', this.selectedWeekData.length);
    console.log('Selected week clients:', this.selectedWeekData);

    // Filter clients for previous week (for comparison)
    const prevWeekStart = this.subtractDays(selectedRange.start, 7);
    const prevWeekEnd = this.subtractDays(selectedRange.end, 7);
    console.log('Previous week range:', prevWeekStart, 'to', prevWeekEnd);
    
    this.previousWeekData = this.clients.filter(client => {
      if (!client.created_at) return false;
      const clientDate = new Date(client.created_at);
      const clientDateNormalized = new Date(clientDate.getFullYear(), clientDate.getMonth(), clientDate.getDate());
      const prevStart = new Date(prevWeekStart.getFullYear(), prevWeekStart.getMonth(), prevWeekStart.getDate());
      const prevEnd = new Date(prevWeekEnd.getFullYear(), prevWeekEnd.getMonth(), prevWeekEnd.getDate());
      return clientDateNormalized >= prevStart && clientDateNormalized <= prevEnd;
    });

    console.log('Previous week clients count:', this.previousWeekData.length);
    
    // Regenerate weekly data after filtering
    this.generateWeeklyData();
  }

  refreshWeeklyData() {
    this.loading = true;
    this.loadClientsAsync().then(() => {
      this.filterWeeklyData();
      this.updateWeeklyChart();
      this.snackBar.open('Weekly data refreshed successfully', 'Close', {
        duration: 3000,
        panelClass: ['success-snackbar']
      });
    }).catch(() => {
      this.loading = false;
      this.snackBar.open('Error refreshing data', 'Close', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
    });
  }

  toggleComparison() {
    this.showComparison = !this.showComparison;
    if (this.showComparison) {
      this.filterWeeklyData();
    }
  }

  // Data Getter Methods
  getSelectedWeekSubtitle(): string {
    const selectedRange = this.weekRanges[this.selectedWeekOption];
    if (!selectedRange) return 'Select a week to view data';
    
    const startStr = selectedRange.start.toLocaleDateString('en-US', { 
      month: 'short', day: 'numeric' 
    });
    const endStr = selectedRange.end.toLocaleDateString('en-US', { 
      month: 'short', day: 'numeric', year: 'numeric' 
    });
    
    return `${startStr} - ${endStr}`;
  }

  getSelectedWeekLabel(): string {
    switch (this.selectedWeekOption) {
      case 'current': return 'This Week';
      case 'last1': return 'Last Week';
      case 'last2': return '2 Weeks Ago';
      case 'last3': return '3 Weeks Ago';
      case 'last4': return '4 Weeks Ago';
      case 'custom': return 'Custom Range';
      default: return 'Selected Week';
    }
  }

  getSelectedWeekTotal(): number {
    return this.selectedWeekData.length;
  }

  getSelectedWeekAverage(): number {
    return this.selectedWeekData.length / 7;
  }

  getPreviousWeekTotal(): number {
    return this.previousWeekData.length;
  }

  getWeeklyChange(): number {
    const current = this.getSelectedWeekTotal();
    const previous = this.getPreviousWeekTotal();
    
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  }

  getComparisonClass(): string {
    const change = this.getWeeklyChange();
    if (change > 0) return 'positive-change';
    if (change < 0) return 'negative-change';
    return 'neutral-change';
  }

  getComparisonIcon(): string {
    const change = this.getWeeklyChange();
    if (change > 0) return 'trending_up';
    if (change < 0) return 'trending_down';
    return 'trending_flat';
  }

  // Updated Chart Methods
  getTotalWeeklyClients(): number {
    return this.getSelectedWeekTotal();
  }

  getAverageDaily(): number {
    return this.getSelectedWeekAverage();
  }

  generateDailyData(startDate: Date, endDate: Date): any[] {
    const dailyData = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dayClients = this.selectedWeekData.filter(client => {
        if (!client.created_at) return false;
        const clientDate = new Date(client.created_at);
        return clientDate.toDateString() === currentDate.toDateString();
      });
      
      dailyData.push({
        date: new Date(currentDate),
        day: currentDate.toLocaleDateString('en-US', { weekday: 'short' }),
        count: dayClients.length,
        isWeekend: currentDate.getDay() === 0 || currentDate.getDay() === 6
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return dailyData;
  }

  // Error handling method
  showError(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }

  // Custom dropdown methods for week selection
  toggleWeekDropdown(): void {
    this.isWeekDropdownOpen = !this.isWeekDropdownOpen;
  }

  selectWeekOption(option: string): void {
    this.selectedWeekOption = option;
    this.isWeekDropdownOpen = false;
    this.onWeekSelectionChange();
  }

  // User Performance Filter Methods
  toggleUserPerformanceDropdown(): void {
    this.isUserPerformanceDropdownOpen = !this.isUserPerformanceDropdownOpen;
  }

  selectUserPerformanceFilter(filter: string): void {
    this.selectedUserPerformanceFilter = filter;
    this.isUserPerformanceDropdownOpen = false;
    this.filterUserPerformanceData();
  }

  onUserPerformanceDateChange(): void {
    if (this.userPerformanceStartDate && this.userPerformanceEndDate) {
      const startDate = new Date(this.userPerformanceStartDate);
      const endDate = new Date(this.userPerformanceEndDate);
      
      if (startDate > endDate) {
        alert('Start date must be before end date');
        return;
      }
      
      this.filterUserPerformanceData();
    }
  }

  filterUserPerformanceData(): void {
    let startDate: Date;
    let endDate: Date;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    switch (this.selectedUserPerformanceFilter) {
      case 'today':
        startDate = new Date(today);
        endDate = new Date(today);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'yesterday':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 1);
        endDate = new Date(startDate);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'custom':
        if (!this.userPerformanceStartDate || !this.userPerformanceEndDate) {
          this.filteredUserStats = [];
          return;
        }
        startDate = new Date(this.userPerformanceStartDate);
        endDate = new Date(this.userPerformanceEndDate);
        endDate.setHours(23, 59, 59, 999);
        break;
      default:
        startDate = new Date(today);
        endDate = new Date(today);
        endDate.setHours(23, 59, 59, 999);
    }

    // Filter clients by date range
    const filteredClients = this.clients.filter(client => {
      if (!client.created_at) return false;
      const createdAt = new Date(client.created_at);
      return createdAt >= startDate && createdAt <= endDate;
    });

    // Count clients per user
    const userCounts = new Map<string, number>();
    filteredClients.forEach(client => {
      const username = client.created_by_name || client.staff_name || 'Unknown';
      userCounts.set(username, (userCounts.get(username) || 0) + 1);
    });

    this.filteredUserStats = Array.from(userCounts.entries())
      .map(([username, count]) => ({ username, count }))
      .sort((a, b) => b.count - a.count);
  }

  getUserPerformanceFilterLabel(): string {
    switch (this.selectedUserPerformanceFilter) {
      case 'today': return 'Today';
      case 'yesterday': return 'Yesterday';
      case 'custom': return 'Custom Range';
      default: return 'Select Period';
    }
  }

  getMaxUserPerformanceCount(): number {
    if (this.filteredUserStats.length === 0) return 1;
    return Math.max(...this.filteredUserStats.map(u => u.count), 1);
  }

  // Close dropdown when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    // Check if the click is outside the dropdown
    if (!target.closest('.relative')) {
      this.isWeekDropdownOpen = false;
    }
  }

  // Helper methods for Tailwind CSS visualizations
  getTeamMemberColor(index: number): string {
    const colors = [
      '#4CAF50', // Green
      '#2196F3', // Blue  
      '#FF9800', // Orange
      '#9C27B0', // Purple
      '#F44336', // Red
      '#00BCD4', // Cyan
      '#795548', // Brown
      '#607D8B'  // Blue Grey
    ];
    return colors[index % colors.length];
  }

  getTeamMemberPercentage(clientCount: number): number {
    if (!this.clients || this.clients.length === 0) return 0;
    const maxCount = Math.max(...this.getUserPerformanceStats().map(m => m.totalClients), 1);
    return Math.min((clientCount / maxCount) * 100, 100);
  }

  // Helper method to determine chart type based on date range
  isShortDateRange(): boolean {
    return this.weeklyData.length <= 3;
  }

  getDateRangeDays(): number {
    return this.weeklyData.length;
  }
}
