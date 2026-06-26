import { useState, useEffect } from 'react'
import { useFileTransfer } from '../PresenceBridge'

// ---------------------------------------------------------------------------
// TransferProgressChip — 顶栏发送进度徽章
// ---------------------------------------------------------------------------

function formatPct(v: number): string {
  return `${Math.round(v * 100)}%`
}

export function TransferProgressChip() {
  const { transfers } = useFileTransfer()
  const [visible, setVisible] = useState(false)

  const active = transfers.find(
    (t) => t.direction === 'send' && (t.status === 'connecting' || t.status === 'transferring'),
  )

  useEffect(() => {
    if (active) {
      setVisible(true)
    } else {
      // 传输结束后延迟隐藏（让用户看到 100%）
      const timer = setTimeout(() => setVisible(false), 2000)
      return () => clearTimeout(timer)
    }
  }, [active ? active.transferId : null])

  if (!visible || !active) return null

  const icon = active.status === 'connecting' ? '🔄' : '📤'

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '4px 10px',
        borderRadius: 20,
        background: 'var(--accent-muted)',
        fontSize: 12,
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}
      title={`正在发送给 ${active.peerUserId}`}
    >
      {icon} {formatPct(active.progress)}
    </span>
  )
}
