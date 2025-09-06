import type { Task } from '../api'
import type { BoardFilters } from '../hooks/useBoardFilters'

export function applyTaskFilters(tasks: Task[], f: BoardFilters): Task[] {
  let res = tasks

  if (f.q) {
    const q = f.q.toLowerCase()
    res = res.filter(t => t.title.toLowerCase().includes(q))
  }

  if (f.priorities.length) {
    const set = new Set(f.priorities)
    res = res.filter(t => set.has(t.priority))
  }

  if (f.dueFrom) {
    res = res.filter(t => !t.due_date || t.due_date >= f.dueFrom!)
  }
  if (f.dueTo) {
    res = res.filter(t => !t.due_date || t.due_date <= f.dueTo!)
  }

  return res
}
