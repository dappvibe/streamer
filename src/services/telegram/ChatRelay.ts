import {Message, MessageEntity} from 'node-telegram-bot-api';
import {EventEmitter} from 'events';
import {IncomingMessage, ServerResponse} from 'http';

interface ChatRelayConfig {
    targetChatId?: string | number;
}

export class ChatRelay {
    private messages: string[] = [];
    private readonly MAX_MESSAGES = 3;

    constructor(private config: ChatRelayConfig) {}

    public listen(emitter: EventEmitter) {
        emitter.on('message', (msg: Message) => this.handleMessage(msg));
    }

    private handleMessage(msg: Message) {
        // "1.1 Checks that the message came from the configurable group"
        if (!this.config.targetChatId) {
             return;
        }

        const msgChatId = msg.chat.id.toString();
        const configChatId = this.config.targetChatId.toString();

        if (msgChatId !== configChatId) {
            return;
        }

        if (msg.text) {
            const html = this.formatMessageToHtml(msg.text, msg.entities);
            console.log(`- event - Telegram message stored: "${msg.text.substring(0, 50)}${msg.text.length > 50 ? '...' : ''}" from ${msg.from?.username || msg.from?.first_name || 'Unknown'}`);
            this.messages.push(html);
            if (this.messages.length > this.MAX_MESSAGES) {
                this.messages.shift();
            }
        }
    }

    private formatMessageToHtml(text: string, entities?: MessageEntity[]): string {
        if (!entities || entities.length === 0) {
            return this.escapeHtml(text) + "<br>";
        }

        // Apply entities to format HTML
        // This is a simplified implementation. Handling nesting requires more complex logic.
        // For basic bold/italic/code, we can do some replacement or split/join.

        let html = "";
        let lastIndex = 0;

        // Sort entities by offset just in case
        const sortedEntities = [...entities].sort((a, b) => a.offset - b.offset);

        for (const entity of sortedEntities) {
            if (entity.offset < lastIndex) continue; // Skip overlapping for simplicity

            html += this.escapeHtml(text.substring(lastIndex, entity.offset));

            const chunk = this.escapeHtml(text.substring(entity.offset, entity.offset + entity.length));

            switch (entity.type) {
                case 'bold':
                    html += `<b>${chunk}</b>`;
                    break;
                case 'italic':
                    html += `<i>${chunk}</i>`;
                    break;
                case 'code':
                    html += `<code>${chunk}</code>`;
                    break;
                case 'pre':
                    html += `<pre>${chunk}</pre>`;
                    break;
                case 'text_link':
                    html += `<a href="${entity.url}">${chunk}</a>`;
                    break;
                default:
                    html += chunk;
            }
            lastIndex = entity.offset + entity.length;
        }

        html += this.escapeHtml(text.substring(lastIndex));

        return html + "<br>";
    }

    private escapeHtml(unsafe: string): string {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    public handleChatRequest(req: IncomingMessage, res: ServerResponse) {
        if (req.method !== 'GET') {
            res.statusCode = 405;
            res.end('Method Not Allowed');
            return;
        }

        const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
</head>
<body>
${this.messages.join('\n')}
</body>
</html>`;

        res.writeHead(200, {
            'Content-Type': 'text/html',
            'Cache-Control': 'no-cache'
        });
        res.end(htmlContent);
    }
}
