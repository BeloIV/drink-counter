const UNIT_BY_PRICING_MODE = { per_gram: 'g', per_ml: 'ml', per_item: 'ks' }

export const unitOf = (pricingMode) => UNIT_BY_PRICING_MODE[pricingMode] ?? 'ks'

/** Items sold by weight or volume rather than by the piece. */
export const isMeasured = (pricingMode) => pricingMode === 'per_gram' || pricingMode === 'per_ml'

export const formatEuro = (amount, digits = 2) => `${Number(amount).toFixed(digits)} €`

export const formatQuantity = (quantity, pricingMode, digits = 0) =>
  `${Number(quantity).toFixed(digits)} ${unitOf(pricingMode)}`

export function formatUnitPrice(item) {
  const price = Number(item.price)
  return isMeasured(item.pricing_mode)
    ? `${price.toFixed(3)} €/${unitOf(item.pricing_mode)}`
    : `${price.toFixed(2)} €`
}

export const hasTrackedStock = (item) => item.stock_quantity !== null && item.stock_quantity !== undefined
