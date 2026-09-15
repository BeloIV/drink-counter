import { useState } from 'react'
import { EmptyState } from '../../components/EmptyState'
import { FlashAlert } from '../../components/FlashAlert'
import { Icon } from '../../components/Icon'
import { PageHeader } from '../../components/PageHeader'
import { SkeletonRows } from '../../components/Skeleton'
import { useFlashMessage } from '../../hooks/useFlashMessage'
import { useAuth } from '../../lib/authContext'
import { useDialog } from '../../lib/dialogContext'
import { useAllowedEmails } from './useAllowedEmails'

const FLASH_DURATION_MS = 4000

function AddEmailForm({ onAdd }) {
  const [email, setEmail] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setIsSaving(true)
    const added = await onAdd(email.trim(), isAdmin)
    setIsSaving(false)
    if (added) {
      setEmail('')
      setIsAdmin(false)
    }
  }

  return (
    <form onSubmit={submit} className="row g-2 align-items-end">
      <div className="col-12 col-md-7">
        <label className="form-label" htmlFor="new-email">Google email</label>
        <input
          id="new-email"
          type="email"
          className="form-control"
          placeholder="meno@gmail.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </div>
      <div className="col-6 col-md-2">
        <div className="form-check tap-target d-flex align-items-center gap-2">
          <input
            id="new-email-admin"
            type="checkbox"
            className="form-check-input m-0"
            checked={isAdmin}
            onChange={(event) => setIsAdmin(event.target.checked)}
          />
          <label className="form-check-label" htmlFor="new-email-admin">Správca</label>
        </div>
      </div>
      <div className="col-6 col-md-3">
        <button type="submit" className="btn btn-primary w-100" disabled={isSaving || !email.trim()}>
          <Icon name="plus" size={15} /> Pridať
        </button>
      </div>
    </form>
  )
}

function EmailBadges({ entry, isCurrentUser }) {
  return (
    <span className="d-inline-flex flex-wrap gap-1">
      {entry.is_admin && <span className="badge badge-tone-accent">Správca</span>}
      {entry.from_env && <span className="badge badge-tone-neutral">z .env</span>}
      {isCurrentUser && <span className="badge badge-tone-ok">Ty</span>}
    </span>
  )
}

function EmailRow({ entry, isCurrentUser, onSetAdmin, onRemove }) {
  // Admins from .env are managed in the server config, and nobody can lock themselves out.
  const isLocked = entry.from_env || isCurrentUser

  return (
    <div className="access-row">
      <div className="d-flex flex-column gap-1 min-w-0">
        <span className="access-email">{entry.email}</span>
        <EmailBadges entry={entry} isCurrentUser={isCurrentUser} />
      </div>
      <div className="d-flex gap-2">
        <button
          className="btn btn-sm btn-outline-secondary"
          onClick={() => onSetAdmin(entry, !entry.is_admin)}
          disabled={isLocked}
        >
          {entry.is_admin ? 'Odobrať správcu' : 'Spraviť správcom'}
        </button>
        <button
          className="btn btn-sm btn-outline-danger d-inline-flex align-items-center gap-1"
          onClick={() => onRemove(entry)}
          disabled={isLocked}
          aria-label={`Odobrať prístup ${entry.email}`}
        >
          <Icon name="trash" size={13} />
        </button>
      </div>
    </div>
  )
}

function AllowedEmailManager({ currentEmail, notify }) {
  const dialog = useDialog()
  const allowed = useAllowedEmails(notify)

  const confirmRemove = async (entry) => {
    const confirmed = await dialog.confirm({
      title: `Odobrať prístup ${entry.email}?`,
      text: 'Účet sa na verejnej adrese hneď odhlási a znova sa neprihlási.',
      confirmLabel: 'Odobrať',
      tone: 'danger',
    })
    if (confirmed) allowed.remove(entry)
  }

  return (
    <>
      <div className="card p-3 mb-4">
        <p className="text-muted fs-sm mb-3">
          Na verejnej adrese sa dá prihlásiť len Google účtom z tohto zoznamu. Kiosk na domácej sieti
          prihlásenie nepotrebuje.
        </p>
        <AddEmailForm onAdd={allowed.add} />
      </div>

      <div className="card p-3">
        <h2 className="mb-2 fs-md">Povolené účty</h2>
        {allowed.isLoading ? (
          <SkeletonRows count={3} />
        ) : allowed.entries.length === 0 ? (
          <EmptyState icon="shield" title="Zatiaľ nikto" text="Pridaj prvý Google účet, ktorý má mať prístup." />
        ) : (
          allowed.entries.map((entry) => (
            <EmailRow
              key={entry.email}
              entry={entry}
              isCurrentUser={entry.email === currentEmail}
              onSetAdmin={allowed.setAdmin}
              onRemove={confirmRemove}
            />
          ))
        )}
      </div>
    </>
  )
}

export default function AccessPage() {
  const { email, isAdmin } = useAuth()
  const flash = useFlashMessage(FLASH_DURATION_MS)

  return (
    <div className="container py-3">
      <PageHeader title="Prístupy" icon="shield" />
      <FlashAlert flash={flash} />
      {isAdmin ? (
        <AllowedEmailManager currentEmail={email} notify={flash.show} />
      ) : (
        <EmptyState
          icon="shield"
          title="Len pre správcov"
          text="Zoznam povolených Google účtov spravujú správcovia. Prihlás sa správcovským účtom na verejnej adrese."
        />
      )}
    </div>
  )
}
