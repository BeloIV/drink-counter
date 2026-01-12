import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { api } from "../api"

export default function Transactions() {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(false)
  const [offset, setOffset] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [editId, setEditId] = useState(null)
  const [editForm, setEditForm] = useState({ quantity: "", price_at_time: "" })
  
  const limit = 20

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
    loadTransactions()
  }, [])

  const handleDelete = async (id) => {
    if (!confirm("Naozaj vymazať túto transakciu?")) return
    try {
      await api.deleteTransaction(id)
      setTransactions(prev => prev.filter(t => t.id !== id))
      setTotalCount(prev => prev - 1)
    } catch (err) {
      alert("Chyba pri mazaní transakcie")
      console.error(err)
    }
  }

  const startEdit = (tx) => {
    setEditId(tx.id)
    setEditForm({
      quantity: tx.quantity,
      price_at_time: tx.price_at_time
    })
  }

  const cancelEdit = () => {
    setEditId(null)
    setEditForm({ quantity: "", price_at_time: "" })
  }

  const saveEdit = async (id) => {
    try {
      const updated = await api.updateTransaction(id, {
        quantity: editForm.quantity,
        price_at_time: editForm.price_at_time
      })
      setTransactions(prev => prev.map(t => t.id === id ? updated : t))
      setEditId(null)
    } catch (err) {
      alert("Chyba pri úprave transakcie")
      console.error(err)
    }
  }

  const loadMore = () => {
    const newOffset = offset + limit
    loadTransactions(newOffset)
  }

  const hasMore = transactions.length < totalCount

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Transakcie</h2>
        <Link to="/" className="btn btn-outline-secondary">Späť</Link>
      </div>

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
            {transactions.map(tx => (
              <div key={tx.id} className="card shadow-sm">
                <div className="card-body">
                  {editId === tx.id ? (
                    // Edit režim
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
                        <button className="btn btn-success flex-fill" onClick={() => saveEdit(tx.id)}>
                          ✓ Uložiť
                        </button>
                        <button className="btn btn-secondary flex-fill" onClick={cancelEdit}>
                          ✕ Zrušiť
                        </button>
                      </div>
                    </>
                  ) : (
                    // Zobrazovací režim
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
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </small>
                        <div className="d-flex gap-2">
                          <button 
                            className="btn btn-sm btn-outline-primary" 
                            onClick={() => startEdit(tx)}
                          >
                            Upraviť
                          </button>
                          <button 
                            className="btn btn-sm btn-outline-danger" 
                            onClick={() => handleDelete(tx.id)}
                          >
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
              <button
                className="btn btn-primary btn-lg w-100"
                onClick={loadMore}
                disabled={loading}
              >
                {loading ? "Načítavam..." : "Načítať ďalšie"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
