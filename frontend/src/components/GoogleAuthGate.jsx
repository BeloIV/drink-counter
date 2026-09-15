import { useCallback, useEffect, useMemo, useState } from 'react'
import { AUTH_CHANGED_EVENT, api } from '../api'
import { disableGoogleAutoSelect, useGoogleSignInButton } from '../hooks/useGoogleSignInButton'
import { AuthContext } from '../lib/authContext'
import { parseErrorBody } from '../lib/errors'
import logo from '/favicon.png'

// Used when the status request itself fails: render the app and let its own requests report errors.
const UNKNOWN_STATUS = { login_required: false, email: null, is_allowed: false, is_admin: false, client_id: '' }

function useAuthStatus() {
  const [status, setStatus] = useState(null)

  const refresh = useCallback(
    () => api.authStatus().then(setStatus).catch(() => setStatus(UNKNOWN_STATUS)),
    [],
  )

  useEffect(() => {
    refresh()
    // api.js fires this when the backend reports a missing or revoked Google session.
    window.addEventListener(AUTH_CHANGED_EVENT, refresh)
    return () => window.removeEventListener(AUTH_CHANGED_EVENT, refresh)
  }, [refresh])

  return [status, setStatus]
}

function AuthScreen({ children }) {
  return (
    <div className="auth-gate">
      <div className="auth-gate-card">
        <img src={logo} alt="" className="auth-gate-logo" />
        <h1 className="auth-gate-title">Drink Counter</h1>
        {children}
      </div>
    </div>
  )
}

function signInErrorText(error) {
  if (error.status === 403) {
    const email = parseErrorBody(error)?.email
    return `Účet ${email ?? ''} nemá prístup. Požiadaj správcu, aby ťa pridal.`
  }
  return 'Prihlásenie zlyhalo, skús to znova.'
}

function SignInScreen({ clientId, onSignedIn }) {
  const [error, setError] = useState('')

  const signIn = async (credential) => {
    setError('')
    try {
      await api.csrf()
      onSignedIn(await api.googleLogin(credential))
    } catch (signInError) {
      setError(signInErrorText(signInError))
    }
  }

  const buttonRef = useGoogleSignInButton(clientId, signIn, () =>
    setError('Google prihlásenie sa nepodarilo načítať.'),
  )

  return (
    <AuthScreen>
      <p className="auth-gate-text">Prihlás sa Google účtom, ktorý pridal správca.</p>
      {clientId
        ? <div ref={buttonRef} className="auth-gate-button" />
        : <p className="auth-gate-error">Prihlásenie cez Google ešte nie je nastavené.</p>}
      {error && <p className="auth-gate-error" role="alert">{error}</p>}
    </AuthScreen>
  )
}

function DeniedScreen({ email, onSignOut }) {
  return (
    <AuthScreen>
      <p className="auth-gate-error" role="alert">Účet {email} už nemá prístup.</p>
      <button className="btn btn-outline-secondary" onClick={onSignOut}>Prihlásiť sa iným účtom</button>
    </AuthScreen>
  )
}

/**
 * On the public domain, shows the app only to signed-in Google accounts from
 * the allowlist. On the LAN the backend reports no login requirement and the
 * app renders straight away.
 */
export default function GoogleAuthGate({ children }) {
  const [status, setStatus] = useAuthStatus()

  const signOut = useCallback(async () => {
    disableGoogleAutoSelect()
    setStatus(await api.googleLogout())
  }, [setStatus])

  const auth = useMemo(
    () => ({ email: status?.email ?? null, isAdmin: Boolean(status?.is_admin), signOut }),
    [status, signOut],
  )

  if (!status) return null
  if (status.login_required && !status.email) {
    return <SignInScreen clientId={status.client_id} onSignedIn={setStatus} />
  }
  if (status.login_required && !status.is_allowed) {
    return <DeniedScreen email={status.email} onSignOut={signOut} />
  }
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>
}
