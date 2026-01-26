import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from '@/app/api/nginx/apply/route';
import { NextResponse } from 'next/server';
import * as fs from 'fs';
import { spawnSync } from 'child_process';
import { db } from '@/lib/db'; // Import db directly

// Mock the database
vi.mock('@/lib/db', () => {
    const mockSettings = [
        { value: `error_log /tmp/nginx-error.log;
events {
    worker_connections 1024;
}
rtmp {
    access_log /tmp/nginx-access.log;
    server {
        application live {
            {{PUSH_DESTINATIONS}}
        }
    }
}` }
    ];
    const mockStreams = [
        { id: 1, name: 'Test Stream', rtmpUrl: 'rtmp://127.0.0.1/live', streamKey: 'key123', enabled: 1 }
    ];

    return {
        db: {
            select: vi.fn().mockReturnValue({
                from: vi.fn().mockImplementation((table) => {
                    const chain = {
                        where: vi.fn().mockResolvedValue(mockSettings),
                        then: (resolve: any) => resolve(mockStreams) // default resolve for no where clause (streams)
                    };
                    
                    // If it's the settings query (which uses where)
                    if (table.key === 'settings_key') { 
                        return chain;
                    }
                     // If it's the streams query (no where)
                    if (table.id === 'stream_id') {
                        return Promise.resolve(mockStreams);
                    }
                    return chain;
                })
            })
        },
        schema: {
            settings: { key: 'settings_key' }, // Identifiers to distinguish tables
            streams: { id: 'stream_id' }
        }
    };
});

describe('POST /api/nginx/apply', () => {
    const CONFIG_PATH = '/tmp/nginx-rtmp.conf';

    // Helper to kill nginx
    const killNginx = () => {
        try {
            spawnSync('pkill', ['nginx']);
        } catch (e) {}
    };

    beforeEach(() => {
        if (fs.existsSync(CONFIG_PATH)) {
            fs.unlinkSync(CONFIG_PATH);
        }
        killNginx();
    });

    afterEach(() => {
        if (fs.existsSync(CONFIG_PATH)) {
            fs.unlinkSync(CONFIG_PATH);
        }
        killNginx();
    });

    it('should generate config and spawn nginx successfully', async () => {
        const response = await POST();
        const body = await response.json();

        if (response.status !== 200) {
            const errorMsg = `API Error: ${body.error}`;
            console.error(errorMsg);
            if (fs.existsSync(CONFIG_PATH)) {
                console.error('Config Content:', fs.readFileSync(CONFIG_PATH, 'utf-8'));
            }
            throw new Error(errorMsg);
        }

        expect(response.status).toBe(200);
        expect(body.success).toBe(true);
        expect(body.config).toBeDefined();

        // Check if config file was written
        expect(fs.existsSync(CONFIG_PATH)).toBe(true);
        const configContent = fs.readFileSync(CONFIG_PATH, 'utf-8');
        expect(configContent).toContain('push "rtmp://127.0.0.1/live/key123";');

        // Check if Nginx is running
        // We use pgrep to check for nginx process
        const checkProcess = spawnSync('pgrep', ['nginx']);
        expect(checkProcess.status).toBe(0); // 0 means process found
    });

    it('should return 500 if template is missing', async () => {
        // Override mock to return empty settings
        const mockDb = vi.mocked(db);
        mockDb.select.mockReturnValue({
            from: vi.fn().mockImplementation((table) => {
                const chain = {
                    where: vi.fn().mockResolvedValue([]), // Return empty array for settings
                    then: (resolve: any) => resolve([]) 
                };
                if (table.key === 'settings_key') { 
                    return chain;
                }
                return chain;
            })
        } as any);

        const response = await POST();
        const body = await response.json();

        expect(response.status).toBe(500);
        expect(body.error).toBe('Nginx template not found');
    });

    it('should return 400 if config is invalid', async () => {
        // Override mock to return invalid template
        const mockDb = vi.mocked(db);
        mockDb.select.mockReturnValue({
            from: vi.fn().mockImplementation((table) => {
                const chain = {
                    where: vi.fn().mockResolvedValue([{ value: 'invalid config content' }]), 
                    then: (resolve: any) => resolve([]) 
                };
                if (table.key === 'settings_key') { 
                    return chain;
                }
                if (table.id === 'stream_id') {
                    return Promise.resolve([]);
                }
                return chain;
            })
        } as any);

        const response = await POST();
        const body = await response.json();

        expect(response.status).toBe(400);
        expect(body.error).toContain('Invalid nginx config');
    });
});
