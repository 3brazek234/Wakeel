import { describe, it, expect, beforeEach, mock } from 'bun:test';

// ── Mock DB ──
const mockQuery = mock(() => ({ rows: [] }));
mock.module('../../db/pool.js', () => ({
  db: { query: mockQuery, getClient: mock(() => {}) },
}));

const { jobsService } = await import('./jobs.service.js');

describe('jobsService', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  // ──────────────────────────────────────
  describe('getJobsForLawyer', () => {
    it('returns only jobs at courts the lawyer is registered at', async () => {
      mockQuery.mockReturnValueOnce({
        rows: [
          { id: 'j1', title: 'Court filing', court_name: 'Cairo Court' },
        ],
      });

      const jobs = await jobsService.getJobsForLawyer('user-1', {});
      expect(jobs).toHaveLength(1);
      expect(jobs[0].court_name).toBe('Cairo Court');

      // Verify the query contains the lawyer_courts sub-select
      const sql = mockQuery.mock.calls[0][0];
      expect(sql).toContain('lawyer_courts');
    });
  });

  // ──────────────────────────────────────
  describe('create', () => {
    it('throws if deadline is in the past', async () => {
      try {
        await jobsService.create(
          {
            title: 'Old job',
            fee: 100,
            deadline: '2020-01-01',
            court_id: '550e8400-e29b-41d4-a716-446655440000',
          },
          'poster-1',
        );
        expect(true).toBe(false);
      } catch (e) {
        expect(e.status).toBe(400);
        expect(e.code).toBe('INVALID_DEADLINE');
      }
    });

    it('inserts and returns a new job record', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const deadline = futureDate.toISOString().split('T')[0];

      mockQuery.mockReturnValueOnce({
        rows: [{ id: 'j-new', title: 'New Job', deadline }],
      });

      const job = await jobsService.create(
        {
          title: 'New Job',
          fee: 500,
          deadline,
          court_id: '550e8400-e29b-41d4-a716-446655440000',
        },
        'poster-1',
      );
      expect(job.id).toBe('j-new');
    });
  });
});
