import { Icon } from '../../components/Icon'
import { formatEuro, formatQuantity, isMeasured } from '../../lib/units'
import { DONE_COUNTDOWN_SECONDS } from './orderRules'
import { StepSection } from './StepSection'

function LastOrderSummary({ order }) {
  const { item } = order
  const showQuantity =
    isMeasured(item?.pricing_mode) || (item?.pricing_mode === 'per_item' && Number(order.quantity) > 1)

  return (
    <div className="mt-3 text-muted fs-sm">
      {item?.name}
      {showQuantity && <> · <span className="num">{formatQuantity(order.quantity, item.pricing_mode)}</span></>}
      {' · '}
      <span className="num fw-bold tone-accent">+{formatEuro(order.price_at_time)}</span>
    </div>
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

export function DoneStep({ person, debt, lastOrder, funnyMessage, secondsLeft, isUndoing, onAddAnother, onUndo, onHome }) {
  return (
    <StepSection title="Hotovo">
      <div className="card p-4 text-center pop-in">
        <div className="done-check"><Icon name="check" size={56} /></div>
        <div className="text-muted mt-2">Aktuálny dlh pre</div>
        <div className="fw-bold mb-2 fs-lg">{person?.name}</div>
        <div className="num fw-bold fs-3xl lh-1">{formatEuro(debt)}</div>
        {lastOrder && <LastOrderSummary order={lastOrder} />}
        {funnyMessage && <FunnyMessage message={funnyMessage} />}
        <div className="countdown-bar mt-4">
          <div className="countdown-bar-fill" style={{ animationDuration: `${DONE_COUNTDOWN_SECONDS}s` }} />
        </div>
        <div className="text-muted mt-2 fs-xs">
          Auto-reset za <span className="num">{secondsLeft}</span> s
        </div>
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
