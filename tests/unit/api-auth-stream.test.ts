import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/auth/stream/route';

const { mockDb } = vi.hoisted(() => {
  return {
    mockDb: {
      select: vi.fn(),
    }
  }
});

vi.mock('@/lib/db', () => ({
  db: mockDb,
  schema: {
    settings: { key: 'key' }
  }
}));

describe('POST /api/auth/stream', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 200 for valid key', async () => {
    // Setup mock to return the valid key
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ value: 'valid-key' }])
      })
    });

    const formData = new FormData();
    formData.append('name', 'valid-key');
    const req = new Request('http://localhost/api/auth/stream', {
      method: 'POST',
      body: formData
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  it('should return 403 for invalid key', async () => {
    // Setup mock to return the valid key
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ value: 'valid-key' }])
      })
    });

    const formData = new FormData();
    formData.append('name', 'wrong-key');
    const req = new Request('http://localhost/api/auth/stream', {
      method: 'POST',
      body: formData
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it('should return 400 for missing key', async () => {
     // Setup mock not really needed as it fails before DB call, but good practice
     mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ value: 'valid-key' }])
      })
    });

    const formData = new FormData();
    // name is missing
    const req = new Request('http://localhost/api/auth/stream', {
      method: 'POST',
      body: formData
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
