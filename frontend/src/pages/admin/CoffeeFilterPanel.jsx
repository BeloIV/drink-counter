import { useState } from 'react'
import { api } from '../../api'
import { CollapsibleCard } from '../../components/CollapsibleCard'
import { Icon } from '../../components/Icon'
import { useDialog } from '../../lib/dialogContext'
import { toDecimalString } from '../../lib/numbers'
import {
  EMPTY_COFFEE_FILTER_FORM, coffeeFilterError, coffeeFilterPayload, coffeeFilterToForm, overlapsExisting,
} from './adminRules'

const OVERLAP_ON_ADD = {
  text: 'Tento interval gramáže sa prekrýva s existujúcim filtrom. Pri výpočte ceny sa použije len jeden z nich.',
  confirmLabel: 'Aj tak pridať',
}
const OVERLAP_ON_EDIT = {
  text: 'Tento interval gramáže sa prekrýva s iným filtrom. Pri výpočte ceny sa použije len jeden z nich.',
  confirmLabel: 'Aj tak uložiť',
}

const filterName = (filter) => (filter.label ? `„${filter.label}"` : `${filter.g_min}–${filter.g_max} g`)

function EditableCell({ isEditing, value, onChange, display, numeric = true, className }) {
  return (
    <td className={className}>
      {isEditing ? (
        <input
          className="form-control form-control-sm"
          inputMode={numeric ? 'decimal' : undefined}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : display}
    </td>
  )
}

function RowButtons({ isEditing, isBusy, onEdit, onSave, onCancel, onDelete }) {
  if (isEditing) {
    return (
      <div className="btn-group btn-group-sm">
        <button className="btn btn-primary" disabled={isBusy} onClick={onSave} aria-label="Uložiť filter">
          <Icon name="check" size={13} />
        </button>
        <button className="btn btn-outline-secondary" onClick={onCancel} aria-label="Zrušiť úpravu">
          <Icon name="close" size={13} />
        </button>
      </div>
    )
  }
  return (
    <div className="btn-group btn-group-sm">
      <button className="btn btn-outline-secondary" onClick={onEdit}>Upraviť</button>
      <button className="btn btn-outline-danger" onClick={onDelete} aria-label="Zmazať filter">
        <Icon name="trash" size={13} />
      </button>
    </div>
  )
}

function FilterRow({ filter, editor, isBusy, onEdit, onSave, onCancel, onDelete }) {
  const isEditing = editor.id === filter.id
  const cell = (field) => ({
    isEditing,
    value: editor.form[field],
    onChange: (value) => editor.setForm({ ...editor.form, [field]: value }),
  })

  return (
    <tr className={!filter.active ? 'table-warning' : ''}>
      <EditableCell {...cell('label')} numeric={false} display={filter.label || '—'} />
      <EditableCell {...cell('g_min')} className="col-narrow" display={toDecimalString(filter.g_min, 1) ?? ''} />
      <EditableCell {...cell('g_max')} className="col-narrow" display={toDecimalString(filter.g_max, 1) ?? ''} />
      <EditableCell {...cell('extra_eur')} className="col-narrow" display={Number(filter.extra_eur).toFixed(2)} />
      <td className="text-end text-nowrap">
        <RowButtons
          isEditing={isEditing}
          isBusy={isBusy}
          onEdit={() => onEdit(filter)}
          onSave={() => onSave(filter)}
          onCancel={onCancel}
          onDelete={() => onDelete(filter)}
        />
      </td>
    </tr>
  )
}

function AddFilterForm({ form, onChange, isBusy, onSubmit }) {
  const bind = (field) => ({ value: form[field], onChange: (event) => onChange({ ...form, [field]: event.target.value }) })

  return (
    <form onSubmit={onSubmit} className="row g-2">
      <div className="col-12 col-sm-6">
        <label className="form-label">Label</label>
        <input className="form-control form-control-sm" placeholder="napr. Štandard" {...bind('label')} />
      </div>
      <div className="col-4 col-sm-2">
        <label className="form-label">Od (g)</label>
        <input className="form-control form-control-sm" inputMode="decimal" required {...bind('g_min')} />
      </div>
      <div className="col-4 col-sm-2">
        <label className="form-label">Do (g)</label>
        <input className="form-control form-control-sm" inputMode="decimal" required {...bind('g_max')} />
      </div>
      <div className="col-4 col-sm-2">
        <label className="form-label">+ €</label>
        <input className="form-control form-control-sm" inputMode="decimal" required {...bind('extra_eur')} />
      </div>
      <div className="col-12">
        <button className="btn btn-sm btn-primary w-100" disabled={isBusy} type="submit">Pridať filter</button>
      </div>
    </form>
  )
}

function FilterTable({ filters, editor, isBusy, onEdit, onSave, onDelete }) {
  return (
    <div className="table-responsive mb-3">
      <table className="table table-sm align-middle mb-0">
        <thead>
          <tr><th>Label</th><th>Od</th><th>Do</th><th>+ €</th><th /></tr>
        </thead>
        <tbody>
          {filters.map((filter) => (
            <FilterRow
              key={filter.id}
              filter={filter}
              editor={editor}
              isBusy={isBusy}
              onEdit={onEdit}
              onSave={onSave}
              onCancel={editor.cancel}
              onDelete={onDelete}
            />
          ))}
          {filters.length === 0 && (
            <tr><td colSpan="5" className="text-center text-muted py-3">Žiadne filtre — prirážka sa neuplatní.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function useFilterEditor() {
  const [id, setId] = useState(null)
  const [form, setForm] = useState(EMPTY_COFFEE_FILTER_FORM)
  const start = (filter) => {
    setId(filter.id)
    setForm(coffeeFilterToForm(filter))
  }
  const cancel = () => {
    setId(null)
    setForm(EMPTY_COFFEE_FILTER_FORM)
  }
  return { id, form, setForm, start, cancel }
}

/** Surcharges added to coffee orders by gram range: (price per g × grams) + extra €. */
export function CoffeeFilterPanel({ coffeeFilters, reload, notify }) {
  const dialog = useDialog()
  const editor = useFilterEditor()
  const [newForm, setNewForm] = useState(EMPTY_COFFEE_FILTER_FORM)
  const [isBusy, setIsBusy] = useState(false)

  const runBusy = async (task, failureMessage) => {
    setIsBusy(true)
    try {
      await task()
    } catch (error) {
      notify(`${failureMessage}: ${error.message || error}`)
    } finally {
      setIsBusy(false)
    }
  }

  // Validates and asks about overlapping ranges; resolves to a payload, or null to stop.
  const confirmedPayload = async (form, ignoredId, overlapCopy) => {
    const problem = coffeeFilterError(form)
    if (problem) {
      notify(problem)
      return null
    }
    const payload = coffeeFilterPayload(form)
    if (!overlapsExisting(coffeeFilters, payload, ignoredId)) return payload
    const confirmed = await dialog.confirm({ title: 'Intervaly sa prekrývajú', tone: 'danger', ...overlapCopy })
    return confirmed ? payload : null
  }

  const addFilter = (event) => {
    event.preventDefault()
    runBusy(async () => {
      const payload = await confirmedPayload(newForm, null, OVERLAP_ON_ADD)
      if (!payload) return
      await api.addCoffeeFilter(payload)
      setNewForm(EMPTY_COFFEE_FILTER_FORM)
      await reload()
      notify('Kávový filter pridaný')
    }, 'Chyba pri pridávaní kávového filtra')
  }

  const saveFilter = (filter) =>
    runBusy(async () => {
      const payload = await confirmedPayload(editor.form, filter.id, OVERLAP_ON_EDIT)
      if (!payload) return
      await api.updateCoffeeFilter(filter.id, payload)
      await reload()
      editor.cancel()
      notify('Kávový filter upravený')
    }, 'Chyba pri úprave kávového filtra')

  const deleteFilter = async (filter) => {
    const confirmed = await dialog.confirm({
      title: 'Zmazať kávový filter?',
      text: `Filter ${filterName(filter)} sa odstráni z výpočtu ceny.`,
      confirmLabel: 'Zmazať',
      tone: 'danger',
    })
    if (!confirmed) return
    await api.deleteCoffeeFilter(filter.id)
    await reload()
    notify('Kávový filter je zmazaný')
  }

  return (
    <CollapsibleCard icon="coffee" title="Kávové filtre">
      <p className="text-muted small mb-3">
        <code>(cena_za_g × gramy) + extra_eur</code> podľa intervalu gramáže.
      </p>
      <FilterTable
        filters={coffeeFilters}
        editor={editor}
        isBusy={isBusy}
        onEdit={editor.start}
        onSave={saveFilter}
        onDelete={deleteFilter}
      />
      <AddFilterForm form={newForm} onChange={setNewForm} isBusy={isBusy} onSubmit={addFilter} />
    </CollapsibleCard>
  )
}
