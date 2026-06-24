import { useEffect } from 'react'
import { useAuth, buildLoginUrl } from '@uhyc/shared'
import './App.css'

const LOGO_SVG = (
  <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
    <rect x="3" y="3" width="11" height="11" rx="2" fill="#cba0ff" stroke="#0a0a0a" strokeWidth="2.5" />
    <rect x="18" y="3" width="11" height="11" rx="2" fill="#93ecff" stroke="#0a0a0a" strokeWidth="2.5" />
    <rect x="3" y="18" width="11" height="11" rx="2" fill="#ffaef3" stroke="#0a0a0a" strokeWidth="2.5" />
    <rect x="18" y="18" width="11" height="11" rx="2" fill="#0a0a0a" />
  </svg>
)

function App() {
  const auth = useAuth()

  // Guard: if the session probe resolves to unauthenticated, bounce to the
  // central login (auth app) with a callback back to this page.
  useEffect(() => {
    if (auth.status === 'unauthenticated') {
      window.location.replace(buildLoginUrl(window.location.href))
    }
  }, [auth.status])

  if (auth.status !== 'authenticated' || !auth.user) {
    return (
      <main className="center-screen">
        <span className="uhyc-spinner" />
      </main>
    )
  }

  const { user } = auth
  const initial = user.username.charAt(0).toUpperCase()

  return (
    <main className="app">
      <header className="topbar">
        <div className="topbar__brand">
          {LOGO_SVG}
          <span>uhyc · generate</span>
        </div>
        <div className="topbar__user">
          <span className="topbar__avatar">{initial}</span>
          <span className="uhyc-badge">{user.username}</span>
          <button
            type="button"
            className="uhyc-btn uhyc-btn--ghost topbar__logout"
            onClick={auth.logout}
          >
            Log out
          </button>
        </div>
      </header>

      <section className="hero">
        <h1 className="hero__title">
          Create with <em>AI.</em>
        </h1>
        <p className="hero__sub">
          Signed in as {user.email}. Generation tools land here next.
        </p>
      </section>

      <section className="uhyc-card gen-card">
        <div className="uhyc-card__body gen-empty">
          <h3>Coming soon</h3>
          <p>Video, image, and audio generation powered by Bailian.</p>
          <div className="gen-placeholder" />
        </div>
      </section>
    </main>
  )
}

export default App
