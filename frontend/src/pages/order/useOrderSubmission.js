import { useState } from 'react'
import { api } from '../../api'
import { getFunnyMessage } from '../../lib/funnyMessages'
import { hasTrackedStock, isMeasured } from '../../lib/units'
import {
  DEBT_LIMIT_EUR, DONE_COUNTDOWN_SECONDS,
  groupOrderNotice, highestDebt, needsStockCheck, quantityPerPerson, requiredStock,
} from './orderRules'

/** Sends orders after the stock and debt checks, and holds the resulting warnings and result. */
export function useOrderSubmission({ flow, data, notice, countdown }) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [lastOrder, setLastOrder] = useState(null)
  const [funnyMessage, setFunnyMessage] = useState(null)
  const [stockWarning, setStockWarning] = useState(null)
  const [debtWarning, setDebtWarning] = useState(null)
  const [coffeeCheckItem, setCoffeeCheckItem] = useState(null)

  const refreshAfterOrder = () => Promise.all([data.reloadSummary(), data.reloadItems()])

  const submitGroupOrder = async (item, quantity) => {
    const groupSize = flow.selectedPersons.length
    const perPerson = quantityPerPerson(item, quantity, groupSize)
    const created = await Promise.all(
      flow.selectedPersons.map((person) =>
        api.addTransaction({
          person_id: person.id,
          item_id: item.id,
          ...(isMeasured(item.pricing_mode) ? { quantity: perPerson } : {}),
        }),
      ),
    )
    await refreshAfterOrder()
    notice.show(groupOrderNotice(item, quantity, groupSize))
    flow.setStep('person')
    return created.find(needsStockCheck)
  }

  const submitSingleOrder = async (item, quantity) => {
    const created = await api.addTransaction({
      person_id: flow.selectedPerson.id,
      item_id: item.id,
      ...(quantity !== null && quantity !== undefined ? { quantity: Number(quantity) } : {}),
    })
    setLastOrder(created)
    await refreshAfterOrder()
    setFunnyMessage(getFunnyMessage())
    countdown.start(DONE_COUNTDOWN_SECONDS)
    flow.setStep('done')
    return needsStockCheck(created) ? created : null
  }

  const addItem = async (item, quantity) => {
    const isGroup = flow.isGroupOrder && flow.selectedPersons.length > 0
    if (!isGroup && !flow.selectedPerson) return
    setIsSubmitting(true)
    try {
      const orderToCheck = isGroup
        ? await submitGroupOrder(item, quantity)
        : await submitSingleOrder(item, quantity)
      if (orderToCheck) setCoffeeCheckItem(orderToCheck.item)
    } finally {
      setIsSubmitting(false)
    }
  }

  const currentDebt = () =>
    flow.isGroupOrder
      ? highestDebt(flow.selectedPersons, data.debts)
      : (data.debts[flow.selectedPerson?.id] ?? 0)

  /** Warn about missing stock or a high debt before adding; otherwise add right away. */
  const checkOrder = (item, quantity) => {
    if (hasTrackedStock(item)) {
      const needed = requiredStock(item, quantity, flow.groupSize)
      const available = Number(item.stock_quantity)
      if (needed > available) {
        setStockWarning({ item, quantity, needed, available })
        return
      }
    }
    if (currentDebt() >= DEBT_LIMIT_EUR) {
      setDebtWarning({ item, quantity })
      return
    }
    addItem(item, quantity)
  }

  const addDespiteWarning = (warning, dismiss) => {
    dismiss(null)
    addItem(warning.item, warning.quantity)
  }

  return {
    isSubmitting,
    lastOrder,
    funnyMessage,
    stockWarning,
    debtWarning,
    coffeeCheckItem,
    refreshAfterOrder,
    checkOrder,
    confirmStockWarning: () => addDespiteWarning(stockWarning, setStockWarning),
    dismissStockWarning: () => setStockWarning(null),
    confirmDebtWarning: () => addDespiteWarning(debtWarning, setDebtWarning),
    dismissDebtWarning: () => setDebtWarning(null),
    closeCoffeeCheck: () => setCoffeeCheckItem(null),
    clearResult: () => {
      setFunnyMessage(null)
      setLastOrder(null)
    },
  }
}
