import { Router } from 'express'
import { sql, sqlOne } from '../db'

const r = Router()

// GET /api/tags?projectId=...&categoryId=...
r.get('/', async (req, res, next) => {
  try {
    const { projectId, categoryId } = req.query as { projectId?: string; categoryId?: string }
    if (!projectId) return res.status(400).json({ error: 'projectId required' })
    const params: unknown[] = [projectId]
    const conds: string[] = ['project_id = $1']
    if (categoryId) { params.push(categoryId); conds.push(`category_id = $${params.length}`) }
    const rows = await sql(
      `select id, project_id, category_id, name, color, created_at
       from tags
       where ${conds.join(' and ')}
       order by name asc`,
      params as any[]
    )
    res.json(rows)
  } catch (e) { next(e) }
})

// POST /api/tags
r.post('/', async (req, res, next) => {
  try {
    const { projectId, categoryId, name, color } = req.body as {
      projectId: string; categoryId: string; name: string; color?: string | null
    }
    const row = (await sql(
      `insert into tags (project_id, category_id, name, color)
       values ($1,$2,$3,$4)
       returning id, project_id, category_id, name, color, created_at`,
      [projectId, categoryId, name, color ?? null]
    ))[0]
    res.status(201).json(row)
  } catch (e) { next(e) }
})

// PUT /api/tags/:id
r.put('/:id', async (req, res, next) => {
  try {
    const { name, color, categoryId } = req.body as {
      name?: string; color?: string | null; categoryId?: string
    }
    const row = (await sql(
      `update tags
         set name = coalesce($2, name),
             color = $3,
             category_id = coalesce($4, category_id)
       where id = $1
       returning id, project_id, category_id, name, color, created_at`,
      [req.params.id, name ?? null, color ?? null, categoryId ?? null]
    ))[0]
    if (!row) return res.status(404).json({ error: 'Not found' })
    res.json(row)
  } catch (e) { next(e) }
})

// DELETE /api/tags/:id
r.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await sqlOne<{ id: string }>(
      `delete from tags where id = $1 returning id`,
      [req.params.id]
    )
    if (!deleted) return res.status(404).json({ error: 'Not found' })
    res.status(204).end()
  } catch (e) { next(e) }
})

// GET /api/tasks/tags?boardId=...
r.get('/tags', async (req, res, next) => {
  try {
    const { boardId } = req.query as { boardId?: string }
    if (!boardId) return res.status(400).json({ error: 'boardId is required' })

    const rows = await sql<{
      task_id: string
      tag_id: string
      category_id: string
      name: string
      color: string | null
    }>(
      `select tt.task_id,
              t.id as tag_id, t.category_id, t.name, t.color
       from task_tags tt
       join tags t   on t.id = tt.tag_id
       join tasks tk on tk.id = tt.task_id
       where tk.board_id = $1
       order by t.name asc`,
      [boardId]
    )

    const map: Record<string, Array<{ id: string; category_id: string; name: string; color: string | null }>> = {}
    for (const r of rows) {
      (map[r.task_id] ||= []).push({
        id: r.tag_id, category_id: r.category_id, name: r.name, color: r.color,
      })
    }
    res.json(map)
  } catch (e) { next(e) }
})



export default r
