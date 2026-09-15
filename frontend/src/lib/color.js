/* Farby položiek prichádzajú z DB — používateľ si ich volí v Admine a siaha
   po celom rozsahu vrátane bielej a veľmi tmavej. Keď takou farbou vyplníme
   celú kartu, text na nej musí ostať čitateľný v oboch témach, takže sa
   kontrastná farba počíta, nie háda. */

function parseHex(color) {
  if (typeof color !== 'string') return null
  const hex = color.trim().replace('#', '')
  if (hex.length === 3) {
    return [0, 1, 2].map(i => parseInt(hex[i] + hex[i], 16))
  }
  if (hex.length === 6) {
    return [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16))
  }
  return null
}

/** Relatívna svetlosť podľa WCAG 2.1, 0 (čierna) až 1 (biela). */
export function luminance(color) {
  const rgb = parseHex(color)
  if (!rgb) return null
  const [r, g, b] = rgb.map(v => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Farba textu, ktorá je na danom podklade čitateľná.
 *  Nehexové hodnoty (gradienty) dostanú bielu — tie sú v tejto appke tmavé. */
export function contrastText(color) {
  const l = luminance(color)
  if (l === null) return '#ffffff'
  return l > 0.45 ? '#111111' : '#ffffff'
}

/** Je podklad svetlý? Pre jemné odtiene odvodené od textu. */
export function isLightColor(color) {
  const l = luminance(color)
  return l === null ? false : l > 0.45
}
