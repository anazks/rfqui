// AdminDashboard.jsx — Super admin usage dashboard.
// Shows platform-wide stats and per-tenant breakdown.

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
    <div>
      <div style={styles.pageHeader}>
        <h1 style={styles.heading}>Platform Dashboard</h1>
        <button style={styles.refreshBtn} onClick={loadStats}>↻ Refresh</button>
      </div>

      {/* ── Summary Cards ── */}
      <div style={styles.cardsRow}>
        <div style={styles.card}>
          <p style={styles.cardLabel}>Total Tenants</p>
          <p style={styles.cardValue}>{data.summary.totalTenants}</p>
          <p style={styles.cardSub}>{data.summary.activeTenants} active</p>
        </div>
        <div style={styles.card}>
          <p style={styles.cardLabel}>Total Users</p>
          <p style={styles.cardValue}>{data.summary.totalUsers}</p>
          <p style={styles.cardSub}>{data.summary.activeUsers} active</p>
        </div>
        <div style={styles.card}>
          <p style={styles.cardLabel}>Total Quotations</p>
          <p style={styles.cardValue}>{data.summary.totalQuotations}</p>
          <p style={styles.cardSub}>{data.summary.quotationsThisMonth} this month</p>
        </div>
        <div style={{ ...styles.card, borderTop: '4px solid #e74c3c' }}>
          <p style={styles.cardLabel}>Expiry Alerts</p>
          <p style={{ ...styles.cardValue, color: '#e74c3c' }}>
            {data.tenants.filter(t => t.expiryAlert).length}
          </p>
          <p style={styles.cardSub}>expiring within 30 days</p>
        </div>
      </div>

      {/* ── Expiry Alerts ── */}
      {data.tenants.filter(t => t.expiryAlert).length > 0 && (
        <div style={styles.alertBox}>
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
                  style={styles.alertAction}
                  onClick={() => navigate(`/admin/tenants/${t._id}`)}
                >
                  Manage →
                </button>
              </div>
            ))
          }
        </div>
      )}

      {/* ── Tenant Breakdown Table ── */}
      <div style={styles.tableCard}>
        <div style={styles.tableHeader}>
          <h3 style={styles.tableTitle}>Tenant Breakdown</h3>
          <button
            style={styles.newBtn}
            onClick={() => navigate('/admin/tenants')}
          >
            View All Tenants
          </button>
        </div>

        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.thead}>
                <th style={styles.th}>Company</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Tools</th>
                <th style={styles.th}>Users</th>
                <th style={styles.th}>Total Quotations</th>
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
                  style={{
                    ...styles.tr,
                    backgroundColor: tenant.expiryAlert
                      ? '#fff5f5'
                      : i % 2 === 0 ? '#ffffff' : '#f8f9fa',
                  }}
                >
                  <td style={styles.td}>
                    <span style={styles.companyName}>{tenant.companyName}</span>
                    <span style={styles.tenantId}>{tenant.tenantId}</span>
                  </td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.badge,
                      backgroundColor: tenant.isActive ? '#e8f5e9' : '#ffebee',
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
                    color: tenant.expiryAlert ? '#c62828' : '#444',
                    fontWeight: tenant.expiryAlert ? '700' : 'normal',
                  }}>
                    {formatDate(tenant.licenceExpiryDate)}
                  </td>
                  <td style={styles.td}>
                    <button
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
  loading:     { padding: '40px', color: '#666', textAlign: 'center' },
  error:       { padding: '16px', backgroundColor: '#fff5f5', color: '#c53030', borderRadius: '8px' },
  pageHeader:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
  heading:     { fontSize: '24px', color: '#1a1a2e', margin: 0 },
  refreshBtn: {
    padding: '8px 16px', backgroundColor: 'transparent',
    border: '1px solid #ddd', borderRadius: '6px',
    fontSize: '13px', cursor: 'pointer', color: '#666',
  },
  cardsRow: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '16px', marginBottom: '24px',
  },
  card: {
    backgroundColor: '#fff', borderRadius: '10px',
    padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    borderTop: '4px solid #1a1a2e',
  },
  cardLabel: { fontSize: '11px', color: '#888', fontWeight: '700', textTransform: 'uppercase', marginBottom: '8px' },
  cardValue: { fontSize: '32px', fontWeight: '700', color: '#1a1a2e', marginBottom: '4px' },
  cardSub:   { fontSize: '12px', color: '#999' },
  alertBox: {
    backgroundColor: '#fff5f5', border: '1px solid #fc8181',
    borderRadius: '10px', padding: '16px', marginBottom: '24px',
  },
  alertTitle:   { fontWeight: '700', color: '#c62828', marginBottom: '12px', fontSize: '14px' },
  alertRow: {
    display: 'flex', alignItems: 'center', gap: '16px',
    padding: '8px 0', borderBottom: '1px solid #fee2e2',
    flexWrap: 'wrap',
  },
  alertCompany: { fontWeight: '600', color: '#333', flex: 1 },
  alertDays:    { fontSize: '13px', color: '#c62828', fontWeight: '600' },
  alertExpiry:  { fontSize: '12px', color: '#666' },
  alertAction: {
    padding: '4px 12px', backgroundColor: '#c62828',
    color: '#fff', border: 'none', borderRadius: '4px',
    fontSize: '12px', cursor: 'pointer',
  },
  tableCard: {
    backgroundColor: '#fff', borderRadius: '10px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden',
  },
  tableHeader: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', padding: '16px 20px',
    borderBottom: '1px solid #f0f0f0',
  },
  tableTitle: { fontSize: '15px', fontWeight: '700', color: '#1a1a2e', margin: 0 },
  newBtn: {
    padding: '8px 16px', backgroundColor: '#1a1a2e',
    color: '#fff', border: 'none', borderRadius: '6px',
    fontSize: '13px', cursor: 'pointer',
  },
  tableWrapper: { overflowX: 'auto' },
  table:        { width: '100%', borderCollapse: 'collapse' },
  thead:        { backgroundColor: '#1a1a2e' },
  th: {
    padding: '10px 16px', textAlign: 'left',
    fontSize: '11px', fontWeight: '600',
    color: '#fff', whiteSpace: 'nowrap',
  },
  tr:           { borderBottom: '1px solid #f0f0f0' },
  td:           { padding: '12px 16px', fontSize: '13px', color: '#333', verticalAlign: 'middle' },
  companyName:  { fontWeight: '600', display: 'block', color: '#1a1a2e' },
  tenantId:     { fontSize: '11px', color: '#888', display: 'block' },
  badge: {
    padding: '3px 10px', borderRadius: '12px',
    fontSize: '11px', fontWeight: '600',
  },
  toolsList:    { display: 'flex', gap: '4px', flexWrap: 'wrap' },
  toolBadge: {
    padding: '2px 8px', backgroundColor: '#e8f4fd',
    color: '#1a3c5e', borderRadius: '10px', fontSize: '11px', fontWeight: '600',
  },
  manageBtn: {
    padding: '5px 12px', backgroundColor: '#1a1a2e',
    color: '#fff', border: 'none', borderRadius: '4px',
    fontSize: '12px', cursor: 'pointer',
  },
}

export default AdminDashboard