import { describe, it, expect, beforeEach, mock } from 'bun:test';

const mockQuery = mock(() => ({ rows: [] }));
mock.module('../../db/pool.js', () => ({
  db: { query: mockQuery, getClient: mock(() => {}) },
}));

const { courtsService } = await import('./courts.service.js');

describe('courtsService', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  it('list returns all courts', async () => {
    mockQuery.mockReturnValueOnce({
      rows: [
        { id: 'c1', name: 'Cairo Court', governorate: 'Cairo', city: 'Cairo' },
        { id: 'c2', name: 'Giza Court', governorate: 'Giza', city: 'Giza' },
      ],
    });
    const courts = await courtsService.list();
    expect(courts).toHaveLength(2);
    expect(courts[0].name).toBe('Cairo Court');
  });

  it('getById returns 404 for non-existent court', async () => {
    mockQuery.mockReturnValueOnce({ rows: [] });
    try {
      await courtsService.getById('non-existent');
      expect(true).toBe(false);
    } catch (e) {
      expect(e.status).toBe(404);
      expect(e.code).toBe('COURT_NOT_FOUND');
    }
  });

  it('getById returns court when found', async () => {
    mockQuery.mockReturnValueOnce({
      rows: [{ id: 'c1', name: 'Cairo Court', governorate: 'Cairo', city: 'Cairo' }],
    });
    const court = await courtsService.getById('c1');
    expect(court.id).toBe('c1');
  });
});
