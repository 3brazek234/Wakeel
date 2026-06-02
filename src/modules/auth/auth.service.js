import { db } from '../../db/pool.js';
import { assertValid } from '../../middleware/validate.middleware.js';

export const authService = {
  /**
   * Register a new lawyer.
   * Inserts user row + lawyer_courts junction rows inside a transaction.
   */
  async register({ full_name, email, phone, bar_id, password, court_ids }) {
    // ── Validation ──
    assertValid(
      {
        full_name: { required: true, type: 'string', minLength: 2 },
        email:     { required: true, type: 'email' },
        bar_id:    { required: true, type: 'string' },
        password:  { required: true, type: 'string', minLength: 6 },
        court_ids: { required: true, type: 'array' },
      },
      { full_name, email, phone, bar_id, password, court_ids },
    );

    if (!court_ids.length) {
      const err = new Error('At least one court is required');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    // ── Hash password with Bun native API ──
    const password_hash = await Bun.password.hash(password, { algorithm: 'bcrypt', cost: 10 });

    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      // Insert user
      const { rows } = await client.query(
        `INSERT INTO users (full_name, email, phone, bar_id, password_hash)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, full_name, email, phone, bar_id, status, created_at`,
        [full_name, email, phone || null, bar_id, password_hash],
      );

      const user = rows[0];

      // Insert lawyer_courts junction rows
      for (const courtId of court_ids) {
        await client.query(
          `INSERT INTO lawyer_courts (user_id, court_id) VALUES ($1, $2)`,
          [user.id, courtId],
        );
      }

      await client.query('COMMIT');
      return user;
    } catch (e) {
      await client.query('ROLLBACK');

      // Duplicate email
      if (e.code === '23505' && e.constraint?.includes('email')) {
        const err = new Error('Email already registered');
        err.status = 409;
        err.code = 'DUPLICATE_EMAIL';
        throw err;
      }
      // Duplicate bar_id
      if (e.code === '23505' && e.constraint?.includes('bar_id')) {
        const err = new Error('Bar ID already registered');
        err.status = 409;
        err.code = 'DUPLICATE_BAR_ID';
        throw err;
      }
      throw e;
    } finally {
      client.release();
    }
  },

  /**
   * Authenticate a user by email + password.
   * Returns the user row (without password_hash).
   */
  async login(email, password) {
    assertValid(
      {
        email:    { required: true, type: 'email' },
        password: { required: true, type: 'string' },
      },
      { email, password },
    );

    const { rows } = await db.query(
      `SELECT id, full_name, email, phone, bar_id, password_hash, status, created_at
       FROM users WHERE email = $1`,
      [email],
    );

    if (!rows.length) {
      const err = new Error('Invalid email or password');
      err.status = 401;
      err.code = 'INVALID_CREDENTIALS';
      throw err;
    }

    const user = rows[0];
    const valid = await Bun.password.verify(password, user.password_hash);
    if (!valid) {
      const err = new Error('Invalid email or password');
      err.status = 401;
      err.code = 'INVALID_CREDENTIALS';
      throw err;
    }

    // Remove sensitive field before returning
    const { password_hash: _, ...safeUser } = user;
    return safeUser;
  },

  /**
   * Fetch current user profile including their courts.
   */
  async getProfile(userId) {
    const { rows } = await db.query(
      `SELECT u.id, u.full_name, u.email, u.phone, u.bar_id, u.status, u.created_at,
              COALESCE(json_agg(json_build_object(
                'id', c.id, 'name', c.name, 'governorate', c.governorate, 'city', c.city
              )) FILTER (WHERE c.id IS NOT NULL), '[]') AS courts
       FROM users u
       LEFT JOIN lawyer_courts lc ON lc.user_id = u.id
       LEFT JOIN courts c ON c.id = lc.court_id
       WHERE u.id = $1
       GROUP BY u.id`,
      [userId],
    );

    if (!rows.length) {
      const err = new Error('User not found');
      err.status = 404;
      err.code = 'USER_NOT_FOUND';
      throw err;
    }

    return rows[0];
  },
};
