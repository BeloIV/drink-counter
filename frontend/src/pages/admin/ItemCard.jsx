import { Icon } from '../../components/Icon'
import { isBrewableCoffee } from '../../lib/categories'
import { formatQuantity, formatUnitPrice, hasTrackedStock } from '../../lib/units'
import { hasColdBrewVersion, stockToneClass } from './adminRules'
import { ItemEditForm } from './ItemEditForm'

const ENTER_STAGGER_SECONDS = 0.05

function WideButton({ icon, onClick, children }) {
  return (
    <div className="mt-2">
      <button
        className="btn btn-sm btn-outline-secondary w-100 d-inline-flex align-items-center justify-content-center gap-2"
        onClick={onClick}
      >
        <Icon name={icon} size={13} />
        {children}
      </button>
    </div>
  )
}

function ItemHeading({ item }) {
  return (
    <div className="d-flex justify-content-between align-items-center mb-2">
      <div className="d-flex align-items-center gap-2 flex-wrap">
        <span className="item-dot" style={{ background: item.color || 'var(--text-dim)' }} />
        <span className="fw-semibold">{item.name}</span>
        <span className="badge badge-tone-neutral">{item.category?.name ?? '—'}</span>
        <span className={`badge ${item.active ? 'badge-tone-ok' : 'badge-tone-warn'}`}>
          {item.active ? 'aktívne' : 'skryté'}
        </span>
      </div>
      <div className="text-end ms-2 flex-shrink-0">
        <span className="num fw-bold tone-accent">{formatUnitPrice(item)}</span>
      </div>
    </div>
  )
}

function StockLine({ item }) {
  return (
    <div className="d-flex align-items-center gap-2 mt-2 mb-1 px-1">
      <span className="text-muted d-flex align-items-center gap-1 fs-sm">
        <Icon name="stock" size={13} /> Zostatok
      </span>
      <span className={`num fw-bold ${stockToneClass(item)}`}>
        {formatQuantity(item.stock_quantity, item.pricing_mode, 1)}
      </span>
      {Number(item.stock_quantity) <= 0 && <span className="badge ms-1 badge-tone-danger">vyčerpané</span>}
    </div>
  )
}

function ItemButtons({ item, actions }) {
  const buttonClass = 'btn btn-sm flex-fill d-inline-flex align-items-center justify-content-center gap-1'

  return (
    <div className="d-flex gap-2 pt-3 border-top">
      <button className={`${buttonClass} btn-outline-secondary`} onClick={() => actions.startEdit(item)}>
        <Icon name="edit" size={13} /> Upraviť
      </button>
      <button className="btn btn-sm btn-outline-secondary flex-fill" onClick={() => actions.toggleActive(item)}>
        {item.active ? 'Skryť' : 'Zobraziť'}
      </button>
      <button className={`${buttonClass} btn-outline-danger`} onClick={() => actions.remove(item)}>
        <Icon name="trash" size={13} /> Zmazať
      </button>
    </div>
  )
}

function ItemDetails({ item, allItems, actions }) {
  const hasStockLeft = hasTrackedStock(item) && Number(item.stock_quantity) > 0

  return (
    <>
      <ItemHeading item={item} />
      {hasTrackedStock(item) && <StockLine item={item} />}
      <ItemButtons item={item} actions={actions} />
      {hasStockLeft && (
        <WideButton icon="scales" onClick={() => actions.openSettle(item)}>
          Rozrátať zostatok <span className="num">{formatQuantity(item.stock_quantity, item.pricing_mode, 1)}</span>
        </WideButton>
      )}
      {isBrewableCoffee(item) && !hasColdBrewVersion(item, allItems) && (
        <WideButton icon="coldBrew" onClick={() => actions.draftColdBrew(item)}>Pridať ako Cold Brew</WideButton>
      )}
    </>
  )
}

export function ItemCard({ item, index, allItems, categories, actions }) {
  const isDeleting = actions.deletingId === item.id
  const className = [
    'card item-row',
    !item.active && 'border-warning item-row--hidden',
    isDeleting ? 'item-card-exit' : 'item-card-enter',
    actions.savedId === item.id && 'item-card-flash',
  ].filter(Boolean).join(' ')

  return (
    <div className={className} style={{ animationDelay: isDeleting ? '0s' : `${index * ENTER_STAGGER_SECONDS}s` }}>
      <div className="card-body p-2 px-3">
        {actions.editingId === item.id ? (
          <ItemEditForm
            item={item}
            categories={categories}
            onSave={(form) => actions.saveEdit(item, form)}
            onCancel={actions.cancelEdit}
          />
        ) : (
          <ItemDetails item={item} allItems={allItems} actions={actions} />
        )}
      </div>
    </div>
  )
}
