import { useEffect, useState } from 'react'
import { api, payBySquareUrl } from '../../api'
import { EmptyState } from '../../components/EmptyState'
import { Icon } from '../../components/Icon'
import { useDialog } from '../../lib/dialogContext'
import { formatEuro } from '../../lib/units'

const RESET_ANIMATION_MS = 900

/** Debts as displayed; a reset counts the shown value down to zero before the reload lands. */
function useAnimatedDebts(debts) {
  const [displayed, setDisplayed] = useState({})

  useEffect(() => {
    setDisplayed((current) => ({ ...current, ...debts }))
  }, [debts])

  const animateToZero = (personId) => {
    const from = debts[personId] || 0
    if (from <= 0) return
    const start = performance.now()
    const step = (now) => {
      const progress = Math.min((now - start) / RESET_ANIMATION_MS, 1)
      const eased = 1 - (1 - progress) ** 3
      setDisplayed((current) => ({ ...current, [personId]: from * (1 - eased) }))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }

  return { displayed, animateToZero }
}

function ConsumptionCounts({ person }) {
  return (
    <div className="d-flex gap-3 mb-3 text-muted fs-sm">
      <span className="d-inline-flex align-items-center gap-1">
        <Icon name="beer" size={13} /> <span className="num">{person.total_beers}</span>
      </span>
      <span className="d-inline-flex align-items-center gap-1">
        <Icon name="coffee" size={13} /> <span className="num">{person.total_coffees}</span>
      </span>
    </div>
  )
}

function DebtActions({ person, debt, onReset }) {
  if (debt <= 0) {
    return (
      <div className="text-center d-flex align-items-center justify-content-center gap-1 py-1 tone-ok fs-sm">
        <Icon name="check" size={13} /> Bez dlhu
      </div>
    )
  }
  return (
    <>
      <button
        className="btn btn-sm btn-primary w-100 d-inline-flex align-items-center justify-content-center gap-2"
        onClick={() => window.open(payBySquareUrl(person.id), '_blank')}
      >
        <Icon name="euro" size={13} /> Pay by Square
      </button>
      <button className="btn btn-sm btn-outline-danger w-100" onClick={() => onReset(person)}>
        Vynulovať dlh
      </button>
    </>
  )
}

function PersonDebtCard({ person, debt, displayedDebt, onReset }) {
  return (
    <div className="col-12 col-md-6 col-xl-4">
      <div className={`card h-100${debt > 0 ? ' card--in-debt' : ''}`}>
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-start gap-2 mb-3">
            <div className="min-w-0">
              <div className="fw-semibold">{person.name}</div>
              {person.is_guest && <span className="badge mt-1 badge-tone-neutral">Hosť</span>}
            </div>
            <div className={`num fw-bold debt-value fs-md ${debt > 0 ? 'tone-danger' : 'tone-ok'}`}>
              {formatEuro(displayedDebt)}
            </div>
          </div>
          <ConsumptionCounts person={person} />
          <div className="d-flex flex-column gap-2">
            <DebtActions person={person} debt={debt} onReset={onReset} />
          </div>
        </div>
      </div>
    </div>
  )
}

export function PersonDebtList({ persons, debts, reload, notify }) {
  const dialog = useDialog()
  const { displayed, animateToZero } = useAnimatedDebts(debts)
  const totalDebt = Object.values(debts).reduce((sum, debt) => sum + debt, 0)

  const resetDebt = async (person) => {
    const confirmed = await dialog.confirm({
      title: `Vynulovať dlh pre ${person.name}?`,
      text: `Aktuálny dlh ${(debts[person.id] ?? 0).toFixed(2)} € sa nastaví na nulu. Túto akciu nie je možné vrátiť späť.`,
      confirmLabel: 'Vynulovať',
      tone: 'danger',
    })
    if (!confirmed) return
    animateToZero(person.id)
    await api.resetDebt(person.id)
    await reload()
    notify(`Dlh pre ${person.name} je vynulovaný`)
  }

  return (
    <div className="card p-3">
      <div className="d-flex justify-content-between align-items-center gap-3 mb-4">
        <h2 className="mb-0 d-flex align-items-center gap-2 fs-md">
          <Icon name="users" size={17} /> Osoby a dlhy
        </h2>
        <div className="text-end">
          <div className="text-muted fs-xs">Celkový dlh</div>
          <div className="num fw-bold fs-lg tone-danger">{formatEuro(totalDebt)}</div>
        </div>
      </div>
      <div className="row g-3">
        {persons.map((person) => (
          <PersonDebtCard
            key={person.id}
            person={person}
            debt={debts[person.id] ?? 0}
            displayedDebt={displayed[person.id] ?? debts[person.id] ?? 0}
            onReset={resetDebt}
          />
        ))}
        {persons.length === 0 && (
          <div className="col-12">
            <EmptyState icon="users" title="Žiadne osoby" text="Osoby pridáš na domovskej obrazovke alebo v sekcii Používatelia." />
          </div>
        )}
      </div>
    </div>
  )
}
