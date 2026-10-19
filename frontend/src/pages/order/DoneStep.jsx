import { Avatar } from '../../components/Avatar'
import { Icon } from '../../components/Icon'
import { formatEuro, formatQuantity, isMeasured } from '../../lib/units'
import { DONE_COUNTDOWN_SECONDS } from './orderRules'
import { StepSection } from './StepSection'

const STOCK_CHECK_NOTES = {
  saved: { text: 'Kontrola zásoby zapísaná', className: 'done-note--ok' },
  skipped: { text: 'Kontrola zásoby preskočená', className: '' },
}

function BookingSummary({ booking }) {
  const { item, transactions } = booking
  const quantity = transactions.reduce((sum, transaction) => sum + Number(transaction.quantity), 0)
  const price = transactions.reduce((sum, transaction) => sum + Number(transaction.price_at_time), 0)
  const showQuantity =
    isMeasured(item?.pricing_mode) || (item?.pricing_mode === 'per_item' && quantity > transactions.length)

  return (
    <div className="mt-3 text-muted fs-sm">
      {item?.name}
      {showQuantity && <> · <span className="num">{formatQuantity(quantity, item.pricing_mode)}</span></>}
      {transactions.length > 1 && <> spolu</>}
      {' · '}
      <span className="num fw-bold tone-accent">+{formatEuro(price)}</span>
    </div>
  )
}

function SingleDebt({ person, debt }) {
  return (
    <>
      <div className="text-muted mt-2">Aktuálny dlh pre</div>
      <div className="fw-bold mb-2 fs-lg">{person?.name}</div>
      <div className="num fw-bold fs-3xl lh-1">{formatEuro(debt)}</div>
    </>
  )
}

/** Everyone in a group order: what they were charged now and what they owe in total. */
function GroupDebts({ people }) {
  return (
    <>
      <div className="text-muted mt-2 mb-2">Aktuálne dlhy</div>
      <div className="text-start">
        {people.map(({ person, debt, transaction }) => (
          <div key={transaction.id} className="done-debt-row">
            <Avatar person={person} size={40} />
            <div className="flex-grow-1 min-w-0">
              <div className="fw-semibold text-truncate">{person.name}</div>
              <div className="num tone-accent fs-xs">+{formatEuro(transaction.price_at_time)}</div>
            </div>
            <div className="num fw-bold fs-lg">{formatEuro(debt)}</div>
          </div>
        ))}
      </div>
    </>
  )
}

function FunnyMessage({ message }) {
  return (
    <div className="funny-msg mt-3">
      <div className="funny-msg-emoji">{message.emoji}</div>
      <div className="funny-msg-text">{message.text}</div>
    </div>
  )
}

function StockCheckNote({ outcome }) {
  const note = STOCK_CHECK_NOTES[outcome]
  return (
    <div className={`done-note mt-3 ${note.className}`}>
      <Icon name="scales" size={15} /> {note.text}
    </div>
  )
}

/** The countdown starts only after a pending stock check, so the bar appears with it. */
function Countdown({ secondsLeft }) {
  if (secondsLeft === null) return null
  return (
    <>
      <div className="countdown-bar mt-4">
        <div className="countdown-bar-fill" style={{ animationDuration: `${DONE_COUNTDOWN_SECONDS}s` }} />
      </div>
      <div className="text-muted mt-2 fs-xs">
        Auto-reset za <span className="num">{secondsLeft}</span> s
      </div>
    </>
  )
}

export function DoneStep({
  people, booking, funnyMessage, stockCheckOutcome, secondsLeft, isUndoing, onAddAnother, onUndo, onHome,
}) {
  const [single] = people

  return (
    <StepSection title="Hotovo">
      <div className="card p-4 text-center pop-in">
        <div className="done-check"><Icon name="check" size={56} /></div>
        {people.length > 1 ? <GroupDebts people={people} /> : <SingleDebt person={single?.person} debt={single?.debt} />}
        {booking && <BookingSummary booking={booking} />}
        {stockCheckOutcome && <StockCheckNote outcome={stockCheckOutcome} />}
        {funnyMessage && <FunnyMessage message={funnyMessage} />}
        <Countdown secondsLeft={secondsLeft} />
      </div>

      <div className="mt-4 d-flex flex-wrap gap-2 justify-content-center">
        <button className="btn btn-primary" onClick={onAddAnother}>Pridať ďalší</button>
        <button
          className="btn btn-outline-secondary d-inline-flex align-items-center gap-2"
          onClick={onUndo}
          disabled={isUndoing}
        >
          <Icon name="undo" size={16} />
          {isUndoing ? 'Ruším…' : 'Vrátiť späť'}
        </button>
        <button className="btn btn-outline-secondary" onClick={onHome}>Domov</button>
      </div>
    </StepSection>
  )
}
