import { useEffect, useState } from 'react'
import { api } from '../../api'

const asList = (data) => (Array.isArray(data) ? data : [])

export function useBrewData() {
  const [items, setItems] = useState([])
  const [categories, setCategories] = useState([])
  const [coffeeFilters, setCoffeeFilters] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    Promise.all([api.items(), api.categories(), api.getCoffeeFilters()])
      .then(([nextItems, nextCategories, nextFilters]) => {
        setItems(asList(nextItems))
        setCategories(asList(nextCategories))
        setCoffeeFilters(asList(nextFilters))
      })
      .finally(() => setIsLoading(false))
  }, [])

  return { items, categories, coffeeFilters, isLoading }
}
