import { Avatar } from '../../components/Avatar'
import { Icon } from '../../components/Icon'
import { formatEuro, formatQuantity } from '../../lib/units'
import { formatDateTime, transactionColor, transactionIcon } from './transactionRules'

const ENTER_STAGGER_SECONDS = 0.03
const MAX_STAGGERED_CARDS = 10

export function TransactionCard({ transaction, index, onEdit, onDelete }) {
  const { person, item } = transaction
  const staggerIndex = Math.min(index, MAX_STAGGERED_CARDS)

  return (
    <div className="card item-card-enter" style={{ animationDelay: `${staggerIndex * ENTER_STAGGER_SECONDS}s` }}>
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
          <div className="d-flex align-items-center gap-3 min-w-0">
            <Avatar person={person} size={42} />
            <div className="min-w-0">
              <div className="fw-semibold">{person.name}</div>
              <div className="d-flex align-items-center gap-1 text-muted fs-sm">
                <span style={{ color: transactionColor(transaction) }}>
                  <Icon name={transactionIcon(transaction)} size={13} />
                </span>
                {item.name}
              </div>
            </div>
          </div>
          <div className="text-end">
            <div className="num fw-bold fs-md tone-accent">{formatEuro(transaction.price_at_time)}</div>
            <div className="num text-muted fs-xs">{formatQuantity(transaction.quantity, item?.pricing_mode)}</div>
          </div>
        </div>
        <div className="d-flex justify-content-between align-items-center gap-2 pt-3 border-top">
          <span className="num text-muted fs-xs">{formatDateTime(transaction.created_at)}</span>
          <div className="d-flex gap-2">
            <button className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1" onClick={() => onEdit(transaction)}>
              <Icon name="edit" size={13} /> Upraviť
            </button>
            <button className="btn btn-sm btn-outline-danger d-inline-flex align-items-center gap-1" onClick={() => onDelete(transaction)}>
              <Icon name="trash" size={13} /> Vymazať
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
