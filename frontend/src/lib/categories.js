/** Category names as stored in the backend, compared case-insensitively. */
export const CATEGORY = {
  BEER: 'beer',
  COFFEE: 'coffee',
  COLD_BREW: 'cold brew',
}

export const categoryKey = (item) => item?.category?.name?.toLowerCase()

export const isInCategory = (item, category) => categoryKey(item) === category

/** Coffee beans sold by the gram: the only items that can be brewed. */
export const isBrewableCoffee = (item) =>
  isInCategory(item, CATEGORY.COFFEE) && item.pricing_mode === 'per_gram'

const CATEGORY_ICON = {
  [CATEGORY.BEER]: 'beer',
  [CATEGORY.COFFEE]: 'coffee',
  [CATEGORY.COLD_BREW]: 'coldBrew',
}

const CATEGORY_COLOR = {
  [CATEGORY.BEER]: 'var(--beer-color)',
  [CATEGORY.COFFEE]: 'var(--coffee-color)',
  [CATEGORY.COLD_BREW]: 'var(--cold-brew-color)',
}

export const categoryIcon = (categoryName, fallback) =>
  CATEGORY_ICON[categoryName?.toLowerCase()] ?? fallback

export const categoryColor = (categoryName, fallback) =>
  CATEGORY_COLOR[categoryName?.toLowerCase()] ?? fallback

export const findCategory = (categories, category) =>
  categories.find((candidate) => candidate.name.toLowerCase() === category)
