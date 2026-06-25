import { useCallback, useEffect, useRef, useState } from 'react'
import { creativityApi } from '../api'
import type { CreativityTask } from '../types'

const POLL_INTERVAL = 5000
const TERMINAL = new Set(['SUCCEEDED', 'FAILED', 'CANCELED', 'UNKNOWN'])

export function useCreativity() {
  const [tasks, setTasks] = useState<CreativityTask[]>([])
  const [processing, setProcessing] = useState(false)
  // HTTP 轮询仅在 WS 断开时使用
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  // ---- WS 推送处理 ----
  const onTaskUpdated = useCallback(
    (raw: Record<string, unknown>) => {
      const task = raw as unknown as CreativityTask
      setTasks((prev) => {
        const idx = prev.findIndex((t) => t.id === task.id)
        if (idx === -1) return prev
        const next = [...prev]
        next[idx] = { ...next[idx], ...task }
        return next
      })
    },
    [],
  )

  // ---- WS 断开时降级到 HTTP 轮询 ----
  const onWsDisconnect = useCallback(() => {
    setTasks((prev) => {
      for (const t of prev) {
        if (t.id.startsWith('temp-')) continue
        if (!TERMINAL.has(t.status) && !timers.current[t.id]) {
          timers.current[t.id] = setTimeout(() => pollHttp(t.id), POLL_INTERVAL)
        }
      }
      return prev
    })
  }, [])

  // ---- HTTP 轮询（仅降级模式） ----
  const pollHttp = useCallback(
    async (id: string) => {
      try {
        const { task } = await creativityApi.getTask(id)
        setTasks((prev) =>
          prev.map((t) => (t.id === id ? { ...t, ...task } : t)),
        )
        if (!TERMINAL.has(task.status)) {
          timers.current[id] = setTimeout(() => pollHttp(id), POLL_INTERVAL)
        }
      } catch {
        timers.current[id] = setTimeout(() => pollHttp(id), POLL_INTERVAL)
      }
    },
    [],
  )

  // 清理定时器
  useEffect(() => {
    const owned = timers
    return () => {
      for (const id of Object.keys(owned.current)) {
        clearTimeout(owned.current[id])
      }
      owned.current = {}
    }
  }, [])

  const submit = useCallback(async (videoUrl: string) => {
    setProcessing(true)
    try {
      const { task } = await creativityApi.createTask(videoUrl)
      setTasks((prev) => [task, ...prev])
      // 后端 pipeline 会通过 WS 推送状态更新
    } finally {
      setProcessing(false)
    }
  }, [])

  const refresh = useCallback(async () => {
    const { items } = await creativityApi.listTasks()
    setTasks(items)
  }, [])

  return { tasks, processing, submit, refresh, setTasks, onTaskUpdated, onWsDisconnect }
}
