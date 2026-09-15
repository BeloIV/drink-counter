import { useState } from 'react'
import { Modal } from '../../components/Modal'
import { parseDecimal } from '../../lib/numbers'
import { formatEuro, unitOf } from '../../lib/units'
import { settlementPreview } from './adminRules'

export function ActivateItemModal({ item, onActivate, onInvalidQuantity, onClose }) {
  const [quantityInput, setQuantityInput] = useState('')
  const unit = unitOf(item.pricing_mode)

  const activateWithStock = () => {
    const quantity = parseDecimal(quantityInput)
    if (Number.isNaN(quantity) || quantity < 0) onInvalidQuantity()
    else onActivate(quantity)
  }

  return (
    <Modal
      onClose={onClose}
      icon="stock"
      size="sm"
      title={`Aktivovať ${item.name}`}
      subtitle={`Koľko naskladniť? Zadaj množstvo v ${unit}, alebo pokračuj bez sledovania zásob.`}
      actions={
        <>
          <button className="btn btn-outline-secondary" onClick={() => onActivate(null)}>Bez sledovania</button>
          <button className="btn btn-primary" onClick={activateWithStock}>Aktivovať so zásobou</button>
        </>
      }
    >
      <label className="form-label" htmlFor="stock-quantity">Množstvo ({unit})</label>
      <input
        id="stock-quantity"
        className="form-control"
        type="number"
        min="0"
        step="any"
        inputMode="decimal"
        placeholder="napr. 1000"
        value={quantityInput}
        data-autofocus
        onChange={(event) => setQuantityInput(event.target.value)}
      />
    </Modal>
  )
}

function SummaryRow({ label, children, valueClassName = 'fw-semibold' }) {
  return (
    <tr>
      <td className="text-muted">{label}</td>
      <td className={`text-end ${valueClassName}`}>{children}</td>
    </tr>
  )
}

export function SettleModal({ item, persons, isSettling, onConfirm, onClose }) {
  const { remaining, value, members, perPerson } = settlementPreview(item, persons)

  return (
    <Modal
      onClose={onClose}
      icon="scales"
      tone="warning"
      title="Rozrátať zostatok"
      subtitle="Vytvorí sa transakcia pre každého domáceho a položka sa deaktivuje."
      actions={
        <>
          <button className="btn btn-outline-secondary" onClick={onClose}>Zrušiť</button>
          <button className="btn btn-primary" disabled={isSettling} onClick={onConfirm}>
            {isSettling ? 'Rozrátavam…' : 'Rozrátať'}
          </button>
        </>
      }
    >
      <table className="table table-sm mb-0">
        <tbody>
          <SummaryRow label="Položka">{item.name}</SummaryRow>
          <SummaryRow label="Zostatok" valueClassName="num fw-semibold">
            {remaining.toFixed(1)} {unitOf(item.pricing_mode)}
          </SummaryRow>
          <SummaryRow label="Hodnota" valueClassName="num fw-semibold">{formatEuro(value)}</SummaryRow>
          <SummaryRow label="Domáci" valueClassName="">
            {members.map((person) => person.name).join(', ') || '—'}
          </SummaryRow>
          <SummaryRow label="Každý zaplatí" valueClassName="num fw-bold tone-warn">
            {perPerson === null ? '—' : formatEuro(perPerson)}
          </SummaryRow>
        </tbody>
      </table>
    </Modal>
  )
}

export function ColdBrewDraftModal({ draft, isCreating, onConfirm, onClose }) {
  return (
    <Modal
      onClose={onClose}
      icon="coldBrew"
      size="sm"
      title={`Pridať „${draft.coffee.name}" ako Cold Brew`}
      actions={
        <>
          <button className="btn btn-outline-secondary" onClick={onClose}>Zrušiť</button>
          <button className="btn btn-primary" onClick={onConfirm} disabled={isCreating}>Vytvoriť</button>
        </>
      }
    >
      {draft.explanation.map((line) => (
        <p key={line} className="num text-muted mb-1 fs-sm">{line}</p>
      ))}
    </Modal>
  )
}
