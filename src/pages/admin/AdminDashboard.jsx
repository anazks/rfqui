import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAdminStats } from '../../services/api'

function AdminDashboard() {
  const navigate              = useNavigate()
  const [data, setData]       = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError]     = useState('')

  useEffect(() => { loadStats() }, [])

  const loadStats = async () => {
    setIsLoading(true)
    try {
      const response = await getAdminStats()
      setData(response.data)
    } catch (err) {
      setError('Failed to load stats: ' + err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (date) => {
    if (!date) return '—'
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    })
  }

  if (isLoading) return <div style={styles.loading}>Loading dashboard...</div>
  if (error)     return <div style={styles.error}>{error}</div>
  if (!data)     return null

  return (
    <div style={styles.animFadeIn}>
      <div style={styles.pageHeader}>
        <h1 style={styles.heading}>Platform Dashboard</h1>
        <button style={styles.refreshBtn} onClick={loadStats}>↻ Refresh</button>
      </div>

      {/* ── Summary Cards ── */}
      <div style={styles.cardsRow}>
        <div className="glass" style={styles.card}>
          <p style={styles.cardLabel}>Total Tenants</p>
          <p style={styles.cardValue}>{data.summary.totalTenants}</p>
          <p style={styles.cardSub}>{data.summary.activeTenants} active</p>
        </div>
        <div className="glass" style={styles.card}>
          <p style={styles.cardLabel}>Total Users</p>
          <p style={styles.cardValue}>{data.summary.totalUsers}</p>
          <p style={styles.cardSub}>{data.summary.activeUsers} active</p>
        </div>
        <div className="glass" style={styles.card}>
          <p style={styles.cardLabel}>Total Quotations</p>
          <p style={styles.cardValue}>{data.summary.totalQuotations}</p>
          <p style={styles.cardSub}>{data.summary.quotationsThisMonth} this month</p>
        </div>
        <div className="glass" style={{ ...styles.card, borderTop: '3px solid var(--accent)' }}>
          <p style={styles.cardLabel}>Expiry Alerts</p>
          <p style={{ ...styles.cardValue, color: 'var(--accent)' }}>
            {data.tenants.filter(t => t.expiryAlert).length}
          </p>
          <p style={styles.cardSub}>expiring within 30 days</p>
        </div>
      </div>

      {/* ── Expiry Alerts ── */}
      {data.tenants.filter(t => t.expiryAlert).length > 0 && (
        <div className="glass" style={styles.alertBox}>
          <p style={styles.alertTitle}>⚠️ Licence Expiry Alerts</p>
          {data.tenants
            .filter(t => t.expiryAlert)
            .map(t => (
              <div key={t.tenantId} style={styles.alertRow}>
                <span style={styles.alertCompany}>{t.companyName}</span>
                <span style={styles.alertDays}>
                  {t.daysUntilExpiry <= 0
                    ? '❌ Expired'
                    : `⚠️ ${t.daysUntilExpiry} days left`
                  }
                </span>
                <span style={styles.alertExpiry}>
                  Expires: {formatDate(t.licenceExpiryDate)}
                </span>
                <button
                  className="premium-btn"
                  style={styles.alertAction}
                  onClick={() => navigate(`/admin/tenants/${t._id}`)}
                >
                  Manage
                </button>
              </div>
            ))
          }
        </div>
      )}

      {/* ── Tenant Breakdown Table ── */}
      <div className="glass" style={styles.tableCard}>
        <div style={styles.tableHeader}>
          <h3 style={styles.tableTitle}>Tenant Breakdown</h3>
          <button
            className="premium-btn"
            style={styles.newBtn}
            onClick={() => navigate('/admin/tenants')}
          >
            View All
          </button>
        </div>

        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.theadRow}>
                <th style={styles.th}>Company</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Tools</th>
                <th style={styles.th}>Users</th>
                <th style={styles.th}>Quotations</th>
                <th style={styles.th}>This Month</th>
                <th style={styles.th}>Last Active</th>
                <th style={styles.th}>Expires</th>
                <th style={styles.th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {data.tenants.map((tenant, i) => (
                <tr
                  key={tenant.tenantId}
                  style={styles.tr}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.7)'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <td style={styles.td}>
                    <span style={styles.companyName}>{tenant.companyName}</span>
                    <span style={styles.tenantId}>{tenant.tenantId}</span>
                  </td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.badge,
                      backgroundColor: tenant.isActive ? 'rgba(46, 125, 50, 0.1)' : 'rgba(198, 40, 40, 0.1)',
                      color:           tenant.isActive ? '#2e7d32' : '#c62828',
                    }}>
                      {tenant.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <div style={styles.toolsList}>
                      {(tenant.activeTools || []).map(t => (
                        <span key={t.toolCode} style={{
                          ...styles.toolBadge,
                          opacity: t.isActive ? 1 : 0.4,
                        }}>
                          {t.toolCode.toUpperCase()}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td style={styles.td}>
                    {tenant.userCount} / {tenant.maxUsers}
                  </td>
                  <td style={{ ...styles.td, fontWeight: '600' }}>
                    {tenant.quotationCount}
                  </td>
                  <td style={styles.td}>{tenant.quotationsThisMonth}</td>
                  <td style={styles.td}>{formatDate(tenant.lastActivityAt)}</td>
                  <td style={{
                    ...styles.td,
                    color: tenant.expiryAlert ? '#c62828' : 'var(--text-muted)',
                    fontWeight: tenant.expiryAlert ? '700' : '500',
                  }}>
                    {formatDate(tenant.licenceExpiryDate)}
                  </td>
                  <td style={styles.td}>
                    <button
                      className="premium-btn"
                      style={styles.manageBtn}
                      onClick={() => navigate(`/admin/tenants/${tenant._id}`)}
                    >
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

const styles = {
  animFadeIn:  { animation: 'fadeIn 0.4s ease forwards' },
  loading:     { padding: '24px', color: 'var(--text-muted)', textAlign: 'center', fontWeight: '500', fontSize: '13px' },
  error:       { padding: '12px', backgroundColor: '#fff5f5', color: '#c53030', borderRadius: 'var(--radius-sm)', border: '1px solid #fc8181', fontSize: '12px' },
  pageHeader:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  heading:     { fontSize: '24px', color: 'var(--primary)', margin: 0, fontWeight: '800', letterSpacing: '-0.5px' },
  refreshBtn: {
    padding: '6px 12px', backgroundColor: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255,255,255,0.3)', borderRadius: 'var(--radius-sm)',
    fontSize: '11px', cursor: 'pointer', color: 'var(--primary)', fontWeight: '600',
    transition: 'var(--transition)'
  },
  cardsRow: {
    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '12px', marginBottom: '20px',
  },
  card: {
    padding: '16px', borderRadius: 'var(--radius-md)', 
    borderTop: '3px solid var(--primary)', transition: 'var(--transition)'
  },
  cardLabel: { fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.5px' },
  cardValue: { fontSize: '24px', fontWeight: '800', color: 'var(--primary)', marginBottom: '2px' },
  cardSub:   { fontSize: '11px', color: 'var(--text-muted)', fontWeight: '500' },
  alertBox: {
    borderLeft: '3px solid var(--accent)', padding: '16px', marginBottom: '20px', borderRadius: 'var(--radius-md)'
  },
  alertTitle:   { fontWeight: '800', color: 'var(--text-main)', marginBottom: '12px', fontSize: '13px' },
  alertRow: {
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,0.05)',
    flexWrap: 'wrap',
  },
  alertCompany: { fontWeight: '700', color: 'var(--primary)', flex: 1, fontSize: '13px' },
  alertDays:    { fontSize: '11px', color: 'var(--accent)', fontWeight: '700', backgroundColor: 'rgba(6, 182, 212, 0.1)', padding: '3px 8px', borderRadius: '10px' },
  alertExpiry:  { fontSize: '11px', color: 'var(--text-muted)', fontWeight: '500' },
  alertAction: { padding: '4px 10px', width: 'auto', fontSize: '10px' },
  tableCard: {
    borderRadius: 'var(--radius-md)', overflow: 'hidden', padding: '0'
  },
  tableHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
    padding: '12px 16px', borderBottom: '1px solid rgba(0,0,0,0.05)',
  },
  tableTitle: { fontSize: '14px', fontWeight: '800', color: 'var(--primary)', margin: 0 },
  newBtn:     { padding: '6px 12px', width: 'auto', fontSize: '11px' },
  tableWrapper: { overflowX: 'auto', padding: '0 16px 16px 16px' },
  table:        { width: '100%', borderCollapse: 'collapse', marginTop: '12px' },
  theadRow:     { borderBottom: '2px solid rgba(0,0,0,0.1)' },
  th: {
    padding: '8px 12px', textAlign: 'left', fontSize: '10px', fontWeight: '700',
    color: 'var(--text-muted)', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.5px'
  },
  tr:           { borderBottom: '1px solid rgba(0,0,0,0.05)', transition: 'var(--transition)' },
  td:           { padding: '10px 12px', fontSize: '12px', color: 'var(--text-main)', verticalAlign: 'middle', fontWeight: '500' },
  companyName:  { fontWeight: '700', display: 'block', color: 'var(--primary)', fontSize: '13px' },
  tenantId:     { fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginTop: '2px' },
  badge: {
    padding: '3px 8px', borderRadius: 'var(--radius-full)',
    fontSize: '10px', fontWeight: '700', letterSpacing: '0.2px'
  },
  toolsList:    { display: 'flex', gap: '4px', flexWrap: 'wrap' },
  toolBadge: {
    padding: '2px 6px', backgroundColor: 'rgba(255,255,255,0.8)', border: '1px solid rgba(0,0,0,0.1)',
    color: 'var(--primary)', borderRadius: 'var(--radius-full)', fontSize: '9px', fontWeight: '700',
  },
  manageBtn: {
    padding: '4px 10px', width: 'auto', fontSize: '10px', background: 'transparent',
    border: '1px solid var(--primary)', color: 'var(--primary)', boxShadow: 'none'
  },
}

export default AdminDashboard