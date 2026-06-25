import { useAuth, buildLoginUrl, usePresence, AvatarStack } from '@uhyc/shared'
import { useEffect, useRef, useState } from 'react'
import type { TaskResponse, Catalog } from './types'
import type { PromptToken } from './lib/promptSerializer'
import { useCatalog } from './hooks/useCatalog'
import { useTaskHistory } from './hooks/useTaskHistory'
import { useGenerate } from './hooks/useGenerate'
import { GeneratorPanel } from './components/GeneratorPanel'
import type { FormValues } from './components/GeneratorPanel'
import { TaskHistory } from './components/TaskHistory'
import { ToastContainer, toast } from './components/Toast'
import { generateApi } from './api'
import './App.css'

/** 加载中的随机趣味文案 */
const LOADING_MESSAGES = [
  '正在唤醒尊贵VIP通道…',
  '正在和百炼服务器握手…',
  '正在调校炼丹炉参数…',
  '正在擦拭镜头…',
  '正在调色…',
  '正在给模型喂数据…',
  'Loading… 好吧，其实是中文加载中',
  '正在连接生成引擎…',
  '一切准备就绪… 还差一点',
]

/** 登录加载界面 — 带随机文案 */
function LoadingScreen() {
  const [msg, setMsg] = useState(() => LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)])
  useEffect(() => {
    const t = setInterval(() => {
      setMsg(LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)])
    }, 2000)
    return () => clearInterval(t)
  }, [])
  return (
    <main className="center-screen">
      <div className="gen-loading">
        <span className="uhyc-spinner" />
        <p className="gen-loading__msg">{msg}</p>
      </div>
    </main>
  )
}

/** 快捷键帮助浮层 */
const SHORTCUTS: [string, string][] = [
  ['Enter', '提交生成'],
  ['?', '显示/隐藏此帮助'],
  ['Esc', '关闭浮层/弹窗'],
  ['@', '在提示词中引用素材'],
  ['↑↓', '在候选中导航'],
  ['双击 Logo', '触发彩蛋'],
]

function ShortcutOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' || e.key === '?') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="gen-shortcut-overlay" onClick={onClose}>
      <div className="gen-shortcut-card" onClick={(e) => e.stopPropagation()}>
        <h2 className="gen-shortcut__title">快捷键</h2>
        <ul className="gen-shortcut__list">
          {SHORTCUTS.map(([key, desc]) => (
            <li key={key} className="gen-shortcut__item">
              <kbd className="gen-shortcut__key">{key}</kbd>
              <span>{desc}</span>
            </li>
          ))}
        </ul>
        <p className="gen-shortcut__hint">点击遮罩或按 Esc / ? 关闭</p>
      </div>
    </div>
  )
}

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
  const { submit, submitting, error: submitError, onTaskUpdated, onWsDisconnect } = useGenerate(tasks, setTasks)
  const { onlineUsers } = usePresence({ onTaskUpdated, onDisconnect: onWsDisconnect })

  const [formFill, setFormFill] = useState<FormValues | null>(null)
  const [formFillVersion, setFormFillVersion] = useState(0)
  const [shortcutOpen, setShortcutOpen] = useState(false)
  const [logoSpins, setLogoSpins] = useState(0)

  // 跟踪上一次任务状态，用于检测 SUCCEEDED 转换
  const prevStatusRef = useRef<Map<string, string>>(new Map())

  useEffect(() => {
    for (const t of tasks) {
      const prev = prevStatusRef.current.get(t.id)
      if (prev && prev !== 'SUCCEEDED' && t.status === 'SUCCEEDED') {
        const modelName = t.model.length > 20 ? t.model.slice(0, 20) + '…' : t.model
        toast(`🎉 ${modelName} 生成完成！`, 'success')
      }
    }
    // 更新记录
    const next = new Map<string, string>()
    for (const t of tasks) next.set(t.id, t.status)
    prevStatusRef.current = next
  }, [tasks])

  // 全局键盘快捷键
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // 忽略在输入框中的按键
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || (e.target as HTMLElement)?.isContentEditable) return
      if (e.key === '?') {
        e.preventDefault()
        setShortcutOpen((o) => !o)
      }
      if (e.key === 'Escape' && shortcutOpen) {
        setShortcutOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [shortcutOpen])

  useEffect(() => {
    if (auth.status === 'unauthenticated') {
      window.location.replace(buildLoginUrl(window.location.href))
    }
  }, [auth.status])

  useEffect(() => {
    if (auth.status === 'authenticated') void refresh()
  }, [auth.status, refresh])

  if (auth.status !== 'authenticated' || !auth.user) {
    return <LoadingScreen />
  }

  const initial = auth.user.username.charAt(0).toUpperCase()

  function handleAvatarClick() {
    setShowAll(!showAll)
  }

  /** Logo 双击彩蛋：旋转递增 */
  function handleLogoDblClick() {
    setLogoSpins((n) => n + 1)
    if (logoSpins >= 5) {
      toast('🎠 别转了，再转头都晕了', 'info')
    }
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

    // 转换 prompt 字符串 → PromptToken[]（含 chip 引用，仅 refSyntax 模型需要）
    if (typeof params.prompt === 'string') {
      const refSyntax = getRefSyntax(catalog, task.category, task.subCategory, task.model)
      if (refSyntax) {
        const mediaItems = (params.media as Array<{ id: string; label: string; type: string }>) ?? []
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
      // 非 refSyntax 模型：prompt 保持字符串，textarea 直接展示
    }

    setFormFill({ category: task.category, subCategory: task.subCategory, model: task.model, params })
    setFormFillVersion((v) => v + 1)
  }

  return (
    <main className="gen-app">
      <header className="topbar">
        <div className="topbar__brand">
          <span
            className="gen-logo"
            style={{ transform: `rotate(${logoSpins * 360}deg)`, transition: 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
            onDoubleClick={handleLogoDblClick}
            title="双击有惊喜"
          >
            {LOGO_SVG}
          </span>
          <span>uhyc · generate</span>
        </div>
        <div className="topbar__user">
          <AvatarStack
            users={onlineUsers}
            selfInitial={initial}
            showAll={showAll}
            onAvatarClick={handleAvatarClick}
            devTitle={showAll ? '开发模式：显示全部记录' : '点击切换开发模式'}
          />
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

      <ShortcutOverlay open={shortcutOpen} onClose={() => setShortcutOpen(false)} />
      <ToastContainer />
    </main>
  )
}

export default App
