import { Icon } from '../../components/Icon'
import { contrastText } from '../../lib/color'
import { formatEuro, formatQuantity, formatUnitPrice, hasTrackedStock } from '../../lib/units'
import { QUANTITY_SUBMIT_DELAY_MS, isLowStock } from './orderRules'
import { StepNavigation, StepSection } from './StepSection'

const ENTER_STAGGER_SECONDS = 0.06

// The item colour fills the whole card, so the text colour is computed to stay readable on it.
const cardColorStyle = (item) => (item.color ? { background: item.color, color: contrastText(item.color) } : {})

function QuantityCounter({ item, quantity, version, onIncrement, onDecrement }) {
  // The steppers sit inside the card button; without stopPropagation a tap would also count as a card tap.
  const onStep = (action) => (event) => {
    event.stopPropagation()
    action(item)
  }

  return (
    <>
      <div className="fw-semibold dim fs-sm">{item.name}</div>
      <div className="d-flex align-items-center gap-2">
        <button className="qty-step" onClick={onStep(onDecrement)} aria-label="Odobrať">
          <Icon name="minus" size={16} />
        </button>
        <span className="qty-value">{quantity}</span>
        <button className="qty-step" onClick={onStep(onIncrement)} aria-label="Pridať">
          <Icon name="plus" size={16} />
        </button>
      </div>
      <div className="num dim fs-xs">{formatEuro(Number(item.price) * quantity)}</div>
      <div className="countdown-bar" style={{ width: '70%' }}>
        <div key={version} className="countdown-bar-fill" style={{ animationDuration: `${QUANTITY_SUBMIT_DELAY_MS}ms` }} />
      </div>
    </>
  )
}

function ItemSummary({ item }) {
  return (
    <>
      <div className="fw-bold">{item.name}</div>
      <div className="num dim fs-sm">{formatUnitPrice(item)}</div>
      {hasTrackedStock(item) && (
        <div className={`d-flex align-items-center gap-1 mt-1 fs-xs ${isLowStock(item) ? 'stock-low' : 'dim'}`}>
          <Icon name="stock" size={13} />
          <span className="num">{formatQuantity(item.stock_quantity, item.pricing_mode)}</span>
        </div>
      )}
    </>
  )
}

function ItemCard({ item, index, quantity, version, disabled, onClick, onIncrement, onDecrement }) {
  return (
    <button
      className={`choice choice-enter${item.color ? ' choice--tinted' : ''}`}
      disabled={disabled}
      onClick={() => onClick(item)}
      style={{ animationDelay: `${index * ENTER_STAGGER_SECONDS}s`, ...cardColorStyle(item) }}
    >
      {quantity ? (
        <QuantityCounter
          item={item}
          quantity={quantity}
          version={version}
          onIncrement={onIncrement}
          onDecrement={onDecrement}
        />
      ) : (
        <ItemSummary item={item} />
      )}
    </button>
  )
}

export function ItemStep({ title, items, picker, isSubmitting, onItemClick, onBack, onChangePerson }) {
  return (
    <StepSection title={title}>
      <div className="grid-choices">
        {items.map((item, index) => (
          <ItemCard
            key={item.id}
            item={item}
            index={index}
            quantity={picker.quantities[item.id]}
            version={picker.versions[item.id]}
            disabled={isSubmitting}
            onClick={onItemClick}
            onIncrement={picker.increment}
            onDecrement={picker.decrement}
          />
        ))}
      </div>
      <StepNavigation onBack={onBack} onChangePerson={onChangePerson} />
    </StepSection>
  )
}

export function PendingItemsButton({ count, disabled, onSubmit }) {
  return (
    <div className="fixed-bottom-button">
      <button className="btn btn-primary btn-lg d-flex align-items-center gap-2" onClick={onSubmit} disabled={disabled}>
        <Icon name="check" size={18} />
        Pridať <span className="num">{count} ks</span>
      </button>
    </div>
  )
}
