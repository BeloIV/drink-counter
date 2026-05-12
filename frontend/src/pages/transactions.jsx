import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { api } from "../api"
import { ThemeToggle } from "../ThemeToggle"

// ── helpers ──────────────────────────────────────────────────────────────────
function nameGradient(name) {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
    hash |= 0
  }
  const h = Math.abs(hash) % 360
  return `linear-gradient(145deg, hsl(${h},60%,38%), hsl(${(h + 50) % 360},70%,28%))`
}

function getInitials(name) {
  return name.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function Avatar({ person, size = 40, style = {} }) {
  const avatarUrl = person?.avatar?.startsWith('/media/') ? person.avatar : null
  const base = {
    width: size,
    height: size,
    borderRadius: '50%',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    userSelect: 'none',
    ...style,
  }
  if (avatarUrl) {
    return (
      <div style={base}>
        <img
          src={avatarUrl}
          alt={person?.name || ''}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      </div>
    )
  }
  return (
    <div style={{
      ...base,
      background: nameGradient(person?.name || '?'),
      color: '#fff',
      fontWeight: 700,
      fontSize: size * 0.35,
    }}>
      {getInitials(person?.name || '?')}
    </div>
  )
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

// ── modals ────────────────────────────────────────────────────────────────────
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
      setErr("Nesprávny PIN")
    }
  }
  return (
    <div onClick={onCancel} style={{ position:'fixed', inset:0, zIndex:10000, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <form onClick={e => e.stopPropagation()} onSubmit={handleSubmit} className="card shadow-lg pop-in" style={{ maxWidth:320, width:'90%', padding:'2rem' }}>
        <h5 className="text-center mb-3">Admin prihlásenie</h5>
        {err && <div className="alert alert-danger py-1 mb-2">{err}</div>}
        <input type="password" className="form-control mb-3" placeholder="PIN" value={pin} onChange={e => setPin(e.target.value)} autoFocus />
        <div className="d-flex gap-2">
          <button type="submit" className="btn btn-primary flex-fill">Prihlásiť</button>
          <button type="button" className="btn btn-secondary flex-fill" onClick={onCancel}>Zrušiť</button>
        </div>
      </form>
    </div>
  )
}

function ConfirmModal({ msg, onConfirm, onCancel }) {
  return (
    <div onClick={onCancel} style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div className="card shadow-lg pop-in" style={{ maxWidth:340, width:'90%' }} onClick={e=>e.stopPropagation()}>
        <div className="card-body p-4 text-center">
          <div style={{ fontSize:'2.2rem', marginBottom:'0.5rem' }}>⚠️</div>
          <p className="mb-4">{msg}</p>
          <div className="d-flex gap-2">
            <button className="btn btn-danger flex-fill" onClick={onConfirm}>Potvrdiť</button>
            <button className="btn btn-secondary flex-fill" onClick={onCancel}>Zrušiť</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── calendar day card ─────────────────────────────────────────────────────────
function CalendarDayCard({ dateKey, dayTxs, onEdit, onDelete }) {
  const dayTotal = dayTxs.reduce((s, tx) => s + Number(tx.price_at_time), 0)
  // ak sú v daný deň viaceré osoby, ukážeme meno pod avatarom
  const multiPerson = new Set(dayTxs.map(tx => tx.person?.id)).size > 1
  return (
    <div className="card shadow-sm mb-3 item-card-enter">
      <div className="card-header d-flex justify-content-between align-items-center py-2 px-3">
        <span className="fw-semibold small" style={{ textTransform: 'capitalize' }}>{formatDayLabel(dateKey)}</span>
        <span className="badge bg-primary">{dayTotal.toFixed(2)} €</span>
      </div>
      <div className="card-body py-2 px-3">
        <div className="d-flex flex-wrap gap-3">
          {dayTxs.map(tx => (
            <div
              key={tx.id}
              className="d-flex flex-column align-items-center"
              style={{ minWidth: 60 }}
            >
              <div style={{ position: 'relative' }}>
                <Avatar person={tx.person} size={48} style={{ border: '2px solid rgba(128,128,128,0.25)' }} />
                <span
                  style={{
                    position: 'absolute',
                    bottom: -4,
                    right: -6,
                    background: tx.item?.category?.name?.toLowerCase() === 'coffee' ? '#6f4e37'
                      : tx.item?.category?.name?.toLowerCase() === 'cold brew' ? '#0d6efd'
                      : '#198754',
                    borderRadius: '50%',
                    width: 18,
                    height: 18,
                    fontSize: 11,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {tx.item?.category?.name?.toLowerCase() === 'coffee' ? '☕'
                    : tx.item?.category?.name?.toLowerCase() === 'cold brew' ? '❄️'
                    : '🍺'}
                </span>
              </div>
              <div className="text-center mt-2" style={{ fontSize: 11, lineHeight: 1.3 }}>
                {multiPerson && (
                  <div className="fw-bold" style={{ color: 'var(--body-color)' }}>
                    {tx.person?.name?.split(' ')[0]}
                  </div>
                )}
                <div className="text-muted">{formatTime(tx.created_at)}</div>
                <div className="fw-semibold">{qtyLabel(tx)}</div>
                <div style={{ color: '#0d6efd' }}>{Number(tx.price_at_time).toFixed(2)} €</div>
              </div>
              <div className="d-flex gap-1 mt-1">
                <button
                  className="btn btn-outline-primary"
                  style={{ padding: '1px 5px', fontSize: 10 }}
                  onClick={() => onEdit(tx)}
                  title="Upraviť"
                >✎</button>
                <button
                  className="btn btn-outline-danger"
                  style={{ padding: '1px 5px', fontSize: 10 }}
                  onClick={() => onDelete(tx)}
                  title="Vymazať"
                >✕</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── main component ────────────────────────────────────────────────────────────
export default function Transactions() {
  const [transactions, setTransactions] = useState([])
  const [persons, setPersons] = useState([])
  const [selectedIds, setSelectedIds] = useState([])   // multi-select
  const [showFilter, setShowFilter] = useState(false)   // filter collapsed by default
  const [loading, setLoading] = useState(false)
  const [offset, setOffset] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [editId, setEditId] = useState(null)
  const [editForm, setEditForm] = useState({ quantity: "", price_at_time: "" })
  const [confirmModal, setConfirmModal] = useState({ open: false, msg: "", onConfirm: null })
  const [errMsg, setErrMsg] = useState("")
  const [loginModal, setLoginModal] = useState(false)
  const [pendingAction, setPendingAction] = useState(null)

  const limit = 20
  const calendarLimit = 500

  const showConfirm = (msg, onConfirm) => setConfirmModal({ open: true, msg, onConfirm })
  const closeConfirm = () => setConfirmModal({ open: false, msg: "", onConfirm: null })

  const loadTransactions = async (newOffset = 0, ids = selectedIds) => {
    setLoading(true)
    try {
      const lim = ids.length ? calendarLimit : limit
      const data = await api.getTransactions(lim, newOffset, ids)
      if (newOffset === 0) {
        setTransactions(data.results)
      } else {
        setTransactions(prev => [...prev, ...data.results])
      }
      setTotalCount(data.count)
      setOffset(newOffset)
    } catch (err) {
      console.error("Failed to load transactions:", err)
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
    showConfirm(`Naozaj vymazať transakciu pre ${tx.person.name} (${tx.item.name})?`, async () => {
      closeConfirm()
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
          setErrMsg("Chyba pri mazaní.")
          setTimeout(() => setErrMsg(""), 4000)
        }
      }
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
        quantity: editForm.quantity,
        price_at_time: editForm.price_at_time
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
          const msg = Object.entries(detail).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`).join(" | ")
          setErrMsg(msg)
        } catch {
          setErrMsg("Chyba pri úprave.")
        }
        setTimeout(() => setErrMsg(""), 6000)
      }
    }
  }

  const loadMore = () => loadTransactions(offset + limit)
  const hasMore = !selectedIds.length && transactions.length < totalCount
  const isFiltered = selectedIds.length > 0
  const calendarGroups = isFiltered ? groupByDay(transactions) : null

  // inline edit modal used in both views
  const EditModal = editId ? (() => {
    const tx = transactions.find(t => t.id === editId)
    if (!tx) return null
    return (
      <div onClick={cancelEdit} style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div className="card shadow-lg pop-in" style={{ maxWidth:360, width:'90%' }} onClick={e => e.stopPropagation()}>
          <div className="card-body p-4">
            <h6 className="mb-3">Upraviť transakciu</h6>
            <div className="mb-2 small text-muted">{tx.person.name} — {tx.item.name}</div>
            <div className="row g-2 mb-3">
              <div className="col-6">
                <label className="form-label small text-muted mb-1">Množstvo</label>
                <input type="number" step="0.001" className="form-control" value={editForm.quantity}
                  onChange={e => setEditForm(prev => ({ ...prev, quantity: e.target.value }))} />
              </div>
              <div className="col-6">
                <label className="form-label small text-muted mb-1">Cena (€)</label>
                <input type="number" step="0.01" className="form-control" value={editForm.price_at_time}
                  onChange={e => setEditForm(prev => ({ ...prev, price_at_time: e.target.value }))} />
              </div>
            </div>
            <div className="d-flex gap-2">
              <button className="btn btn-success flex-fill" onClick={() => saveEdit(editId)}>✓ Uložiť</button>
              <button className="btn btn-secondary flex-fill" onClick={cancelEdit}>✕ Zrušiť</button>
            </div>
          </div>
        </div>
      </div>
    )
  })() : null

  return (
    <div className="container py-4">

      {confirmModal.open && <ConfirmModal msg={confirmModal.msg} onConfirm={confirmModal.onConfirm} onCancel={closeConfirm} />}
      {loginModal && (
        <AdminLoginModal
          onSuccess={() => { setLoginModal(false); if (pendingAction) { pendingAction(); setPendingAction(null) } }}
          onCancel={() => { setLoginModal(false); setPendingAction(null) }}
        />
      )}
      {EditModal}

      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Transakcie</h2>
        <div className="d-flex gap-2 align-items-center">
          <Link to="/" className="btn btn-sm btn-outline-secondary">← Späť</Link>
          <ThemeToggle />
        </div>
      </div>

      {errMsg && (
        <div className="alert alert-danger alert-flash py-2 mb-3 position-relative overflow-hidden">
          {errMsg}
          <div className="alert-dismiss-bar" style={{ animationDuration: '5s' }} />
        </div>
      )}

      {/* ── Filter osôb ── */}
      {persons.length > 0 && (
        <div className="card mb-4">
          <div
            className="card-header d-flex justify-content-between align-items-center py-2 px-3"
            style={{ cursor: 'pointer', userSelect: 'none' }}
            onClick={() => setShowFilter(f => !f)}
          >
            <span className="small fw-bold">
              Filter podľa osoby
              {selectedIds.length > 0 && (
                <span className="badge bg-primary ms-2">{selectedIds.length}</span>
              )}
            </span>
            <span style={{ fontSize: 12, opacity: 0.6 }}>{showFilter ? '▲' : '▼'}</span>
          </div>
          {showFilter && (
            <div className="card-body py-2 px-3">
              <div className="d-flex flex-wrap gap-3 align-items-center">
                {selectedIds.length > 0 && (
                  <button className="btn btn-sm btn-outline-secondary" onClick={clearFilter}>
                    ✕ Zrušiť filter
                  </button>
                )}
                {persons.map(p => {
                  const isSelected = selectedIds.includes(p.id)
                  return (
                    <button
                      key={p.id}
                      onClick={() => togglePerson(p.id)}
                      title={p.name}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <div style={{
                        borderRadius: '50%',
                        padding: 2,
                        background: isSelected ? '#0d6efd' : 'transparent',
                        transition: 'background 0.15s',
                      }}>
                        <Avatar person={p} size={44} style={{
                          border: isSelected ? '2px solid #fff' : '2px solid transparent',
                          opacity: !selectedIds.length || isSelected ? 1 : 0.35,
                          transition: 'opacity 0.2s, border 0.15s',
                        }} />
                      </div>
                      <span style={{
                        fontSize: 11,
                        fontWeight: isSelected ? 700 : 400,
                        color: isSelected ? 'var(--body-color)' : 'var(--muted-color)',
                        maxWidth: 60,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>{p.name.split(' ')[0]}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mb-3 text-muted small">
        {isFiltered
          ? `${selectedIds.length === 1 ? persons.find(p => p.id === selectedIds[0])?.name : `${selectedIds.length} osoby`} — ${totalCount} transakcií`
          : `Zobrazených: ${transactions.length} z ${totalCount}`}
      </div>

      {loading && offset === 0 ? (
        <div className="text-center py-4">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Načítavam...</span>
          </div>
        </div>
      ) : isFiltered ? (
        /* ── Kalendárový pohľad ── */
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
          <div className="text-center text-muted py-5">Žiadne transakcie</div>
        )
      ) : (
        /* ── Zoznamový pohľad ── */
        <>
          <div className="d-flex flex-column gap-3">
            {transactions.map((tx, idx) => (
              <div key={tx.id} className="card shadow-sm item-card-enter" style={{ animationDelay: `${Math.min(idx, 10) * 0.03}s` }}>
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div className="d-flex align-items-center gap-2">
                      <Avatar person={tx.person} size={36} />
                      <div>
                        <h6 className="mb-0">{tx.person.name}</h6>
                        <div className="text-muted small">{tx.item.name}</div>
                      </div>
                    </div>
                    <div className="text-end">
                      <div className="fs-5 fw-bold text-primary">{Number(tx.price_at_time).toFixed(2)} €</div>
                      <small className="text-muted">{qtyLabel(tx)}</small>
                    </div>
                  </div>
                  <div className="d-flex justify-content-between align-items-center pt-2 border-top">
                    <small className="text-muted">
                      {new Date(tx.created_at).toLocaleString("sk-SK", {
                        day: "2-digit", month: "2-digit", year: "numeric",
                        hour: "2-digit", minute: "2-digit"
                      })}
                    </small>
                    <div className="d-flex gap-2">
                      <button className="btn btn-sm btn-outline-primary" onClick={() => startEdit(tx)}>Upraviť</button>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(tx)}>Vymazať</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {hasMore && (
            <div className="text-center mt-4">
              <button className="btn btn-primary btn-lg w-100" onClick={loadMore} disabled={loading}>
                {loading ? "Načítavam..." : "Načítať ďalšie"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
