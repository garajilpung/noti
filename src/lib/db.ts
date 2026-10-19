import { Pool, types, type PoolClient } from 'pg';
import { attachDatabasePool } from '@vercel/functions';

types.setTypeParser(1184, (v: string) => new Date(v).toISOString());
types.setTypeParser(1082, (v: string) => v);
const globalDb = globalThis as typeof globalThis & { notiPool?: Pool };
export function databaseConnection(direct = false) {
  const value = direct ? process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL : process.env.DATABASE_URL;
  if (!value) throw new Error('DATABASE_URL이 설정되지 않았습니다.');
  const url = new URL(value);
  url.searchParams.set('sslmode','verify-full');
  return url.href;
}
export function getPool() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL이 설정되지 않았습니다.');
  if (!globalDb.notiPool) {
    globalDb.notiPool = new Pool({
      connectionString: databaseConnection(), max: 5,
      connectionTimeoutMillis: 10000, idleTimeoutMillis: 20000, query_timeout: 15000,
    });
    if (process.env.VERCEL) attachDatabasePool(globalDb.notiPool);
  }
  return globalDb.notiPool;
}
export async function transaction<T>(fn: (client: PoolClient) => Promise<T>) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}
export const WORKSPACE = 'personal';
