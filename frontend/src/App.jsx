import { Navigate, Route, Routes } from 'react-router-dom'
import AppShell from './components/layout/AppShell'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import CalculatorPage from './pages/Calculator'
import Predict from './pages/Predict'
import Advisor from './pages/Advisor'
import HistoryPage from './pages/History'
import Methodology from './pages/Methodology'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/app" element={<AppShell />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="calculator" element={<CalculatorPage />} />
        <Route path="predict" element={<Predict />} />
        <Route path="advisor" element={<Advisor />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="methodology" element={<Methodology />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
