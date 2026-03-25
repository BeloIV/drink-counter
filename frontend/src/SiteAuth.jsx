import { useEffect, useState } from 'react'

function getCookie(name) {
  return document.cookie.split('; ').some(c => c.startsWith(name + '='))
}

export default function SiteAuth({ children }) {
  const [locked, setLocked] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!getCookie('_site_auth')) {
      // Probe the backend to see if auth is required
      fetch('/api/health').then(res => {
        if (res.status === 401) setLocked(true)
      }).catch(() => {})
    }
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/__site-login__', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await res.json()
      if (data.ok) {
        setLocked(false)
      } else {
        setError('Wrong password')
      }
    } catch {
      setError('Connection error')
    } finally {
      setLoading(false)
    }
  }

  if (!locked) return children

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#111', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 9999,
    }}>
      <form onSubmit={handleSubmit} style={{
        display: 'flex', flexDirection: 'column', gap: 12, width: 280,
        fontFamily: 'sans-serif', color: '#eee',
      }}>
        <h2 style={{ margin: 0, textAlign: 'center' }}>Drink Counter</h2>
        {error && <p style={{ color: '#f87', margin: 0, fontSize: 14 }}>{error}</p>}
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          autoFocus
          style={{
            padding: 10, borderRadius: 6, border: '1px solid #444',
            background: '#222', color: '#eee', fontSize: 16,
          }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: 10, borderRadius: 6, border: 'none',
            background: '#4f8ef7', color: 'white', fontSize: 16, cursor: 'pointer',
          }}
        >
          {loading ? 'Checking...' : 'Enter'}
        </button>
      </form>
    </div>
  )
}
