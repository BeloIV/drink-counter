import { useState } from 'react'
import { api } from '../../api'
import { useDialog } from '../../lib/dialogContext'
import { buildColdBrewDraft, itemUpdatePayload } from './adminRules'

const EXIT_ANIMATION_MS = 250
const SAVED_HIGHLIGHT_MS = 600

/** Edit, hide, activate, delete, settle and cold-brew actions for the admin item list. */
export function useItemActions({ data, notify }) {
  const dialog = useDialog()
  const [editingId, setEditingId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [savedId, setSavedId] = useState(null)
  const [activatingItem, setActivatingItem] = useState(null)
  const [settlingItem, setSettlingItem] = useState(null)
  const [isSettling, setIsSettling] = useState(false)
  const [coldBrewDraft, setColdBrewDraft] = useState(null)
  const [isCreatingColdBrew, setIsCreatingColdBrew] = useState(false)

  // Activating asks for stock first; hiding happens right away.
  const toggleActive = async (item) => {
    if (!item.active) {
      setActivatingItem(item)
      return
    }
    await api.updateItem(item.id, { active: false })
    await data.loadAll()
  }

  const activate = async (stockQuantity) => {
    const item = activatingItem
    setActivatingItem(null)
    const payload = { active: true }
    if (stockQuantity !== null) payload.stock_quantity = String(stockQuantity)
    await api.updateItem(item.id, payload)
    await data.loadAll()
    notify('Položka aktivovaná')
  }

  const saveEdit = async (item, form) => {
    await api.updateItem(item.id, itemUpdatePayload(form))
    await data.loadAll()
    setSavedId(item.id)
    setTimeout(() => setSavedId(null), SAVED_HIGHLIGHT_MS)
    setEditingId(null)
    notify('Položka upravená')
  }

  const remove = async (item) => {
    const confirmed = await dialog.confirm({
      title: `Zmazať ${item.name}?`,
      text: 'Položka sa odstráni natrvalo. Existujúce transakcie zostanú zachované.',
      confirmLabel: 'Zmazať',
      tone: 'danger',
    })
    if (!confirmed) return
    setDeletingId(item.id)
    // Let the exit animation finish before the card leaves the list.
    setTimeout(async () => {
      await api.deleteItem(item.id)
      await data.loadAll()
      setDeletingId(null)
    }, EXIT_ANIMATION_MS)
  }

  const settle = async () => {
    setIsSettling(true)
    try {
      await api.csrf().catch(() => {})
      const result = await api.settleItem(settlingItem.id)
      setSettlingItem(null)
      await data.loadAll()
      notify(`Rozrátané: ${result.remaining_value} € medzi ${result.count} domácich`)
    } catch (error) {
      notify(`Chyba pri rozrátaní: ${error.message || error}`)
    } finally {
      setIsSettling(false)
    }
  }

  const draftColdBrew = (coffee) => {
    const draft = buildColdBrewDraft(coffee, data.categories, data.coffeeFilters)
    if (draft) setColdBrewDraft(draft)
    else notify('Najprv vytvor kategóriu "Cold Brew"')
  }

  const createColdBrew = async () => {
    const { payload } = coldBrewDraft
    setColdBrewDraft(null)
    setIsCreatingColdBrew(true)
    try {
      await api.csrf().catch(() => {})
      await api.addItem(payload)
      await data.loadAll()
      notify(`Cold Brew "${payload.name}" pridaný (${payload.price} €/ml)`)
    } catch (error) {
      notify(`Chyba pri vytváraní Cold Brew: ${error.message || error}`)
    } finally {
      setIsCreatingColdBrew(false)
    }
  }

  return {
    editingId,
    deletingId,
    savedId,
    activatingItem,
    settlingItem,
    isSettling,
    coldBrewDraft,
    isCreatingColdBrew,
    startEdit: (item) => setEditingId(item.id),
    cancelEdit: () => setEditingId(null),
    saveEdit,
    toggleActive,
    activate,
    closeActivation: () => setActivatingItem(null),
    remove,
    openSettle: setSettlingItem,
    closeSettle: () => setSettlingItem(null),
    settle,
    draftColdBrew,
    closeColdBrewDraft: () => setColdBrewDraft(null),
    createColdBrew,
  }
}
