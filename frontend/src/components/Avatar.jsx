import { avatarPhotoUrl, getInitials, nameGradient } from '../lib/avatar'

const STACK_LIMIT = 4

/** Overlapping avatars of several people; the ones past the limit show as a "+N" tile. */
export function AvatarStack({ persons, size = 40 }) {
  const shown = persons.slice(0, STACK_LIMIT)
  const hiddenCount = persons.length - shown.length

  return (
    <span className="avatar-stack">
      {shown.map((person, index) => <Avatar key={`${person.id}-${index}`} person={person} size={size} />)}
      {hiddenCount > 0 && (
        <span className="avatar avatar-stack-more num" style={{ width: size, height: size, fontSize: size * 0.34 }}>
          +{hiddenCount}
        </span>
      )}
    </span>
  )
}

/** Rounded-square avatar: the uploaded photo, or initials on a gradient derived from the name. */
export function Avatar({ person, size = 40, style = {}, className = '' }) {
  const photoUrl = avatarPhotoUrl(person)
  const sizeStyle = { width: size, height: size, fontSize: Math.max(11, size * 0.38), ...style }

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={person.name}
        className={`avatar ${className}`}
        style={sizeStyle}
        loading="lazy"
        decoding="async"
      />
    )
  }

  return (
    <span
      className={`avatar ${className}`}
      style={{ ...sizeStyle, background: nameGradient(person?.name || '?') }}
      aria-label={person?.name}
      role="img"
    >
      {getInitials(person?.name)}
    </span>
  )
}
