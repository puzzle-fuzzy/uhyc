import { Navigate } from 'react-router-dom'
import { useAuthContext } from './AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
}

/** 路由守卫：未登录 → /login，加载中 → spinner，已登录 → children */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const auth = useAuthContext()

  if (auth.status === 'loading') {
    return (
      <main className="center-screen">
        <div className="gen-loading">
          <span className="uhyc-spinner" />
        </div>
      </main>
    )
  }

  if (auth.status === 'unauthenticated') {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
