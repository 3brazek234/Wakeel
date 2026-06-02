import { getIO } from './socket.service.js';

export const jobEmitter = {
  /**
   * Emits a 'job:accepted' event to the job room, poster room, and applicant room.
   * @param {string|number} jobId - The ID of the job.
   * @param {string|number} posterId - The ID of the job poster.
   * @param {string|number} applicantId - The ID of the applicant.
   * @param {object} [payload={}] - Additional data to include in the event.
   */
  emitJobAccepted(jobId, posterId, applicantId, payload = {}) {
    try {
      const io = getIO();
      const roomJob = `job:${jobId}`;
      const roomPoster = `user:${posterId}`;
      const roomApplicant = `user:${applicantId}`;

      const data = { jobId, posterId, applicantId, ...payload };

      // Notify job room and specific users in a single emit
      io.to([roomJob, roomPoster, roomApplicant]).emit('job:accepted', data);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('job-emitter: failed to emit job accepted', e?.message || e);
    }
  }
};
