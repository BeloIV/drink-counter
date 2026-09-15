import { CATEGORY, findCategory, isInCategory } from '../../lib/categories'
import { STANDARD_BATCH, filterCost, filtersUsedPerBatch, pricePerMl } from '../../lib/coldBrewPricing'
import { toDecimalString, withDecimalPoint } from '../../lib/numbers'
import { hasTrackedStock, isMeasured } from '../../lib/units'

export const ALL = 'All'

export const STATUS_FILTERS = [
  { value: ALL, label: 'Všetky' },
  { value: 'Active', label: 'Aktívne' },
  { value: 'Hidden', label: 'Skryté' },
]

export const PRICING_MODE_LABELS = { per_item: 'za kus', per_gram: 'za gram', per_ml: 'za ml' }

// ── Items ─────────────────────────────────────────────────────────────────

export function filterItems(items, { category, status }) {
  return items
    .filter((item) => category === ALL || item.category?.name === category)
    .filter((item) => status === ALL || (status === 'Active' ? item.active : !item.active))
}

/** Colour class for remaining stock; grams and ml run in hundreds, pieces in single digits. */
export function stockToneClass(item) {
  const quantity = Number(item.stock_quantity)
  const [comfortable, low] = isMeasured(item.pricing_mode) ? [200, 50] : [5, 1]
  if (quantity > comfortable) return 'tone-ok'
  return quantity > low ? 'tone-warn' : 'tone-danger'
}

export const EMPTY_ITEM_FORM = { name: '', category_id: '', price: '', pricing_mode: 'per_item', color: '#ffffff' }

export function itemToForm(item) {
  return {
    name: item.name,
    price: String(item.price),
    category_id: String(item.category?.id ?? ''),
    pricing_mode: item.pricing_mode || 'per_item',
    color: item.color || '#ffffff',
    stock_quantity: hasTrackedStock(item) ? String(item.stock_quantity) : '',
  }
}

export const newItemPayload = (form) => ({
  ...form,
  category_id: Number(form.category_id),
  price: String(form.price),
})

/** Blank stock means the item stops tracking stock. */
export const itemUpdatePayload = (form) => ({
  name: form.name,
  price: String(form.price),
  category_id: Number(form.category_id || 0) || undefined,
  pricing_mode: form.pricing_mode,
  color: form.color,
  stock_quantity: form.stock_quantity === '' ? null : String(form.stock_quantity),
})

/** What settling an item's leftover stock would charge each active home member. */
export function settlementPreview(item, persons) {
  const remaining = Number(item.stock_quantity || 0)
  const value = Number((remaining * Number(item.price)).toFixed(2))
  const members = persons.filter((person) => !person.is_guest && person.active)
  const perPerson = members.length > 0 ? value / members.length : null
  return { remaining, value, members, perPerson }
}

// ── Cold brew ─────────────────────────────────────────────────────────────

export const hasColdBrewVersion = (coffee, items) =>
  items.some((other) =>
    other.pricing_mode === 'per_ml'
    && isInCategory(other, CATEGORY.COLD_BREW)
    && other.name.toLowerCase() === coffee.name.toLowerCase(),
  )

function filterCostNote(coffeeFilters) {
  const cost = filterCost(coffeeFilters)
  if (cost <= 0) return ''
  const names = filtersUsedPerBatch(coffeeFilters)
    .map((filter) => filter.label || `${filter.g_min}-${filter.g_max}g`)
    .join(' + ')
  return ` + filtre ${cost.toFixed(2)} € (${names})`
}

