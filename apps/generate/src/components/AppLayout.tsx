import { Outlet } from 'react-router-dom'
import { AvatarStack } from '@uhyc/shared'
import { useAuthContext } from './AuthContext'
import { PresenceBridge, usePresenceCtx, useDevMode } from './PresenceBridge'
import { FileDropZone } from './transfer/FileDropZone'
import { TransferProgressChip } from './transfer/TransferProgressChip'
import { IncomingFileModal } from './transfer/IncomingFileModal'

const LOGO_SVG = (
  <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
    <rect x="3" y="3" width="11" height="11" rx="2" fill="#cba0ff" stroke="#0a0a0a" strokeWidth="2.5" />
    <rect x="18" y="3" width="11" height="11" rx="2" fill="#93ecff" stroke="#0a0a0a" strokeWidth="2.5" />
    <rect x="3" y="18" width="11" height="11" rx="2" fill="#ffaef3" stroke="#0a0a0a" strokeWidth="2.5" />
    <rect x="18" y="18" width="11" height="11" rx="2" fill="#0a0a0a" />
  </svg>
)

/** 顶栏内部（在 PresenceBridge 上下文中） */
function Topbar() {
  const auth = useAuthContext()
  const { onlineUsers } = usePresenceCtx()
  const { showAll, setShowAll } = useDevMode()

  const initial = (auth.user?.username ?? '?').charAt(0).toUpperCase()

  function handleAvatarClick() {
    setShowAll(!showAll)
  }

  return (
    <header className="topbar">
      <div className="topbar__brand">
        {LOGO_SVG}
        <span>uhyc · generate</span>
      </div>
      <div className="topbar__user">
        <AvatarStack
          users={onlineUsers}
          selfInitial={initial}
          showAll={showAll}
          onAvatarClick={handleAvatarClick}
          devTitle={showAll ? '开发模式：显示全部记录' : '点击切换开发模式'}
        />
        {showAll && <span className="uhyc-badge uhyc-badge--dev">DEV</span>}
        <TransferProgressChip />
        <button
          type="button"
          className="uhyc-btn uhyc-btn--ghost topbar__logout"
          onClick={auth.logout}
        >
          登出
        </button>
      </div>
    </header>
  )
}

/** 共享页面布局：顶栏 + Outlet */
export function AppLayout() {
  return (
    <PresenceBridge>
      <FileDropZone>
        <main className="gen-app">
          <Topbar />
          <Outlet />
        </main>
        <IncomingFileModal />
      </FileDropZone>
    </PresenceBridge>
  )
}
