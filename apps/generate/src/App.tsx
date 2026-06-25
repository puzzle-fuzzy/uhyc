import { useAuth, buildLoginUrl } from '@uhyc/shared'
import { useEffect, useState } from 'react'
import type { TaskResponse } from './types'
import { useCatalog } from './hooks/useCatalog'
import { useTaskHistory } from './hooks/useTaskHistory'
import { useGenerate } from './hooks/useGenerate'
import { GeneratorPanel } from './components/GeneratorPanel'
import type { FormValues } from './components/GeneratorPanel'
import { TaskHistory } from './components/TaskHistory'
import { generateApi } from './api'
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
  const { tasks, setTasks, refresh, showAll, setShowAll } = useTaskHistory()
  const { submit, submitting, error: submitError } = useGenerate(tasks, setTasks)

  const [formFill, setFormFill] = useState<FormValues | null>(null)
  const [formFillVersion, setFormFillVersion] = useState(0)

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

  function handleAvatarClick() {
    setShowAll(!showAll)
  }

  async function handleDelete(task: TaskResponse) {
    try {
      await generateApi.deleteTask(task.id)
      setTasks((prev) => prev.filter((t) => t.id !== task.id))
    } catch {
      // 删除失败静默处理，下次刷新会同步
    }
  }

  function handleRerun(task: TaskResponse) {
    const rawParams = task.params as Record<string, unknown>
    const params: Record<string, unknown> = { ...rawParams }

    // 转换 prompt 字符串 → PromptToken[]（PromptEditor 所需）
    if (typeof params.prompt === 'string') {
      params.prompt = [{ kind: 'text' as const, text: params.prompt }]
    }

    // 转换 media 数组 → MediaItem[]（ReferenceAssets 所需）
    const media = params.media
    if (Array.isArray(media) && media.length > 0) {
      params.media = media.map((m: Record<string, unknown>, idx: number) => ({
        id: (m.id as string) || `rerun-${Date.now()}-${idx}`,
        type: (m.type as string) || 'reference_image',
        url: (m.url as string) || '',
        label: (m.label as string) || '',
        thumbnail: m.thumbnail as string | undefined,
      }))
    }

    setFormFill({ category: task.category, subCategory: task.subCategory, model: task.model, params })
    setFormFillVersion((v) => v + 1)
  }

  return (
    <main className="gen-app">
      <header className="topbar">
        <div className="topbar__brand">
          {LOGO_SVG}
          <span>uhyc · generate</span>
        </div>
        <div className="topbar__user">
          <span
            className={`topbar__avatar${showAll ? ' topbar__avatar--dev' : ''}`}
            onClick={handleAvatarClick}
            title={showAll ? '开发模式：显示全部记录' : '点击切换开发模式'}
          >
            {initial}
          </span>
          {showAll && <span className="uhyc-badge uhyc-badge--dev">DEV</span>}
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
              formFill={formFill}
              formFillVersion={formFillVersion}
            />
          )}
        </section>
        <section className="gen-layout__right">
          <TaskHistory
            tasks={tasks}
            onRerun={handleRerun}
            onDelete={handleDelete}
          />
        </section>
      </div>
    </main>
  )
}

export default App
