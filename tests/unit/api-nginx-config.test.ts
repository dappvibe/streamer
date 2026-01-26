import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/nginx/config/route';
import { readConfig } from '@/lib/nginx';

vi.mock('@/lib/nginx', () => ({
  readConfig: vi.fn(),
}));

describe('GET /api/nginx/config', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return config when available', async () => {
    vi.mocked(readConfig).mockReturnValue('mock-config-content');

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.config).toBe('mock-config-content');
  });

  it('should return "No config found" when config is null', async () => {
    vi.mocked(readConfig).mockReturnValue(null);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.config).toBe('No config found');
  });

  it('should return 500 when readConfig throws', async () => {
    vi.mocked(readConfig).mockImplementation(() => {
        throw new Error('Read error');
    });

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe('Failed to read config');
  });
});
