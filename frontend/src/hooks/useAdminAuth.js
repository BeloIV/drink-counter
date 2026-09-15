import { useEffect, useRef, useState } from 'react'
import { api } from '../api'

/** Admin PIN session: checks it on mount and runs `onAuthenticated` once logged in. */
export function useAdminAuth(onAuthenticated) {
  const [isAdmin, setIsAdmin] = useState(false)
  const [isChecking, setIsChecking] = useState(true)
  const onAuthenticatedRef = useRef(onAuthenticated)
  onAuthenticatedRef.current = onAuthenticated

  useEffect(() => {
    api.csrf().catch(() => {})
    api.adminCheck()
      .then(() => {
        setIsAdmin(true)
        onAuthenticatedRef.current?.()
      })
      .catch(() => {})
      .finally(() => setIsChecking(false))
  }, [])

  const login = async (pin) => {
    await api.csrf()
    await api.login(pin)
    setIsAdmin(true)
    await onAuthenticatedRef.current?.()
  }

  const logout = async () => {
    await api.logout()
    setIsAdmin(false)
  }

  const expireSession = () => setIsAdmin(false)

  return { isAdmin, isChecking, login, logout, expireSession }
}
