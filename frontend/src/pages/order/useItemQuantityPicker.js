import { useRef, useState } from 'react'
import { QUANTITY_SUBMIT_DELAY_MS } from './orderRules'

const without = (key) => (map) => {
  const { [key]: _removed, ...rest } = map
  return rest
}

/**
 * Tap-to-count picker for items sold by the piece. Each tap restarts a timer;
 * when it runs out the counted quantity is submitted.
 */
export function useItemQuantityPicker(onSubmit) {
  const [quantities, setQuantities] = useState({})
  // Bumped on every change so the countdown bar animation restarts.
  const [versions, setVersions] = useState({})
  // Timers fire after renders, so they read quantities from a ref.
  const quantitiesRef = useRef({})
  const timersRef = useRef({})
  const onSubmitRef = useRef(onSubmit)
  onSubmitRef.current = onSubmit

  const cancelTimer = (itemId) => {
    clearTimeout(timersRef.current[itemId])
    delete timersRef.current[itemId]
  }

  const forget = (itemId) => {
    cancelTimer(itemId)
    delete quantitiesRef.current[itemId]
    setQuantities(without(itemId))
    setVersions(without(itemId))
  }

  const scheduleSubmit = (item) => {
    cancelTimer(item.id)
    timersRef.current[item.id] = setTimeout(() => {
      const quantity = quantitiesRef.current[item.id]
      forget(item.id)
      if (quantity) onSubmitRef.current(item, quantity)
    }, QUANTITY_SUBMIT_DELAY_MS)
  }

  const setQuantity = (item, quantity) => {
    quantitiesRef.current[item.id] = quantity
    setQuantities((current) => ({ ...current, [item.id]: quantity }))
    setVersions((current) => ({ ...current, [item.id]: (current[item.id] || 0) + 1 }))
    scheduleSubmit(item)
  }

  const increment = (item) => setQuantity(item, (quantitiesRef.current[item.id] || 0) + 1)

  const decrement = (item) => {
    const current = quantitiesRef.current[item.id] || 0
    if (current <= 1) forget(item.id)
    else setQuantity(item, current - 1)
  }

  const clearAll = () => {
    Object.values(timersRef.current).forEach(clearTimeout)
    timersRef.current = {}
    quantitiesRef.current = {}
    setQuantities({})
    setVersions({})
  }

  /** Submit every counted item now instead of waiting for the timers. */
  const submitAll = (items) => {
    const pending = Object.entries(quantitiesRef.current)
      .map(([itemId, quantity]) => ({ quantity, item: items.find((item) => String(item.id) === itemId) }))
      .filter(({ item, quantity }) => item && quantity)
    clearAll()
    pending.forEach(({ item, quantity }) => onSubmitRef.current(item, quantity))
  }

  const totalCount = Object.values(quantities).reduce((sum, quantity) => sum + quantity, 0)

  return { quantities, versions, totalCount, increment, decrement, clearAll, submitAll }
}
