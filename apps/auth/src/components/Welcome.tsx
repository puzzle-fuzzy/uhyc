import type { User } from '@uhyc/shared'

interface WelcomeProps {
  user: User
  onLogout: () => void
}

/** 根据当前主机名推断 generate 应用地址（同主机，端口 5174）。 */
function generateUrl(): string {
  const env = (import.meta as unknown as { env?: Record<string, string> }).env
    ?.VITE_GENERATE_URL
  if (env) return env
  return `${location.protocol}//${location.hostname}:5174`
}

export function Welcome({ user, onLogout }: WelcomeProps) {
  const initial = user.username.charAt(0).toUpperCase()
  const last = user.lastLoginAt
    ? new Date(user.lastLoginAt).toLocaleString()
    : '首次登录'

  return (
    <div className="uhyc-card form-card">
      <div className="uhyc-card__body welcome">
        <div className="welcome__avatar">{initial}</div>
        <p className="welcome__name">欢迎回来，{user.username}</p>
        <p className="welcome__email">{user.email}</p>
        <span className="uhyc-badge">上次登录 · {last}</span>
        <div className="welcome__actions">
          <a
            href={generateUrl()}
            className="uhyc-btn uhyc-btn--accent"
          >
            去创作
          </a>
          <button
            type="button"
            className="uhyc-btn uhyc-btn--ghost"
            onClick={onLogout}
          >
            退出登录
          </button>
        </div>
      </div>
    </div>
  )
}
