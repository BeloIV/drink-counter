import { useState } from 'react'
import { api } from '../../api'
import { Icon } from '../../components/Icon'
import { isBrewableCoffee } from '../../lib/categories'
import { errorMessage } from '../../lib/errors'

const NEW_ITEM = 'new'
const DATE_FORMAT = { day: 'numeric', month: 'numeric', year: 'numeric' }
const STATUS_LABEL = { ordered: 'objednaná', done: 'vybavená' }

const perKg = (price) => `${(Number(price) * 1000).toFixed(2)} €/kg`
const stockLabel = (item) => (item.stock_quantity !== null ? ` (${Number(item.stock_quantity).toFixed(0)} g)` : '')

function LineRow({ line, coffees, pick, onChange, disabled }) {
  const inputId = `epera-${line.line_key}`
  const isOff = line.imported || !pick.checked
  return (
    <li className="list-group-item px-0">
      <div className="d-flex align-items-center gap-2">
        <input
          id={inputId}
          className="form-check-input mt-0 flex-shrink-0"
          type="checkbox"
          checked={line.imported || pick.checked}
          disabled={disabled || line.imported}
          onChange={(event) => onChange({ ...pick, checked: event.target.checked })}
        />
        <span className="item-dot flex-shrink-0" style={{ background: line.color }} />
        <label htmlFor={inputId} className={`flex-grow-1 ${isOff ? 'text-muted' : 'fw-semibold'}`}>
          {line.shop_name}{line.roast && ` · ${line.roast}`}
        </label>
        <span className="num text-nowrap">{line.imported ? 'na sklade' : `+${line.grams} g`}</span>
      </div>
      {!isOff && (
        <div className="d-flex align-items-center gap-2 mt-2">
          <select
            className="form-select form-select-sm"
            value={pick.target}
            disabled={disabled}
            onChange={(event) => onChange({ ...pick, target: event.target.value })}
          >
            <option value={NEW_ITEM}>Nová položka „{line.name}“</option>
            {coffees.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}{stockLabel(item)}{item.active ? '' : ' – skrytá'}
              </option>
            ))}
          </select>
          <span className="num text-muted fs-xs text-nowrap">{perKg(line.price)}</span>
        </div>
      )}
    </li>
  )
}

function initialPicks(lines) {
  return Object.fromEntries(lines.map((line) => [
    line.line_key,
    { checked: !line.imported, target: line.item_id ? String(line.item_id) : NEW_ITEM },
  ]))
}

function groupByMember(lines) {
  const groups = new Map()
  for (const line of lines) groups.set(line.member, [...(groups.get(line.member) ?? []), line])
  return [...groups]
}

/** From the last Epera group order placed with the shop to coffee stock, bag by bag. */
export function EperaImportPanel({ items, reload, notify }) {
  const [order, setOrder] = useState(null)
  const [picks, setPicks] = useState({})
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState('')
  const coffees = items.filter(isBrewableCoffee)

  const load = async () => {
    setIsBusy(true)
    setError('')
    try {
      const next = await api.eperaLastOrder()
      setOrder(next)
      setPicks(initialPicks(next.lines))
    } catch (failure) {
      setOrder(null)
      setError(errorMessage(failure))
    } finally {
      setIsBusy(false)
    }
  }

  const chosen = (order?.lines ?? []).filter((line) => !line.imported && picks[line.line_key]?.checked)

  const book = async () => {
    setIsBusy(true)
    setError('')
    try {
      const choices = Object.fromEntries(chosen.map((line) => {
        const { target } = picks[line.line_key]
        return [line.line_key, target === NEW_ITEM ? null : Number(target)]
      }))
      const { booked } = await api.eperaImport({ round_id: order.round.id, choices })
      setOrder(null)
      await reload()
      notify(`Na sklade: ${booked.map((line) => `${line.name} +${line.grams} g`).join(', ')}`)
    } catch (failure) {
      setError(errorMessage(failure))
    } finally {
      setIsBusy(false)
    }
  }

  const round = order?.round
  const orderedAt = round?.ordered_at && new Date(round.ordered_at).toLocaleDateString('sk-SK', DATE_FORMAT)
  const isAllBooked = order?.lines.length > 0 && order.lines.every((line) => line.imported)
  const chosenGrams = chosen.reduce((sum, line) => sum + line.grams, 0)

  return (
    <div className="card mb-3">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center gap-2">
          <span className="fw-semibold d-flex align-items-center gap-2">
            <Icon name="coffee" size={15} /> Objednávka z Epery
          </span>
          <button className="btn btn-sm btn-outline-primary" onClick={load} disabled={isBusy}>
            {isBusy && !order ? 'Načítavam…' : 'Nahodiť poslednú objednávku'}
          </button>
        </div>

        {error && <div className="alert alert-danger py-2 mt-3 mb-0 fs-sm">{error}</div>}

        {order && !round && <p className="text-muted mt-3 mb-0">Zatiaľ žiadna objednaná objednávka.</p>}

        {round && (
          <div className="mt-3">
            <p className="text-muted fs-sm mb-2">
              Objednávka č. {round.id}, {STATUS_LABEL[round.status] ?? round.status}{orderedAt && ` ${orderedAt}`}
            </p>
            {order.lines.length === 0 ? (
              <p className="mb-0">V tejto objednávke nemáte žiadnu kávu.</p>
            ) : (
              <>
                {groupByMember(order.lines).map(([member, lines]) => (
                  <div key={member} className="mb-2">
                    <div className="fs-xs text-muted text-uppercase fw-semibold">{member}</div>
                    <ul className="list-group list-group-flush">
                      {lines.map((line) => (
                        <LineRow
                          key={line.line_key}
                          line={line}
                          coffees={coffees}
                          pick={picks[line.line_key]}
                          disabled={isBusy}
                          onChange={(pick) => setPicks((current) => ({ ...current, [line.line_key]: pick }))}
                        />
                      ))}
                    </ul>
                  </div>
                ))}
                {isAllBooked ? (
                  <p className="mb-0"><Icon name="check" size={13} /> Všetko z tejto objednávky už je na sklade.</p>
                ) : (
                  <>
                    <p className="text-muted fs-xs">
                      Odškrtnuté kávy ostanú na neskôr. Cena za gram je to, čo ste reálne zaplatili;
                      so zvyškom na sklade sa spriemeruje.
                    </p>
                    <div className="d-flex gap-2">
                      <button className="btn btn-outline-secondary" onClick={() => setOrder(null)} disabled={isBusy}>
                        Zrušiť
                      </button>
                      <button
                        className="btn btn-primary flex-grow-1"
                        onClick={book}
                        disabled={isBusy || chosen.length === 0}
                      >
                        {isBusy ? 'Ukladám…' : `Pridať na sklad${chosenGrams ? ` (${chosenGrams} g)` : ''}`}
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
