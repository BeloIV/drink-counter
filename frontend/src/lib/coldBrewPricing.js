/** A typical batch, used to price a coffee as cold brew before it is brewed. */
export const STANDARD_BATCH = { grams: 80, millilitres: 1200 }

// One batch uses a large and a medium filter: the two most expensive presets.
const FILTERS_PER_BATCH = 2

export function filtersUsedPerBatch(coffeeFilters) {
  return [...coffeeFilters]
    .sort((a, b) => Number(b.extra_eur) - Number(a.extra_eur))
    .slice(0, FILTERS_PER_BATCH)
}

export const filterCost = (coffeeFilters) =>
  filtersUsedPerBatch(coffeeFilters).reduce((sum, filter) => sum + Number(filter.extra_eur), 0)

/** Price per ml covering coffee and filters, rounded up to a tenth of a cent. */
export function pricePerMl(coffeeCost, millilitres, coffeeFilters) {
  const perMl = (coffeeCost + filterCost(coffeeFilters)) / millilitres
  return Math.ceil(perMl * 1000) / 1000
}
