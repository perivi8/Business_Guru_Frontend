import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subscription } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ChatbotService } from '../../services/chatbot.service';

interface ChatMessage {
  id: string;
  message: string;
  isUser: boolean;
  timestamp: Date;
  isLoading?: boolean;
}

interface ChatResponse {
  success: boolean;
  response: string;
  query_type: string;
  timestamp: string;
  error?: string;
}

@Component({
  selector: 'app-chatbot',
  templateUrl: './chatbot.component.html',
  styleUrls: ['./chatbot.component.scss']
})
export class ChatbotComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;
  
  messages: ChatMessage[] = [];
  currentMessage = '';
  isLoading = false;
  isMinimized = false;
  isVisible = false;
  showScrollButton = false;
  
  private apiUrl = environment.apiUrl || 'http://localhost:5000/api';
  private shouldScrollToBottom = false;
  private chatbotSubscription: Subscription | null = null;

  constructor(
    private http: HttpClient,
    private snackBar: MatSnackBar,
    private chatbotService: ChatbotService
  ) {}

  ngOnInit(): void {
    this.initializeChat();
    
    // Subscribe to chatbot visibility
    this.chatbotSubscription = this.chatbotService.isChatbotOpen$.subscribe(
      isOpen => {
        this.isVisible = isOpen;
        if (isOpen && !this.isMinimized) {
          this.shouldScrollToBottom = true;
        }
      }
    );
  }

  ngOnDestroy(): void {
    if (this.chatbotSubscription) {
      this.chatbotSubscription.unsubscribe();
    }
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  initializeChat(): void {
    // Add welcome message
    this.addMessage({
      id: this.generateId(),
      message: `🤖 **Welcome to TMIS AI Assistant!**

I can help you with:
• **Enquiry Reports** - Ask about enquiry statistics and data
• **Client Information** - Search by GST number or mobile number
• **Document Status** - Check what documents clients have shared
• **Loan Status** - View loan application status
• **General Queries** - Ask anything about your business data

**Examples:**
• "How many enquiries do we have?"
• "Show me client with GST number 22AAAAA0000A1Z5"
• "Find client with mobile 9876543210"
• "What's the loan status for clients?"

What would you like to know?`,
      isUser: false,
      timestamp: new Date()
    });
  }

  sendMessage(): void {
    if (!this.currentMessage.trim() || this.isLoading) {
      return;
    }

    const userMessage = this.currentMessage.trim();
    
    // Add user message
    this.addMessage({
      id: this.generateId(),
      message: userMessage,
      isUser: true,
      timestamp: new Date()
    });

    // Add loading message
    const loadingMessageId = this.generateId();
    this.addMessage({
      id: loadingMessageId,
      message: 'Thinking...',
      isUser: false,
      timestamp: new Date(),
      isLoading: true
    });

    this.currentMessage = '';
    this.isLoading = true;

    // Send to API
    this.sendToAPI(userMessage, loadingMessageId);
  }

  private sendToAPI(message: string, loadingMessageId: string): void {
    const token = localStorage.getItem('token');
    
    if (!token) {
      this.handleError('Authentication required. Please log in again.', loadingMessageId);
      return;
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    const payload = {
      message: message
    };

    this.http.post<ChatResponse>(`${this.apiUrl}/chatbot/chat`, payload, { headers })
      .subscribe({
        next: (response) => {
          this.handleResponse(response, loadingMessageId);
        },
        error: (error) => {
          console.error('Chatbot API error:', error);
          let errorMessage = 'Sorry, I encountered an error. Please try again.';
          
          if (error.status === 401) {
            errorMessage = 'Authentication expired. Please log in again.';
          } else if (error.status === 503) {
            errorMessage = 'Chatbot service is currently unavailable. Please try again later.';
          } else if (error.error?.error) {
            errorMessage = error.error.error;
          }
          
          this.handleError(errorMessage, loadingMessageId);
        }
      });
  }

  private handleResponse(response: ChatResponse, loadingMessageId: string): void {
    // Remove loading message
    this.messages = this.messages.filter(msg => msg.id !== loadingMessageId);
    
    if (response.success) {
      // Add AI response
      this.addMessage({
        id: this.generateId(),
        message: response.response,
        isUser: false,
        timestamp: new Date()
      });
    } else {
      this.handleError(response.error || 'Unknown error occurred', loadingMessageId);
    }
    
    this.isLoading = false;
  }

  private handleError(errorMessage: string, loadingMessageId: string): void {
    // Remove loading message
    this.messages = this.messages.filter(msg => msg.id !== loadingMessageId);
    
    // Add error message
    this.addMessage({
      id: this.generateId(),
      message: `❌ **Error:** ${errorMessage}`,
      isUser: false,
      timestamp: new Date()
    });
    
    this.isLoading = false;
    
    // Show snackbar for critical errors
    if (errorMessage.includes('Authentication') || errorMessage.includes('unavailable')) {
      this.snackBar.open(errorMessage, 'Close', {
        duration: 5000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
    }
  }

  private addMessage(message: ChatMessage): void {
    this.messages.push(message);
    this.shouldScrollToBottom = true;
  }

  scrollToBottom(): void {
    try {
      if (this.messagesContainer) {
        const element = this.messagesContainer.nativeElement;
        // Smooth scroll to bottom
        element.scrollTo({
          top: element.scrollHeight,
          behavior: 'smooth'
        });
      }
    } catch (err) {
      console.error('Error scrolling to bottom:', err);
    }
  }

  // Method to scroll to top
  scrollToTop(): void {
    try {
      if (this.messagesContainer) {
        const element = this.messagesContainer.nativeElement;
        element.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
      }
    } catch (err) {
      console.error('Error scrolling to top:', err);
    }
  }

  // Check if user is at bottom of messages
  isAtBottom(): boolean {
    try {
      if (this.messagesContainer) {
        const element = this.messagesContainer.nativeElement;
        const threshold = 50; // 50px threshold
        return element.scrollTop + element.clientHeight >= element.scrollHeight - threshold;
      }
      return true;
    } catch (err) {
      return true;
    }
  }

  private generateId(): string {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }

  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  onScroll(): void {
    // Show/hide scroll to bottom button based on scroll position
    this.showScrollButton = !this.isAtBottom();
  }

  toggleMinimize(): void {
    this.isMinimized = !this.isMinimized;
    if (!this.isMinimized) {
      this.shouldScrollToBottom = true;
    }
  }

  closeChatbot(): void {
    this.chatbotService.closeChatbot();
  }

  clearChat(): void {
    this.messages = [];
    this.initializeChat();
  }

  // Quick action methods
  askAboutEnquiries(): void {
    this.currentMessage = 'How many enquiries do we have in our system?';
    this.sendMessage();
  }

  askAboutClients(): void {
    this.currentMessage = 'Show me client statistics and status distribution';
    this.sendMessage();
  }

  // Format message for display (handle markdown-like formatting)
  formatMessage(message: string): string {
    return message
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>')
      .replace(/•/g, '&bull;');
  }
}
