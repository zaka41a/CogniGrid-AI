import { Routes, Route, Navigate } from 'react-router-dom'
import Layout         from './components/layout/Layout'
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
import AssumeWorkspace from './pages/assume/AssumeWorkspace'
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
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="/app/dashboard" replace />} />
        {/* Platform */}
        <Route path="dashboard"     element={<Dashboard />} />
        <Route path="ingestion"     element={<Ingestion />} />
        <Route path="documents"     element={<Documents />} />
        {/* Intelligence */}
        <Route path="graph"         element={<Graph />} />
        <Route path="network"       element={<Network />} />
        <Route path="rag"           element={<Rag />} />
        <Route path="agent"         element={<Agent />} />
        {/* Operations */}
        <Route path="alerts"        element={<Alerts />} />
        <Route path="data-overview" element={<DataOverview />} />
        <Route path="data-quality"  element={<DataQuality />} />
        {/* Simulation */}
        <Route path="assume"        element={<AssumeWorkspace />} />
        {/* Account */}
        <Route path="settings"      element={<Settings />} />
        {/* Admin (gated by ADMIN role inside the protected layout) */}
        <Route path="admin"         element={<AdminRoute><Admin /></AdminRoute>} />
        {/* Legacy redirect */}
        <Route path="profile"       element={<Navigate to="/app/settings" replace />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
