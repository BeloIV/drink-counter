/* Zdieľané avatar helpery — predtým duplikované v App.jsx aj pages/transactions.jsx. */

export function nameGradient(name) {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
    hash |= 0
  }
  const h = Math.abs(hash) % 360
  return `linear-gradient(145deg, hsl(${h},55%,36%), hsl(${(h + 50) % 360},62%,26%))`
}

export function getInitials(name) {
  if (!name) return '?'
  return name.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2)
}
