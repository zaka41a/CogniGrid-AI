import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import Layout         from './components/layout/Layout'
import Hub            from './pages/Hub'
import ProtectedRoute from './components/auth/ProtectedRoute'
import AdminRoute     from './components/auth/AdminRoute'
import Admin          from './pages/Admin'
import Dashboard      from './pages/Dashboard'
import Ingestion      from './pages/Ingestion'
import Documents      from './pages/Documents'
import Graph          from './pages/Graph'
import Network        from './pages/Network'
import Rag            from './pages/Rag'
import Agent          from './pages/Agent'
import Alerts         from './pages/Alerts'
import DataOverview   from './pages/DataOverview'
import DataQuality    from './pages/DataQuality'
import Settings       from './pages/Settings'
import AssumeStudio from './pages/assume/AssumeStudio'
import Login    from './pages/Login'
import Register from './pages/Register'
import Home     from './pages/Home'

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
          <Outlet />
        </ProtectedRoute>
      }>
        {/* Universe chooser (full screen, no sidebar) */}
        <Route index element={<Hub />} />

        {/* Working pages - rendered inside the Layout (sidebar + navbar) */}
        <Route element={<Layout />}>
          {/* Knowledge Graph Studio */}
          <Route path="dashboard"     element={<Dashboard />} />
          <Route path="ingestion"     element={<Ingestion />} />
          <Route path="documents"     element={<Documents />} />
          <Route path="graph"         element={<Graph />} />
          <Route path="network"       element={<Network />} />
          <Route path="rag"           element={<Rag />} />
          <Route path="agent"         element={<Agent />} />
          <Route path="alerts"        element={<Alerts />} />
          <Route path="data-overview" element={<DataOverview />} />
          <Route path="data-quality"  element={<DataQuality />} />
          {/* ASSUME Lab */}
          <Route path="assume"        element={<AssumeStudio />} />
          {/* Account */}
          <Route path="settings"      element={<Settings />} />
          {/* Admin (gated by ADMIN role) */}
          <Route path="admin"         element={<AdminRoute><Admin /></AdminRoute>} />
          {/* Legacy redirect */}
          <Route path="profile"       element={<Navigate to="/app/settings" replace />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
