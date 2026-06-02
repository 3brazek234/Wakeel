import { jwt } from '@elysiajs/jwt';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { contextMiddleware, withService } from '../../middleware/context.middleware.js';
import { createSerializer } from '../../middleware/serializer.js';
import { authController } from './auth.controller.js';
import { authService } from './auth.service.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

export function registerAuthRoutes(app) {
  app.group('/auth', (group) =>
    group
      // jwt is needed for sign() in login/register
      .use(jwt({ name: 'jwt', secret: JWT_SECRET }))
      .derive(({ set }) => ({ serializer: createSerializer(set), service: authService }))

      // ── Public ──
      .post('/register', authController.register)
      .post('/login', authController.login)

      // ── Protected ──
      .use(authMiddleware)
      .use(contextMiddleware)
      .get('/me', authController.me),
  );
}
