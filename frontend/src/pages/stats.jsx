import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { api } from "../api"
import { ThemeToggle } from "../ThemeToggle"

export default function Stats() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.stats().then(d => { setData(d); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="container py-5 text-center text-muted">Načítavam…</div>
  if (!data) return <div className="container py-5 text-center text-muted">Chyba načítania</div>

  const home = data.persons.filter(p => !p.is_guest)
  const topBeer = [...home].sort((a, b) => b.total_beers - a.total_beers)[0]
  const topCoffee = [...home].sort((a, b) => b.total_coffees - a.total_coffees)[0]
  const topSpender = home.find(p => p.total_spent === Math.max(...home.map(p => Number(p.total_spent || 0))))

  const maxCount = Math.max(...data.top_items.map(i => i.count), 1)

  return (
    <div className="container py-3">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">📊 Štatistiky</h2>
        <div className="d-flex gap-2 align-items-center">
          <Link to="/" className="btn btn-sm btn-outline-secondary">← Späť</Link>
          <ThemeToggle />
        </div>
      </div>

      {/* Grand totals */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-3">
          <div className="card p-3 text-center">
            <div className="fs-1 fw-bold text-primary">{data.grand_count}</div>
            <div className="text-muted small">transakcií</div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card p-3 text-center">
            <div className="fs-1 fw-bold text-success">{Number(data.grand_total).toFixed(0)} €</div>
            <div className="text-muted small">celkovo utratené</div>
          </div>
        </div>
        {topBeer && (
          <div className="col-6 col-md-3">
            <div className="card p-3 text-center">
              <div className="fs-3">🍺</div>
              <div className="fw-bold">{topBeer.name}</div>
              <div className="text-muted small">{topBeer.total_beers} pív</div>
            </div>
          </div>
        )}
        {topCoffee && (
          <div className="col-6 col-md-3">
            <div className="card p-3 text-center">
              <div className="fs-3">☕</div>
              <div className="fw-bold">{topCoffee.name}</div>
              <div className="text-muted small">{topCoffee.total_coffees} káv</div>
            </div>
          </div>
        )}
      </div>

      {/* Leaderboard */}
      <div className="card p-3 mb-4">
        <h5 className="mb-3">🏆 Leaderboard</h5>
        <div className="table-responsive">
          <table className="table table-sm align-middle mb-0">
            <thead>
              <tr>
                <th>Osoba</th>
                <th className="text-center">🍺</th>
                <th className="text-center">☕</th>
                <th className="text-end">Celkom</th>
              </tr>
            </thead>
            <tbody>
              {data.persons.filter(p => !p.is_guest).map((p, i) => (
                <tr key={p.id}>
                  <td>
                    {i === 0 && <span className="me-1">🥇</span>}
                    {i === 1 && <span className="me-1">🥈</span>}
                    {i === 2 && <span className="me-1">🥉</span>}
                    {p.name}
                  </td>
                  <td className="text-center">{p.total_beers}</td>
                  <td className="text-center">{p.total_coffees}</td>
                  <td className="text-end fw-bold">{Number(p.total_spent || 0).toFixed(2)} €</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top položky */}
      <div className="card p-3">
        <h5 className="mb-3">📈 Najobľúbenejšie položky</h5>
        <div className="d-flex flex-column gap-2">
          {data.top_items.map((item, i) => (
            <div key={i}>
              <div className="d-flex justify-content-between mb-1">
                <span className="small fw-semibold">{item.item__name} <span className="text-muted fw-normal">({item.item__category__name})</span></span>
                <span className="small text-muted">{item.count}× · {Number(item.total_eur).toFixed(2)} €</span>
              </div>
              <div style={{ height: 8, borderRadius: 99, background: 'var(--card-border)' }}>
                <div style={{
                  height: '100%', borderRadius: 99,
                  background: '#0d6efd',
                  width: `${(item.count / maxCount * 100).toFixed(0)}%`,
                  transition: 'width 0.6s ease'
                }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
