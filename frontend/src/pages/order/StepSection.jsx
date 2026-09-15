import { Icon } from '../../components/Icon'

export function StepSection({ title, children }) {
  return (
    <section className="mb-5 step-zoom-in">
      <h2 className="mb-3 text-center fs-lg">{title}</h2>
      {children}
    </section>
  )
}

export function StepNavigation({ onBack, onChangePerson }) {
  return (
    <div className="mt-4 d-flex gap-2 flex-wrap">
      <button className="btn btn-outline-secondary d-inline-flex align-items-center gap-2" onClick={onBack}>
        <Icon name="back" size={16} /> Späť
      </button>
      {onChangePerson && (
        <button className="btn btn-outline-secondary" onClick={onChangePerson}>Zmeniť osobu</button>
      )}
    </div>
  )
}

const progressClass = (isActive, isDone) => (isActive ? 'active' : isDone ? 'done' : '')

/** Breadcrumb of the order steps. */
export function OrderProgress({ step, selectedCategory, selectedItem }) {
  const isDone = step === 'done'

  return (
    <div className="steps mb-3">
      <span className="done">Osoba</span>
      <span className={progressClass(step === 'category', Boolean(selectedCategory))}>Kategória</span>
      <span className={progressClass(step === 'item', step === 'grams' || isDone)}>Typ</span>
      <span className={progressClass(step === 'grams', isDone && selectedItem?.pricing_mode !== 'per_item')}>
        Gramáž
      </span>
      <span className={progressClass(isDone, false)}>Dlh</span>
    </div>
  )
}
