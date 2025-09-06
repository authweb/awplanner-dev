// server/src/env.ts
import 'dotenv/config';
import { cleanEnv, str, num, port as portVar } from 'envalid';

const raw = cleanEnv(process.env, {
  PGHOST: str(),
  PGPORT: num({ default: 5432 }),
  PGDATABASE: str(),
  PGUSER: str(),
  PGPASSWORD: str(),
  PORT: portVar({ default: 3000 }),
  DATABASE_URL: str({ default: '' }) // опционально
});

// Если DATABASE_URL не задана — собираем из PG*
export const DATABASE_URL =
  raw.DATABASE_URL ||
  `postgres://${encodeURIComponent(raw.PGUSER)}:${encodeURIComponent(raw.PGPASSWORD)}@${raw.PGHOST}:${raw.PGPORT}/${raw.PGDATABASE}`;

export const APP_PORT = raw.PORT;
