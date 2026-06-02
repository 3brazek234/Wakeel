export const authController = {
  /**
   * POST /auth/register
   * Public — creates a new user and returns a signed JWT.
   */
  async register({ body, jwt, service, serializer }) {
    try {
      const user = await service.register(body);
      const token = await jwt.sign({ userId: user.id });
      return serializer.created({ user, token });
    } catch (e) {
      return serializer.error(e);
    }
  },

  /**
   * POST /auth/login
   * Public — authenticates and returns a signed JWT.
   */
  async login({ body, jwt, service, serializer }) {
    try {
      const user = await service.login(body.email, body.password);
      const token = await jwt.sign({ userId: user.id });
      return serializer.success({ user, token });
    } catch (e) {
      return serializer.error(e);
    }
  },

  /**
   * GET /auth/me
   * Protected — returns the current user's profile.
   */
  async me({ userId, service, serializer }) {
    try {
      const user = await service.getProfile(userId);
      return serializer.success(user);
    } catch (e) {
      return serializer.error(e);
    }
  },
};
