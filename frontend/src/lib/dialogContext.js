import { createContext, useContext } from 'react'

export const DialogCtx = createContext(null)

/* Promise-based náhrada za window.prompt / confirm / alert.
   Natívne dialógy na kiosku vyzerajú ako chyba prehliadača. */
export function useDialog() {
  const ctx = useContext(DialogCtx)
  if (!ctx) throw new Error('useDialog musí byť vnútri <DialogProvider>')
  return ctx
}
