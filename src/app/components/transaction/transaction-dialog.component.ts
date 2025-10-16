import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Client } from '../../services/client.service';

export interface Transaction {
  id: string;
  date: string;
  orderId: string;
  amount: number;
  clientId: string;
  clientName: string;
}

@Component({
  selector: 'app-transaction-dialog',
  templateUrl: './transaction-dialog.component.html',
  styleUrls: ['./transaction-dialog.component.scss']
})
export class TransactionDialogComponent implements OnInit {
  transactions: Transaction[] = [];
  newTransaction = {
    date: '',
    orderId: '',
    amount: null as number | null
  };

  constructor(
    public dialogRef: MatDialogRef<TransactionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { client: Client }
  ) {}

  ngOnInit(): void {
    // Load existing transactions for this client from localStorage
    this.loadTransactions();
  }

  loadTransactions(): void {
    const storedTransactions = localStorage.getItem(`transactions_${this.data.client._id}`);
    if (storedTransactions) {
      this.transactions = JSON.parse(storedTransactions);
    }
  }

  saveTransactions(): void {
    localStorage.setItem(`transactions_${this.data.client._id}`, JSON.stringify(this.transactions));
  }

  addTransaction(): void {
    if (this.newTransaction.date && this.newTransaction.orderId && this.newTransaction.amount) {
      const transaction: Transaction = {
        id: Date.now().toString(),
        date: this.newTransaction.date,
        orderId: this.newTransaction.orderId,
        amount: this.newTransaction.amount,
        clientId: this.data.client._id,
        clientName: this.data.client.legal_name || this.data.client.user_name || 'N/A'
      };

      this.transactions.push(transaction);
      this.saveTransactions();

      // Reset form
      this.newTransaction = {
        date: '',
        orderId: '',
        amount: null
      };
      
      // Notify parent component that a transaction was added
      this.dialogRef.close(true);
    }
  }

  deleteTransaction(id: string): void {
    this.transactions = this.transactions.filter(transaction => transaction.id !== id);
    this.saveTransactions();
  }

  // Calculate total transaction amount for the client
  getTotalTransactionAmount(): number {
    return this.transactions.reduce((total, transaction) => total + transaction.amount, 0);
  }

  // Get total number of transactions for the client
  getTotalTransactionCount(): number {
    return this.transactions.length;
  }

  onClose(): void {
    this.dialogRef.close();
  }
}