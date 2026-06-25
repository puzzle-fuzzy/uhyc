import * as ScrollArea from '@radix-ui/react-scroll-area'
import type { TaskResponse } from '../types'
import { TaskCard } from './TaskCard'

interface TaskHistoryProps {
  tasks: TaskResponse[]
  onRerun?: (task: TaskResponse) => void
  onDelete?: (task: TaskResponse) => void
}

export function TaskHistory({ tasks, onRerun, onDelete }: TaskHistoryProps) {
  return (
    <div className="gen-history">
      <h2 className="gen-history__title">生成记录</h2>
      <ScrollArea.Root className="gen-scroll">
        <ScrollArea.Viewport className="gen-scroll__viewport">
          {tasks.length === 0 ? (
            <p className="gen-empty">空空如也，去左边搞点创作吧 ✨</p>
          ) : (
            <div className="gen-history__list">
              {tasks.map((t) => (
                <TaskCard key={t.id} task={t} onRerun={onRerun} onDelete={onDelete} />
              ))}
            </div>
          )}
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar
          orientation="vertical"
          className="gen-scroll__bar"
        >
          <ScrollArea.Thumb className="gen-scroll__thumb" />
        </ScrollArea.Scrollbar>
      </ScrollArea.Root>
    </div>
  )
}
