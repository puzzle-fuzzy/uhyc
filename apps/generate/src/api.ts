import type { Catalog, TaskResponse, CreativityTask } from './types'

const BASE = import.meta.env.PROD ? '' : '/api'
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

async function del<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { ...CREDS, method: 'DELETE' })
  const data = (await res.json().catch(() => ({}))) as {
    error?: string
    errors?: { field: string; message: string }[]
  }
  if (!res.ok) {
    throw new ApiError(data.error || `HTTP ${res.status}`, res.status, data.errors)
  }
  return data as unknown as T
}

export const generateApi = {
  catalog: () => get<Catalog>('/generate/catalog'),
  createTask: (body: CreateTaskInput) =>
    post<{ task: TaskResponse }>('/generate/tasks', body),
  listTasks: (all?: boolean) =>
    get<{ items: TaskResponse[]; total: number }>(`/generate/tasks${all ? '?all=true' : ''}`),
  getTask: (id: string) => get<{ task: TaskResponse }>(`/generate/tasks/${id}`),
  deleteTask: (id: string) => del<{ ok: boolean }>(`/generate/tasks/${id}`),
}

/**
 * 上传文件（参考素材）到后端，后端转存 OSS。
 * @returns OSS 公开 URL
 */
export async function uploadFile(
  file: File,
): Promise<{ url: string; thumbnail: string | null; key: string; filename: string }> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${BASE}/upload`, {
    method: 'POST',
    body: form,
    credentials: 'include',
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new ApiError(data.error || `Upload failed (HTTP ${res.status})`, res.status)
  }
  return data
}

/**
 * 由 storagePath 拼出可访问 URL。
 * - 如果已是完整 URL（OSS URL），直接返回
 * - 否则走 vite 代理 → 后端静态路由
 */
export function artifactUrl(storagePath: string): string {
  if (storagePath.startsWith('http://') || storagePath.startsWith('https://')) {
    return storagePath
  }
  // storagePath 形如 "storage/<taskId>/<file>"
  return `${BASE}/generate/${storagePath.replace(/^storage\//, 'storage/')}`
}

// ---- creativity API ----
export const creativityApi = {
  createTask: (videoUrl: string) =>
    post<{ task: CreativityTask }>('/creativity/tasks', { videoUrl }),
  listTasks: () =>
    get<{ items: CreativityTask[]; total: number }>('/creativity/tasks'),
  getTask: (id: string) =>
    get<{ task: CreativityTask }>(`/creativity/tasks/${id}`),
  deleteTask: (id: string) => del<{ ok: boolean }>(`/creativity/tasks/${id}`),
}
