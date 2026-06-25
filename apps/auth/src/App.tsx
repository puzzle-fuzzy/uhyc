import { useAuth, isAllowedCallback, CB_PARAM } from '@uhyc/shared'
import { AuthCard } from './components/AuthCard'
import { Welcome } from './components/Welcome'
import './app.css'

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

  /** Read the post-login callback URL once on mount. */
  const cb = new URLSearchParams(window.location.search).get(CB_PARAM)

  /** Navigate to the whitelist-validated callback, else stay on auth. */
  function navigateToCallback() {
    if (isAllowedCallback(cb)) {
      window.location.replace(cb as string)
    }
    // No valid cb: stay here; the authenticated view will render below.
  }

  if (auth.status === 'loading') {
    return (
      <main className="form-panel">
        <span className="uhyc-spinner" style={{ margin: '0 auto' }} />
      </main>
    )
  }

  // Already authenticated (e.g. returning user with valid cookie).
  // If we arrived with a valid cb, bounce straight to it.
  if (auth.status === 'authenticated' && auth.user) {
    if (isAllowedCallback(cb)) {
      // Defer to avoid React state update during render.
      queueMicrotask(() => window.location.replace(cb as string))
    }
    return (
      <main className="form-panel">
        <Welcome user={auth.user} onLogout={auth.logout} />
      </main>
    )
  }

  return (
    <>
      <aside className="brand">
        <div className="nodes" aria-hidden="true">
          <div className="node node--1">AI 图片</div>
          <div className="node node--2">视频生成</div>
          <div className="node node--3">音乐创作</div>
        </div>
        <div className="brand__logo">
          {LOGO_SVG}
          <span>uhyc</span>
        </div>
        <h1 className="brand__title">
          用 AI 创造<span className="brand__title-highlight">媒体</span>
        </h1>
        <p className="brand__sub">
          基于百炼模型平台，一站式生成图片、视频和音乐。选模型，调参数，提交即可。
        </p>
      </aside>

      <main className="form-panel">
        <AuthCard auth={auth} onSuccess={navigateToCallback} />
      </main>
    </>
  )
}

export default App
