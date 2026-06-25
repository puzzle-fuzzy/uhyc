import { useEffect, useState, useCallback } from 'react'
import { useAuthContext } from './AuthContext'
import { UserProfileModal } from './UserProfileModal'

/** 全局 Ctrl+P 命令面板，挂载在 AuthProvider 内部、Routes 外部 */
export function GlobalCommandModal() {
  const auth = useAuthContext()
  const [open, setOpen] = useState(false)

  const onKey = useCallback((e: KeyboardEvent) => {
    // 忽略在输入框中的按键
    const tag = (e.target as HTMLElement)?.tagName?.toLowerCase()
    if (tag === 'input' || tag === 'textarea' || (e.target as HTMLElement)?.isContentEditable) return
    if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
      e.preventDefault()
      setOpen((o) => !o)
    }
  }, [])

  useEffect(() => {
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onKey])

  if (!auth.user) return null

  return (
    <UserProfileModal
      open={open}
      user={auth.user}
      onClose={() => setOpen(false)}
      onLogout={auth.logout}
    />
  )
}
