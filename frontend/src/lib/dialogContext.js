import { createContext, useContext } from 'react'

export const DialogContext = createContext(null)

/** Promise-based confirm and prompt dialogs, provided by <DialogProvider>. */
export function useDialog() {
  const dialog = useContext(DialogContext)
  if (!dialog) throw new Error('useDialog must be used inside <DialogProvider>')
  return dialog
}
