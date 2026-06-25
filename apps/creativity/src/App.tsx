import { useAuth, buildLoginUrl, usePresence, AvatarStack } from '@uhyc/shared'
import { useEffect } from 'react'
import { useCreativity } from './hooks/useCreativity'
import { VideoUpload, clearPendingVideo } from './components/VideoUpload'
import { PipelineStatus } from './components/PipelineStatus'
import { ResultPanel } from './components/ResultPanel'
import { creativityApi } from './api'
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
  const { tasks, processing, submit, refresh, setTasks, onTaskUpdated, onWsDisconnect } = useCreativity()
  const { onlineUsers } = usePresence({ onTaskUpdated, onDisconnect: onWsDisconnect })

  useEffect(() => {
    if (auth.status === 'unauthenticated') {
      window.location.replace(buildLoginUrl(window.location.href))
    }
  }, [auth.status])

  useEffect(() => {
    if (auth.status === 'authenticated') void refresh()
  }, [auth.status, refresh])

  const latestTask = tasks[0] ?? null

  async function handleProcess(url: string) {
    clearPendingVideo()
    await submit(url)
  }

  async function handleDelete(task: { id: string }) {
    try {
      await creativityApi.deleteTask(task.id)
      setTasks((prev) => prev.filter((t) => t.id !== task.id))
    } catch { /* ignore */ }
  }

  if (auth.status !== 'authenticated' || !auth.user) {
    return (
      <main className="center-screen">
        <span className="uhyc-spinner" />
      </main>
    )
  }

  const initial = auth.user.username.charAt(0).toUpperCase()

  return (
    <main className="crea-app">
      <header className="crea-topbar">
        <div className="crea-topbar__brand">
          {LOGO_SVG}
          <span>uhyc · creativity</span>
        </div>
        <div className="crea-topbar__user">
          <AvatarStack users={onlineUsers} selfInitial={initial} />
          <span className="uhyc-badge">{auth.user.username}</span>
          <button
            type="button"
            className="uhyc-btn uhyc-btn--ghost"
            onClick={auth.logout}
          >
            登出
          </button>
        </div>
      </header>

      <div className="crea-layout">
        <section className="crea-layout__left">
          <VideoUpload onProcess={handleProcess} processing={processing} />
          <PipelineStatus task={latestTask} />
          {latestTask?.status === 'FAILED' && (
            <div className="crea-left__actions">
              <button
                type="button"
                className="uhyc-btn uhyc-btn--ghost"
                onClick={() => handleDelete(latestTask)}
              >
                删除记录
              </button>
            </div>
          )}
        </section>

        <section className="crea-layout__right">
          <ResultPanel
            tasks={tasks}
            onDelete={handleDelete}
          />
        </section>
      </div>
    </main>
  )
}

export default App
