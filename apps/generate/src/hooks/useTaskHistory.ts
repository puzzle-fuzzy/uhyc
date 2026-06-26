import { useCallback, useEffect, useState } from 'react'
import { generateApi } from '../api'
import type { TaskResponse } from '../types'

export function useTaskHistory(
  showAll?: boolean,
  setShowAll?: (v: boolean) => void,
) {
  const [tasks, setTasks] = useState<TaskResponse[]>([])
  const [error, setError] = useState<string | null>(null)
  // 如果没从外部传入，fallback 到内部 state（保持向后兼容）
  const [internalShowAll, internalSetShowAll] = useState(false)
  const activeShowAll = showAll ?? internalShowAll
  const activeSetShowAll = setShowAll ?? internalSetShowAll

  const refresh = useCallback(async () => {
    try {
      const { items } = await generateApi.listTasks(activeShowAll || undefined)
      setTasks(items)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'load failed')
    }
  }, [activeShowAll])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { tasks, setTasks, refresh, error, showAll: activeShowAll, setShowAll: activeSetShowAll }
}
