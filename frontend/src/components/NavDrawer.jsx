import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTheme } from '../hooks/useTheme'
import { useAuth } from '../lib/authContext'
import { BAG_TARES } from '../lib/bagTares'
import { Icon } from './Icon'

const NAV_ITEMS = [
  { to: '/', label: 'Domov', icon: 'home' },
  { to: '/brew', label: 'Vyrobiť Cold Brew', icon: 'coldBrew' },
  { to: '/admin', label: 'Admin', icon: 'admin' },
  { to: '/transactions', label: 'Transakcie', icon: 'transactions' },
  { to: '/stats', label: 'Štatistiky', icon: 'stats' },
  { to: '/users', label: 'Useri', icon: 'users' },
  { to: '/access', label: 'Prístupy', icon: 'shield', adminOnly: true },
]

function useCloseOnEscape(isActive, onClose) {
  useEffect(() => {
    if (!isActive) return
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [isActive, onClose])
}

function useLockBodyScroll(isLocked) {
  useEffect(() => {
    document.body.style.overflow = isLocked ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isLocked])
}

export function MenuButton({ onClick }) {
  return (
    <button onClick={onClick} className="hamburger-btn" aria-label="Otvoriť menu">
      <span className="hamburger-line" />
      <span className="hamburger-line" />
      <span className="hamburger-line" />
    </button>
  )
}

function ThemeSwitch() {
  const { theme, toggle } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button className="nav-drawer-theme" onClick={toggle}>
      <span className="nav-drawer-icon"><Icon name={isDark ? 'sun' : 'moon'} size={18} /></span>
      <span>{isDark ? 'Svetlý režim' : 'Tmavý režim'}</span>
    </button>
  )
}

function NavLinks({ onNavigate }) {
  const { pathname } = useLocation()
  const { canManageAccess } = useAuth()

  return NAV_ITEMS.filter((item) => canManageAccess || !item.adminOnly).map((item) => {
    const isCurrent = pathname === item.to
    return (
      <Link
        key={item.to}
        to={item.to}
        className={`nav-drawer-item${isCurrent ? ' nav-drawer-item--active' : ''}`}
        aria-current={isCurrent ? 'page' : undefined}
        onClick={onNavigate}
      >
        <span className="nav-drawer-icon"><Icon name={item.icon} size={18} /></span>
        <span>{item.label}</span>
      </Link>
    )
  })
}

function BagTareList() {
  return (
    <div className="nav-drawer-tare">
      {BAG_TARES.map((bag) => (
        <div key={bag.label} className="nav-drawer-tare-row">
          <span>{bag.label}</span>
          <span className="num fw-semibold">{bag.grams} g</span>
        </div>
      ))}
    </div>
  )
}

function SignedInAccount() {
  const { email, signOut } = useAuth()
  if (!email) return null

  return (
    <>
      <div className="nav-drawer-sep" />
      <div className="nav-drawer-section-label">Prihlásený účet</div>
      <div className="nav-drawer-account">
        <span className="nav-drawer-account-email">{email}</span>
        <button className="btn btn-sm btn-outline-secondary" onClick={signOut}>Odhlásiť</button>
      </div>
    </>
  )
}

export function NavDrawer({ open, onClose }) {
  useCloseOnEscape(open, onClose)
  useLockBodyScroll(open)

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

        <ThemeSwitch />

        <div className="nav-drawer-sep" />
        <div className="nav-drawer-section-label">Navigácia</div>
        <NavLinks onNavigate={onClose} />

        <div className="nav-drawer-sep" />
        <div className="nav-drawer-section-label">Tara sáčkov</div>
        <BagTareList />

        <SignedInAccount />
      </nav>
    </>
  )
}
