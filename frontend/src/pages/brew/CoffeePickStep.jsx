import { EmptyState } from '../../components/EmptyState'
import { Icon } from '../../components/Icon'
import { SkeletonGrid } from '../../components/Skeleton'
import { contrastText } from '../../lib/color'
import { LOW_STOCK_GRAMS } from './brewRules'
import { CoffeeChipList } from './CoffeeChip'

const ENTER_STAGGER_SECONDS = 0.05

function CoffeeCard({ item, index, onPick }) {
  const isLowStock = Number(item.stock_quantity) < LOW_STOCK_GRAMS
  const colorStyle = item.color ? { background: item.color, color: contrastText(item.color) } : {}

  return (
    <button
      className={`choice choice-enter${item.color ? ' choice--tinted' : ''}`}
      onClick={() => onPick(item)}
      style={{ animationDelay: `${index * ENTER_STAGGER_SECONDS}s`, ...colorStyle }}
    >
      <div className="fw-bold">{item.name}</div>
      <div className="num dim fs-sm">{Number(item.price).toFixed(3)} €/g</div>
      {item.stock_quantity !== null && (
        <div className={`d-flex align-items-center gap-1 mt-1 fs-xs ${isLowStock ? 'stock-low' : 'dim'}`}>
          <Icon name="stock" size={13} />
          <span className="num">{Number(item.stock_quantity).toFixed(0)} g</span>
        </div>
      )}
    </button>
  )
}

function CoffeeGrid({ coffees, isLoading, onPick }) {
  if (isLoading) return <SkeletonGrid count={6} />
  if (coffees.length === 0) {
    return (
      <EmptyState
        icon="coffee"
        title="Žiadne kávy na varenie"
        text="Cold brew potrebuje aspoň jednu aktívnu kávu účtovanú po gramoch. Pridaj ju v Admine."
      />
    )
  }
  return (
    <div className="grid-choices">
      {coffees.map((item, index) => <CoffeeCard key={item.id} item={item} index={index} onPick={onPick} />)}
    </div>
  )
}

export function CoffeePickStep({ availableCoffees, recipeCoffees, isLoading, onPick, onRemove }) {
  return (
    <div className="step-zoom-in">
      <h2 className="text-center mb-3 fs-lg">
        {recipeCoffees.length === 0 ? 'Vyber kávu' : 'Vyber ďalšiu kávu'}
      </h2>
      {recipeCoffees.length > 0 && <CoffeeChipList coffees={recipeCoffees} onRemove={onRemove} />}
      <CoffeeGrid coffees={availableCoffees} isLoading={isLoading} onPick={onPick} />
    </div>
  )
}
