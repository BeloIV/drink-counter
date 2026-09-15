import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTheme } from './useTheme'
import { Icon } from './components/Icon'

const TARE_WEIGHTS = [
  { label: '1 kg sáčok', tare: 28 },
  { label: '500 g sáčok', tare: 19.5 },
  { label: '250 g sáčok', tare: 14 },
  { label: '100 g sáčok', tare: 11 },
]

const NAV_ITEMS = [
  { to: '/', label: 'Domov', icon: 'home' },
  { to: '/brew', label: 'Vyrobiť Cold Brew', icon: 'coldBrew' },
  { to: '/admin', label: 'Admin', icon: 'admin' },
  { to: '/transactions', label: 'Transakcie', icon: 'transactions' },
  { to: '/stats', label: 'Štatistiky', icon: 'stats' },
  { to: '/users', label: 'Useri', icon: 'users' },
]

export function HamburgerBtn({ onClick, className = '' }) {
  return (
    <button onClick={onClick} className={`hamburger-btn ${className}`} aria-label="Otvoriť menu">
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
      <nav
        className={`nav-drawer${open ? ' nav-drawer--open' : ''}`}
        aria-hidden={!open}
        {...(open ? {} : { inert: '' })}
      >

        <div className="nav-drawer-head">
          <span className="nav-drawer-logo">
            <Icon name="coffee" size={20} />
            Drink Counter
          </span>
          <button className="nav-drawer-close" onClick={onClose} aria-label="Zavrieť menu">
            <Icon name="close" size={18} />
          </button>
        </div>

        <button className="nav-drawer-theme" onClick={toggle}>
          <span className="nav-drawer-icon">
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} />
          </span>
          <span>{theme === 'dark' ? 'Svetlý režim' : 'Tmavý režim'}</span>
        </button>

        <div className="nav-drawer-sep" />

        <div className="nav-drawer-section-label">Navigácia</div>
        {NAV_ITEMS.map(item => {
          const active = location.pathname === item.to
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`nav-drawer-item${active ? ' nav-drawer-item--active' : ''}`}
              aria-current={active ? 'page' : undefined}
              onClick={onClose}
            >
              <span className="nav-drawer-icon"><Icon name={item.icon} size={18} /></span>
              <span>{item.label}</span>
            </Link>
          )
        })}

        <div className="nav-drawer-sep" />

        <div className="nav-drawer-section-label">Tara sáčkov</div>
        <div className="nav-drawer-tare">
          {TARE_WEIGHTS.map(w => (
            <div key={w.label} className="nav-drawer-tare-row">
              <span>{w.label}</span>
              <span className="num fw-semibold">{w.tare} g</span>
            </div>
          ))}
        </div>

      </nav>
    </>
  )
}
