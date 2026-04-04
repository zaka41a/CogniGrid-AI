import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useAppStore } from '../../store'
import Sidebar from './Sidebar'
import Navbar from './Navbar'

export default function Layout() {
  const { setSidebarOpen } = useAppStore()
  const location = useLocation()

  // Collapse sidebar on mobile when navigating
  useEffect(() => {
    if (window.innerWidth < 768) {
      setSidebarOpen(false)
    }
  }, [location.pathname, setSidebarOpen])

  return (
    <div className="flex h-screen overflow-hidden bg-cg-bg">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="page-enter max-w-screen-2xl mx-auto" key={location.pathname}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
