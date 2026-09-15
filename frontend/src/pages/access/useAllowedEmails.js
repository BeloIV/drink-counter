import { useCallback, useEffect, useState } from 'react'
import { api } from '../../api'
import { errorMessage } from '../../lib/errors'

/** The Google accounts allowed on the public domain, with add, admin toggle and remove actions. */
export function useAllowedEmails(notify) {
  const [entries, setEntries] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  const reload = useCallback(async () => {
    try {
      setEntries(await api.allowedEmails())
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  // Resolves to true on success, so a form knows when to clear itself.
  const run = async (action, successText) => {
    try {
      await api.csrf().catch(() => {})
      await action()
      await reload()
      notify(successText)
      return true
    } catch (error) {
      notify(errorMessage(error))
      return false
    }
  }

  return {
    entries,
    isLoading,
    add: (email, isAdmin) =>
      run(() => api.addAllowedEmail({ email, is_admin: isAdmin }), `${email} má prístup`),
    setAdmin: (entry, isAdmin) =>
      run(
        () => api.updateAllowedEmail(entry.email, { is_admin: isAdmin }),
        isAdmin ? `${entry.email} je správca` : `${entry.email} už nie je správca`,
      ),
    remove: (entry) => run(() => api.removeAllowedEmail(entry.email), `${entry.email} už nemá prístup`),
  }
}
