// ---------------------------------------------------------------------------
// 结构化日志
//
// 输出 JSON Lines 格式，各 tag 用 taskId 关联：
//   $ grep '"taskId":"249992b7"' log.txt    # 串起 HTTP + WS 事件
//   $ grep '"tag":"http"' log.txt           # 只看 HTTP 请求
//   $ grep '"tag":"task"' log.txt           # 只看 pipeline 事件
// ---------------------------------------------------------------------------

type LogLevel = 'info' | 'warn' | 'error'

interface LogEntry {
  ts: string
  level: LogLevel
  tag: string
  [key: string]: unknown
}

function now(): string {
  return new Date().toISOString()
}

function write(entry: LogEntry): void {
  const line = JSON.stringify(entry)
  switch (entry.level) {
    case 'error':
      console.error(line)
      break
    case 'warn':
      console.warn(line)
      break
    default:
      console.log(line)
      break
  }
}

export const logger = {
  http(method: string, path: string, status: number, durationMs: number, meta?: Record<string, unknown>) {
    write({
      ts: now(),
      level: 'info',
      tag: 'http',
      method,
      path,
      status,
      durationMs,
      ...meta,
    })
  },

  task(taskId: string, userId: string, event: string, meta?: Record<string, unknown>) {
    write({
      ts: now(),
      level: 'info',
      tag: 'task',
      taskId,
      userId,
      event,
      ...meta,
    })
  },

  error(tag: string, message: string, meta?: Record<string, unknown>) {
    write({
      ts: now(),
      level: 'error',
      tag,
      message,
      ...meta,
    })
  },

  warn(tag: string, message: string, meta?: Record<string, unknown>) {
    write({
      ts: now(),
      level: 'warn',
      tag,
      message,
      ...meta,
    })
  },
}
