/** Only uploaded files count as photos; anything else falls back to initials. */
export const avatarPhotoUrl = (person) => (person?.avatar?.startsWith('/media/') ? person.avatar : null)

/** A gradient whose hue is derived from the name, so each person keeps their colour. */
export function nameGradient(name) {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
    hash |= 0
  }
  const hue = Math.abs(hash) % 360
  return `linear-gradient(145deg, hsl(${hue},55%,36%), hsl(${(hue + 50) % 360},62%,26%))`
}

export function getInitials(name) {
  if (!name) return '?'
  return name.trim().split(/\s+/).map((word) => word[0]).join('').toUpperCase().slice(0, 2)
}
