import { useEffect, useState } from 'react'
import { api } from '../../api'
import { EmptyState } from '../../components/EmptyState'
import { Icon } from '../../components/Icon'
import { PageHeader } from '../../components/PageHeader'
import { Skeleton, SkeletonCards, SkeletonRows } from '../../components/Skeleton'
import { formatEuro } from '../../lib/units'

const PAGE_TITLE = 'Štatistiky'

const totalSpent = (person) => Number(person.total_spent || 0)
const topBy = (persons, field) => [...persons].sort((a, b) => b[field] - a[field])[0]

function StatCard({ children }) {
  return (
    <div className="col-6 col-md-3">
      <div className="card p-3 text-center h-100">{children}</div>
    </div>
  )
}

function TopDrinkerCard({ person, icon, colorVariable, count, unitLabel }) {
  if (!person) return null
  return (
    <StatCard>
      <div style={{ color: `var(${colorVariable})` }}><Icon name={icon} size={26} /></div>
      <div className="fw-bold mt-1">{person.name}</div>
      <div className="text-muted fs-xs"><span className="num">{count}</span> {unitLabel}</div>
    </StatCard>
  )
}

function Totals({ stats, homeMembers }) {
  const topBeer = topBy(homeMembers, 'total_beers')
  const topCoffee = topBy(homeMembers, 'total_coffees')

  return (
    <div className="row g-3 mb-4">
      <StatCard>
        <div className="num fw-bold fs-2xl lh-snug">{stats.grand_count}</div>
        <div className="text-muted fs-xs">transakcií</div>
      </StatCard>
      <StatCard>
        <div className="num fw-bold fs-2xl lh-snug tone-accent">{Number(stats.grand_total).toFixed(0)} €</div>
        <div className="text-muted fs-xs">celkovo utratené</div>
      </StatCard>
      <TopDrinkerCard person={topBeer} icon="beer" colorVariable="--beer-color" count={topBeer?.total_beers} unitLabel="pív" />
      <TopDrinkerCard person={topCoffee} icon="coffee" colorVariable="--coffee-color" count={topCoffee?.total_coffees} unitLabel="káv" />
    </div>
  )
}

function Leaderboard({ homeMembers }) {
  return (
    <div className="card p-3 mb-4">
      <h2 className="mb-3 d-flex align-items-center gap-2 fs-md"><Icon name="trophy" /> Poradie</h2>
      {homeMembers.length === 0 ? (
        <EmptyState icon="users" title="Zatiaľ nikto" text="Keď si niekto niečo naúčtuje, objaví sa tu." />
      ) : (
        <div className="table-responsive">
          <table className="table table-sm align-middle mb-0">
            <thead>
              <tr>
                <th className="col-rank">#</th>
                <th>Osoba</th>
                <th className="text-end">Pivá</th>
                <th className="text-end">Kávy</th>
                <th className="text-end">Celkom</th>
              </tr>
            </thead>
            <tbody>
              {homeMembers.map((person, index) => (
                <tr key={person.id}>
                  <td className="num text-muted">{index + 1}</td>
                  <td className={index === 0 ? 'fw-bold' : ''}>{person.name}</td>
                  <td className="num text-end">{person.total_beers}</td>
                  <td className="num text-end">{person.total_coffees}</td>
                  <td className="num text-end fw-bold">{formatEuro(totalSpent(person))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function TopItems({ items }) {
  const maxCount = Math.max(...items.map((item) => item.count), 1)

  return (
    <div className="card p-3">
      <h2 className="mb-3 d-flex align-items-center gap-2 fs-md"><Icon name="trend" /> Najobľúbenejšie položky</h2>
      {items.length === 0 ? (
        <EmptyState icon="receipt" title="Žiadne položky" text="Zatiaľ sa nič nenaúčtovalo." />
      ) : (
        <div className="d-flex flex-column gap-3">
          {items.map((item) => (
            <div key={`${item.item__name}-${item.item__category__name}`}>
              <div className="d-flex justify-content-between gap-2 mb-1">
                <span className="fw-semibold fs-sm">
                  {item.item__name} <span className="text-muted fw-normal">{item.item__category__name}</span>
                </span>
                <span className="num text-muted text-nowrap fs-sm">{item.count}× · {formatEuro(item.total_eur)}</span>
              </div>
              <div className="popularity-bar">
                <div className="popularity-bar-fill" style={{ width: `${((item.count / maxCount) * 100).toFixed(0)}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function StatsSkeleton() {
  return (
    <>
      <SkeletonCards count={4} />
      <div className="mt-4"><Skeleton height={28} width="40%" /></div>
      <div className="mt-3"><SkeletonRows count={6} /></div>
    </>
  )
}

function useStats() {
  const [stats, setStats] = useState(null)
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    api.stats()
      .then((data) => {
        setStats(data)
        setStatus('ready')
      })
      .catch(() => setStatus('failed'))
  }, [])

  return { stats, status }
}

export default function StatsPage() {
  const { stats, status } = useStats()

  let content
  if (status === 'loading') {
    content = <StatsSkeleton />
  } else if (status === 'failed' || !stats) {
    content = (
      <EmptyState
        icon="warning"
        title="Štatistiky sa nepodarilo načítať"
        text="Skontroluj, či beží backend, a skús stránku obnoviť."
        action={<button className="btn btn-primary mt-3" onClick={() => window.location.reload()}>Skúsiť znova</button>}
      />
    )
  } else {
    // Rank by money spent; the API does not guarantee any order.
    const homeMembers = stats.persons.filter((person) => !person.is_guest).sort((a, b) => totalSpent(b) - totalSpent(a))
    content = (
      <>
        <Totals stats={stats} homeMembers={homeMembers} />
        <Leaderboard homeMembers={homeMembers} />
        <TopItems items={stats.top_items} />
      </>
    )
  }

  return (
    <div className="container py-3">
      <PageHeader title={PAGE_TITLE} icon="stats" />
      {content}
    </div>
  )
}
