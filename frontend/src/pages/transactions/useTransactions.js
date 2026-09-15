import { useCallback, useEffect, useState } from 'react'
import { api } from '../../api'

const PAGE_SIZE = 20
// A person filter shows a calendar of everything, so it loads one large page instead of paginating.
const FILTERED_LIMIT = 500

/** The transaction list with pagination and a filter by person. */
export function useTransactions(onLoadError) {
  const [transactions, setTransactions] = useState([])
  const [selectedIds, setSelectedIds] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [offset, setOffset] = useState(0)
  const [totalCount, setTotalCount] = useState(0)

  const load = useCallback(async (nextOffset, personIds) => {
    setIsLoading(true)
    try {
      const limit = personIds.length ? FILTERED_LIMIT : PAGE_SIZE
      const page = await api.getTransactions(limit, nextOffset, personIds)
      setTransactions((current) => (nextOffset === 0 ? page.results : [...current, ...page.results]))
      setTotalCount(page.count)
      setOffset(nextOffset)
    } catch {
      onLoadError('Transakcie sa nepodarilo načítať.')
    } finally {
      setIsLoading(false)
    }
  }, [onLoadError])

  useEffect(() => {
    load(0, [])
  }, [load])

  const filterByPersons = (personIds) => {
    setSelectedIds(personIds)
    load(0, personIds)
  }

  const togglePerson = (personId) =>
    filterByPersons(
      selectedIds.includes(personId) ? selectedIds.filter((id) => id !== personId) : [...selectedIds, personId],
    )

  const isFiltered = selectedIds.length > 0

  return {
    transactions,
    selectedIds,
    isLoading,
    isFirstPageLoading: isLoading && offset === 0,
    totalCount,
    isFiltered,
    hasMore: !isFiltered && transactions.length < totalCount,
    togglePerson,
    clearFilter: () => filterByPersons([]),
    loadMore: () => load(offset + PAGE_SIZE, selectedIds),
    removeLocally: (transactionId) => {
      setTransactions((current) => current.filter((transaction) => transaction.id !== transactionId))
      setTotalCount((count) => count - 1)
    },
    replaceLocally: (updated) =>
      setTransactions((current) => current.map((transaction) => (transaction.id === updated.id ? updated : transaction))),
  }
}
