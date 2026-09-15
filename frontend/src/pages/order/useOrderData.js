import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../../api'
import { isInCategory } from '../../lib/categories'
import { CATEGORY_CHOICES } from './orderRules'

const consumptionTotal = (person) => (person.total_beers || 0) + (person.total_coffees || 0)

// Guests with a photo come first, then the most frequent drinkers.
function compareGuests(a, b) {
  const aHasPhoto = Boolean(a.avatar)
  const bHasPhoto = Boolean(b.avatar)
  if (aHasPhoto !== bHasPhoto) return bHasPhoto ? 1 : -1
  return consumptionTotal(b) - consumptionTotal(a)
}

function debtsByPerson(summary) {
  const debts = {}
  for (const row of summary?.per_person || []) {
    debts[row.person_id] = Number(row.total_eur || 0)
  }
  return debts
}

/** People, active items and current debts for the order screen. */
export function useOrderData() {
  const [persons, setPersons] = useState([])
  const [items, setItems] = useState([])
  const [summary, setSummary] = useState(null)

  const reloadPersons = useCallback(() => api.persons().then(setPersons), [])
  const reloadItems = useCallback(
    () => api.items({ activeOnly: true }).then((data) => setItems(Array.isArray(data) ? data : [])),
    [],
  )
  const reloadSummary = useCallback(() => api.sessionActive().then(setSummary), [])

  useEffect(() => {
    reloadPersons()
    reloadItems()
    reloadSummary()
  }, [reloadPersons, reloadItems, reloadSummary])

  const debts = useMemo(() => debtsByPerson(summary), [summary])
  const categories = useMemo(
    () => CATEGORY_CHOICES.filter((choice) => items.some((item) => isInCategory(item, choice.key))),
    [items],
  )

  return {
    items,
    debts,
    categories,
    homeMembers: persons.filter((person) => !person.is_guest),
    guests: persons.filter((person) => person.is_guest).sort(compareGuests),
    reloadPersons,
    reloadItems,
    reloadSummary,
  }
}
