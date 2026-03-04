import { useTheme } from './useTheme'

export function ThemeToggle() {
  const { theme, toggle } = useTheme()
  return (
    <button className="theme-toggle" onClick={toggle} title="Prepnúť tému">
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  )
}
