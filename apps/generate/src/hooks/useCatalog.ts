import { useEffect, useState } from 'react'
import { generateApi } from '../api'
import type { Catalog } from '../types'

export function useCatalog() {
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    generateApi
      .catalog()
      .then((c) => !cancelled && setCatalog(c))
      .catch((e) =>
        !cancelled && setError(e instanceof Error ? e.message : 'load failed'),
      )
    return () => {
      cancelled = true
    }
  }, [])

  return { catalog, error }
}
