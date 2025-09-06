import { Router } from 'express'
import { sql, sqlOne } from '../db.js'

const r = Router()

// список проектов
r.get('/', async (_req, res, next) => {
  try {
    const rows = await sql(`select id, name, created_at from projects order by created_at desc`)
    res.json(rows)
  } catch (e) { next(e) }
})

// один проект
r.get('/:id', async (req, res, next) => {
  try {
    const row = await sqlOne(`select id, name, created_at from projects where id = $1`, [req.params.id])
    if (!row) return res.status(404).json({ error: 'Not found' })
    res.json(row)
  } catch (e) { next(e) }
})

// создать проект
r.post('/', async (req, res, next) => {
  try {
    const { name } = req.body
    const row = (await sql(
      `insert into projects(name, owner_id) 
       values($1, (select id from users order by created_at asc limit 1)) 
       returning id, name, created_at`, [name]))[0]
    res.status(201).json(row)
  } catch (e) { next(e) }
})

// обновить проект
r.put('/:id', async (req, res, next) => {
  try {
    const { name } = req.body
    const row = (await sql(
      `update projects set name = coalesce($2, name) where id = $1
       returning id, name, created_at`, [req.params.id, name]))[0]
    if (!row) return res.status(404).json({ error: 'Not found' })
    res.json(row)
  } catch (e) { next(e) }
})
// удалить проект
r.delete('/:id', async (req, res, next) => {
  try {
    // Возвращаем id удалённой строки, чтобы понять — было ли что удалять
    const deleted = await sqlOne<{ id: string }>(
      `delete from projects where id = $1 returning id`,
      [req.params.id]
    )

    if (!deleted) return res.status(404).json({ error: 'Not found' })
    return res.status(204).end()
  } catch (e) { next(e) }
})

// получить список задач по проекту
r.get('/:id/tasks', async (req, res, next) => {
  try {
    const tasks = await sql(
      `select id, title, description, assignee_id, priority, start_date, due_date,
              column_id, position, created_at, updated_at
       from tasks
       where project_id = $1 and archived_at is null
       order by position asc`,
      [req.params.id]
    )
    res.json(tasks)
  } catch (e) { next(e) }
})
// получить список досок по проекту
r.get('/:id/boards', async (req, res, next) => {
  try {
    const boards = await sql(
      `select id, name, created_at
       from boards
       where project_id = $1
       order by created_at asc`,
      [req.params.id]
    )
    res.json(boards)
  } catch (e) { next(e) }
})

export default r
