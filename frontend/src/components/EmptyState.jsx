import { Icon } from './Icon'

export function EmptyState({ icon = 'receipt', title, text, action }) {
  return (
    <div className="empty-state">
      <span className="empty-state-icon"><Icon name={icon} size={26} /></span>
      {title && <div className="empty-state-title">{title}</div>}
      {text && <p className="empty-state-text">{text}</p>}
      {action}
    </div>
  )
}
