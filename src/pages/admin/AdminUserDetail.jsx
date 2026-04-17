// AdminUserDetail.jsx — Individual user management page.
// Accessible from the tenant detail page.
// Handles role changes, tool access updates, password reset.

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  getAdminUser,
  resetUserPassword,
  toggleAdminUser,
} from '../../services/api'

function AdminUserDetail() {
  const { id }   = useParams()
  const navigate = useNavigate()

  const [user,      setUser]      = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error,     setError]     = useState('')
  const [message,   setMessage]   = useState('')

  // Password reset
  const [newPassword, setNewPassword] = useState('')
  const [isResetting, setIsResetting] = useState(false)

  useEffect(() => { loadUser() }, [id])

  const loadUser = async () => {
    setIsLoading(true)
    try {
      const response = await getAdminUser(id)
      setUser(response.data.user)
    } catch (err) {
      setError('Failed to load user: ' + err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      setMessage('❌ Password must be at least 6 characters')
      return
    }
    setIsResetting(true)
    try {
      await resetUserPassword(id, { newPassword })
      setMessage('✅ Password reset successfully. Share the new password with the user securely.')
      setNewPassword('')
    } catch (err) {
      setMessage('❌ Failed: ' + err.message)
    } finally {
      setIsResetting(false)
    }
  }

  const handleToggle = async () => {
    try {
      await toggleAdminUser(id)
      loadUser()
    } catch (err) {
      setMessage('❌ Failed: ' + err.message)
    }
  }

  const formatDate = (date) => {
    if (!date) return '—'
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    })
  }

  if (isLoading) return <div style={{ padding: 40, color: '#666' }}>Loading...</div>
  if (error)     return <div style={styles.errorBox}>{error}</div>
  if (!user)     return null

  return (
    <div>
      <button style={styles.backBtn} onClick={() => navigate(-1)}>
        ← Back
      </button>

      <div style={styles.header}>
        <div>
          <h1 style={styles.heading}>
            {user.firstName} {user.lastName}
          </h1>
          <p style={styles.email}>{user.email}</p>
          <p style={styles.meta}>
            {user.tenantId} · {user.role}
          </p>
        </div>
        <button
          style={{
            ...styles.toggleBtn,
            backgroundColor: user.isActive ? '#ffebee' : '#e8f5e9',
            color:           user.isActive ? '#c62828' : '#2e7d32',
          }}
          onClick={handleToggle}
        >
          {user.isActive ? 'Disable User' : 'Enable User'}
        </button>
      </div>

      {message && (
        <div style={{
          ...styles.messageBox,
          backgroundColor: message.startsWith('✅') ? '#e8f5e9' : '#fff5f5',
          borderColor:     message.startsWith('✅') ? '#68d391' : '#fc8181',
          color:           message.startsWith('✅') ? '#2e7d32' : '#c53030',
        }}>
          {message}
        </div>
      )}

      {/* Tool Access Summary */}
      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Tool Access & Licences</h3>
        {(!user.toolAccess || user.toolAccess.length === 0) ? (
          <p style={{ color: '#888', fontSize: '13px' }}>
            Legacy user — single licence: {user.licence}
          </p>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr style={styles.thead}>
                <th style={styles.th}>Tool</th>
                <th style={styles.th}>Licence</th>
                <th style={styles.th}>Expires</th>
                <th style={styles.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {user.toolAccess.map((t, i) => (
                <tr key={t.toolCode} style={{
                  ...styles.tr,
                  backgroundColor: i % 2 === 0 ? '#fff' : '#f8f9fa',
                }}>
                  <td style={styles.td}>
                    <span style={styles.toolBadge}>{t.toolCode.toUpperCase()}</span>
                  </td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.licenceBadge,
                      backgroundColor:
                        t.licence === 'enterprise' ? '#f3e5f5' :
                        t.licence === 'pro'        ? '#e3f2fd' : '#f5f5f5',
                      color:
                        t.licence === 'enterprise' ? '#7b1fa2' :
                        t.licence === 'pro'        ? '#1565c0' : '#424242',
                    }}>
                      {t.licence}
                    </span>
                  </td>
                  <td style={styles.td}>{formatDate(t.licenceExpiresAt)}</td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.badge,
                      backgroundColor: t.isActive ? '#e8f5e9' : '#ffebee',
                      color:           t.isActive ? '#2e7d32' : '#c62828',
                    }}>
                      {t.isActive ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* User Info */}
      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Account Info</h3>
        <div style={styles.infoGrid}>
          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>Full Name</span>
            <span style={styles.infoValue}>{user.firstName} {user.lastName}</span>
          </div>
          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>Email</span>
            <span style={styles.infoValue}>{user.email}</span>
          </div>
          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>Role</span>
            <span style={styles.infoValue}>{user.role}</span>
          </div>
          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>Tenant</span>
            <span style={styles.infoValue}>{user.tenantId}</span>
          </div>
          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>Account Created</span>
            <span style={styles.infoValue}>{formatDate(user.createdAt)}</span>
          </div>
          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>Last Login</span>
            <span style={styles.infoValue}>{formatDate(user.lastLoginAt)}</span>
          </div>
        </div>
      </div>

      {/* Password Reset */}
      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Reset Password</h3>
        <p style={styles.cardDesc}>
          Generate a new password for this user.
          Share it with them securely after resetting.
        </p>
        <div style={styles.resetRow}>
          <input
            style={styles.resetInput}
            type="text"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Enter new password (min 6 characters)"
          />
          <button
            style={{ ...styles.resetBtn, opacity: isResetting ? 0.7 : 1 }}
            onClick={handleResetPassword}
            disabled={isResetting}
          >
            {isResetting ? 'Resetting...' : '🔑 Reset Password'}
          </button>
        </div>
      </div>

    </div>
  )
}

const styles = {
  backBtn: {
    background: 'none', border: 'none', color: '#1a1a2e',
    fontSize: '14px', cursor: 'pointer', fontWeight: '600',
    marginBottom: '16px', padding: 0,
  },
  header: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: '20px',
  },
  heading:  { fontSize: '24px', color: '#1a1a2e', margin: 0 },
  email:    { fontSize: '14px', color: '#666', marginTop: '4px' },
  meta:     { fontSize: '12px', color: '#aaa', marginTop: '2px' },
  toggleBtn: {
    padding: '8px 16px', border: 'none',
    borderRadius: '6px', fontSize: '13px',
    cursor: 'pointer', fontWeight: '600',
  },
  messageBox: {
    padding: '12px', borderRadius: '6px',
    border: '1px solid', marginBottom: '16px', fontSize: '13px',
  },
  card: {
    backgroundColor: '#fff', borderRadius: '10px',
    padding: '20px', marginBottom: '16px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  },
  cardTitle: { fontSize: '15px', fontWeight: '700', color: '#1a1a2e', marginBottom: '12px' },
  cardDesc:  { fontSize: '13px', color: '#666', marginBottom: '12px' },
  table:     { width: '100%', borderCollapse: 'collapse' },
  thead:     { backgroundColor: '#1a1a2e' },
  th: {
    padding: '10px 16px', textAlign: 'left',
    fontSize: '11px', fontWeight: '600', color: '#fff',
  },
  tr:        { borderBottom: '1px solid #f0f0f0' },
  td:        { padding: '10px 16px', fontSize: '13px', color: '#333' },
  toolBadge: {
    padding: '2px 10px', backgroundColor: '#e8f4fd',
    color: '#1a3c5e', borderRadius: '10px', fontSize: '12px', fontWeight: '700',
  },
  licenceBadge: {
    padding: '2px 10px', borderRadius: '10px',
    fontSize: '12px', fontWeight: '600',
  },
  badge: {
    padding: '2px 10px', borderRadius: '10px',
    fontSize: '12px', fontWeight: '600',
  },
  errorBox: {
    padding: '12px', backgroundColor: '#fff5f5',
    border: '1px solid #fc8181', borderRadius: '6px',
    color: '#c53030', fontSize: '13px',
  },
  infoGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
  },
  infoItem:  { display: 'flex', flexDirection: 'column', gap: '4px' },
  infoLabel: { fontSize: '11px', color: '#888', fontWeight: '700', textTransform: 'uppercase' },
  infoValue: { fontSize: '14px', color: '#1a1a2e' },
  resetRow:  { display: 'flex', gap: '10px', alignItems: 'center' },
  resetInput: {
    flex: 1, padding: '10px 12px',
    borderRadius: '6px', border: '1px solid #ddd', fontSize: '13px',
  },
  resetBtn: {
    padding: '10px 20px', backgroundColor: '#1a1a2e',
    color: '#fff', border: 'none', borderRadius: '6px',
    fontSize: '13px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap',
  },
}

export default AdminUserDetail