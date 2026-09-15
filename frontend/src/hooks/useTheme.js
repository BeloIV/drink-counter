import { useEffect, useState } from 'react'

const STORAGE_KEY = 'theme'

// The kiosk is dark-first: without a stored choice the theme is dark.
const readStoredTheme = () => (localStorage.getItem(STORAGE_KEY) === 'light' ? 'light' : 'dark')

export function useTheme() {
  const [theme, setTheme] = useState(readStoredTheme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  const toggle = () => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))
  return { theme, toggle }
}
