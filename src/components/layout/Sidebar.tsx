import { NavLink } from 'react-router-dom'
import { useApp } from '../../context/AppContext'

const GRAD = {
  background: 'linear-gradient(135deg, #f0d070, #c9a84c)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
} as React.CSSProperties

const navItems = [
  { to: '/cockpit', label: 'CMC COCKPIT',       sub: 'Camel Market Cockpit', icon: '🐪' },
  { to: '/',        label: 'THE COCKPIT',      sub: 'Dashboard principal',  icon: '◉', end: true },
  { to: '/gex',     label: 'FLOW · GEX',       sub: 'GEX Panel · Options',  icon: '⚡' },
  { to: '/journal', label: 'THE LOGBOOK',      sub: 'Journal de trading',   icon: '◈' },
  { to: '/setups',  label: 'NQ ROUTES',        sub: 'Setups NQ',            icon: '▶' },
  { to: '/bible',   label: 'THE CODEX',        sub: 'Bible Méthode Salah',  icon: '◆' },
  { to: '/plan',    label: 'WEEKLY ROUTE',     sub: 'Plan de la semaine',   icon: '◷' },
  { to: '/stats',   label: 'THE ARCHIVE',      sub: 'Statistiques',         icon: '▣' },
]

export function Sidebar() {
  const { sidebarOpen, setSidebarOpen } = useApp()

  return (
    <aside style={{
      position: 'fixed',
      top: 0, left: 0,
      height: '100%',
      width: sidebarOpen ? 224 : 64,
      background: 'linear-gradient(180deg, #07090f, #060810)',
      borderRight: '1px solid rgba(201,168,76,0.14)',
      zIndex: 20,
      display: 'flex',
      flexDirection: 'column',
      transition: 'width 0.3s',
      overflow: 'hidden',
    }}>
      {/* Brand */}
      <div style={{
        padding: sidebarOpen ? '18px 14px 14px' : '18px 0 14px',
        borderBottom: '1px solid rgba(201,168,76,0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: sidebarOpen ? 'space-between' : 'center',
        gap: 8,
        minHeight: 80,
        textAlign: sidebarOpen ? 'left' : 'center',
      }}>
        {sidebarOpen ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 28, filter: 'drop-shadow(0 0 8px rgba(201,168,76,0.5))', flexShrink: 0, marginBottom: 2 }}>🐪</span>
            <div>
              <div style={{
                ...GRAD,
                fontFamily: "'Orbitron', monospace",
                fontWeight: 900, fontSize: 11,
                letterSpacing: '0.18em', lineHeight: 1.3, marginBottom: 4,
              }}>CAMEL MARKET<br />COCKPIT</div>
              {/* Separator */}
              <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(240,208,112,0.4), transparent)', margin: '4px 0' }} />
              <div style={{ fontSize: 11, fontWeight: 600, color: '#f0d070', letterSpacing: '0.08em', textShadow: '0 0 10px rgba(240,208,112,0.45)' }}>by SalahTataouine</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 7, letterSpacing: '0.18em', color: 'rgba(30,179,188,0.5)', marginTop: 3 }}>NQ · ES · MARKET READING SYSTEM</div>
            </div>
          </div>
        ) : (
          <span style={{ fontSize: 22, filter: 'drop-shadow(0 0 5px rgba(201,168,76,0.4))' }}>🐪</span>
        )}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          style={{
            padding: '4px 6px', borderRadius: 4,
            background: 'transparent', border: '1px solid rgba(201,168,76,0.18)',
            color: '#7a6a50', cursor: 'pointer', fontSize: 9, lineHeight: 1,
            flexShrink: 0, transition: 'color 0.2s, border-color 0.2s',
          }}
          onMouseEnter={e => {
            const b = e.target as HTMLButtonElement
            b.style.color = '#f0d070'
            b.style.borderColor = 'rgba(201,168,76,0.5)'
          }}
          onMouseLeave={e => {
            const b = e.target as HTMLButtonElement
            b.style.color = '#7a6a50'
            b.style.borderColor = 'rgba(201,168,76,0.18)'
          }}
        >
          {sidebarOpen ? '◀' : '▶'}
        </button>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '8px 8px', display: 'flex', flexDirection: 'column', gap: 1, overflowY: 'auto' }}>
        {navItems.map(({ to, label, sub, icon, end }) => (
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
              background: isActive
                ? 'linear-gradient(90deg, rgba(201,168,76,0.12), rgba(201,168,76,0.03))'
                : 'transparent',
              border: isActive
                ? '1px solid rgba(201,168,76,0.3)'
                : '1px solid transparent',
              borderLeft: isActive ? '2px solid #c9a84c' : '2px solid transparent',
              transition: 'all 0.15s',
            })}
          >
            {({ isActive }) => (
              <>
                <span style={{
                  fontSize: 11,
                  color: isActive ? '#c9a84c' : 'rgba(136,153,187,0.5)',
                  flexShrink: 0,
                  textAlign: 'center',
                  width: sidebarOpen ? 'auto' : '100%',
                  transition: 'color 0.2s',
                }}>{icon}</span>
                {sidebarOpen && (
                  <div>
                    <div style={{
                      fontFamily: "'Orbitron', monospace",
                      fontSize: 8, fontWeight: 700,
                      letterSpacing: '0.14em',
                      color: isActive ? '#c9a84c' : 'rgba(180,170,145,0.7)',
                      transition: 'color 0.2s',
                      whiteSpace: 'nowrap', overflow: 'hidden',
                    }}>{label}</div>
                    <div style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 7,
                      color: 'rgba(136,153,187,0.4)',
                      marginTop: 1,
                    }}>{sub}</div>
                  </div>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div style={{
        padding: '10px 14px',
        borderTop: '1px solid rgba(201,168,76,0.08)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: sidebarOpen ? 'flex-start' : 'center' }}>
          <div style={{
            width: 5, height: 5, borderRadius: '50%',
            background: '#00ff88', animation: 'pulseDot 1.8s ease-in-out infinite',
            flexShrink: 0,
          }} />
          {sidebarOpen && (
            <span style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 8, letterSpacing: '0.12em', color: 'rgba(0,255,136,0.7)',
            }}>LIVE · RTH ACTIF</span>
          )}
        </div>
      </div>
    </aside>
  )
}
