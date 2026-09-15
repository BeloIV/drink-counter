import { useState } from 'react'
import { api } from '../../api'
import { CollapsibleCard } from '../../components/CollapsibleCard'
import { Icon } from '../../components/Icon'
import { CATEGORY, isBrewableCoffee, isInCategory } from '../../lib/categories'
import { errorMessage } from '../../lib/errors'
import { EMPTY_BREW_FORM, brewBatchPayload, brewSummary } from './adminRules'

const HISTORY_SIZE = 5
const HISTORY_DATE_FORMAT = { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }

const optionLabel = (item, unit) =>
  `${item.name}${item.stock_quantity !== null ? ` (${Number(item.stock_quantity).toFixed(0)}${unit})` : ''}`

function ItemSelect({ items, unit, placeholder, value, onChange, required = false }) {
  return (
    <select
      className="form-select form-select-sm"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      required={required}
    >
      <option value="">{placeholder}</option>
      {items.map((item) => (
        <option key={item.id} value={item.id}>{optionLabel(item, unit)}</option>
      ))}
    </select>
  )
}

function AmountInput({ placeholder, value, onChange, disabled = false }) {
  if (disabled) return <input className="form-control form-control-sm" disabled placeholder={placeholder} />
  return (
    <input
      className="form-control form-control-sm text-center"
      type="number"
      min="1"
      step="any"
      inputMode="decimal"
      placeholder={placeholder}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      required
    />
  )
}

function FieldRow({ select, amount, className = '' }) {
  return (
    <div className={`d-flex gap-2 ${className}`}>
      <div className="field-grow">{select}</div>
      <div className="field-amount">{amount}</div>
    </div>
  )
}

function BrewSummary({ summary }) {
  return (
    <div className="brew-summary-pill mb-3">
      <Icon name="coffee" size={13} />
      <span className="num">{summary.grams} g</span>
      <span className="opacity-50">→</span>
      <Icon name="coldBrew" size={13} />
      <span className="num">{summary.millilitres} ml</span>
      <span className="opacity-50">·</span>
      <span className="num">{summary.cost.toFixed(2)} €</span>
      <span className="opacity-50">·</span>
      <span className="num">{summary.pricePerMl.toFixed(3)} €/ml</span>
    </div>
  )
}

function BrewHistoryEntry({ batch }) {
  return (
    <div className="brew-history-item">
      <div className="fw-semibold d-flex flex-wrap align-items-center gap-1">
        {(batch.ingredients || []).map((ingredient, index) => (
          <span key={ingredient.coffee?.id ?? index} className="d-inline-flex align-items-center gap-1">
            {index > 0 && <span className="text-muted">+</span>}
            <Icon name="coffee" size={12} /> {ingredient.coffee?.name} <span className="num">{ingredient.grams} g</span>
          </span>
        ))}
        <span className="text-muted mx-1">→</span>
        <span className="d-inline-flex align-items-center gap-1">
          <Icon name="coldBrew" size={12} /> {batch.output_item?.name}
          <span className="num tone-accent">{batch.output_ml} ml</span>
        </span>
      </div>
      <div className="brew-history-meta">
        {new Date(batch.created_at).toLocaleString('sk-SK', HISTORY_DATE_FORMAT)}
        {batch.note && <span> · {batch.note}</span>}
      </div>
    </div>
  )
}

function BrewHistory({ batches }) {
  if (batches.length === 0) return null
  return (
    <div className="mt-3">
      <div className="nav-drawer-section-label px-0 pt-0">Posledné varenia</div>
      <div className="d-flex flex-column gap-1">
        {batches.slice(0, HISTORY_SIZE).map((batch) => <BrewHistoryEntry key={batch.id} batch={batch} />)}
      </div>
    </div>
  )
}

function useBrewForm() {
  const [form, setForm] = useState(EMPTY_BREW_FORM)
  const setField = (field) => (value) => setForm((current) => ({ ...current, [field]: value }))
  // Clearing the blend coffee also clears its grams.
  const setSecondaryCoffee = (value) =>
    setForm((current) => ({ ...current, secondary_coffee_id: value, secondary_grams: value ? current.secondary_grams : '' }))
  const reset = () => setForm(EMPTY_BREW_FORM)
  return { form, setField, setSecondaryCoffee, reset }
}

export function BrewBatchPanel({ items, brewBatches, reload, notify }) {
  const { form, setField, setSecondaryCoffee, reset } = useBrewForm()
  const [isBrewing, setIsBrewing] = useState(false)

  const coffees = items.filter(isBrewableCoffee)
  const blendCoffees = coffees.filter((coffee) => String(coffee.id) !== String(form.primary_coffee_id))
  const outputs = items.filter((item) => isInCategory(item, CATEGORY.COLD_BREW))
  const summary = brewSummary(form, items)

  const brew = async (event) => {
    event.preventDefault()
    setIsBrewing(true)
    try {
      await api.csrf().catch(() => {})
      await api.createBrewBatch(brewBatchPayload(form))
      reset()
      await reload()
      notify('Cold Brew vyrobený — zásoby aktualizované')
    } catch (error) {
      notify(errorMessage(error))
    } finally {
      setIsBrewing(false)
    }
  }

  return (
    <CollapsibleCard icon="coldBrew" title="Vyrobiť Cold Brew" className="mb-3" bodyClassName="card-body p-3">
      <form onSubmit={brew}>
        <div className="mb-3">
          <div className="nav-drawer-section-label px-0 pt-0">Zdroje kávy</div>
          <FieldRow
            className="mb-2"
            select={<ItemSelect items={coffees} unit="g" placeholder="— káva —" value={form.primary_coffee_id} onChange={setField('primary_coffee_id')} required />}
            amount={<AmountInput placeholder="g" value={form.primary_grams} onChange={setField('primary_grams')} />}
          />
          <FieldRow
            select={<ItemSelect items={blendCoffees} unit="g" placeholder="+ blend (voliteľné)" value={form.secondary_coffee_id} onChange={setSecondaryCoffee} />}
            amount={<AmountInput placeholder="g" value={form.secondary_grams} onChange={setField('secondary_grams')} disabled={!form.secondary_coffee_id} />}
          />
        </div>

        <div className="mb-3">
          <div className="nav-drawer-section-label px-0 pt-0">Výstup</div>
          <FieldRow
            select={<ItemSelect items={outputs} unit="ml" placeholder="— cold brew item —" value={form.output_item_id} onChange={setField('output_item_id')} required />}
            amount={<AmountInput placeholder="ml" value={form.output_ml} onChange={setField('output_ml')} />}
          />
        </div>

        {summary && <BrewSummary summary={summary} />}

        <input
          className="form-control form-control-sm mb-2"
          placeholder="Poznámka (voliteľné)"
          value={form.note}
          onChange={(event) => setField('note')(event.target.value)}
        />
        <button
          className="btn btn-primary w-100 d-flex align-items-center justify-content-center gap-2"
          type="submit"
          disabled={isBrewing}
        >
          <Icon name="coldBrew" size={15} />
          {isBrewing ? 'Vyrábam…' : 'Vyrobiť Cold Brew'}
        </button>
      </form>

      <BrewHistory batches={brewBatches} />
    </CollapsibleCard>
  )
}
