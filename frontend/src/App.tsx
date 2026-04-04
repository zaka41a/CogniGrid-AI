import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/layout/Layout'
import Dashboard  from './pages/Dashboard'
import Ingestion  from './pages/Ingestion'
import Graph      from './pages/Graph'
import AIEngine   from './pages/AIEngine'
import Agent      from './pages/Agent'
import Alerts     from './pages/Alerts'
import Settings   from './pages/Settings'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard"  element={<Dashboard />} />
        <Route path="ingestion"  element={<Ingestion />} />
        <Route path="graph"      element={<Graph />} />
        <Route path="ai-engine"  element={<AIEngine />} />
        <Route path="agent"      element={<Agent />} />
        <Route path="alerts"     element={<Alerts />} />
        <Route path="settings"   element={<Settings />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  )
}
