import { describe, it, expect, beforeEach, mock } from 'bun:test';

// ── Mock DB ──
const mockQuery = mock(() => ({ rows: [] }));
mock.module('../../db/pool.js', () => ({
  db: { query: mockQuery, getClient: mock(() => {}) },
}));

const { reviewsService } = await import('./reviews.service.js');

describe('reviewsService', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  // ──────────────────────────────────────
  describe('create', () => {
    it('throws if job is not completed (rule 4)', async () => {
      mockQuery.mockReturnValueOnce({
        rows: [{ id: 'j1', poster_id: 'p1', status: 'open' }],
      });

      try {
        await reviewsService.create('j1', 'p1', { rating: 5, comment: 'Great' });
        expect(true).toBe(false);
      } catch (e) {
        expect(e.status).toBe(400);
        expect(e.code).toBe('JOB_NOT_COMPLETED');
      }
    });

    it('throws if user is not a party to the job (rule 8)', async () => {
      // Job is completed
      mockQuery.mockReturnValueOnce({
        rows: [{ id: 'j1', poster_id: 'poster-1', status: 'completed' }],
      });
      // Accepted applicant is someone else
      mockQuery.mockReturnValueOnce({
        rows: [{ applicant_id: 'applicant-1' }],
      });

      try {
        await reviewsService.create('j1', 'random-user', { rating: 4, comment: 'OK' });
        expect(true).toBe(false);
      } catch (e) {
        expect(e.status).toBe(403);
        expect(e.code).toBe('FORBIDDEN');
      }
    });

    it('throws on duplicate review (unique constraint, rule 5)', async () => {
      // Job is completed
      mockQuery.mockReturnValueOnce({
        rows: [{ id: 'j1', poster_id: 'poster-1', status: 'completed' }],
      });
      // Accepted applicant
      mockQuery.mockReturnValueOnce({
        rows: [{ applicant_id: 'applicant-1' }],
      });
      // INSERT throws unique violation
      const pgErr = new Error('duplicate');
      pgErr.code = '23505';
      mockQuery.mockImplementationOnce(() => { throw pgErr; });

      try {
        await reviewsService.create('j1', 'poster-1', { rating: 5, comment: 'Good' });
        expect(true).toBe(false);
      } catch (e) {
        expect(e.status).toBe(409);
        expect(e.code).toBe('DUPLICATE_REVIEW');
      }
    });

    it('creates a review successfully when all rules pass', async () => {
      // Job is completed
      mockQuery.mockReturnValueOnce({
        rows: [{ id: 'j1', poster_id: 'poster-1', status: 'completed' }],
      });
      // Accepted applicant
      mockQuery.mockReturnValueOnce({
        rows: [{ applicant_id: 'applicant-1' }],
      });
      // INSERT succeeds
      mockQuery.mockReturnValueOnce({
        rows: [{ id: 'r1', rating: 5, reviewer_id: 'poster-1', reviewee_id: 'applicant-1' }],
      });

      const review = await reviewsService.create('j1', 'poster-1', {
        rating: 5,
        comment: 'Excellent work',
      });
      expect(review.id).toBe('r1');
      expect(review.rating).toBe(5);
    });
  });
});
