import { db, table } from '@uhyc/db'
import { inArray, isNull } from 'drizzle-orm'
import { isTerminalStatus } from '@uhyc/bailian'
import { GenerateService } from '../generate/service'

// ---------------------------------------------------------------------------
// 服务端任务轮询器
//
// 替代前端 HTTP 轮询：服务端定时查百炼，状态变化时通过 WS 推送给任务创建者。
// 轮询间隔采用指数退避：5s → 8s → 15s → 30s（封顶）。
// ---------------------------------------------------------------------------

const BACKOFF_SEQUENCE = [5000, 8000, 15000, 30000]

interface PollEntry {
  userId: string
  timer: ReturnType<typeof setTimeout> | null
  attempt: number // 当前轮询次数，用于计算退避间隔
  lastStatus: string
}

type TaskBroadcaster = (userId: string, msg: unknown) => void

export class TaskPoller {
  private tasks = new Map<string, PollEntry>()
  private broadcastFn: TaskBroadcaster | null = null

  setBroadcaster(fn: TaskBroadcaster): void {
    this.broadcastFn = fn
  }

  /** 注册任务，开始轮询 */
  register(taskId: string, userId: string, initialStatus = 'PENDING'): void {
    if (this.tasks.has(taskId)) return

    this.tasks.set(taskId, {
      userId,
      timer: null,
      attempt: 0,
      lastStatus: initialStatus,
    })

    this.schedule(taskId, BACKOFF_SEQUENCE[0])
  }

  /** 注销任务，停止轮询 */
  unregister(taskId: string): void {
    const entry = this.tasks.get(taskId)
    if (!entry) return

    if (entry.timer) clearTimeout(entry.timer)
    this.tasks.delete(taskId)
  }

  /** 服务启动时恢复所有非终态任务 */
  async recoverOnStartup(): Promise<void> {
    try {
      const terminalStatuses = ['SUCCEEDED', 'FAILED', 'CANCELED', 'UNKNOWN'] as const

      const rows = await db
        .select({
          id: table.generationTasks.id,
          userId: table.generationTasks.userId,
          status: table.generationTasks.status,
        })
        .from(table.generationTasks)
        .where(
          isNull(table.generationTasks.deletedAt),
        )

      let count = 0
      for (const row of rows) {
        if (terminalStatuses.includes(row.status as typeof terminalStatuses[number])) continue
        this.register(row.id, row.userId, row.status)
        count++
      }

      if (count > 0) {
        console.log(`[task-poller] 恢复 ${count} 个活跃任务的轮询`)
      }
    } catch (e) {
      console.error('[task-poller] 启动恢复失败:', e)
    }
  }

  private schedule(taskId: string, delay: number): void {
    const entry = this.tasks.get(taskId)
    if (!entry) return

    entry.timer = setTimeout(() => this.poll(taskId), delay)
  }

  private async poll(taskId: string): Promise<void> {
    const entry = this.tasks.get(taskId)
    if (!entry) return

    try {
      const result = await GenerateService.findOneAndSync(entry.userId, taskId)

      // isStatusReturn 表示 HTTP 错误（404 等），此时停止轮询
      if (GenerateService.isStatusReturn(result)) {
        this.unregister(taskId)
        return
      }

      const task = (result as { task: { status: string } }).task
      const currentStatus = task.status

      // 状态变化时推送给任务创建者
      if (currentStatus !== entry.lastStatus) {
        entry.lastStatus = currentStatus
        this.pushUpdate(entry.userId, task)
      }

      // 终态 → 停止轮询
      if (isTerminalStatus(currentStatus)) {
        this.unregister(taskId)
        return
      }

      // 非终态 → 安排下一次轮询（退避）
      entry.attempt++
      const backoffIdx = Math.min(entry.attempt, BACKOFF_SEQUENCE.length - 1)
      this.schedule(taskId, BACKOFF_SEQUENCE[backoffIdx])
    } catch {
      // 查询失败 → 重试（保持相同 attempt 级别）
      const backoffIdx = Math.min(entry.attempt, BACKOFF_SEQUENCE.length - 1)
      this.schedule(taskId, BACKOFF_SEQUENCE[backoffIdx])
    }
  }

  private pushUpdate(userId: string, task: unknown): void {
    if (this.broadcastFn) {
      this.broadcastFn(userId, { type: 'task_updated', task })
    }
  }
}

export const taskPoller = new TaskPoller()
