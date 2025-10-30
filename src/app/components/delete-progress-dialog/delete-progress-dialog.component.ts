import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-delete-progress-dialog',
  templateUrl: './delete-progress-dialog.component.html',
  styleUrls: ['./delete-progress-dialog.component.scss']
})
export class DeleteProgressDialogComponent implements OnInit, OnDestroy {
  progress = 0;
  private intervalId: any;

  constructor(
    public dialogRef: MatDialogRef<DeleteProgressDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { clientName: string }
  ) {
    // Disable closing by clicking outside or pressing ESC
    this.dialogRef.disableClose = true;
  }

  ngOnInit(): void {
    // Start progress animation from 1 to 100 without delay
    this.startProgress();
  }

  ngOnDestroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  private startProgress(): void {
    this.progress = 1;
    
    // Update progress every 10ms to reach 100 in 1 second
    this.intervalId = setInterval(() => {
      if (this.progress < 100) {
        this.progress++;
      } else {
        clearInterval(this.intervalId);
      }
    }, 10);
  }

  // Method to be called externally to close the dialog
  complete(): void {
    this.progress = 100;
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    setTimeout(() => {
      this.dialogRef.close();
    }, 200);
  }
}
