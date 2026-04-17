// ToolLauncher.jsx — Home page for all tenant users after login.

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { changePassword } from '../services/api'

// Sunserk branding — shown at top of launcher
const PLATFORM_NAME = 'SourceHUB'

function ToolLauncher() {
  const navigate = useNavigate()
  const { user, logout, canAccessTool, allPlatformTools } = useAuth()

  // ── Change password modal ─────────────────────
  const [showCP,    setShowCP]    = useState(false)
  const [cpForm,    setCpForm]    = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [cpError,   setCpError]   = useState('')
  const [cpSuccess, setCpSuccess] = useState('')
  const [cpSaving,  setCpSaving]  = useState(false)

  const handleChangePassword = async () => {
    setCpError('')
    setCpSuccess('')
    if (!cpForm.currentPassword || !cpForm.newPassword || !cpForm.confirmPassword) {
      return setCpError('All fields are required')
    }
    if (cpForm.newPassword !== cpForm.confirmPassword) {
      return setCpError('New passwords do not match')
    }
    if (cpForm.newPassword.length < 6) {
      return setCpError('Password must be at least 6 characters')
    }
    if (cpForm.currentPassword === cpForm.newPassword) {
      return setCpError('New password must be different from current password')
    }
    setCpSaving(true)
    try {
      await changePassword({ currentPassword: cpForm.currentPassword, newPassword: cpForm.newPassword })
      setCpSuccess('✅ Password changed successfully')
      setCpForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setTimeout(() => { setShowCP(false); setCpSuccess('') }, 2000)
    } catch (err) {
      setCpError(err.response?.data?.message || 'Failed to change password')
    } finally {
      setCpSaving(false)
    }
  }

  const closeCP = () => {
    setShowCP(false)
    setCpForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    setCpError('')
    setCpSuccess('')
  }

  // ── Determine card state for a tool ──────────
  const getCardState = (tool) => {
    if (canAccessTool(tool.code)) return 'active'
    if (tool.status === 'coming_soon') return 'coming_soon'
    return 'locked'
  }

  const handleCardClick = (tool) => {
    const state = getCardState(tool)
    if (state !== 'active') return
    if (tool.route) {
      const route = tool.route.startsWith('/') ? tool.route : '/' + tool.route
      navigate(route.toLowerCase())
    }
  }

  const renderIcon = (tool) => {
    if (tool.icon?.fileBase64) {
      return (
        <img
          src={`data:${tool.icon.mimeType || 'image/png'};base64,${tool.icon.fileBase64}`}
          alt={tool.name}
          style={{ width: 56, height: 56, objectFit: 'contain' }}
        />
      )
    }
    return <span style={{ fontSize: 48 }}>{tool.iconEmoji || '🔧'}</span>
  }

  return (
    <div className="gradient-bg" style={s.page}>

      {/* ── Frosted Header ── */}
      <header className="glass" style={s.header}>
        <div style={s.headerContainer}>
          <div style={s.brand}>
            <div style={s.logoMini}>S</div>
            <div>
              <div style={s.platformName}>{PLATFORM_NAME}</div>
              <div style={s.platformSub}>Enterprise Resource Planning</div>
            </div>
          </div>
          
          <div style={s.userActions}>
            <div style={s.userInfo}>
              <span style={s.userBadge}>{user?.role?.replace('_', ' ')}</span>
              <span style={s.userName}>{user?.firstName} {user?.lastName}</span>
            </div>
            <div style={s.actionsRow}>
              <button style={s.actionBtn} onClick={() => setShowCP(true)} title="Settings">
                ⚙️
              </button>
              <button style={s.logoutBtn} onClick={() => { logout(); navigate('/') }}>
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main style={s.main}>
        {/* ── Welcome Section ── */}
        <section style={s.hero}>
          <h1 style={s.h1}>Welcome back, {user?.firstName}</h1>
          <p style={s.heroSub}>Your professional workspace is ready. Select a module to continue.</p>
        </section>

        {/* ── Tool Bento Grid ── */}
        <div style={s.gridArea}>
          {allPlatformTools.length === 0 && (
            <div className="glass" style={s.empty}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>📁</div>
              <p>No modules assigned to your profile yet.</p>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Contact your IT administrator for access.</p>
            </div>
          )}

          <div style={s.grid}>
            {allPlatformTools.map(tool => {
              const state = getCardState(tool)
              const isClickable = state === 'active'

              return (
                <div
                  key={tool.code}
                  className={isClickable ? "glass" : ""}
                  style={{
                    ...s.card,
                    ...(isClickable ? s.cardActive : s.cardLocked),
                    cursor: isClickable ? 'pointer' : 'default',
                  }}
                  onClick={() => handleCardClick(tool)}
                >
                  {/* Badges */}
                  <div style={s.badgeRow}>
                    {state === 'coming_soon' && <span style={s.badgeComingSoon}>Soon</span>}
                    {state === 'locked' && <span style={s.badgeLocked}>Locked</span>}
                    {isClickable && <span style={s.badgeActive}>Active</span>}
                  </div>

                  {/* Icon Area */}
                  <div style={{
                    ...s.iconWrap,
                    opacity: isClickable ? 1 : 0.4,
                    filter:  isClickable ? 'none' : 'grayscale(100%)',
                    transform: isClickable ? 'none' : 'scale(0.9)',
                  }}>
                    {renderIcon(tool)}
                  </div>

                  {/* Text Details */}
                  <div style={s.textDetails}>
                    <h3 style={{
                      ...s.toolName,
                      color: isClickable ? 'var(--primary)' : 'var(--text-muted)',
                    }}>
                      {tool.name}
                    </h3>
                    {tool.description && (
                      <p style={{
                        ...s.toolDesc,
                        color: isClickable ? 'var(--text-muted)' : '#94a3b8',
                      }}>
                        {tool.description}
                      </p>
                    )}
                  </div>

                  {/* Action Link */}
                  {isClickable && (
                    <div style={s.cardFooter}>
                      <span style={s.launchText}>Launch Module</span>
                      <span style={s.launchArrow}>→</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </main>

      {/* ── Change Password Modal ── */}
      {showCP && (
        <div style={s.overlay} onClick={closeCP}>
          <div className="glass" style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <h3 style={s.modalTitle}>Security Settings</h3>
              <button style={s.closeBtn} onClick={closeCP}>×</button>
            </div>
            
            <p style={s.modalSub}>Update your account password to ensure security.</p>

            {['currentPassword', 'newPassword', 'confirmPassword'].map((field, i) => (
              <div key={field} style={{ marginBottom: 18 }}>
                <label style={s.label}>
                  {field === 'currentPassword' ? 'Current Password'
                   : field === 'newPassword'   ? 'New Password'
                   : 'Confirm New Password'}
                </label>
                <input
                  type="password"
                  style={s.input}
                  value={cpForm[field]}
                  onChange={e => setCpForm({ ...cpForm, [field]: e.target.value })}
                  onKeyDown={e => e.key === 'Enter' && i === 2 && handleChangePassword()}
                  disabled={cpSaving}
                />
              </div>
            ))}

            {cpError   && <div style={s.cpError}>{cpError}</div>}
            {cpSuccess && <div style={s.cpOk}>{cpSuccess}</div>}

            <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
              <button
                style={{ ...s.saveBtn, opacity: cpSaving ? 0.7 : 1 }}
                onClick={handleChangePassword}
                disabled={cpSaving}
              >
                {cpSaving ? 'Updating...' : 'Update Password'}
              </button>
              <button style={s.cancelBtn} onClick={closeCP} disabled={cpSaving}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Styles ──
const s = {
  page: {
    minHeight: '100vh',
    width: '100vw',
  },
  header: {
    position: 'sticky',
    top: 0,
    zIndex: 100,
    padding: '12px 0',
    borderBottom: '1px solid var(--card-border)',
  },
  headerContainer: {
    maxWidth: 1400,
    margin: '0 auto',
    padding: '0 40px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brand: {
    display: 'flex', alignItems: 'center', gap: 14,
  },
  logoMini: {
    width: 36, height: 36, backgroundColor: 'var(--primary)',
    color: '#fff', borderRadius: 8, display: 'flex',
    alignItems: 'center', justifyContent: 'center', fontWeight: 'bold',
  },
  platformName: {
    fontSize: 18, fontWeight: 800, color: 'var(--primary)', lineHeight: 1,
  },
  platformSub: {
    fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 3,
  },
  userActions: {
    display: 'flex', alignItems: 'center', gap: 24,
  },
  userInfo: {
    display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
  },
  userBadge: {
    fontSize: 9, fontWeight: 800, backgroundColor: 'var(--accent)',
    color: '#fff', padding: '1px 6px', borderRadius: 4, textTransform: 'uppercase', marginBottom: 2,
  },
  userName: {
    fontSize: 14, fontWeight: 600, color: 'var(--primary)',
  },
  actionsRow: {
    display: 'flex', gap: 12,
  },
  actionBtn: {
    background: 'rgba(0,0,0,0.05)', border: 'none', borderRadius: 8,
    width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', fontSize: 16,
  },
  logoutBtn: {
    backgroundColor: 'var(--primary)', color: '#fff', border: 'none',
    padding: '0 16px', height: 36, borderRadius: 8, fontSize: 13, fontWeight: 600,
    cursor: 'pointer', boxShadow: 'var(--shadow-sm)',
  },
  main: {
    maxWidth: 1400,
    margin: '0 auto',
    padding: '60px 40px',
  },
  hero: {
    marginBottom: 48,
  },
  h1: {
    fontSize: 42, marginBottom: 8, color: 'var(--primary)',
  },
  heroSub: {
    fontSize: 18, color: 'var(--text-muted)',
  },
  gridArea: {
    width: '100%',
  },
  empty: {
    padding: 80, textAlign: 'center', borderRadius: 24,
    color: 'var(--text-muted)', border: '2px dashed #e2e8f0',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: 32,
  },
  card: {
    borderRadius: 24,
    padding: 32,
    display: 'flex',
    flexDirection: 'column',
    transition: 'var(--transition)',
    minHeight: 300,
    position: 'relative',
    overflow: 'hidden',
  },
  cardActive: {
    boxShadow: 'var(--shadow-md)',
    border: '1px solid var(--card-border)',
  },
  cardLocked: {
    backgroundColor: 'rgba(241, 245, 249, 0.5)',
    border: '1px solid #e2e8f0',
  },
  badgeRow: {
    position: 'absolute', top: 24, right: 24, display: 'flex', gap: 8,
  },
  badgeComingSoon: {
    backgroundColor: '#f59e0b', color: '#fff', fontSize: 10, fontWeight: 800,
    padding: '3px 8px', borderRadius: 6, textTransform: 'uppercase',
  },
  badgeLocked: {
    backgroundColor: '#94a3b8', color: '#fff', fontSize: 10, fontWeight: 800,
    padding: '3px 8px', borderRadius: 6, textTransform: 'uppercase',
  },
  badgeActive: {
    backgroundColor: '#10b981', color: '#fff', fontSize: 10, fontWeight: 800,
    padding: '3px 8px', borderRadius: 6, textTransform: 'uppercase',
  },
  iconWrap: {
    marginBottom: 24, transition: 'var(--transition)',
  },
  textDetails: {
    marginBottom: 24,
  },
  toolName: {
    fontSize: 22, fontWeight: 700, marginBottom: 12,
  },
  toolDesc: {
    fontSize: 14, lineHeight: 1.6,
  },
  cardFooter: {
    marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 8,
    color: 'var(--accent)', fontWeight: 600, fontSize: 14,
  },
  launchArrow: {
    transition: 'var(--transition)',
  },
  overlay: {
    position: 'fixed', inset: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    backdropFilter: 'blur(4px)',
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    zIndex: 1000,
  },
  modal: {
    borderRadius: 24, padding: 40, width: '100%', maxWidth: 480,
    boxShadow: 'var(--shadow-lg)', border: '1px solid rgba(255,255,255,0.4)',
  },
  modalHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8,
  },
  modalTitle: { fontSize: 24, fontWeight: 800, margin: 0 },
  closeBtn: {
    background: 'none', border: 'none', fontSize: 28, cursor: 'pointer', color: 'var(--text-muted)',
  },
  modalSub:   { fontSize: 15, color: 'var(--text-muted)', margin: '0 0 32px' },
  label: {
    display: 'block', marginBottom: 8,
    fontSize: 14, fontWeight: 600, color: 'var(--text-main)',
  },
  input: {
    width: '100%', padding: '12px 16px',
    borderRadius: 12, border: '1.5px solid #e2e8f0',
    fontSize: 15, transition: 'var(--transition)',
  },
  cpError: {
    padding: '12px', backgroundColor: '#fff1f2',
    border: '1px solid #fecdd3', borderRadius: 12,
    color: '#e11d48', fontSize: 14, marginBottom: 20,
  },
  cpOk: {
    padding: '12px', backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0', borderRadius: 12,
    color: '#16a34a', fontSize: 14, marginBottom: 20,
  },
  saveBtn: {
    flex: 2, padding: '14px',
    backgroundColor: 'var(--primary)', color: '#fff',
    border: 'none', borderRadius: 12,
    fontSize: 15, fontWeight: 600, cursor: 'pointer',
    boxShadow: 'var(--shadow-md)',
  },
  cancelBtn: {
    flex: 1, padding: '14px',
    backgroundColor: 'transparent', color: 'var(--text-muted)',
    border: '1.5px solid #e2e8f0', borderRadius: 12,
    fontSize: 15, cursor: 'pointer',
  },
}

export default ToolLauncher
