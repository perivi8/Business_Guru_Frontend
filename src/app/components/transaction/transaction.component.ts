import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ClientService, Client } from '../../services/client.service';

export interface Transaction {
  id: string;
  date: string;
  orderId: string;
  amount: number;
  clientId: string;
  clientName: string;
}

@Component({
  selector: 'app-transaction',
  templateUrl: './transaction.component.html',
  styleUrls: ['./transaction.component.scss']
})
export class TransactionComponent implements OnInit {
  approvedClients: Client[] = [];
  totalTransactions = 0;
  totalAmount = 0;
  loading = false;

  constructor(
    private router: Router,
    private clientService: ClientService
  ) {}

  ngOnInit(): void {
    this.loadApprovedClientsData();
  }

  // Load approved clients and calculate totals
  loadApprovedClientsData(): void {
    this.loading = true;
    
    this.clientService.getClients().subscribe({
      next: (response) => {
        // Filter clients with loan status "approved"
        this.approvedClients = response.clients.filter(client => 
          client.loan_status && client.loan_status.toLowerCase() === 'approved'
        );
        
        // Calculate totals
        this.calculateTotals();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading clients:', error);
        this.loading = false;
      }
    });
  }

  // Calculate total transactions and amount for all approved clients
  calculateTotals(): void {
    let totalTxns = 0;
    let totalAmt = 0;

    this.approvedClients.forEach(client => {
      const clientTransactions = this.getClientTransactions(client._id);
      totalTxns += clientTransactions.length;
      totalAmt += clientTransactions.reduce((sum, txn) => sum + txn.amount, 0);
    });

    this.totalTransactions = totalTxns;
    this.totalAmount = totalAmt;
  }

  // Get transactions for a specific client from localStorage
  getClientTransactions(clientId: string): Transaction[] {
    const storedTransactions = localStorage.getItem(`transactions_${clientId}`);
    if (storedTransactions) {
      return JSON.parse(storedTransactions);
    }
    return [];
  }

  // Calculate total transaction amount for a client
  getTotalTransactionAmount(clientId: string): number {
    const transactions = this.getClientTransactions(clientId);
    return transactions.reduce((total, transaction) => total + transaction.amount, 0);
  }

  // Get total number of transactions for a client
  getTotalTransactionCount(clientId: string): number {
    const transactions = this.getClientTransactions(clientId);
    return transactions.length;
  }

  // Get the first letter of client name for profile icon
  getClientInitial(client: Client): string {
    const name = client.legal_name || client.user_name || client.trade_name || client.business_name || 'N';
    return name.charAt(0).toUpperCase();
  }

  // Get client display name
  getClientDisplayName(client: Client): string {
    return client.legal_name || client.user_name || 'Unknown Client';
  }

  // Get client business name
  getClientBusinessName(client: Client): string {
    return client.trade_name || client.business_name || 'No business name';
  }

  // Navigate to approved clients page
  navigateToApprovedClients(): void {
    this.router.navigate(['/approved-clients']);
  }
}