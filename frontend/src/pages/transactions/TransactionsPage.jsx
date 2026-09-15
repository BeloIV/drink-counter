import { useEffect, useState } from 'react'
import { api } from '../../api'
import { EmptyState } from '../../components/EmptyState'
import { FlashAlert } from '../../components/FlashAlert'
import { PageHeader } from '../../components/PageHeader'
import { PinLoginModal } from '../../components/PinLogin'
import { SkeletonRows } from '../../components/Skeleton'
import { useFlashMessage } from '../../hooks/useFlashMessage'
import { useDialog } from '../../lib/dialogContext'
import { fieldErrorSummary } from '../../lib/errors'
import { withDecimalPoint } from '../../lib/numbers'
import { formatEuro } from '../../lib/units'
import { CalendarDayCard } from './CalendarDayCard'
import { EditTransactionModal } from './EditTransactionModal'
import { PersonFilter } from './PersonFilter'
import { TransactionCard } from './TransactionCard'
import { groupByDay } from './transactionRules'
import { useTransactions } from './useTransactions'

const ERROR_DURATION_MS = 5000
const DELETE_ERROR_DURATION_MS = 4000
const EDIT_ERROR_DURATION_MS = 6000

function ListSummary({ list, persons }) {
  if (!list.isFiltered) {
    return (
      <>Zobrazených <span className="num">{list.transactions.length}</span> z <span className="num">{list.totalCount}</span></>
    )
  }
  const who = list.selectedIds.length === 1
    ? persons.find((person) => person.id === list.selectedIds[0])?.name
    : `${list.selectedIds.length} osoby`
  return <>{who} — <span className="num">{list.totalCount}</span> transakcií</>
}

function CalendarView({ list, onEdit, onDelete }) {
  const days = groupByDay(list.transactions)
  if (days.length === 0) {
    return (
      <EmptyState
        icon="calendar"
        title="Žiadne transakcie"
        text="Pre vybrané osoby zatiaľ nič nie je zaznamenané."
        action={<button className="btn btn-outline-secondary mt-3" onClick={list.clearFilter}>Zrušiť filter</button>}
      />
    )
  }
  return days.map(([dateKey, transactions]) => (
    <CalendarDayCard key={dateKey} dateKey={dateKey} transactions={transactions} onEdit={onEdit} onDelete={onDelete} />
  ))
}

function ListView({ list, onEdit, onDelete }) {
  if (list.transactions.length === 0) {
    return (
      <EmptyState
        icon="receipt"
        title="Zatiaľ žiadne transakcie"
        text="Keď si niekto naúčtuje pivo alebo kávu, objaví sa to tu."
      />
    )
  }
  return (
    <>
      <div className="d-flex flex-column gap-3">
        {list.transactions.map((transaction, index) => (
          <TransactionCard key={transaction.id} transaction={transaction} index={index} onEdit={onEdit} onDelete={onDelete} />
        ))}
      </div>
      {list.hasMore && (
        <div className="text-center mt-4">
          <button className="btn btn-outline-secondary btn-lg w-100" onClick={list.loadMore} disabled={list.isLoading}>
            {list.isLoading ? 'Načítavam…' : 'Načítať ďalšie'}
          </button>
        </div>
      )}
    </>
  )
}

export default function TransactionsPage() {
  const dialog = useDialog()
  const flash = useFlashMessage(ERROR_DURATION_MS)
  const list = useTransactions(flash.show)
  const [persons, setPersons] = useState([])
  const [editingId, setEditingId] = useState(null)
  // Editing and deleting need an admin session; a refused action is retried after PIN login.
  const [retryAfterLogin, setRetryAfterLogin] = useState(null)

  useEffect(() => {
    api.csrf().catch(() => {})
    api.persons().then(setPersons).catch(() => {})
  }, [])

  const requireLogin = (retry) => setRetryAfterLogin(() => retry)

  const deleteTransaction = async (transaction) => {
    const confirmed = await dialog.confirm({
      title: 'Vymazať transakciu?',
      text: `${transaction.person.name} — ${transaction.item.name}, ${formatEuro(transaction.price_at_time)}. Túto akciu nie je možné vrátiť späť.`,
      confirmLabel: 'Vymazať',
      tone: 'danger',
    })
    if (!confirmed) return
    try {
      await api.csrf().catch(() => {})
      await api.deleteTransaction(transaction.id)
      list.removeLocally(transaction.id)
    } catch (error) {
      if (error.status === 403) requireLogin(() => deleteTransaction(transaction))
      else flash.show('Transakciu sa nepodarilo vymazať.', DELETE_ERROR_DURATION_MS)
    }
  }

  const saveTransaction = async (transaction, form) => {
    try {
      await api.csrf().catch(() => {})
      const updated = await api.updateTransaction(transaction.id, {
        quantity: withDecimalPoint(form.quantity),
        price_at_time: withDecimalPoint(form.price_at_time),
      })
      list.replaceLocally(updated)
      setEditingId(null)
    } catch (error) {
      if (error.status === 403) requireLogin(() => saveTransaction(transaction, form))
      else flash.show(fieldErrorSummary(error) ?? 'Transakciu sa nepodarilo upraviť.', EDIT_ERROR_DURATION_MS)
    }
  }

  const loginAndRetry = async (pin) => {
    await api.csrf()
    await api.login(pin)
    const retry = retryAfterLogin
    setRetryAfterLogin(null)
    retry()
  }

  const editingTransaction = list.transactions.find((transaction) => transaction.id === editingId)
  const startEdit = (transaction) => setEditingId(transaction.id)
  const View = list.isFiltered ? CalendarView : ListView

  return (
    <div className="container py-3">
      <PageHeader title="Transakcie" icon="transactions" />

      {editingTransaction && (
        <EditTransactionModal
          transaction={editingTransaction}
          onSave={(form) => saveTransaction(editingTransaction, form)}
          onClose={() => setEditingId(null)}
        />
      )}

      {retryAfterLogin && (
        <PinLoginModal
          subtitle="Úprava a mazanie transakcií vyžaduje PIN."
          onLogin={loginAndRetry}
          onCancel={() => setRetryAfterLogin(null)}
        />
      )}

      <FlashAlert flash={flash} tone="danger" role="alert" />

      {persons.length > 0 && (
        <PersonFilter
          persons={persons}
          selectedIds={list.selectedIds}
          onToggle={list.togglePerson}
          onClear={list.clearFilter}
        />
      )}

      <div className="mb-3 text-muted fs-sm">
        <ListSummary list={list} persons={persons} />
      </div>

      {list.isFirstPageLoading
        ? <SkeletonRows count={6} height={92} />
        : <View list={list} onEdit={startEdit} onDelete={deleteTransaction} />}
    </div>
  )
}
