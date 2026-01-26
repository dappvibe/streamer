import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/streams/route';

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
    streams: {
        id: 'id',
        name: 'name',
        rtmpUrl: 'rtmpUrl',
        streamKey: 'streamKey',
        enabled: 'enabled'
    }
  }
}));

describe('/api/streams', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('should return all streams', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockResolvedValue([
            { id: 1, name: 'Stream 1' },
            { id: 2, name: 'Stream 2' }
        ])
      });

      const res = await GET();
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toHaveLength(2);
    });

    it('should return 500 on db error', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockRejectedValue(new Error('DB Error'))
      });

      const res = await GET();
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).toBe('Failed to fetch streams');
    });
  });

  describe('POST', () => {
      it('should create a stream', async () => {
          const mockValues = vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([{ id: 1, name: 'New Stream' }])
          });
          mockDb.insert.mockReturnValue({ values: mockValues });

          const req = new Request('http://localhost/api/streams', {
              method: 'POST',
              body: JSON.stringify({
                  name: 'New Stream',
                  rtmpUrl: 'rtmp://test',
                  streamKey: 'key',
                  enabled: 1
              })
          });

          const res = await POST(req);
          const body = await res.json();

          expect(res.status).toBe(201);
          expect(body.name).toBe('New Stream');
      });

      it('should return 400 if required fields are missing', async () => {
          const req = new Request('http://localhost/api/streams', {
              method: 'POST',
              body: JSON.stringify({
                  name: 'New Stream'
                  // missing rtmpUrl and streamKey
              })
          });

          const res = await POST(req);
          const body = await res.json();

          expect(res.status).toBe(400);
          expect(body.error).toBe('Missing required fields');
      });

      it('should return 500 on db error', async () => {
          mockDb.insert.mockImplementation(() => { throw new Error('DB Error') });

          const req = new Request('http://localhost/api/streams', {
              method: 'POST',
              body: JSON.stringify({
                  name: 'New Stream',
                  rtmpUrl: 'rtmp://test',
                  streamKey: 'key'
              })
          });

          const res = await POST(req);
          const body = await res.json();

          expect(res.status).toBe(500);
          expect(body.error).toBe('Failed to create stream');
      });
  });
});
