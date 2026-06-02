import { courtsService } from './courts.service.js';

export function registerCourtRoutes(app) {
  app.group('/courts', (group) =>
    group
      // ── GET /courts ── (public)
      .get('/', async ({ set }) => {
        try {
          const courts = await courtsService.list();
          return { error: false, data: courts };
        } catch (e) {
          set.status = e.status || 500;
          return { error: true, message: e.message, code: e.code || 'INTERNAL_ERROR' };
        }
      })

      // ── GET /courts/:id ── (public)
      .get('/:id', async ({ params, set }) => {
        try {
          const court = await courtsService.getById(params.id);
          return { error: false, data: court };
        } catch (e) {
          set.status = e.status || 500;
          return { error: true, message: e.message, code: e.code || 'INTERNAL_ERROR' };
        }
      }),
  );
}
