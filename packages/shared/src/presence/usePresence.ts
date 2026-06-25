import { useCallback, useEffect, useRef, useState } from 'react'
import type { PresenceUser, WsMessage } from './types'
import { useAuth } from '../auth/useAuth'

// ---------------------------------------------------------------------------
// 在线用户 Presence Hook（多路复用：presence + task 推送）
//
// - 建立 WebSocket 连接到 /ws/presence
// - 自动处理重连（指数退避：1s → 2s → 4s → max 30s）
// - 排除自己，返回其他在线用户列表
// - 可选：通过 onTaskUpdated 回调接收任务状态推送
// - 可选：通过 onDisconnect 回调在 WS 断开时触发降级
// ---------------------------------------------------------------------------

const INITIAL_BACKOFF = 1000
const MAX_BACKOFF = 30000
const BACKOFF_MULTIPLIER = 2

export interface UsePresenceOptions {
  onTaskUpdated?: (task: Record<string, unknown>) => void
  onDisconnect?: () => void
}

export function usePresence(options: UsePresenceOptions = {}): {
  onlineUsers: PresenceUser[]
} {
  const { onTaskUpdated, onDisconnect } = options
  const auth = useAuth()
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([])
  const wsRef = useRef<WebSocket | null>(null)
  const backoffRef = useRef(INITIAL_BACKOFF)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const callbacksRef = useRef({ onTaskUpdated, onDisconnect })
  callbacksRef.current = { onTaskUpdated, onDisconnect }

  const connect = useCallback(() => {
    if (auth.status !== 'authenticated') return

    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${location.host}/ws/presence`

    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onmessage = (event) => {
      try {
        const msg: WsMessage = JSON.parse(event.data as string)

        switch (msg.type) {
          case 'snapshot':
            setOnlineUsers(
              msg.users.filter((u) => u.userId !== auth.user?.id),
            )
            break
          case 'user_joined':
            if (msg.userId !== auth.user?.id) {
              setOnlineUsers((prev) => {
                if (prev.some((u) => u.userId === msg.userId)) return prev
                return [
                  ...prev,
                  {
                    userId: msg.userId!,
                    username: msg.username!,
                    role: msg.role!,
                  },
                ]
              })
            }
            break
          case 'user_left':
            setOnlineUsers((prev) =>
              prev.filter((u) => u.userId !== msg.userId),
            )
            break
          case 'task_updated':
            callbacksRef.current.onTaskUpdated?.(msg.task)
            break
        }
      } catch {
        // 忽略无法解析的消息
      }
    }

    ws.onopen = () => {
      backoffRef.current = INITIAL_BACKOFF
    }

    ws.onclose = () => {
      wsRef.current = null
      setOnlineUsers([])
      callbacksRef.current.onDisconnect?.()

      const delay = backoffRef.current
      backoffRef.current = Math.min(
        delay * BACKOFF_MULTIPLIER,
        MAX_BACKOFF,
      )
      reconnectTimerRef.current = setTimeout(connect, delay)
    }

    ws.onerror = () => {
      ws.close()
    }
  }, [auth.status, auth.user?.id])

  useEffect(() => {
    connect()

    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current)
      }
      if (wsRef.current) {
        wsRef.current.onclose = null
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [connect])

  return { onlineUsers }
}
