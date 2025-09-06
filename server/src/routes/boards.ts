import { Router } from 'express'
import { sql } from '../db.js'

const r = Router()
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

r.get('/by-project/:projectId', async (req, res, next) => {
  try {
    const { projectId } = req.params
    if (!UUID_RE.test(projectId)) {
      return res.status(400).json({ error: 'Invalid projectId (uuid expected)' })
    }

    const board = (await sql<{ id: string; name: string }>(
      `select id, name
       from boards
       where project_id = $1
       order by is_default desc, created_at asc
       limit 1`,
      [projectId]
    ))[0]

    if (!board) return res.status(404).json({ error: 'Board not found' })

    const columns = await sql(
      `select id, title, color, position
       from "columns"
       where board_id = $1
       order by position asc`,
      [board.id]
    )

    const tasks = await sql(
      `select id, title, description, assignee_id, priority, start_date, due_date,
              column_id, position, created_at, updated_at
       from tasks
       where project_id = $1 and board_id = $2 and archived_at is null`,
      [projectId, board.id]
    )

    res.json({ board, columns, tasks })
  } catch (err) {
    next(err)
  }
})

export default r
