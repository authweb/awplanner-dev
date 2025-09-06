// server/scripts/ping.ts
import { pool } from '../src/db';
async function main() {
  await pool.query('select 1');
  console.log('DB OK');
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
