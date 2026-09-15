import { EmptyState } from '../../components/EmptyState'
import { ItemCard } from './ItemCard'
import { ActivateItemModal, ColdBrewDraftModal, SettleModal } from './ItemModals'
import { useItemActions } from './useItemActions'

function ItemActionModals({ actions, persons, notify }) {
  return (
    <>
      {actions.activatingItem && (
        <ActivateItemModal
          item={actions.activatingItem}
          onActivate={actions.activate}
          onInvalidQuantity={() => notify('Zadaj platné množstvo')}
          onClose={actions.closeActivation}
        />
      )}
      {actions.settlingItem && (
        <SettleModal
          item={actions.settlingItem}
          persons={persons}
          isSettling={actions.isSettling}
          onConfirm={actions.settle}
          onClose={actions.closeSettle}
        />
      )}
      {actions.coldBrewDraft && (
        <ColdBrewDraftModal
          draft={actions.coldBrewDraft}
          isCreating={actions.isCreatingColdBrew}
          onConfirm={actions.createColdBrew}
          onClose={actions.closeColdBrewDraft}
        />
      )}
    </>
  )
}

export function ItemList({ items, data, notify }) {
  const actions = useItemActions({ data, notify })

  return (
    <div className="card p-3">
      <h2 className="mb-3 fs-md">Položky</h2>
      <div className="d-flex flex-column gap-2">
        {items.map((item, index) => (
          <ItemCard
            key={item.id}
            item={item}
            index={index}
            allItems={data.items}
            categories={data.categories}
            actions={actions}
          />
        ))}
        {items.length === 0 && (
          <EmptyState
            icon="stock"
            title="Žiadne položky"
            text="Pre zvolený filter tu nič nie je. Skús iný filter alebo pridaj novú položku."
          />
        )}
      </div>
      <ItemActionModals actions={actions} persons={data.persons} notify={notify} />
    </div>
  )
}
