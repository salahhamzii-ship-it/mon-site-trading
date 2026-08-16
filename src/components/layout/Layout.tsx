import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { useApp } from '../../context/AppContext'

export function Layout() {
  const { sidebarOpen } = useApp()

  return (
    <div style={{ height: '100vh', overflow: 'hidden', background: '#060810' }}>
      <div id="crt-overlay" />
      <Sidebar />
      <Header />
      <main
        style={{
          paddingTop: 40,
          marginLeft: sidebarOpen ? 224 : 64,
          height: '100vh',
          overflow: 'hidden',
          transition: 'margin-left 0.3s',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div className="p-6 animate-fade-in" style={{ height: '100%', overflow: 'hidden' }}>
          <Outlet />
        </div>
      </main>
    </div>
  )
}
