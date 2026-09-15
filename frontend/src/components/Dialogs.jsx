import { useCallback, useRef, useState } from 'react'
import { Modal } from './Modal'
import { DialogCtx } from '../lib/dialogContext'

/* Náhrada za window.prompt / confirm / alert.
   Natívne dialógy na kiosku vyzerajú ako chyba prehliadača a na
   fullscreen tablete sa zle ovládajú. API je promise-based, takže sa
   volajú rovnako ako pôvodné natívne funkcie. */

export function DialogProvider({ children }) {
  const [dialog, setDialog] = useState(null)
  const [value, setValue] = useState('')
  const resolveRef = useRef(null)

  const open = useCallback((config) => {
    setValue(config.initial ?? '')
    setDialog(config)
    return new Promise(resolve => { resolveRef.current = resolve })
  }, [])

  const settle = useCallback((result) => {
    setDialog(null)
    setValue('')
    resolveRef.current?.(result)
    resolveRef.current = null
  }, [])

  const api = useRef({
    confirm: (o = {}) => open({ ...o, kind: 'confirm' }),
    prompt:  (o = {}) => open({ ...o, kind: 'prompt' }),
    alert:   (o = {}) => open({ ...o, kind: 'alert' }),
  }).current

  const kind = dialog?.kind
  const cancelValue = kind === 'prompt' ? null : kind === 'confirm' ? false : undefined

  const submit = (e) => {
    e?.preventDefault()
    if (kind === 'prompt') {
      const v = value.trim()
      if (!v) return
      settle(v)
    } else {
      settle(kind === 'confirm' ? true : undefined)
    }
  }

  return (
    <DialogCtx.Provider value={api}>
      {children}

      {dialog && (
        <Modal
          onClose={() => settle(cancelValue)}
          title={dialog.title}
          subtitle={dialog.text}
          icon={dialog.icon ?? (dialog.tone === 'danger' ? 'warning' : undefined)}
          tone={dialog.tone}
          size="sm"
          actions={
            <>
              {kind !== 'alert' && (
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => settle(cancelValue)}
                >
                  {dialog.cancelLabel ?? 'Zrušiť'}
                </button>
              )}
              <button
                type="button"
                className={`btn ${dialog.tone === 'danger' ? 'btn-danger' : 'btn-primary'}`}
                onClick={submit}
                disabled={kind === 'prompt' && !value.trim()}
                {...(kind !== 'prompt' ? { 'data-autofocus': true } : {})}
              >
                {dialog.confirmLabel ?? (kind === 'alert' ? 'Rozumiem' : 'Potvrdiť')}
              </button>
            </>
          }
        >
          {kind === 'prompt' && (
            <form onSubmit={submit}>
              {dialog.label && (
                <label className="form-label" htmlFor="dc-prompt-input">{dialog.label}</label>
              )}
              <input
                id="dc-prompt-input"
                className="form-control"
                data-autofocus
                value={value}
                placeholder={dialog.placeholder}
                maxLength={dialog.maxLength ?? 60}
                onChange={e => setValue(e.target.value)}
              />
            </form>
          )}
        </Modal>
      )}
    </DialogCtx.Provider>
  )
}
