import { formatEuro, unitOf } from '../../lib/units'
import { QUANTITY_PRESETS } from './orderRules'
import { StepNavigation, StepSection } from './StepSection'

const ENTER_STAGGER_SECONDS = 0.05

function quantityTitle(item, isGroupOrder, groupSize) {
  if (item.pricing_mode === 'per_ml') {
    return `Koľko ml cold brew?${isGroupOrder ? ' (každý dostane toľko)' : ''}`
  }
  const sharing = groupSize > 1 ? ` (rozdelí sa medzi ${groupSize} ľudí)` : ''
  return `Koľko gramov kávy?${sharing}`
}

function PresetCard({ item, amount, groupSize, index, disabled, onPick }) {
  // Coffee grams are shared by the group; cold brew is poured for each person.
  const isShared = item.pricing_mode === 'per_gram' && groupSize > 1
  const perPersonAmount = isShared ? amount / groupSize : amount

  return (
    <button
      className="choice choice-enter"
      onClick={() => onPick(amount)}
      disabled={disabled}
      style={{ animationDelay: `${index * ENTER_STAGGER_SECONDS}s` }}
    >
      <span className="num fs-xl fw-bold">{amount} {unitOf(item.pricing_mode)}</span>
      {isShared && <div className="num text-muted fs-xs">{perPersonAmount.toFixed(1)} g na osobu</div>}
      <div className="num text-muted fs-xs">≈ {formatEuro(Number(item.price) * perPersonAmount)} na osobu</div>
    </button>
  )
}

function CustomQuantityCard({ item, value, disabled, onChange, onSubmit }) {
  return (
    <div className="choice choice-enter" style={{ animationDelay: '0.25s' }}>
      <div className="mb-2">Vlastné</div>
      <div className="input-group">
        <input
          className="form-control"
          inputMode="decimal"
          aria-label={item.pricing_mode === 'per_ml' ? 'Vlastný počet ml' : 'Vlastná gramáž'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <button className="btn btn-primary" onClick={() => onSubmit(value)} disabled={disabled}>OK</button>
      </div>
      <div className="num text-muted mt-2 fs-xs">
        {formatEuro(Number(item.price || 0) * Number(value || 0))}
      </div>
    </div>
  )
}

export function QuantityStep({
  item, isGroupOrder, groupSize, customQuantity, isSubmitting,
  onCustomQuantityChange, onPick, onBack, onChangePerson,
}) {
  return (
    <StepSection title={quantityTitle(item, isGroupOrder, groupSize)}>
      <div className="grid-choices">
        {QUANTITY_PRESETS[item.pricing_mode].map((amount, index) => (
          <PresetCard
            key={amount}
            item={item}
            amount={amount}
            groupSize={groupSize}
            index={index}
            disabled={isSubmitting}
            onPick={onPick}
          />
        ))}
        <CustomQuantityCard
          item={item}
          value={customQuantity}
          disabled={isSubmitting}
          onChange={onCustomQuantityChange}
          onSubmit={onPick}
        />
      </div>
      <StepNavigation onBack={onBack} onChangePerson={onChangePerson} />
    </StepSection>
  )
}
