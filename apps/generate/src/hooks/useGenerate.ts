import { useCallback, useEffect, useRef, useState } from 'react'
import { generateApi } from '../api'
import type { TaskResponse } from '../types'

const POLL_INTERVAL = 8000
const TERMINAL = new Set(['SUCCEEDED', 'FAILED', 'CANCELED', 'UNKNOWN'])

export function useGenerate(
  _tasks: TaskResponse[],
  setTasks: React.Dispatch<React.SetStateAction<TaskResponse[]>>,
) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // HTTP 轮询仅在 WS 断开时使用
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const wsOnlineRef = useRef(true)

  // ---- WS 推送处理 ----
  const onTaskUpdated = useCallback(
    (raw: Record<string, unknown>) => {
      const task = raw as unknown as TaskResponse
      setTasks((prev) => {
        const idx = prev.findIndex((t) => t.id === task.id)
        if (idx === -1) return prev
        const next = [...prev]
        next[idx] = { ...next[idx], ...task }
        return next
      })
    },
    [setTasks],
  )

  // ---- WS 断开时降级到 HTTP 轮询 ----
  const onWsDisconnect = useCallback(() => {
    wsOnlineRef.current = false
    // 对所有非终态的非 temp 任务启动 HTTP 轮询
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
      if (id.startsWith('temp-')) return
      try {
        const { task } = await generateApi.getTask(id)
        setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...task } : t)))
        if (!TERMINAL.has(task.status)) {
          timers.current[id] = setTimeout(() => pollHttp(id), POLL_INTERVAL)
        }
      } catch {
        timers.current[id] = setTimeout(() => pollHttp(id), POLL_INTERVAL)
      }
    },
    [setTasks],
  )

  // 清理
  useEffect(() => {
    const owned = timers
    return () => {
      for (const id of Object.keys(owned.current)) {
        clearTimeout(owned.current[id])
      }
      owned.current = {}
    }
  }, [])

  const submit = useCallback(
    async (input: {
      category: string
      subCategory: string
      model: string
      params: Record<string, unknown>
    }) => {
      setSubmitting(true)
      setError(null)

      const tempId = `temp-${Date.now()}`
      setTasks((prev) => [
        {
          id: tempId,
          userId: '',
          bailianTaskId: null,
          createRequestId: null,
          category: input.category,
          subCategory: input.subCategory,
          model: input.model,
          params: input.params,
          status: 'PENDING',
          errorMessage: null,
          files: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as TaskResponse,
        ...prev,
      ])

      try {
        const { task } = await generateApi.createTask(input)
        setTasks((prev) => prev.map((t) => (t.id === tempId ? task : t)))
        // 后端 TaskPoller 会通过 WS 推送状态，不需要前端轮询
        // 如果 WS 断开，降级模式下会通过 onWsDisconnect 启动 HTTP 轮询
      } catch (e) {
        const msg = e instanceof Error ? e.message : '提交失败'
        setTasks((prev) =>
          prev.map((t) =>
            t.id === tempId ? { ...t, status: 'FAILED' as const, errorMessage: msg } : t,
          ),
        )
        setError(msg)
        throw e
      } finally {
        setSubmitting(false)
      }
    },
    [setTasks],
  )

  return { submit, submitting, error, setError, onTaskUpdated, onWsDisconnect }
}
