import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTheme } from './useTheme'

const TARE_WEIGHTS = [
  { label: '1 kg sáčok', tare: 28 },
  { label: '500 g sáčok', tare: 19.5 },
  { label: '250 g sáčok', tare: 14 },
  { label: '100 g sáčok', tare: 11 },
]

const NAV_ITEMS = [
  { to: '/', label: 'Domov', icon: '🏠' },
  { to: '/brew', label: 'Vyrobiť Cold Brew', icon: '❄️' },
  { to: '/admin', label: 'Admin', icon: '🔐' },
  { to: '/transactions', label: 'Transakcie', icon: '📋' },
  { to: '/stats', label: 'Štatistiky', icon: '📊' },
  { to: '/users', label: 'Useri', icon: '👥' },
]

export function HamburgerBtn({ onClick, className = '' }) {
  return (
    <button onClick={onClick} className={`hamburger-btn ${className}`} aria-label="Menu">
      <span className="hamburger-line" />
      <span className="hamburger-line" />
      <span className="hamburger-line" />
    </button>
  )
}

export function NavDrawer({ open, onClose }) {
  const { theme, toggle } = useTheme()
  const location = useLocation()

  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      <div className={`nav-overlay${open ? ' nav-overlay--on' : ''}`} onClick={onClose} />
      <nav className={`nav-drawer${open ? ' nav-drawer--open' : ''}`}>

        <div className="nav-drawer-head">
          <span className="nav-drawer-logo">🥤 Drink Counter</span>
          <button className="nav-drawer-close" onClick={onClose} aria-label="Zavrieť">✕</button>
        </div>

        <button className="nav-drawer-theme" onClick={toggle}>
          <span className="nav-drawer-icon">{theme === 'dark' ? '☀️' : '🌙'}</span>
          <span>{theme === 'dark' ? 'Svetlý režim' : 'Tmavý režim'}</span>
        </button>

        <div className="nav-drawer-sep" />

        <div className="nav-drawer-section-label">Navigácia</div>
        {NAV_ITEMS.map(item => (
          <Link
            key={item.to}
            to={item.to}
            className={`nav-drawer-item${location.pathname === item.to ? ' nav-drawer-item--active' : ''}`}
            onClick={onClose}
          >
            <span className="nav-drawer-icon">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}

        <div className="nav-drawer-sep" />

        <div className="nav-drawer-section-label">⚖️ Tara sáčkov</div>
        <div className="nav-drawer-tare">
          {TARE_WEIGHTS.map(w => (
            <div key={w.label} className="nav-drawer-tare-row">
              <span>{w.label}</span>
              <span className="fw-semibold">{w.tare} g</span>
            </div>
          ))}
        </div>

      </nav>
    </>
  )
}
