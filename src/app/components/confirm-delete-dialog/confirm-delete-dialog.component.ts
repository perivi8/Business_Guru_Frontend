import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-confirm-delete-dialog',
  templateUrl: './confirm-delete-dialog.component.html',
  styleUrls: ['./confirm-delete-dialog.component.scss']
})
export class ConfirmDeleteDialogComponent {
  isLoading = false;

  constructor(
    public dialogRef: MatDialogRef<ConfirmDeleteDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { name: string }
  ) { }

  onConfirm(): void {
    this.isLoading = true;
    
    // Simulate deletion process - in real implementation, this would be replaced
    // with actual deletion service call
    setTimeout(() => {
      this.dialogRef.close(true);
    }, 2000); // 2 second delay to show loading effect
  }

  onCancel(): void {
    if (!this.isLoading) {
      this.dialogRef.close(false);
    }
  }
}
