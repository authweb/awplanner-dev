import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// всегда: server/scripts → server/migrations
const MIGRATIONS_DIR = path.resolve(__dirname, "../migrations");

const nameArg =
  process.argv.slice(2).find(a => !a.startsWith("--")) ??
  (process.env.npm_config_name || "change");

const safe = String(nameArg).toLowerCase().replace(/[^a-z0-9-_]/g, "-");
const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const file = path.join(MIGRATIONS_DIR, `${ts}_${safe}.sql`);

const tpl = `-- ${safe}
-- up
-- idempotent tip: wrap creates in IF NOT EXISTS, use DO $$ ... $$ for logic.

`;

fs.mkdirSync(MIGRATIONS_DIR, { recursive: true });
fs.writeFileSync(file, tpl, "utf8");
console.log("created", file);
// пример запуска: npm run migrate:new -- --name="описание миграции"

// если нужно имя из npm config
// пример запуска: npm run migrate:new:named --name="описание миграции"
// const nameArg = process.env.npm_config_name || "change";

// если нужно просто первый аргумент
// пример запуска: npm run migrate:new "описание миграции"
// const nameArg = process.argv[2] || "change";

// можно комбинировать с датой/временем для уникальности
// const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
// const file = path.join(MIGRATIONS_DIR, `${ts}_${safe}.sql`);