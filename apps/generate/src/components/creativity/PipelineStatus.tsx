import type { CreativityTask } from '../../types'
import { STEP_LABELS, STEP_STATUS_LABEL } from '../../types'

interface PipelineStatusProps {
  task: CreativityTask | null
}

function stepIcon(stepIdx: number, task: CreativityTask): string {
  if (task.status === 'FAILED') return '✕'
  const currentStep = task.step
  if (currentStep > stepIdx) return '✓'
  if (currentStep === stepIdx && task.status === 'RUNNING') return '◌'
  if (currentStep === stepIdx && task.status === 'SUCCEEDED') return '✓'
  return '○'
}

function stepClass(stepIdx: number, task: CreativityTask): string {
  if (task.status === 'FAILED') return 'crea-pipeline__step--fail'
  const currentStep = task.step
  if (currentStep > stepIdx) return 'crea-pipeline__step--done'
  if (currentStep === stepIdx && task.status !== 'SUCCEEDED') return 'crea-pipeline__step--active'
  return ''
}

export function PipelineStatus({ task }: PipelineStatusProps) {
  if (!task) {
    return (
      <div className="crea-pipeline crea-pipeline--idle">
        <p className="crea-pipeline__empty">上传视频后开始处理</p>
      </div>
    )
  }

  return (
    <div className="crea-pipeline">
      <div className="crea-pipeline__steps" role="list">
        {STEP_LABELS.map((label, idx) => {
          const cls = stepClass(idx, task)
          return (
            <div
              key={label}
              role="listitem"
              className={`crea-pipeline__step ${cls}`}
              aria-current={cls.includes('active') ? 'step' : undefined}
              aria-label={`${label}: ${cls.includes('done') ? '已完成' : cls.includes('active') ? '进行中' : cls.includes('fail') ? '失败' : '等待中'}`}
            >
              <span className="crea-pipeline__icon" aria-hidden="true">{stepIcon(idx, task)}</span>
              <span className="crea-pipeline__label">{label}</span>
            </div>
          )
        })}
      </div>
      <span className={`crea-pipeline__status ${task.status === 'FAILED' ? 'crea-pipeline__status--err' : ''}`}>
        {STEP_STATUS_LABEL[task.status] ?? task.status}
      </span>
    </div>
  )
}
