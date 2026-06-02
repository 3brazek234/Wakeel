import { db } from '../../db/pool.js';
import { assertValid } from '../../middleware/validate.middleware.js';

export const jobsService = {
  /**
   * Create a new job posting.
   * Business rule: deadline must be a future date.
   */
  async create(data, posterId) {
    assertValid(
      {
        title:     { required: true, type: 'string', minLength: 3 },
        fee:       { required: true, type: 'number', min: 0 },
        deadline:  { required: true, type: 'date' },
        court_id:  { required: true, type: 'uuid' },
      },
      data,
    );

    // Rule 6: deadline must be a future date
    if (new Date(data.deadline) <= new Date()) {
      const err = new Error('Deadline must be a future date');
      err.status = 400;
      err.code = 'INVALID_DEADLINE';
      throw err;
    }

    const { rows } = await db.query(
      `INSERT INTO jobs (poster_id, court_id, title, description, task_type, fee, deadline)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [posterId, data.court_id, data.title, data.description || null, data.task_type || null, data.fee, data.deadline],
    );

    return rows[0];
  },

  /**
   * List jobs at the lawyer's registered courts.
   * Query: only courts in the lawyer's lawyer_courts junction.
   */
  async getJobsForLawyer(userId, { status, court_id, page = 1, limit = 20 }) {
    const offset = (page - 1) * limit;
    const params = [userId];
    let idx = 2;

    let where = `
      WHERE j.court_id IN (
        SELECT lc.court_id FROM lawyer_courts lc WHERE lc.user_id = $1
      )`;

    if (status) {
      where += ` AND j.status = $${idx++}`;
      params.push(status);
    }
    if (court_id) {
      where += ` AND j.court_id = $${idx++}`;
      params.push(court_id);
    }

    params.push(limit, offset);

    const { rows } = await db.query(
      `SELECT j.*, c.name AS court_name, c.governorate, c.city,
              u.full_name AS poster_name
       FROM jobs j
       JOIN courts c ON c.id = j.court_id
       JOIN users u ON u.id = j.poster_id
       ${where}
       ORDER BY j.created_at DESC
       LIMIT $${idx++} OFFSET $${idx}`,
      params,
    );

    return rows;
  },

  /**
   * Get a single job by ID.
   */
  async getById(jobId) {
    const { rows } = await db.query(
      `SELECT j.*, c.name AS court_name, c.governorate, c.city,
              u.full_name AS poster_name
       FROM jobs j
       JOIN courts c ON c.id = j.court_id
       JOIN users u ON u.id = j.poster_id
       WHERE j.id = $1`,
      [jobId],
    );

    if (!rows.length) {
      const err = new Error('Job not found');
      err.status = 404;
      err.code = 'JOB_NOT_FOUND';
      throw err;
    }

    return rows[0];
  },

  /**
   * Update job status.
   * Rule 7: only the job poster can update status.
   */
  async updateStatus(jobId, userId, newStatus) {
    const job = await this.getById(jobId);

    if (job.poster_id !== userId) {
      const err = new Error('Only the job poster can update status');
      err.status = 403;
      err.code = 'FORBIDDEN';
      throw err;
    }

    const { rows } = await db.query(
      `UPDATE jobs SET status = $1 WHERE id = $2 RETURNING *`,
      [newStatus, jobId],
    );

    return rows[0];
  },

  /**
   * Delete (cancel) a job.
   * Rule 7: only the job poster can delete.
   */
  async deleteJob(jobId, userId) {
    const job = await this.getById(jobId);

    if (job.poster_id !== userId) {
      const err = new Error('Only the job poster can delete this job');
      err.status = 403;
      err.code = 'FORBIDDEN';
      throw err;
    }

    await db.query(`DELETE FROM jobs WHERE id = $1`, [jobId]);
    return { deleted: true };
  },
};
