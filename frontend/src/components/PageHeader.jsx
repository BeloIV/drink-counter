import { useState } from 'react'
import { NavDrawer, HamburgerBtn } from '../NavDrawer'
import { Icon } from './Icon'
import logo from '/favicon.png'

/* Jednotná hlavička pre všetkých šesť stránok. Predtým boli štyri rôzne
   vzory a polovica stránok nemala drawer, takže sa z nich nedalo
   navigovať nikam inam než tlačidlom Späť. */
export function PageHeader({ title, icon, onTitleClick, children }) {
  const [open, setOpen] = useState(false)

  const TitleTag = onTitleClick ? 'button' : 'div'

  return (
    <>
      <NavDrawer open={open} onClose={() => setOpen(false)} />
      <header className="page-header">
        <TitleTag
          className="page-header-title"
          {...(onTitleClick ? { onClick: onTitleClick, type: 'button' } : {})}
        >
          {icon === 'logo'
            ? <img src={logo} alt="" className="page-header-logo" />
            : icon && <span className="page-header-icon"><Icon name={icon} size={22} /></span>}
          <h1>{title}</h1>
        </TitleTag>

        <div className="d-flex align-items-center gap-2">
          {children}
          <HamburgerBtn onClick={() => setOpen(true)} />
        </div>
      </header>
    </>
  )
}
