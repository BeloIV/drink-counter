const isBlank = (value) => value === '' || value === null || value === undefined

/** Accept the decimal comma people type on a Slovak keyboard. */
export const withDecimalPoint = (value) => String(value).replace(',', '.')

/** Parse typed input to a number; blank input is NaN rather than 0. */
export const parseDecimal = (value) => (isBlank(value) ? NaN : Number(withDecimalPoint(value)))

/** Fixed-place string, which DRF DecimalFields accept; null for blank or invalid input. */
export function toDecimalString(value, places = 3) {
  const number = parseDecimal(value)
  return Number.isNaN(number) ? null : number.toFixed(places)
}
