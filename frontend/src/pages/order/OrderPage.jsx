import { useMemo, useState } from 'react'
import { api } from '../../api'
import { FlashAlert } from '../../components/FlashAlert'
import { PageHeader } from '../../components/PageHeader'
import { useFlashMessage } from '../../hooks/useFlashMessage'
import { isInCategory } from '../../lib/categories'
import { useDialog } from '../../lib/dialogContext'
import { isMeasured } from '../../lib/units'
import { CategoryStep } from './CategoryStep'
import { CoffeeCheckModal } from './CoffeeCheckModal'
import { DoneStep } from './DoneStep'
import { ItemStep, PendingItemsButton } from './ItemStep'
import { PersonStep } from './PersonStep'
import { QuantityStep } from './QuantityStep'
import { OrderProgress } from './StepSection'
import { useCountdown } from './useCountdown'
import { useItemQuantityPicker } from './useItemQuantityPicker'
import { useOrderData } from './useOrderData'
import { useOrderFlow } from './useOrderFlow'
import { useOrderSubmission } from './useOrderSubmission'
import { DebtWarningModal, StockWarningModal } from './WarningModals'

const NOTICE_DURATION_MS = 3000

/** Kiosk home screen: pick people, a drink and an amount, then add it to their tab. */
export default function OrderPage() {
  const dialog = useDialog()
  const data = useOrderData()
  const notice = useFlashMessage(NOTICE_DURATION_MS)
  const flow = useOrderFlow(data.categories)
  const countdown = useCountdown(() => resetFlow())
  const submission = useOrderSubmission({ flow, data, notice, countdown })
  const picker = useItemQuantityPicker(submission.checkOrder)
  const [isUndoing, setIsUndoing] = useState(false)

  const categoryItems = useMemo(
    () => (flow.selectedCategory ? data.items.filter((item) => isInCategory(item, flow.selectedCategory.key)) : []),
    [data.items, flow.selectedCategory],
  )

  function resetFlow() {
    picker.clearAll()
    flow.reset()
    countdown.stop()
    submission.clearResult()
  }

  const handleItemClick = (item) =>
    item.pricing_mode === 'per_item' ? picker.increment(item) : flow.openQuantityStep(item)

  const leaveItemStep = () => {
    picker.clearAll()
    if (data.categories.length === 1) resetFlow()
    else flow.setStep('category')
  }

  const addAnother = () => {
    countdown.stop()
    flow.setStep(isMeasured(flow.selectedItem?.pricing_mode) ? 'grams' : 'item')
  }

  const undoLastOrder = async () => {
    if (!flow.selectedPerson || isUndoing) return
    setIsUndoing(true)
    try {
      await api.undoTransaction(flow.selectedPerson.id)
      await submission.refreshAfterOrder()
      resetFlow()
    } catch {
      notice.show('Undo sa nepodarilo')
    } finally {
      setIsUndoing(false)
    }
  }

  const addGuest = async () => {
    const name = await dialog.prompt({
      title: 'Pridať hosťa',
      label: 'Meno hosťa',
      placeholder: 'napr. Katka',
      confirmLabel: 'Pridať',
    })
    if (!name) return
    await api.csrf().catch(() => {})
    await api.addPerson({ name, is_guest: true })
    await data.reloadPersons()
    await data.reloadSummary()
  }

  const categoryTitle = flow.isGroupOrder
    ? `Vybraní: ${flow.selectedPersons.length} — čo pijete?`
    : `Ahoj, ${flow.selectedPerson?.name} — čo piješ?`
  const selectedPersonDebt = data.debts[flow.selectedPerson?.id] ?? 0

  return (
    <div className="container py-3">
      <PageHeader title="Drink Counter" icon="logo" onTitleClick={resetFlow} />

      {submission.coffeeCheckItem && (
        <CoffeeCheckModal item={submission.coffeeCheckItem} onClose={submission.closeCoffeeCheck} />
      )}

      <FlashAlert flash={notice} tone="success" className="" />

      {flow.step !== 'person' && (
        <OrderProgress step={flow.step} selectedCategory={flow.selectedCategory} selectedItem={flow.selectedItem} />
      )}

      {flow.step === 'person' && (
        <PersonStep
          homeMembers={data.homeMembers}
          guests={data.guests}
          debts={data.debts}
          isGroupOrder={flow.isGroupOrder}
          selectedPersons={flow.selectedPersons}
          onToggleGroupOrder={flow.toggleGroupOrder}
          onSelect={flow.selectPerson}
          onAddGuest={addGuest}
          onContinue={flow.continueWithGroup}
        />
      )}

      {flow.step === 'category' && (
        <CategoryStep title={categoryTitle} categories={data.categories} onPick={flow.pickCategory} onBack={resetFlow} />
      )}

      {flow.step === 'item' && (
        <>
          {picker.totalCount > 0 && (
            <PendingItemsButton
              count={picker.totalCount}
              disabled={submission.isSubmitting}
              onSubmit={() => picker.submitAll(categoryItems)}
            />
          )}
          <ItemStep
            title={`Vyber ${flow.selectedCategory?.accusative ?? 'kávu'}`}
            items={categoryItems}
            picker={picker}
            isSubmitting={submission.isSubmitting}
            onItemClick={handleItemClick}
            onBack={leaveItemStep}
            onChangePerson={resetFlow}
          />
        </>
      )}

      {flow.step === 'grams' && (
        <QuantityStep
          item={flow.selectedItem}
          isGroupOrder={flow.isGroupOrder}
          groupSize={flow.groupSize}
          customQuantity={flow.customQuantity}
          isSubmitting={submission.isSubmitting}
          onCustomQuantityChange={flow.setCustomQuantity}
          onPick={(quantity) => submission.checkOrder(flow.selectedItem, quantity)}
          onBack={() => flow.setStep('item')}
          onChangePerson={resetFlow}
        />
      )}

      {flow.step === 'done' && !flow.isGroupOrder && (
        <DoneStep
          person={flow.selectedPerson}
          debt={selectedPersonDebt}
          lastOrder={submission.lastOrder}
          funnyMessage={submission.funnyMessage}
          secondsLeft={countdown.secondsLeft}
          isUndoing={isUndoing}
          onAddAnother={addAnother}
          onUndo={undoLastOrder}
          onHome={resetFlow}
        />
      )}

      {submission.stockWarning && (
        <StockWarningModal
          warning={submission.stockWarning}
          onCancel={submission.dismissStockWarning}
          onConfirm={submission.confirmStockWarning}
        />
      )}

      {submission.debtWarning && (
        <DebtWarningModal
          isGroupOrder={flow.isGroupOrder}
          person={flow.selectedPerson}
          debt={selectedPersonDebt}
          onAddAnyway={submission.confirmDebtWarning}
          onClose={submission.dismissDebtWarning}
        />
      )}
    </div>
  )
}
