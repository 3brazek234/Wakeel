import { db } from '../../db/pool.js';

export const chatService = {
  /**
   * Verify a user is party to a job (poster or accepted applicant).
   * Rule 8: only parties to a job can send/read messages.
   */
  async verifyParty(jobId, userId) {
    const { rows } = await db.query(
      `SELECT 1 FROM jobs WHERE id = $1 AND poster_id = $2
       UNION
       SELECT 1 FROM applications WHERE job_id = $1 AND applicant_id = $2 AND status = 'accepted'`,
      [jobId, userId],
    );
    return rows.length > 0;
  },

  /**
   * Persist a message to the database.
   */
  async saveMessage(jobId, senderId, body) {
    const { rows } = await db.query(
      `INSERT INTO messages (job_id, sender_id, body)
       VALUES ($1, $2, $3)
       RETURNING id, job_id, sender_id, body, sent_at`,
      [jobId, senderId, body],
    );
    return rows[0];
  },

  /**
   * Fetch last N messages for a job (most recent first, reversed to chronological).
   */
  async getHistory(jobId, limit = 50) {
    const { rows } = await db.query(
      `SELECT m.id, m.job_id, m.sender_id, m.body, m.sent_at,
              u.full_name AS sender_name
       FROM messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.job_id = $1
       ORDER BY m.sent_at DESC
       LIMIT $2`,
      [jobId, limit],
    );
    return rows.reverse(); // chronological order
  },
};
