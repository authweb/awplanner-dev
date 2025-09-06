import { Router } from 'express';
import { sql, sqlOne } from '../db.js';

const r = Router();

const isUuid = (s: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);

/* =====================  STATIC/BATCH FIRST  ===================== */

// GET /api/tasks/tags?boardId=<uuid>&projectId=<uuid>
r.get('/tags', async (req, res, next) => {
  try {
    const { boardId, projectId } = req.query as { boardId?: string; projectId?: string };

    if (!boardId && !projectId) {
      return res.status(400).json({ error: 'boardId or projectId is required' });
    }
    if (boardId && !isUuid(boardId)) return res.status(400).json({ error: 'invalid boardId' });
    if (projectId && !isUuid(projectId)) return res.status(400).json({ error: 'invalid projectId' });

    const rows = await sql<{
      task_id: string; id: string; project_id: string; category_id: string; name: string; color: string | null;
    }>(`
      select tt.task_id,
             t.id, t.project_id, t.category_id, t.name, t.color
      from task_tags tt
      join tasks tk on tk.id = tt.task_id
      join tags  t  on t.id  = tt.tag_id
      where ($1::uuid is null or tk.board_id   = $1::uuid)
        and ($2::uuid is null or tk.project_id = $2::uuid)
      order by t.name asc
    `, [boardId ?? null, projectId ?? null]);

    const map: Record<string, Array<{ id: string; project_id: string; category_id: string; name: string; color: string | null }>> = {};
    for (const r of rows) {
      const { task_id, ...tag } = r;
      (map[task_id] ||= []).push(tag);
    }
    res.json(map);
  } catch (e) { next(e); }
});

// GET /api/tasks/count ... (те же фильтры, что и список)
r.get('/count', async (req, res, next) => {
  try {
    const {
      boardId, projectId, columnId, assigneeId,
      q, priority, dueFrom, dueTo, tagIds, tagMode,
    } = req.query as Record<string, string | undefined>;

    const conds: string[] = ['t.archived_at is null'];
    const params: unknown[] = [];
    const p = (v: unknown) => { params.push(v); return `$${params.length}`; };

    if (projectId) conds.push(`t.project_id = ${p(projectId)}`);
    if (boardId)   conds.push(`t.board_id   = ${p(boardId)}`);
    if (columnId)  conds.push(`t.column_id  = ${p(columnId)}`);
    if (assigneeId)conds.push(`t.assignee_id = ${p(assigneeId)}`);
    if (priority !== undefined) conds.push(`t.priority = ${p(Number(priority))}`);
    if (q)         conds.push(`t.title ILIKE ${p('%' + q + '%')}`);
    if (dueFrom)   conds.push(`t.due_date >= ${p(dueFrom)}`);
    if (dueTo)     conds.push(`t.due_date <= ${p(dueTo)}`);

    let tagJoin = '';
    if (tagIds) {
      const ids = tagIds.split(',').map(s => s.trim()).filter(Boolean);
      if (ids.length) {
        params.push(ids); const idx = params.length;
        tagJoin = `
          join (
            select tt.task_id
            from task_tags tt
            where tt.tag_id = ANY($${idx}::uuid[])
            group by tt.task_id
            ${tagMode === 'and' ? `having count(distinct tt.tag_id) = ${ids.length}` : ''}
          ) ft on ft.task_id = t.id
        `;
      }
    }

    const row = (await sql<{ count: string }>(`
      select count(*)::text as count
      from tasks t
      ${tagJoin}
      ${conds.length ? `where ${conds.join(' and ')}` : ''}
    `, params))[0];

    res.json({ count: Number(row?.count || '0') });
  } catch (e) { next(e); }
});

/* =====================  LIST / CREATE / UPDATE  ===================== */

// список задач с фильтрами
r.get('/', async (req, res, next) => {
  try {
    const {
      boardId, projectId, columnId, assigneeId,
      q, priority, dueFrom, dueTo, tagIds, tagMode,
    } = req.query as Record<string, string | undefined>;

    const conds: string[] = ['t.archived_at is null'];
    const params: unknown[] = [];
    const p = (v: unknown) => { params.push(v); return `$${params.length}`; };

    if (projectId) conds.push(`t.project_id = ${p(projectId)}`);
    if (boardId)   conds.push(`t.board_id   = ${p(boardId)}`);
    if (columnId)  conds.push(`t.column_id  = ${p(columnId)}`);
    if (assigneeId)conds.push(`t.assignee_id = ${p(assigneeId)}`);
    if (priority !== undefined) conds.push(`t.priority = ${p(Number(priority))}`);
    if (q)         conds.push(`t.title ILIKE ${p('%' + q + '%')}`);
    if (dueFrom)   conds.push(`t.due_date >= ${p(dueFrom)}`);
    if (dueTo)     conds.push(`t.due_date <= ${p(dueTo)}`);

    let tagJoin = '';
    if (tagIds) {
      const ids = tagIds.split(',').map(s => s.trim()).filter(Boolean);
      if (ids.length) {
        params.push(ids); const idx = params.length;
        tagJoin = `
          join (
            select tt.task_id
            from task_tags tt
            where tt.tag_id = ANY($${idx}::uuid[])
            group by tt.task_id
            ${tagMode === 'and' ? `having count(distinct tt.tag_id) = ${ids.length}` : ''}
          ) ft on ft.task_id = t.id
        `;
      }
    }

    const rows = await sql(`
      select t.id, t.project_id, t.board_id, t.column_id, t.title, t.description, t.assignee_id, t.priority,
             t.start_date, t.due_date, t.position, t.created_at, t.updated_at
      from tasks t
      ${tagJoin}
      ${conds.length ? `where ${conds.join(' and ')}` : ''}
      order by t.position asc
    `, params);

    res.json(rows);
  } catch (e) { next(e); }
});

