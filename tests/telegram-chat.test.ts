import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebhookHandler } from '../src/services/telegram/WebhookHandler';
import { ChatRelay } from '../src/services/telegram/ChatRelay';
import { EventEmitter } from 'events';
import { IncomingMessage, ServerResponse } from 'http';
import { PassThrough } from 'stream';

// Mock TelegramBot class
const mockSetWebHook = vi.fn().mockResolvedValue(true);
const mockConstructor = vi.fn();

vi.mock('node-telegram-bot-api', () => {
    return {
        default: class {
            constructor(token: string) {
                mockConstructor(token);
            }
            setWebHook = mockSetWebHook;
        }
    };
});

// Mock http.IncomingMessage
function createMockRequest(method: string, body?: any) {
    const req = new PassThrough();
    (req as any).method = method;
    if (body) {
        req.write(JSON.stringify(body));
        req.end();
    }
    return req as unknown as IncomingMessage;
}

// Mock http.ServerResponse
function createMockResponse() {
    const res: any = {
        statusCode: 200,
        end: vi.fn(),
        write: vi.fn(),
        writeHead: vi.fn()
    };
    return res as unknown as ServerResponse;
}

describe('Telegram Chat Service', () => {
    describe('WebhookHandler', () => {
        let handler: WebhookHandler;

        beforeEach(() => {
            vi.clearAllMocks();
            handler = new WebhookHandler('fake-token');
        });

        it('should emit message event on valid update', async () => {
            const update = {
                update_id: 123,
                message: {
                    message_id: 1,
                    date: 1234567890,
                    chat: { id: 999, type: 'group' },
                    text: 'Hello World'
                }
            };

            const req = createMockRequest('POST', update);
            const res = createMockResponse();

            const emitSpy = vi.spyOn(handler, 'emit');

            await handler.handleRequest(req, res);

            expect(emitSpy).toHaveBeenCalledWith('update', update);
            expect(emitSpy).toHaveBeenCalledWith('message', update.message);
            expect((res as any).statusCode).toBe(200);
        });

        it('should reject non-POST requests', async () => {
            const req = createMockRequest('GET');
            const res = createMockResponse();
            
            await handler.handleRequest(req, res);
            expect((res as any).statusCode).toBe(405);
        });

        it('should 500 if token not set', async () => {
            const noTokenHandler = new WebhookHandler(undefined);
            const req = createMockRequest('POST', {});
            const res = createMockResponse();

            await noTokenHandler.handleRequest(req, res);
            expect((res as any).statusCode).toBe(500);
        });

        it('should register webhook with correct URL', async () => {
            await handler.initializeWebhook('https://example.com');
            expect(mockSetWebHook).toHaveBeenCalledWith('https://example.com/bot/telegramUpdate');
        });

        it('should not register webhook if token missing', async () => {
             const noTokenHandler = new WebhookHandler(undefined);
             await noTokenHandler.initializeWebhook('https://example.com');
             expect(mockSetWebHook).not.toHaveBeenCalled();
        });
    });

    describe('ChatRelay', () => {
        let relay: ChatRelay;
        let emitter: EventEmitter;
        const TARGET_CHAT_ID = 999;

        beforeEach(() => {
            relay = new ChatRelay({ targetChatId: TARGET_CHAT_ID });
            emitter = new EventEmitter();
            relay.listen(emitter);
        });

        it('should ignore messages from other chats', () => {
            const msg = {
                chat: { id: 888 }, // Different ID
                text: 'Ignore me'
            };
            
            // Access private messages array via any cast or verify via HTML output
            emitter.emit('message', msg);
            
            const req = createMockRequest('GET');
            const res = createMockResponse();
            relay.handleChatRequest(req, res);
            
            const output = (res.end as any).mock.calls[0][0];
            expect(output).not.toContain('Ignore me');
        });

        it('should store relevant messages and format HTML', () => {
            const msg = {
                chat: { id: TARGET_CHAT_ID },
                text: 'Hello test'
            };

            emitter.emit('message', msg);

            const req = createMockRequest('GET');
            const res = createMockResponse();
            relay.handleChatRequest(req, res);

            const output = (res.end as any).mock.calls[0][0];
            expect(output).toContain('Hello test');
            expect(output).toContain('<br>');
        });

        it('should cap messages at 3', () => {
            for (let i = 1; i <= 4; i++) {
                emitter.emit('message', {
                    chat: { id: TARGET_CHAT_ID },
                    text: `Msg ${i}`
                });
            }

            const req = createMockRequest('GET');
            const res = createMockResponse();
            relay.handleChatRequest(req, res);

            const output = (res.end as any).mock.calls[0][0];
            expect(output).not.toContain('Msg 1');
            expect(output).toContain('Msg 2');
            expect(output).toContain('Msg 3');
            expect(output).toContain('Msg 4');
        });
        
        it('should format bold entities to HTML', () => {
             const msg = {
                chat: { id: TARGET_CHAT_ID },
                text: 'Bold text',
                entities: [{ offset: 0, length: 4, type: 'bold' }]
            };
            
            emitter.emit('message', msg);
            
            const req = createMockRequest('GET');
            const res = createMockResponse();
            relay.handleChatRequest(req, res);
            
            const output = (res.end as any).mock.calls[0][0];
            expect(output).toContain('<b>Bold</b> text');
        });
    });
});
