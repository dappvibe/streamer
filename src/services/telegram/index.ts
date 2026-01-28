import { WebhookHandler } from './WebhookHandler';
import { ChatRelay } from './ChatRelay';

class TelegramBotModule {
    public webhookHandler: WebhookHandler;
    public chatRelay: ChatRelay;

    constructor() {
        const token = process.env.TELEGRAM_KEY;
        this.webhookHandler = new WebhookHandler(token);
        
        const chatId = process.env.TELEGRAM_CHAT_ID;
        this.chatRelay = new ChatRelay({ targetChatId: chatId });
        
        this.chatRelay.listen(this.webhookHandler);

        const appUrl = process.env.NEXT_PUBLIC_APP_URL;
        if (appUrl) {
            this.webhookHandler.initializeWebhook(appUrl).catch(err => {
                console.error('Failed to initialize webhook on startup:', err);
            });
        } else {
            console.warn('NEXT_PUBLIC_APP_URL not set, skipping Telegram webhook registration');
        }
    }
}

// Singleton instance
export const telegramBotModule = new TelegramBotModule();
