// Работа с базой данных PostgreSQL
//server/src/db.ts

import 'dotenv/config'
import { Pool, type QueryResultRow } from 'pg'

export const pool = new Pool({
  host: process.env.PGHOST, 
  port: Number(process.env.PGPORT || 5432),
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  ssl: { rejectUnauthorized: false },
})

// Универсальный хелпер с ограничением на строку результата
export async function sql<T extends QueryResultRow = QueryResultRow>(
  query: string,
  params?: unknown[]
): Promise<T[]> {
  const client = await pool.connect()
  try {
    const res = await client.query<T>(query, params)
    return res.rows
  } finally {
    client.release()
  }
}

export async function sqlOne<T extends QueryResultRow = QueryResultRow>(
  query: string,
  params?: unknown[]
): Promise<T | null> {
  const rows = await sql<T>(query, params)
  return rows.length ? rows[0] : null
}

export async function sqlCount(
  query: string,
  params?: unknown[]
): Promise<number> {
  const rows = await sql<{ count: string }>(query, params)
  // в PG count возвращается как text
  return rows.length ? parseInt(rows[0].count, 10) : 0
}

export async function sqlExists(
  query: string,
  params?: unknown[]
): Promise<boolean> {
  const rows = await sql<{ exists: boolean }>(query, params)
  return rows.length ? !!rows[0].exists : false
}
export async function sqlInsert<T extends QueryResultRow = QueryResultRow>(
  query: string,
  params?: unknown[]
): Promise<T> {
  const rows = await sql<T>(query, params)
  if (rows.length === 0) {
    throw new Error('Insert failed, no rows returned')
  }
  return rows[0]
}

// должно быть именно так (именованный export)
export async function withTransaction<T>(
  fn: (q: {
    sql: <R extends QueryResultRow = QueryResultRow>(
      text: string,
      params?: unknown[]
    ) => Promise<R[]>;
    sqlOne: <R extends QueryResultRow = QueryResultRow>(
      text: string,
      params?: unknown[]
    ) => Promise<R | null>;
  }) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const q = {
      sql: async <R extends QueryResultRow = QueryResultRow>(
        text: string,
        params?: unknown[]
      ): Promise<R[]> => (await client.query<R>(text, params)).rows,

      sqlOne: async <R extends QueryResultRow = QueryResultRow>(
        text: string,
        params?: unknown[]
      ): Promise<R | null> => {
        const rows = (await client.query<R>(text, params)).rows;
        return rows[0] ?? null;
      },
    };

    const out = await fn(q);
    await client.query('COMMIT');
    return out;
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch {}
    throw e;
  } finally {
    client.release();
  }
}
