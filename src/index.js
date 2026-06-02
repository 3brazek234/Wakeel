import { Elysia } from 'elysia';
import cors from '@elysiajs/cors';
import { registerAuthRoutes } from './modules/auth/auth.routes.js';
import { registerCourtRoutes } from './modules/courts/courts.routes.js';
import { registerJobRoutes } from './modules/jobs/jobs.routes.js';
import { registerApplicationRoutes } from './modules/applications/applications.routes.js';
import { registerChatRoutes } from './modules/chat/chat.routes.js';
import { registerReviewRoutes } from './modules/reviews/reviews.routes.js';

const app = new Elysia();

// ── Global plugins ──
app.use(cors());

// ── Global error handler ──
app.onError(({ code, error, set }) => {
  const status = error?.status || set?.status || 500;
  const errCode = error?.code || code || 'INTERNAL_ERROR';
  const message = error?.message || 'Internal server error';

  set.status = status;
  return { error: true, message, code: errCode };
});

// ── Mount modules ──
registerAuthRoutes(app);
registerCourtRoutes(app);
registerJobRoutes(app);
registerApplicationRoutes(app);
registerChatRoutes(app);
registerReviewRoutes(app);

// ── Start server ──
const port = process.env.PORT || 3000;

app.listen({ port });

console.log(`🏛️  Wakeel API listening on http://localhost:${port}`);
