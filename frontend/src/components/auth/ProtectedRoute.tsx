import { Navigate, useLocation } from 'react-router-dom'
import { useAppStore } from '../../store'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAppStore(s => s.isAuthenticated)
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}
