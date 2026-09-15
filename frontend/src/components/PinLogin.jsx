import { useState } from 'react'
import { Icon } from './Icon'
import { Modal } from './Modal'

const WRONG_PIN_MESSAGE = 'Nesprávny PIN. Skús to znova.'

function usePinForm(onLogin) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')

  const changePin = (value) => {
    setPin(value)
    setError('')
  }

  const submit = async (event) => {
    event?.preventDefault()
    try {
      await onLogin(pin)
    } catch {
      setError(WRONG_PIN_MESSAGE)
      setPin('')
    }
  }

  return { pin, error, changePin, submit }
}

function PinField({ id, form, large = false, autoFocus = false }) {
  const errorId = `${id}-error`
  const sizeClass = large ? ' form-control-lg' : ''
  const errorClass = form.error ? ' is-invalid' : ''

  return (
    <>
      <label className="form-label" htmlFor={id}>PIN</label>
      <input
        id={id}
        type="password"
        inputMode="numeric"
        className={`form-control num${sizeClass}${errorClass}`}
        placeholder="••••"
        value={form.pin}
        onChange={(event) => form.changePin(event.target.value)}
        aria-describedby={form.error ? errorId : undefined}
        autoFocus={autoFocus}
        data-autofocus
      />
      {form.error && <div id={errorId} className="field-error mt-2">{form.error}</div>}
    </>
  )
}

/** Full-page PIN gate for admin-only pages; `children` render under the submit button. */
export function PinLoginCard({ title, onLogin, children }) {
  const form = usePinForm(onLogin)

  return (
    <div className="row justify-content-center mt-4">
      <div className="col-12 col-sm-8 col-md-6 col-lg-4">
        <div className="card">
          <div className="card-body p-4">
            <div className="text-center mb-4">
              <span className="page-header-icon mx-auto mb-3"><Icon name="admin" size={22} /></span>
              <h1 className="fs-lg">{title}</h1>
              <p className="text-muted mb-0 fs-sm">Táto sekcia je chránená PIN kódom.</p>
            </div>
            <form onSubmit={form.submit} noValidate>
              <div className="mb-3">
                <PinField id="admin-pin" form={form} large autoFocus />
              </div>
              <button type="submit" className="btn btn-primary btn-lg w-100" disabled={!form.pin}>
                Prihlásiť
              </button>
              {children}
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

/** PIN prompt for an admin-only action the backend refused. */
export function PinLoginModal({ subtitle, onLogin, onCancel }) {
  const form = usePinForm(onLogin)

  return (
    <Modal
      onClose={onCancel}
      icon="admin"
      size="sm"
      title="Admin prihlásenie"
      subtitle={subtitle}
      actions={
        <>
          <button type="button" className="btn btn-outline-secondary" onClick={onCancel}>Zrušiť</button>
          <button type="button" className="btn btn-primary" onClick={form.submit} disabled={!form.pin}>
            Prihlásiť
          </button>
        </>
      }
    >
      <form onSubmit={form.submit} noValidate>
        <PinField id="modal-pin" form={form} />
      </form>
    </Modal>
  )
}
