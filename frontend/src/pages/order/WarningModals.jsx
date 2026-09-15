import { Modal } from '../../components/Modal'
import { unitOf } from '../../lib/units'
import { DEBT_LIMIT_EUR } from './orderRules'

export function StockWarningModal({ warning, onCancel, onConfirm }) {
  const unit = unitOf(warning.item.pricing_mode)

  return (
    <Modal
      onClose={onCancel}
      tone="warning"
      icon="warning"
      size="sm"
      title="Málo zásoby"
      subtitle={`${warning.item.name} nemá dosť na túto objednávku.`}
      actions={
        <>
          <button className="btn btn-outline-secondary" onClick={onCancel}>Zrušiť</button>
          <button className="btn btn-primary" onClick={onConfirm}>Aj tak pridať</button>
        </>
      }
    >
      <table className="table table-sm mb-0">
        <tbody>
          <tr>
            <td className="text-muted">Dostupné</td>
            <td className="num fw-semibold text-end">{warning.available.toFixed(0)} {unit}</td>
          </tr>
          <tr>
            <td className="text-muted">Potrebné</td>
            <td className="num fw-semibold text-end tone-warn">{warning.needed.toFixed(0)} {unit}</td>
          </tr>
        </tbody>
      </table>
    </Modal>
  )
}

export function DebtWarningModal({ isGroupOrder, person, debt, onAddAnyway, onClose }) {
  const subtitle = isGroupOrder
    ? `Niektorý z vybraných ľudí má dlh nad ${DEBT_LIMIT_EUR} €. Najprv ho prosím vyrovnajte.`
    : `${person?.name} má dlh ${debt.toFixed(2)} €. Najprv ho prosím vyrovnajte.`

  return (
    <Modal
      onClose={onClose}
      tone="danger"
      icon="warning"
      size="sm"
      title="Vysoký dlh"
      subtitle={subtitle}
      actions={
        <>
          <button className="btn btn-outline-secondary" onClick={onAddAnyway}>Aj tak pridať</button>
          <button className="btn btn-danger" onClick={onClose}>Zavrieť</button>
        </>
      }
    />
  )
}
