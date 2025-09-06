import { Router } from 'express';
import { sql, sqlOne } from '../db.js';

const r = Router();

type StickerType =
  | 'states'       // набор состояний (категория тегов)
  | 'sprint'       // итерации
  | 'text'
  | 'number'
  // системные:
  | 'assignee'
  | 'deadline'
  | 'timetracking';


type StickerRow = {
  id: string;
  project_id: string;
  board_id: string | null;
  key: string;
  title: string;
  type: StickerType;
  tag_category_id: string | null;
  enabled: boolean;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

type TagRow = {
  id: string;
  project_id: string;
  category_id: string | null;
  name: string;
  color: string | null;
};

/* -------- list -------- */
r.get('/', async (req, res, next) => {
  try {
    const { projectId, boardId } = req.query as { projectId?: string; boardId?: string };
    if (!projectId && !boardId) return res.status(400).json({ error: 'projectId or boardId is required' });

    const conds: string[] = [];
    const params: unknown[] = [];
    const p = (v: unknown) => { params.push(v); return `$${params.length}`; };

    if (projectId) conds.push(`s.project_id = ${p(projectId)}`);
    if (boardId) conds.push(`s.board_id = ${p(boardId)}`);

    const rows = await sql<StickerRow>(`
      select s.*
      from stickers s
      ${conds.length ? `where ${conds.join(' and ')}` : ''}
      order by created_at asc
    `, params as any[]);

    // подгрузим states для тех, у кого есть category
    const catIds = rows.map(r => r.tag_category_id).filter(Boolean) as string[];
    let tagsByCat: Record<string, TagRow[]> = {};
    if (catIds.length) {
      const tagRows = await sql<TagRow>(`
        select id, project_id, category_id, name, color
        from tags
        where category_id = any($1::uuid[])
        order by name asc
      `, [catIds]);
      for (const t of tagRows) {
        (tagsByCat[t.category_id || ''] ||= []).push(t);
      }
    }

    const data = rows.map(s => ({
      ...s,
      states: s.type === 'states' && s.tag_category_id ? (tagsByCat[s.tag_category_id] || []) : undefined,
    }));

    res.json(data);
  } catch (e) { next(e); }
});

/* -------- create -------- */
r.post('/', async (req, res, next) => {
  try {
    const { projectId, boardId, type, title, key, states, config } = req.body as {
      projectId: string;
      boardId?: string;
      type: 'states'|'sprint'|'text'|'number';
      title: string;
      key?: string;
      states?: { name: string; color?: string | null }[];
      config?: Record<string, unknown>;
    };

    if (!projectId || !type || !title) return res.status(400).json({ error: 'projectId, type, title are required' });

    const stickerKey = key || `${type}:${Date.now()}`;

    await sql('begin');

    let tagCategoryId: string | null = null;

    if (type === 'states') {
      if (!states || !states.length) {
        await sql('rollback');
        return res.status(400).json({ error: 'states are required for type=states' });
      }

      // 1) создаём категорию тегов
      const cat = await sqlOne<{ id: string }>(`
        insert into tag_categories (project_id, name)
        values ($1, $2)
        returning id
      `, [projectId, `Sticker: ${title}`]);
      tagCategoryId = cat!.id;

      // 2) создаём теги
      for (const s of states) {
        await sql(`
          insert into tags (project_id, category_id, name, color)
          values ($1, $2, $3, $4)
        `, [projectId, tagCategoryId, s.name, s.color ?? null]);
      }
    }

    // 3) создаём сам стикер
    const cfg = config ?? {}; // <= гарантируем объект
    const row = await sqlOne<StickerRow>(`
    insert into stickers (project_id, board_id, key, title, type, tag_category_id, enabled, config)
    values ($1,$2,$3,$4,$5,$6,true, COALESCE($7::jsonb, '{}'::jsonb))
    returning *
    `, [projectId, boardId ?? null, stickerKey, title, type, tagCategoryId, JSON.stringify(cfg)]);


    await sql('commit');

    // подтянем states если нужно
    if (!row) return res.status(500).json({ error: 'Failed to create sticker' });
    let sticker: any = row;
    if (row.type === 'states' && row.tag_category_id) {
      const tagRows = await sql<TagRow>(`
        select id, project_id, category_id, name, color
        from tags
        where category_id = $1
        order by name asc
      `, [row.tag_category_id]);
      sticker = { ...row, states: tagRows };
    }

    res.status(201).json(sticker);
  } catch (e) {
    await sql('rollback').catch(() => {});
    next(e);
  }
});

/* -------- update -------- */
r.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, enabled, config } = req.body as {
    title?: string; enabled?: boolean; config?: Record<string, unknown>;
    };
    const row = await sqlOne<StickerRow>(`
    update stickers
        set title   = coalesce($2, title),
            enabled = coalesce($3, enabled),
            config  = coalesce($4::jsonb, config),
            updated_at = now()
    where id = $1
    returning *
    `, [id, title ?? null, enabled ?? null, config ? JSON.stringify(config) : null]);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (e) { next(e); }
});

/* -------- delete --------
   (аккуратно подчистим категорию/теги, если она привязана к стикеру)
*/
r.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const s = await sqlOne<StickerRow>(`select * from stickers where id = $1`, [id]);
    if (!s) return res.status(404).json({ error: 'Not found' });

    await sql('begin');
    if (s.tag_category_id) {
      await sql(`delete from tags where category_id = $1`, [s.tag_category_id]);
      await sql(`delete from tag_categories where id = $1`, [s.tag_category_id]);
    }
    await sql(`delete from stickers where id = $1`, [id]);
    await sql('commit');

    res.status(204).end();
  } catch (e) {
    await sql('rollback').catch(() => {});
    next(e);
  }
});

export default r;
