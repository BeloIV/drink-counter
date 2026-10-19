import { Avatar, AvatarStack } from '../../components/Avatar'
import { Icon } from '../../components/Icon'
import { formatEuro, formatQuantity } from '../../lib/units'
import { bookingTotals, formatDateTime, transactionColor, transactionIcon } from './transactionRules'

const ENTER_STAGGER_SECONDS = 0.03
const MAX_STAGGERED_CARDS = 10

function GroupMemberRow({ transaction, onEdit, onDelete }) {
  const { person, item } = transaction

  return (
    <div className="tx-group-row">
      <Avatar person={person} size={32} />
      <div className="flex-grow-1 min-w-0">
        <div className="fw-semibold text-truncate">{person.name}</div>
        <div className="d-flex align-items-center gap-2 num text-muted fs-xs">
          {formatQuantity(transaction.quantity, item?.pricing_mode)}
          {transaction.paid && <span className="badge badge-tone-ok">zaplatené</span>}
        </div>
      </div>
      <span className="num fw-semibold tone-accent">{formatEuro(transaction.price_at_time)}</span>
      <button
        className="qty-step qty-step--small text-muted"
        onClick={() => onEdit(transaction)}
        aria-label={`Upraviť transakciu ${person.name}`}
      >
        <Icon name="edit" size={14} />
      </button>
      <button
        className="qty-step qty-step--small tone-danger"
        onClick={() => onDelete(transaction)}
        aria-label={`Vymazať transakciu ${person.name}`}
      >
        <Icon name="trash" size={14} />
      </button>
    </div>
  )
}

/** One group order: the shared item and totals on top, each person's share below it. */
export function GroupTransactionCard({ transactions, index, onEdit, onDelete }) {
  const [first] = transactions
  const { item } = first
  const totals = bookingTotals(transactions)
  const staggerIndex = Math.min(index, MAX_STAGGERED_CARDS)

  return (
    <div className="card item-card-enter" style={{ animationDelay: `${staggerIndex * ENTER_STAGGER_SECONDS}s` }}>
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-start gap-3 mb-2">
          <div className="d-flex align-items-center gap-3 min-w-0">
            <AvatarStack persons={transactions.map((transaction) => transaction.person)} size={42} />
            <div className="min-w-0">
              <div className="fw-semibold">Spolu pre {transactions.length} ľudí</div>
              <div className="d-flex align-items-center gap-1 text-muted fs-sm">
                <span style={{ color: transactionColor(first) }}>
                  <Icon name={transactionIcon(first)} size={13} />
                </span>
                {item.name}
              </div>
            </div>
          </div>
          <div className="text-end">
            <div className="num fw-bold fs-md tone-accent">{formatEuro(totals.price)}</div>
            <div className="num text-muted fs-xs">{formatQuantity(totals.quantity, item?.pricing_mode)}</div>
          </div>
        </div>

        {transactions.map((transaction) => (
          <GroupMemberRow key={transaction.id} transaction={transaction} onEdit={onEdit} onDelete={onDelete} />
        ))}

        <div className="pt-3 border-top">
          <span className="num text-muted fs-xs">{formatDateTime(first.created_at)}</span>
        </div>
      </div>
    </div>
  )
}
