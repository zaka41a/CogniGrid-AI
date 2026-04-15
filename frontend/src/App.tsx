import { Routes, Route, Navigate } from 'react-router-dom'
import Layout         from './components/layout/Layout'
import ProtectedRoute from './components/auth/ProtectedRoute'
import Dashboard  from './pages/Dashboard'
import Ingestion  from './pages/Ingestion'
import Documents  from './pages/Documents'
import Graph      from './pages/Graph'
import Rag        from './pages/Rag'
import Agent      from './pages/Agent'
import Alerts     from './pages/Alerts'
import Settings   from './pages/Settings'
import Profile    from './pages/Profile'
import Login      from './pages/Login'
import Register   from './pages/Register'
import Home       from './pages/Home'
import AdminLayout    from './pages/admin/AdminLayout'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminUsers     from './pages/admin/AdminUsers'
import AdminPlans     from './pages/admin/AdminPlans'
import AdminLogin     from './pages/admin/AdminLogin'
import AdminRoute     from './components/auth/AdminRoute'

export default function App() {
  return (
    <Routes>
      {/* Public pages */}
      <Route path="/"         element={<Home />} />
      <Route path="/login"    element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected app pages */}
      <Route path="/app" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="/app/dashboard" replace />} />
        <Route path="dashboard"  element={<Dashboard />} />
        <Route path="ingestion"  element={<Ingestion />} />
        <Route path="documents"  element={<Documents />} />
        <Route path="graph"      element={<Graph />} />
        <Route path="rag"        element={<Rag />} />
        <Route path="agent"      element={<Agent />} />
        <Route path="alerts"     element={<Alerts />} />
        <Route path="settings"   element={<Settings />} />
        <Route path="profile"    element={<Profile />} />
      </Route>

      {/* Admin login */}
      <Route path="/admin/login" element={<AdminLogin />} />

      {/* Admin pages — protected by AdminRoute (sessionStorage) */}
      <Route path="/admin" element={
        <AdminRoute>
          <AdminLayout />
        </AdminRoute>
      }>
        <Route index           element={<AdminDashboard />} />
        <Route path="users"    element={<AdminUsers />} />
        <Route path="plans"    element={<AdminPlans />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
