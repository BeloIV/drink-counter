import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { api } from "../api"
import { ThemeToggle } from "../ThemeToggle"

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
        <input
          type="password"
          className="form-control mb-3"
          placeholder="PIN"
          value={pin}
          onChange={e => setPin(e.target.value)}
          autoFocus
        />
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
    <div
      onClick={onCancel}
      style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center' }}
    >
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

export default function Transactions() {
  const [transactions, setTransactions] = useState([])
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

  const showConfirm = (msg, onConfirm) => setConfirmModal({ open: true, msg, onConfirm })
  const closeConfirm = () => setConfirmModal({ open: false, msg: "", onConfirm: null })

  const loadTransactions = async (newOffset = 0) => {
    setLoading(true)
    try {
      const data = await api.getTransactions(limit, newOffset)
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
    loadTransactions()
  }, [])

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
        setErrMsg("Chyba pri úprave.")
        setTimeout(() => setErrMsg(""), 4000)
      }
    }
  }

  const loadMore = () => loadTransactions(offset + limit)
  const hasMore = transactions.length < totalCount

  return (
    <div className="container py-4">

      {confirmModal.open && (
        <ConfirmModal
          msg={confirmModal.msg}
          onConfirm={confirmModal.onConfirm}
          onCancel={closeConfirm}
        />
      )}

      {loginModal && (
        <AdminLoginModal
          onSuccess={() => {
            setLoginModal(false)
            if (pendingAction) { pendingAction(); setPendingAction(null) }
          }}
          onCancel={() => { setLoginModal(false); setPendingAction(null) }}
        />
      )}

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

      <div className="mb-3 text-muted small">
        Zobrazených: {transactions.length} z {totalCount}
      </div>

      {loading && offset === 0 ? (
        <div className="text-center py-4">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Načítavam...</span>
          </div>
        </div>
      ) : (
        <>
          <div className="d-flex flex-column gap-3">
            {transactions.map((tx, idx) => (
              <div key={tx.id} className="card shadow-sm item-card-enter" style={{ animationDelay: `${Math.min(idx, 10) * 0.03}s` }}>
                <div className="card-body">
                  {editId === tx.id ? (
                    <>
                      <div className="row g-2 mb-3">
                        <div className="col-12">
                          <small className="text-muted d-block mb-1">Osoba</small>
                          <strong>{tx.person.name}</strong>
                        </div>
                        <div className="col-12">
                          <small className="text-muted d-block mb-1">Položka</small>
                          <strong>{tx.item.name}</strong>
                        </div>
                        <div className="col-6">
                          <label className="form-label small text-muted mb-1">Množstvo</label>
                          <input
                            type="number"
                            step="0.001"
                            className="form-control"
                            value={editForm.quantity}
                            onChange={e => setEditForm(prev => ({ ...prev, quantity: e.target.value }))}
                          />
                        </div>
                        <div className="col-6">
                          <label className="form-label small text-muted mb-1">Cena (€)</label>
                          <input
                            type="number"
                            step="0.01"
                            className="form-control"
                            value={editForm.price_at_time}
                            onChange={e => setEditForm(prev => ({ ...prev, price_at_time: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div className="d-flex gap-2">
                        <button className="btn btn-success flex-fill" onClick={() => saveEdit(tx.id)}>✓ Uložiť</button>
                        <button className="btn btn-secondary flex-fill" onClick={cancelEdit}>✕ Zrušiť</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <div>
                          <h5 className="card-title mb-1">{tx.person.name}</h5>
                          <p className="card-text text-muted mb-0">{tx.item.name}</p>
                        </div>
                        <div className="text-end">
                          <div className="fs-5 fw-bold text-primary">
                            {Number(tx.price_at_time).toFixed(2)} €
                          </div>
                          <small className="text-muted">
                            {Number(tx.quantity).toFixed(3)} {tx.item.pricing_mode === "per_gram" ? "g" : "ks"}
                          </small>
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
                          <button className="btn btn-sm btn-outline-primary" onClick={() => startEdit(tx)}>
                            Upraviť
                          </button>
                          <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(tx)}>
                            Vymazať
                          </button>
                        </div>
                      </div>
                    </>
                  )}
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
