import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/nginx/apply/route';
import { db } from '@/lib/db';
import * as nginxLib from '@/lib/nginx';

// Mock DB
vi.mock('@/lib/db', () => {
    return {
        db: {
            select: vi.fn(),
        },
        schema: {
            settings: { key: 'settings_key' },
            streams: { id: 'stream_id' }
        }
    };
});

// Mock Nginx Lib
vi.mock('@/lib/nginx', () => ({
    generateConfig: vi.fn(),
    writeConfig: vi.fn(),
    reloadNginx: vi.fn(),
}));

describe('POST /api/nginx/apply', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should generate config and reload nginx successfully', async () => {
        const mockDb = vi.mocked(db);

        mockDb.select.mockImplementation(() => ({
            from: (table: any) => {
                // Settings query
                if (table && table.key === 'settings_key') {
                     return {
                        where: vi.fn().mockResolvedValue([{ value: 'template' }])
                     };
                }
                // Streams query
                if (table && table.id === 'stream_id') {
                    return Promise.resolve([{ id: 1, name: 'stream1' }]);
                }
                return { where: vi.fn() };
            }
        } as any));

        vi.mocked(nginxLib.generateConfig).mockReturnValue('generated config');
        vi.mocked(nginxLib.reloadNginx).mockReturnValue(true);

        const response = await POST();
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.success).toBe(true);
        expect(nginxLib.generateConfig).toHaveBeenCalled();
        expect(nginxLib.writeConfig).toHaveBeenCalledWith('generated config');
        expect(nginxLib.reloadNginx).toHaveBeenCalled();
    });

    it('should return 500 if template is missing', async () => {
        const mockDb = vi.mocked(db);
        mockDb.select.mockImplementation(() => ({
            from: (table: any) => {
                if (table && table.key === 'settings_key') {
                     return {
                        where: vi.fn().mockResolvedValue([]) // Empty result
                     };
                }
                return { where: vi.fn() };
            }
        } as any));

        const response = await POST();
        const body = await response.json();

        expect(response.status).toBe(500);
        expect(body.error).toBe('Nginx template not found');
    });

    it('should return 500 if reload fails', async () => {
        const mockDb = vi.mocked(db);
        mockDb.select.mockImplementation(() => ({
            from: (table: any) => {
                if (table && table.key === 'settings_key') {
                     return {
                        where: vi.fn().mockResolvedValue([{ value: 'template' }])
                     };
                }
                if (table && table.id === 'stream_id') {
                    return Promise.resolve([]);
                }
                return { where: vi.fn() };
            }
        } as any));

        vi.mocked(nginxLib.reloadNginx).mockReturnValue(false);

        const response = await POST();
        const body = await response.json();

        expect(response.status).toBe(500);
        expect(body.error).toContain('Failed to reload Nginx');
    });
});
