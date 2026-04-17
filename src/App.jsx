// App.jsx — SourceHUB main router.
// Route structure:
//   /                    Login
//   /tool-launcher       SourceHUB home (all tools)
//   /quotex/dashboard    QuoteX analytics
//   /quotex/tracker      QuoteX quotation tracker
//   /quotex/new          QuoteX new quotation
//   /admin/*             Super admin panel

import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { TOOLS }   from './config/platform'

import Login           from './pages/Login'
import ToolLauncher    from './pages/ToolLauncher'

// QuoteX tool pages
import Dashboard       from './pages/quotex/Dashboard'
import Tracker         from './pages/quotex/Tracker'
import NewQuotation    from './pages/quotex/NewQuotation'

// Admin pages
import AdminLayout        from './pages/admin/AdminLayout'
import AdminDashboard     from './pages/admin/AdminDashboard'
import AdminTenants       from './pages/admin/AdminTenants'
import AdminTenantDetail  from './pages/admin/AdminTenantDetail'
import AdminUserDetail    from './pages/admin/AdminUserDetail'
import AdminTools         from './pages/admin/AdminTools'

const QUOTEX_ROUTES = TOOLS.quotex.routes

// ── Protected Route ───────────────────────────
function ProtectedRoute({ children }) {
  const { isLoggedIn, isLoading } = useAuth()
  if (isLoading) return <div style={{ padding: 40 }}>Loading...</div>
  if (!isLoggedIn) return <Navigate to="/" />
  return children
}

// ── Super Admin Route ─────────────────────────
function SuperAdminRoute({ children }) {
  const { isLoggedIn, isLoading, user } = useAuth()
  if (isLoading) return <div style={{ padding: 40 }}>Loading...</div>
  if (!isLoggedIn) return <Navigate to="/" />
  if (user?.role !== 'super_admin') return <Navigate to="/tool-launcher" />
  return children
}

function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Login />} />

      {/* SourceHUB launcher — home for all tenant users */}
      <Route path="/tool-launcher" element={
        <ProtectedRoute><ToolLauncher /></ProtectedRoute>
      } />

      {/* QuoteX tool routes */}
      <Route path={QUOTEX_ROUTES.dashboard} element={
        <ProtectedRoute><Dashboard /></ProtectedRoute>
      } />
      <Route path={QUOTEX_ROUTES.tracker} element={
        <ProtectedRoute><Tracker /></ProtectedRoute>
      } />
      <Route path={QUOTEX_ROUTES.newQuotation} element={
        <ProtectedRoute><NewQuotation /></ProtectedRoute>
      } />

      {/* Super admin routes */}
      <Route path="/admin" element={
        <SuperAdminRoute><AdminLayout /></SuperAdminRoute>
      }>
        <Route index element={<AdminDashboard />} />
        <Route path="tenants"     element={<AdminTenants />} />
        <Route path="tenants/:id" element={<AdminTenantDetail />} />
        <Route path="users/:id"   element={<AdminUserDetail />} />
        <Route path="tools"       element={<AdminTools />} />
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}

export default App
