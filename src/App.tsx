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

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="journal" element={<Journal />} />
        <Route path="setups" element={<Setups />} />
        <Route path="bible" element={<Bible />} />
        <Route path="plan" element={<PlanSemaine />} />
        <Route path="stats" element={<Stats />} />
        <Route path="session" element={<SessionAnalyzer />} />
        <Route path="gex" element={<GEXPanel />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
