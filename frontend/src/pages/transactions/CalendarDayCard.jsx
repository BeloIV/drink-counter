import { Avatar } from '../../components/Avatar'
import { Icon } from '../../components/Icon'
import { formatEuro, formatQuantity } from '../../lib/units'
import { firstName, formatDayLabel, formatTime, transactionColor, transactionIcon } from './transactionRules'

function TransactionTile({ transaction, showName, onEdit, onDelete }) {
  const { person } = transaction

  return (
    <div className="tx-tile">
      <div className="position-relative">
        <Avatar person={person} size={52} />
        <span
          className="tx-tile-badge"
          style={{ color: transactionColor(transaction) }}
          title={transaction.item?.category?.name}
        >
          <Icon name={transactionIcon(transaction)} size={12} />
        </span>
      </div>

      <div className="tx-tile-details">
        {showName && <div className="fw-bold">{firstName(person)}</div>}
        <div className="num text-muted">{formatTime(transaction.created_at)}</div>
        <div className="num fw-semibold">{formatQuantity(transaction.quantity, transaction.item?.pricing_mode)}</div>
        <div className="num tone-accent">{formatEuro(transaction.price_at_time)}</div>
      </div>

      <div className="d-flex gap-1 mt-2">
        <button
          className="qty-step qty-step--small text-muted"
          onClick={() => onEdit(transaction)}
          aria-label={`Upraviť transakciu ${person?.name}`}
        >
          <Icon name="edit" size={14} />
        </button>
        <button
          className="qty-step qty-step--small tone-danger"
          onClick={() => onDelete(transaction)}
          aria-label={`Vymazať transakciu ${person?.name}`}
        >
          <Icon name="trash" size={14} />
        </button>
      </div>
    </div>
  )
}

/** One day of a person-filtered view, as tiles. */
export function CalendarDayCard({ dateKey, transactions, onEdit, onDelete }) {
  const dayTotal = transactions.reduce((sum, transaction) => sum + Number(transaction.price_at_time), 0)
  // Names only help when the day mixes several people.
  const showNames = new Set(transactions.map((transaction) => transaction.person?.id)).size > 1

  return (
    <div className="card mb-3 item-card-enter">
      <div className="card-header d-flex justify-content-between align-items-center gap-2 py-2 px-3">
        <span className="fw-semibold fs-sm text-capitalize">{formatDayLabel(dateKey)}</span>
        <span className="num fw-bold text-nowrap tone-accent">{formatEuro(dayTotal)}</span>
      </div>
      <div className="card-body py-3 px-3">
        <div className="d-flex flex-wrap gap-3">
          {transactions.map((transaction) => (
            <TransactionTile
              key={transaction.id}
              transaction={transaction}
              showName={showNames}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
