import { useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import type { User } from '@uhyc/shared'

interface UserProfileModalProps {
  open: boolean
  user: User
  onClose: () => void
  onLogout: () => void
}

interface QuickAction {
  label: string
  hint: string
  color: string
  dark: boolean   // 深色背景用白色文字
  onClick: () => void
}

/** Ctrl+P / Cmd+P 命令面板 */
export function UserProfileModal({ open, user, onClose, onLogout }: UserProfileModalProps) {
  const navigate = useNavigate()
  const initial = user.username.charAt(0).toUpperCase()
  const lastLogin = user.lastLoginAt
    ? new Date(user.lastLoginAt).toLocaleString('zh-CN')
    : '首次登录'

  const quickActions: QuickAction[] = [
    { label: '工作室',     hint: 'AI 生成中心',    color: 'var(--purple)',  dark: false, onClick: () => { onClose(); navigate('/') } },
    { label: '消耗',       hint: '费用 & 用量',     color: 'var(--cyan)',   dark: false, onClick: () => {} },
    { label: '资产',       hint: '我的文件',        color: 'var(--pink)',   dark: false, onClick: () => {} },
    { label: '设置',       hint: '偏好 & 账户',     color: 'var(--ink)',    dark: true,  onClick: () => {} },
    { label: '视频转剧本', hint: 'AI 视频分析',     color: 'var(--purple-soft)', dark: false, onClick: () => { onClose(); navigate('/creativity') } },
  ]

  // Esc 关闭
  const onKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose],
  )

  useEffect(() => {
    if (!open) return
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onKey])

  if (!open) return null

  return (
    <div className="profile-overlay" onClick={onClose}>
      <div className="profile-panel" onClick={(e) => e.stopPropagation()}>
        {/* 标题栏 */}
        <div className="profile-panel__bar">
          <span className="profile-panel__title">命令面板</span>
          <button
            type="button"
            className="profile-panel__close"
            onClick={onClose}
            aria-label="关闭"
          >
            ✕
          </button>
        </div>

        {/* 双栏内容 */}
        <div className="profile-panel__body">
          {/* 左侧：用户卡片 */}
          <div className="profile-card">
            <div className="profile-card__avatar">{initial}</div>
            <div className="profile-card__info">
              <span className="profile-card__name">{user.username}</span>
              <span className="profile-card__email">{user.email}</span>
              <span className="uhyc-badge">
                {lastLogin === '首次登录' ? '首次登录' : `上次登录 · ${lastLogin}`}
              </span>
            </div>
            <div className="profile-card__foot">
              {user.role === 'admin' && (
                <span className="uhyc-badge uhyc-badge--dev">管理员</span>
              )}
              <button
                type="button"
                className="uhyc-btn uhyc-btn--ghost"
                onClick={onLogout}
              >
                退出登录
              </button>
            </div>
          </div>

          {/* 右侧：快捷入口 3×2 */}
          <div className="profile-quick">
            {quickActions.map((action) => (
              <button
                key={action.label}
                type="button"
                className="profile-quick__btn"
                style={{
                  background: action.color,
                  color: action.dark ? 'var(--paper)' : undefined,
                }}
                onClick={action.onClick}
              >
                <span className="profile-quick__label" style={action.dark ? { color: 'var(--paper)' } : undefined}>
                  {action.label}
                </span>
                <span className="profile-quick__hint" style={action.dark ? { color: 'rgba(255,255,255,0.7)' } : undefined}>
                  {action.hint}
                </span>
              </button>
            ))}
            {/* 占位：后续扩展 */}
            <div className="profile-quick__placeholder">
              <span className="profile-quick__label">敬请期待</span>
            </div>
          </div>
        </div>
      </div>

      <p className="profile-hint">Esc 关闭 · Ctrl+P 打开</p>
    </div>
  )
}
