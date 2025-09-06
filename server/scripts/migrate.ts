import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { sql, withTransaction } from "../src/db"; // tsx запускает TS напрямую

const CWD = process.cwd();
const CANDIDATES = [
  path.join(CWD, 'migrations'),            // когда cwd = server
  path.join(CWD, 'server', 'migrations'),  // когда cwd = корень монорепы
];
const MIGRATIONS_DIR = CANDIDATES.find(fs.existsSync) ?? CANDIDATES[0];
const TABLE = "_migrations";
const LOCK_KEY = 4815162342; // любой стабильный int64 для advisory lock

async function ensureTable() {
  await sql(`
    create table if not exists ${TABLE}(
      id text primary key,
      applied_at timestamptz not null default now(),
      checksum text not null
    )
  `);
}

function sha256(s: string) {
  return crypto.createHash("sha256").update(s, "utf8").digest("hex");
}

async function getApplied(): Promise<Record<string, { checksum: string }>> {
  const rows = await sql<{ id: string; checksum: string }>(`select id, checksum from ${TABLE}`);
  const map: Record<string, { checksum: string }> = {};
  for (const r of rows) map[r.id] = { checksum: r.checksum };
  return map;
}

async function advisory(fn: () => Promise<void>) {
  try {
    await sql(`select pg_advisory_lock($1)`, [LOCK_KEY]);
    await fn();
  } finally {
    await sql(`select pg_advisory_unlock($1)`, [LOCK_KEY]).catch(() => {});
  }
}

async function run() {
  if (!fs.existsSync(MIGRATIONS_DIR)) fs.mkdirSync(MIGRATIONS_DIR, { recursive: true });
  console.log("🔧 migrations dir:", MIGRATIONS_DIR);

  await ensureTable();

  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  const applied = await getApplied();
  const pending = files.filter(f => !applied[f]);

  if (!pending.length) {
    console.log("✅ no pending migrations");
    return;
  }

  await advisory(async () => {
    for (const file of pending) {
      const full = path.join(MIGRATIONS_DIR, file);
      const sqlText = fs.readFileSync(full, "utf8");
      const checksum = sha256(sqlText);

      console.log(`⏫ applying ${file} ...`);
      await withTransaction(async ({ sql }) => {
        // Один вызов может содержать несколько операторов и DO $$ ... $$;
        await sql(sqlText);
        await sql(`insert into ${TABLE}(id, checksum) values($1, $2)`, [file, checksum]);
      });
      console.log(`✅ applied ${file}`);
    }
  });
}

run().catch((e) => {
  console.error("❌ migrate failed:", e);
  process.exit(1);
});
