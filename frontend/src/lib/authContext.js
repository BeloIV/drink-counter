import { createContext, useContext } from 'react'

export const AuthContext = createContext(null)

/**
 * Sign-in state from <GoogleAuthGate>: `email`, `canManageAccess` (Google admin, or the
 * admin PIN on the LAN), `requiresGoogleLogin` and `signOut`.
 */
export function useAuth() {
  const auth = useContext(AuthContext)
  if (!auth) throw new Error('useAuth must be used inside <GoogleAuthGate>')
  return auth
}
