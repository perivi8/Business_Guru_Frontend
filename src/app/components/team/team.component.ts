import { Component, OnInit } from '@angular/core';
import { UserService, User } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-team',
  templateUrl: './team.component.html',
  styleUrls: ['./team.component.scss']
})
export class TeamComponent implements OnInit {
  users: User[] = [];
  loading = true;
  isLoading = true; // Track initial data loading state
  error = '';
  currentUser: any;
  isAdmin = false;
  
  // Dialog states
  showDeleteDialog = false;
  showPauseDialog = false;
  showResumeDialog = false;
  selectedUser: User | null = null;
  
  // Loading states
  isDeleting = false;
  isPausing = false;
  isResuming = false;

  constructor(
    private userService: UserService,
    private authService: AuthService,
    private dialog: MatDialog
  ) { }

  ngOnInit(): void {
    // Check if current user is admin
    this.authService.currentUser.subscribe(user => {
      this.currentUser = user;
      this.isAdmin = user?.role === 'admin';
    });
    
    this.loadUsers();
  }

  loadUsers(): void {
    this.isLoading = true;
    this.userService.getUsers().subscribe({
      next: (response) => {
        // Sort users: admin first, then manager, then user
        this.users = response.users.sort((a, b) => {
          const roleOrder: { [key: string]: number } = { admin: 1, manager: 2, user: 3 };
          return (roleOrder[a.role] || 999) - (roleOrder[b.role] || 999);
        });
        this.loading = false;
        this.isLoading = false;
      },
      error: (error) => {
        this.error = 'Failed to load team members';
        this.loading = false;
        this.isLoading = false;
      }
    });
  }

  deleteUser(user: User): void {
    if (!this.isAdmin) {
      return;
    }

    this.showDeleteDialog = true;
    this.selectedUser = user;
  }

  confirmDelete(): void {
    if (!this.selectedUser) return;
    
    this.isDeleting = true;
    this.authService.deleteUser(this.selectedUser._id).subscribe({
      next: (response) => {
        // Remove user from local array
        this.users = this.users.filter(u => u._id !== this.selectedUser!._id);
        this.isDeleting = false;
        this.showDeleteDialog = false;
        this.selectedUser = null;
      },
      error: (error) => {
        this.isDeleting = false;
        this.showDeleteDialog = false;
        this.selectedUser = null;
      }
    });
  }

  cancelDelete(): void {
    this.showDeleteDialog = false;
    this.selectedUser = null;
  }

  pauseUser(user: User): void {
    if (!this.isAdmin) {
      return;
    }

    this.showPauseDialog = true;
    this.selectedUser = user;
  }

  confirmPause(): void {
    if (!this.selectedUser) return;
    
    this.isPausing = true;
    this.authService.pauseUser(this.selectedUser._id).subscribe({
      next: (response) => {
        // Update user status in local array
        const userIndex = this.users.findIndex(u => u._id === this.selectedUser!._id);
        if (userIndex !== -1) {
          this.users[userIndex] = {...this.users[userIndex], status: 'paused'};
        }
        this.isPausing = false;
        this.showPauseDialog = false;
        this.selectedUser = null;
      },
      error: (error) => {
        this.isPausing = false;
        this.showPauseDialog = false;
        this.selectedUser = null;
      }
    });
  }

  cancelPause(): void {
    this.showPauseDialog = false;
    this.selectedUser = null;
  }

  resumeUser(user: User): void {
    if (!this.isAdmin) {
      return;
    }

    this.showResumeDialog = true;
    this.selectedUser = user;
  }

  confirmResume(): void {
    if (!this.selectedUser) return;
    
    this.isResuming = true;
    this.authService.resumeUser(this.selectedUser._id).subscribe({
      next: (response) => {
        // Update user status in local array
        const userIndex = this.users.findIndex(u => u._id === this.selectedUser!._id);
        if (userIndex !== -1) {
          this.users[userIndex] = {...this.users[userIndex], status: 'active'};
        }
        this.isResuming = false;
        this.showResumeDialog = false;
        this.selectedUser = null;
      },
      error: (error) => {
        this.isResuming = false;
        this.showResumeDialog = false;
        this.selectedUser = null;
      }
    });
  }

  cancelResume(): void {
    this.showResumeDialog = false;
    this.selectedUser = null;
  }

  goBack(): void {
    window.history.back();
  }
}
