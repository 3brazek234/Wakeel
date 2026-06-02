export const applicationsController = {
  /**
   * POST /jobs/:jobId/applications
   * Protected — apply to a job.
   */
  async apply({ params, body, userId, service, serializer }) {
    try {
      const application = await service.apply(params.jobId, userId, body?.cover_note);
      return serializer.created(application);
    } catch (e) {
      return serializer.error(e);
    }
  },

  /**
   * GET /jobs/:jobId/applications
   * Protected (poster only) — list applications for a job.
   */
  async list({ params, userId, bouncer, service, serializer }) {
    try {
      const apps = await service.listForJob(params.jobId, userId);
      return serializer.success(apps);
    } catch (e) {
      return serializer.error(e);
    }
  },

  /**
   * PATCH /jobs/:jobId/applications/:id/accept
   * Protected (poster only) — accept an application, auto-reject others.
   */
  async accept({ params, userId, service, serializer }) {
    try {
      const app = await service.accept(params.jobId, params.id, userId);
      return serializer.success(app);
    } catch (e) {
      return serializer.error(e);
    }
  },

  /**
   * PATCH /jobs/:jobId/applications/:id/reject
   * Protected (poster only) — reject an application.
   */
  async reject({ params, userId, service, serializer }) {
    try {
      const app = await service.reject(params.jobId, params.id, userId);
      return serializer.success(app);
    } catch (e) {
      return serializer.error(e);
    }
  },
};
