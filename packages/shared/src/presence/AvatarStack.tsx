import { getPresenceColor, type PresenceUser } from './types'

interface AvatarStackProps {
  users: PresenceUser[]
  selfInitial: string
  showAll?: boolean
  onAvatarClick?: () => void
  devTitle?: string
}

/** Online presence avatar stack — shared across all apps. */
export function AvatarStack({
  users,
  selfInitial,
  showAll = false,
  onAvatarClick,
  devTitle,
}: AvatarStackProps) {
  const visible = users.slice(0, 5)
  const overflow = users.length - 5

  return (
    <div
      className="uhyc-avatar-stack"
      onMouseLeave={(e) => {
        const avatars = e.currentTarget.querySelectorAll<HTMLElement>('.uhyc-avatar-item')
        avatars.forEach((el, i) => {
          el.style.zIndex = String(i)
        })
      }}
    >
      {visible.map((u, i) => (
        <span
          key={u.userId}
          className="uhyc-avatar-item uhyc-avatar-online"
          style={{ backgroundColor: getPresenceColor(u.username), zIndex: i }}
          title={u.username}
          onMouseEnter={(e) => { e.currentTarget.style.zIndex = '999' }}
        >
          {u.username.charAt(0).toUpperCase()}
        </span>
      ))}
      {overflow > 0 && (
        <span
          className="uhyc-avatar-item uhyc-avatar-online uhyc-avatar-overflow"
          style={{ zIndex: visible.length }}
          title={users.slice(5).map((u) => u.username).join(', ')}
          onMouseEnter={(e) => { e.currentTarget.style.zIndex = '999' }}
        >
          +{overflow}
        </span>
      )}
      <span
        className={`uhyc-avatar-item uhyc-avatar-self${showAll ? ' uhyc-avatar-self--dev' : ''}`}
        style={{ zIndex: users.length + 10 }}
        onClick={onAvatarClick}
        title={devTitle}
        onMouseEnter={(e) => { e.currentTarget.style.zIndex = '999' }}
      >
        {selfInitial}
      </span>
    </div>
  )
}
