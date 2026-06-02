import { authService } from './auth.service.js';

export const authController = {
  /**
   * POST /auth/register
   * Public — creates a new user and returns a signed JWT.
   */
  async register({ body, jwt, set }) {
    try {
      const user = await authService.register(body);
      const token = await jwt.sign({ userId: user.id });
      set.status = 201;
      return { error: false, data: { user, token } };
    } catch (e) {
      set.status = e.status || 500;
      return { error: true, message: e.message, code: e.code || 'INTERNAL_ERROR' };
    }
  },

  /**
   * POST /auth/login
   * Public — authenticates and returns a signed JWT.
   */
  async login({ body, jwt, set }) {
    try {
      const user = await authService.login(body.email, body.password);
      const token = await jwt.sign({ userId: user.id });
      return { error: false, data: { user, token } };
    } catch (e) {
      set.status = e.status || 500;
      return { error: true, message: e.message, code: e.code || 'INTERNAL_ERROR' };
    }
  },

  /**
   * GET /auth/me
   * Protected — returns the current user's profile.
   */
  async me({ userId, set }) {
    try {
      const user = await authService.getProfile(userId);
      return { error: false, data: user };
    } catch (e) {
      set.status = e.status || 500;
      return { error: true, message: e.message, code: e.code || 'INTERNAL_ERROR' };
    }
  },
};
