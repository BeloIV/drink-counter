import { CATEGORY, isInCategory } from '../../lib/categories'
import { pricePerMl } from '../../lib/coldBrewPricing'

export const GRAM_PRESETS = [15, 65, 80]
export const DEFAULT_OUTPUT_ML = 1000
export const LOW_STOCK_GRAMS = 50

// Stored prices have three decimals; smaller differences are rounding noise.
const PRICE_TOLERANCE_EUR = 0.0005

/** Name and colour of the cold brew made from these coffees; a two-coffee blend gets a split colour. */
export function coldBrewIdentity(coffees) {
  const [first, second] = coffees.map((coffee) => coffee.item)
  if (coffees.length === 0) return { name: '', color: '#ffffff' }
  if (coffees.length === 1) return { name: first.name, color: first.color }
  if (coffees.length === 2) {
    return {
      name: `${first.name} ${second.name}`,
      color: `linear-gradient(90deg, ${first.color} 50%, ${second.color} 50%)`,
    }
  }
  return { name: coffees.map((coffee) => coffee.item.name).join(' + '), color: first.color }
}

export function brewPricePerMl(coffees, outputMl, coffeeFilters) {
  if (coffees.length === 0 || !outputMl) return null
  const coffeeCost = coffees.reduce((sum, coffee) => sum + Number(coffee.item.price) * coffee.grams, 0)
  return pricePerMl(coffeeCost, outputMl, coffeeFilters)
}

export const findColdBrew = (items, name) =>
  items.find((item) => isInCategory(item, CATEGORY.COLD_BREW) && item.name.toLowerCase() === name.toLowerCase())

export const isPriceOutdated = (item, price) =>
  Boolean(item) && price !== null && Math.abs(Number(item.price) - price) > PRICE_TOLERANCE_EUR
