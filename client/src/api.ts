// client/src/api.ts

// ── Общие типы ───────────────────────────────────────────────────────────────
export type UUID = string

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [k: string]: JsonValue }
  | JsonValue[];

// ── Доменные модели ──────────────────────────────────────────────────────────
export interface Project { id: UUID; name: string; created_at: string }
export interface Board   { id: UUID; name: string }
export interface Column  { id: UUID; title: string; color: string | null; position: number }

export interface TagCategory {
  id: UUID
  project_id: UUID
  name: string
  color: string | null
  position?: number
}

export interface Tag {
  id: UUID
  project_id: UUID
  category_id: UUID
  name: string
  color: string | null
}

export interface Task {
  id: UUID
  title: string
  description: string | null
  column_id: UUID
  priority: number
  position: number
  assignee_id?: UUID | null
  start_date?: string | null
  due_date?: string | null
  created_at: string
  updated_at: string
}

export interface BoardPayload { board: Board; columns: Column[]; tasks: Task[] }

// ── Фильтры задач (универсальные) ────────────────────────────────────────────
export type TaskFilters = {
  projectId?: UUID
  boardId?: UUID
  columnId?: UUID
  assigneeId?: UUID
  q?: string
  priorities?: number[]
  dueFrom?: string
  dueTo?: string
  tagIds?: UUID[]
  tagMode?: 'and' | 'or'
}

// ── Payload’ы ────────────────────────────────────────────────────────────────
export type CreateTaskPayload = {
  projectId: UUID
  boardId: UUID
  columnId: UUID
  title: string
  description?: string | null
  assigneeId?: UUID | null
  priority?: number
  startDate?: string | null
  dueDate?: string | null
  position?: number
  createdBy: UUID
}

export type UpdateTaskPayload = Partial<{
  title: string
  description: string | null
  assigneeId: UUID | null
  priority: number
  startDate: string | null
  dueDate: string | null
  columnId: UUID
  position: number
  archivedAt: string | null
}>

export type CreateColumnPayload = {
  boardId: UUID
  title: string
  color?: string | null
  position?: number
}

export type UpdateColumnPayload = Partial<{
  title: string
  color: string | null
  position: number
}>

export type TagsMap = Record<UUID, Tag[]>

export type StickerType = 'states' | 'sprint' | 'text' | 'number';

export type StickerBase = {
  id: UUID;
  project_id: UUID;
  board_id?: UUID | null;
  key: string;
  title: string;
  enabled: boolean;
  tag_category_id?: UUID | null;
  type: StickerType;
  config?: unknown;
};

export type StatesSticker = StickerBase & {
  type: 'states';
  states: Tag[];
};
export type SprintSticker  = StickerBase & { type: 'sprint' };
export type TextSticker    = StickerBase & { type: 'text' };
export type NumberSticker  = StickerBase & { type: 'number' };

export type Sticker = StatesSticker | SprintSticker | TextSticker | NumberSticker;

export type CreateStickerPayload =
  | {
      projectId: UUID;
      boardId?: UUID;
      type: 'states';
      title: string;
      key?: string;
      states: { name: string; color?: string | null }[];
    }
  | {
      projectId: UUID;
      boardId?: UUID;
      type: 'sprint' | 'text' | 'number';
      title: string;
      key?: string;
      config?: Record<string, unknown>;
    };

// ── Базовый типизированный fetch (upgrade) ───────────────────────────────────
export class ApiError extends Error {
  status: number
  statusText: string
  body?: unknown
  constructor(status: number, statusText: string, message: string, body?: unknown) {
    super(message || `${status} ${statusText}`)
    this.name = 'ApiError'
    this.status = status
    this.statusText = statusText
    this.body = body
  }
}

type QueryValue = string | number | boolean | null | undefined
type Query = Record<string, QueryValue | QueryValue[]>

export type ApiInit = Omit<RequestInit, 'body'> & {
  /** Удобный JSON-body: сам поставит заголовок и сериализует */
  json?: unknown
  /** Query-параметры: аккуратно добавятся к URL */
  query?: Query
}

function buildSearchParams(query?: Query) {
  const sp = new URLSearchParams()
  if (!query) return sp
  for (const [k, v] of Object.entries(query)) {
    if (v == null) continue
    if (Array.isArray(v)) {
      for (const item of v) if (item != null) sp.append(k, String(item))
    } else {
      sp.set(k, String(v))
    }
  }
  return sp
}

