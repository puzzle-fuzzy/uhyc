import type { Catalog, TaskResponse } from './types'

const BASE = '/api'
const CREDS: RequestInit = { credentials: 'include' }

export class ApiError extends Error {
  status: number
  errors?: { field: string; message: string }[]
  constructor(
    message: string,
    status: number,
    errors?: { field: string; message: string }[],
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
  }
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { ...CREDS, method: 'GET' })
  const data = (await res.json().catch(() => ({}))) as {
    error?: string
    errors?: { field: string; message: string }[]
  }
  if (!res.ok) {
    throw new ApiError(data.error || `HTTP ${res.status}`, res.status, data.errors)
  }
  return data as unknown as T
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...CREDS,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = (await res.json().catch(() => ({}))) as {
    error?: string
    errors?: { field: string; message: string }[]
  }
  if (!res.ok) {
    throw new ApiError(data.error || `HTTP ${res.status}`, res.status, data.errors)
  }
  return data as unknown as T
}

export interface CreateTaskInput {
  category: string
  subCategory: string
  model: string
  params: Record<string, unknown>
}

export const generateApi = {
  catalog: () => get<Catalog>('/generate/catalog'),
  createTask: (body: CreateTaskInput) =>
    post<{ task: TaskResponse }>('/generate/tasks', body),
  listTasks: () =>
    get<{ items: TaskResponse[]; total: number }>('/generate/tasks'),
  getTask: (id: string) => get<{ task: TaskResponse }>(`/generate/tasks/${id}`),
}

/** 由 storagePath 拼出可访问 URL（走 vite 代理 → 后端静态路由）。 */
export function artifactUrl(storagePath: string): string {
  // storagePath 形如 "storage/<taskId>/<file>"，路由是 /api/generate/storage/<taskId>/<file>
  return `${BASE}/generate/${storagePath.replace(/^storage\//, 'storage/')}`
}
