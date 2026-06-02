import { db } from '../../db/pool.js';

export const applicationsService = {
  /**
   * Apply to a job.
   * Business rules enforced:
   *   1. Lawyer cannot apply to their own job (applicant_id != poster_id)
   *   2. Lawyer can only apply to jobs at courts listed in their lawyer_courts
   *   5. Unique constraint prevents duplicate applications (job_id, applicant_id)
   */
  async apply(jobId, applicantId, coverNote) {
    // Fetch the job
    const { rows: jobRows } = await db.query(`SELECT * FROM jobs WHERE id = $1`, [jobId]);
    if (!jobRows.length) {
      const err = new Error('Job not found');
      err.status = 404;
      err.code = 'JOB_NOT_FOUND';
      throw err;
    }
    const job = jobRows[0];

    // Rule 1: cannot apply to own job
    if (job.poster_id === applicantId) {
      const err = new Error('You cannot apply to your own job');
      err.status = 400;
      err.code = 'SELF_APPLICATION';
      throw err;
    }

    // Rule 2: applicant must be registered at the job's court
    const { rows: courtCheck } = await db.query(
      `SELECT 1 FROM lawyer_courts WHERE user_id = $1 AND court_id = $2`,
      [applicantId, job.court_id],
    );
    if (!courtCheck.length) {
      const err = new Error('You are not registered at this court');
      err.status = 400;
      err.code = 'NOT_REGISTERED_AT_COURT';
      throw err;
    }

    try {
      const { rows } = await db.query(
        `INSERT INTO applications (job_id, applicant_id, cover_note)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [jobId, applicantId, coverNote || null],
      );
      return rows[0];
    } catch (e) {
      // Rule 5: duplicate application (UNIQUE constraint)
      if (e.code === '23505') {
        const err = new Error('You have already applied to this job');
        err.status = 409;
        err.code = 'DUPLICATE_APPLICATION';
        throw err;
      }
      throw e;
    }
  },

  /**
   * List applications for a job (poster only).
   * Rule 7: only the job poster can view applications.
   */
  async listForJob(jobId, userId) {
    // Verify poster
    const { rows: jobRows } = await db.query(`SELECT poster_id FROM jobs WHERE id = $1`, [jobId]);
    if (!jobRows.length) {
      const err = new Error('Job not found');
      err.status = 404;
      err.code = 'JOB_NOT_FOUND';
      throw err;
    }
    if (jobRows[0].poster_id !== userId) {
      const err = new Error('Only the job poster can view applications');
      err.status = 403;
      err.code = 'FORBIDDEN';
      throw err;
    }

    const { rows } = await db.query(
      `SELECT a.*, u.full_name AS applicant_name, u.email AS applicant_email, u.bar_id
       FROM applications a
       JOIN users u ON u.id = a.applicant_id
       WHERE a.job_id = $1
       ORDER BY a.applied_at DESC`,
      [jobId],
    );
    return rows;
  },

  /**
   * Accept an application.
   * Rule 3: only ONE application can be accepted per job. When one is accepted,
   *         all other pending applications are automatically rejected.
   * Rule 7: only the job poster can accept.
   *
   * Uses a transaction for atomicity.
   */
  async accept(jobId, applicationId, userId) {
    // Verify poster
    const { rows: jobRows } = await db.query(`SELECT poster_id FROM jobs WHERE id = $1`, [jobId]);
    if (!jobRows.length) {
      const err = new Error('Job not found');
      err.status = 404;
      err.code = 'JOB_NOT_FOUND';
      throw err;
    }
    if (jobRows[0].poster_id !== userId) {
      const err = new Error('Only the job poster can accept applications');
      err.status = 403;
      err.code = 'FORBIDDEN';
      throw err;
    }

    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      // Accept the target application
      const { rows: accepted } = await client.query(
        `UPDATE applications SET status = 'accepted' WHERE id = $1 AND job_id = $2 RETURNING *`,
        [applicationId, jobId],
      );

      if (!accepted.length) {
        const err = new Error('Application not found');
        err.status = 404;
        err.code = 'APPLICATION_NOT_FOUND';
        throw err;
      }

      // Reject all other pending applications for this job
      await client.query(
        `UPDATE applications SET status = 'rejected'
         WHERE job_id = $1 AND id != $2 AND status = 'pending'`,
        [jobId, applicationId],
      );

      // Update job status to assigned
      await client.query(
        `UPDATE jobs SET status = 'assigned' WHERE id = $1`,
        [jobId],
      );

      await client.query('COMMIT');
      return accepted[0];
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  },

  /**
   * Reject a single application.
   * Rule 7: only the job poster can reject.
   */
  async reject(jobId, applicationId, userId) {
    const { rows: jobRows } = await db.query(`SELECT poster_id FROM jobs WHERE id = $1`, [jobId]);
    if (!jobRows.length) {
      const err = new Error('Job not found');
      err.status = 404;
      err.code = 'JOB_NOT_FOUND';
      throw err;
    }
    if (jobRows[0].poster_id !== userId) {
      const err = new Error('Only the job poster can reject applications');
      err.status = 403;
      err.code = 'FORBIDDEN';
      throw err;
    }

    const { rows } = await db.query(
      `UPDATE applications SET status = 'rejected' WHERE id = $1 AND job_id = $2 RETURNING *`,
      [applicationId, jobId],
    );
    if (!rows.length) {
      const err = new Error('Application not found');
      err.status = 404;
      err.code = 'APPLICATION_NOT_FOUND';
      throw err;
    }
    return rows[0];
  },
};
