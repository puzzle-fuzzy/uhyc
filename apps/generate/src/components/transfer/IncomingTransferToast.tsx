import { useEffect, useState } from 'react'
import { useFileTransfer } from '../PresenceBridge'

// ---------------------------------------------------------------------------
// IncomingTransferToast — 接收方进度 Toast
// ---------------------------------------------------------------------------

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

let toastIdCounter = 0

interface ToastItem {
  id: number
  transferId: string
  fileName: string
  fileSize: number
  progress: number
}

export function IncomingTransferToast() {
  const { transfers, setOnTransferComplete } = useFileTransfer()
  const [toasts, setToasts] = useState<ToastItem[]>([])

  // 接收完成时自动触发下载
  useEffect(() => {
    setOnTransferComplete((_transferId, blob, fileName) => {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      a.click()
      URL.revokeObjectURL(url)

      // Toast 改为"已完成"状态，2s 后消失
      setToasts((prev) =>
        prev.map((t) =>
          t.transferId === _transferId ? { ...t, progress: 1 } : t,
        ),
      )
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.transferId !== _transferId))
      }, 2000)
    })
    return () => setOnTransferComplete(null)
  }, [setOnTransferComplete])

  // 同步 incoming 传输到 toasts
  useEffect(() => {
    const incoming = transfers.filter((t) => t.direction === 'receive')
    setToasts((prev) => {
      const next = [...prev]
      for (const t of incoming) {
        const exist = next.find((x) => x.transferId === t.transferId)
        if (exist) {
          exist.progress = t.progress
        } else if (t.status === 'transferring' || t.status === 'connecting') {
          next.push({
            id: ++toastIdCounter,
            transferId: t.transferId,
            fileName: t.fileName,
            fileSize: t.fileSize,
            progress: 0,
          })
        }
      }
      // 移除已完成/失败的 toast
      return next.filter(
        (x) =>
          !incoming.find((t) => t.transferId === x.transferId) ||
          incoming.find((t) => t.transferId === x.transferId && (t.status === 'transferring' || t.status === 'connecting')),
      )
    })
  }, [transfers])

  if (toasts.length === 0) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className="uhyc-card"
          style={{
            width: 320,
            padding: 16,
            animation: 'slideIn 0.2s ease',
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
            📥 接收文件中
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginBottom: 8 }}>
            {t.fileName} · {formatSize(t.fileSize)}
          </div>
          <div
            style={{
              height: 6,
              borderRadius: 3,
              background: 'var(--border)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${Math.round(t.progress * 100)}%`,
                borderRadius: 3,
                background: 'var(--accent)',
                transition: 'width 0.2s ease',
              }}
            />
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 4, textAlign: 'right' }}>
            {t.progress >= 1 ? '✅ 完成' : `${Math.round(t.progress * 100)}%`}
          </div>
        </div>
      ))}
    </div>
  )
}
