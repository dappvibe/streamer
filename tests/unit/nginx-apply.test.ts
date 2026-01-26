import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/nginx/apply/route';
import { db } from '@/lib/db';

// Mock lib/nginx
vi.mock('@/lib/nginx', () => ({
  generateConfig: vi.fn().mockReturnValue('mock-config'),
  writeConfig: vi.fn(),
  validateConfig: vi.fn().mockReturnValue({ valid: true }),
  reloadNginx: vi.fn().mockReturnValue(true),
  spawnNginx: vi.fn(),
  isNginxRunning: vi.fn().mockReturnValue(true),
}));

import { generateConfig, reloadNginx, validateConfig } from '@/lib/nginx';

// Mock DB
vi.mock('@/lib/db', () => {
    return {
        db: {
            select: vi.fn()
        },
        schema: {
            settings: { key: 'settings_key' },
            streams: { id: 'stream_id' }
        }
    };
});

describe('POST /api/nginx/apply', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Setup default db mock behavior
        const mockDb = vi.mocked(db);
        mockDb.select.mockReturnValue({
            from: vi.fn().mockImplementation((table) => {
                 const chain = {
                    where: vi.fn().mockResolvedValue([{ value: 'template' }]),
                    then: (resolve: any) => resolve([])
                };
                if (table.key === 'settings_key') return chain; // settings
                if (table.id === 'stream_id') return Promise.resolve([]); // streams
                return chain;
            })
        } as any);

        // Reset nginx mocks defaults
        vi.mocked(reloadNginx).mockReturnValue(true);
        vi.mocked(validateConfig).mockReturnValue({ valid: true });
    });

    it('should apply config successfully', async () => {
        const response = await POST();
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.success).toBe(true);
        expect(body.config).toBe('mock-config');
        expect(generateConfig).toHaveBeenCalled();
        expect(reloadNginx).toHaveBeenCalled();
    });

    it('should return 500 if template is missing', async () => {
        const mockDb = vi.mocked(db);
        mockDb.select.mockReturnValue({
            from: vi.fn().mockImplementation((table) => {
                 const chain = {
                    where: vi.fn().mockResolvedValue([]), // Empty settings
                    then: (resolve: any) => resolve([]) 
                };
                if (table.key === 'settings_key') return chain;
                return chain;
            })
        } as any);

        const response = await POST();
        const body = await response.json();

        expect(response.status).toBe(500);
        expect(body.error).toBe('Nginx template not found');
    });

    it('should return 500 if reload fails', async () => {
        vi.mocked(reloadNginx).mockReturnValue(false);

        const response = await POST();
        const body = await response.json();

        expect(response.status).toBe(500);
        expect(body.error).toContain('Failed to reload Nginx');
    });
});
