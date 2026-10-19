import { Avatar, AvatarStack } from '../../components/Avatar'
import { Icon } from '../../components/Icon'
import { formatEuro, formatQuantity } from '../../lib/units'
import {
  bookingTotals, firstName, formatDayLabel, formatTime, groupBookings, transactionColor, transactionIcon,
} from './transactionRules'

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

/** The filtered people who shared one group order: their avatars together, each share editable on its own. */
function GroupTile({ transactions, onEdit, onDelete }) {
  const [first] = transactions
  const totals = bookingTotals(transactions)

  return (
    <div className="tx-tile tx-tile--group">
      <div className="position-relative">
        <AvatarStack persons={transactions.map((transaction) => transaction.person)} size={52} />
        <span className="tx-tile-badge" style={{ color: transactionColor(first) }} title={first.item?.category?.name}>
          <Icon name={transactionIcon(first)} size={12} />
        </span>
      </div>

      <div className="tx-tile-details">
        <div className="num text-muted">{formatTime(first.created_at)}</div>
        <div className="num fw-semibold">{formatQuantity(totals.quantity, first.item?.pricing_mode)}</div>
        <div className="num tone-accent">{formatEuro(totals.price)}</div>
      </div>

      <div className="tx-tile-members">
        {transactions.map((transaction) => (
          <div key={transaction.id} className="tx-tile-member">
            <span className="fw-semibold text-truncate">{firstName(transaction.person)}</span>
            <span className="num tone-accent ms-auto">{formatEuro(transaction.price_at_time)}</span>
            <button
              className="qty-step qty-step--small text-muted"
              onClick={() => onEdit(transaction)}
              aria-label={`Upraviť transakciu ${transaction.person?.name}`}
            >
              <Icon name="edit" size={14} />
            </button>
            <button
              className="qty-step qty-step--small tone-danger"
              onClick={() => onDelete(transaction)}
              aria-label={`Vymazať transakciu ${transaction.person?.name}`}
            >
              <Icon name="trash" size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

/** One day of a person-filtered view, as tiles; a group order of several filtered people shares one tile. */
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
          {groupBookings(transactions).map(({ key, transactions: booked }) => (
            booked.length > 1
              ? <GroupTile key={key} transactions={booked} onEdit={onEdit} onDelete={onDelete} />
              : (
                <TransactionTile
                  key={key}
                  transaction={booked[0]}
                  showName={showNames}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              )
          ))}
        </div>
      </div>
    </div>
  )
}
