import { Icon } from '../../components/Icon'
import { contrastText } from '../../lib/color'
import { isBrewableCoffee } from '../../lib/categories'
import { formatQuantity, formatUnitPrice, hasTrackedStock } from '../../lib/units'
import { hasColdBrewVersion, stockToneClass } from './adminRules'
import { ItemEditForm } from './ItemEditForm'

const ENTER_STAGGER_SECONDS = 0.05
const LAST_USED_FORMAT = { day: 'numeric', month: 'numeric' }

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

// Same fill as the order tiles, so an item looks alike on the kiosk and here.
const bandColorStyle = (item) => (item.color ? { background: item.color, color: contrastText(item.color) } : {})

function UsageChips({ item }) {
  return (
    <>
      {item.restock_count > 0 && (
        <span className="item-chip" title="Koľkokrát bola položka naskladnená">
          <Icon name="stock" size={11} /> <span className="num">{item.restock_count}×</span>
        </span>
      )}
      {item.last_used_at && (
        <span className="item-chip" title="Naposledy objednané">
          <Icon name="calendar" size={11} />
          <span className="num">{new Date(item.last_used_at).toLocaleDateString('sk-SK', LAST_USED_FORMAT)}</span>
        </span>
      )}
    </>
  )
}

function ItemBand({ item }) {
  return (
    <div className={`item-band${item.color ? ' item-band--tinted' : ''}`} style={bandColorStyle(item)}>
      <div className="d-flex align-items-start justify-content-between gap-2">
        <span className="item-band-name">{item.name}</span>
        <span className="num item-band-price">{formatUnitPrice(item)}</span>
      </div>
      <div className="d-flex align-items-center gap-1 flex-wrap mt-1">
        <span className="item-chip">{item.category?.name ?? '—'}</span>
        <span className={`item-chip ${item.active ? '' : 'item-chip--hidden'}`}>
          <Icon name={item.active ? 'check' : 'close'} size={11} />
          {item.active ? 'aktívne' : 'skryté'}
        </span>
        <UsageChips item={item} />
      </div>
    </div>
  )
}

function StockLine({ item }) {
  return (
    <div className="d-flex align-items-center gap-2 mb-3">
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
    <div className="d-flex gap-2">
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
    !item.active && 'item-row--hidden',
    isDeleting ? 'item-card-exit' : 'item-card-enter',
    actions.savedId === item.id && 'item-card-flash',
  ].filter(Boolean).join(' ')

  return (
    <div className={className} style={{ animationDelay: isDeleting ? '0s' : `${index * ENTER_STAGGER_SECONDS}s` }}>
      <ItemBand item={item} />
      <div className="card-body p-3">
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
