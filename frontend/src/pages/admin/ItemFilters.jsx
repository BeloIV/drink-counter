import { useRef, useState } from 'react'
import { Icon } from '../../components/Icon'
import { categoryIcon } from '../../lib/categories'
import { ALL, STATUS_FILTERS } from './adminRules'

const BOUNCE_MS = 250

function FilterButton({ isActive, isBouncing, onClick, children }) {
  return (
    <button
      className={`btn btn-sm d-inline-flex align-items-center gap-1 ${isActive ? 'btn-primary' : 'btn-outline-secondary'} ${isBouncing ? 'filter-btn-bounce' : ''}`}
      aria-pressed={isActive}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

function FilterGroup({ label, children }) {
  return (
    <div className="col-12 col-md-6">
      <div className="nav-drawer-section-label px-0 pt-0">{label}</div>
      <div className="d-flex gap-1 flex-wrap">{children}</div>
    </div>
  )
}

export function ItemFilters({ categories, filters, onChange }) {
  const [bouncingKey, setBouncingKey] = useState(null)
  const bounceTimerRef = useRef(null)

  const select = (field, value) => {
    onChange((current) => ({ ...current, [field]: value }))
    setBouncingKey(`${field}-${value}`)
    clearTimeout(bounceTimerRef.current)
    bounceTimerRef.current = setTimeout(() => setBouncingKey(null), BOUNCE_MS)
  }

  const buttonProps = (field, value) => ({
    isActive: filters[field] === value,
    isBouncing: bouncingKey === `${field}-${value}`,
    onClick: () => select(field, value),
  })

  return (
    <div className="card p-3 mb-4 fade-in-up" style={{ animationDelay: '0.05s' }}>
      <div className="row g-2 align-items-end">
        <FilterGroup label="Stav">
          {STATUS_FILTERS.map(({ value, label }) => (
            <FilterButton key={value} {...buttonProps('status', value)}>{label}</FilterButton>
          ))}
        </FilterGroup>
        <FilterGroup label="Kategória">
          <FilterButton {...buttonProps('category', ALL)}>Všetko</FilterButton>
          {categories.map((category) => (
            <FilterButton key={category.id} {...buttonProps('category', category.name)}>
              <Icon name={categoryIcon(category.name, 'stock')} size={13} /> {category.name}
            </FilterButton>
          ))}
        </FilterGroup>
      </div>
    </div>
  )
}
