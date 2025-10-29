import { Component, OnInit } from '@angular/core';
import { ClientService, Client } from '../../services/client.service';
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
  showTransactionModal = false;
  isEditMode = false;
  showDeleteConfirmation = false;
  transactionToDelete: Transaction | null = null;
  newTransaction: Transaction = {
    id: '',
    date: '',
    orderId: '',
    amount: 0,
    clientId: '',
    clientName: ''
  };

  constructor(
    private clientService: ClientService,
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
      this.showTransactionModal = true;
      this.newTransaction = {
        id: this.generateTransactionId(),
        date: new Date().toISOString(),
        orderId: '',
        amount: 0,
        clientId: this.selectedClient._id,
        clientName: this.getClientDisplayName(this.selectedClient)
      };
    }
  }

  // Close transaction modal
  closeTransactionModal(): void {
    this.showTransactionModal = false;
    this.isEditMode = false;
    this.resetTransactionForm();
  }

  // Save transaction
  saveTransaction(): void {
    if (this.isEditMode) {
      this.updateTransaction();
    } else {
      if (this.selectedClient && this.newTransaction.orderId && this.newTransaction.amount > 0) {
        const transactions = this.getClientTransactions(this.selectedClient._id);
        transactions.push(this.newTransaction);
        localStorage.setItem(`transactions_${this.selectedClient._id}`, JSON.stringify(transactions));
        this.loadClientTransactions(this.selectedClient._id);
        this.closeTransactionModal();
      }
    }
  }

  // Reset transaction form
  resetTransactionForm(): void {
    this.newTransaction = {
      id: '',
      date: '',
      orderId: '',
      amount: 0,
      clientId: '',
      clientName: ''
    };
  }

  // Generate unique transaction ID
  generateTransactionId(): string {
    return 'TXN-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }

  // Edit transaction
  editTransaction(transaction: Transaction): void {
    this.isEditMode = true;
    this.showTransactionModal = true;
    this.newTransaction = { ...transaction };
  }

  // Update transaction
  updateTransaction(): void {
    if (this.selectedClient && this.newTransaction.orderId && this.newTransaction.amount > 0) {
      const transactions = this.getClientTransactions(this.selectedClient._id);
      const index = transactions.findIndex(t => t.id === this.newTransaction.id);
      if (index !== -1) {
        transactions[index] = { ...this.newTransaction };
        localStorage.setItem(`transactions_${this.selectedClient._id}`, JSON.stringify(transactions));
        this.loadClientTransactions(this.selectedClient._id);
        this.closeTransactionModal();
      }
    }
  }

  // Delete transaction (show confirmation)
  deleteTransaction(transaction: Transaction): void {
    this.transactionToDelete = transaction;
    this.showDeleteConfirmation = true;
  }

  // Confirm delete transaction
  confirmDeleteTransaction(): void {
    if (this.selectedClient && this.transactionToDelete) {
      const transactions = this.getClientTransactions(this.selectedClient._id);
      const filteredTransactions = transactions.filter(t => t.id !== this.transactionToDelete!.id);
      localStorage.setItem(`transactions_${this.selectedClient._id}`, JSON.stringify(filteredTransactions));
      this.loadClientTransactions(this.selectedClient._id);
      this.closeDeleteConfirmation();
    }
  }

  // Close delete confirmation
  closeDeleteConfirmation(): void {
    this.showDeleteConfirmation = false;
    this.transactionToDelete = null;
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
