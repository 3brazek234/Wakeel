import { describe, it, expect, beforeEach, mock } from 'bun:test';

// ── Mock the database pool ──
const mockQuery = mock(() => ({ rows: [] }));
const mockClient = {
  query: mock(() => ({ rows: [] })),
  release: mock(() => {}),
};
const mockGetClient = mock(() => mockClient);

mock.module('../../db/pool.js', () => ({
  db: { query: mockQuery, getClient: mockGetClient },
}));

const { authService } = await import('./auth.service.js');

// ── Helpers ──
function resetMocks() {
  mockQuery.mockReset();
  mockClient.query.mockReset();
  mockClient.release.mockReset();
  mockGetClient.mockReset();
  mockGetClient.mockReturnValue(mockClient);
}

describe('authService', () => {
  beforeEach(() => {
    resetMocks();
  });

  // ──────────────────────────────────────
  describe('register', () => {
    it('fails with duplicate email (23505 on email constraint)', async () => {
      // BEGIN succeeds
      mockClient.query.mockImplementationOnce(() => ({}));
      // INSERT user throws duplicate
      const pgErr = new Error('duplicate key');
      pgErr.code = '23505';
      pgErr.constraint = 'users_email_key';
      mockClient.query.mockImplementationOnce(() => { throw pgErr; });
      // ROLLBACK
      mockClient.query.mockImplementationOnce(() => ({}));

      try {
        await authService.register({
          full_name: 'Test User',
          email: 'dup@test.com',
          phone: '01000000000',
          bar_id: 'BAR-001',
          password: 'password123',
          court_ids: ['court-1'],
        });
        expect(true).toBe(false); // should not reach
      } catch (e) {
        expect(e.status).toBe(409);
        expect(e.code).toBe('DUPLICATE_EMAIL');
      }
    });

    it('fails with duplicate bar_id (23505 on bar_id constraint)', async () => {
      mockClient.query.mockImplementationOnce(() => ({}));
      const pgErr = new Error('duplicate key');
      pgErr.code = '23505';
      pgErr.constraint = 'users_bar_id_key';
      mockClient.query.mockImplementationOnce(() => { throw pgErr; });
      mockClient.query.mockImplementationOnce(() => ({}));

      try {
        await authService.register({
          full_name: 'Test User',
          email: 'new@test.com',
          phone: '01000000000',
          bar_id: 'BAR-DUP',
          password: 'password123',
          court_ids: ['court-1'],
        });
        expect(true).toBe(false);
      } catch (e) {
        expect(e.status).toBe(409);
        expect(e.code).toBe('DUPLICATE_BAR_ID');
      }
    });
  });

  // ──────────────────────────────────────
  describe('login', () => {
    it('returns user on valid credentials', async () => {
      const hash = await Bun.password.hash('correct', { algorithm: 'bcrypt', cost: 4 });
      mockQuery.mockReturnValueOnce({
        rows: [
          {
            id: 'u1',
            full_name: 'Lawyer',
            email: 'a@b.com',
            phone: null,
            bar_id: 'B1',
            password_hash: hash,
            status: 'active',
            created_at: new Date().toISOString(),
          },
        ],
      });

      const user = await authService.login('a@b.com', 'correct');
      expect(user.id).toBe('u1');
      expect(user.password_hash).toBeUndefined();
    });

    it('throws on wrong password', async () => {
      const hash = await Bun.password.hash('correct', { algorithm: 'bcrypt', cost: 4 });
      mockQuery.mockReturnValueOnce({
        rows: [
          {
            id: 'u1',
            full_name: 'Lawyer',
            email: 'a@b.com',
            phone: null,
            bar_id: 'B1',
            password_hash: hash,
            status: 'active',
            created_at: new Date().toISOString(),
          },
        ],
      });

      try {
        await authService.login('a@b.com', 'wrong');
        expect(true).toBe(false);
      } catch (e) {
        expect(e.status).toBe(401);
        expect(e.code).toBe('INVALID_CREDENTIALS');
      }
    });
  });
});
