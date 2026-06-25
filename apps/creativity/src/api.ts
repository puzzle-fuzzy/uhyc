import type { CreativityTask } from './types'

const BASE = '/api'
const CREDS: RequestInit = { credentials: 'include' }

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { ...CREDS, method: 'GET' })
  const data = (await res.json().catch(() => ({}))) as { error?: string }
  if (!res.ok) throw new ApiError(data.error || `HTTP ${res.status}`, res.status)
  return data as unknown as T
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...CREDS,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = (await res.json().catch(() => ({}))) as { error?: string }
  if (!res.ok) throw new ApiError(data.error || `HTTP ${res.status}`, res.status)
  return data as unknown as T
}

async function del<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { ...CREDS, method: 'DELETE' })
  const data = (await res.json().catch(() => ({}))) as { error?: string }
  if (!res.ok) throw new ApiError(data.error || `HTTP ${res.status}`, res.status)
  return data as unknown as T
}

export async function uploadFile(file: File): Promise<{ url: string }> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${BASE}/upload`, {
    method: 'POST',
    body: form,
    credentials: 'include',
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(data.error || `Upload failed (HTTP ${res.status})`, res.status)
  return data
}

export const creativityApi = {
  createTask: (videoUrl: string) =>
    post<{ task: CreativityTask }>('/creativity/tasks', { videoUrl }),
  listTasks: () =>
    get<{ items: CreativityTask[]; total: number }>('/creativity/tasks'),
  getTask: (id: string) =>
    get<{ task: CreativityTask }>(`/creativity/tasks/${id}`),
  deleteTask: (id: string) => del<{ ok: boolean }>(`/creativity/tasks/${id}`),
}
