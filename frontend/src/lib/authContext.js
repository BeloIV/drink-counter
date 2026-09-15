import { createContext, useContext } from 'react'

export const AuthContext = createContext(null)

/** Google sign-in state provided by <GoogleAuthGate>: `email`, `isAdmin` and `signOut`. */
export function useAuth() {
  const auth = useContext(AuthContext)
  if (!auth) throw new Error('useAuth must be used inside <GoogleAuthGate>')
  return auth
}
