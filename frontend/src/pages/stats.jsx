import { useEffect, useState } from "react"
import { api } from "../api"
import { PageHeader } from "../components/PageHeader"
import { Icon } from "../components/Icon"
import { EmptyState } from "../components/EmptyState"
import { Skeleton, SkeletonCards, SkeletonRows } from "../components/Skeleton"

export default function Stats() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    api.stats()
      .then(d => { setData(d); setLoading(false) })
      .catch(() => { setFailed(true); setLoading(false) })
  }, [])

  if (loading) {
    return (
      <div className="container py-3">
        <PageHeader title="Štatistiky" icon="stats" />
        <SkeletonCards count={4} />
        <div className="mt-4"><Skeleton h={28} w="40%" /></div>
        <div className="mt-3"><SkeletonRows count={6} /></div>
      </div>
    )
  }

  if (failed || !data) {
    return (
      <div className="container py-3">
        <PageHeader title="Štatistiky" icon="stats" />
        <EmptyState
          icon="warning"
          title="Štatistiky sa nepodarilo načítať"
          text="Skontroluj, či beží backend, a skús stránku obnoviť."
          action={<button className="btn btn-primary mt-3" onClick={() => window.location.reload()}>Skúsiť znova</button>}
        />
      </div>
    )
  }

  // Tabuľka číslovala riadky 1, 2, 3, ale dáta z API prichádzajú nezoradené —
  // poradie tak nezodpovedalo stĺpcu Celkom.
  const home = data.persons
    .filter(p => !p.is_guest)
    .sort((a, b) => Number(b.total_spent || 0) - Number(a.total_spent || 0))
  const topBeer = [...home].sort((a, b) => b.total_beers - a.total_beers)[0]
  const topCoffee = [...home].sort((a, b) => b.total_coffees - a.total_coffees)[0]
  const maxCount = Math.max(...data.top_items.map(i => i.count), 1)

  return (
    <div className="container py-3">
      <PageHeader title="Štatistiky" icon="stats" />

      {/* Celkové súčty */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-3">
          <div className="card p-3 text-center h-100">
            <div className="num fw-bold" style={{ fontSize: 'var(--fs-2xl)', lineHeight: 1.1 }}>{data.grand_count}</div>
            <div className="text-muted" style={{ fontSize: 'var(--fs-xs)' }}>transakcií</div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card p-3 text-center h-100">
            <div className="num fw-bold" style={{ fontSize: 'var(--fs-2xl)', lineHeight: 1.1, color: 'var(--accent)' }}>
              {Number(data.grand_total).toFixed(0)} €
            </div>
            <div className="text-muted" style={{ fontSize: 'var(--fs-xs)' }}>celkovo utratené</div>
          </div>
        </div>
        {topBeer && (
          <div className="col-6 col-md-3">
            <div className="card p-3 text-center h-100">
              <div style={{ color: 'var(--beer-color)' }}><Icon name="beer" size={26} /></div>
              <div className="fw-bold mt-1">{topBeer.name}</div>
              <div className="text-muted" style={{ fontSize: 'var(--fs-xs)' }}>
                <span className="num">{topBeer.total_beers}</span> pív
              </div>
            </div>
          </div>
        )}
        {topCoffee && (
          <div className="col-6 col-md-3">
            <div className="card p-3 text-center h-100">
              <div style={{ color: 'var(--coffee-color)' }}><Icon name="coffee" size={26} /></div>
              <div className="fw-bold mt-1">{topCoffee.name}</div>
              <div className="text-muted" style={{ fontSize: 'var(--fs-xs)' }}>
                <span className="num">{topCoffee.total_coffees}</span> káv
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Poradie */}
      <div className="card p-3 mb-4">
        <h2 className="mb-3 d-flex align-items-center gap-2" style={{ fontSize: 'var(--fs-md)' }}>
          <Icon name="trophy" /> Poradie
        </h2>
        {home.length === 0 ? (
          <EmptyState icon="users" title="Zatiaľ nikto" text="Keď si niekto niečo naúčtuje, objaví sa tu." />
        ) : (
          <div className="table-responsive">
            <table className="table table-sm align-middle mb-0">
              <thead>
                <tr>
                  <th style={{ width: '2.5rem' }}>#</th>
                  <th>Osoba</th>
                  <th className="text-end">Pivá</th>
                  <th className="text-end">Kávy</th>
                  <th className="text-end">Celkom</th>
                </tr>
              </thead>
              <tbody>
                {home.map((p, i) => (
                  <tr key={p.id}>
                    <td className="num text-muted">{i + 1}</td>
                    <td className={i === 0 ? 'fw-bold' : ''}>{p.name}</td>
                    <td className="num text-end">{p.total_beers}</td>
                    <td className="num text-end">{p.total_coffees}</td>
                    <td className="num text-end fw-bold">{Number(p.total_spent || 0).toFixed(2)} €</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Najobľúbenejšie položky */}
      <div className="card p-3">
        <h2 className="mb-3 d-flex align-items-center gap-2" style={{ fontSize: 'var(--fs-md)' }}>
          <Icon name="trend" /> Najobľúbenejšie položky
        </h2>
        {data.top_items.length === 0 ? (
          <EmptyState icon="receipt" title="Žiadne položky" text="Zatiaľ sa nič nenaúčtovalo." />
        ) : (
          <div className="d-flex flex-column gap-3">
            {data.top_items.map((item, i) => (
              <div key={i}>
                <div className="d-flex justify-content-between gap-2 mb-1">
                  <span className="fw-semibold" style={{ fontSize: 'var(--fs-sm)' }}>
                    {item.item__name}{' '}
                    <span className="text-muted fw-normal">{item.item__category__name}</span>
                  </span>
                  <span className="num text-muted text-nowrap" style={{ fontSize: 'var(--fs-sm)' }}>
                    {item.count}× · {Number(item.total_eur).toFixed(2)} €
                  </span>
                </div>
                <div style={{ height: 8, borderRadius: 'var(--radius-pill)', background: 'var(--surface-2)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    borderRadius: 'var(--radius-pill)',
                    background: 'var(--accent)',
                    width: `${(item.count / maxCount * 100).toFixed(0)}%`,
                    transition: 'width 0.6s ease',
                  }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