// создать задачу
r.post('/', async (req, res, next) => {
  try {
    const {
      projectId, boardId, columnId,
      title, description, assigneeId,
      priority = 0, startDate, dueDate, position = 1000, createdBy
    } = req.body;

    const rows = await sql(`
      insert into tasks
        (project_id, board_id, column_id, title, description, assignee_id, priority, start_date, due_date, position, created_by)
      values
        ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      returning id, project_id, board_id, column_id, title, description, assignee_id, priority,
                start_date, due_date, position, created_at, updated_at
    `, [projectId, boardId, columnId, title, description ?? null, assigneeId ?? null, priority, startDate ?? null, dueDate ?? null, position, createdBy]);

    res.status(201).json(rows[0]);
  } catch (e) { next(e); }
});

// обновить задачу
r.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isUuid(id)) return res.status(400).json({ error: 'invalid task id' });

    const {
      title, description, assigneeId, priority,
      startDate, dueDate, columnId, position, archivedAt
    } = req.body;

    const rows = await sql(`
      update tasks
         set title = coalesce($2, title),
             description = $3,
             assignee_id = $4,
             priority = coalesce($5, priority),
             start_date = $6,
             due_date = $7,
             column_id = coalesce($8, column_id),
             position = coalesce($9, position),
             archived_at = $10,
             updated_at = now()
       where id = $1
       returning id, project_id, board_id, column_id, title, description, assignee_id, priority,
                 start_date, due_date, position, created_at, updated_at, archived_at
    `, [id, title ?? null, description ?? null, assigneeId ?? null, priority ?? null, startDate ?? null, dueDate ?? null, columnId ?? null, position ?? null, archivedAt ?? null]);

    res.json(rows[0]);
  } catch (e) { next(e); }
});

/* =====================  PARAMETRIC LAST  ===================== */

// одна задача
r.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isUuid(id)) return res.status(400).json({ error: 'invalid task id' });

    const row = await sqlOne(`
      select id, project_id, board_id, column_id, title, description, assignee_id, priority,
             start_date, due_date, position, created_at, updated_at
      from tasks where id = $1
    `, [id]);

    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (e) { next(e); }
});

// удалить задачу
r.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isUuid(id)) return res.status(400).json({ error: 'invalid task id' });

    await sql(`delete from tasks where id = $1`, [id]);
    res.status(204).end();
  } catch (e) { next(e); }
});

// теги у задачи
r.get('/:id/tags', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isUuid(id)) return res.status(400).json({ error: 'invalid task id' });

    const rows = await sql(`
      select t.id, t.project_id, t.category_id, t.name, t.color
      from task_tags tt
      join tags t on t.id = tt.tag_id
      where tt.task_id = $1
      order by t.name asc
    `, [id]);

    res.json(rows);
  } catch (e) { next(e); }
});

r.post('/:id/tags', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isUuid(id)) return res.status(400).json({ error: 'invalid task id' });

    const { tagId } = req.body as { tagId: string };
    if (!isUuid(tagId)) return res.status(400).json({ error: 'invalid tagId' });

    const row = await sqlOne<{ task_id: string; tag_id: string }>(`
      insert into task_tags (task_id, tag_id)
      values ($1, $2) on conflict do nothing
      returning task_id, tag_id
    `, [id, tagId]);

    if (!row) return res.status(200).json({ ok: true, existed: true });
    res.status(201).json({ ok: true });
  } catch (e) { next(e); }
});

r.delete('/:id/tags/:tagId', async (req, res, next) => {
  try {
    const { id, tagId } = req.params;
    if (!isUuid(id) || !isUuid(tagId)) return res.status(400).json({ error: 'invalid id/tagId' });

    const row = await sqlOne<{ task_id: string; tag_id: string }>(`
      delete from task_tags where task_id = $1 and tag_id = $2 returning task_id, tag_id
    `, [id, tagId]);

    if (!row) return res.status(404).json({ error: 'Not found' });
    res.status(204).end();
  } catch (e) { next(e); }
});

export default r;
