import { applicationsService } from './applications.service.js';

export const applicationsController = {
  /**
   * POST /jobs/:jobId/applications
   * Protected — apply to a job.
   */
  async apply({ params, body, userId, set }) {
    try {
      const application = await applicationsService.apply(
        params.jobId,
        userId,
        body?.cover_note,
      );
      set.status = 201;
      return { error: false, data: application };
    } catch (e) {
      set.status = e.status || 500;
      return { error: true, message: e.message, code: e.code || 'INTERNAL_ERROR' };
    }
  },

  /**
   * GET /jobs/:jobId/applications
   * Protected (poster only) — list applications for a job.
   */
  async list({ params, userId, set }) {
    try {
      const apps = await applicationsService.listForJob(params.jobId, userId);
      return { error: false, data: apps };
    } catch (e) {
      set.status = e.status || 500;
      return { error: true, message: e.message, code: e.code || 'INTERNAL_ERROR' };
    }
  },

  /**
   * PATCH /jobs/:jobId/applications/:id/accept
   * Protected (poster only) — accept an application, auto-reject others.
   */
  async accept({ params, userId, set }) {
    try {
      const app = await applicationsService.accept(params.jobId, params.id, userId);
      return { error: false, data: app };
    } catch (e) {
      set.status = e.status || 500;
      return { error: true, message: e.message, code: e.code || 'INTERNAL_ERROR' };
    }
  },

  /**
   * PATCH /jobs/:jobId/applications/:id/reject
   * Protected (poster only) — reject an application.
   */
  async reject({ params, userId, set }) {
    try {
      const app = await applicationsService.reject(params.jobId, params.id, userId);
      return { error: false, data: app };
    } catch (e) {
      set.status = e.status || 500;
      return { error: true, message: e.message, code: e.code || 'INTERNAL_ERROR' };
    }
  },
};
