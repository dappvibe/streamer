import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PUT } from '@/app/api/settings/route';

const { mockDb } = vi.hoisted(() => {
  return {
    mockDb: {
      select: vi.fn(),
      insert: vi.fn(),
    }
  }
});

vi.mock('@/lib/db', () => ({
  db: mockDb,
  schema: {
    settings: { key: 'key', value: 'value' }
  }
}));

describe('/api/settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('should return all settings as an object', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockResolvedValue([
            { key: 'setting1', value: 'value1' },
            { key: 'setting2', value: 'value2' }
        ])
      });

      const res = await GET();
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toEqual({
          setting1: 'value1',
          setting2: 'value2'
      });
    });

    it('should return 500 on db error', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockRejectedValue(new Error('DB Error'))
      });

      const res = await GET();
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).toBe('Failed to fetch settings');
    });
  });

  describe('PUT', () => {
      it('should update settings', async () => {
          const mockValues = vi.fn().mockReturnValue({
              onConflictDoUpdate: vi.fn().mockResolvedValue(true)
          });
          mockDb.insert.mockReturnValue({ values: mockValues });

          const req = new Request('http://localhost/api/settings', {
              method: 'PUT',
              body: JSON.stringify({ key1: 'value1', key2: 'value2' })
          });

          const res = await PUT(req);
          const body = await res.json();

          expect(res.status).toBe(200);
          expect(body.success).toBe(true);

          // Check if insert was called twice (once for each key)
          expect(mockDb.insert).toHaveBeenCalledTimes(2);
      });

      it('should return 500 on db error', async () => {
          mockDb.insert.mockImplementation(() => { throw new Error('DB Error') });

          const req = new Request('http://localhost/api/settings', {
              method: 'PUT',
              body: JSON.stringify({ key1: 'value1' })
          });

          const res = await PUT(req);
          const body = await res.json();

          expect(res.status).toBe(500);
          expect(body.error).toBe('Failed to update settings');
      });
  });
});
