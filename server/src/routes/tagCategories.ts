import { Router } from 'express'
import { sql, sqlOne } from '../db'

const r = Router()

// GET /api/tag-categories?projectId=...
r.get('/', async (req, res, next) => {
  try {
    const { projectId } = req.query as { projectId?: string }
    if (!projectId) return res.status(400).json({ error: 'projectId required' })
    const rows = await sql(
      `select id, project_id, name, color, position, created_at
       from tag_categories
       where project_id = $1
       order by position asc, created_at asc`,
      [projectId]
    )
    res.json(rows)
  } catch (e) { next(e) }
})

// POST /api/tag-categories
r.post('/', async (req, res, next) => {
  try {
    const { projectId, name, color, position } = req.body as {
      projectId: string; name: string; color?: string | null; position?: number | null
    }
    const row = (await sql(
      `insert into tag_categories (project_id, name, color, position)
       values ($1,$2,$3,coalesce($4,1000))
       returning id, project_id, name, color, position, created_at`,
      [projectId, name, color ?? null, position ?? null]
    ))[0]
    res.status(201).json(row)
  } catch (e) { next(e) }
})

// PUT /api/tag-categories/:id
r.put('/:id', async (req, res, next) => {
  try {
    const { name, color, position } = req.body as {
      name?: string; color?: string | null; position?: number
    }
    const row = (await sql(
      `update tag_categories
         set name = coalesce($2, name),
             color = $3,
             position = coalesce($4, position)
       where id = $1
       returning id, project_id, name, color, position, created_at`,
      [req.params.id, name ?? null, color ?? null, position ?? null]
    ))[0]
    if (!row) return res.status(404).json({ error: 'Not found' })
    res.json(row)
  } catch (e) { next(e) }
})

// DELETE /api/tag-categories/:id
r.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await sqlOne<{ id: string }>(
      `delete from tag_categories where id = $1 returning id`,
      [req.params.id]
    )
    if (!deleted) return res.status(404).json({ error: 'Not found' })
    res.status(204).end()
  } catch (e) { next(e) }
})

export default r
