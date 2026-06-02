/**
 * Integration smoke-test for /auth/register and /auth/login.
 *
 * Mocks the database layer so it runs WITHOUT PostgreSQL.
 * Starts a real Elysia HTTP server and fires real fetch() requests.
 *
 * Run:  bun run src/test-auth-flow.js
 */
import { mock } from 'bun:test';

// ── 1. Mock the DB before anything imports it ──
const users = new Map();

mock.module('./db/pool.js', () => ({
  db: {
    query: async (sql, params) => {
      // ── INSERT user ──
      if (sql.trim().startsWith('INSERT INTO users')) {
        const id = crypto.randomUUID();
        const [full_name, email, phone, bar_id, password_hash] = params;

        // Check duplicates
        for (const u of users.values()) {
          if (u.email === email) {
            const e = new Error('duplicate key'); e.code = '23505'; e.constraint = 'users_email_key'; throw e;
          }
          if (u.bar_id === bar_id) {
            const e = new Error('duplicate key'); e.code = '23505'; e.constraint = 'users_bar_id_key'; throw e;
          }
        }

        const user = { id, full_name, email, phone, bar_id, password_hash, status: 'pending', created_at: new Date().toISOString() };
        users.set(id, user);
        const { password_hash: _, ...safe } = user;
        return { rows: [safe] };
      }

      // ── INSERT lawyer_courts ──
      if (sql.trim().startsWith('INSERT INTO lawyer_courts')) {
        return { rows: [{ id: crypto.randomUUID() }] };
      }

      // ── SELECT user by email (login) ──
      if (sql.includes('FROM users WHERE email')) {
        const email = params[0];
        const found = [...users.values()].find(u => u.email === email);
        return { rows: found ? [found] : [] };
      }

      // ── SELECT user profile (me) ──
      if (sql.includes('FROM users u') && sql.includes('LEFT JOIN lawyer_courts')) {
        const id = params[0];
        const u = users.get(id);
        if (!u) return { rows: [] };
        const { password_hash: _, ...safe } = u;
        return { rows: [{ ...safe, courts: [] }] };
      }

      return { rows: [] };
    },
    getClient: async () => ({
      query: async (sql, params) => {
        // Delegate to the main mock
        if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') return {};
        const mod = await import('./db/pool.js');
        return mod.db.query(sql, params);
      },
      release: () => {},
    }),
  },
}));

// ── 2. Now import the app (it will use the mocked DB) ──
const { Elysia } = await import('elysia');
const { jwt } = await import('@elysiajs/jwt');
const { authService } = await import('./modules/auth/auth.service.js');
const { authController } = await import('./modules/auth/auth.controller.js');

const JWT_SECRET = 'test-secret';

const { registerAuthRoutes } = await import('./modules/auth/auth.routes.js');

const app = new Elysia();
registerAuthRoutes(app);
app.listen(0);

const BASE = `http://localhost:${app.server.port}`;
const hr = () => console.log('\n' + '═'.repeat(60));

// ── 3. Test helpers ──
async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  try {
    return { status: res.status, data: JSON.parse(text) };
  } catch {
    return { status: res.status, data: text };
  }
}

async function get(path, token) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const text = await res.text();
  try {
    return { status: res.status, data: JSON.parse(text) };
  } catch {
    return { status: res.status, data: text };
  }
}

// ── 4. Run the flow ──
console.log('🏛️  Wakeel Auth Flow — Integration Test');
console.log(`   Server running on ${BASE}`);

hr();
console.log('📝 Step 1: Register a new lawyer');
const reg = await post('/auth/register', {
  full_name: 'أحمد محمود',
  email: 'ahmed@wakeel.eg',
  phone: '01012345678',
  bar_id: 'BAR-CAIRO-001',
  password: 'securePass123',
  court_ids: ['550e8400-e29b-41d4-a716-446655440000'],
});
console.log(`   Status: ${reg.status}`);
console.log('   Response:', JSON.stringify(reg.data, null, 2));

const token = reg.data?.data?.token;

hr();
console.log('🔐 Step 2: Login with the same credentials');
const login = await post('/auth/login', {
  email: 'ahmed@wakeel.eg',
  password: 'securePass123',
});
console.log(`   Status: ${login.status}`);
console.log('   Response:', JSON.stringify(login.data, null, 2));

hr();
console.log('❌ Step 3: Login with WRONG password');
const badLogin = await post('/auth/login', {
  email: 'ahmed@wakeel.eg',
  password: 'wrongPassword',
});
console.log(`   Status: ${badLogin.status}`);
console.log('   Response:', JSON.stringify(badLogin.data, null, 2));

hr();
console.log('👤 Step 4: GET /auth/me with valid token');
const me = await get('/auth/me', token);
console.log(`   Status: ${me.status}`);
console.log('   Response:', JSON.stringify(me.data, null, 2));

hr();
console.log('🚫 Step 5: GET /auth/me WITHOUT token');
const noAuth = await get('/auth/me', '');
console.log(`   Status: ${noAuth.status}`);
console.log('   Response:', JSON.stringify(noAuth.data, null, 2));

hr();
console.log('📝 Step 6: Register with DUPLICATE email');
const dup = await post('/auth/register', {
  full_name: 'محمد سعيد',
  email: 'ahmed@wakeel.eg',
  phone: '01098765432',
  bar_id: 'BAR-GIZA-002',
  password: 'anotherPass456',
  court_ids: ['550e8400-e29b-41d4-a716-446655440000'],
});
console.log(`   Status: ${dup.status}`);
console.log('   Response:', JSON.stringify(dup.data, null, 2));

hr();
console.log('\n✅ All auth flow scenarios tested!');

app.stop();
process.exit(0);
