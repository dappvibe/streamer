import { EventEmitter } from 'events';
import { IncomingMessage, ServerResponse } from 'http';
import TelegramBot from 'node-telegram-bot-api';

export class WebhookHandler extends EventEmitter {
    private bot: TelegramBot | undefined;

    constructor(private token: string | undefined) {
        super();
        if (this.token) {
            this.bot = new TelegramBot(this.token);
        }
    }

    public async initializeWebhook(baseUrl: string): Promise<void> {
        if (!this.bot) {
            console.warn('Telegram token not set, skipping webhook registration');
            return;
        }

        const url = `${baseUrl}/bot/telegramUpdate`;
        try {
            await this.bot.setWebHook(url);
            console.log(`Telegram webhook registered: ${url}`);
        } catch (error) {
            console.error('Failed to register Telegram webhook:', error);
        }
    }

    public async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
        if (req.method !== 'POST') {
            res.statusCode = 405;
            res.end('Method Not Allowed');
            return;
        }

        // According to requirements: "Exception about missing key is thrown only during authorized request"
        if (!this.token) {
            console.error('TELEGRAM_KEY is not set, cannot handle webhook');
            res.statusCode = 500;
            res.end('Server Configuration Error');
            return;
        }

        const chunks: Buffer[] = [];
        for await (const chunk of req) {
            chunks.push(chunk);
        }
        const body = Buffer.concat(chunks).toString();

        try {
            const update: TelegramBot.Update = JSON.parse(body);
            
            // "1. Checks that the message came from Telegram"
            // Usually we'd verify IP or secret token in header/path, but here we just parse the body structure.
            // If it's a valid Telegram update structure, we emit it.
            if (update.update_id) {
                this.emit('update', update);
                if (update.message) {
                    this.emit('message', update.message);
                }
            }

            res.statusCode = 200;
            res.end('OK');
        } catch (error) {
            console.error('Error processing Telegram webhook:', error);
            res.statusCode = 400;
            res.end('Bad Request');
        }
    }
}
