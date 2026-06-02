import { Elysia } from 'elysia';
import { jwt } from '@elysiajs/jwt';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

/**
 * Elysia plugin that:
 *  1. Registers the jwt helper on context (ctx.jwt)
 *  2. Derives `userId` from the Authorization Bearer token
 *  3. Rejects with 401 if no valid token is present
 */
export const authMiddleware = (app) => app
  .derive(async ({ jwt, headers, set }) => {
    const auth = headers['authorization'];
    if (!auth || !auth.startsWith('Bearer ')) {
      set.status = 401;
      return {
        userId: null,
        authError: { error: true, message: 'Missing token', code: 'MISSING_TOKEN' },
      };
    }

    const token = auth.split(' ')[1];
    try {
      const payload = await jwt.verify(token);
      if (!payload) {
        set.status = 401;
        return {
          userId: null,
          authError: { error: true, message: 'Invalid token', code: 'INVALID_TOKEN' },
        };
      }
      return { userId: payload.userId, authError: null };
    } catch {
      set.status = 401;
      return {
        userId: null,
        authError: { error: true, message: 'Invalid token', code: 'INVALID_TOKEN' },
      };
    }
  })
  .onBeforeHandle(({ userId, authError }) => {
    if (!userId) {
      return authError;
    }
  });

/**
 * Verify a raw JWT string (used by WebSocket auth via ?token= query param).
 * Returns the decoded payload or null.
 */
export async function verifyTokenRaw(token) {
  try {
    // Manually decode the JWT – same algorithm as @elysiajs/jwt (HS256)
    if (!token) return null;
    const [headerB64, payloadB64, signatureB64] = token.split('.');
    if (!headerB64 || !payloadB64 || !signatureB64) return null;

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(JWT_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign', 'verify'],
    );

    const data = encoder.encode(`${headerB64}.${payloadB64}`);

    // Convert base64url → ArrayBuffer
    const sigStr = signatureB64.replace(/-/g, '+').replace(/_/g, '/');
    const sigBuf = Uint8Array.from(atob(sigStr), (c) => c.charCodeAt(0));

    const valid = await crypto.subtle.verify('HMAC', key, sigBuf, data);
    if (!valid) return null;

    const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')));

    // Check expiry
    if (payload.exp && Date.now() / 1000 > payload.exp) return null;

    return payload;
  } catch {
    return null;
  }
}
