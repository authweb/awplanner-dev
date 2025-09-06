// server/scripts/new-migration.ts
import fs from "node:fs";
import path from "node:path";

const nameArg = process.argv.slice(2).find(a => !a.startsWith("--")) 
  ?? (process.env.npm_config_name || "change");

const safe = String(nameArg).toLowerCase().replace(/[^a-z0-9-_]/g, "-");
const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19); // 2025-09-06T12-34-56
const dir = path.join(process.cwd(), "server", "migrations");
const file = path.join(dir, `${ts}_${safe}.sql`);

const tpl = `-- ${safe}
-- up
-- idempotent tip: wrap creates in IF NOT EXISTS, use DO $$ ... $$ for logic.

`;

fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(file, tpl, "utf8");
console.log("created", file);
console.log("next: fill the file, then run `npm run migrate`");

// server/scripts/migrate.ts