import { useState } from 'react'
import { api } from '../../api'
import { CollapsibleCard } from '../../components/CollapsibleCard'
import { EMPTY_ITEM_FORM, newItemPayload } from './adminRules'
import { ItemFields } from './ItemFields'

export function AddItemPanel({ categories, reload, notify, onSessionExpired }) {
  const [form, setForm] = useState(EMPTY_ITEM_FORM)
  const [isSaving, setIsSaving] = useState(false)

  const save = async (event) => {
    event.preventDefault()
    setIsSaving(true)
    try {
      await api.csrf().catch(() => {})
      await api.addItem(newItemPayload(form))
      setForm(EMPTY_ITEM_FORM)
      await reload()
      notify('Položka pridaná')
    } catch (error) {
      if (error.status === 403) {
        onSessionExpired()
        notify('Session vypršala – prihláste sa znova')
      } else {
        notify('Chyba pri ukladaní')
      }
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <CollapsibleCard icon="plus" title="Pridať položku" className="mb-3">
      <form onSubmit={save} className="row g-2">
        <ItemFields form={form} categories={categories} onChange={setForm} isNew />
        <div className="col-12">
          <button className="btn btn-primary w-100" disabled={isSaving} type="submit">Uložiť položku</button>
        </div>
      </form>
    </CollapsibleCard>
  )
}
