import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PUT, DELETE } from '@/app/api/streams/[id]/route';

const { mockDb } = vi.hoisted(() => {
  return {
    mockDb: {
      update: vi.fn(),
      delete: vi.fn(),
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

describe('/api/streams/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const params = Promise.resolve({ id: '1' });

  describe('PUT', () => {
    it('should update a stream', async () => {
      const mockValues = vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([{ id: 1, name: 'Updated Stream' }])
          })
      });
      mockDb.update.mockReturnValue({ set: mockValues });

      const req = new Request('http://localhost/api/streams/1', {
          method: 'PUT',
          body: JSON.stringify({
              name: 'Updated Stream',
          })
      });

      const res = await PUT(req, { params });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.name).toBe('Updated Stream');
    });

    it('should return 404 if stream not found', async () => {
        const mockValues = vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
                returning: vi.fn().mockResolvedValue([])
            })
        });
        mockDb.update.mockReturnValue({ set: mockValues });

        const req = new Request('http://localhost/api/streams/1', {
            method: 'PUT',
            body: JSON.stringify({ name: 'Updated Stream' })
        });

        const res = await PUT(req, { params });
        const body = await res.json();

        expect(res.status).toBe(404);
        expect(body.error).toBe('Stream not found');
    });

    it('should return 500 on db error', async () => {
        mockDb.update.mockImplementation(() => { throw new Error('DB Error') });

        const req = new Request('http://localhost/api/streams/1', {
            method: 'PUT',
            body: JSON.stringify({ name: 'Updated Stream' })
        });

        const res = await PUT(req, { params });
        const body = await res.json();

        expect(res.status).toBe(500);
        expect(body.error).toBe('Failed to update stream');
    });
  });

  describe('DELETE', () => {
      it('should delete a stream', async () => {
          mockDb.delete.mockReturnValue({
              where: vi.fn().mockReturnValue({
                  returning: vi.fn().mockResolvedValue([{ id: 1 }])
              })
          });

          const req = new Request('http://localhost/api/streams/1', {
              method: 'DELETE',
          });

          const res = await DELETE(req, { params });
          const body = await res.json();

          expect(res.status).toBe(200);
          expect(body.success).toBe(true);
      });

      it('should return 404 if stream not found', async () => {
          mockDb.delete.mockReturnValue({
              where: vi.fn().mockReturnValue({
                  returning: vi.fn().mockResolvedValue([])
              })
          });

          const req = new Request('http://localhost/api/streams/1', {
              method: 'DELETE',
          });

          const res = await DELETE(req, { params });
          const body = await res.json();

          expect(res.status).toBe(404);
          expect(body.error).toBe('Stream not found');
      });

      it('should return 500 on db error', async () => {
          mockDb.delete.mockImplementation(() => { throw new Error('DB Error') });

          const req = new Request('http://localhost/api/streams/1', {
              method: 'DELETE',
          });

          const res = await DELETE(req, { params });
          const body = await res.json();

          expect(res.status).toBe(500);
          expect(body.error).toBe('Failed to delete stream');
      });
  });
});
