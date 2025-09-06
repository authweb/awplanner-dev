import { Router } from 'express';
import { sql } from '../db.js';

const r = Router();

// POST /api/columns
r.post('/', async (req, res, next) => {
  try {
    const { boardId, title, color = null, position } = req.body;
    const pos = sanitizePos(position, 1000);

    const row = (await sql(
      `insert into columns (board_id, title, color, position)
       values ($1,$2,$3,$4)
       returning id, board_id, title, color, position, created_at`,
      [boardId, title, color, pos]
    ))[0];

    res.status(201).json(row);
  } catch (e) { next(e); }
});

// обновить колонку
r.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { title, color, position } = req.body;
  const rows = await sql(
    `update "columns"
     set title = coalesce($2, title),
         color = $3,
         position = coalesce($4, position)
     where id = $1
     returning id, board_id, title, color, position`,
    [id, title ?? null, color ?? null, position ?? null]
  );
  res.json(rows[0]);
});

// список колонок по boardId
r.get('/', async (req, res, next) => {
  try {
    const { boardId } = req.query as { boardId?: string }
    if (!boardId) return res.status(400).json({ error: 'boardId required' })
    const rows = await sql(
      `select id, board_id, title, color, position, created_at
       from "columns" where board_id = $1 order by position asc`, [boardId])
    res.json(rows)
  } catch (e) { next(e) }
})

// удалить колонку
r.delete('/:id', async (req, res) => {
  const { id } = req.params;
  await sql(`delete from "columns" where id = $1`, [id]);
  res.status(204).end();
});

// helper
const sanitizePos = (val: unknown, fallback = 1000) => {
  const n = Number(val);
  if (!Number.isFinite(n)) return fallback;
  // опционально можно подрезать от «улётов»
  const LIM = 1e12;
  return Math.max(-LIM, Math.min(LIM, n));
};

// PUT /api/columns/:id
r.put('/:id', async (req, res, next) => {
  try {
    const { title, color, position } = req.body;
    const pos = position === undefined ? undefined : sanitizePos(position);

    const row = (await sql(
      `update columns set
          title = coalesce($2, title),
          color = $3,
          position = coalesce($4, position)
       where id = $1
       returning id, board_id, title, color, position, created_at`,
      [req.params.id, title ?? null, color ?? null, pos ?? null]
    ))[0];

    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (e) { next(e); }
});


export default r;
