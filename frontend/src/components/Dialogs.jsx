import { useCallback, useRef, useState } from 'react'
import { Modal } from './Modal'
import { DialogContext } from '../lib/dialogContext'

function PromptField({ label, placeholder, maxLength = 60, value, onChange, onSubmit }) {
  return (
    <form onSubmit={onSubmit}>
      {label && <label className="form-label" htmlFor="dialog-prompt-input">{label}</label>}
      <input
        id="dialog-prompt-input"
        className="form-control"
        data-autofocus
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
      />
    </form>
  )
}

/**
 * Replaces window.confirm and window.prompt, which look like browser errors on
 * the fullscreen kiosk. `confirm` resolves to true/false, `prompt` to the
 * trimmed text or null.
 */
export function DialogProvider({ children }) {
  const [dialog, setDialog] = useState(null)
  const [value, setValue] = useState('')
  const resolveRef = useRef(null)

  const open = useCallback((config) => {
    setValue(config.initial ?? '')
    setDialog(config)
    return new Promise((resolve) => { resolveRef.current = resolve })
  }, [])

  const settle = useCallback((result) => {
    setDialog(null)
    setValue('')
    resolveRef.current?.(result)
    resolveRef.current = null
  }, [])

  const dialogApi = useRef({
    confirm: (options = {}) => open({ ...options, kind: 'confirm' }),
    prompt: (options = {}) => open({ ...options, kind: 'prompt' }),
  }).current

  const isPrompt = dialog?.kind === 'prompt'
  const cancel = () => settle(isPrompt ? null : false)

  const submit = (event) => {
    event?.preventDefault()
    if (!isPrompt) {
      settle(true)
      return
    }
    const text = value.trim()
    if (text) settle(text)
  }

  return (
    <DialogContext.Provider value={dialogApi}>
      {children}

      {dialog && (
        <Modal
          onClose={cancel}
          title={dialog.title}
          subtitle={dialog.text}
          icon={dialog.icon ?? (dialog.tone === 'danger' ? 'warning' : undefined)}
          tone={dialog.tone}
          size="sm"
          actions={
            <>
              <button type="button" className="btn btn-outline-secondary" onClick={cancel}>
                {dialog.cancelLabel ?? 'Zrušiť'}
              </button>
              <button
                type="button"
                className={`btn ${dialog.tone === 'danger' ? 'btn-danger' : 'btn-primary'}`}
                onClick={submit}
                disabled={isPrompt && !value.trim()}
                {...(isPrompt ? {} : { 'data-autofocus': true })}
              >
                {dialog.confirmLabel ?? 'Potvrdiť'}
              </button>
            </>
          }
        >
          {isPrompt && <PromptField {...dialog} value={value} onChange={setValue} onSubmit={submit} />}
        </Modal>
      )}
    </DialogContext.Provider>
  )
}
