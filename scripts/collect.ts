import { getPool } from '../src/lib/db';
import { runCheck } from '../src/lib/service';
const pool = getPool();
try {
  const { rows } = await pool.query("SELECT id,name FROM institutions WHERE workspace_id='personal' AND active=true ORDER BY name");
  for (const item of rows) console.log(item.name, JSON.stringify(await runCheck(item.id)));
} finally { await pool.end(); }
