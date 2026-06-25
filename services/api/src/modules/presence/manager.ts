import type { ServerWebSocket } from 'bun'

// ---------------------------------------------------------------------------
// 在线用户状态管理
//
// - 按 userId 追踪所有 WebSocket 连接（支持多标签页）
// - 引用计数：同一用户所有标签页关闭后才广播 user_left
// - 广播通过 ElysiaWS.publish("presence", msg) 实现
// ---------------------------------------------------------------------------

export interface PresenceUser {
  userId: string
  username: string
  role: string
}

export interface PresenceMessage {
  type: 'snapshot' | 'user_joined' | 'user_left'
  userId?: string
  username?: string
  role?: string
  users?: PresenceUser[]
}

interface PresenceEntry {
  username: string
  role: string
  sockets: Set<ServerWebSocket<unknown>>
}

type Broadcaster = (topic: string, data: any) => void

export class PresenceManager {
  /** userId → { username, role, sockets } */
  private users = new Map<string, PresenceEntry>()

  /** 用于广播的方法，由 WS 路由在 open 时注入 */
  private broadcastFn: Broadcaster | null = null

  setBroadcaster(fn: Broadcaster): void {
    this.broadcastFn = fn
  }

  /**
   * 用户加入（新 WebSocket 连接）。
   * 如果是该用户的第一个连接，广播 user_joined 并发送 snapshot 给新连接。
   */
  join(
    userId: string,
    username: string,
    role: string,
    socket: ServerWebSocket<unknown>,
  ): PresenceMessage | null {
    let entry = this.users.get(userId)

    if (!entry) {
      entry = { username, role, sockets: new Set() }
      this.users.set(userId, entry)
    }

    // 更新用户名（可能已变更）
    entry.username = username
    entry.role = role
    entry.sockets.add(socket)

    return entry.sockets.size === 1
      ? { type: 'user_joined', userId, username, role }
      : null
  }

  /**
   * 用户离开（WebSocket 断开）。
   * 仅当该用户所有连接都断开后才广播 user_left。
   */
  leave(userId: string, socket: ServerWebSocket<unknown>): PresenceMessage | null {
    const entry = this.users.get(userId)
    if (!entry) return null

    entry.sockets.delete(socket)

    if (entry.sockets.size === 0) {
      this.users.delete(userId)
      return { type: 'user_left', userId }
    }

    return null
  }

  /** 返回当前所有在线用户 */
  getSnapshot(): PresenceUser[] {
    return Array.from(this.users.entries()).map(([userId, entry]) => ({
      userId,
      username: entry.username,
      role: entry.role,
    }))
  }

  /** 通过注入的 broadcaster 向所有客户端广播消息 */
  broadcast(msg: PresenceMessage): void {
    if (this.broadcastFn) {
      this.broadcastFn('presence', msg)
    }
  }
}

/** 全局单例 */
export const presenceManager = new PresenceManager()
