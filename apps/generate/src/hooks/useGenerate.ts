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

  // 对所有非终态任务启动轮询（用 status 签名触发，终态后停止）
  useEffect(() => {
    for (const t of tasks) {
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
      try {
        const { task } = await generateApi.createTask(input)
        setTasks((prev) => [task, ...prev])
        timers.current[task.id] = setTimeout(() => void pollTask(task.id), POLL_INTERVAL)
      } catch (e) {
        setError(e instanceof Error ? e.message : '提交失败')
        throw e
      } finally {
        setSubmitting(false)
      }
    },
    [setTasks, pollTask],
  )

  return { submit, submitting, error, setError }
}
