import { useEffect, useRef } from 'react'
import { Icon } from './Icon'

/* Jeden modal pre celú appku — predtým bolo šesť inline implementácií
   s piatimi rôznymi z-index a štyrmi krytmi.
   Rieši: Escape, klik mimo, focus trap, návrat fokusu, aria. */
export function Modal({
  open = true,
  onClose,
  title,
  subtitle,
  icon,
  tone,              // 'danger' | 'warning' | undefined
  size,              // 'sm' | 'lg' | undefined
  children,
  actions,
  dismissable = true,
}) {
  const panelRef = useRef(null)
  const restoreRef = useRef(null)

  useEffect(() => {
    if (!open) return
    restoreRef.current = document.activeElement

    const onKey = (e) => {
      if (e.key === 'Escape' && dismissable) { onClose?.(); return }
      if (e.key !== 'Tab' || !panelRef.current) return
      const focusable = panelRef.current.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }

    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const t = setTimeout(() => {
      const target = panelRef.current?.querySelector('[data-autofocus]')
        || panelRef.current?.querySelector('input, button')
      target?.focus()
    }, 30)

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      clearTimeout(t)
      restoreRef.current?.focus?.()
    }
  }, [open, onClose, dismissable])

  if (!open) return null

  const cls = [
    'dc-modal',
    size && `dc-modal--${size}`,
    tone && `dc-modal--${tone}`,
  ].filter(Boolean).join(' ')

  return (
    <div
      className="dc-modal-backdrop"
      onClick={() => dismissable && onClose?.()}
    >
      <div
        ref={panelRef}
        className={cls}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={e => e.stopPropagation()}
      >
        {(title || icon) && (
          <div className="dc-modal-head">
            {icon && <span className="dc-modal-icon"><Icon name={icon} size={20} /></span>}
            <div style={{ minWidth: 0, flex: 1 }}>
              {title && <h2 className="dc-modal-title">{title}</h2>}
              {subtitle && <p className="dc-modal-sub">{subtitle}</p>}
            </div>
          </div>
        )}

        {children && <div className="dc-modal-body">{children}</div>}

        {actions && <div className="dc-modal-actions">{actions}</div>}
      </div>
    </div>
  )
}
