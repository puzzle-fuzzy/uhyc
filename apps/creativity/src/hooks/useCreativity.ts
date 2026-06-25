import { useCallback, useEffect, useRef, useState } from 'react'
import { creativityApi } from '../api'
import type { CreativityTask } from '../types'

const POLL_INTERVAL = 5000
const TERMINAL = new Set(['SUCCEEDED', 'FAILED', 'CANCELED', 'UNKNOWN'])

export function useCreativity() {
  const [tasks, setTasks] = useState<CreativityTask[]>([])
  const [processing, setProcessing] = useState(false)
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const updateTask = useCallback(
    (id: string, patch: Partial<CreativityTask>) => {
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)))
    },
    [],
  )

  const pollTask = useCallback(
    async (id: string) => {
      try {
        const { task } = await creativityApi.getTask(id)
        updateTask(id, task)
        if (!TERMINAL.has(task.status)) {
          timers.current[id] = setTimeout(() => void pollTask(id), POLL_INTERVAL)
        }
      } catch {
        timers.current[id] = setTimeout(() => void pollTask(id), POLL_INTERVAL)
      }
    },
    [updateTask],
  )

  // 启动/停止轮询
  useEffect(() => {
    for (const t of tasks) {
      if (t.id.startsWith('temp-')) continue
      if (!TERMINAL.has(t.status) && !timers.current[t.id]) {
        timers.current[t.id] = setTimeout(() => void pollTask(t.id), POLL_INTERVAL)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks.map((t) => `${t.id}:${t.status}`).join('|')])

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

  const submit = useCallback(
    async (videoUrl: string) => {
      setProcessing(true)
      try {
        const { task } = await creativityApi.createTask(videoUrl)
        setTasks((prev) => [task, ...prev])
        timers.current[task.id] = setTimeout(() => void pollTask(task.id), POLL_INTERVAL)
      } finally {
        setProcessing(false)
      }
    },
    [pollTask],
  )

  const refresh = useCallback(async () => {
    const { items } = await creativityApi.listTasks()
    setTasks(items)
  }, [])

  return { tasks, processing, submit, refresh, setTasks }
}
