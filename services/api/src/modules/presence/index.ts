import { Elysia } from 'elysia'
import { db, table } from '@uhyc/db'
import { eq } from 'drizzle-orm'

import { authPlugin } from '../../plugins/jwt'
import { presenceManager, type PresenceMessage } from './manager'

// ---------------------------------------------------------------------------
// 在线用户 WebSocket 端点
//
// /ws/presence — 建立连接即在线，断开即离线。
// 使用 Elysia resolve 在连接升级阶段校验 JWT，提取 userId 和 role。
// ---------------------------------------------------------------------------

export const presenceModule = new Elysia({ name: 'presence' })
  .use(authPlugin)
  .resolve(async ({ cookie, jwt }) => {
    // 从 auth cookie 中验证 JWT
    const token = cookie.auth?.value
    if (!token) return { presenceUser: null as null | { userId: string; role: string } }

    const payload = await jwt.verify(token)
    if (!payload) return { presenceUser: null as null | { userId: string; role: string } }

    return {
      presenceUser: {
        userId: payload.sub as string,
        role: payload.role as string,
      },
    }
  })
  .ws('/ws/presence', {
    async open(ws) {
      const user = ws.data.presenceUser
      if (!user) {
        ws.close(4001, 'Unauthorized')
        return
      }

      // 注入 broadcaster：任意已连接的 WS 都能向 presence 频道广播
      // ws.publish(topic, data) 会发送给 topic 的所有订阅者（不包括发送者自身）
      presenceManager.setBroadcaster((topic, data) => ws.publish(topic, data))

      // 订阅 presence 频道以接收广播
      ws.subscribe('presence')

      // 查询用户名（只在首次加入时需要）
      let username = user.userId // fallback to userId
      try {
        const [row] = await db
          .select({ username: table.users.username })
          .from(table.users)
          .where(eq(table.users.id, user.userId))
          .limit(1)
        if (row) username = row.username
      } catch {
        // DB 查询失败不阻塞连接，使用 userId 作为 fallback
      }

      // 加入在线列表
      const joinMsg = presenceManager.join(user.userId, username, user.role, ws.raw)
      if (joinMsg) {
        // 首次上线 → 广播给所有已连接的客户端（不包括自己）
        presenceManager.broadcast(joinMsg)
      }

      // 向新连接发送当前在线用户快照
      const snapshot: PresenceMessage = {
        type: 'snapshot',
        users: presenceManager.getSnapshot(),
      }
      ws.send(snapshot)
    },

    close(ws) {
      const user = ws.data.presenceUser
      if (!user) return

      ws.unsubscribe('presence')

      const leaveMsg = presenceManager.leave(user.userId, ws.raw)
      if (leaveMsg) {
        // 最后一个连接断开 → 广播给所有剩余的客户端
        presenceManager.broadcast(leaveMsg)
      }
    },
  })
