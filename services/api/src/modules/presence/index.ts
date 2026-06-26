import { Elysia } from 'elysia'
import { db, table } from '@uhyc/db'
import { eq } from 'drizzle-orm'

import { authPlugin } from '../../plugins/jwt'
import { presenceManager, type PresenceMessage } from './manager'
import { taskPoller } from './task-poller'

// ---------------------------------------------------------------------------
// 在线用户 WebSocket 端点 + 任务状态推送
//
// /ws/presence — 建立连接即在线，断开即离线。
// 同时订阅 task:<userId> 频道，接收任务状态推送。
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

      // 注入 presence broadcaster
      presenceManager.setBroadcaster((topic, data) => ws.publish(topic, data))

      // 注入 task broadcaster：向指定用户的私有频道推送任务更新
      presenceManager.setTaskBroadcaster((userId, msg) =>
        ws.publish(`task:${userId}`, msg),
      )
      taskPoller.setBroadcaster((userId, msg) =>
        ws.publish(`task:${userId}`, msg),
      )

      // 订阅 presence 频道
      ws.subscribe('presence')

      // 订阅个人任务频道
      ws.subscribe(`task:${user.userId}`)
      // 订阅个人信令频道（P2P 传输中继）
      ws.subscribe(`user:${user.userId}`)

      // 查询用户名（只在首次加入时需要）
      let username = user.userId
      try {
        const [row] = await db
          .select({ username: table.users.username })
          .from(table.users)
          .where(eq(table.users.id, user.userId))
          .limit(1)
        if (row) username = row.username
      } catch {
        // DB 查询失败不阻塞连接
      }

      // 加入在线列表
      const joinMsg = presenceManager.join(user.userId, username, user.role, ws.raw)
      if (joinMsg) {
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
      ws.unsubscribe(`task:${user.userId}`)
      ws.unsubscribe(`user:${user.userId}`)

      const leaveMsg = presenceManager.leave(user.userId, ws.raw)
      if (leaveMsg) {
        presenceManager.broadcast(leaveMsg)
      }
    },

    // P2P 信令中继：服务器只转发，不解析载荷
    message(ws, data) {
      const user = ws.data.presenceUser
      if (!user) return

      let msg: Record<string, unknown>
      try {
        msg = typeof data === 'string' ? JSON.parse(data) : (data as Record<string, unknown>)
      } catch {
        return
      }

      const type = msg.type as string | undefined
      if (type === 'transfer-offer' || type === 'transfer-answer' || type === 'signal') {
        const to = msg.to as string | undefined
        if (!to || to === user.userId) return
        ws.publish(`user:${to}`, { ...msg, from: user.userId })
      }
    },
  })
