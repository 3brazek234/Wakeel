import { authMiddleware } from '../../middleware/auth.middleware.js';
import { reviewsService } from './reviews.service.js';

export function registerReviewRoutes(app) {
  // ── POST /jobs/:jobId/reviews ──
  app.group('/jobs/:jobId/reviews', (group) =>
    group
      .use(authMiddleware)
      .post('/', async ({ params, body, userId, set }) => {
        try {
          const review = await reviewsService.create(params.jobId, userId, body);
          set.status = 201;
          return { error: false, data: review };
        } catch (e) {
          set.status = e.status || 500;
          return { error: true, message: e.message, code: e.code || 'INTERNAL_ERROR' };
        }
      }),
  );

  // ── GET /lawyers/:id/reviews ──
  app.group('/lawyers/:id/reviews', (group) =>
    group
      .use(authMiddleware)
      .get('/', async ({ params, set }) => {
        try {
          const data = await reviewsService.getForLawyer(params.id);
          return { error: false, data };
        } catch (e) {
          set.status = e.status || 500;
          return { error: true, message: e.message, code: e.code || 'INTERNAL_ERROR' };
        }
      }),
  );
}
