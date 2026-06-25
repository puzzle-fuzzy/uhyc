export type TaskStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'CANCELED'
  | 'UNKNOWN'

export interface CreativityTask {
  id: string
  userId: string
  videoUrl: string
  status: TaskStatus
  step: number
  asrResult?: {
    text: string
    srt: string
    sentences: Array<{
      begin_time: number
      end_time: number
      text: string
      sentence_id: number
    }>
  } | null
  scriptResult?: string | null
  mergedResult?: string | null
  errorMessage: string | null
  createdAt: string
  updatedAt: string
}

export const STEP_LABELS = ['语音识别', '视频理解', '合并脚本']
export const STEP_STATUS_LABEL: Record<TaskStatus, string> = {
  PENDING: '排队中',
  RUNNING: '进行中',
  SUCCEEDED: '已完成',
  FAILED: '失败',
  CANCELED: '已取消',
  UNKNOWN: '未知',
}
