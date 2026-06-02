/**
 * Serializer — three standardised response shapes for the frontend.
 *
 * Bound to the current request's `set` object so it can control HTTP status
 * codes without the controller having to touch `set` directly.
 *
 * Usage inside a controller:
 *   return serializer.success(data);
 *   return serializer.created(data);
 *   return serializer.paginated(rows, { page: 1, limit: 20, total: 100 });
 *   return serializer.error(e);
 */
export function createSerializer(set) {
  return {
    // ── Type 1: Success ──
    // Single resource or simple OK response.
    success(data) {
      set.status = 200;
      return { error: false, data };
    },

    // Variant: 201 Created (POST)
    created(data) {
      set.status = 201;
      return { error: false, data };
    },

    // ── Type 2: Paginated ──
    // Collection response with pagination metadata.
    paginated(data, { page, limit, total }) {
      set.status = 200;
      return {
        error: false,
        data,
        meta: {
          page:       Number(page),
          limit:      Number(limit),
          total:      Number(total),
          totalPages: Math.ceil(total / limit),
        },
      };
    },

    // ── Type 3: Error ──
    // Accepts either a caught Error or explicit arguments.
    //   serializer.error(caughtError)
    //   serializer.error('Not found', 'NOT_FOUND', 404)
    error(messageOrError, code, status) {
      if (messageOrError instanceof Error || (typeof messageOrError === 'object' && messageOrError.message)) {
        const e = messageOrError;
        set.status = e.status || 500;
        return { error: true, message: e.message, code: e.code || 'INTERNAL_ERROR' };
      }
      set.status = status || 400;
      return { error: true, message: messageOrError, code: code || 'BAD_REQUEST' };
    },
  };
}
