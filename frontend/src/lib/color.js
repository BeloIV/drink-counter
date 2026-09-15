/* Item colours come from the database and admins pick anything from white to
   near black. Text on a card filled with such a colour has to stay readable in
   both themes, so its colour is computed rather than guessed. */

function parseHex(color) {
  if (typeof color !== 'string') return null
  const hex = color.trim().replace('#', '')
  if (hex.length === 3) {
    return [0, 1, 2].map((i) => parseInt(hex[i] + hex[i], 16))
  }
  if (hex.length === 6) {
    return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16))
  }
  return null
}

/** WCAG 2.1 relative luminance, from 0 (black) to 1 (white). */
function luminance(color) {
  const rgb = parseHex(color)
  if (!rgb) return null
  const [r, g, b] = rgb.map((channel) => {
    const c = channel / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Text colour readable on the given background. Gradients (non-hex) are dark in this app, so they get white. */
export function contrastText(color) {
  const value = luminance(color)
  if (value === null) return '#ffffff'
  return value > 0.45 ? '#111111' : '#ffffff'
}
