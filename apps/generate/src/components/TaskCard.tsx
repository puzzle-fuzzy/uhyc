import { useState } from 'react'
import type { TaskResponse } from '../types'
import { artifactUrl } from '../api'

const STATUS_LABEL: Record<string, string> = {
  PENDING: '排队中',
  RUNNING: '生成中',
  SUCCEEDED: '成功',
  FAILED: '失败',
  CANCELED: '已取消',
  UNKNOWN: '未知',
}

function statusClass(s: string): string {
  if (s === 'SUCCEEDED') return 'gen-status--ok'
  if (s === 'FAILED' || s === 'CANCELED' || s === 'UNKNOWN') return 'gen-status--err'
  return 'gen-status--run'
}

function primaryFile(task: TaskResponse) {
  return task.files?.find((f) => f.kind === 'primary')
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return '刚刚'
  if (m < 60) return `${m} 分钟前`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} 小时前`
  return `${Math.floor(h / 24)} 天前`
}

interface TaskCardProps {
  task: TaskResponse
  onRerun?: (task: TaskResponse) => void
  onDelete?: (task: TaskResponse) => void
}

function downloadAll(files: TaskResponse['files']) {
  for (const f of files ?? []) {
    const a = document.createElement('a')
    a.href = artifactUrl(f.storagePath)
    a.download = f.originalFilename || 'download'
    a.click()
  }
}

export function TaskCard({ task, onRerun, onDelete }: TaskCardProps) {
  const [expanded, setExpanded] = useState(false)
  const files = task.files?.filter((f) => f.kind === 'primary') ?? []
  const file = files[0]

  return (
    <div className="gen-task">
      <div className="gen-task__head">
        <span className="gen-task__model">{task.model}</span>
        <span className={`gen-status ${statusClass(task.status)}`}>
          {STATUS_LABEL[task.status] ?? task.status}
        </span>
      </div>

      <div className="gen-task__preview">
        {task.status === 'SUCCEEDED' && file ? (
          task.category === 'video' ? (
            <video
              src={artifactUrl(file.storagePath)}
              controls
              className="gen-media"
            />
          ) : (
            <div className="gen-task__image-grid">
              {files.map((f, idx) => (
                <a
                  key={f.id}
                  href={artifactUrl(f.storagePath)}
                  className="gen-task__image-link"
                  target="_blank"
                  rel="noreferrer"
                >
                  <img
                    src={artifactUrl(f.storagePath)}
                    alt={`生成结果 ${idx + 1}`}
                    className="gen-task__image"
                  />
                </a>
              ))}
            </div>
          )
        ) : task.status === 'PENDING' || task.status === 'RUNNING' ? (
          <div className="gen-task__loading">
            <span className="uhyc-spinner" /> {STATUS_LABEL[task.status]}
          </div>
        ) : task.status === 'FAILED' ? (
          <p className="gen-task__error">{task.errorMessage}</p>
        ) : null}
      </div>

      <div className="gen-task__foot">
        <span>
          {task.subCategory} · {timeAgo(task.createdAt)}
        </span>
        <div className="gen-task__actions">
          {onRerun && (task.status === 'FAILED' || task.status === 'SUCCEEDED') && (
            <button
              type="button"
              className="gen-task__btn gen-task__btn--retry"
              onClick={() => onRerun(task)}
            >
              {task.status === 'SUCCEEDED' ? '重新生成' : '重试'}
            </button>
          )}
          {onDelete && task.status === 'FAILED' && (
            <button
              type="button"
              className="gen-task__btn gen-task__btn--delete"
              onClick={() => onDelete(task)}
            >
              删除
            </button>
          )}
          {files.length > 0 && (
            <button
              type="button"
              className="gen-task__btn"
              onClick={() => downloadAll(files)}
            >
              下载
            </button>
          )}
          <button
            type="button"
            className="gen-task__btn"
            onClick={() => setExpanded((e) => !e)}
          >
            {expanded ? '收起' : '详情'}
          </button>
        </div>
      </div>

      {expanded && (
        <pre className="gen-task__params">
          {JSON.stringify(task, null, 2)}
        </pre>
      )}
    </div>
  )
}
