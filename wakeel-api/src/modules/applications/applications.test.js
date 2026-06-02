import { describe, it, expect, beforeEach, mock } from 'bun:test';

// ── Mock DB ──
const mockQuery = mock(() => ({ rows: [] }));
const mockClient = {
  query: mock(() => ({ rows: [] })),
  release: mock(() => {}),
};
const mockGetClient = mock(() => mockClient);

mock.module('../../db/pool.js', () => ({
  db: { query: mockQuery, getClient: mockGetClient },
}));

const { applicationsService } = await import('./applications.service.js');

function resetMocks() {
  mockQuery.mockReset();
  mockClient.query.mockReset();
  mockClient.release.mockReset();
  mockGetClient.mockReset();
  mockGetClient.mockReturnValue(mockClient);
}

describe('applicationsService', () => {
  beforeEach(() => {
    resetMocks();
  });

  // ──────────────────────────────────────
  describe('apply', () => {
    it('throws if lawyer applies to their own job (rule 1)', async () => {
      mockQuery.mockReturnValueOnce({
        rows: [{ id: 'j1', poster_id: 'user-1', court_id: 'c1' }],
      });

      try {
        await applicationsService.apply('j1', 'user-1', 'note');
        expect(true).toBe(false);
      } catch (e) {
        expect(e.status).toBe(400);
        expect(e.code).toBe('SELF_APPLICATION');
      }
    });

    it('throws if lawyer is not registered at the job court (rule 2)', async () => {
      // Job query
      mockQuery.mockReturnValueOnce({
        rows: [{ id: 'j1', poster_id: 'poster-1', court_id: 'c1' }],
      });
      // Court check returns empty
      mockQuery.mockReturnValueOnce({ rows: [] });

      try {
        await applicationsService.apply('j1', 'user-2', 'note');
        expect(true).toBe(false);
      } catch (e) {
        expect(e.status).toBe(400);
        expect(e.code).toBe('NOT_REGISTERED_AT_COURT');
      }
    });

    it('throws on duplicate application (unique constraint)', async () => {
      // Job query
      mockQuery.mockReturnValueOnce({
        rows: [{ id: 'j1', poster_id: 'poster-1', court_id: 'c1' }],
      });
      // Court check passes
      mockQuery.mockReturnValueOnce({ rows: [{ 1: 1 }] });
      // INSERT throws unique violation
      const pgErr = new Error('duplicate');
      pgErr.code = '23505';
      mockQuery.mockImplementationOnce(() => { throw pgErr; });

      try {
        await applicationsService.apply('j1', 'user-2', 'note');
        expect(true).toBe(false);
      } catch (e) {
        expect(e.status).toBe(409);
        expect(e.code).toBe('DUPLICATE_APPLICATION');
      }
    });
  });

  // ──────────────────────────────────────
  describe('accept', () => {
    it('rejects all other pending applications atomically (rule 3)', async () => {
      // Job query (poster check)
      mockQuery.mockReturnValueOnce({
        rows: [{ poster_id: 'poster-1' }],
      });

      // Transaction calls
      mockClient.query
        // BEGIN
        .mockReturnValueOnce({})
        // UPDATE accepted
        .mockReturnValueOnce({ rows: [{ id: 'app-1', status: 'accepted' }] })
        // UPDATE rejected (other pending)
        .mockReturnValueOnce({ rowCount: 3 })
        // UPDATE job status
        .mockReturnValueOnce({})
        // COMMIT
        .mockReturnValueOnce({});

      const result = await applicationsService.accept('j1', 'app-1', 'poster-1');
      expect(result.status).toBe('accepted');

      // Verify the reject-others query was called
      const rejectCall = mockClient.query.mock.calls[2];
      expect(rejectCall[0]).toContain('rejected');
      expect(rejectCall[0]).toContain('pending');
    });
  });
});
