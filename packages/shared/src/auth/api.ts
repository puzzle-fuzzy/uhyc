/**
 * Framework-agnostic auth API client + types.
 *
 * All requests go through `/api/*`, which each Vite app proxies to the Elysia
 * backend. `credentials: 'include'` lets the httpOnly auth cookie ride along.
 */

/** Mirrors `UserResponse` from services/api/src/modules/auth/model.ts. */
export interface User {
  id: string
  username: string
  email: string
  avatar: string | null
  role: 'user' | 'admin'
  lastLoginAt: string | null
}

export interface LoginInput {
  emailOrUsername: string
  password: string
}

export interface RegisterInput {
  username: string
  email: string
  password: string
}

interface UserResponse {
  user: User
}

/** Unified error surfaced to UIs. */
export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

const BASE = '/api'
const CREDS: RequestInit = { credentials: 'include' }

function extractMessage(data: unknown): string | undefined {
  if (
    typeof data === 'object' &&
    data !== null &&
    'error' in data &&
    typeof (data as Record<string, unknown>).error === 'string'
  ) {
    return (data as Record<string, unknown>).error as string
  }
  // Elysia validation error envelope.
  if (
    typeof data === 'object' &&
    data !== null &&
    'summary' in data &&
    typeof (data as Record<string, unknown>).summary === 'string'
  ) {
    return (data as Record<string, unknown>).summary as string
  }
  return undefined
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${BASE}${path}`, { ...CREDS, ...init })
  } catch {
    throw new ApiError('Network error — is the backend running?', 0)
  }

  const data: unknown = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new ApiError(
      extractMessage(data) ?? `Request failed (${res.status})`,
      res.status,
    )
  }
  return data as T
}

export const authApi = {
  login: (body: LoginInput) =>
    request<UserResponse>('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),

  register: (body: RegisterInput) =>
    request<UserResponse>('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),

  logout: () =>
    request<{ ok: boolean }>('/auth/logout', { method: 'POST' }),

  me: () => request<UserResponse>('/auth/me', { method: 'GET' }),
}
