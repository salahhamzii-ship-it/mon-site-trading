import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { useApp } from '../../context/AppContext'

export function Layout() {
  const { sidebarOpen } = useApp()

  return (
    <div className="min-h-screen bg-surface text-white">
      <Sidebar />
      <Header />
      <main
        className={`pt-14 min-h-screen transition-all duration-300 ${
          sidebarOpen ? 'ml-56' : 'ml-16'
        }`}
      >
        <div className="p-6 animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
