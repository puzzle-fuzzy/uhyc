/**
 * React hook wrapping the auth API. Shared by both front-end apps so they have
 * identical loading / current-user semantics.
 */
import { useCallback, useEffect, useState } from 'react'
import { authApi, type LoginInput, type RegisterInput, type User } from './api'

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

export interface UseAuth {
  status: AuthStatus
  user: User | null
  error: string | null
  busy: boolean
  /** Refresh current user from `/auth/me`. */
  refresh: () => Promise<User | null>
  login: (input: LoginInput) => Promise<User>
  register: (input: RegisterInput) => Promise<User>
  logout: () => Promise<void>
  clearError: () => void
}

export function useAuth(): UseAuth {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [user, setUser] = useState<User | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const { user } = await authApi.me()
      setUser(user)
      setStatus('authenticated')
      return user
    } catch {
      setUser(null)
      setStatus('unauthenticated')
      return null
    }
  }, [])

  // On mount, probe the session.
  useEffect(() => {
    void refresh()
  }, [refresh])

  const login = useCallback(async (input: LoginInput) => {
    setBusy(true)
    setError(null)
    try {
      const { user } = await authApi.login(input)
      setUser(user)
      setStatus('authenticated')
      return user
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Login failed'
      setError(msg)
      throw e
    } finally {
      setBusy(false)
    }
  }, [])

  const register = useCallback(async (input: RegisterInput) => {
    setBusy(true)
    setError(null)
    try {
      const { user } = await authApi.register(input)
      setUser(user)
      setStatus('authenticated')
      return user
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Registration failed'
      setError(msg)
      throw e
    } finally {
      setBusy(false)
    }
  }, [])

  const logout = useCallback(async () => {
    await authApi.logout().catch(() => {})
    setUser(null)
    setStatus('unauthenticated')
  }, [])

  const clearError = useCallback(() => setError(null), [])

  return { status, user, error, busy, refresh, login, register, logout, clearError }
}
