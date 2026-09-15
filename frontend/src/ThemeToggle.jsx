import { useTheme } from './useTheme'
import { Icon } from './components/Icon'

export function ThemeToggle() {
  const { theme, toggle } = useTheme()
  return (
    <button
      className="hamburger-btn"
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Prepnúť na svetlý režim' : 'Prepnúť na tmavý režim'}
      title={theme === 'dark' ? 'Svetlý režim' : 'Tmavý režim'}
    >
      <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={20} />
    </button>
  )
}
