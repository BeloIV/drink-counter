import { nameGradient, getInitials } from '../lib/avatar'

/* Squircle avatar — fotka ak existuje, inak iniciálky na gradiente
   odvodenom z mena. Jediná implementácia pre celú appku. */
export function Avatar({ person, size = 40, style = {}, className = '' }) {
  const url = person?.avatar?.startsWith('/media/') ? person.avatar : null
  const base = { width: size, height: size, fontSize: Math.max(11, size * 0.38), ...style }

  if (url) {
    return (
      <img
        src={url}
        alt={person.name}
        className={`avatar ${className}`}
        style={base}
      />
    )
  }

  return (
    <span
      className={`avatar ${className}`}
      style={{ ...base, background: nameGradient(person?.name || '?') }}
      aria-label={person?.name}
      role="img"
    >
      {getInitials(person?.name)}
    </span>
  )
}
