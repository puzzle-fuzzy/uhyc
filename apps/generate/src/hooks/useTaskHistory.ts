import { useCallback, useEffect, useState } from 'react'
import { generateApi } from '../api'
import type { TaskResponse } from '../types'

export function useTaskHistory() {
  const [tasks, setTasks] = useState<TaskResponse[]>([])
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const { items } = await generateApi.listTasks()
      setTasks(items)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'load failed')
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { tasks, setTasks, refresh, error }
}
