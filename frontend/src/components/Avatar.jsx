import { avatarPhotoUrl, getInitials, nameGradient } from '../lib/avatar'

/** Rounded-square avatar: the uploaded photo, or initials on a gradient derived from the name. */
export function Avatar({ person, size = 40, style = {}, className = '' }) {
  const photoUrl = avatarPhotoUrl(person)
  const sizeStyle = { width: size, height: size, fontSize: Math.max(11, size * 0.38), ...style }

  if (photoUrl) {
    return <img src={photoUrl} alt={person.name} className={`avatar ${className}`} style={sizeStyle} />
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