async function safeParseJson<T>(res: Response): Promise<T | undefined> {
  const ct = res.headers.get('content-type') || ''
  if (res.status === 204 || res.status === 205) return undefined
  if (!ct.includes('application/json')) return undefined
  const text = await res.text()
  if (!text) return undefined
  return JSON.parse(text) as T
}

// вспомогательный type-guard
type JsonObject = Record<string, unknown>
const isJsonObject = (v: unknown): v is JsonObject =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

async function apiFetch<T>(url: string, init: ApiInit = {}): Promise<T> {
  const { json, query, headers, ...rest } = init

  const u = new URL(url, window.location.origin)
  const sp = buildSearchParams(query)
  sp.forEach((v, k) => u.searchParams.append(k, v))

  const finalHeaders = new Headers(headers)
  let body: BodyInit | undefined
  if (json !== undefined) {
    if (!finalHeaders.has('Content-Type')) finalHeaders.set('Content-Type', 'application/json')
    body = JSON.stringify(json)
  }

  const res = await fetch(u.toString(), { ...rest, headers: finalHeaders, body })

  if (!res.ok) {
    let payload: unknown
    try {
      payload = await res.clone().json()
    } catch {
      try { payload = await res.text() } catch { payload = undefined }
    }

    let msg = ''
    if (typeof payload === 'string') {
      msg = payload
    } else if (isJsonObject(payload)) {
      if (typeof payload.error === 'string') msg = payload.error
      else if (typeof payload.message === 'string') msg = payload.message
    }

    throw new ApiError(res.status, res.statusText, msg, payload)
  }

  const data = await safeParseJson<T>(res)
  return (data as T)
}


// ── Boards ───────────────────────────────────────────────────────────────────
export const fetchBoardByProject = (projectId: UUID) =>
  apiFetch<BoardPayload>(`/api/boards/by-project/${projectId}`)

export const loadBoard = fetchBoardByProject

// ── Tasks ────────────────────────────────────────────────────────────────────
export const createTask = (payload: CreateTaskPayload) =>
  apiFetch<Task>('/api/tasks', { method: 'POST', json: payload })

export const updateTask = (id: UUID, payload: UpdateTaskPayload) =>
  apiFetch<Task>(`/api/tasks/${id}`, { method: 'PUT', json: payload })

export const deleteTask = (id: UUID) =>
  apiFetch<void>(`/api/tasks/${id}`, { method: 'DELETE' })

export const fetchTasks = (boardId: UUID, projectId: UUID) =>
  apiFetch<Task[]>('/api/tasks', { query: { boardId, projectId } })

export const fetchTaskById = (taskId: UUID) =>
  apiFetch<Task>(`/api/tasks/${taskId}`)

export const fetchTasksByColumn = (columnId: UUID) =>
  apiFetch<Task[]>('/api/tasks', { query: { columnId } })

export async function fetchTasksFiltered(filters: TaskFilters, init?: Omit<ApiInit, 'query'>) {
  return apiFetch<Task[]>('/api/tasks', {
    ...init,
    query: {
      projectId: filters.projectId,
      boardId: filters.boardId,
      columnId: filters.columnId,
      assigneeId: filters.assigneeId,
      q: filters.q,
      prio: filters.priorities?.length ? filters.priorities.join(',') : undefined,
      df: filters.dueFrom,
      dt: filters.dueTo,
      tagIds: filters.tagIds?.length ? filters.tagIds.join(',') : undefined,
      tagMode: filters.tagMode,
    },
  })
}

// ── Columns ──────────────────────────────────────────────────────────────────
export const createColumn = (payload: CreateColumnPayload) =>
  apiFetch<Column>('/api/columns', { method: 'POST', json: payload })

export const updateColumn = (id: UUID, payload: UpdateColumnPayload) =>
  apiFetch<Column>(`/api/columns/${id}`, { method: 'PUT', json: payload })

export const deleteColumn = (id: UUID) =>
  apiFetch<void>(`/api/columns/${id}`, { method: 'DELETE' })

export const fetchColumns = (boardId: UUID) =>
  apiFetch<Column[]>('/api/columns', { query: { boardId } })

export const fetchColumnsByBoard = fetchColumns

