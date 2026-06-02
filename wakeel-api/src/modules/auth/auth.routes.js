import { jwt } from '@elysiajs/jwt';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { authController } from './auth.controller.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

export function registerAuthRoutes(app) {
  app.group('/auth', (group) =>
    group
      .use(jwt({ name: 'jwt', secret: JWT_SECRET }))

      // ── Public ──
      .post('/register', authController.register)
      .post('/login', authController.login)

      // ── Protected ──
      .use(authMiddleware)
      .get('/me', authController.me),
  );
}
