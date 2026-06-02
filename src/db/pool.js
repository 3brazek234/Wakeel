import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://user:password@localhost:5432/wakeel_db',
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
  process.exit(-1);
});

export const db = {
  query: (text, params) => pool.query(text, params),
  /**
   * Acquire a client for transactions.
   * Usage:
   *   const client = await db.getClient();
   *   try { await client.query('BEGIN'); ... await client.query('COMMIT'); }
   *   catch(e) { await client.query('ROLLBACK'); throw e; }
   *   finally { client.release(); }
   */
  getClient: () => pool.connect(),
};