// ── Counts (ожидаем JSON { count: number }) ──────────────────────────────────
type CountDTO = { count: number }

export const fetchTaskCountByColumn = (columnId: UUID) =>
  apiFetch<CountDTO>('/api/tasks/count', { query: { columnId } }).then(r => r.count)

export const fetchTaskCountByBoard = (boardId: UUID) =>
  apiFetch<CountDTO>('/api/tasks/count', { query: { boardId } }).then(r => r.count)

export const fetchTaskCountByProject = (projectId: UUID) =>
  apiFetch<CountDTO>('/api/tasks/count', { query: { projectId } }).then(r => r.count)

export const fetchTaskCountByAssignee = (assigneeId: UUID) =>
  apiFetch<CountDTO>('/api/tasks/count', { query: { assigneeId } }).then(r => r.count)

// ── Projects ─────────────────────────────────────────────────────────────────
export const fetchProjects = () =>
  apiFetch<Project[]>('/api/projects')

export const fetchProjectById = (projectId: UUID) =>
  apiFetch<Project>(`/api/projects/${projectId}`)

export const createProject = (name: string) =>
  apiFetch<Project>('/api/projects', { method: 'POST', json: { name } })

export const updateProject = (id: UUID, name: string) =>
  apiFetch<Project>(`/api/projects/${id}`, { method: 'PUT', json: { name } })

// ── Tag Categories ───────────────────────────────────────────────────────────
export const fetchTagCategories = (projectId: UUID) =>
  apiFetch<TagCategory[]>('/api/tag-categories', { query: { projectId } })

export const createTagCategory = (payload: { projectId: UUID; name: string; color?: string | null; position?: number }) =>
  apiFetch<TagCategory>('/api/tag-categories', { method: 'POST', json: payload })

export const updateTagCategory = (id: UUID, payload: Partial<{ name: string; color: string | null; position: number }>) =>
  apiFetch<TagCategory>(`/api/tag-categories/${id}`, { method: 'PUT', json: payload })

export const deleteTagCategory = (id: UUID) =>
  apiFetch<void>(`/api/tag-categories/${id}`, { method: 'DELETE' })

// ── Tags ─────────────────────────────────────────────────────────────────────
export const fetchTags = (projectId: UUID, categoryId?: UUID) =>
  apiFetch<Tag[]>('/api/tags', { query: { projectId, ...(categoryId ? { categoryId } : {}) } })

export const createTag = (payload: { projectId: UUID; categoryId: UUID; name: string; color?: string | null }) =>
  apiFetch<Tag>('/api/tags', { method: 'POST', json: payload })

export const updateTag = (id: UUID, payload: Partial<{ name: string; color: string | null; categoryId: UUID }>) =>
  apiFetch<Tag>(`/api/tags/${id}`, { method: 'PUT', json: payload })

export const deleteTag = (id: UUID) =>
  apiFetch<void>(`/api/tags/${id}`, { method: 'DELETE' })

// ── Task ↔ Tags ──────────────────────────────────────────────────────────────
export const fetchTaskTags = (taskId: UUID) =>
  apiFetch<Tag[]>(`/api/tasks/${taskId}/tags`)

export const attachTagToTask = (taskId: UUID, tagId: UUID) =>
  apiFetch<{ ok: true }>(`/api/tasks/${taskId}/tags`, { method: 'POST', json: { tagId } })

export const detachTagFromTask = (taskId: UUID, tagId: UUID) =>
  apiFetch<void>(`/api/tasks/${taskId}/tags/${tagId}`, { method: 'DELETE' })

export const fetchTaskTagsMap = (boardId: UUID) =>
  apiFetch<TagsMap>(`/api/tasks/tags?boardId=${boardId}`)

// ── Stickers ────────────────────────────────────────────────────────────────
export async function listStickers(params: { projectId?: UUID; boardId?: UUID }): Promise<Sticker[]> {
  const q = new URLSearchParams();
  if (params.projectId) q.set('projectId', params.projectId);
  if (params.boardId)   q.set('boardId', params.boardId);
  const res = await fetch(`/api/stickers?${q.toString()}`);
  if (!res.ok) throw new Error('Failed to load stickers');
  return res.json();
}

export async function createSticker(payload: CreateStickerPayload): Promise<Sticker> {
  const res = await fetch('/api/stickers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to create sticker');
  return res.json();
}