import { db } from '../../db/pool.js';

export const courtsService = {
  /**
   * List all courts.
   */
  async list() {
    const { rows } = await db.query(
      `SELECT id, name, governorate, city FROM courts ORDER BY governorate, city`,
    );
    return rows;
  },

  /**
   * Get a single court by ID.
   */
  async getById(courtId) {
    const { rows } = await db.query(
      `SELECT id, name, governorate, city FROM courts WHERE id = $1`,
      [courtId],
    );
    if (!rows.length) {
      const err = new Error('Court not found');
      err.status = 404;
      err.code = 'COURT_NOT_FOUND';
      throw err;
    }
    return rows[0];
  },
};
