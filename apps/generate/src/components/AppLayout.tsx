import { Outlet } from 'react-router-dom'
import { useAuthContext } from './AuthContext'

const LOGO_SVG = (
  <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
    <rect x="3" y="3" width="11" height="11" rx="2" fill="#cba0ff" stroke="#0a0a0a" strokeWidth="2.5" />
    <rect x="18" y="3" width="11" height="11" rx="2" fill="#93ecff" stroke="#0a0a0a" strokeWidth="2.5" />
    <rect x="3" y="18" width="11" height="11" rx="2" fill="#ffaef3" stroke="#0a0a0a" strokeWidth="2.5" />
    <rect x="18" y="18" width="11" height="11" rx="2" fill="#0a0a0a" />
  </svg>
)

/** 共享页面布局：顶栏 + Outlet */
export function AppLayout() {
  const auth = useAuthContext()

  return (
    <main className="gen-app">
      <header className="topbar">
        <div className="topbar__brand">
          {LOGO_SVG}
          <span>uhyc · generate</span>
        </div>
        <div className="topbar__user">
          <button
            type="button"
            className="uhyc-btn uhyc-btn--ghost topbar__logout"
            onClick={auth.logout}
          >
            登出
          </button>
        </div>
      </header>
      <Outlet />
    </main>
  )
}
