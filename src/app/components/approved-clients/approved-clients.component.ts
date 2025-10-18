import { Component, OnInit } from '@angular/core';
import { ClientService, Client } from '../../services/client.service';
import { MatDialog } from '@angular/material/dialog';
import { TransactionDialogComponent } from '../transaction/transaction-dialog.component';
import { Router } from '@angular/router';

export interface Transaction {
  id: string;
  date: string;
  orderId: string;
  amount: number;
  clientId: string;
  clientName: string;
}

@Component({
  selector: 'app-approved-clients',
  templateUrl: './approved-clients.component.html',
  styleUrls: ['./approved-clients.component.scss']
})
export class ApprovedClientsComponent implements OnInit {
  approvedClients: Client[] = [];
  selectedClient: Client | null = null;
  clientTransactions: Transaction[] = [];
  loading = false;
  error: string | null = null;

  constructor(
    private clientService: ClientService,
    private dialog: MatDialog,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadApprovedClients();
  }

  loadApprovedClients(): void {
    this.loading = true;
    this.error = null;
    
    this.clientService.getClients().subscribe({
      next: (response) => {
        // Filter clients with loan status "approved"
        this.approvedClients = response.clients.filter(client => 
          client.loan_status && client.loan_status.toLowerCase() === 'approved'
        );
        
        // Automatically select the first client if available
        if (this.approvedClients.length > 0) {
          this.selectedClient = this.approvedClients[0];
          this.loadClientTransactions(this.selectedClient._id);
        }
        
        this.loading = false;
      },
      error: (error) => {
        this.error = 'Failed to load clients. Please try again later.';
        this.loading = false;
        console.error('Error loading clients:', error);
      }
    });
  }

  // Select a client to view their transactions (toggle if same client)
  selectClient(client: Client): void {
    if (this.selectedClient && this.selectedClient._id === client._id) {
      // If clicking the same client, close the details
      this.clearSelection();
    } else {
      // If clicking a different client or no client selected, show details
      this.selectedClient = client;
      this.loadClientTransactions(client._id);
    }
  }

  // Load transactions for a specific client
  loadClientTransactions(clientId: string): void {
    const storedTransactions = localStorage.getItem(`transactions_${clientId}`);
    if (storedTransactions) {
      this.clientTransactions = JSON.parse(storedTransactions);
    } else {
      this.clientTransactions = [];
    }
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

  // Add a new transaction for the selected client
  addTransaction(): void {
    if (this.selectedClient) {
      const dialogRef = this.dialog.open(TransactionDialogComponent, {
        width: '600px',
        data: { client: this.selectedClient }
      });

      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          // Refresh transactions after adding new one
          this.loadClientTransactions(this.selectedClient!._id);
        }
      });
    }
  }

  // Clear the selected client
  clearSelection(): void {
    this.selectedClient = null;
    this.clientTransactions = [];
  }

  // Navigate back to transaction page
  goBack(): void {
    this.router.navigate(['/transaction']);
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
}
