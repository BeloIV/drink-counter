import { CATEGORY } from '../../lib/categories'

export const DEBT_LIMIT_EUR = 35
export const QUANTITY_SUBMIT_DELAY_MS = 5000
export const DONE_COUNTDOWN_SECONDS = 5

export const CATEGORY_CHOICES = [
  { key: CATEGORY.BEER, label: 'Pivo', icon: 'beer', className: 'choice-beer', accusative: 'pivo' },
  { key: CATEGORY.COFFEE, label: 'Káva', icon: 'coffee', className: 'choice-coffee', accusative: 'kávu' },
  { key: CATEGORY.COLD_BREW, label: 'Cold Brew', icon: 'coldBrew', className: 'choice-cold-brew', accusative: 'cold brew' },
]

export const QUANTITY_PRESETS = {
  per_gram: [15, 20, 30, 45, 60],
  per_ml: [200, 250, 400],
}

export const DEFAULT_CUSTOM_QUANTITY = { per_gram: '7', per_ml: '200' }

export function debtClassName(debt) {
  const level = debt >= 20 ? 'debt--high' : debt >= 10 ? 'debt--mid' : 'debt--ok'
  const pulse = debt >= 30 ? ' debt-pulse-fast' : debt >= 25 ? ' debt-pulse-slow' : ''
  return level + pulse
}

export const highestDebt = (persons, debts) => Math.max(...persons.map((person) => debts[person.id] ?? 0))

export const isLowStock = (item) => Number(item.stock_quantity) < (item.pricing_mode === 'per_item' ? 3 : 50)

/** Stock an order uses up: pieces, grams, or cold brew poured for each person in the group. */
export function requiredStock(item, quantity, groupSize) {
  if (item.pricing_mode === 'per_item') return quantity ? Number(quantity) : groupSize
  if (item.pricing_mode === 'per_ml') return Number(quantity || 0) * groupSize
  return Number(quantity || 0)
}

/** Quantity booked to each person in a group: coffee grams are shared, cold brew is poured for everyone. */
export function quantityPerPerson(item, quantity, groupSize) {
  if (item.pricing_mode === 'per_ml') return Number(quantity)
  if (item.pricing_mode === 'per_gram') return Number(quantity) / groupSize
  return undefined
}

export function groupOrderNotice(item, quantity, groupSize) {
  if (item.pricing_mode === 'per_ml') {
    return `Pridané ${Number(quantity)} ml na osobu pre ${groupSize} ľudí`
  }
  if (item.pricing_mode === 'per_gram') {
    const perPerson = quantityPerPerson(item, quantity, groupSize)
    return `Pridané ${Number(quantity)} g → ${perPerson.toFixed(1)} g na osobu pre ${groupSize} ľudí`
  }
  return `Pridaný 1 ks pre ${groupSize} ľudí`
}

/** The backend flags every tenth brew of a coffee whose stock is tracked. */
export const needsStockCheck = (transaction) =>
  transaction.trigger_check && transaction.item?.stock_quantity !== null
