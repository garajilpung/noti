import { readFileSync } from 'node:fs';
import { Pool } from 'pg';
import { databaseConnection } from '../src/lib/db';

const pool = new Pool({ connectionString: databaseConnection(true) });
try {
  await pool.query(readFileSync('db/001-initial.sql', 'utf8'));
  console.log('데이터베이스 마이그레이션 완료');
} finally { await pool.end(); }
