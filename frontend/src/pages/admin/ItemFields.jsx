import { PRICING_MODE_LABELS } from './adminRules'

/** Name, category, pricing mode, price and colour, shared by the add and edit item forms. */
export function ItemFields({ form, categories, onChange, isNew = false, colorLabel = 'Farba' }) {
  const bind = (field) => ({
    value: form[field],
    onChange: (event) => onChange({ ...form, [field]: event.target.value }),
  })

  return (
    <>
      <div className="col-12">
        <label className="form-label">Názov</label>
        <input className="form-control" required={isNew} {...bind('name')} />
      </div>
      <div className="col-6">
        <label className="form-label">Kategória</label>
        <select className="form-select" required={isNew} {...bind('category_id')}>
          {isNew ? <option value="" disabled>Vyber…</option> : <option value="">—</option>}
          {categories.map((category) => (
            <option key={category.id} value={category.id}>{category.name}</option>
          ))}
        </select>
      </div>
      <div className="col-6">
        <label className="form-label">Režim</label>
        <select className="form-select" required={isNew} {...bind('pricing_mode')}>
          {Object.entries(PRICING_MODE_LABELS).map(([mode, label]) => (
            <option key={mode} value={mode}>{label}</option>
          ))}
        </select>
      </div>
      <div className="col-8">
        <label className="form-label">Cena</label>
        <input className="form-control" inputMode="decimal" required={isNew} {...bind('price')} />
      </div>
      <div className="col-4">
        <label className="form-label d-flex align-items-center gap-2">{colorLabel}</label>
        <input type="color" className="form-control form-control-color w-100" {...bind('color')} />
      </div>
    </>
  )
}
