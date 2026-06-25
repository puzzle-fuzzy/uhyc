// ---------------------------------------------------------------------------
// 在线用户 Presence 类型定义
// 与后端 services/api/src/modules/presence/manager.ts 保持同步
// ---------------------------------------------------------------------------

export interface PresenceUser {
  userId: string
  username: string
  role: string
}

export type PresenceMessage =
  | { type: 'snapshot'; users: PresenceUser[] }
  | { type: 'user_joined'; userId: string; username: string; role: string }
  | { type: 'user_left'; userId: string }

/** 在线头像颜色调色板 */
const PRESENCE_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
  '#f97316', '#eab308', '#22c55e', '#06b6d4',
]

/** 根据用户名哈希分配颜色，保证同一用户颜色始终一致 */
export function getPresenceColor(username: string): string {
  let hash = 0
  for (let i = 0; i < username.length; i++) {
    hash = ((hash << 5) - hash) + username.charCodeAt(i)
    hash |= 0 // 转为 32 位整数
  }
  return PRESENCE_COLORS[Math.abs(hash) % PRESENCE_COLORS.length]
}
