import { useState } from 'react'
import { api } from '../../api'
import { getFunnyMessage } from '../../lib/funnyMessages'
import { hasTrackedStock, isMeasured } from '../../lib/units'
import {
  DEBT_LIMIT_EUR, DONE_COUNTDOWN_SECONDS,
  highestDebt, needsStockCheck, quantityPerPerson, requiredStock,
} from './orderRules'

/** Sends orders after the stock and debt checks, and holds the resulting warnings and result. */
export function useOrderSubmission({ flow, data, countdown }) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  // { transactions, item }: what the done step shows, one transaction per person.
  const [lastBooking, setLastBooking] = useState(null)
  const [funnyMessage, setFunnyMessage] = useState(null)
  const [stockWarning, setStockWarning] = useState(null)
  const [debtWarning, setDebtWarning] = useState(null)
  // The coffee to weigh while the stock check is open.
  const [coffeeCheck, setCoffeeCheck] = useState(null)
  // 'saved' | 'skipped' once a stock check was answered; the done step mentions it.
  const [stockCheckOutcome, setStockCheckOutcome] = useState(null)

  const refreshAfterOrder = () => Promise.all([data.reloadSummary(), data.reloadItems()])

  /** Show the done step; with a stock check due, the countdown waits until it is answered. */
  const showResult = async (booking) => {
    setLastBooking(booking)
    setStockCheckOutcome(null)
    await refreshAfterOrder()
    setFunnyMessage(getFunnyMessage())
    if (needsStockCheck(booking)) setCoffeeCheck({ item: booking.item })
    else countdown.start(DONE_COUNTDOWN_SECONDS)
    flow.setStep('done')
  }

  // One request for the whole group: the backend counts shared coffee as a single brew
  // and returns the stock left after everyone, so a stock check compares against the right number.
  const submitGroupOrder = async (item, quantity) => {
    const groupSize = flow.selectedPersons.length
    const perPerson = quantityPerPerson(item, quantity, groupSize)
    return api.addGroupTransactions({
      person_ids: flow.selectedPersons.map((person) => person.id),
      item_id: item.id,
      ...(isMeasured(item.pricing_mode) ? { quantity: perPerson } : {}),
    })
  }

  const submitSingleOrder = async (item, quantity) => {
    const created = await api.addTransaction({
      person_id: flow.selectedPerson.id,
      item_id: item.id,
      ...(quantity !== null && quantity !== undefined ? { quantity: Number(quantity) } : {}),
    })
    return { transactions: [created], item: created.item, trigger_check: created.trigger_check }
  }

  const addItem = async (item, quantity) => {
    const isGroup = flow.isGroupOrder && flow.selectedPersons.length > 0
    if (!isGroup && !flow.selectedPerson) return
    setIsSubmitting(true)
    try {
      const booking = isGroup
        ? await submitGroupOrder(item, quantity)
        : await submitSingleOrder(item, quantity)
      await showResult(booking)
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

  const finishCoffeeCheck = (outcome) => {
    setCoffeeCheck(null)
    setStockCheckOutcome(outcome)
    if (flow.step === 'done') countdown.start(DONE_COUNTDOWN_SECONDS)
  }

  return {
    isSubmitting,
    lastBooking,
    funnyMessage,
    stockWarning,
    debtWarning,
    coffeeCheck,
    stockCheckOutcome,
    refreshAfterOrder,
    checkOrder,
    confirmStockWarning: () => addDespiteWarning(stockWarning, setStockWarning),
    dismissStockWarning: () => setStockWarning(null),
    confirmDebtWarning: () => addDespiteWarning(debtWarning, setDebtWarning),
    dismissDebtWarning: () => setDebtWarning(null),
    finishCoffeeCheck,
    clearResult: () => {
      setFunnyMessage(null)
      setLastBooking(null)
      setStockCheckOutcome(null)
    },
  }
}
