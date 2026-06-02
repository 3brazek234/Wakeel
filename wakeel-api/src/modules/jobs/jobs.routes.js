import { authMiddleware } from '../../middleware/auth.middleware.js';
import { jobsService } from './jobs.service.js';

export function registerJobRoutes(app) {
  app.group('/jobs', (group) =>
    group
      .use(authMiddleware)

      // ── POST /jobs ──
      .post('/', async ({ body, userId, set }) => {
        try {
          const job = await jobsService.create(body, userId);
          set.status = 201;
          return { error: false, data: job };
        } catch (e) {
          set.status = e.status || 500;
          return { error: true, message: e.message, code: e.code || 'INTERNAL_ERROR' };
        }
      })

      // ── GET /jobs ──
      .get('/', async ({ query, userId, set }) => {
        try {
          const jobs = await jobsService.getJobsForLawyer(userId, {
            status: query.status,
            court_id: query.court_id,
            page: Number(query.page) || 1,
            limit: Number(query.limit) || 20,
          });
          return { error: false, data: jobs };
        } catch (e) {
          set.status = e.status || 500;
          return { error: true, message: e.message, code: e.code || 'INTERNAL_ERROR' };
        }
      })

      // ── GET /jobs/:id ──
      .get('/:id', async ({ params, set }) => {
        try {
          const job = await jobsService.getById(params.id);
          return { error: false, data: job };
        } catch (e) {
          set.status = e.status || 500;
          return { error: true, message: e.message, code: e.code || 'INTERNAL_ERROR' };
        }
      })

      // ── PATCH /jobs/:id/status ──
      .patch('/:id/status', async ({ params, body, userId, set }) => {
        try {
          const job = await jobsService.updateStatus(params.id, userId, body.status);
          return { error: false, data: job };
        } catch (e) {
          set.status = e.status || 500;
          return { error: true, message: e.message, code: e.code || 'INTERNAL_ERROR' };
        }
      })

      // ── DELETE /jobs/:id ──
      .delete('/:id', async ({ params, userId, set }) => {
        try {
          await jobsService.deleteJob(params.id, userId);
          return { error: false, message: 'Job deleted' };
        } catch (e) {
          set.status = e.status || 500;
          return { error: true, message: e.message, code: e.code || 'INTERNAL_ERROR' };
        }
      }),
  );
}
