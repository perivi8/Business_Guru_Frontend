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
  isLoading = true; // Track initial data loading state

  // Color mapping for each letter A-Z (26 unique colors)
  private letterColors: { [key: string]: string } = {
    'A': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', // Purple
    'B': 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', // Pink-Red
    'C': 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', // Blue
    'D': 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', // Green-Cyan
    'E': 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', // Pink-Yellow
    'F': 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)', // Cyan-Purple
    'G': 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)', // Mint-Pink
    'H': 'linear-gradient(135deg, #ff9a56 0%, #ff6a88 100%)', // Orange-Pink
    'I': 'linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%)', // Pink-Blue
    'J': 'linear-gradient(135deg, #fdcbf1 0%, #e6dee9 100%)', // Light Pink
    'K': 'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)', // Light Blue
    'L': 'linear-gradient(135deg, #d299c2 0%, #fef9d7 100%)', // Purple-Yellow
    'M': 'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)', // Cyan-Blue
    'N': 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)', // Yellow-Orange
    'O': 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)', // Peach
    'P': 'linear-gradient(135deg, #ff6e7f 0%, #bfe9ff 100%)', // Red-Blue
    'Q': 'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)', // Purple-Blue
    'R': 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', // Magenta
    'S': 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', // Sky Blue
    'T': 'linear-gradient(135deg, #c471f5 0%, #fa71cd 100%)', // Purple-Pink
    'U': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', // Indigo
    'V': 'linear-gradient(135deg, #f77062 0%, #fe5196 100%)', // Coral-Pink
    'W': 'linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)', // Orange-Purple
    'X': 'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)', // Lavender
    'Y': 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)', // Cream-Peach
    'Z': 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)'  // Aqua-Pink
  };

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
    this.isLoading = true;
    
    this.clientService.getClients().subscribe({
      next: (response) => {
        // Filter clients with loan status "approved"
        this.approvedClients = response.clients.filter(client => 
          client.loan_status && client.loan_status.toLowerCase() === 'approved'
        );
        
        // Calculate totals
        this.calculateTotals();
        this.loading = false;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading clients:', error);
        this.loading = false;
        this.isLoading = false;
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

  // Get avatar color based on client's first letter
  getAvatarColor(client: Client): string {
    const initial = this.getClientInitial(client);
    return this.letterColors[initial] || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
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