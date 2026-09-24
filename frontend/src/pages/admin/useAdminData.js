import { useCallback, useState } from 'react'
import { api } from '../../api'
import { debtsByPerson } from '../../lib/debts'

/** Everything the admin dashboard shows, with loaders to refresh it after changes. */
export function useAdminData() {
  const [categories, setCategories] = useState([])
  const [items, setItems] = useState([])
  const [persons, setPersons] = useState([])
  const [debts, setDebts] = useState({})
  const [coffeeFilters, setCoffeeFilters] = useState([])
  const [brewBatches, setBrewBatches] = useState([])
  const [stockChecks, setStockChecks] = useState([])

  const loadCoffeeFilters = useCallback(async () => {
    setCoffeeFilters(await api.getCoffeeFilters())
  }, [])

  const loadBrewBatches = useCallback(async () => {
    try {
      setBrewBatches(await api.getBrewBatches())
    } catch {
      // Brew history is optional; the dashboard works without it.
    }
  }, [])

  const loadStockChecks = useCallback(async () => {
    try {
      setStockChecks(await api.getStockChecks())
    } catch {
      // Like brew history, the weighing log is optional for the dashboard.
    }
  }, [])

  const loadAll = useCallback(async () => {
    const [nextCategories, nextItems, nextPersons, session] = await Promise.all([
      api.categories(),
      api.items(),
      api.persons(),
      api.sessionActive(),
    ])
    setCategories(nextCategories)
    setItems(nextItems)
    setPersons(nextPersons)
    setDebts(debtsByPerson(session))
    await Promise.all([loadCoffeeFilters(), loadBrewBatches(), loadStockChecks()])
  }, [loadCoffeeFilters, loadBrewBatches, loadStockChecks])

  return { categories, items, persons, debts, coffeeFilters, brewBatches, stockChecks, loadAll, loadCoffeeFilters }
}
