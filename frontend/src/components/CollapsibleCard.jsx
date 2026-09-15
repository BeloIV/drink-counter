import { useState } from 'react'
import { Icon } from './Icon'

/** Card whose body opens and closes from a full-width header button. */
export function CollapsibleCard({ icon, title, className = '', bodyClassName = 'card-body', children }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className={`card ${className}`}>
      <button
        className="card-header d-flex justify-content-between align-items-center w-100 border-0 text-start tap-target"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className="fw-semibold d-flex align-items-center gap-2">
          <Icon name={icon} size={15} /> {title}
        </span>
        <Icon name={isOpen ? 'caretUp' : 'caretDown'} size={13} />
      </button>
      {isOpen && <div className={bodyClassName}>{children}</div>}
    </div>
  )
}
