import { useCallback, useEffect, useRef, useState } from 'react'
import { generateApi } from '../api'
import type { TaskResponse } from '../types'

const POLL_INTERVAL = 8000
const TERMINAL = new Set(['SUCCEEDED', 'FAILED', 'CANCELED', 'UNKNOWN'])

export function useGenerate(
  tasks: TaskResponse[],
  setTasks: React.Dispatch<React.SetStateAction<TaskResponse[]>>,
) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const updateTask = useCallback(
    (id: string, patch: Partial<TaskResponse>) => {
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)))
    },
    [setTasks],
  )

  const pollTask = useCallback(
    async (id: string) => {
      // 乐观 temp 记录不应被轮询
      if (id.startsWith('temp-')) return
      try {
        const { task } = await generateApi.getTask(id)
        updateTask(id, task)
        if (!TERMINAL.has(task.status)) {
          timers.current[id] = setTimeout(() => void pollTask(id), POLL_INTERVAL)
        }
      } catch {
        // 单次失败则稍后重试
        timers.current[id] = setTimeout(() => void pollTask(id), POLL_INTERVAL)
      }
    },
    [updateTask],
  )

  // 对所有非终态任务启动轮询（用 status 签名触发，终态后停止）。
  // 跳过乐观 temp 记录（它们还没有真实的 task id）。
  useEffect(() => {
    for (const t of tasks) {
      if (t.id.startsWith('temp-')) continue
      if (!TERMINAL.has(t.status) && !timers.current[t.id]) {
        timers.current[t.id] = setTimeout(() => void pollTask(t.id), POLL_INTERVAL)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks.map((t) => `${t.id}:${t.status}`).join('|')])

  // 卸载时清理所有 timer
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

      // 乐观添加：立即插入一条 PENDING 记录，保证右侧面板即时可见
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
        // 用真实数据替换乐观记录
        setTasks((prev) => prev.map((t) => (t.id === tempId ? task : t)))
        timers.current[task.id] = setTimeout(() => void pollTask(task.id), POLL_INTERVAL)
      } catch (e) {
        // 乐观记录标记为失败
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
    [setTasks, pollTask],
  )

  return { submit, submitting, error, setError }
}
