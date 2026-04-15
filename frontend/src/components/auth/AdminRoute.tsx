import { Navigate } from 'react-router-dom'

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const isAdmin = sessionStorage.getItem('cg_admin') === '1'
  if (!isAdmin) return <Navigate to="/admin/login" replace />
  return <>{children}</>
}
