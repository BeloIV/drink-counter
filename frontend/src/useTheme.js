import { useEffect, useState } from 'react'

export function useTheme() {
  const getInitial = () => {
    const stored = localStorage.getItem('theme')
    if (stored === 'dark' || stored === 'light') return stored
    // Dark-first kiosk: bez uloženej voľby je default tmavá.
    return 'dark'
  }

  const [theme, setTheme] = useState(getInitial)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggle = () => setTheme(t => t === 'dark' ? 'light' : 'dark')
  return { theme, toggle }
}
