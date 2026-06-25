import { useCallback, useEffect, useRef, useState } from 'react'
import type { PresenceUser, PresenceMessage } from './types'
import { useAuth } from '../auth/useAuth'

// ---------------------------------------------------------------------------
// 在线用户 Presence Hook
//
// - 建立 WebSocket 连接到 /ws/presence
// - 自动处理重连（指数退避：1s → 2s → 4s → max 30s）
// - 排除自己，返回其他在线用户列表
// ---------------------------------------------------------------------------

const INITIAL_BACKOFF = 1000
const MAX_BACKOFF = 30000
const BACKOFF_MULTIPLIER = 2

export function usePresence(): { onlineUsers: PresenceUser[] } {
  const auth = useAuth()
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([])
  const wsRef = useRef<WebSocket | null>(null)
  const backoffRef = useRef(INITIAL_BACKOFF)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const connect = useCallback(() => {
    // 只在已认证时连接
    if (auth.status !== 'authenticated') return

    // 确定 WebSocket URL
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${location.host}/ws/presence`

    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onmessage = (event) => {
      try {
        const msg: PresenceMessage = JSON.parse(event.data as string)

        switch (msg.type) {
          case 'snapshot':
            setOnlineUsers(
              msg.users.filter((u) => u.userId !== auth.user?.id),
            )
            break
          case 'user_joined':
            if (msg.userId !== auth.user?.id) {
              setOnlineUsers((prev) => {
                // 防御：避免重复添加
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
        }
      } catch {
        // 忽略无法解析的消息
      }
    }

    ws.onopen = () => {
      // 连接成功，重置退避
      backoffRef.current = INITIAL_BACKOFF
    }

    ws.onclose = () => {
      wsRef.current = null
      // 清空在线列表，等待重连后重新获取
      setOnlineUsers([])

      // 指数退避重连
      const delay = backoffRef.current
      backoffRef.current = Math.min(
        delay * BACKOFF_MULTIPLIER,
        MAX_BACKOFF,
      )
      reconnectTimerRef.current = setTimeout(connect, delay)
    }

    ws.onerror = () => {
      // onerror 后会触发 onclose，重连逻辑在 onclose 中
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
        wsRef.current.onclose = null // 阻止重连
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [connect])

  return { onlineUsers }
}
