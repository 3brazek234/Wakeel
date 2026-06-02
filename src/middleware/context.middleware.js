import { Elysia } from 'elysia';
import { createSerializer } from './serializer.js';
import { createBouncer } from './bouncer.js';

/**
 * Context middleware — injects `bouncer` and `serializer` into the Elysia context.
 *
 * Must be applied AFTER `authMiddleware` (needs `userId` in context).
 *
 * Usage in routes:
 *   group.use(authMiddleware).use(contextMiddleware)
 */
export const contextMiddleware = (app) => app
  .derive(({ userId, set }) => ({
    bouncer:    createBouncer(userId),
    serializer: createSerializer(set),
  }));

/**
 * Helper — creates a small Elysia plugin that injects a specific service
 * into the context as `service`.
 *
 * Usage in routes:
 *   group
 *     .use(authMiddleware)
 *     .use(contextMiddleware)
 *     .use(withService(applicationsService))
 *     .post('/', controller.apply)
 *
 * @param {Object} serviceInstance — any service object (applicationsService, jobsService, etc.)
 * @returns {Elysia}
 */
export function withService(serviceInstance) {
  return new Elysia()
    .derive(() => ({ service: serviceInstance }));
}
