import { useEffect, useState } from "react"
import { api } from "../api"
import { PageHeader } from "../components/PageHeader"
import { Modal } from "../components/Modal"
import { Icon } from "../components/Icon"
import { Avatar } from "../components/Avatar"
import { EmptyState } from "../components/EmptyState"
import { SkeletonRows } from "../components/Skeleton"

// ── helpers ──────────────────────────────────────────────────────────────────
function toggleSign(value) {
  const str = String(value ?? '')
  return str.startsWith('-') ? str.slice(1) : `-${str}`
}

function groupByDay(transactions) {
  const groups = {}
  for (const tx of transactions) {
    const d = new Date(tx.created_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    if (!groups[key]) groups[key] = []
    groups[key].push(tx)
  }
  return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]))
}

function formatDayLabel(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString('sk-SK', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' })
}

function qtyLabel(tx) {
  if (tx.item?.pricing_mode === 'per_gram') return `${Number(tx.quantity).toFixed(0)} g`
  if (tx.item?.pricing_mode === 'per_ml') return `${Number(tx.quantity).toFixed(0)} ml`
  return `${Number(tx.quantity).toFixed(0)} ks`
}

const CATEGORY_META = {
  coffee: { icon: 'coffee', color: 'var(--coffee-color)' },
  'cold brew': { icon: 'coldBrew', color: 'var(--cold-brew-color)' },
}
const categoryMeta = (tx) =>
  CATEGORY_META[tx.item?.category?.name?.toLowerCase()] ?? { icon: 'beer', color: 'var(--beer-color)' }

// ── admin login ──────────────────────────────────────────────────────────────
function AdminLoginModal({ onSuccess, onCancel }) {
  const [pin, setPin] = useState("")
  const [err, setErr] = useState("")

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await api.csrf()
      await api.login(pin)
      onSuccess()
    } catch {
      setErr("Nesprávny PIN. Skús to znova.")
      setPin("")
    }
  }

  return (
    <Modal
      onClose={onCancel}
      icon="admin"
      size="sm"
      title="Admin prihlásenie"
      subtitle="Úprava a mazanie transakcií vyžaduje PIN."
      actions={
        <>
          <button type="button" className="btn btn-outline-secondary" onClick={onCancel}>Zrušiť</button>
          <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={!pin}>Prihlásiť</button>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate>
        <label className="form-label" htmlFor="tx-pin">PIN</label>
        <input
          id="tx-pin"
          type="password"
          inputMode="numeric"
          className="form-control num"
          placeholder="••••"
          value={pin}
          data-autofocus
          onChange={e => { setPin(e.target.value); setErr("") }}
          aria-describedby={err ? "tx-pin-error" : undefined}
        />
        {err && (
          <div id="tx-pin-error" className="mt-2" style={{ color: 'var(--danger)', fontSize: 'var(--fs-sm)' }}>
            {err}
          </div>
        )}
      </form>
    </Modal>
  )
}

