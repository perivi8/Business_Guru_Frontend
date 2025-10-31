import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface ConfirmDialogData {
  title: string;
  message: string;
  highlightText?: string; // Text to highlight in the message (e.g., gateway name)
  confirmText?: string;
  cancelText?: string;
  type?: 'warning' | 'info' | 'danger' | 'success';
}

@Component({
  selector: 'app-confirm-dialog',
  templateUrl: './confirm-dialog.component.html',
  styleUrls: ['./confirm-dialog.component.scss']
})
export class ConfirmDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData
  ) {
    // Set defaults
    this.data.confirmText = this.data.confirmText || 'Confirm';
    this.data.cancelText = this.data.cancelText || 'Cancel';
    this.data.type = this.data.type || 'warning';
  }

  // Get message parts for highlighting
  getMessageParts(): { before: string; highlight: string; after: string } | null {
    if (!this.data.highlightText || !this.data.message.includes(this.data.highlightText)) {
      return null;
    }
    
    const index = this.data.message.indexOf(this.data.highlightText);
    return {
      before: this.data.message.substring(0, index),
      highlight: this.data.highlightText,
      after: this.data.message.substring(index + this.data.highlightText.length)
    };
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
