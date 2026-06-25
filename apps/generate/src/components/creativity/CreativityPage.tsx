import * as ScrollArea from '@radix-ui/react-scroll-area'
import { usePresence } from '@uhyc/shared'
import { useEffect } from 'react'
import { useCreativity } from '../../hooks/useCreativity'
import { VideoUpload, clearPendingVideo } from './VideoUpload'
import { PipelineStatus } from './PipelineStatus'
import { ResultPanel } from './ResultPanel'
import { creativityApi } from '../../api'

/** 视频转剧本页面内容 (route: /creativity) */
export function CreativityPage() {
  const { tasks, processing, submit, refresh, setTasks, onTaskUpdated, onWsDisconnect } = useCreativity()
  usePresence({ onTaskUpdated, onDisconnect: onWsDisconnect })

  useEffect(() => {
    void refresh()
  }, [refresh])

  const latestTask = tasks[0] ?? null

  async function handleProcess(url: string) {
    clearPendingVideo()
    await submit(url)
  }

  async function handleDelete(task: { id: string }) {
    try {
      await creativityApi.deleteTask(task.id)
      setTasks((prev) => prev.filter((t) => t.id !== task.id))
    } catch { /* ignore */ }
  }

  return (
    <div className="gen-layout">
      {/* 左侧：上传 + 流水线 */}
      <section className="gen-layout__left crea-left">
        <div className="uhyc-card crea-section">
          <VideoUpload onProcess={handleProcess} processing={processing} />
        </div>
        <div className="uhyc-card crea-section">
          <PipelineStatus task={latestTask} />
          {latestTask?.status === 'FAILED' && (
            <button
              type="button"
              className="uhyc-btn uhyc-btn--ghost"
              style={{ marginTop: 12 }}
              onClick={() => handleDelete(latestTask)}
            >
              删除记录
            </button>
          )}
        </div>
      </section>

      {/* 右侧：结果列表 */}
      <section className="gen-layout__right">
        <div className="uhyc-card gen-history">
          <div className="gen-history__head">
            <h2 className="gen-history__title">处理记录</h2>
          </div>
          <ScrollArea.Root className="gen-scroll">
            <ScrollArea.Viewport className="gen-scroll__viewport">
              <div className="gen-history__list">
                <ResultPanel tasks={tasks} onDelete={handleDelete} />
              </div>
            </ScrollArea.Viewport>
            <ScrollArea.Scrollbar orientation="vertical" className="gen-scroll__bar">
              <ScrollArea.Thumb className="gen-scroll__thumb" />
            </ScrollArea.Scrollbar>
          </ScrollArea.Root>
        </div>
      </section>
    </div>
  )
}
