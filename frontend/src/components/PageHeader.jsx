import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { MenuButton, NavDrawer } from './NavDrawer'
import { Icon } from './Icon'
import logo from '/favicon.png'

function HeaderIcon({ icon }) {
  if (icon === 'logo') return <img src={logo} alt="" className="page-header-logo" />
  if (!icon) return null
  return <span className="page-header-icon"><Icon name={icon} size={22} /></span>
}

/** Brand bar linking back to the kiosk home screen; the home screen's own title already is the brand. */
function HomeBar() {
  const { pathname } = useLocation()
  if (pathname === '/') return null
  return (
    <Link to="/" className="home-bar" aria-label="Späť na domovskú obrazovku">
      <img src={logo} alt="" className="home-bar-logo" />
      <span>Drink Counter</span>
    </Link>
  )
}

/** Shared page header: icon and title, optional page actions and the menu. */
export function PageHeader({ title, icon, onTitleClick, children }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const TitleTag = onTitleClick ? 'button' : 'div'
  const titleProps = onTitleClick ? { onClick: onTitleClick, type: 'button' } : {}

  return (
    <>
      <NavDrawer open={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
      <HomeBar />
      <header className="page-header">
        <TitleTag className="page-header-title" {...titleProps}>
          <HeaderIcon icon={icon} />
          <h1>{title}</h1>
        </TitleTag>

        <div className="d-flex align-items-center gap-2">
          {children}
          <MenuButton onClick={() => setIsMenuOpen(true)} />
        </div>
      </header>
    </>
  )
}
