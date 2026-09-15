import { Icon } from '../../components/Icon'

// The item colour is only a dot: people pick colours as light as white, which would glare as a chip background.
export function CoffeeChip({ coffee, onRemove }) {
  return (
    <span className="coffee-chip">
      <span className="item-dot" style={{ background: coffee.item.color || 'var(--text-dim)' }} />
      {coffee.item.name}
      <span className="num text-muted">{coffee.grams} g</span>
      {onRemove && (
        <button onClick={onRemove} aria-label={`Odobrať ${coffee.item.name}`} className="coffee-chip-remove">
          <Icon name="close" size={12} />
        </button>
      )}
    </span>
  )
}

export function CoffeeChipList({ coffees, onRemove, className = 'mb-4' }) {
  return (
    <div className={`d-flex flex-wrap gap-2 justify-content-center ${className}`}>
      {coffees.map((coffee, index) => (
        <CoffeeChip
          key={`${coffee.item.id}-${index}`}
          coffee={coffee}
          onRemove={onRemove && (() => onRemove(index))}
        />
      ))}
    </div>
  )
}
