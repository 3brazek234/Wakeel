import { getIO } from './socket.service.js';

export const jobEmitter = {
  emitJobAccepted(jobId, posterId, applicantId, payload = {}) {
    try {
      const io = getIO();
      const roomJob = `job:${jobId}`;
      const roomPoster = `user:${posterId}`;
      const roomApplicant = `user:${applicantId}`;

      const data = { jobId, posterId, applicantId, ...payload };

      // Notify job room
      io.to(roomJob).emit('job:accepted', data);
      // Notify specific users
      io.to(roomPoster).emit('job:accepted', data);
      io.to(roomApplicant).emit('job:accepted', data);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('job-emitter: failed to emit job accepted', e?.message || e);
    }
  }
};
