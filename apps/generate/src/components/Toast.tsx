import { useEffect, useState } from 'react'

export interface ToastItem {
  id: number
  message: string
  type: 'success' | 'info' | 'error'
}

let toastSeq = 0

/** 全局 toast 触发器 — 组件外部也可以调用 */
export function toast(message: string, type: ToastItem['type'] = 'info') {
  const id = ++toastSeq
  const detail: ToastItem = { id, message, type }
  window.dispatchEvent(new CustomEvent('uhyc-toast', { detail }))
  return id
}

export function dismissToast(id: number) {
  window.dispatchEvent(new CustomEvent('uhyc-toast-dismiss', { detail: id }))
}

/** 挂载在 App 中的 toast 管理器 */
export function ToastContainer() {
  const [items, setItems] = useState<ToastItem[]>([])

  useEffect(() => {
    function onToast(e: Event) {
      const detail = (e as CustomEvent<ToastItem>).detail
      setItems((prev) => [...prev, detail])
      // 3 秒后自动消失
      setTimeout(() => {
        setItems((prev) => prev.filter((it) => it.id !== detail.id))
      }, 3500)
    }
    function onDismiss(e: Event) {
      const id = (e as CustomEvent<number>).detail
      setItems((prev) => prev.filter((it) => it.id !== id))
    }
    window.addEventListener('uhyc-toast', onToast)
    window.addEventListener('uhyc-toast-dismiss', onDismiss)
    return () => {
      window.removeEventListener('uhyc-toast', onToast)
      window.removeEventListener('uhyc-toast-dismiss', onDismiss)
    }
  }, [])

  if (items.length === 0) return null

  return (
    <div className="gen-toasts" aria-live="polite">
      {items.map((it) => (
        <div
          key={it.id}
          className={`gen-toast gen-toast--${it.type}`}
          onClick={() => dismissToast(it.id)}
        >
          {it.message}
        </div>
      ))}
    </div>
  )
}
