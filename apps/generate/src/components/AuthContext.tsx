import { createContext, useContext } from 'react'
import { useAuth, type UseAuth } from '@uhyc/shared'

const AuthCtx = createContext<UseAuth | null>(null)

/** Share a single useAuth() instance across the app. */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth()
  return <AuthCtx.Provider value={auth}>{children}</AuthCtx.Provider>
}

/** Consume the shared auth state. Must be inside <AuthProvider>. */
export function useAuthContext(): UseAuth {
  const ctx = useContext(AuthCtx)
  if (!ctx) throw new Error('useAuthContext must be used within <AuthProvider>')
  return ctx
}
