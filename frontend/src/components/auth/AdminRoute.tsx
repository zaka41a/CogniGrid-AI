import { Navigate, useLocation } from 'react-router-dom'
import { useAppStore } from '../../store'

/**
 * Gates routes behind ADMIN role. Falls through to /login when not signed in,
 * and to /app/dashboard when signed in but not an admin (avoids leaking the
 * existence of an admin area).
 */
export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, currentUser } = useAppStore()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  if (currentUser.role !== 'ADMIN') {
    return <Navigate to="/app/dashboard" replace />
  }
  return <>{children}</>
}
