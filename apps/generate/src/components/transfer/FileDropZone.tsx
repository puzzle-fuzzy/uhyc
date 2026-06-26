import { useState, useRef, useCallback, type DragEvent, type ReactNode } from 'react'
import { useFileTransfer } from '../PresenceBridge'
import { UserPickerPopup } from './UserPickerPopup'

// ---------------------------------------------------------------------------
// FileDropZone — 应用级拖拽接收器
//
// 包裹整个应用，检测桌面文件拖入。
// 放下文件后弹出 UserPickerPopup 让用户选择接收人。
// ---------------------------------------------------------------------------

export function FileDropZone({ children }: { children: ReactNode }) {
  const [dragging, setDragging] = useState(false)
  const [dragFile, setDragFile] = useState<File | null>(null)
  const [showPicker, setShowPicker] = useState(false)
  const dragCounter = useRef(0)
  const { startTransfer } = useFileTransfer()

  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current++
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      const item = e.dataTransfer.items[0]
      if (item.kind === 'file') {
        setDragging(true)
      }
    }
  }, [])

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current--
    if (dragCounter.current === 0) {
      setDragging(false)
      setDragFile(null)
    }
  }, [])

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragging(false)
    dragCounter.current = 0

    const file = e.dataTransfer.files?.[0]
    if (file) {
      setDragFile(file)
      setShowPicker(true)
    }
  }, [])

  const handleSelectUser = useCallback(
    async (peerUserId: string) => {
      setShowPicker(false)
      if (!dragFile) return
      try {
        await startTransfer(peerUserId, dragFile)
      } catch {
        // 错误由 PeerConnectionManager 的 onError 处理
      }
      setDragFile(null)
    },
    [dragFile, startTransfer],
  )

  const handleCancel = useCallback(() => {
    setShowPicker(false)
    setDragFile(null)
  }, [])

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      style={{ position: 'relative', minHeight: '100%' }}
    >
      {children}

      {/* 拖拽浮层 */}
      {dragging && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(10,10,10,0.6)',
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            style={{
              padding: '48px 64px',
              borderRadius: 16,
              background: 'var(--paper)',
              border: '3px dashed var(--accent)',
              textAlign: 'center',
              fontSize: 24,
              fontWeight: 700,
              color: 'var(--ink)',
            }}
          >
            📄 松手传输文件
          </div>
        </div>
      )}

      {/* 选人弹窗 */}
      {showPicker && dragFile && (
        <UserPickerPopup
          fileName={dragFile.name}
          fileSize={dragFile.size}
          onSelect={handleSelectUser}
          onCancel={handleCancel}
        />
      )}
    </div>
  )
}
