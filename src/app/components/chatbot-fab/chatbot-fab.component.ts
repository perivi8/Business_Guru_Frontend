import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { ChatbotService } from '../../services/chatbot.service';

@Component({
  selector: 'app-chatbot-fab',
  templateUrl: './chatbot-fab.component.html',
  styleUrls: ['./chatbot-fab.component.scss']
})
export class ChatbotFabComponent implements OnInit, OnDestroy {
  isChatbotOpen = false;
  private chatbotSubscription: Subscription | null = null;

  constructor(private chatbotService: ChatbotService) {}

  ngOnInit(): void {
    // Subscribe to chatbot visibility
    this.chatbotSubscription = this.chatbotService.isChatbotOpen$.subscribe(
      isOpen => {
        this.isChatbotOpen = isOpen;
      }
    );
  }

  ngOnDestroy(): void {
    if (this.chatbotSubscription) {
      this.chatbotSubscription.unsubscribe();
    }
  }

  openChatbot(): void {
    this.chatbotService.openChatbot();
  }
}
