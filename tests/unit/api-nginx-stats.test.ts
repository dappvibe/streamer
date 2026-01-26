import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET } from '@/app/api/nginx/stats/route';

describe('GET /api/nginx/stats', () => {
    const originalFetch = global.fetch;

    beforeEach(() => {
        global.fetch = vi.fn();
    });

    afterEach(() => {
        global.fetch = originalFetch;
    });

    it('should return stats when fetch succeeds', async () => {
        const mockXml = '<stat>data</stat>';
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            text: () => Promise.resolve(mockXml),
        });

        const res = await GET();
        const text = await res.text();

        expect(res.status).toBe(200);
        expect(res.headers.get('Content-Type')).toBe('text/xml');
        expect(text).toBe(mockXml);
    });

    it('should return 503 when fetch fails (network error)', async () => {
        global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

        const res = await GET();
        const body = await res.json();

        expect(res.status).toBe(503);
        expect(body.error).toBe('Nginx not available');
    });

    it('should return upstream status code when fetch returns non-ok', async () => {
         global.fetch = vi.fn().mockResolvedValue({
            ok: false,
            status: 404,
        });

        const res = await GET();
        const body = await res.json();

        expect(res.status).toBe(404);
        expect(body.error).toBe('Failed to fetch nginx stats');
    });
});
