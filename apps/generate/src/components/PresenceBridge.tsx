import { createContext, useContext, useRef, useState, type ReactNode } from 'react'
import { usePresence, type PresenceUser } from '@uhyc/shared'

// ---------------------------------------------------------------------------
// PresenceBridge — 将 usePresence + 开发模式 放在路由布局层
//
// 架构问题：
//   AppLayout（顶栏）需要渲染 AvatarStack + DEV 徽章，但 usePresence / showAll
//   原先在子路由（Studio）中调用，顶栏拿不到数据。
//
// 解法：
//   把共享状态提升到 PresenceBridge 中（包裹 AppLayout），
//   子路由通过 usePresenceCtx / useDevMode 读写。
// ---------------------------------------------------------------------------

interface PresenceCallbacks {
  onTaskUpdated?: (task: Record<string, unknown>) => void
  onDisconnect?: () => void
}

interface PresenceCtxValue {
  onlineUsers: PresenceUser[]
  setCallbacks: (cbs: PresenceCallbacks) => void
  showAll: boolean
  setShowAll: (v: boolean) => void
}

const PresenceCtx = createContext<PresenceCtxValue>({
  onlineUsers: [],
  setCallbacks: () => {},
  showAll: false,
  setShowAll: () => {},
})

/** 供子路由（Studio / CreativityPage）获取 onlineUsers */
export function usePresenceCtx() {
  return useContext(PresenceCtx)
}

/** 供子路由注册 WS 推送回调（task_updated / disconnect） */
export function useSetPresenceCallbacks() {
  return useContext(PresenceCtx).setCallbacks
}

/** 供子路由或顶栏读写开发模式（showAll） */
export function useDevMode() {
  const { showAll, setShowAll } = useContext(PresenceCtx)
  return { showAll, setShowAll }
}

export function PresenceBridge({ children }: { children: ReactNode }) {
  const callbacksRef = useRef<PresenceCallbacks>({})
  const [showAll, setShowAll] = useState(false)

  const { onlineUsers } = usePresence({
    onTaskUpdated: (task) => callbacksRef.current.onTaskUpdated?.(task),
    onDisconnect: () => callbacksRef.current.onDisconnect?.(),
  })

  const setCallbacks = (cbs: PresenceCallbacks) => {
    callbacksRef.current = cbs
  }

  return (
    <PresenceCtx.Provider value={{ onlineUsers, setCallbacks, showAll, setShowAll }}>
      {children}
    </PresenceCtx.Provider>
  )
}
