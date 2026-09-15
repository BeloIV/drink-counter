/** Alert for a useFlashMessage message, with a bar that runs out as it expires. */
export function FlashAlert({ flash, tone = 'info', role = 'status', className = 'mb-3' }) {
  if (!flash.message) return null

  return (
    <div className={`alert alert-${tone} alert-flash py-2 position-relative overflow-hidden ${className}`} role={role}>
      {flash.message}
      <div className="alert-dismiss-bar" style={{ animationDuration: `${flash.durationMs}ms` }} />
    </div>
  )
}