/** A cold brew item priced from a standard batch of the coffee, or null without a Cold Brew category. */
export function buildColdBrewDraft(coffee, categories, coffeeFilters) {
  const category = findCategory(categories, CATEGORY.COLD_BREW)
  if (!category) return null

  const coffeePrice = Number(coffee.price)
  const coffeeCost = STANDARD_BATCH.grams * coffeePrice
  const price = pricePerMl(coffeeCost, STANDARD_BATCH.millilitres, coffeeFilters)

  return {
    coffee,
    payload: {
      name: coffee.name,
      category_id: category.id,
      pricing_mode: 'per_ml',
      price: String(price),
      color: coffee.color || '#ffffff',
    },
    explanation: [
      `${STANDARD_BATCH.grams} g × ${coffeePrice.toFixed(3)} €/g = ${coffeeCost.toFixed(2)} €${filterCostNote(coffeeFilters)}`,
      `÷ ${STANDARD_BATCH.millilitres} ml → cena ${price.toFixed(3)} €/ml`,
    ],
  }
}

export const EMPTY_BREW_FORM = {
  primary_coffee_id: '',
  primary_grams: '',
  secondary_coffee_id: '',
  secondary_grams: '',
  output_item_id: '',
  output_ml: '',
  note: '',
}

export function brewBatchPayload(form) {
  const ingredients = [{ coffee_id: Number(form.primary_coffee_id), grams: toDecimalString(form.primary_grams) }]
  if (form.secondary_coffee_id) {
    ingredients.push({ coffee_id: Number(form.secondary_coffee_id), grams: toDecimalString(form.secondary_grams) })
  }
  const payload = {
    ingredients,
    output_item_id: Number(form.output_item_id),
    output_ml: toDecimalString(form.output_ml),
  }
  if (form.note.trim()) payload.note = form.note.trim()
  return payload
}

/** Live totals for the brew form, or null until a coffee, its grams and the output volume are set. */
export function brewSummary(form, items) {
  const findItem = (id) => items.find((item) => String(item.id) === String(id))
  const primary = findItem(form.primary_coffee_id)
  const secondary = form.secondary_coffee_id ? findItem(form.secondary_coffee_id) : null
  const primaryGrams = Number(form.primary_grams) || 0
  const secondaryGrams = Number(form.secondary_grams) || 0
  const millilitres = Number(form.output_ml) || 0
  if (!primary || !primaryGrams || !millilitres) return null

  const cost = Number(primary.price) * primaryGrams + (secondary ? Number(secondary.price) * secondaryGrams : 0)
  return {
    grams: primaryGrams + secondaryGrams,
    millilitres,
    cost,
    pricePerMl: (cost / millilitres) * 1000,
  }
}

// ── Coffee filters ────────────────────────────────────────────────────────

export const EMPTY_COFFEE_FILTER_FORM = { label: '', g_min: '', g_max: '', extra_eur: '' }

export const coffeeFilterToForm = (filter) => ({
  label: filter.label ?? '',
  g_min: String(filter.g_min ?? ''),
  g_max: String(filter.g_max ?? ''),
  extra_eur: String(filter.extra_eur ?? ''),
})

const toNumber = (value) => Number(withDecimalPoint(value ?? '0'))

export function coffeeFilterError({ g_min, g_max, extra_eur }) {
  const [min, max, extra] = [g_min, g_max, extra_eur].map(toNumber)
  if ([min, max, extra].some(Number.isNaN)) return 'Zadaj platné čísla (g_min, g_max, extra_eur).'
  if (min < 0 || max <= 0) return 'Rozsah gramáže musí byť kladný.'
  if (min > max) return 'Od (g) nesmie byť viac než Do (g).'
  return null
}

export const coffeeFilterPayload = (form) => ({
  label: (form.label || '').trim() || null,
  g_min: toDecimalString(form.g_min),
  g_max: toDecimalString(form.g_max),
  extra_eur: toDecimalString(form.extra_eur),
})

/** Only one surcharge applies per order, so overlapping gram ranges are worth a warning. */
export function overlapsExisting(filters, candidate, ignoredId = null) {
  const start = Number(candidate.g_min)
  const end = Number(candidate.g_max)
  return filters.some((filter) =>
    filter.id !== ignoredId && Math.max(start, Number(filter.g_min)) <= Math.min(end, Number(filter.g_max)),
  )
}
