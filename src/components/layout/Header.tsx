import { useApp } from '../../context/AppContext'

export function Header() {
  const { sidebarOpen, toggleTheme } = useApp()

  return (
    <header
      className={`fixed top-0 right-0 h-14 bg-surface-card/80 backdrop-blur border-b border-surface-border z-10 flex items-center px-4 gap-4 transition-all duration-300 ${
        sidebarOpen ? 'left-56' : 'left-16'
      }`}
    >
      <div className="flex-1" />

      <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
        <span className="h-2 w-2 rounded-full bg-profit animate-pulse" />
        NQ • Live
      </div>

      <button
        onClick={toggleTheme}
        className="p-2 rounded-lg hover:bg-surface-hover text-slate-400 hover:text-white transition-colors"
        title="Toggle theme"
      >
        🌙
      </button>
    </header>
  )
}
