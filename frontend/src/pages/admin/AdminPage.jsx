import { useState } from 'react'
import { FlashAlert } from '../../components/FlashAlert'
import { PageHeader } from '../../components/PageHeader'
import { PinLoginCard } from '../../components/PinLogin'
import { useAdminAuth } from '../../hooks/useAdminAuth'
import { useFlashMessage } from '../../hooks/useFlashMessage'
import { AddItemPanel } from './AddItemPanel'
import { ALL, filterItems } from './adminRules'
import { BrewBatchPanel } from './BrewBatchPanel'
import { CoffeeFilterPanel } from './CoffeeFilterPanel'
import { ItemFilters } from './ItemFilters'
import { ItemList } from './ItemList'
import { PersonDebtList } from './PersonDebtList'
import { useAdminData } from './useAdminData'

const FLASH_DURATION_MS = 3500

function AdminDashboard({ data, notify, onSessionExpired }) {
  const [filters, setFilters] = useState({ category: ALL, status: ALL })

  return (
    <>
      <ItemFilters categories={data.categories} filters={filters} onChange={setFilters} />
      <div className="row g-3">
        <div className="col-12 col-xl-7 fade-in-up" style={{ animationDelay: '0.1s' }}>
          <ItemList items={filterItems(data.items, filters)} data={data} notify={notify} />
        </div>
        <div className="col-12 col-xl-5 fade-in-up" style={{ animationDelay: '0.15s' }}>
          <AddItemPanel
            categories={data.categories}
            reload={data.loadAll}
            notify={notify}
            onSessionExpired={onSessionExpired}
          />
          <BrewBatchPanel items={data.items} brewBatches={data.brewBatches} reload={data.loadAll} notify={notify} />
          <CoffeeFilterPanel coffeeFilters={data.coffeeFilters} reload={data.loadCoffeeFilters} notify={notify} />
        </div>
        <div className="col-12 fade-in-up" style={{ animationDelay: '0.2s' }}>
          <PersonDebtList persons={data.persons} debts={data.debts} reload={data.loadAll} notify={notify} />
        </div>
      </div>
    </>
  )
}

export default function AdminPage() {
  const data = useAdminData()
  const flash = useFlashMessage(FLASH_DURATION_MS)
  const auth = useAdminAuth(data.loadAll)

  const login = async (pin) => {
    await auth.login(pin)
    flash.show('Prihlásený')
  }

  const logout = async () => {
    await auth.logout()
    flash.show('Odhlásený')
  }

  return (
    <div className="container py-3">
      <PageHeader title="Admin" icon="admin">
        {auth.isAdmin && <button onClick={logout} className="btn btn-sm btn-outline-secondary">Odhlásiť</button>}
      </PageHeader>

      <FlashAlert flash={flash} />

      {auth.isAdmin ? (
        <AdminDashboard data={data} notify={flash.show} onSessionExpired={auth.expireSession} />
      ) : (
        <PinLoginCard title="Admin" onLogin={login} />
      )}
    </div>
  )
}
