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
    await Promise.all([loadCoffeeFilters(), loadBrewBatches()])
  }, [loadCoffeeFilters, loadBrewBatches])

  return { categories, items, persons, debts, coffeeFilters, brewBatches, loadAll, loadCoffeeFilters }
}
