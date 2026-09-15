import { useEffect, useRef } from 'react'
import { Icon } from './Icon'

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'
// Waits for the panel's enter animation before moving focus into it.
const AUTOFOCUS_DELAY_MS = 30

/** Keep Tab and Shift+Tab cycling inside the panel. */
function trapFocus(event, panel) {
  const focusable = panel.querySelectorAll(FOCUSABLE_SELECTOR)
  if (!focusable.length) return
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

function focusInitialElement(panel) {
  const target = panel?.querySelector('[data-autofocus]') || panel?.querySelector('input, button')
  target?.focus()
}

function useModalBehaviour(panelRef, onClose, dismissable) {
  useEffect(() => {
    const opener = document.activeElement
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && dismissable) onClose?.()
      else if (event.key === 'Tab' && panelRef.current) trapFocus(event, panelRef.current)
    }

    document.addEventListener('keydown', handleKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const focusTimer = setTimeout(() => focusInitialElement(panelRef.current), AUTOFOCUS_DELAY_MS)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      clearTimeout(focusTimer)
      opener?.focus?.()
    }
  }, [panelRef, onClose, dismissable])
}

/**
 * The app's only modal: closes on Escape and backdrop click, traps focus and
 * returns it to the element that opened the modal.
 * `tone` is 'danger' | 'warning', `size` is 'sm' | 'lg'.
 */
export function Modal({ onClose, title, subtitle, icon, tone, size, children, actions, dismissable = true }) {
  const panelRef = useRef(null)
  useModalBehaviour(panelRef, onClose, dismissable)

  const className = ['dc-modal', size && `dc-modal--${size}`, tone && `dc-modal--${tone}`]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="dc-modal-backdrop" onClick={() => dismissable && onClose?.()}>
      <div
        ref={panelRef}
        className={className}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        {(title || icon) && (
          <div className="dc-modal-head">
            {icon && <span className="dc-modal-icon"><Icon name={icon} size={20} /></span>}
            <div className="dc-modal-heading">
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
