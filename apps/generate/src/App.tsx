import { useAuth, buildLoginUrl } from '@uhyc/shared'
import { useEffect } from 'react'
import { useCatalog } from './hooks/useCatalog'
import { useTaskHistory } from './hooks/useTaskHistory'
import { useGenerate } from './hooks/useGenerate'
import { GeneratorPanel } from './components/GeneratorPanel'
import { TaskHistory } from './components/TaskHistory'
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
  const { catalog } = useCatalog()
  const { tasks, setTasks, refresh } = useTaskHistory()
  const { submit, submitting, error: submitError } = useGenerate(tasks, setTasks)

  useEffect(() => {
    if (auth.status === 'unauthenticated') {
      window.location.replace(buildLoginUrl(window.location.href))
    }
  }, [auth.status])

  useEffect(() => {
    if (auth.status === 'authenticated') void refresh()
  }, [auth.status, refresh])

  if (auth.status !== 'authenticated' || !auth.user) {
    return (
      <main className="center-screen">
        <span className="uhyc-spinner" />
      </main>
    )
  }

  const initial = auth.user.username.charAt(0).toUpperCase()

  return (
    <main className="gen-app">
      <header className="topbar">
        <div className="topbar__brand">
          {LOGO_SVG}
          <span>uhyc · generate</span>
        </div>
        <div className="topbar__user">
          <span className="topbar__avatar">{initial}</span>
          <span className="uhyc-badge">{auth.user.username}</span>
          <button
            type="button"
            className="uhyc-btn uhyc-btn--ghost topbar__logout"
            onClick={auth.logout}
          >
            登出
          </button>
        </div>
      </header>

      <div className="gen-layout">
        <section className="gen-layout__left">
          {catalog && (
            <GeneratorPanel
              catalog={catalog}
              submitting={submitting}
              submitError={submitError}
              onSubmit={submit}
            />
          )}
        </section>
        <section className="gen-layout__right">
          <TaskHistory tasks={tasks} />
        </section>
      </div>
    </main>
  )
}

export default App