// ── kalendárová karta dňa ────────────────────────────────────────────────────
function CalendarDayCard({ dateKey, dayTxs, onEdit, onDelete }) {
  const dayTotal = dayTxs.reduce((s, tx) => s + Number(tx.price_at_time), 0)
  // ak sú v daný deň viaceré osoby, ukážeme meno pod avatarom
  const multiPerson = new Set(dayTxs.map(tx => tx.person?.id)).size > 1

  return (
    <div className="card mb-3 item-card-enter">
      <div className="card-header d-flex justify-content-between align-items-center gap-2 py-2 px-3">
        <span className="fw-semibold" style={{ textTransform: 'capitalize', fontSize: 'var(--fs-sm)' }}>
          {formatDayLabel(dateKey)}
        </span>
        <span className="num fw-bold text-nowrap" style={{ color: 'var(--accent)' }}>
          {dayTotal.toFixed(2)} €
        </span>
      </div>
      <div className="card-body py-3 px-3">
        <div className="d-flex flex-wrap gap-3">
          {dayTxs.map(tx => {
            const meta = categoryMeta(tx)
            return (
              <div key={tx.id} className="d-flex flex-column align-items-center" style={{ width: 92 }}>
                <div style={{ position: 'relative' }}>
                  <Avatar person={tx.person} size={52} />
                  <span
                    className="d-flex align-items-center justify-content-center"
                    style={{
                      position: 'absolute',
                      bottom: -4,
                      right: -6,
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      color: meta.color,
                    }}
                    title={tx.item?.category?.name}
                  >
                    <Icon name={meta.icon} size={12} />
                  </span>
                </div>

                <div className="text-center mt-2" style={{ fontSize: 'var(--fs-xs)', lineHeight: 1.4 }}>
                  {multiPerson && <div className="fw-bold">{tx.person?.name?.split(' ')[0]}</div>}
                  <div className="num text-muted">{formatTime(tx.created_at)}</div>
                  <div className="num fw-semibold">{qtyLabel(tx)}</div>
                  <div className="num" style={{ color: 'var(--accent)' }}>
                    {Number(tx.price_at_time).toFixed(2)} €
                  </div>
                </div>

                <div className="d-flex gap-1 mt-2">
                  <button
                    className="qty-step"
                    style={{ width: 36, height: 36, color: 'var(--text-muted)' }}
                    onClick={() => onEdit(tx)}
                    aria-label={`Upraviť transakciu ${tx.person?.name}`}
                  >
                    <Icon name="edit" size={14} />
                  </button>
                  <button
                    className="qty-step"
                    style={{ width: 36, height: 36, color: 'var(--danger)' }}
                    onClick={() => onDelete(tx)}
                    aria-label={`Vymazať transakciu ${tx.person?.name}`}
                  >
                    <Icon name="trash" size={14} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── hlavný komponent ─────────────────────────────────────────────────────────
export default function Transactions() {
  const [transactions, setTransactions] = useState([])
  const [persons, setPersons] = useState([])
  const [selectedIds, setSelectedIds] = useState([])
  const [showFilter, setShowFilter] = useState(false)
  const [loading, setLoading] = useState(false)
  const [offset, setOffset] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [editId, setEditId] = useState(null)
  const [editForm, setEditForm] = useState({ quantity: "", price_at_time: "" })
  const [confirmModal, setConfirmModal] = useState(null)   // { title, text, onConfirm }
  const [errMsg, setErrMsg] = useState("")
  const [loginModal, setLoginModal] = useState(false)
  const [pendingAction, setPendingAction] = useState(null)

  const limit = 20
  const calendarLimit = 500

  const loadTransactions = async (newOffset = 0, ids = selectedIds) => {
    setLoading(true)
    try {
      const lim = ids.length ? calendarLimit : limit
      const data = await api.getTransactions(lim, newOffset, ids)
      setTransactions(prev => newOffset === 0 ? data.results : [...prev, ...data.results])
      setTotalCount(data.count)
      setOffset(newOffset)
    } catch (err) {
      console.error("Transakcie sa nepodarilo načítať:", err)
      setErrMsg("Transakcie sa nepodarilo načítať.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    api.csrf().catch(() => {})
    api.persons().then(setPersons).catch(() => {})
    loadTransactions()
  }, [])

  const togglePerson = (id) => {
    const next = selectedIds.includes(id)
      ? selectedIds.filter(x => x !== id)
      : [...selectedIds, id]
    setSelectedIds(next)
    setOffset(0)
    loadTransactions(0, next)
  }

  const clearFilter = () => {
    setSelectedIds([])
    setOffset(0)
    loadTransactions(0, [])
  }

  const handleDelete = (tx) => {
    setConfirmModal({
      title: 'Vymazať transakciu?',
      text: `${tx.person.name} — ${tx.item.name}, ${Number(tx.price_at_time).toFixed(2)} €. Túto akciu nie je možné vrátiť späť.`,
      onConfirm: async () => {
        setConfirmModal(null)
        try {
          await api.csrf().catch(() => {})
          await api.deleteTransaction(tx.id)
          setTransactions(prev => prev.filter(t => t.id !== tx.id))
          setTotalCount(prev => prev - 1)
        } catch (err) {
          if (err.status === 403) {
            setPendingAction(() => () => handleDelete(tx))
            setLoginModal(true)
          } else {
            setErrMsg("Transakciu sa nepodarilo vymazať.")
            setTimeout(() => setErrMsg(""), 4000)
          }
        }
      },
    })
  }

  const startEdit = (tx) => {
    setEditId(tx.id)
    setEditForm({ quantity: tx.quantity, price_at_time: tx.price_at_time })
  }

  const cancelEdit = () => {
    setEditId(null)
    setEditForm({ quantity: "", price_at_time: "" })
  }

  const saveEdit = async (id) => {
    try {
      await api.csrf().catch(() => {})
      const updated = await api.updateTransaction(id, {
        quantity: String(editForm.quantity).replace(',', '.'),
        price_at_time: String(editForm.price_at_time).replace(',', '.')
      })
      setTransactions(prev => prev.map(t => t.id === id ? updated : t))
      setEditId(null)
    } catch (err) {
      if (err.status === 403) {
        setPendingAction(() => () => saveEdit(id))
        setLoginModal(true)
      } else {
        try {
          const detail = JSON.parse(err.message)
          setErrMsg(Object.entries(detail)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
            .join(" | "))
        } catch {
          setErrMsg("Transakciu sa nepodarilo upraviť.")
        }
        setTimeout(() => setErrMsg(""), 6000)
      }
    }
  }

  const loadMore = () => loadTransactions(offset + limit)
  const hasMore = !selectedIds.length && transactions.length < totalCount
  const isFiltered = selectedIds.length > 0
  const calendarGroups = isFiltered ? groupByDay(transactions) : null
  const editTx = editId ? transactions.find(t => t.id === editId) : null

  return (
    <div className="container py-3">
      <PageHeader title="Transakcie" icon="transactions" />

      {confirmModal && (
        <Modal
          onClose={() => setConfirmModal(null)}
          tone="danger"
          icon="warning"
          size="sm"
          title={confirmModal.title}
          subtitle={confirmModal.text}
          actions={
            <>
              <button className="btn btn-outline-secondary" onClick={() => setConfirmModal(null)}>Zrušiť</button>
              <button className="btn btn-danger" onClick={confirmModal.onConfirm}>Vymazať</button>
            </>
          }
        />
      )}

      {loginModal && (
        <AdminLoginModal
          onSuccess={() => { setLoginModal(false); if (pendingAction) { pendingAction(); setPendingAction(null) } }}
          onCancel={() => { setLoginModal(false); setPendingAction(null) }}
        />
      )}

      {editTx && (
        <Modal
          onClose={cancelEdit}
          icon="edit"
          size="sm"
          title="Upraviť transakciu"
          subtitle={`${editTx.person.name} — ${editTx.item.name}`}
          actions={
            <>
              <button className="btn btn-outline-secondary" onClick={cancelEdit}>Zrušiť</button>
              <button className="btn btn-primary" onClick={() => saveEdit(editId)}>Uložiť</button>
            </>
          }
        >
          <div className="row g-3">
            <div className="col-6">
              <label className="form-label" htmlFor="edit-qty">Množstvo</label>
              <div className="input-group">
                <button
                  type="button" className="btn btn-outline-secondary" tabIndex={-1}
                  aria-label="Prepnúť znamienko množstva"
                  onClick={() => setEditForm(prev => ({ ...prev, quantity: toggleSign(prev.quantity) }))}
                >±</button>
                <input
                  id="edit-qty" type="text" inputMode="decimal" pattern="-?[0-9]*[.,]?[0-9]*"
                  className="form-control" value={editForm.quantity} data-autofocus
                  onChange={e => setEditForm(prev => ({ ...prev, quantity: e.target.value }))}
                />
              </div>
            </div>
            <div className="col-6">
              <label className="form-label" htmlFor="edit-price">Cena (€)</label>
              <div className="input-group">
                <button
                  type="button" className="btn btn-outline-secondary" tabIndex={-1}
                  aria-label="Prepnúť znamienko ceny"
                  onClick={() => setEditForm(prev => ({ ...prev, price_at_time: toggleSign(prev.price_at_time) }))}
                >±</button>
                <input
                  id="edit-price" type="text" inputMode="decimal" pattern="-?[0-9]*[.,]?[0-9]*"
                  className="form-control" value={editForm.price_at_time}
                  onChange={e => setEditForm(prev => ({ ...prev, price_at_time: e.target.value }))}
                />
              </div>
            </div>
          </div>
        </Modal>
      )}

      {errMsg && (
        <div className="alert alert-danger alert-flash py-2 mb-3 position-relative overflow-hidden" role="alert">
          {errMsg}
          <div className="alert-dismiss-bar" style={{ animationDuration: '5s' }} />
        </div>
      )}

      {/* ── Filter osôb ── */}
      {persons.length > 0 && (
        <div className="card mb-4">
          <button
            className="card-header d-flex justify-content-between align-items-center gap-2 py-2 px-3 w-100 border-0 text-start"
            onClick={() => setShowFilter(f => !f)}
            aria-expanded={showFilter}
            style={{ minHeight: 'var(--tap-min)' }}
          >
            <span className="fw-semibold" style={{ fontSize: 'var(--fs-sm)' }}>
              Filter podľa osoby
              {selectedIds.length > 0 && (
                <span className="num badge ms-2" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                  {selectedIds.length}
                </span>
              )}
            </span>
            <Icon name={showFilter ? 'caretUp' : 'caretDown'} size={14} />
          </button>

          {showFilter && (
            <div className="card-body py-3 px-3">
              <div className="d-flex flex-wrap gap-2 align-items-start">
                {persons.map(p => {
                  const isSelected = selectedIds.includes(p.id)
                  return (
                    <button
                      key={p.id}
                      onClick={() => togglePerson(p.id)}
                      className={`avatar-btn${isSelected ? ' avatar-btn--on' : ''}`}
                      aria-pressed={isSelected}
                    >
                      <Avatar
                        person={p}
                        size={44}
                        style={{ opacity: !selectedIds.length || isSelected ? 1 : 0.4, transition: 'opacity 0.2s' }}
                      />
                      <span className="avatar-btn-label">{p.name.split(' ')[0]}</span>
                    </button>
                  )
                })}
                {selectedIds.length > 0 && (
                  <button className="btn btn-sm btn-outline-secondary align-self-center" onClick={clearFilter}>
                    Zrušiť filter
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mb-3 text-muted" style={{ fontSize: 'var(--fs-sm)' }}>
        {isFiltered
          ? <>{selectedIds.length === 1 ? persons.find(p => p.id === selectedIds[0])?.name : `${selectedIds.length} osoby`} — <span className="num">{totalCount}</span> transakcií</>
          : <>Zobrazených <span className="num">{transactions.length}</span> z <span className="num">{totalCount}</span></>}
      </div>

      {loading && offset === 0 ? (
        <SkeletonRows count={6} height={92} />
      ) : isFiltered ? (
        calendarGroups && calendarGroups.length > 0 ? (
          calendarGroups.map(([dateKey, dayTxs]) => (
            <CalendarDayCard
              key={dateKey}
              dateKey={dateKey}
              dayTxs={dayTxs}
              onEdit={startEdit}
              onDelete={handleDelete}
            />
          ))
        ) : (
          <EmptyState
            icon="calendar"
            title="Žiadne transakcie"
            text="Pre vybrané osoby zatiaľ nič nie je zaznamenané."
            action={<button className="btn btn-outline-secondary mt-3" onClick={clearFilter}>Zrušiť filter</button>}
          />
        )
      ) : transactions.length === 0 ? (
        <EmptyState
          icon="receipt"
          title="Zatiaľ žiadne transakcie"
          text="Keď si niekto naúčtuje pivo alebo kávu, objaví sa to tu."
        />
      ) : (
        <>
          <div className="d-flex flex-column gap-3">
            {transactions.map((tx, idx) => {
              const meta = categoryMeta(tx)
              return (
                <div key={tx.id} className="card item-card-enter" style={{ animationDelay: `${Math.min(idx, 10) * 0.03}s` }}>
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
                      <div className="d-flex align-items-center gap-3 min-w-0">
                        <Avatar person={tx.person} size={42} />
                        <div style={{ minWidth: 0 }}>
                          <div className="fw-semibold">{tx.person.name}</div>
                          <div className="d-flex align-items-center gap-1 text-muted" style={{ fontSize: 'var(--fs-sm)' }}>
                            <span style={{ color: meta.color }}><Icon name={meta.icon} size={13} /></span>
                            {tx.item.name}
                          </div>
                        </div>
                      </div>
                      <div className="text-end">
                        <div className="num fw-bold" style={{ fontSize: 'var(--fs-md)', color: 'var(--accent)' }}>
                          {Number(tx.price_at_time).toFixed(2)} €
                        </div>
                        <div className="num text-muted" style={{ fontSize: 'var(--fs-xs)' }}>{qtyLabel(tx)}</div>
                      </div>
                    </div>
                    <div className="d-flex justify-content-between align-items-center gap-2 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                      <span className="num text-muted" style={{ fontSize: 'var(--fs-xs)' }}>
                        {new Date(tx.created_at).toLocaleString("sk-SK", {
                          day: "2-digit", month: "2-digit", year: "numeric",
                          hour: "2-digit", minute: "2-digit"
                        })}
                      </span>
                      <div className="d-flex gap-2">
                        <button className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1" onClick={() => startEdit(tx)}>
                          <Icon name="edit" size={13} /> Upraviť
                        </button>
                        <button className="btn btn-sm btn-outline-danger d-inline-flex align-items-center gap-1" onClick={() => handleDelete(tx)}>
                          <Icon name="trash" size={13} /> Vymazať
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {hasMore && (
            <div className="text-center mt-4">
              <button className="btn btn-outline-secondary btn-lg w-100" onClick={loadMore} disabled={loading}>
                {loading ? "Načítavam…" : "Načítať ďalšie"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
