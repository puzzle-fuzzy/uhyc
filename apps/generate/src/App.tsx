import { useAuth, buildLoginUrl } from '@uhyc/shared'
import { useEffect, useState } from 'react'
import type { TaskResponse, Catalog } from './types'
import type { PromptToken } from './lib/promptSerializer'
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

/** 从 catalog 查找模型的 refSyntax */
function getRefSyntax(catalog: Catalog | null, category: string, subCategory: string, model: string): string | null {
  const m = catalog?.[category]?.[subCategory]?.find((x: { model: string; refSyntax?: string }) => x.model === model)
  return m?.refSyntax ?? null
}

/**
 * 将 prompt 字符串解析为 PromptToken[]，恢复 chip 引用。
 *
 * bracket-en 格式: "[Image 1] 描述文本" → [{kind:'ref',itemId}, {kind:'text',text:'描述文本'}]
 * cn-prefixed 格式: "图1 描述文本" → [{kind:'ref',itemId}, {kind:'text',text:'描述文本'}]
 */
function parsePromptIntoTokens(
  prompt: string,
  mediaItems: Array<{ id: string; label: string }>,
  refSyntax: string | null,
): PromptToken[] {
  if (!refSyntax) return [{ kind: 'text' as const, text: prompt }]

  // 生成 label → id 映射
  const labelToId = new Map<string, string>()
  for (const m of mediaItems) {
    if (m.label) labelToId.set(m.label, m.id)
    // bracket-en 的 label 是 "[Image 1]"，cn-prefixed 是 "图1"
  }

  // 构建正则：匹配所有已知 label，优先匹配长的
  const labels = [...labelToId.keys()].sort((a, b) => b.length - a.length)
  if (labels.length === 0) return [{ kind: 'text' as const, text: prompt }]

  const pattern = new RegExp(`(${labels.map((l) => l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g')
  const tokens: PromptToken[] = []
  let lastIdx = 0

  for (const match of prompt.matchAll(pattern)) {
    const matchedLabel = match[0]
    const idx = match.index!

    // 匹配前的文本
    if (idx > lastIdx) {
      tokens.push({ kind: 'text', text: prompt.slice(lastIdx, idx) })
    }

    // chip 引用
    const itemId = labelToId.get(matchedLabel)
    if (itemId) {
      tokens.push({ kind: 'ref', itemId })
    } else {
      tokens.push({ kind: 'text', text: matchedLabel })
    }

    lastIdx = idx + matchedLabel.length
  }

  // 剩余文本
  if (lastIdx < prompt.length) {
    tokens.push({ kind: 'text', text: prompt.slice(lastIdx) })
  }

  return tokens.length > 0 ? tokens : [{ kind: 'text' as const, text: prompt }]
}

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

    // 转换 media 数组 → MediaItem[]（ReferenceAssets 所需）
    const media = params.media
    if (Array.isArray(media) && media.length > 0) {
      params.media = media.map((m: Record<string, unknown>, idx: number) => {
        const type = (m.type as string) || 'reference_image'
        const url = (m.url as string) || ''
        // 先分配 id，稍后 computeLabels 会补 label
        return {
          id: (m.id as string) || `rerun-${Date.now()}-${idx}`,
          type,
          url,
          label: (m.label as string) || '',
          thumbnail: (m.thumbnail as string) || url || undefined,
        }
      })
    }

    // 转换 prompt 字符串 → PromptToken[]（含 chip 引用）
    if (typeof params.prompt === 'string') {
      const refSyntax = getRefSyntax(catalog, task.category, task.subCategory, task.model)
      // computeLabels 需要 refSyntax 和 items 来生成 label，但 items 已在上一步创建
      // 用 refSyntax 生成 label 映射
      const mediaItems = (params.media as Array<{ id: string; label: string; type: string }>) ?? []
      // 预计算 labels
      let imgIdx = 0
      let vidIdx = 0
      for (const item of mediaItems) {
        if (item.type === 'reference_video') {
          vidIdx += 1
          item.label = refSyntax === 'cn-prefixed' ? `视频${vidIdx}` : item.label
        } else {
          imgIdx += 1
          item.label = refSyntax === 'cn-prefixed' ? `图${imgIdx}` : `[Image ${imgIdx}]`
        }
      }
      params.prompt = parsePromptIntoTokens(params.prompt, mediaItems, refSyntax)
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
