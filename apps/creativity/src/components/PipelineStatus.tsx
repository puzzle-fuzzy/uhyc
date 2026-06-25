import type { CreativityTask } from '../types'
import { STEP_LABELS } from '../types'

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
      <div className="crea-pipeline">
        <p className="crea-pipeline__empty">上传视频后开始处理</p>
      </div>
    )
  }

  return (
    <div className="crea-pipeline">
      <div className="crea-pipeline__steps">
        {STEP_LABELS.map((label, idx) => (
          <div
            key={label}
            className={`crea-pipeline__step ${stepClass(idx, task)}`}
          >
            <span className="crea-pipeline__icon">{stepIcon(idx, task)}</span>
            <span className="crea-pipeline__label">{label}</span>
          </div>
        ))}
      </div>
      <span className={`crea-pipeline__status ${task.status === 'FAILED' ? 'crea-pipeline__status--err' : ''}`}>
        {task.status === 'SUCCEEDED' ? '处理完成' :
         task.status === 'FAILED' ? `失败: ${task.errorMessage ?? ''}` :
         task.status === 'RUNNING' ? '处理中…' :
         task.status === 'PENDING' ? '正在为尊贵超级VIP极速生成中…' : ''}
      </span>
    </div>
  )
}
