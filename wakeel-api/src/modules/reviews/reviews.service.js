import { db } from '../../db/pool.js';

export const reviewsService = {
  /**
   * Create a review for a completed job.
   * Business rules enforced:
   *   4. Review can only be created when job.status = 'completed'
   *   5. Each user can leave only ONE review per job (UNIQUE constraint)
   *   8. Only parties to the job can leave a review
   */
  async create(jobId, reviewerId, { rating, comment }) {
    // Validate rating
    if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
      const err = new Error('Rating must be an integer between 1 and 5');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    // Fetch the job
    const { rows: jobRows } = await db.query(`SELECT * FROM jobs WHERE id = $1`, [jobId]);
    if (!jobRows.length) {
      const err = new Error('Job not found');
      err.status = 404;
      err.code = 'JOB_NOT_FOUND';
      throw err;
    }
    const job = jobRows[0];

    // Rule 4: job must be completed
    if (job.status !== 'completed') {
      const err = new Error('Reviews can only be submitted for completed jobs');
      err.status = 400;
      err.code = 'JOB_NOT_COMPLETED';
      throw err;
    }

    // Determine if reviewer is party to the job and who they are reviewing
    const isPoster = job.poster_id === reviewerId;

    // Check if the reviewer is the accepted applicant
    const { rows: appRows } = await db.query(
      `SELECT applicant_id FROM applications
       WHERE job_id = $1 AND status = 'accepted' LIMIT 1`,
      [jobId],
    );

    const acceptedApplicantId = appRows.length ? appRows[0].applicant_id : null;
    const isApplicant = acceptedApplicantId === reviewerId;

    // Rule 8: only parties (poster or accepted applicant) can review
    if (!isPoster && !isApplicant) {
      const err = new Error('You are not a party to this job');
      err.status = 403;
      err.code = 'FORBIDDEN';
      throw err;
    }

    // Determine the reviewee: if poster reviews → reviewee is applicant, and vice versa
    const revieweeId = isPoster ? acceptedApplicantId : job.poster_id;

    if (!revieweeId) {
      const err = new Error('Cannot determine reviewee — no accepted applicant');
      err.status = 400;
      err.code = 'NO_REVIEWEE';
      throw err;
    }

    try {
      const { rows } = await db.query(
        `INSERT INTO reviews (job_id, reviewer_id, reviewee_id, rating, comment)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [jobId, reviewerId, revieweeId, rating, comment || null],
      );
      return rows[0];
    } catch (e) {
      // Rule 5: UNIQUE(job_id, reviewer_id)
      if (e.code === '23505') {
        const err = new Error('You have already reviewed this job');
        err.status = 409;
        err.code = 'DUPLICATE_REVIEW';
        throw err;
      }
      throw e;
    }
  },

  /**
   * Get all reviews for a lawyer + average rating.
   */
  async getForLawyer(lawyerId) {
    const { rows: reviews } = await db.query(
      `SELECT r.*, u.full_name AS reviewer_name
       FROM reviews r
       JOIN users u ON u.id = r.reviewer_id
       WHERE r.reviewee_id = $1
       ORDER BY r.created_at DESC`,
      [lawyerId],
    );

    const { rows: avgRows } = await db.query(
      `SELECT COALESCE(AVG(rating), 0) AS avg_rating, COUNT(*)::int AS total_reviews
       FROM reviews WHERE reviewee_id = $1`,
      [lawyerId],
    );

    return {
      reviews,
      avg_rating: parseFloat(Number(avgRows[0].avg_rating).toFixed(2)),
      total_reviews: avgRows[0].total_reviews,
    };
  },
};
