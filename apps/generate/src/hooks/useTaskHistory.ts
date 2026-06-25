import { useCallback, useEffect, useState } from 'react'
import { generateApi } from '../api'
import type { TaskResponse } from '../types'

export function useTaskHistory() {
  const [tasks, setTasks] = useState<TaskResponse[]>([])
  const [error, setError] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const { items } = await generateApi.listTasks(showAll || undefined)
      setTasks(items)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'load failed')
    }
  }, [showAll])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { tasks, setTasks, refresh, error, showAll, setShowAll }
}
