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
  error = '';
  currentUser: any;
  isAdmin = false;

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
    this.userService.getUsers().subscribe({
      next: (response) => {
        this.users = response.users;
        this.loading = false;
      },
      error: (error) => {
        this.error = 'Failed to load team members';
        this.loading = false;
      }
    });
  }

  deleteUser(user: User): void {
    if (!this.isAdmin) {
      return;
    }

    const confirmDelete = confirm(`Are you sure you want to delete ${user.username}? This action cannot be undone.`);
    
    if (confirmDelete) {
      this.authService.deleteUser(user._id).subscribe({
        next: (response) => {
          // Remove user from local array
          this.users = this.users.filter(u => u._id !== user._id);
          alert(`${user.username} has been deleted successfully.`);
        },
        error: (error) => {
          alert(`Failed to delete user: ${error.error?.error || 'Unknown error'}`);
        }
      });
    }
  }

  pauseUser(user: User): void {
    if (!this.isAdmin) {
      return;
    }

    const confirmPause = confirm(`Are you sure you want to pause ${user.username}? They will not appear in staff selection dropdowns.`);
    
    if (confirmPause) {
      this.authService.pauseUser(user._id).subscribe({
        next: (response) => {
          // Update user status in local array
          const userIndex = this.users.findIndex(u => u._id === user._id);
          if (userIndex !== -1) {
            this.users[userIndex] = {...this.users[userIndex], status: 'paused'};
          }
          alert(`${user.username} has been paused successfully.`);
        },
        error: (error) => {
          alert(`Failed to pause user: ${error.error?.error || 'Unknown error'}`);
        }
      });
    }
  }

  resumeUser(user: User): void {
    if (!this.isAdmin) {
      return;
    }

    const confirmResume = confirm(`Are you sure you want to resume ${user.username}? They will appear in staff selection dropdowns again.`);
    
    if (confirmResume) {
      this.authService.resumeUser(user._id).subscribe({
        next: (response) => {
          // Update user status in local array
          const userIndex = this.users.findIndex(u => u._id === user._id);
          if (userIndex !== -1) {
            this.users[userIndex] = {...this.users[userIndex], status: 'active'};
          }
          alert(`${user.username} has been resumed successfully.`);
        },
        error: (error) => {
          alert(`Failed to resume user: ${error.error?.error || 'Unknown error'}`);
        }
      });
    }
  }

  goBack(): void {
    window.history.back();
  }
}
