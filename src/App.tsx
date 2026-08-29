import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import Dashboard from './pages/Dashboard'
import Journal from './pages/Journal'
import Setups from './pages/Setups'
import Bible from './pages/Bible'
import PlanSemaine from './pages/PlanSemaine'
import Stats from './pages/Stats'
import SessionAnalyzer from './pages/SessionAnalyzer'
import GEXPanel from './pages/GEXPanel'
import Calculateur from './pages/Calculateur'

export default function App() {
  return (
    <Routes>
      {/* Cockpit v3 — full-screen, no Layout wrapper */}
      <Route path="/cockpit" element={<iframe src="/cockpit-v3.html" style={{width:'100vw',height:'100vh',border:'none',display:'block'}} title="Cockpit v3" />} />

      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="journal" element={<Journal />} />
        <Route path="setups" element={<Setups />} />
        <Route path="bible" element={<Bible />} />
        <Route path="plan" element={<PlanSemaine />} />
        <Route path="stats" element={<Stats />} />
        <Route path="session" element={<SessionAnalyzer />} />
        <Route path="gex" element={<GEXPanel />} />
        <Route path="calc" element={<Calculateur />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
