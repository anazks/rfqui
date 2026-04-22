// AdminLayout.jsx

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
    <div style={styles.wrapper} className="gradient-bg">
      {/* Top navbar */}
      <div style={styles.navbar} className="glass">
        <div style={styles.navLeft}>
          <div style={styles.logoCircle}>S</div>
          <span style={styles.logoText}>SourceHUB</span>
          <span style={styles.adminBadge}>ADMIN</span>
        </div>
        <div style={styles.navRight}>
          <span style={styles.userInfo}>
            <span style={styles.userAvatar}>{user?.firstName?.charAt(0) || 'A'}</span>
            <span style={styles.userName}>{user?.firstName} {user?.lastName}</span>
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
        <div style={styles.sidebarContainer}>
          <div className="glass" style={styles.sidebarGlass}>
            <div style={styles.sidebarMenu}>
              <p style={styles.sidebarTitle}>MENU</p>
              {navItems.map(item => {
                const isActive = item.path === '/admin' 
                  ? location.pathname === '/admin' 
                  : location.pathname.startsWith(item.path);

                return (
                  <button
                    key={item.path}
                    style={{
                      ...styles.sidebarItem,
                      ...(isActive ? styles.sidebarItemActive : {}),
                    }}
                    onClick={() => navigate(item.path)}
                  >
                    {item.label}
                  </button>
                )
              })}
            </div>
            
            <div style={styles.sidebarFooter}>
              <button style={styles.backToPortalBtn} onClick={() => navigate('/tool-launcher')}>
                ← Portal
              </button>
            </div>
          </div>
        </div>

        {/* Page content */}
        <div style={styles.content}>
          <div style={styles.contentInner}>
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  )
}

const styles = {
  wrapper:  { minHeight: '100vh', display: 'flex', flexDirection: 'column', color: 'var(--text-main)' },
  navbar: {
    padding: '10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    borderBottom: '1px solid rgba(255,255,255,0.4)', zIndex: 100, position: 'relative',
    boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.05)', borderRadius: 0,
  },
  navLeft:    { display: 'flex', alignItems: 'center', gap: '8px' },
  logoCircle: { 
    width: '26px', height: '26px', backgroundColor: 'var(--primary)', color: '#fff', 
    borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', 
    fontWeight: '800', fontSize: '13px' 
  },
  logoText:   { color: 'var(--primary)', fontSize: '16px', fontWeight: '800', letterSpacing: '-0.5px' },
  adminBadge: {
    backgroundColor: 'var(--accent)', color: '#fff', padding: '2px 6px', borderRadius: '8px',
    fontSize: '9px', fontWeight: '800', letterSpacing: '0.5px', textTransform: 'uppercase'
  },
  navRight:   { display: 'flex', alignItems: 'center', gap: '14px' },
  userInfo:   { display: 'flex', alignItems: 'center', gap: '8px' },
  userAvatar: {
    width: '26px', height: '26px', backgroundColor: '#e2e8f0', borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', color: 'var(--primary)'
  },
  userName:   { color: 'var(--text-main)', fontSize: '12px', fontWeight: '600' },
  logoutBtn: {
    background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(15,23,42,0.1)', color: 'var(--primary)', 
    fontSize: '11px', fontWeight: '600', cursor: 'pointer', padding: '6px 12px', borderRadius: 'var(--radius-sm)',
    transition: 'var(--transition)'
  },
  body: { display: 'flex', flex: 1, overflow: 'hidden' },
  sidebarContainer: {
    width: '220px', padding: '16px', display: 'flex', flexDirection: 'column'
  },
  sidebarGlass: {
    flex: 1, borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', 
    justifyContent: 'space-between', padding: '16px 12px', boxShadow: 'var(--shadow-md)',
  },
  sidebarTitle: {
    fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', letterSpacing: '1px',
    marginBottom: '10px', paddingLeft: '8px'
  },
  sidebarMenu: { display: 'flex', flexDirection: 'column', gap: '2px' },
  sidebarItem: {
    padding: '10px 12px', background: 'transparent', border: 'none', borderRadius: 'var(--radius-sm)',
    textAlign: 'left', fontSize: '13px', color: 'var(--text-muted)', fontWeight: '500',
    cursor: 'pointer', transition: 'var(--transition)', display: 'flex', alignItems: 'center',
  },
  sidebarItemActive: {
    backgroundColor: 'rgba(255,255,255,0.6)', color: 'var(--primary)', fontWeight: '700',
    boxShadow: 'var(--shadow-sm)'
  },
  sidebarFooter: {
    borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '12px'
  },
  backToPortalBtn: {
    width: '100%', padding: '10px', background: 'transparent', border: 'none', textAlign: 'center',
    color: 'var(--text-muted)', fontSize: '12px', fontWeight: '600', cursor: 'pointer', transition: 'var(--transition)'
  },
  content: { flex: 1, overflowY: 'auto', padding: '16px' },
  contentInner: { maxWidth: '1200px', margin: '0 auto', width: '100%' }
}

export default AdminLayout