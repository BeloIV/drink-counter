import { useState } from 'react'
import { unitOf } from '../../lib/units'
import { itemToForm } from './adminRules'
import { ItemFields } from './ItemFields'

export function ItemEditForm({ item, categories, onSave, onCancel }) {
  const [form, setForm] = useState(() => itemToForm(item))
  // Re-keying the swatch replays its pulse animation whenever the colour changes.
  const [swatchKey, setSwatchKey] = useState(0)

  const changeForm = (next) => {
    if (next.color !== form.color) setSwatchKey((key) => key + 1)
    setForm(next)
  }

  const colorLabel = (
    <>
      Farba
      <span key={swatchKey} className="color-swatch dot-pulse-anim" style={{ backgroundColor: form.color }} />
    </>
  )

  return (
    <>
      <div className="row g-2 mb-3">
        <ItemFields form={form} categories={categories} onChange={changeForm} colorLabel={colorLabel} />
        <div className="col-12">
          <label className="form-label" htmlFor={`stock-${item.id}`}>
            Zásoba ({unitOf(form.pricing_mode)})
            <span className="text-muted fw-normal"> — prázdne znamená, že sa nesleduje</span>
          </label>
          <input
            id={`stock-${item.id}`}
            className="form-control"
            type="number"
            min="0"
            step="any"
            inputMode="decimal"
            value={form.stock_quantity}
            onChange={(event) => setForm({ ...form, stock_quantity: event.target.value })}
            placeholder="napr. 1000"
          />
        </div>
      </div>
      <div className="d-flex gap-2">
        <button className="btn btn-primary flex-fill" onClick={() => onSave(form)}>Uložiť</button>
        <button className="btn btn-outline-secondary flex-fill" onClick={onCancel}>Zrušiť</button>
      </div>
    </>
  )
}
