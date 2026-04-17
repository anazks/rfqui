// Tracker.jsx — Master Quotation Tracker with versioning support.

import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getTrackerQuotations,
  updateQuotationStatus,
  downloadPdf,
  getQuotationById,
} from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { TOOLS } from '../../config/platform'

const STATUS_COLORS = {
  'Draft':       { bg: 'rgba(148, 163, 184, 0.1)', text: '#64748b' },
  'Sent':        { bg: 'rgba(99, 102, 241, 0.1)',  text: '#6366f1' },
  'In Progress': { bg: 'rgba(245, 158, 11, 0.1)',  text: '#f59e0b' },
  'Awarded':     { bg: 'rgba(16, 185, 129, 0.1)',  text: '#10b981' },
  'Not Awarded': { bg: 'rgba(239, 68, 68, 0.1)',   text: '#ef4444' },
}

const ALL_STATUSES = ['Draft', 'Sent', 'In Progress', 'Awarded', 'Not Awarded']

function Tracker() {
  const navigate                        = useNavigate()
  const { user, logout }                = useAuth()

  const [quotations, setQuotations]                 = useState([])
  const [isLoading, setIsLoading]       = useState(true)
  const [error, setError]               = useState('')
  const [filterStatus, setFilterStatus] = useState('All')
  const [editingId, setEditingId]       = useState(null)
  const [editData, setEditData]         = useState({
    status: '', reasonForLoss: '', notes: '', followUpDate: '',
  })
  const [saveError, setSaveError]       = useState('')
  const [isSaving, setIsSaving]         = useState(false)

  const [selectedVersions, setSelectedVersions] = useState({})

  useEffect(() => { loadQuotations() }, [])

  const loadQuotations = async () => {
    setIsLoading(true)
    setError('')
    try {
      const response = await getTrackerQuotations()
      setQuotations(response.data.quotations)
    } catch (err) {
      setError('Could not load quotations: ' + err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const getDisplayedQuotation = (q) => {
    const key = q._id?.toString()
    const selected = selectedVersions[key]
    if (selected) {
      const stillExists = q.allVersions?.find(v => v._id?.toString() === selected._id?.toString())
      return stillExists || q
    }
    return q
  }

  const handleVersionSwitch = (quoteId, versionId, allVersions) => {
    const selected = allVersions.find(v => v._id?.toString() === versionId?.toString())
    if (selected) {
      setSelectedVersions(prev => ({ ...prev, [quoteId.toString()]: selected }))
    }
  }

  const filteredQuotations = filterStatus === 'All'
    ? quotations
    : quotations.filter(q => getDisplayedQuotation(q).status === filterStatus)

  const startEditing = (q) => {
    const displayed = getDisplayedQuotation(q)
    setEditingId(q._id)
    setSaveError('')
    setEditData({
      status:        displayed.status,
      reasonForLoss: displayed.reasonForLoss || '',
      notes:         displayed.notes         || '',
      followUpDate:  displayed.followUpDate
        ? new Date(displayed.followUpDate).toISOString().split('T')[0]
        : '',
    })
  }

  const cancelEditing = () => {
    setEditingId(null)
    setSaveError('')
  }

  const saveUpdate = async (quoteId) => {
    setSaveError('')
    setIsSaving(true)
    try {
      const displayed = getDisplayedQuotation(quotations.find(r => r._id === quoteId))
      await updateQuotationStatus(displayed._id, {
        status:        editData.status,
        reasonForLoss: editData.reasonForLoss,
        notes:         editData.notes,
        followUpDate:  editData.followUpDate || null,
      })
      await loadQuotations()
      setEditingId(null)
    } catch (err) {
      setSaveError(err.response?.data?.message || 'Failed to save changes.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleRevise = async (q) => {
    try {
      const displayed = getDisplayedQuotation(q)
      const response  = await getQuotationById(displayed._id)
      const fullQuotation   = response.data
      navigate('/quotex/new', {
        state: {
          quotation: {
            ...fullQuotation,
            allVersions: q.allVersions || [],
          }
        }
      })
    } catch (err) {
      alert('Revision failed: ' + err.message)
    }
  }

  const handleDownloadPdf = async (q) => {
    try {
      const displayed = getDisplayedQuotation(q)
      const response  = await downloadPdf(displayed._id)
      const url       = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
      const link = document.createElement('a')
      link.href  = url
      link.setAttribute('download', `${displayed.quoteNumber}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      alert('PDF download failed: ' + err.message)
    }
  }

  const formatDate = (date) => {
    if (!date) return '—'
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short'
    })
  }

  const formatAmount = (q) => {
    const symbol = q.currencySymbol || '₹'
    return `${symbol} ${parseFloat(q.grandTotal || 0).toLocaleString(undefined, {
      minimumFractionDigits: 0,
    })}`
  }

  const countByStatus = (status) =>
    quotations.filter(r => getDisplayedQuotation(r).status === status).length

  return (
    <div className="gradient-bg" style={styles.container}>

      {/* ── Frosted Navbar ── */}
      <header className="glass" style={styles.navbar}>
        <div style={styles.navContainer}>
          <div style={styles.navBrand}>
            <div style={styles.logoMini}>Q</div>
            <h2 style={styles.navTitle}>{TOOLS.quotex.name} Tracker</h2>
          </div>
          
          <div style={styles.navInteractions}>
            <button style={styles.navLink} onClick={() => navigate('/quotex/dashboard')}>
              Analytics
            </button>
            <button style={{ ...styles.navLink, ...styles.navLinkActive }}
              onClick={() => navigate('/quotex/tracker')}>
              Tracker
            </button>
            <button style={styles.navButtonHome} title="Main Menu"
              onClick={() => navigate('/tool-launcher')}>
              🏠
            </button>
            <button style={styles.logoutButton}
              onClick={() => { logout(); navigate('/') }}>
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main style={styles.content}>

        {/* ── Page Header ── */}
        <div style={styles.pageHeader}>
          <div>
            <h1 style={styles.heading}>Quotation Hub</h1>
            <p style={styles.subheading}>Manage and track your business opportunities.</p>
          </div>
          <button style={styles.newRfqButton} onClick={() => navigate('/quotex/new')}>
             + Create New
          </button>
        </div>

        {/* ── Filter Tabs ── */}
        <div style={styles.filterTabs}>
          <button
            style={{ ...styles.filterTab, ...(filterStatus === 'All' ? styles.filterTabActive : {}) }}
            onClick={() => setFilterStatus('All')}
          >
            All Positions <span style={styles.tabCount}>{quotations.length}</span>
          </button>
          {ALL_STATUSES.map(status => (
            <button
              key={status}
              style={{ ...styles.filterTab, ...(filterStatus === status ? styles.filterTabActive : {}) }}
              onClick={() => setFilterStatus(status)}
            >
              {status} <span style={styles.tabCount}>{countByStatus(status)}</span>
            </button>
          ))}
        </div>

        {isLoading && <div style={styles.centreMessage}>Fetching records...</div>}
        {error && <div style={styles.errorBox}>⚠️ {error}</div>}

        {!isLoading && filteredQuotations.length === 0 && (
          <div className="glass" style={styles.emptyState}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📂</div>
            <p style={styles.emptyTitle}>Nothing to show here</p>
            <p style={styles.emptySubtext}>
              {filterStatus === 'All' ? 'No quotations created yet.' : `No ${filterStatus} records found.`}
            </p>
          </div>
        )}

        {/* ── Modern Table ── */}
        {!isLoading && filteredQuotations.length > 0 && (
          <div className="glass" style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeaderRow}>
                  <th style={styles.th}>Reference</th>
                  <th style={styles.th}>Client</th>
                  <th style={styles.th}>Valuation</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Deadline</th>
                  <th style={styles.th}>Version</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredQuotations.map((q) => {
                  const displayed = getDisplayedQuotation(q)
                  const statusStyling = STATUS_COLORS[displayed.status] || STATUS_COLORS['Draft']
                  
                  return (
                    <React.Fragment key={q._id}>
                      <tr style={{
                        ...styles.tableRow,
                        backgroundColor: displayed.isOverdue ? 'rgba(239, 68, 68, 0.05)' : 'transparent',
                      }}>
                        <td style={styles.td}>
                          <span style={styles.quoteNumber}>{displayed.quoteNumber}</span>
                          {displayed.isOverdue && <span style={styles.overdueBadge}>Overdue</span>}
                        </td>

                        <td style={styles.td}>
                          <span style={styles.companyName}>{displayed.customer?.companyName}</span>
                          <span style={styles.contactName}>{displayed.customer?.contactName || 'General Inquiry'}</span>
                        </td>

                        <td style={styles.td}>
                          <span style={styles.amountCell}>{formatAmount(displayed)}</span>
                        </td>

                        <td style={styles.td}>
                          <span style={{
                            ...styles.statusBadge,
                            backgroundColor: statusStyling.bg,
                            color: statusStyling.text,
                          }}>
                            {displayed.status}
                          </span>
                        </td>

                        <td style={{ ...styles.td, color: displayed.isOverdue ? '#ef4444' : 'var(--text-muted)' }}>
                          {formatDate(displayed.followUpDate)}
                        </td>

                        <td style={styles.td}>
                          {q.hasMultipleVersions ? (
                            <select
                              style={styles.versionSelect}
                              value={displayed._id}
                              onChange={(e) => handleVersionSwitch(q._id, e.target.value, q.allVersions)}
                            >
                              {q.allVersions.map(v => (
                                <option key={v._id} value={v._id}>V{v.version}</option>
                              ))}
                            </select>
                          ) : (
                            <span style={styles.versionBadge}>v{displayed.version}</span>
                          )}
                        </td>

                        <td style={styles.td}>
                          <div style={styles.actionButtons}>
                            <button style={styles.btnIcon} onClick={() => startEditing(q)} title="Quick Edit">✏️</button>
                            <button style={styles.btnIcon} onClick={() => handleRevise(q)} title="New Version">🔄</button>
                            <button style={styles.btnIcon} onClick={() => handleDownloadPdf(q)} title="Get PDF">📄</button>
                          </div>
                        </td>
                      </tr>

                      {/* ── Quick Edit Panel ── */}
                      {editingId === q._id && (
                        <tr key={`${q._id}-edit`}>
                          <td colSpan={7} style={styles.editRowCell}>
                            <div className="glass" style={styles.editPanel}>
                              <div style={styles.editRow}>
                                <div style={styles.editField}>
                                  <label style={styles.editLabel}>Project Status</label>
                                  <select
                                    style={styles.editSelect}
                                    value={editData.status}
                                    onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                                  >
                                    {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                  </select>
                                </div>
                                <div style={styles.editField}>
                                  <label style={styles.editLabel}>Next Follow-up</label>
                                  <input type="date" style={styles.editInput} value={editData.followUpDate}
                                    onChange={(e) => setEditData({ ...editData, followUpDate: e.target.value })} />
                                </div>
                                <div style={{ ...styles.editField, flex: 2 }}>
                                  <label style={styles.editLabel}>Remarks</label>
                                  <input type="text" style={styles.editInput} value={editData.notes}
                                    placeholder="Internal notes..."
                                    onChange={(e) => setEditData({ ...editData, notes: e.target.value })} />
                                </div>
                                <div style={styles.editActions}>
                                  <button style={styles.saveBtn} onClick={() => saveUpdate(q._id)} disabled={isSaving}>
                                    {isSaving ? '...' : 'Apply'}
                                  </button>
                                  <button style={styles.cancelBtn} onClick={cancelEditing}>✕</button>
                                </div>
                              </div>
                              {editData.status === 'Not Awarded' && (
                                <div style={{ marginTop: 16 }}>
                                  <label style={styles.editLabel}>Reason for Loss <span style={{ color: '#ef4444' }}>*</span></label>
                                  <input type="text" style={styles.editInput} value={editData.reasonForLoss}
                                    placeholder="Enter reason..."
                                    onChange={(e) => setEditData({ ...editData, reasonForLoss: e.target.value })} />
                                </div>
                              )}
                              {saveError && <div style={styles.saveError}>{saveError}</div>}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}

const styles = {
  container:      { minHeight: '100vh' },
  navbar: { position: 'sticky', top: 0, zIndex: 100, borderBottom: '1px solid var(--card-border)' },
  navContainer: {
    maxWidth: 1400, margin: '0 auto', padding: '12px 40px',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  },
  navBrand: { display: 'flex', alignItems: 'center', gap: 12 },
  logoMini: {
    width: 32, height: 32, backgroundColor: 'var(--primary)', color: '#fff',
    borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: 18
  },
  navTitle:   { fontSize: '18px', fontWeight: 800, color: 'var(--primary)', margin: 0 },
  navInteractions: { display: 'flex', gap: '8px', alignItems: 'center' },
  navLink:    { background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '14px', cursor: 'pointer', padding: '8px 16px', borderRadius: '10px', fontWeight: 500 },
  navLinkActive: { color: 'var(--primary)', fontWeight: 700 },
  navButtonHome: { background: 'none', border: '1.5px solid var(--card-border)', cursor: 'pointer', width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 },
  logoutButton: { backgroundColor: 'var(--primary)', color: '#fff', border: 'none', fontSize: '13px', cursor: 'pointer', padding: '8px 16px', borderRadius: '10px', fontWeight: 600 },
  content:        { padding: '60px 40px', maxWidth: '1400px', margin: '0 auto' },
  pageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' },
  heading:        { fontSize: '36px', color: 'var(--primary)', fontWeight: 800, margin: 0 },
  subheading:     { color: 'var(--text-muted)', fontSize: 15, marginTop: 4 },
  newRfqButton: {
    padding: '12px 24px', backgroundColor: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '12px',
    fontSize: '14px', fontWeight: '700', cursor: 'pointer', boxShadow: 'var(--shadow-md)',
  },
  filterTabs:     { display: 'flex', gap: '10px', marginBottom: '32px', overflowX: 'auto', paddingBottom: 8 },
  filterTab: {
    padding: '8px 18px', backgroundColor: 'rgba(255,255,255,0.6)', border: '1.5px solid var(--card-border)', borderRadius: '14px',
    fontSize: '13px', cursor: 'pointer', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, transition: 'var(--transition)'
  },
  filterTabActive: { backgroundColor: 'var(--primary)', color: '#fff', borderColor: 'var(--primary)' },
  tabCount: { fontSize: '11px', opacity: 0.7, backgroundColor: 'rgba(0,0,0,0.05)', padding: '2px 8px', borderRadius: 8 },
  tableWrapper: { borderRadius: '24px', overflow: 'hidden', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-sm)' },
  table:          { width: '100%', borderCollapse: 'collapse' },
  tableHeaderRow: { borderBottom: '1px solid var(--card-border)', backgroundColor: 'rgba(248, 250, 252, 0.5)' },
  th: { padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px' },
  tableRow:       { borderBottom: '1px solid var(--card-border)', transition: 'background 0.2s' },
  td: { padding: '18px 24px', fontSize: '14px', color: 'var(--text-main)', verticalAlign: 'middle' },
  quoteNumber:      { fontWeight: '800', color: 'var(--primary)', display: 'block' },
  overdueBadge: { fontSize: '9px', color: '#fff', backgroundColor: '#ef4444', padding: '1px 5px', borderRadius: 4, fontWeight: '800', display: 'inline-block', marginTop: 4, textTransform: 'uppercase' },
  companyName:    { fontWeight: '700', display: 'block' },
  contactName:    { fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginTop: 2 },
  amountCell:     { fontWeight: '800', color: 'var(--primary)', fontFamily: 'Outfit' },
  statusBadge: { padding: '4px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' },
  versionBadge: { padding: '2px 8px', backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: '6px', fontSize: '12px', color: 'var(--text-muted)' },
  versionSelect: { padding: '4px 8px', borderRadius: '8px', border: '1.5px solid var(--card-border)', fontSize: '12px', cursor: 'pointer', outline: 'none' },
  actionButtons:  { display: 'flex', gap: '8px' },
  btnIcon: { background: 'rgba(0,0,0,0.03)', border: '1px solid var(--card-border)', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 13 },
  editRowCell: { padding: '12px 24px', backgroundColor: 'rgba(248, 250, 252, 0.6)' },
  editPanel:      { padding: '24px', borderRadius: 16, border: '1px solid var(--card-border)' },
  editRow:        { display: 'flex', gap: '16px', alignItems: 'flex-end' },
  editField:      { display: 'flex', flexDirection: 'column', gap: 6 },
  editLabel:      { fontSize: '12px', fontWeight: '700', color: 'var(--primary)', textTransform: 'uppercase' },
  editSelect: { padding: '10px', borderRadius: '10px', border: '1.5px solid var(--card-border)', fontSize: '13px', outline: 'none' },
  editInput: { padding: '10px', borderRadius: '10px', border: '1.5px solid var(--card-border)', fontSize: '13px', outline: 'none', width: '100%' },
  editActions:    { display: 'flex', gap: '8px' },
  saveBtn: { padding: '10px 20px', backgroundColor: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' },
  cancelBtn: { padding: '10px', color: 'var(--text-muted)', border: 'none', background: 'none', cursor: 'pointer', fontSize: 18 },
  saveError: { color: '#ef4444', fontSize: '12px', marginTop: 12, fontWeight: 600 },
  emptyState: { padding: '80px', textAlign: 'center', borderRadius: 24, border: '2px dashed var(--card-border)' },
  emptyTitle:     { fontSize: '20px', color: 'var(--primary)', fontWeight: 800 },
  emptySubtext:   { color: 'var(--text-muted)', marginTop: 8 },
  centreMessage:  { textAlign: 'center', padding: '100px', color: 'var(--text-muted)' },
  errorBox: { padding: '16px', backgroundColor: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '12px', color: '#e11d48', marginBottom: '24px', textAlign: 'center' },
}

export default Tracker