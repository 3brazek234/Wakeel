import { authMiddleware } from '../../middleware/auth.middleware.js';
import { contextMiddleware, withService } from '../../middleware/context.middleware.js';
import { applicationsService } from './applications.service.js';
import { applicationsController } from './applications.controller.js';

export function registerApplicationRoutes(app) {
  app.group('/jobs/:jobId/applications', (group) =>
    group
      .use(authMiddleware)
      .use(contextMiddleware)
      .use(withService(applicationsService))

      .post('/', applicationsController.apply)
      .get('/', applicationsController.list)
      .patch('/:id/accept', applicationsController.accept)
      .patch('/:id/reject', applicationsController.reject),
  );
}
