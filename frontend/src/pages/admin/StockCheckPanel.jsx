import { useState } from 'react'
import { CollapsibleCard } from '../../components/CollapsibleCard'
import { EmptyState } from '../../components/EmptyState'
import { ALL } from './adminRules'

const DATE_FORMAT = { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }
// Matches the kiosk's weighing modal: below this the difference is weighing noise.
const TOLERATED_DIFFERENCE_GRAMS = 20

function differenceTone(difference) {
  if (Math.abs(difference) < 1) return 'badge-tone-ok'
  return Math.abs(difference) < TOLERATED_DIFFERENCE_GRAMS ? 'badge-tone-warn' : 'badge-tone-danger'
}

const grams = (value) => `${Number(value).toFixed(0)} g`

function CheckRow({ check }) {
  const difference = Number(check.difference_grams)
  return (
    <tr>
      <td className="num text-muted text-nowrap fs-xs">
        {new Date(check.created_at).toLocaleString('sk-SK', DATE_FORMAT)}
      </td>
      <td>
        <span className="d-inline-flex align-items-center gap-2">
          <span className="item-dot" style={{ background: check.item_color }} />
          {check.item_name}
        </span>
      </td>
      <td className="num text-end fw-semibold">{grams(check.net_grams)}</td>
      <td className="num text-end text-muted">{grams(check.expected_grams)}</td>
      <td className="text-end">
        <span className={`badge num ${differenceTone(difference)}`}>
          {difference > 0 ? '+' : ''}{difference.toFixed(0)} g
        </span>
      </td>
    </tr>
  )
}

function CoffeeSelect({ checks, value, onChange }) {
  const coffees = [...new Map(checks.map((check) => [check.item_id, check.item_name]))]
  return (
    <select className="form-select form-select-sm mb-3" value={value} onChange={(event) => onChange(event.target.value)}>
      <option value={ALL}>Všetky kávy</option>
      {coffees.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
    </select>
  )
}

/** Weighings logged on the kiosk: how much coffee was really left, and when. */
export function StockCheckPanel({ stockChecks }) {
  const [coffeeId, setCoffeeId] = useState(ALL)
  const visibleChecks = coffeeId === ALL
    ? stockChecks
    : stockChecks.filter((check) => String(check.item_id) === coffeeId)

  return (
    <CollapsibleCard icon="scales" title="Kontroly kávy" className="mb-3">
      {stockChecks.length === 0 ? (
        <EmptyState icon="scales" title="Zatiaľ žiadne kontroly" text="Kiosk vyzve na váženie každé 3 šálky." />
      ) : (
        <>
          <CoffeeSelect checks={stockChecks} value={coffeeId} onChange={setCoffeeId} />
          <div className="table-responsive">
            <table className="table table-sm align-middle mb-0">
              <thead>
                <tr>
                  <th>Kedy</th><th>Káva</th>
                  <th className="text-end">Reálne</th><th className="text-end">Systém</th><th className="text-end">Rozdiel</th>
                </tr>
              </thead>
              <tbody>
                {visibleChecks.map((check) => <CheckRow key={check.id} check={check} />)}
              </tbody>
            </table>
          </div>
        </>
      )}
    </CollapsibleCard>
  )
}
