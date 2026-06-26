import { useEffect, useRef, useState } from 'react'
import { useFileTransfer } from '../PresenceBridge'
import { usePresenceCtx } from '../PresenceBridge'

// ---------------------------------------------------------------------------
// IncomingFileModal — 接收方文件传输弹窗
//
// 功能：
//   1. 待接收列表：显示所有 pending offer，每条有 接受/拒绝 按钮
//   2. 进行中列表：已接受但未完成的传输，显示进度条
//   3. 完成列表：传输完成后显示"已完成"，2s 后消失
//   4. 支持同时收到多个文件的场景
// ---------------------------------------------------------------------------

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface CompletedItem {
  transferId: string
  fileName: string
}

export function IncomingFileModal() {
  const { onlineUsers } = usePresenceCtx()
  const { pendingOffers, transfers, acceptOffer, rejectOffer, setOnTransferComplete } =
    useFileTransfer()
  const [completed, setCompleted] = useState<CompletedItem[]>([])
  const completedTimerRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const visible =
    pendingOffers.length > 0 ||
    transfers.filter((t) => t.direction === 'receive' && t.status !== 'done').length > 0 ||
    completed.length > 0

  // 查用户名
  function userName(userId: string): string {
    return onlineUsers.find((u) => u.userId === userId)?.username ?? userId
  }

  // 注册完成回调：自动触发下载
  useEffect(() => {
    setOnTransferComplete((transferId, blob, fileName) => {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      a.click()
      URL.revokeObjectURL(url)

      // 加入完成列表，2s 后移除
      setCompleted((prev) => [...prev, { transferId, fileName }])
      const timer = setTimeout(() => {
        setCompleted((prev) => prev.filter((c) => c.transferId !== transferId))
        completedTimerRef.current.delete(transferId)
      }, 2000)
      completedTimerRef.current.set(transferId, timer)
    })
    return () => {
      setOnTransferComplete(null)
      for (const timer of completedTimerRef.current.values()) {
        clearTimeout(timer)
      }
      completedTimerRef.current.clear()
    }
  }, [setOnTransferComplete])

  if (!visible) return null

  const incomingTransfers = transfers.filter(
    (t) => t.direction === 'receive' && (t.status === 'connecting' || t.status === 'transferring'),
  )
  const hasActive = incomingTransfers.length > 0 || pendingOffers.length > 0

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
        maxWidth: 380,
      }}
    >
      {hasActive && (
        <div
          className="uhyc-card"
          style={{
            padding: 16,
            minWidth: 320,
            animation: 'slideIn 0.2s ease',
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>
            📥 文件传输
          </div>

          {/* ── 待接收列表 ── */}
          {pendingOffers.length > 0 && (
            <div style={{ marginBottom: incomingTransfers.length > 0 ? 12 : 0 }}>
              {pendingOffers.map((offer) => (
                <div
                  key={offer.transferId}
                  style={{
                    padding: '10px 0',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600 }}>
                    {userName(offer.from ?? '')}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-muted)', margin: '2px 0 8px' }}>
                    {offer.fileName} · {formatSize(offer.fileSize)}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      className="uhyc-btn"
                      style={{
                        padding: '4px 16px',
                        fontSize: 12,
                        background: 'var(--accent)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 6,
                        cursor: 'pointer',
                      }}
                      onClick={() => acceptOffer(offer.transferId)}
                    >
                      接受
                    </button>
                    <button
                      type="button"
                      className="uhyc-btn uhyc-btn--ghost"
                      style={{ padding: '4px 16px', fontSize: 12 }}
                      onClick={() => rejectOffer(offer.transferId)}
                    >
                      拒绝
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── 进行中列表 ── */}
          {incomingTransfers.map((t) => (
            <div
              key={t.transferId}
              style={{
                padding: '6px 0',
              }}
            >
              <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginBottom: 4 }}>
                {t.fileName}
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
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--ink-muted)',
                  marginTop: 2,
                  textAlign: 'right',
                }}
              >
                {Math.round(t.progress * 100)}%
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── 完成 Toast ── */}
      {completed.map((c) => (
        <div
          key={c.transferId}
          className="uhyc-card"
          style={{
            padding: '10px 16px',
            animation: 'slideIn 0.2s ease',
            fontSize: 13,
          }}
        >
          ✅ {c.fileName} 下载完成
        </div>
      ))}
    </div>
  )
}
