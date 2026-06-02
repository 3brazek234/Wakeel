import { authMiddleware, verifyTokenRaw } from '../../middleware/auth.middleware.js';
import { chatService } from './chat.service.js';

export function registerChatRoutes(app) {
  // ── WebSocket: /chat/:jobId?token=<JWT> ──
  app.ws('/chat/:jobId', {
    async open(ws) {
      const jobId = ws.data.params.jobId;
      const token = ws.data.query?.token;

      // Authenticate via query param
      const payload = await verifyTokenRaw(token);
      if (!payload || !payload.userId) {
        ws.send(JSON.stringify({ type: 'error', message: 'Unauthorized' }));
        ws.close();
        return;
      }

      const userId = payload.userId;
      ws.data.userId = userId;

      // Rule 8: verify user is party to the job
      const isParty = await chatService.verifyParty(jobId, userId);
      if (!isParty) {
        ws.send(JSON.stringify({ type: 'error', message: 'You are not a party to this job' }));
        ws.close();
        return;
      }

      // Subscribe to the job room
      const room = `job:${jobId}`;
      ws.subscribe(room);

      // Send chat history
      const messages = await chatService.getHistory(jobId);
      ws.send(JSON.stringify({ type: 'history', messages }));
    },

    async message(ws, rawMessage) {
      const jobId = ws.data.params.jobId;
      const userId = ws.data.userId;

      if (!userId) {
        ws.send(JSON.stringify({ type: 'error', message: 'Not authenticated' }));
        return;
      }

      try {
        const parsed = typeof rawMessage === 'string' ? JSON.parse(rawMessage) : rawMessage;
        const body = parsed.body;

        if (!body || typeof body !== 'string' || !body.trim()) {
          ws.send(JSON.stringify({ type: 'error', message: 'Message body is required' }));
          return;
        }

        // Persist to database
        const saved = await chatService.saveMessage(jobId, userId, body.trim());

        // Broadcast to room
        const room = `job:${jobId}`;
        ws.publish(
          room,
          JSON.stringify({
            type: 'message',
            senderId: saved.sender_id,
            body: saved.body,
            sentAt: saved.sent_at,
          }),
        );

        // Also send to self (publish doesn't echo to sender)
        ws.send(
          JSON.stringify({
            type: 'message',
            senderId: saved.sender_id,
            body: saved.body,
            sentAt: saved.sent_at,
          }),
        );
      } catch {
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
      }
    },

    close(ws) {
      const jobId = ws.data.params.jobId;
      ws.unsubscribe(`job:${jobId}`);
    },
  });

  // ── REST fallback: GET /jobs/:jobId/messages ──
  app.group('/jobs/:jobId/messages', (group) =>
    group
      .use(authMiddleware)
      .get('/', async ({ params, userId, set }) => {
        try {
          const isParty = await chatService.verifyParty(params.jobId, userId);
          if (!isParty) {
            set.status = 403;
            return { error: true, message: 'You are not a party to this job', code: 'FORBIDDEN' };
          }
          const messages = await chatService.getHistory(params.jobId);
          return { error: false, data: messages };
        } catch (e) {
          set.status = e.status || 500;
          return { error: true, message: e.message, code: e.code || 'INTERNAL_ERROR' };
        }
      }),
  );
}
