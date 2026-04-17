// AdminLayout.jsx — Shared layout for all admin pages.
// Contains the admin navbar and sidebar.
// Uses React Router's Outlet to render child routes.
// Modular — can be extracted to a separate app in future
// by just moving this folder and its children.

import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

function AdminLayout() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { user, logout } = useAuth()

  const navItems = [
    { label: '📊 Dashboard',  path: '/admin' },
    { label: '🏢 Tenants',    path: '/admin/tenants' },
    { label: '🔧 Tools',      path: '/admin/tools' },
  ]

  return (
    <div style={styles.wrapper}>

      {/* Top navbar */}
      <div style={styles.navbar}>
        <div style={styles.navLeft}>
          <span style={styles.logo}>SourceHUB</span>
          <span style={styles.adminBadge}>SUPER ADMIN</span>
        </div>
        <div style={styles.navRight}>
          <span style={styles.userInfo}>
            👤 {user?.firstName} {user?.lastName}
          </span>
          <button
            style={styles.logoutBtn}
            onClick={() => { logout(); navigate('/') }}
          >
            Logout
          </button>
        </div>
      </div>

      <div style={styles.body}>

        {/* Sidebar */}
        <div style={styles.sidebar}>
          {navItems.map(item => (
            <button
              key={item.path}
              style={{
                ...styles.sidebarItem,
                ...(item.path === '/admin'
                  ? location.pathname === '/admin' ? styles.sidebarItemActive : {}
                  : location.pathname.startsWith(item.path) ? styles.sidebarItemActive : {}
                ),
              }}
              onClick={() => navigate(item.path)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Page content */}
        <div style={styles.content}>
          <Outlet />
        </div>

      </div>
    </div>
  )
}

const styles = {
  wrapper:  { minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f0f4f8' },
  navbar: {
    backgroundColor: '#1a1a2e', padding: '14px 32px',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  },
  navLeft:    { display: 'flex', alignItems: 'center', gap: '12px' },
  logo:       { color: '#fff', fontSize: '20px', fontWeight: '700' },
  adminBadge: {
    backgroundColor: '#e74c3c', color: '#fff',
    padding: '3px 10px', borderRadius: '12px',
    fontSize: '11px', fontWeight: '700', letterSpacing: '1px',
  },
  navRight:   { display: 'flex', alignItems: 'center', gap: '12px' },
  userInfo:   { color: 'rgba(255,255,255,0.7)', fontSize: '13px' },
  logoutBtn: {
    background: 'none', border: '1px solid rgba(255,255,255,0.3)',
    color: 'rgba(255,255,255,0.7)', fontSize: '13px',
    cursor: 'pointer', padding: '6px 12px', borderRadius: '4px',
  },
  body:       { display: 'flex', flex: 1 },
  sidebar: {
    width: '220px', backgroundColor: '#fff',
    borderRight: '1px solid #e0e0e0',
    padding: '20px 0', display: 'flex', flexDirection: 'column',
  },
  sidebarItem: {
    padding: '12px 24px', background: 'none', border: 'none',
    textAlign: 'left', fontSize: '14px', color: '#444',
    cursor: 'pointer', borderLeft: '3px solid transparent',
  },
  sidebarItemActive: {
    backgroundColor: '#f0f4f8', color: '#1a3c5e',
    fontWeight: '700', borderLeft: '3px solid #1a3c5e',
  },
  content:    { flex: 1, padding: '32px', overflowY: 'auto' },
}

export default AdminLayout