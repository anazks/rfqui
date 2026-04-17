// pages/quotex/Dashboard.jsx — QuoteX analytics dashboard.

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart, Bar, ComposedChart, Line,
  XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { getAnalytics } from '../../services/api'
import { useAuth }      from '../../context/AuthContext'
import { TOOLS }        from '../../config/platform'

const ROUTES = TOOLS.quotex.routes

function Dashboard() {
  const navigate                    = useNavigate()
  const { user, logout, canAccess } = useAuth()

  const [data,      setData]      = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error,     setError]     = useState('')

  const currentYear = new Date().getFullYear()
  const [dateRange, setDateRange] = useState({
    from: `${currentYear}-01-01`,
    to:   `${currentYear}-12-31`,
  })

  const loadAnalytics = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const response = await getAnalytics(dateRange)
      setData(response.data)
    } catch (err) {
      setError('Could not load analytics: ' + err.message)
    } finally {
      setIsLoading(false)
    }
  }, [dateRange])

  useEffect(() => { loadAnalytics() }, [loadAnalytics])

  const formatValue = (value) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
    if (value >= 1000)    return `${(value / 1000).toFixed(1)}K`
    return value?.toLocaleString() || 0
  }

  return (
    <div className="gradient-bg" style={styles.container}>

      {/* ── Frosted Navbar ── */}
      <header className="glass" style={styles.navbar}>
        <div style={styles.navContainer}>
          <div style={styles.navBrand}>
            <div style={styles.logoMini}>Q</div>
            <h2 style={styles.navTitle}>{TOOLS.quotex.name} Dashboard</h2>
          </div>
          
          <div style={styles.navLinks}>
            <div style={styles.userInfo}>
              <span style={styles.userBadge}>{user?.licence} Access</span>
              <span style={styles.userName}>{user?.firstName} {user?.lastName}</span>
            </div>
            
            <div style={styles.navInteractions}>
              <button style={{ ...styles.navLink, ...styles.navLinkActive }}
                onClick={() => navigate(ROUTES.dashboard)}>
                Analytics
              </button>
              <button style={styles.navLink}
                onClick={() => navigate(ROUTES.tracker)}>
                Tracker
              </button>
              <button style={styles.navButtonHome}
                onClick={() => navigate('/tool-launcher')}>
                🏠
              </button>
              <button style={styles.logoutButton}
                onClick={() => { logout(); navigate('/') }}>
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main style={styles.content}>

        <div style={styles.pageHeader}>
          <h1 style={styles.heading}>Performance Overview</h1>
          <div style={styles.dateFilter}>
            <div style={styles.inputGroup}>
              <input type="date" style={styles.dateInput} value={dateRange.from}
                onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })} />
              <span style={styles.dateSeparator}>→</span>
              <input type="date" style={styles.dateInput} value={dateRange.to}
                onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })} />
            </div>
            <div style={styles.quickFilters}>
              <button style={styles.quickFilter}
                onClick={() => setDateRange({ from: `${currentYear}-01-01`, to: `${currentYear}-12-31` })}>
                This Year
              </button>
              <button style={styles.quickFilter} onClick={() => {
                const now = new Date()
                const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
                const lastDay  = new Date(now.getFullYear(), now.getMonth() + 1, 0)
                setDateRange({ from: firstDay.toISOString().split('T')[0], to: lastDay.toISOString().split('T')[0] })
              }}>This Month</button>
              <button style={styles.quickFilter}
                onClick={() => setDateRange({ from: '', to: '' })}>
                All Time
              </button>
            </div>
          </div>
        </div>

        <div style={styles.quickActions}>
          <button style={styles.actionButtonPrimary}
            onClick={() => navigate(ROUTES.newQuotation)}>
             + Create Quotation
          </button>
          <button style={styles.actionButtonSecondary}
            onClick={() => navigate(ROUTES.tracker)}>
            🔍 View Tracker
          </button>
        </div>

        {!canAccess('analytics') && (
          <div className="glass" style={styles.upgradeBox}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>💎 Premium Feature</div>
            <p>Full-scale analytics requires a <strong>Pro</strong> or <strong>Enterprise</strong> licence.</p>
            <p style={{ fontSize: 13, opacity: 0.8 }}>Contact your account manager to activate advanced insights.</p>
          </div>
        )}

        {isLoading && canAccess('analytics') && (
          <div style={styles.centreMessage}>Analyzing data...</div>
        )}

        {error && <div style={styles.errorBox}>⚠️ {error}</div>}

        {!isLoading && !error && data && canAccess('analytics') && (
          <>
            <div style={styles.cardsRow}>
              {[
                { label: 'Total RFQs', value: data.summary?.totalRFQs    || 0, sub: 'Created in period',   color: 'var(--primary)' },
                { label: 'Awarded',   value: data.summary?.awarded       || 0, sub: 'Converted successfully', color: '#10b981' },
                { label: 'In Progress', value: data.summary?.inProgress    || 0, sub: 'Evaluating',         color: '#f59e0b' },
                { label: 'Awarded Value', value: '₹' + formatValue(data.summary?.totalAwardedValue || 0), sub: 'Total Revenue', color: '#6366f1' },
                { label: 'Success Rate', value: `${data.summary?.winRate || 0}%`, sub: 'Winning Percentage', color: 'var(--accent)' },
              ].map(card => (
                <div key={card.label} className="glass" style={{ ...styles.card, borderLeft: `4px solid ${card.color}` }}>
                  <div style={styles.cardLabel}>{card.label}</div>
                  <div style={{ ...styles.cardValue, color: card.color }}>{card.value}</div>
                  <div style={styles.cardSub}>{card.sub}</div>
                </div>
              ))}
            </div>

            <div style={styles.chartsGrid}>
              {data.monthlyChartData?.length > 0 && (
                <div className="glass" style={styles.chartCard}>
                  <div style={styles.chartTitle}>Monthly Conversion Trend</div>
                  <div style={styles.chartSubtitle}>Comparing awarded vs lost opportunities</div>
                  <ResponsiveContainer width="100%" height={320}>
                    <ComposedChart data={data.monthlyChartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: 'var(--shadow-lg)' }}
                      />
                      <Legend iconType="circle" />
                      <Bar dataKey="awarded"    name="Awarded"    fill="#10b981" radius={[4,4,0,0]} />
                      <Bar dataKey="notAwarded" name="Not Awarded" fill="#ef4444" radius={[4,4,0,0]} />
                      <Line type="monotone" dataKey="value" name="Value" stroke="var(--accent)" strokeWidth={3} dot={{ stroke: 'var(--accent)', strokeWidth: 2, fill: '#fff' }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}

              {data.funnelData?.length > 0 && (
                <div className="glass" style={styles.chartCardSmall}>
                  <div style={styles.chartTitle}>Pipeline Distribution</div>
                  <div style={styles.chartSubtitle}>Quotations by current lifecycle stage</div>
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={data.funnelData} layout="vertical" margin={{ left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                      <XAxis type="number" hide />
                      <YAxis dataKey="status" type="category" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} width={90} />
                      <Tooltip cursor={{ fill: 'transparent' }} />
                      <Bar dataKey="count" fill="var(--primary)" radius={[0,6,6,0]} barSize={24} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </>
        )}

        {!isLoading && !error && data && !canAccess('analytics') && (
          <div style={styles.centreMessage}>Unlock pro-level insights by upgrading your organization's licence.</div>
        )}

      </main>
    </div>
  )
}

const styles = {
  container:  { minHeight: '100vh' },
  navbar: { 
    position: 'sticky', top: 0, zIndex: 100,
    borderBottom: '1px solid var(--card-border)',
  },
  navContainer: {
    maxWidth: 1400, margin: '0 auto', padding: '12px 40px',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  },
  navBrand: { display: 'flex', alignItems: 'center', gap: 12 },
  logoMini: {
    width: 32, height: 32, backgroundColor: 'var(--accent)', color: '#fff',
    borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: 18
  },
  navTitle:   { fontSize: '18px', fontWeight: 800, color: 'var(--primary)', margin: 0 },
  navLinks:   { display: 'flex', gap: '32px', alignItems: 'center' },
  navInteractions: { display: 'flex', gap: '12px', alignItems: 'center' },
  navLink:    { background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '14px', cursor: 'pointer', padding: '8px 16px', borderRadius: '10px', fontWeight: 500, transition: 'var(--transition)' },
  navLinkActive: { color: 'var(--primary)', backgroundColor: 'rgba(0,0,0,0.05)', fontWeight: 700 },
  userInfo:   { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 },
  userName:   { color: 'var(--primary)', fontSize: '14px', fontWeight: 600 },
  userBadge:  { fontSize: '10px', textTransform: 'uppercase', fontWeight: 800, color: 'var(--accent)', letterSpacing: '0.5px' },
  navButtonHome: { background: 'none', border: '1.5px solid var(--card-border)', cursor: 'pointer', width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 },
  logoutButton: { backgroundColor: 'var(--primary)', color: '#fff', border: 'none', fontSize: '13px', cursor: 'pointer', padding: '8px 16px', borderRadius: '10px', fontWeight: 600 },
  content:    { padding: '60px 40px', maxWidth: '1400px', margin: '0 auto' },
  pageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' },
  heading:    { fontSize: '36px', color: 'var(--primary)', fontWeight: 800, margin: 0 },
  dateFilter: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px' },
  inputGroup: { display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#fff', padding: '6px', borderRadius: '12px', border: '1.5px solid var(--card-border)' },
  dateInput:  { padding: '6px 12px', borderRadius: '8px', border: 'none', fontSize: '13px', color: 'var(--text-main)', cursor: 'pointer', outline: 'none' },
  dateSeparator: { fontSize: '14px', color: '#94a3b8' },
  quickFilters: { display: 'flex', gap: '8px' },
  quickFilter: { padding: '6px 14px', backgroundColor: 'transparent', border: '1.5px solid var(--card-border)', borderRadius: '10px', fontSize: '12px', cursor: 'pointer', color: 'var(--text-muted)', fontWeight: 600, transition: 'var(--transition)' },
  quickActions: { display: 'flex', gap: '16px', marginBottom: '40px' },
  actionButtonPrimary: { padding: '12px 24px', backgroundColor: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', boxShadow: 'var(--shadow-md)' },
  actionButtonSecondary: { padding: '12px 24px', backgroundColor: '#fff', color: 'var(--primary)', border: '1.5px solid var(--card-border)', borderRadius: '12px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' },
  upgradeBox:  { padding: '32px', textAlign: 'center', marginBottom: '40px', borderRadius: 24, border: '1px solid #fde68a', color: '#92400e' },
  cardsRow:    { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '24px', marginBottom: '40px' },
  card:        { borderRadius: '20px', padding: '24px', transition: 'var(--transition)' },
  cardLabel:   { fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' },
  cardValue:   { fontSize: '36px', fontWeight: '800', marginBottom: '4px', fontFamily: 'Outfit' },
  cardSub:     { fontSize: '12px', color: '#94a3b8' },
  chartsGrid:  { display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '24px', marginBottom: '24px' },
  chartCard:   { borderRadius: '24px', padding: '32px' },
  chartCardSmall: { borderRadius: '24px', padding: '32px' },
  chartTitle:  { fontSize: '18px', fontWeight: '800', color: 'var(--primary)', marginBottom: '4px' },
  chartSubtitle: { fontSize: '13px', color: 'var(--text-muted)', marginBottom: '32px' },
  centreMessage: { textAlign: 'center', padding: '80px', borderRadius: '24px', color: 'var(--text-muted)' },
  errorBox:    { padding: '16px', backgroundColor: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '12px', color: '#e11d48', marginBottom: '24px', textAlign: 'center', fontSize: 14, fontWeight: 600 },
}

export default Dashboard
