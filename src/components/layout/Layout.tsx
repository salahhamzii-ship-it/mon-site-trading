import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { useApp } from '../../context/AppContext'

export function Layout() {
  const { sidebarOpen } = useApp()

  return (
    <div style={{ height: '100vh', overflow: 'hidden', background: '#0e1017', display: 'flex' }}>
      <div id="crt-overlay" />

      {/* Moving scan beam */}
      <div style={{
        position: 'fixed', left: 0, right: 0, height: 50, zIndex: 5,
        pointerEvents: 'none',
        background: 'linear-gradient(180deg, transparent, rgba(201,168,76,0.015), transparent)',
        animation: 'scan 12s linear infinite',
      }} />

      <Sidebar />

      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        overflow: 'hidden',
        marginLeft: sidebarOpen ? 224 : 64,
        transition: 'margin-left 0.3s',
      }}>
        <Header />
        <main style={{
          flex: 1,
          overflowY: 'auto',
          position: 'relative',
          zIndex: 1,
        }}>
          <div className="animate-fade-in" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
