import { NavLink } from 'react-router-dom'
import { useApp } from '../../context/AppContext'

const navItems = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/journal', label: 'Journal', icon: '📓' },
  { to: '/setups', label: 'Setups NQ', icon: '🎯' },
  { to: '/bible', label: 'Bible', icon: '📖' },
  { to: '/plan', label: 'Plan Semaine', icon: '📅' },
  { to: '/stats', label: 'Statistiques', icon: '📈' },
  { to: '/niveaux', label: 'Niveaux Clés', icon: '🔑' },
]

export function Sidebar() {
  const { sidebarOpen, setSidebarOpen } = useApp()

  return (
    <aside
      className={`fixed top-0 left-0 h-full bg-surface-card border-r border-surface-border z-20 flex flex-col transition-all duration-300 ${
        sidebarOpen ? 'w-56' : 'w-16'
      }`}
    >
      <div className="flex items-center justify-between p-4 border-b border-surface-border">
        {sidebarOpen && (
          <div className="flex flex-col">
            <span className="font-bold text-white text-sm leading-tight">NQ100</span>
            <span className="text-xs text-brand-400">Trading Bible</span>
          </div>
        )}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-1.5 rounded-lg hover:bg-surface-hover text-slate-400 hover:text-white transition-colors ml-auto"
        >
          {sidebarOpen ? '◀' : '▶'}
        </button>
      </div>

      <nav className="flex-1 p-2 flex flex-col gap-1 mt-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${
                isActive
                  ? 'bg-brand-600/20 text-brand-300 border border-brand-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-surface-hover'
              }`
            }
          >
            <span className="text-base flex-shrink-0">{item.icon}</span>
            {sidebarOpen && <span className="truncate">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-surface-border">
        {sidebarOpen && (
          <div className="text-xs text-slate-500 text-center">Salah • NQ Trader</div>
        )}
      </div>
    </aside>
  )
}
