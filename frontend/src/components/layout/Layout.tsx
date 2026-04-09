import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useAppStore } from '../../store'
import Sidebar from './Sidebar'
import Navbar  from './Navbar'

export default function Layout() {
  const { setSidebarOpen } = useAppStore()
  const location = useLocation()

  useEffect(() => {
    if (window.innerWidth < 768) setSidebarOpen(false)
  }, [location.pathname, setSidebarOpen])

  return (
    <div className="flex h-screen overflow-hidden bg-cg-bg">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 max-w-screen-2xl mx-auto anim-slide-up" key={location.pathname}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
