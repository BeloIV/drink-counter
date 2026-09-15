import { categoryColor, categoryIcon } from '../../lib/categories'

const LOCALE = 'sk-SK'

const pad = (number) => String(number).padStart(2, '0')

const localDateKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

/** Group transactions by local calendar day, newest day first. */
export function groupByDay(transactions) {
  const groups = {}
  for (const transaction of transactions) {
    const key = localDateKey(new Date(transaction.created_at))
    groups[key] = [...(groups[key] || []), transaction]
  }
  return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a))
}

export function formatDayLabel(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(year, month - 1, day)
    .toLocaleDateString(LOCALE, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

export const formatTime = (iso) => new Date(iso).toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit' })

export const formatDateTime = (iso) =>
  new Date(iso).toLocaleString(LOCALE, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

/** Corrections are entered as negative amounts, which a numeric keypad cannot type. */
export function toggleSign(value) {
  const text = String(value ?? '')
  return text.startsWith('-') ? text.slice(1) : `-${text}`
}

export const transactionIcon = (transaction) => categoryIcon(transaction.item?.category?.name, 'beer')

export const transactionColor = (transaction) =>
  categoryColor(transaction.item?.category?.name, 'var(--beer-color)')

export const firstName = (person) => person?.name?.split(' ')[0]
