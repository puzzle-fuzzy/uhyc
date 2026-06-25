import type { CreativityTask } from '../types'
import { STEP_LABELS, STEP_STATUS_LABEL } from '../types'

interface ResultPanelProps {
  tasks: CreativityTask[]
  onDelete?: (task: CreativityTask) => void
  onRerun?: (task: CreativityTask) => void
}

function downloadText(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
}

function downloadSrt(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
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

function ResultCard({
  title,
  content,
  stepIdx,
  task,
}: {
  title: string
  content: string | null | undefined
  stepIdx: number
  task: CreativityTask
}) {
  const stepName = STEP_LABELS[stepIdx] ?? `步骤${stepIdx + 1}`
  const isActive = task.step === stepIdx && task.status === 'RUNNING'
  const isDone = task.step > stepIdx || (task.step === stepIdx && task.status === 'SUCCEEDED')

  return (
    <div className="crea-result">
      <div className="crea-result__head">
        <span className="crea-result__title">
          {isActive && '⏳ '}
          {isDone && '✅ '}
          {title}
        </span>
      </div>
      {isActive ? (
        <div className="crea-result__loading">
          <span className="uhyc-spinner" /> {stepName}处理中…
        </div>
      ) : content ? (
        <>
          <pre className="crea-result__content">{content}</pre>
          <div className="crea-result__actions">
            <button
              type="button"
              className="uhyc-btn uhyc-btn--small"
              onClick={() => downloadText(content, `creativity-${stepName}.txt`)}
            >
              下载 TXT
            </button>
            {stepIdx === 0 && task.asrResult?.srt && (
              <button
                type="button"
                className="uhyc-btn uhyc-btn--small"
                onClick={() => downloadSrt(task.asrResult!.srt, `creativity-${stepName}.srt`)}
              >
                下载 SRT
              </button>
            )}
          </div>
        </>
      ) : null}
    </div>
  )
}

export function ResultPanel({ tasks, onDelete }: ResultPanelProps) {
  if (tasks.length === 0) {
    return (
      <div className="crea-results">
        <p className="crea-empty">还没有处理记录，上传视频后开始</p>
      </div>
    )
  }

  return (
    <div className="crea-results">
      {tasks.map((task) => (
        <div key={task.id} className="crea-task">
          <div className="crea-task__head">
            <span className="crea-task__title">
              {task.status === 'SUCCEEDED' ? '✅' : task.status === 'FAILED' ? '❌' : '⏳'} 处理任务
            </span>
            <span className={`crea-badge crea-badge--${task.status.toLowerCase()}`}>
              {STEP_STATUS_LABEL[task.status] ?? task.status}
            </span>
          </div>

          <div className="crea-task__time">{timeAgo(task.createdAt)}</div>

          <ResultCard
            title="语音识别"
            content={task.asrResult?.text ?? null}
            stepIdx={0}
            task={task}
          />

          <ResultCard
            title="视频理解 — 剧本"
            content={task.scriptResult}
            stepIdx={1}
            task={task}
          />

          <ResultCard
            title="合并脚本"
            content={task.mergedResult}
            stepIdx={2}
            task={task}
          />

          {task.status === 'FAILED' && (
            <div className="crea-task__actions">
              {onDelete && (
                <button
                  type="button"
                  className="uhyc-btn uhyc-btn--ghost"
                  onClick={() => onDelete(task)}
                >
                  删除
                </button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
