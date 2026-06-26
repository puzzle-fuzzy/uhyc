import { usePresenceCtx } from '../PresenceBridge'

// ---------------------------------------------------------------------------
// UserPickerPopup — 选择在线用户接收文件
// ---------------------------------------------------------------------------

interface UserPickerPopupProps {
  fileName: string
  fileSize: number
  onSelect: (peerUserId: string, peerName: string) => void
  onCancel: () => void
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function UserPickerPopup({ fileName, fileSize, onSelect, onCancel }: UserPickerPopupProps) {
  const { onlineUsers } = usePresenceCtx()

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(10,10,10,0.5)',
      }}
      onClick={onCancel}
    >
      <div
        className="uhyc-card"
        style={{
          width: 340,
          padding: 24,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700 }}>
          传输文件
        </h3>
        <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--ink-muted)' }}>
          {fileName} · {formatSize(fileSize)}
        </p>

        <p style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600 }}>
          选择接收人
        </p>

        {onlineUsers.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--ink-muted)' }}>暂无在线用户</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {onlineUsers.map((u) => (
              <button
                key={u.userId}
                type="button"
                className="uhyc-btn uhyc-btn--ghost"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 12px',
                  width: '100%',
                  textAlign: 'left',
                }}
                onClick={() => onSelect(u.userId, u.username)}
              >
                <span
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: 14,
                    color: '#fff',
                    background: '#cba0ff',
                    flexShrink: 0,
                  }}
                >
                  {u.username.charAt(0).toUpperCase()}
                </span>
                <span style={{ fontSize: 14 }}>{u.username}</span>
              </button>
            ))}
          </div>
        )}

        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
          <button type="button" className="uhyc-btn uhyc-btn--ghost" onClick={onCancel}>
            取消
          </button>
        </div>
      </div>
    </div>
  )
}
