import { Routes, Route, Navigate } from 'react-router-dom'
import Layout         from './components/layout/Layout'
import ProtectedRoute from './components/auth/ProtectedRoute'
import Dashboard from './pages/Dashboard'
import Ingestion from './pages/Ingestion'
import Documents from './pages/Documents'
import Graph     from './pages/Graph'
import Rag       from './pages/Rag'
import AIEngine  from './pages/AIEngine'
import Agent     from './pages/Agent'
import Reports   from './pages/Reports'
import Alerts    from './pages/Alerts'
import Settings  from './pages/Settings'
import Login     from './pages/Login'
import Register  from './pages/Register'
import Home      from './pages/Home'
import Services  from './pages/Services'
import Contact   from './pages/Contact'
import Privacy   from './pages/Privacy'
import Terms     from './pages/Terms'

export default function App() {
  return (
    <Routes>
      {/* Public pages */}
      <Route path="/"         element={<Home />} />
      <Route path="/login"    element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/services" element={<Services />} />
      <Route path="/contact"  element={<Contact />} />
      <Route path="/privacy"  element={<Privacy />} />
      <Route path="/terms"    element={<Terms />} />

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
        <Route path="ai-engine"  element={<AIEngine />} />
        <Route path="agent"      element={<Agent />} />
        <Route path="reports"    element={<Reports />} />
        <Route path="alerts"     element={<Alerts />} />
        <Route path="settings"   element={<Settings />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
