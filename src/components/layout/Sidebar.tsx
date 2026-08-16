import { NavLink } from 'react-router-dom'
import { useApp } from '../../context/AppContext'

const GRAD = {
  background: 'linear-gradient(135deg, #f0d070, #c9a84c)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
} as React.CSSProperties

const navItems = [
  { to: '/',        label: 'THE COCKPIT',      icon: '◉', end: true },
  { to: '/session', label: 'MARKET ORBIT',     icon: '◎' },
  { to: '/gex',     label: 'FLOW · GEX',       icon: '⚡' },
  { to: '/journal', label: 'THE LOGBOOK',      icon: '◈' },
  { to: '/setups',  label: 'NQ ROUTES',        icon: '▶' },
  { to: '/bible',   label: 'THE CODEX',        icon: '◆' },
  { to: '/plan',    label: 'THE WEEKLY ROUTE', icon: '◷' },
  { to: '/stats',   label: 'THE ARCHIVE',      icon: '▣' },
]

export function Sidebar() {
  const { sidebarOpen, setSidebarOpen } = useApp()

  return (
    <aside
      style={{
        position: 'fixed',
        top: 0, left: 0,
        height: '100%',
        width: sidebarOpen ? 224 : 64,
        background: '#07090f',
        borderRight: '1px solid rgba(201,168,76,0.14)',
        zIndex: 20,
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.3s',
        overflow: 'hidden',
      }}
    >
      {/* Brand */}
      <div style={{
        padding: sidebarOpen ? '16px 16px 12px' : '16px 0 12px',
        borderBottom: '1px solid rgba(201,168,76,0.12)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: sidebarOpen ? 'space-between' : 'center',
        gap: 8,
        minHeight: 72,
      }}>
        {sidebarOpen ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18, filter: 'drop-shadow(0 0 5px rgba(201,168,76,0.4))', flexShrink: 0 }}>🐪</span>
            <div>
              <div style={{
                ...GRAD,
                fontFamily: "'Orbitron', monospace",
                fontWeight: 900,
                fontSize: 8.5,
                letterSpacing: '0.14em',
                lineHeight: 1.3,
              }}>CAMEL MARKET<br/>COCKPIT</div>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 6.5,
                color: '#7a6a50',
                letterSpacing: '0.08em',
                marginTop: 2,
              }}>by SalahTataouine</div>
            </div>
          </div>
        ) : (
          <span style={{ fontSize: 18, filter: 'drop-shadow(0 0 5px rgba(201,168,76,0.4))' }}>🐪</span>
        )}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          style={{
            padding: '4px 6px',
            borderRadius: 4,
            background: 'transparent',
            border: '1px solid rgba(201,168,76,0.18)',
            color: '#7a6a50',
            cursor: 'pointer',
            fontSize: 9,
            lineHeight: 1,
            flexShrink: 0,
            transition: 'color 0.2s, border-color 0.2s',
          }}
          onMouseEnter={e => { (e.target as HTMLButtonElement).style.color = '#f0d070'; (e.target as HTMLButtonElement).style.borderColor = 'rgba(201,168,76,0.5)' }}
          onMouseLeave={e => { (e.target as HTMLButtonElement).style.color = '#7a6a50'; (e.target as HTMLButtonElement).style.borderColor = 'rgba(201,168,76,0.18)' }}
        >
          {sidebarOpen ? '◀' : '▶'}
        </button>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '8px 6px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
        {navItems.map(({ to, label, icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: sidebarOpen ? '8px 10px' : '8px 0',
              justifyContent: sidebarOpen ? 'flex-start' : 'center',
              borderRadius: 4,
              textDecoration: 'none',
              background: isActive ? 'rgba(201,168,76,0.09)' : 'transparent',
              border: `1px solid ${isActive ? 'rgba(201,168,76,0.28)' : 'transparent'}`,
              transition: 'all 0.2s',
            })}
            className={({ isActive }) => isActive ? 'cmc-nav-active' : 'cmc-nav'}
          >
            {({ isActive }) => (
              <>
                <span style={{
                  fontSize: 11,
                  color: isActive ? '#f0d070' : '#7a6a50',
                  flexShrink: 0,
                  textAlign: 'center',
                  width: sidebarOpen ? 'auto' : '100%',
                  transition: 'color 0.2s',
                }}>{icon}</span>
                {sidebarOpen && (
                  <span style={{
                    fontFamily: "'Orbitron', monospace",
                    fontSize: 7.5,
                    fontWeight: 700,
                    letterSpacing: '0.14em',
                    color: isActive ? '#f0d070' : '#7a6a50',
                    textShadow: isActive ? '0 0 12px rgba(240,208,112,0.45)' : 'none',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    transition: 'color 0.2s',
                  }}>{label}</span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      {sidebarOpen && (
        <div style={{
          padding: '10px 12px',
          borderTop: '1px solid rgba(201,168,76,0.1)',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 7.5,
          color: '#7a6a50',
          textAlign: 'center',
          letterSpacing: '0.08em',
        }}>
          NQ · CME · MÉTHODE SALAH
        </div>
      )}
    </aside>
  )
}
