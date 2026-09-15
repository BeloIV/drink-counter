import { Icons } from '../lib/icons'

export function Icon({ name, size = 18, ...rest }) {
  const C = Icons[name]
  if (!C) return null
  return <C size={size} aria-hidden="true" {...rest} />
}
