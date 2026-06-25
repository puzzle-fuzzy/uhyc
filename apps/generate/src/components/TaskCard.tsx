import { useEffect, useState } from 'react'
import type { TaskResponse } from '../types'
import { artifactUrl } from '../api'

const STATUS_LABEL: Record<string, string> = {
  PENDING: '正在为尊贵超级VIP极速生成中',
  RUNNING: '尊贵VIP全力生成中',
  SUCCEEDED: '生成完成 🎉',
  FAILED: '生成失败',
  CANCELED: '已取消',
  UNKNOWN: '未知',
}

/** RUNNING 状态下循环显示的趣味标语 */
const RUNNING_SLOGANS = [
  '尊贵VIP全力生成中',
  'AI 正在挥洒创意…',
  '稍安勿躁，好饭不怕晚',
  '正在调教模型…',
  '灵感迸发中…',
  '渲染引擎轰鸣中…',
  '像素正在排列组合…',
  '魔法正在生效 ✨',
  '即将呈现，请勿走开',
  '正在把想法变成现实…',
]

function statusClass(s: string): string {
  if (s === 'SUCCEEDED') return 'gen-status--ok'
  if (s === 'FAILED' || s === 'CANCELED' || s === 'UNKNOWN') return 'gen-status--err'
  return 'gen-status--run'
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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [sloganIdx, setSloganIdx] = useState(0)
  const [justLanded, setJustLanded] = useState(false)
  const files = task.files?.filter((f) => f.kind === 'primary') ?? []
  const file = files[0]

  // 新卡入场动画
  useEffect(() => {
    const t = setTimeout(() => setJustLanded(true), 50)
    return () => clearTimeout(t)
  }, [])

  // RUNNING 时循环切换标语
  useEffect(() => {
    if (task.status !== 'PENDING' && task.status !== 'RUNNING') return
    const t = setInterval(() => {
      setSloganIdx((i) => (i + 1) % RUNNING_SLOGANS.length)
    }, 3000)
    return () => clearInterval(t)
  }, [task.status])

  const runningLabel = task.status === 'PENDING'
    ? STATUS_LABEL[task.status]
    : RUNNING_SLOGANS[sloganIdx]

  return (
    <div className={`gen-task${justLanded ? ' gen-task--visible' : ''}${task.status === 'SUCCEEDED' && justLanded ? ' gen-task--celebrate' : ''}`}>
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
                <button
                  key={f.id}
                  type="button"
                  className="gen-task__image-btn"
                  onClick={() => setPreviewUrl(artifactUrl(f.storagePath))}
                >
                  <img
                    src={artifactUrl(f.storagePath)}
                    alt={`生成结果 ${idx + 1}`}
                    className="gen-task__image"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          )
        ) : task.status === 'PENDING' || task.status === 'RUNNING' ? (
          <div className="gen-task__loading">
            <div className="gen-progress">
              <span className="gen-progress__seg gen-progress__seg--1" />
              <span className="gen-progress__seg gen-progress__seg--2" />
              <span className="gen-progress__seg gen-progress__seg--3" />
              <span className="gen-progress__seg gen-progress__seg--4" />
              <span className="gen-progress__seg gen-progress__seg--5" />
            </div>
            <span className="gen-progress__label">{runningLabel}</span>
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

      {/* 全屏图片预览 */}
      {previewUrl && (
        <div
          className="gen-overlay"
          onClick={() => setPreviewUrl(null)}
        >
          <button
            type="button"
            className="gen-overlay__close"
            onClick={() => setPreviewUrl(null)}
            aria-label="关闭"
          >
            ✕
          </button>
          <img
            src={previewUrl}
            alt="预览"
            className="gen-overlay__image"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
