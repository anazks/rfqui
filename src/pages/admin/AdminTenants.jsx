// AdminTenants.jsx — Tenant list + create tenant form.
// Fixes: isActive defaults to true, toggle uses correct _id,
// removed licence dates, no placeholder text.

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAllTenants, createTenant, toggleTenant, getAvailableTools } from '../../services/api'

function AdminTenants() {
  const navigate = useNavigate()

  const [tenants,     setTenants]     = useState([])
  const [tools,       setTools]       = useState([])
  const [isLoading,   setIsLoading]   = useState(true)
  const [error,       setError]       = useState('')
  const [showForm,    setShowForm]    = useState(false)
  const [isSaving,    setIsSaving]    = useState(false)
  const [saveError,   setSaveError]   = useState('')
  const [saveSuccess, setSaveSuccess] = useState('')

  const [form, setForm] = useState({
    tenantId:    '',
    companyName: '',
    address:     '',
    gst:         '',
    maxUsers:    5,
    activeTools: [],
    adminNotes:  '',
    pdfBranding: {
      companyName:  '',
      primaryColor: '#1a3c5e',
      footerNote:   'This is a computer generated quotation. No signature required.',
    },
  })

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [tenantsRes, toolsRes] = await Promise.all([
        getAllTenants(),
        getAvailableTools(),
      ])
      setTenants(tenantsRes.data.tenants)
      setTools(toolsRes.data.tools)
    } catch (err) {
      setError('Failed to load: ' + err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleToolToggle = (toolCode) => {
    setForm(prev => {
      const exists = prev.activeTools.find(t => t.toolCode === toolCode)
      if (exists) {
        return { ...prev, activeTools: prev.activeTools.filter(t => t.toolCode !== toolCode) }
      }
      return { ...prev, activeTools: [...prev.activeTools, { toolCode, isActive: true }] }
    })
  }

  const resetForm = () => ({
    tenantId: '', companyName: '', address: '', gst: '',
    maxUsers: 5, activeTools: [], adminNotes: '',
    pdfBranding: {
      companyName: '', primaryColor: '#1a3c5e',
      footerNote: 'This is a computer generated quotation. No signature required.',
    },
  })

  const handleSubmit = async () => {
    setSaveError('')
    setSaveSuccess('')
    if (!form.tenantId || !form.companyName) {
      setSaveError('Tenant ID and company name are required')
      return
    }
    if (form.activeTools.length === 0) {
      setSaveError('Please select at least one tool for this tenant')
      return
    }
    setIsSaving(true)
    try {
      await createTenant({
        ...form,
        pdfBranding: {
          ...form.pdfBranding,
          companyName:    form.pdfBranding.companyName || form.companyName,
          companyAddress: form.address || '',
        },
      })
      setSaveSuccess(`"${form.companyName}" created successfully and is Active.`)
      setShowForm(false)
      setForm(resetForm())
      loadData()
    } catch (err) {
      setSaveError(err.response?.data?.message || 'Failed to create tenant')
    } finally {
      setIsSaving(false)
    }
  }

  // Fix: use tenant._id (MongoDB ObjectId) not tenant.tenantId
  const handleToggle = async (tenant) => {
    try {
      await toggleTenant(tenant._id)
      loadData()
    } catch (err) {
      alert('Failed: ' + err.message)
    }
  }

  const formatDate = (date) => {
    if (!date) return '—'
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    })
  }

  return (
    <div>
      <div style={styles.pageHeader}>
        <h1 style={styles.heading}>Tenants</h1>
        <button style={styles.newBtn} onClick={() => setShowForm(!showForm)}>
          {showForm ? '✕ Cancel' : '+ New Tenant'}
        </button>
      </div>

      {saveSuccess && <div style={styles.successBox}>{saveSuccess}</div>}
      {error && <div style={styles.errorBox}>{error}</div>}

      {/* ── Create Tenant Form ── */}
      {showForm && (
        <div style={styles.formCard}>
          <h3 style={styles.formTitle}>Register New Tenant</h3>
          <p style={styles.formNote}>
            New tenants are created as <strong>Active</strong> by default.
          </p>

          <div style={styles.formGrid}>
            <div style={styles.field}>
              <label style={styles.label}>
                Tenant ID *
                <span style={styles.hint}> — unique, lowercase, no spaces</span>
              </label>
              <input
                style={styles.input}
                value={form.tenantId}
                onChange={(e) => setForm({
                  ...form,
                  tenantId: e.target.value.toLowerCase().replace(/\s/g, '_')
                })}
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Company Name *</label>
              <input
                style={styles.input}
                value={form.companyName}
                onChange={(e) => setForm({ ...form, companyName: e.target.value })}
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Address</label>
              <input
                style={styles.input}
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>GST Number</label>
              <input
                style={styles.input}
                value={form.gst}
                onChange={(e) => setForm({ ...form, gst: e.target.value })}
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Max Users</label>
              <input
                style={styles.input}
                type="number"
                min="1"
                value={form.maxUsers}
                onChange={(e) => setForm({ ...form, maxUsers: parseInt(e.target.value) })}
              />
            </div>
          </div>

          {/* Tool selection */}
          <div style={styles.toolSection}>
            <label style={styles.label}>Active Tools *</label>
            <p style={styles.subLabel}>Select which tools this tenant has access to</p>
            <div style={styles.toolGrid}>
              {tools.map(tool => {
                const isSelected = form.activeTools.some(t => t.toolCode === tool.code)
                return (
                  <div
                    key={tool.code}
                    style={{ ...styles.toolCard, ...(isSelected ? styles.toolCardSelected : {}) }}
                    onClick={() => handleToolToggle(tool.code)}
                  >
                    <span style={styles.toolIcon}>{tool.iconEmoji || '🔧'}</span>
                    <span style={styles.toolName}>{tool.name}</span>
                    <span style={styles.toolDesc}>{tool.description}</span>
                    <span style={styles.toolCheck}>{isSelected ? '✅' : '⬜'}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* PDF Branding */}
          <div style={styles.brandingSection}>
            <label style={styles.label}>PDF Branding</label>
            <div style={styles.formGrid}>
              <div style={styles.field}>
                <label style={styles.subLabel}>Company name as it appears on PDF</label>
                <input
                  style={styles.input}
                  value={form.pdfBranding.companyName}
                  onChange={(e) => setForm({
                    ...form,
                    pdfBranding: { ...form.pdfBranding, companyName: e.target.value }
                  })}
                />
              </div>
              <div style={styles.field}>
                <label style={styles.subLabel}>Primary colour (hex code)</label>
                <div style={styles.colorRow}>
                  <input
                    style={{ ...styles.input, flex: 1 }}
                    value={form.pdfBranding.primaryColor}
                    onChange={(e) => setForm({
                      ...form,
                      pdfBranding: { ...form.pdfBranding, primaryColor: e.target.value }
                    })}
                  />
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '6px',
                    backgroundColor: form.pdfBranding.primaryColor,
                    borderWidth: '1px',borderStyle: 'solid',
                    borderColor: '#ddd', flexShrink: 0,
                  }} />
                </div>
              </div>
            </div>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Admin Notes</label>
            <textarea
              style={styles.textarea}
              value={form.adminNotes}
              onChange={(e) => setForm({ ...form, adminNotes: e.target.value })}
              rows={3}
            />
          </div>

          {saveError && <div style={styles.errorBox}>{saveError}</div>}

          <div style={styles.formActions}>
            <button
              style={{ ...styles.saveBtn, opacity: isSaving ? 0.7 : 1 }}
              onClick={handleSubmit}
              disabled={isSaving}
            >
              {isSaving ? 'Creating...' : 'Create Tenant'}
            </button>
            <button style={styles.cancelBtn} onClick={() => setShowForm(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Tenant List ── */}
      {isLoading && <div style={styles.loading}>Loading tenants...</div>}

      {!isLoading && (
        <div style={styles.tableCard}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.thead}>
                <th style={styles.th}>Company</th>
                <th style={styles.th}>Tools</th>
                <th style={styles.th}>Users</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Created</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tenants.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ ...styles.td, textAlign: 'center', color: '#888' }}>
                    No tenants yet. Click "+ New Tenant" to create one.
                  </td>
                </tr>
              )}
              {tenants.map((tenant, i) => (
                <tr
                  key={tenant._id}
                  style={{ ...styles.tr, backgroundColor: i % 2 === 0 ? '#fff' : '#f8f9fa' }}
                >
                  <td style={styles.td}>
                    <span style={styles.companyName}>{tenant.companyName}</span>
                    <span style={styles.tenantId}>{tenant.tenantId}</span>
                  </td>
                  <td style={styles.td}>
                    <div style={styles.toolsList}>
                      {(tenant.activeTools || []).map(t => (
                        <span key={t.toolCode} style={{ ...styles.toolBadge, opacity: t.isActive ? 1 : 0.4 }}>
                          {t.toolCode.toUpperCase()}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td style={styles.td}>{tenant.maxUsers} max</td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.badge,
                      backgroundColor: tenant.isActive ? '#e8f5e9' : '#ffebee',
                      color:           tenant.isActive ? '#2e7d32' : '#c62828',
                    }}>
                      {tenant.isActive ? '✅ Active' : '❌ Inactive'}
                    </span>
                  </td>
                  <td style={styles.td}>{formatDate(tenant.createdAt)}</td>
                  <td style={styles.td}>
                    <div style={styles.actionBtns}>
                      <button
                        style={styles.manageBtn}
                        onClick={() => navigate(`/admin/tenants/${tenant._id}`)}
                      >
                        Manage
                      </button>
                      <button
                        style={{
                          ...styles.toggleBtn,
                          backgroundColor: tenant.isActive ? '#ffebee' : '#e8f5e9',
                          color:           tenant.isActive ? '#c62828' : '#2e7d32',
                        }}
                        onClick={() => handleToggle(tenant)}
                      >
                        {tenant.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const styles = {
  pageHeader:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
  heading:     { fontSize: '24px', color: '#1a1a2e', margin: 0 },
  newBtn: {
    padding: '10px 20px', backgroundColor: '#1a1a2e',
    color: '#fff', border: 'none', borderRadius: '6px',
    fontSize: '14px', fontWeight: '600', cursor: 'pointer',
  },
  successBox: {
    padding: '14px', backgroundColor: '#e8f5e9',
    borderWidth: '1px',borderStyle: 'solid',
    borderColor: ' #68d391', borderRadius: '8px',
    color: '#2e7d32', marginBottom: '16px', fontSize: '14px',
  },
  errorBox: {
    padding: '12px', backgroundColor: '#fff5f5',
    borderWidth: '1px',borderStyle: 'solid',
    borderColor: ' #fc8181', borderRadius: '6px',
    color: '#c53030', marginBottom: '16px', fontSize: '13px',
  },
  formCard: {
    backgroundColor: '#fff', borderRadius: '10px',
    padding: '24px', marginBottom: '24px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  },
  formTitle: { fontSize: '16px', fontWeight: '700', color: '#1a1a2e', marginBottom: '8px' },
  formNote:  { fontSize: '13px', color: '#2e7d32', marginBottom: '20px' },
  formGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '16px', marginBottom: '20px',
  },
  field:       { display: 'flex', flexDirection: 'column', gap: '6px' },
  label:       { fontSize: '13px', fontWeight: '600', color: '#444' },
  subLabel:    { fontSize: '12px', color: '#888', marginBottom: '4px' },
  hint:        { fontSize: '11px', color: '#aaa', fontWeight: '400' },
  input: {
    padding: '9px 12px', borderRadius: '6px',
    borderWidth: '1px',borderStyle: 'solid',
    borderColor: ' #ddd', fontSize: '13px',
  },
  textarea: {
    padding: '9px 12px', borderRadius: '6px',
    borderWidth: '1px',borderStyle: 'solid',
    borderColor: ' #ddd', fontSize: '13px',
    resize: 'vertical', fontFamily: 'inherit',
  },
  toolSection:    { marginBottom: '20px' },
  toolGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '12px', marginTop: '8px',
  },
  toolCard: {
    padding: '14px', borderRadius: '8px',
    borderWidth: '2px',borderStyle: 'solid',
    borderColor: '#e0e0e0', cursor: 'pointer',
    display: 'flex', flexDirection: 'column', gap: '4px',
  },
  toolCardSelected: { borderColor: '#1a3c5e', backgroundColor: '#f0f4f8' },
  toolIcon:  { fontSize: '24px' },
  toolName:  { fontSize: '13px', fontWeight: '700', color: '#1a1a2e' },
  toolDesc:  { fontSize: '11px', color: '#888' },
  toolCheck: { fontSize: '16px', marginTop: '4px' },
  brandingSection: { marginBottom: '20px' },
  colorRow:  { display: 'flex', gap: '8px', alignItems: 'center' },
  formActions: { display: 'flex', gap: '12px', marginTop: '8px' },
  saveBtn: {
    padding: '10px 24px', backgroundColor: '#1a1a2e',
    color: '#fff', border: 'none', borderRadius: '6px',
    fontSize: '14px', fontWeight: '600', cursor: 'pointer',
  },
  cancelBtn: {
    padding: '10px 24px', backgroundColor: 'transparent',
    color: '#666',  borderWidth: '1px',borderStyle: 'solid',
    borderColor: ' #ddd',
    borderRadius: '6px', fontSize: '14px', cursor: 'pointer',
  },
  loading:  { padding: '40px', color: '#666', textAlign: 'center' },
  tableCard: {
    backgroundColor: '#fff', borderRadius: '10px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden',
  },
  table:       { width: '100%', borderCollapse: 'collapse' },
  thead:       { backgroundColor: '#1a1a2e' },
  th: {
    padding: '10px 16px', textAlign: 'left',
    fontSize: '11px', fontWeight: '600', color: '#fff', whiteSpace: 'nowrap',
  },
  tr:          { borderBottom: '1px solid #f0f0f0' },
  td:          { padding: '12px 16px', fontSize: '13px', color: '#333', verticalAlign: 'middle' },
  companyName: { fontWeight: '600', display: 'block', color: '#1a1a2e' },
  tenantId:    { fontSize: '11px', color: '#888', display: 'block' },
  badge: {
    padding: '3px 10px', borderRadius: '12px',
    fontSize: '11px', fontWeight: '600',
  },
  toolsList:   { display: 'flex', gap: '4px', flexWrap: 'wrap' },
  toolBadge: {
    padding: '2px 8px', backgroundColor: '#e8f4fd',
    color: '#1a3c5e', borderRadius: '10px', fontSize: '11px', fontWeight: '600',
  },
  actionBtns:  { display: 'flex', gap: '6px' },
  manageBtn: {
    padding: '5px 12px', backgroundColor: '#1a1a2e',
    color: '#fff', border: 'none', borderRadius: '4px',
    fontSize: '12px', cursor: 'pointer',
  },
  toggleBtn: {
    padding: '5px 12px', border: 'none',
    borderRadius: '4px', fontSize: '12px',
    cursor: 'pointer', fontWeight: '600',
  },
}

export default AdminTenants