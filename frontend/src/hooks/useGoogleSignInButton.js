import { useEffect, useRef } from 'react'

// Loaded from Google on demand, so the kiosk on the LAN never downloads it.
const GOOGLE_IDENTITY_SCRIPT = 'https://accounts.google.com/gsi/client'

let scriptPromise = null

function loadGoogleIdentity() {
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = GOOGLE_IDENTITY_SCRIPT
      script.async = true
      script.onload = () => resolve(window.google)
      script.onerror = () => {
        scriptPromise = null
        reject(new Error('Google Identity Services failed to load'))
      }
      document.head.appendChild(script)
    })
  }
  return scriptPromise
}

/** Stop Google from signing the same account in again automatically after a sign-out. */
export const disableGoogleAutoSelect = () => window.google?.accounts.id.disableAutoSelect()

/**
 * Render the "Sign in with Google" button into the returned ref.
 * `onCredential` receives the ID token that the backend verifies.
 */
export function useGoogleSignInButton(clientId, onCredential, onLoadError) {
  const buttonRef = useRef(null)
  const callbacksRef = useRef({ onCredential, onLoadError })
  callbacksRef.current = { onCredential, onLoadError }

  useEffect(() => {
    if (!clientId) return
    let isCancelled = false

    loadGoogleIdentity()
      .then((google) => {
        if (isCancelled || !buttonRef.current) return
        google.accounts.id.initialize({
          client_id: clientId,
          callback: ({ credential }) => callbacksRef.current.onCredential(credential),
        })
        google.accounts.id.renderButton(buttonRef.current, {
          theme: 'filled_black',
          size: 'large',
          shape: 'pill',
          text: 'signin_with',
          locale: 'sk',
        })
      })
      .catch(() => callbacksRef.current.onLoadError())

    return () => { isCancelled = true }
  }, [clientId])

  return buttonRef
}
