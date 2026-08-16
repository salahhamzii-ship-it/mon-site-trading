import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { useApp } from '../../context/AppContext'

export function Layout() {
  const { sidebarOpen } = useApp()

  return (
    <div style={{ minHeight: '100vh', background: '#060810' }}>
      <Sidebar />
      <Header />
      <main
        style={{
          paddingTop: 72,
          marginLeft: sidebarOpen ? 224 : 64,
          minHeight: '100vh',
          transition: 'margin-left 0.3s',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div className="p-6 animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
