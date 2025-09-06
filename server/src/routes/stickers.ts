// server/src/routes/stickers.ts
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
  | 'timetracking'
  | 'priority';    // добавим как системный

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

/* ---------- системные дефолты (уровень проекта, т.е. board_id = null) ---------- */
const DEFAULTS: Array<{
  key: string;
  title: string;
  type: StickerType;
  enabled?: boolean;
  // для 'states' можно подсидировать значения (например, приоритеты)
  states?: { name: string; color?: string | null }[];
}> = [
  { key: 'sys:assignee',     title: 'Исполнитель',   type: 'assignee',     enabled: true },
  { key: 'sys:deadline',     title: 'Дедлайн',       type: 'deadline',     enabled: true },
  { key: 'sys:priority',     title: 'Приоритет',     type: 'states',       enabled: true, states: [
    { name: 'Высокий', color: '#FCA5A5' },
    { name: 'Средний', color: '#FDE68A' },
    { name: 'Низкий',  color: '#A7F3D0' },
  ]},
  { key: 'sys:timetracking', title: 'Таймтреккинг',  type: 'timetracking', enabled: false },
  { key: 'sys:sprint',       title: 'Спринт',        type: 'sprint',       enabled: false },
];

async function ensureDefaults(projectId: string) {
  const existing = await sql<{ key: string }>(
    `select key from stickers where project_id = $1 and board_id is null`,
    [projectId]
  );
  const have = new Set(existing.map(x => x.key));

  for (const d of DEFAULTS) {
    if (have.has(d.key)) continue;

    // если это 'states' — сидируем категорию и теги
    let tagCategoryId: string | null = null;
    if (d.type === 'states' && d.states?.length) {
      const cat = await sqlOne<{ id: string }>(
        `insert into tag_categories (project_id, name)
         values ($1, $2) returning id`,
        [projectId, `Sticker: ${d.title}`]
      );
      tagCategoryId = cat!.id;
      for (const s of d.states) {
        await sql(
          `insert into tags (project_id, category_id, name, color)
           values ($1, $2, $3, $4)`,
          [projectId, tagCategoryId, s.name, s.color ?? null]
        );
      }
    }

    await sql(
      `insert into stickers (project_id, board_id, key, title, type, tag_category_id, enabled, config)
       values ($1, null, $2, $3, $4, $5, $6, '{}'::jsonb)`,
      [projectId, d.key, d.title, d.type, tagCategoryId, d.enabled ?? true]
    );
  }
}

/* -------- list -------- */
r.get('/', async (req, res, next) => {
  try {
    const { projectId, boardId } = req.query as { projectId?: string; boardId?: string };
    if (!projectId && !boardId) return res.status(400).json({ error: 'projectId or boardId is required' });

    // если есть projectId — гарантируем дефолты на уровне проекта
    if (projectId) await ensureDefaults(projectId);

    const params: unknown[] = [];
    const p = (v: unknown) => { params.push(v); return `$${params.length}`; };

    // ВАЖНО: если есть boardId, включаем оба уровня: board-level И project-level (board_id IS NULL)
    // Если boardId нет — просто по projectId (или по boardId, но это редкий кейс)
    let where = '';
    if (projectId && boardId) {
      where = `where s.project_id = ${p(projectId)} and (s.board_id = ${p(boardId)} or s.board_id is null)`;
    } else if (projectId) {
      where = `where s.project_id = ${p(projectId)}`;
    } else if (boardId) {
      where = `where s.board_id = ${p(boardId)}`;
    }

    const rows = await sql<StickerRow>(`
      select s.*
      from stickers s
      ${where}
      order by
        case when s.key like 'sys:%' then 0 else 1 end asc,  -- системные всегда первыми
        s.created_at asc
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
      type: StickerType;
      title: string;
      key?: string;
      states?: { name: string; color?: string | null }[];
      config?: Record<string, unknown>;
    };

    if (!projectId || !type || !title) return res.status(400).json({ error: 'projectId, type, title are required' });

    // Для системных ключей запрещаем ручное создание дублей
    const stickerKey = key || `${type}:${Date.now()}`;
    if (stickerKey.startsWith('sys:')) {
      const dup = await sqlOne<{ id: string }>(`
        select id from stickers where project_id = $1 and board_id is null and key = $2
      `, [projectId, stickerKey]);
      if (dup) return res.status(409).json({ error: 'system sticker already exists' });
    }

    await sql('begin');

    let tagCategoryId: string | null = null;
    if (type === 'states') {
      if (!states || !states.length) {
        await sql('rollback'); return res.status(400).json({ error: 'states are required for type=states' });
      }
      const cat = await sqlOne<{ id: string }>(`
        insert into tag_categories (project_id, name) values ($1, $2) returning id
      `, [projectId, `Sticker: ${title}`]);
      tagCategoryId = cat!.id;

      for (const s of states) {
        await sql(`
          insert into tags (project_id, category_id, name, color)
          values ($1, $2, $3, $4)
        `, [projectId, tagCategoryId, s.name, s.color ?? null]);
      }
    }

    const cfg = config ?? {};
    const row = await sqlOne<StickerRow>(`
      insert into stickers (project_id, board_id, key, title, type, tag_category_id, enabled, config)
      values ($1,$2,$3,$4,$5,$6,true, COALESCE($7::jsonb, '{}'::jsonb))
      returning *
    `, [projectId, boardId ?? null, stickerKey, title, type, tagCategoryId, JSON.stringify(cfg)]);

    await sql('commit');

    if (!row) return res.status(500).json({ error: 'Failed to create sticker' });

    // подтянем states если нужно
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

/* -------- delete -------- (системные лучше выключать, а не удалять) */
r.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const s = await sqlOne<StickerRow>(`select * from stickers where id = $1`, [id]);
    if (!s) return res.status(404).json({ error: 'Not found' });

    // системные, поднятые на уровне проекта — мягко выключаем
    if (s.key?.startsWith('sys:') && s.board_id === null) {
      await sql(`update stickers set enabled = false, updated_at = now() where id = $1`, [id]);
      return res.json({ id, disabled: true });
    }

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
