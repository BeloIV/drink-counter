import { useEffect, useState } from 'react'

/**
 * Password gate for the public hostname. The backend answers 401 until the
 * login sets its (httpOnly) site cookie, so the gate probes instead of
 * reading the cookie.
 */
export default function SiteAuth({ children }) {
  const [isLocked, setIsLocked] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isChecking, setIsChecking] = useState(false)

  useEffect(() => {
    fetch('/api/health')
      .then((response) => {
        if (response.status === 401) setIsLocked(true)
      })
      .catch(() => {})
  }, [])

  const unlock = async (event) => {
    event.preventDefault()
    setIsChecking(true)
    setError('')
    try {
      const response = await fetch('/__site-login__', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const result = await response.json()
      if (result.ok) setIsLocked(false)
      else setError('Wrong password')
    } catch {
      setError('Connection error')
    } finally {
      setIsChecking(false)
    }
  }

  if (!isLocked) return children

  return (
    <div className="site-auth">
      <form onSubmit={unlock} className="site-auth-form">
        <h2 className="site-auth-title">Drink Counter</h2>
        {error && <p className="site-auth-error">{error}</p>}
        <input
          type="password"
          className="form-control"
          placeholder="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoFocus
        />
        <button type="submit" className="btn btn-primary" disabled={isChecking}>
          {isChecking ? 'Checking...' : 'Enter'}
        </button>
      </form>
    </div>
  )
}
