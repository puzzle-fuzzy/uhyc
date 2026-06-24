import type { User } from '@uhyc/shared'

interface WelcomeProps {
  user: User
  onLogout: () => void
}

export function Welcome({ user, onLogout }: WelcomeProps) {
  const initial = user.username.charAt(0).toUpperCase()
  const last = user.lastLoginAt
    ? new Date(user.lastLoginAt).toLocaleString()
    : 'first login'

  return (
    <div className="uhyc-card form-card">
      <div className="uhyc-card__body welcome">
        <div className="welcome__avatar">{initial}</div>
        <p className="welcome__name">Welcome, {user.username}</p>
        <p className="welcome__email">{user.email}</p>
        <span className="uhyc-badge">Last active · {last}</span>
        <div className="welcome__actions">
          <button
            type="button"
            className="uhyc-btn uhyc-btn--ghost"
            onClick={onLogout}
          >
            Log out
          </button>
        </div>
      </div>
    </div>
  )
}
