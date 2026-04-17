// AdminTenantDetail.jsx — Full tenant management page.
// Tabs: Users | Edit Settings | Templates
// Templates tab includes logo upload, Excel template, Word Word template.

import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  getTenant,
  getAvailableTools,
  createAdminUser,
  resetUserPassword,
  updateAdminUser,
  updateTenant,
  toggleTenant,
  uploadExcelTemplate,
  uploadWordTemplate,
  downloadExcelTemplate,
  downloadWordTemplate,
  uploadTenantLogo,
} from '../../services/api'

const VALIDITY_OPTIONS = [
  { value: 1,  label: '1 Month'   },
  { value: 6,  label: '6 Months'  },
  { value: 12, label: '12 Months' },
  { value: 24, label: '24 Months' },
]
const ROLE_OPTIONS    = ['individual', 'team_lead', 'group_lead', 'admin']
const LICENCE_OPTIONS = ['basic', 'pro', 'enterprise']

function AdminTenantDetail() {
  const { id }   = useParams()
  const navigate = useNavigate()

  // ── Core data ─────────────────────────────────
  const [tenant,    setTenant]    = useState(null)
  const [users,     setUsers]     = useState([])
  const [tools,     setTools]     = useState([])
  const [quotationCount, setQuotationCount]  = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error,     setError]     = useState('')
  const [activeTab, setActiveTab] = useState('users')

  // ── Create user ───────────────────────────────
  const [showUserForm,    setShowUserForm]    = useState(false)
  const [userForm,        setUserForm]        = useState({
    firstName: '', lastName: '', email: '',
    password: '', role: 'individual', toolAccess: [],
  })
  const [isSavingUser,    setIsSavingUser]    = useState(false)
  const [userFormError,   setUserFormError]   = useState('')
  const [userFormSuccess, setUserFormSuccess] = useState('')

  // ── Edit user ─────────────────────────────────
  const [editingUserId, setEditingUserId] = useState(null)
  const [editUserForm,  setEditUserForm]  = useState({
    firstName: '', lastName: '', role: 'individual',
    isActive: true, toolAccess: [],
  })
  const [isSavingEdit,  setIsSavingEdit]  = useState(false)
  const [editError,     setEditError]     = useState('')
  const [editSuccess,   setEditSuccess]   = useState('')

  // ── Password reset ────────────────────────────
  const [resetUserId,  setResetUserId]  = useState(null)
  const [newPassword,  setNewPassword]  = useState('')
  const [isResetting,  setIsResetting]  = useState(false)
  const [resetMessage, setResetMessage] = useState('')

  // ── Edit tenant settings ──────────────────────
  const [settingsForm,      setSettingsForm]      = useState(null)
  const [isSavingSettings,  setIsSavingSettings]  = useState(false)
  const [settingsError,     setSettingsError]     = useState('')
  const [settingsSuccess,   setSettingsSuccess]   = useState('')

  // ── Templates ─────────────────────────────────
  const [isUploadingExcel, setIsUploadingExcel] = useState(false)
  const [isUploadingWord,   setIsUploadingWord]   = useState(false)
  const [isUploadingLogo,  setIsUploadingLogo]  = useState(false)
  const [templateMessage,  setTemplateMessage]  = useState('')

  // ── Load ──────────────────────────────────────
  useEffect(() => { loadData() }, [id])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [tenantRes, toolsRes] = await Promise.all([
        getTenant(id),
        getAvailableTools(),
      ])
      setTenant(tenantRes.data.tenant)
      setUsers(tenantRes.data.users)
      setQuotationCount(tenantRes.data.rfqCount)
      setTools(toolsRes.data.tools)

      // Pre-populate create user toolAccess from tenant's active tools
      const tenantTools = tenantRes.data.tenant.activeTools || []
      setUserForm(prev => ({
        ...prev,
        toolAccess: tenantTools.filter(t => t.isActive).map(t => ({
          toolCode: t.toolCode, licence: 'basic', validityMonths: 12,
        }))
      }))

      // Pre-populate settings form
      const t = tenantRes.data.tenant
      setSettingsForm({
        companyName:         t.companyName         || '',
        address:             t.address             || '',
        gst:                 t.gst                 || '',
        maxUsers:            t.maxUsers            || 5,
        activeTools:         (t.activeTools || []).map(at => ({ ...at })),
        defaultFollowUpDays: t.defaultFollowUpDays || 7,
        defaultTerms:        t.defaultTerms        || '',
        adminNotes:          t.adminNotes          || '',
        pdfBranding: {
          companyName:    t.pdfBranding?.companyName    || '',
          companyAddress: t.pdfBranding?.companyAddress || '',
          companyPhone:   t.pdfBranding?.companyPhone   || '',
          companyEmail:   t.pdfBranding?.companyEmail   || '',
          primaryColor:   t.pdfBranding?.primaryColor   || '#1a3c5e',
          footerNote:     t.pdfBranding?.footerNote     || '',
        },
      })
    } catch (err) {
      setError('Failed to load: ' + err.message)
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

  const expiryPreview = (months) => {
    const d = new Date()
    d.setMonth(d.getMonth() + (months || 12))
    d.setDate(1)
    return d.toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    })
  }

  // ── Save settings ─────────────────────────────
  const handleSaveSettings = async () => {
    setSettingsError('')
    setSettingsSuccess('')
    if (!settingsForm.companyName) {
      setSettingsError('Company name is required')
      return
    }
    setIsSavingSettings(true)
    try {
      await updateTenant(id, settingsForm)
      setSettingsSuccess('Settings saved successfully')
      loadData()
    } catch (err) {
      setSettingsError(err.response?.data?.message || 'Failed to save settings')
    } finally {
      setIsSavingSettings(false)
    }
  }

  const toggleToolInSettings = (toolCode) => {
    setSettingsForm(prev => {
      const exists = prev.activeTools.find(t => t.toolCode === toolCode)
      if (exists) {
        return { ...prev, activeTools: prev.activeTools.filter(t => t.toolCode !== toolCode) }
      }
      return { ...prev, activeTools: [...prev.activeTools, { toolCode, isActive: true }] }
    })
  }

  const handleToggleTenant = async () => {
    try {
      await toggleTenant(tenant._id)
      loadData()
    } catch (err) {
      alert('Failed: ' + err.message)
    }
  }

  // ── Template helpers ──────────────────────────
  const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

  const handleExcelUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setIsUploadingExcel(true)
    setTemplateMessage('')
    try {
      const fileBase64 = await fileToBase64(file)
      await uploadExcelTemplate(id, { fileName: file.name, fileBase64 })
      setTemplateMessage('✅ Excel template uploaded: ' + file.name)
      loadData()
    } catch (err) {
      setTemplateMessage('❌ Upload failed: ' + (err.response?.data?.message || err.message))
    } finally {
      setIsUploadingExcel(false)
      e.target.value = ''
    }
  }

  const handleWordTemplateUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setIsUploadingWord(true)
    setTemplateMessage('')
    try {
      const fileBase64 = await fileToBase64(file)
      await uploadWordTemplate(id, { fileName: file.name, fileBase64 })
      setTemplateMessage('✅ Word template uploaded: ' + file.name)
      loadData()
    } catch (err) {
      setTemplateMessage('❌ Upload failed: ' + (err.response?.data?.message || err.message))
    } finally {
      setIsUploadingWord(false)
      e.target.value = ''
    }
  }

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setIsUploadingLogo(true)
    setTemplateMessage('')
    try {
      const reader = new FileReader()
      reader.onload = async () => {
        try {
          const base64   = reader.result.split(',')[1]
          const mimeType = file.type
          await uploadTenantLogo(id, {
            fileName:   file.name,
            fileBase64: base64,
            mimeType,
          })
          setTemplateMessage('✅ Logo uploaded: ' + file.name)
          loadData()
        } catch (err) {
          setTemplateMessage('❌ Upload failed: ' + (err.response?.data?.message || err.message))
        } finally {
          setIsUploadingLogo(false)
        }
      }
      reader.onerror = () => {
        setTemplateMessage('❌ Failed to read file')
        setIsUploadingLogo(false)
      }
      reader.readAsDataURL(file)
    } catch (err) {
      setTemplateMessage('❌ Upload failed: ' + err.message)
      setIsUploadingLogo(false)
    }
    e.target.value = ''
  }

  const handleDownloadExcel = async () => {
    try {
      const response = await downloadExcelTemplate(id)
      const url  = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href  = url
      link.setAttribute('download', tenant.excelTemplate?.fileName || 'template.xlsx')
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      alert('No Excel template uploaded for this tenant yet.')
    }
  }

  const handleDownloadWordTemplate = async () => {
    try {
      const response = await downloadWordTemplate(id)
      const url  = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href  = url
      link.setAttribute('download', tenant.wordTemplate?.fileName || 'rfq-template.docx')
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      alert('No Word template uploaded for this tenant yet.')
    }
  }

  // ── Create user handlers ──────────────────────
  const updateUserToolAccess = (toolCode, field, value) => {
    setUserForm(prev => ({
      ...prev,
      toolAccess: prev.toolAccess.map(t =>
        t.toolCode === toolCode ? { ...t, [field]: value } : t
      )
    }))
  }

  const toggleUserToolInForm = (toolCode) => {
    setUserForm(prev => {
      const exists = prev.toolAccess.find(t => t.toolCode === toolCode)
      if (exists) return { ...prev, toolAccess: prev.toolAccess.filter(t => t.toolCode !== toolCode) }
      return { ...prev, toolAccess: [...prev.toolAccess, { toolCode, licence: 'basic', validityMonths: 12 }] }
    })
  }

  const handleCreateUser = async () => {
    setUserFormError('')
    setUserFormSuccess('')
    if (!userForm.firstName || !userForm.lastName || !userForm.email || !userForm.password) {
      setUserFormError('All fields are required')
      return
    }
    if (userForm.toolAccess.length === 0) {
      setUserFormError('Please assign at least one tool to this user')
      return
    }
    setIsSavingUser(true)
    try {
      await createAdminUser({ ...userForm, tenantId: tenant.tenantId })
      setUserFormSuccess('User created successfully!')
      setShowUserForm(false)
      setUserForm({ firstName: '', lastName: '', email: '', password: '', role: 'individual', toolAccess: [] })
      loadData()
    } catch (err) {
      setUserFormError(err.response?.data?.message || 'Failed to create user')
    } finally {
      setIsSavingUser(false)
    }
  }

  // ── Edit user handlers ────────────────────────
  const startEditUser = (user) => {
    setEditingUserId(user._id)
    setEditError('')
    setEditSuccess('')
    setEditUserForm({
      firstName:  user.firstName,
      lastName:   user.lastName,
      role:       user.role,
      isActive:   user.isActive,
      toolAccess: (user.toolAccess || []).map(t => ({
        toolCode: t.toolCode, licence: t.licence,
        validityMonths: 12, licenceExpiresAt: t.licenceExpiresAt, isActive: t.isActive,
      }))
    })
  }

  const cancelEditUser = () => {
    setEditingUserId(null)
    setEditError('')
    setEditSuccess('')
  }

  const updateEditToolAccess = (toolCode, field, value) => {
    setEditUserForm(prev => ({
      ...prev,
      toolAccess: prev.toolAccess.map(t =>
        t.toolCode === toolCode ? { ...t, [field]: value } : t
      )
    }))
  }

  const toggleEditToolInForm = (toolCode) => {
    setEditUserForm(prev => {
      const exists = prev.toolAccess.find(t => t.toolCode === toolCode)
      if (exists) return { ...prev, toolAccess: prev.toolAccess.filter(t => t.toolCode !== toolCode) }
      return { ...prev, toolAccess: [...prev.toolAccess, { toolCode, licence: 'basic', validityMonths: 12, isActive: true }] }
    })
  }

  const handleSaveUserEdit = async (userId) => {
    setEditError('')
    setEditSuccess('')
    setIsSavingEdit(true)
    try {
      await updateAdminUser(userId, editUserForm)
      setEditSuccess('User updated successfully')
      setTimeout(() => { setEditingUserId(null); setEditSuccess(''); loadData() }, 1500)
    } catch (err) {
      setEditError(err.response?.data?.message || 'Failed to update user')
    } finally {
      setIsSavingEdit(false)
    }
  }

  const handleResetPassword = async (userId) => {
    if (!newPassword || newPassword.length < 6) {
      setResetMessage('Minimum 6 characters')
      return
    }
    setIsResetting(true)
    try {
      await resetUserPassword(userId, { newPassword })
      setResetMessage('✅ Password reset successfully')
      setNewPassword('')
      setTimeout(() => { setResetUserId(null); setResetMessage('') }, 2000)
    } catch (err) {
      setResetMessage('❌ Failed: ' + err.message)
    } finally {
      setIsResetting(false)
    }
  }

  if (isLoading) return <div style={styles.loading}>Loading...</div>
  if (error)     return <div style={styles.errorBox}>{error}</div>
  if (!tenant)   return null

  const tenantActiveCodes = (tenant.activeTools || [])
    .filter(t => t.isActive)
    .map(t => t.toolCode)

  // ── Reusable tool access editor ───────────────
  const ToolAccessEditor = ({ toolAccess, onToggle, onUpdate, showActiveToggle }) => (
    <div style={{ marginBottom: '16px' }}>
      <label style={styles.label}>Tool Access & Licence</label>
      <p style={{ ...styles.subLabel, marginBottom: '8px' }}>
        Set licence tier and validity independently per tool
      </p>
      {tools.filter(t => tenantActiveCodes.includes(t.code)).map(tool => {
        const userTool   = toolAccess.find(t => t.toolCode === tool.code)
        const isSelected = !!userTool
        return (
          <div
            key={tool.code}
            style={{
              ...styles.toolAccessRow,
              ...(isSelected ? styles.toolAccessRowSelected : {}),
            }}
          >
            <div style={styles.toolAccessLeft}>
              <input
                type="checkbox" checked={isSelected}
                onChange={() => onToggle(tool.code)}
                style={{ marginRight: '8px' }}
              />
              <span style={styles.toolIcon}>{tool.iconEmoji || '🔧'}</span>
              <span style={styles.toolAccessName}>{tool.name}</span>
            </div>
            {isSelected && (
              <div style={styles.toolAccessRight}>
                <div style={styles.toolAccessField}>
                  <label style={styles.subLabel}>Licence</label>
                  <select style={styles.smallSelect} value={userTool.licence}
                    onChange={(e) => onUpdate(tool.code, 'licence', e.target.value)}>
                    {LICENCE_OPTIONS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div style={styles.toolAccessField}>
                  <label style={styles.subLabel}>Validity</label>
                  <select style={styles.smallSelect} value={userTool.validityMonths || 12}
                    onChange={(e) => onUpdate(tool.code, 'validityMonths', parseInt(e.target.value))}>
                    {VALIDITY_OPTIONS.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
                  </select>
                </div>
                <div style={styles.toolAccessField}>
                  <label style={styles.subLabel}>Expires on</label>
                  <span style={styles.expiryPreview}>{expiryPreview(userTool.validityMonths)}</span>
                </div>
                {showActiveToggle && (
                  <div style={styles.toolAccessField}>
                    <label style={styles.subLabel}>Active</label>
                    <select style={styles.smallSelect}
                      value={userTool.isActive ? 'true' : 'false'}
                      onChange={(e) => onUpdate(tool.code, 'isActive', e.target.value === 'true')}>
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )

  return (
    <div>
      <button style={styles.backBtn} onClick={() => navigate('/admin/tenants')}>
        ← Back to Tenants
      </button>

      {/* Tenant header */}
      <div style={styles.tenantHeader}>
        <div>
          <h1 style={styles.heading}>{tenant.companyName}</h1>
          <p style={styles.tenantId}>{tenant.tenantId}</p>
        </div>
        <div style={styles.headerActions}>
          <span style={{
            ...styles.badge,
            backgroundColor: tenant.isActive ? '#e8f5e9' : '#ffebee',
            color:           tenant.isActive ? '#2e7d32' : '#c62828',
          }}>
            {tenant.isActive ? '✅ Active' : '❌ Inactive'}
          </span>
          <button
            style={{
              ...styles.toggleTenantBtn,
              backgroundColor: tenant.isActive ? '#ffebee' : '#e8f5e9',
              color:           tenant.isActive ? '#c62828' : '#2e7d32',
            }}
            onClick={handleToggleTenant}
          >
            {tenant.isActive ? 'Deactivate Tenant' : 'Activate Tenant'}
          </button>
        </div>
      </div>

      {/* Quick stats */}
      <div style={styles.statsRow}>
        <div style={styles.statCard}>
          <p style={styles.statLabel}>Users</p>
          <p style={styles.statValue}>{users.length} / {tenant.maxUsers}</p>
        </div>
        <div style={styles.statCard}>
          <p style={styles.statLabel}>Total Quotations</p>
          <p style={styles.statValue}>{quotationCount}</p>
        </div>
        <div style={styles.statCard}>
          <p style={styles.statLabel}>Active Tools</p>
          <p style={styles.statValue}>{tenantActiveCodes.length}</p>
        </div>
        <div style={styles.statCard}>
          <p style={styles.statLabel}>Created</p>
          <p style={{ ...styles.statValue, fontSize: '14px' }}>{formatDate(tenant.createdAt)}</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        {['users', 'settings', 'templates'].map(tab => (
          <button
            key={tab}
            style={{ ...styles.tab, ...(activeTab === tab ? styles.tabActive : {}) }}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'users'     && `👥 Users (${users.length})`}
            {tab === 'settings'  && '⚙️ Edit Settings'}
            {tab === 'templates' && '📁 Templates & Branding'}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════
          USERS TAB
      ══════════════════════════════════════════ */}
      {activeTab === 'users' && (
        <div>
          {!tenant.isActive && (
            <div style={{ ...styles.errorBox, marginBottom: '16px' }}>
              ⚠️ This tenant is inactive. Activate the tenant before adding users.
            </div>
          )}

          {userFormSuccess && <div style={styles.successBox}>{userFormSuccess}</div>}

          <div style={styles.usersHeader}>
            <h3 style={styles.sectionTitle}>Users</h3>
            {tenant.isActive && (
              <button style={styles.newBtn} onClick={() => setShowUserForm(!showUserForm)}>
                {showUserForm ? '✕ Cancel' : '+ Add User'}
              </button>
            )}
          </div>

          {/* Create user form */}
          {showUserForm && tenant.isActive && (
            <div style={styles.formCard}>
              <h4 style={styles.formTitle}>Create New User for {tenant.companyName}</h4>
              <div style={styles.formGrid}>
                <div style={styles.field}>
                  <label style={styles.label}>First Name *</label>
                  <input style={styles.input} value={userForm.firstName}
                    onChange={(e) => setUserForm({ ...userForm, firstName: e.target.value })} />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Last Name *</label>
                  <input style={styles.input} value={userForm.lastName}
                    onChange={(e) => setUserForm({ ...userForm, lastName: e.target.value })} />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Email *</label>
                  <input style={styles.input} type="email" value={userForm.email}
                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Password *</label>
                  <input style={styles.input} type="text" value={userForm.password}
                    onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Role</label>
                  <select style={styles.input} value={userForm.role}
                    onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}>
                    {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>

              <ToolAccessEditor
                toolAccess={userForm.toolAccess}
                onToggle={toggleUserToolInForm}
                onUpdate={updateUserToolAccess}
                showActiveToggle={false}
              />

              {userFormError && <div style={styles.errorBox}>{userFormError}</div>}
              <div style={styles.formActions}>
                <button
                  style={{ ...styles.saveBtn, opacity: isSavingUser ? 0.7 : 1 }}
                  onClick={handleCreateUser} disabled={isSavingUser}
                >
                  {isSavingUser ? 'Creating...' : 'Create User'}
                </button>
                <button style={styles.cancelBtn} onClick={() => setShowUserForm(false)}>Cancel</button>
              </div>
            </div>
          )}

          {/* Users table */}
          <div style={styles.tableCard}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.thead}>
                  <th style={styles.th}>Name</th>
                  <th style={styles.th}>Email</th>
                  <th style={styles.th}>Role</th>
                  <th style={styles.th}>Tool Access</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Last Login</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 && (
                  <tr><td colSpan={7} style={{ ...styles.td, textAlign: 'center', color: '#888' }}>
                    {tenant.isActive ? 'No users yet. Click "+ Add User".' : 'Activate tenant to add users.'}
                  </td></tr>
                )}
                {users.map((user, i) => (
                  <React.Fragment key={user._id}>
                    {/* Main row */}
                    <tr style={{
                      ...styles.tr,
                      backgroundColor: i % 2 === 0 ? '#fff' : '#f8f9fa',
                    }}>
                      <td style={styles.td}>
                        <span style={{ fontWeight: '600' }}>{user.firstName} {user.lastName}</span>
                      </td>
                      <td style={styles.td}>{user.email}</td>
                      <td style={styles.td}>
                        <span style={styles.roleBadge}>{user.role}</span>
                      </td>
                      <td style={styles.td}>
                        <div style={styles.toolAccessList}>
                          {(user.toolAccess || []).map(t => (
                            <div key={t.toolCode} style={styles.toolAccessItem}>
                              <span style={styles.toolBadge}>{t.toolCode.toUpperCase()}</span>
                              <span style={styles.toolLicence}>{t.licence}</span>
                              <span style={styles.toolExpiry}>exp: {formatDate(t.licenceExpiresAt)}</span>
                            </div>
                          ))}
                          {(!user.toolAccess || user.toolAccess.length === 0) && (
                            <span style={{ color: '#aaa', fontSize: '12px' }}>Legacy — {user.licence}</span>
                          )}
                        </div>
                      </td>
                      <td style={styles.td}>
                        <span style={{
                          ...styles.badge,
                          backgroundColor: user.isActive ? '#e8f5e9' : '#ffebee',
                          color:           user.isActive ? '#2e7d32' : '#c62828',
                        }}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={styles.td}>{formatDate(user.lastLoginAt)}</td>
                      <td style={styles.td}>
                        <div style={styles.actionBtns}>
                          <button
                            style={{
                              ...styles.smallBtn,
                              backgroundColor: editingUserId === user._id ? '#f0f4f8' : '#e8f4fd',
                              color: '#1a3c5e', fontWeight: '600',
                            }}
                            onClick={() => editingUserId === user._id ? cancelEditUser() : startEditUser(user)}
                          >
                            {editingUserId === user._id ? '✕ Cancel' : '✏️ Edit'}
                          </button>
                          <button
                            style={styles.smallBtn}
                            onClick={() => {
                              setResetUserId(resetUserId === user._id ? null : user._id)
                              setResetMessage('')
                              setNewPassword('')
                            }}
                          >
                            🔑 Reset
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Edit panel row */}
                    {editingUserId === user._id && (
                      <tr key={`${user._id}-edit`}>
                        <td colSpan={7} style={{ padding: 0 }}>
                          <div style={styles.editPanel}>
                            <h4 style={styles.editPanelTitle}>Edit — {user.firstName} {user.lastName}</h4>
                            <div style={styles.editGrid}>
                              <div style={styles.field}>
                                <label style={styles.subLabel}>First Name</label>
                                <input style={styles.input} value={editUserForm.firstName}
                                  onChange={(e) => setEditUserForm({ ...editUserForm, firstName: e.target.value })} />
                              </div>
                              <div style={styles.field}>
                                <label style={styles.subLabel}>Last Name</label>
                                <input style={styles.input} value={editUserForm.lastName}
                                  onChange={(e) => setEditUserForm({ ...editUserForm, lastName: e.target.value })} />
                              </div>
                              <div style={styles.field}>
                                <label style={styles.subLabel}>Role</label>
                                <select style={styles.input} value={editUserForm.role}
                                  onChange={(e) => setEditUserForm({ ...editUserForm, role: e.target.value })}>
                                  {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                              </div>
                              <div style={styles.field}>
                                <label style={styles.subLabel}>Account Status</label>
                                <select style={styles.input}
                                  value={editUserForm.isActive ? 'true' : 'false'}
                                  onChange={(e) => setEditUserForm({ ...editUserForm, isActive: e.target.value === 'true' })}>
                                  <option value="true">Active</option>
                                  <option value="false">Inactive</option>
                                </select>
                              </div>
                            </div>
                            <ToolAccessEditor
                              toolAccess={editUserForm.toolAccess}
                              onToggle={toggleEditToolInForm}
                              onUpdate={updateEditToolAccess}
                              showActiveToggle={true}
                            />
                            {editError   && <div style={styles.errorBox}>{editError}</div>}
                            {editSuccess && <div style={styles.successBox}>{editSuccess}</div>}
                            <div style={styles.formActions}>
                              <button
                                style={{ ...styles.saveBtn, opacity: isSavingEdit ? 0.7 : 1 }}
                                onClick={() => handleSaveUserEdit(user._id)}
                                disabled={isSavingEdit}
                              >
                                {isSavingEdit ? 'Saving...' : 'Save Changes'}
                              </button>
                              <button style={styles.cancelBtn} onClick={cancelEditUser}>Cancel</button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}

                    {/* Password reset row */}
                    {resetUserId === user._id && (
                      <tr key={`${user._id}-reset`}>
                        <td colSpan={7} style={{
                          padding: '12px 16px',
                          backgroundColor: '#fffbeb',
                          borderBottom: '2px solid #f6ad55',
                        }}>
                          <div style={styles.resetForm}>
                            <span style={{ fontSize: '13px', fontWeight: '600', color: '#444' }}>
                              New password for {user.firstName}:
                            </span>
                            <input style={styles.resetInput} type="text" value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)} />
                            <button style={styles.resetBtn}
                              onClick={() => handleResetPassword(user._id)}
                              disabled={isResetting}>
                              {isResetting ? '...' : 'Set Password'}
                            </button>
                            {resetMessage && (
                              <span style={{
                                fontSize: '12px',
                                color: resetMessage.startsWith('✅') ? '#2e7d32' : '#c62828',
                              }}>
                                {resetMessage}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          EDIT SETTINGS TAB
      ══════════════════════════════════════════ */}
      {activeTab === 'settings' && settingsForm && (
        <div style={styles.settingsCard}>
          <h3 style={styles.sectionTitle}>Edit Tenant Settings</h3>

          <div style={styles.formGrid}>
            <div style={styles.field}>
              <label style={styles.label}>Company Name *</label>
              <input style={styles.input} value={settingsForm.companyName}
                onChange={(e) => setSettingsForm({ ...settingsForm, companyName: e.target.value })} />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Address</label>
              <input style={styles.input} value={settingsForm.address}
                onChange={(e) => setSettingsForm({ ...settingsForm, address: e.target.value })} />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>GST Number</label>
              <input style={styles.input} value={settingsForm.gst}
                onChange={(e) => setSettingsForm({ ...settingsForm, gst: e.target.value })} />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Max Users</label>
              <input style={styles.input} type="number" min="1" value={settingsForm.maxUsers}
                onChange={(e) => setSettingsForm({ ...settingsForm, maxUsers: parseInt(e.target.value) })} />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Default Follow-up Days</label>
              <input style={styles.input} type="number" min="1" value={settingsForm.defaultFollowUpDays}
                onChange={(e) => setSettingsForm({ ...settingsForm, defaultFollowUpDays: parseInt(e.target.value) })} />
            </div>
          </div>

          {/* Active Tools */}
          <div style={{ marginBottom: '20px' }}>
            <label style={styles.label}>Active Tools</label>
            <p style={{ ...styles.subLabel, marginBottom: '8px' }}>
              Select which tools this tenant has purchased access to
            </p>
            <div style={styles.toolGrid}>
              {tools.map(tool => {
                const isSelected = settingsForm.activeTools.some(t => t.toolCode === tool.code)
                return (
                  <div
                    key={tool.code}
                    style={{ ...styles.toolCard, ...(isSelected ? styles.toolCardSelected : {}) }}
                    onClick={() => toggleToolInSettings(tool.code)}
                  >
                    <span style={styles.toolIconLg}>{tool.iconEmoji || '🔧'}</span>
                    <span style={styles.toolName}>{tool.name}</span>
                    <span style={styles.toolCheck}>{isSelected ? '✅' : '⬜'}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* PDF Branding */}
          <div style={{ marginBottom: '20px' }}>
            <label style={styles.label}>PDF Branding</label>
            <div style={styles.formGrid}>
              <div style={styles.field}>
                <label style={styles.subLabel}>Company name on PDF</label>
                <input style={styles.input} value={settingsForm.pdfBranding.companyName}
                  onChange={(e) => setSettingsForm({
                    ...settingsForm,
                    pdfBranding: { ...settingsForm.pdfBranding, companyName: e.target.value }
                  })} />
              </div>
              <div style={styles.field}>
                <label style={styles.subLabel}>Company address on PDF</label>
                <input style={styles.input} value={settingsForm.pdfBranding.companyAddress}
                  onChange={(e) => setSettingsForm({
                    ...settingsForm,
                    pdfBranding: { ...settingsForm.pdfBranding, companyAddress: e.target.value }
                  })} />
              </div>
              <div style={styles.field}>
                <label style={styles.subLabel}>Phone on PDF</label>
                <input style={styles.input} value={settingsForm.pdfBranding.companyPhone}
                  onChange={(e) => setSettingsForm({
                    ...settingsForm,
                    pdfBranding: { ...settingsForm.pdfBranding, companyPhone: e.target.value }
                  })} />
              </div>
              <div style={styles.field}>
                <label style={styles.subLabel}>Email on PDF</label>
                <input style={styles.input} value={settingsForm.pdfBranding.companyEmail}
                  onChange={(e) => setSettingsForm({
                    ...settingsForm,
                    pdfBranding: { ...settingsForm.pdfBranding, companyEmail: e.target.value }
                  })} />
              </div>
              <div style={styles.field}>
                <label style={styles.subLabel}>Primary colour (hex)</label>
                <div style={styles.colorRow}>
                  <input style={{ ...styles.input, flex: 1 }}
                    value={settingsForm.pdfBranding.primaryColor}
                    onChange={(e) => setSettingsForm({
                      ...settingsForm,
                      pdfBranding: { ...settingsForm.pdfBranding, primaryColor: e.target.value }
                    })} />
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '6px',
                    backgroundColor: settingsForm.pdfBranding.primaryColor,
                    borderWidth: '1px', borderStyle: 'solid', borderColor: '#ddd',
                    flexShrink: 0,
                  }} />
                </div>
              </div>
              <div style={styles.field}>
                <label style={styles.subLabel}>PDF footer note</label>
                <input style={styles.input} value={settingsForm.pdfBranding.footerNote}
                  onChange={(e) => setSettingsForm({
                    ...settingsForm,
                    pdfBranding: { ...settingsForm.pdfBranding, footerNote: e.target.value }
                  })} />
              </div>
            </div>
          </div>

          {/* Default Terms */}
          <div style={{ ...styles.field, marginBottom: '20px' }}>
            <label style={styles.label}>Default Terms & Conditions</label>
            <p style={styles.subLabel}>Pre-fills the T&C field on every new quotation for this tenant</p>
            <textarea
              style={{ ...styles.textarea, minHeight: '100px' }}
              value={settingsForm.defaultTerms}
              rows={5}
              onChange={(e) => setSettingsForm({ ...settingsForm, defaultTerms: e.target.value })}
            />
          </div>

          {/* Admin Notes */}
          <div style={{ ...styles.field, marginBottom: '20px' }}>
            <label style={styles.label}>Admin Notes</label>
            <textarea style={styles.textarea} value={settingsForm.adminNotes} rows={3}
              onChange={(e) => setSettingsForm({ ...settingsForm, adminNotes: e.target.value })} />
          </div>

          {settingsError   && <div style={styles.errorBox}>{settingsError}</div>}
          {settingsSuccess && <div style={styles.successBox}>{settingsSuccess}</div>}

          <div style={styles.formActions}>
            <button
              style={{ ...styles.saveBtn, opacity: isSavingSettings ? 0.7 : 1 }}
              onClick={handleSaveSettings} disabled={isSavingSettings}
            >
              {isSavingSettings ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          TEMPLATES & BRANDING TAB
      ══════════════════════════════════════════ */}
      {activeTab === 'templates' && (
        <div style={styles.settingsCard}>
          <h3 style={styles.sectionTitle}>Templates & Branding</h3>
          <p style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>
            Upload the company logo, Excel parts template and Word Word template for this tenant.
          </p>
          <p style={{ fontSize: '13px', color: '#444', marginBottom: '24px', lineHeight: '1.6' }}>
            In the Word Word template place <strong style={{ fontFamily: 'monospace' }}>{'{{COMPANY_LOGO}}'}</strong> exactly
            where you want the logo to appear. The system injects the logo image at that position when generating PDFs.
            All fonts, sizes and colours from the Word document are preserved in the PDF — only the parts table
            uses a standard system font.
          </p>

          {templateMessage && (
            <div style={{
              ...(templateMessage.startsWith('✅') ? styles.successBox : styles.errorBox),
              marginBottom: '20px',
            }}>
              {templateMessage}
            </div>
          )}

          <div style={styles.templateGrid}>

            {/* ── Company Logo ── */}
            <div style={styles.templateCard}>
              <div style={styles.templateIcon}>🏢</div>
              <h4 style={styles.templateTitle}>Company Logo</h4>
              <p style={styles.templateDesc}>
                PNG, JPG, SVG or WebP. Place <strong style={{ fontFamily: 'monospace' }}>{'{{COMPANY_LOGO}}'}</strong> in
                your Word Word template wherever you want the logo — header, title block, footer etc.
                The system replaces the tag with the actual image when generating PDFs.
              </p>

              {tenant.logo?.fileName ? (
                <div style={styles.templateStatus}>
                  <span style={styles.uploadedBadge}>✅ Uploaded</span>
                  <span style={styles.fileName}>{tenant.logo.fileName}</span>
                  <span style={styles.uploadDate}>{formatDate(tenant.logo.uploadedAt)}</span>
                </div>
              ) : (
                <div style={styles.templateStatus}>
                  <span style={styles.notUploadedBadge}>No logo uploaded yet</span>
                </div>
              )}

              <label style={{ ...styles.uploadBtn, opacity: isUploadingLogo ? 0.7 : 1 }}>
                {isUploadingLogo
                  ? 'Uploading...'
                  : tenant.logo?.fileName ? '↺ Replace Logo' : '⬆ Upload Logo'
                }
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                  style={{ display: 'none' }}
                  onChange={handleLogoUpload}
                  disabled={isUploadingLogo}
                />
              </label>
            </div>

            {/* ── Excel Parts Template ── */}
            <div style={styles.templateCard}>
              <div style={styles.templateIcon}>📊</div>
              <h4 style={styles.templateTitle}>Excel Parts Template</h4>
              <p style={styles.templateDesc}>
                Custom .xlsx file with this tenant's column headers. Users from this tenant see
                these exact column headers when they download the template on the New Quotation page.
                Any columns not matching standard fields appear as extra inline columns.
              </p>

              {tenant.excelTemplate?.fileName ? (
                <div style={styles.templateStatus}>
                  <span style={styles.uploadedBadge}>✅ Uploaded</span>
                  <span style={styles.fileName}>{tenant.excelTemplate.fileName}</span>
                  <span style={styles.uploadDate}>{formatDate(tenant.excelTemplate.uploadedAt)}</span>
                  <button style={styles.downloadBtn} onClick={handleDownloadExcel}>
                    ⬇ Download Current
                  </button>
                </div>
              ) : (
                <div style={styles.templateStatus}>
                  <span style={styles.notUploadedBadge}>Not uploaded yet</span>
                </div>
              )}

              <label style={{ ...styles.uploadBtn, opacity: isUploadingExcel ? 0.7 : 1 }}>
                {isUploadingExcel
                  ? 'Uploading...'
                  : tenant.excelTemplate?.fileName ? '↺ Replace Template' : '⬆ Upload Template'
                }
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  style={{ display: 'none' }}
                  onChange={handleExcelUpload}
                  disabled={isUploadingExcel}
                />
              </label>
            </div>

            {/* ── Word Template ── */}
            <div style={styles.templateCard}>
              <div style={styles.templateIcon}>📄</div>
              <h4 style={styles.templateTitle}>Word Template</h4>
              <p style={styles.templateDesc}>
                Custom .docx file. Design the full layout in Word — fonts, colours,
                logo position, header, footer. Place <strong style={{ fontFamily: 'monospace' }}>{'{{PARTS_TABLE}}'}</strong> where
                the parts list should appear. Download the starter template below to begin.
              </p>

              {tenant.wordTemplate?.fileName ? (
                <div style={styles.templateStatus}>
                  <span style={styles.uploadedBadge}>✅ Uploaded</span>
                  <span style={styles.fileName}>{tenant.wordTemplate.fileName}</span>
                  <span style={styles.uploadDate}>{formatDate(tenant.wordTemplate.uploadedAt)}</span>
                  <button style={styles.downloadBtn} onClick={handleDownloadWordTemplate}>
                    ⬇ Download Current
                  </button>
                </div>
              ) : (
                <div style={styles.templateStatus}>
                  <span style={styles.notUploadedBadge}>Not uploaded yet</span>
                </div>
              )}

              <label style={{ ...styles.uploadBtn, opacity: isUploadingWord ? 0.7 : 1 }}>
                {isUploadingWord
                  ? 'Uploading...'
                  : tenant.wordTemplate?.fileName ? '↺ Replace Template' : '⬆ Upload Template'
                }
                <input
                  type="file"
                  accept=".docx,.doc"
                  style={{ display: 'none' }}
                  onChange={handleWordTemplateUpload}
                  disabled={isUploadingWord}
                />
              </label>
            </div>

          </div>

          {/* Placeholder reference */}
          <div style={styles.placeholderRef}>
            <h4 style={{ fontSize: '13px', fontWeight: '700', color: '#1a1a2e', marginBottom: '10px' }}>
              Available Placeholders for Word Template
            </h4>
            <div style={styles.placeholderGrid}>
              {[
                ['{{COMPANY_LOGO}}',     'Company logo image injected here'],
                ['{{COMPANY_NAME}}',     'Company name from PDF branding'],
                ['{{COMPANY_ADDRESS}}',  'Company address'],
                ['{{COMPANY_PHONE}}',    'Company phone'],
                ['{{COMPANY_EMAIL}}',    'Company email'],
                ['{{FOOTER_NOTE}}',      'Footer note'],
                ['{{QUOTE_NUMBER}}',       'Quote number e.g. QX-2026-0001'],
                ['{{QUOTE_DATE}}',         'Quote creation date'],
                ['{{VERSION}}',          'Version e.g. V1, V2'],
                ['{{CUSTOMER_NAME}}',    'Customer company name'],
                ['{{CUSTOMER_CONTACT}}', 'Customer contact person'],
                ['{{CUSTOMER_EMAIL}}',   'Customer email'],
                ['{{CUSTOMER_PHONE}}',   'Customer phone'],
                ['{{CUSTOMER_ADDRESS}}', 'Customer address'],
                ['{{CURRENCY}}',         'Currency code e.g. USD'],
                ['{{GRAND_TOTAL}}',      'Formatted grand total'],
                ['{{PARTS_COUNT}}',      'Number of parts'],
                ['{{PARTS_TABLE}}',      '⭐ Entire parts table — place once'],
                ['{{TERMS}}',            'Terms and conditions text'],
                ['{{NOTES}}',            'Additional notes'],
                ['{{CREATED_BY}}',       'Name of user who created the quotation'],
              ].map(([tag, desc]) => (
                <div key={tag} style={styles.placeholderRow}>
                  <span style={styles.placeholderTag}>{tag}</span>
                  <span style={styles.placeholderDesc}>{desc}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

    </div>
  )
}

// ── Styles ────────────────────────────────────
const styles = {
  loading:   { padding: '40px', color: '#666', textAlign: 'center' },
  errorBox: {
    padding: '12px', backgroundColor: '#fff5f5',
    borderWidth: '1px', borderStyle: 'solid', borderColor: '#fc8181',
    borderRadius: '6px', color: '#c53030', marginBottom: '16px', fontSize: '13px',
  },
  successBox: {
    padding: '12px', backgroundColor: '#e8f5e9',
    borderWidth: '1px', borderStyle: 'solid', borderColor: '#68d391',
    borderRadius: '6px', color: '#2e7d32', marginBottom: '16px', fontSize: '13px',
  },
  backBtn: {
    backgroundColor: 'transparent', borderWidth: 0, color: '#1a1a2e',
    fontSize: '14px', cursor: 'pointer', fontWeight: '600',
    marginBottom: '16px', padding: 0,
  },
  tenantHeader: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: '20px',
    flexWrap: 'wrap', gap: '12px',
  },
  heading:  { fontSize: '24px', color: '#1a1a2e', margin: 0 },
  tenantId: { fontSize: '13px', color: '#888', marginTop: '4px' },
  headerActions: { display: 'flex', alignItems: 'center', gap: '10px' },
  badge: { padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' },
  toggleTenantBtn: {
    padding: '8px 16px', borderWidth: 0,
    borderRadius: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: '600',
  },
  statsRow: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '12px', marginBottom: '24px',
  },
  statCard: {
    backgroundColor: '#fff', borderRadius: '8px',
    padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  },
  statLabel: {
    fontSize: '11px', color: '#888', fontWeight: '700',
    textTransform: 'uppercase', marginBottom: '4px',
  },
  statValue: { fontSize: '22px', fontWeight: '700', color: '#1a1a2e' },
  tabs:      { display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' },
  tab: {
    padding: '10px 20px', backgroundColor: '#fff',
    borderWidth: '1px', borderStyle: 'solid', borderColor: '#ddd',
    borderRadius: '8px', fontSize: '14px', cursor: 'pointer', color: '#666',
  },
  tabActive: { backgroundColor: '#1a1a2e', color: '#fff', borderColor: '#1a1a2e' },
  usersHeader: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: '16px',
  },
  sectionTitle: { fontSize: '16px', fontWeight: '700', color: '#1a1a2e', margin: 0 },
  newBtn: {
    padding: '8px 16px', backgroundColor: '#1a1a2e',
    color: '#fff', borderWidth: 0, borderRadius: '6px',
    fontSize: '13px', fontWeight: '600', cursor: 'pointer',
  },
  formCard: {
    backgroundColor: '#fff', borderRadius: '10px',
    padding: '20px', marginBottom: '16px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  },
  settingsCard: {
    backgroundColor: '#fff', borderRadius: '10px',
    padding: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  },
  formTitle: { fontSize: '14px', fontWeight: '700', color: '#1a1a2e', marginBottom: '16px' },
  formGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '16px', marginBottom: '16px',
  },
  editGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '16px', marginBottom: '16px',
  },
  field:    { display: 'flex', flexDirection: 'column', gap: '6px' },
  label:    { fontSize: '13px', fontWeight: '600', color: '#444' },
  subLabel: { fontSize: '12px', color: '#888' },
  input: {
    padding: '8px 12px', borderRadius: '6px',
    borderWidth: '1px', borderStyle: 'solid', borderColor: '#ddd',
    fontSize: '13px',
  },
  textarea: {
    padding: '9px 12px', borderRadius: '6px',
    borderWidth: '1px', borderStyle: 'solid', borderColor: '#ddd',
    fontSize: '13px', resize: 'vertical', fontFamily: 'inherit',
  },
  colorRow: { display: 'flex', gap: '8px', alignItems: 'center' },
  toolGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '12px', marginTop: '8px',
  },
  toolCard: {
    padding: '14px', borderRadius: '8px',
    borderWidth: '2px', borderStyle: 'solid', borderColor: '#e0e0e0',
    cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '4px',
  },
  toolCardSelected: {
    borderWidth: '2px', borderStyle: 'solid',
    borderColor: '#1a3c5e', backgroundColor: '#f0f4f8',
  },
  toolIconLg: { fontSize: '20px' },
  toolName:   { fontSize: '13px', fontWeight: '700', color: '#1a1a2e' },
  toolCheck:  { fontSize: '14px', marginTop: '4px' },
  toolAccessRow: {
    display: 'flex', alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px', borderRadius: '8px',
    borderWidth: '1px', borderStyle: 'solid', borderColor: '#e0e0e0',
    marginBottom: '8px', flexWrap: 'wrap',
    gap: '12px', backgroundColor: '#f8f9fa',
  },
  toolAccessRowSelected: {
    borderWidth: '1px', borderStyle: 'solid',
    borderColor: '#1a3c5e', backgroundColor: '#f0f4f8',
  },
  toolAccessLeft:  { display: 'flex', alignItems: 'center', gap: '8px' },
  toolAccessName:  { fontSize: '13px', fontWeight: '600', color: '#1a1a2e' },
  toolAccessRight: { display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' },
  toolAccessField: { display: 'flex', flexDirection: 'column', gap: '4px' },
  toolIcon:        { fontSize: '18px' },
  smallSelect: {
    padding: '6px 10px', borderRadius: '6px',
    borderWidth: '1px', borderStyle: 'solid', borderColor: '#ddd',
    fontSize: '12px', backgroundColor: '#fff',
  },
  expiryPreview: { fontSize: '12px', color: '#2e7d32', fontWeight: '600', padding: '6px 0' },
  formActions:   { display: 'flex', gap: '12px', marginTop: '12px' },
  saveBtn: {
    padding: '9px 20px', backgroundColor: '#1a1a2e',
    color: '#fff', borderWidth: 0, borderRadius: '6px',
    fontSize: '13px', fontWeight: '600', cursor: 'pointer',
  },
  cancelBtn: {
    padding: '9px 20px', backgroundColor: 'transparent',
    color: '#666', borderWidth: '1px', borderStyle: 'solid', borderColor: '#ddd',
    borderRadius: '6px', fontSize: '13px', cursor: 'pointer',
  },
  tableCard: {
    backgroundColor: '#fff', borderRadius: '10px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden',
  },
  table:     { width: '100%', borderCollapse: 'collapse' },
  thead:     { backgroundColor: '#1a1a2e' },
  th: {
    padding: '10px 16px', textAlign: 'left',
    fontSize: '11px', fontWeight: '600',
    color: '#fff', whiteSpace: 'nowrap',
  },
  tr:        { borderBottom: '1px solid #f0f0f0' },
  td:        { padding: '12px 16px', fontSize: '13px', color: '#333', verticalAlign: 'top' },
  roleBadge: {
    padding: '2px 8px', backgroundColor: '#e8f4fd',
    color: '#1a3c5e', borderRadius: '10px', fontSize: '11px', fontWeight: '600',
  },
  toolAccessList:  { display: 'flex', flexDirection: 'column', gap: '4px' },
  toolAccessItem:  { display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' },
  toolBadge: {
    padding: '2px 8px', backgroundColor: '#e8f4fd',
    color: '#1a3c5e', borderRadius: '10px', fontSize: '11px', fontWeight: '600',
  },
  toolLicence: { fontSize: '11px', color: '#2e7d32', fontWeight: '600' },
  toolExpiry:  { fontSize: '10px', color: '#888' },
  actionBtns:  { display: 'flex', gap: '6px', flexWrap: 'wrap' },
  smallBtn: {
    padding: '4px 10px', borderWidth: 0,
    borderRadius: '4px', fontSize: '11px',
    cursor: 'pointer', backgroundColor: '#f0f0f0', color: '#444',
  },
  editPanel: {
    padding: '20px', backgroundColor: '#f8fafc',
    borderTop: '2px solid #1a3c5e',
    borderBottom: '2px solid #1a3c5e',
  },
  editPanelTitle: { fontSize: '14px', fontWeight: '700', color: '#1a1a2e', marginBottom: '16px' },
  resetForm:  { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' },
  resetInput: {
    flex: 1, padding: '7px 10px',
    borderRadius: '6px',
    borderWidth: '1px', borderStyle: 'solid', borderColor: '#ddd',
    fontSize: '13px',
  },
  resetBtn: {
    padding: '7px 14px', backgroundColor: '#1a1a2e',
    color: '#fff', borderWidth: 0, borderRadius: '4px',
    fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap',
  },
  templateGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '20px', marginBottom: '28px',
  },
  templateCard: {
    borderWidth: '1px', borderStyle: 'solid', borderColor: '#e0e0e0',
    borderRadius: '10px', padding: '20px',
    display: 'flex', flexDirection: 'column', gap: '10px',
  },
  templateIcon:      { fontSize: '32px' },
  templateTitle:     { fontSize: '15px', fontWeight: '700', color: '#1a1a2e', margin: 0 },
  templateDesc:      { fontSize: '12px', color: '#666', lineHeight: '1.6' },
  templateStatus:    { display: 'flex', flexDirection: 'column', gap: '4px' },
  uploadedBadge:     { fontSize: '12px', color: '#2e7d32', fontWeight: '600' },
  notUploadedBadge:  { fontSize: '12px', color: '#aaa', fontStyle: 'italic' },
  fileName:          { fontSize: '12px', color: '#1a3c5e', fontWeight: '600' },
  uploadDate:        { fontSize: '11px', color: '#888' },
  downloadBtn: {
    padding: '4px 10px', backgroundColor: 'transparent',
    color: '#1a3c5e', borderWidth: '1px', borderStyle: 'solid', borderColor: '#1a3c5e',
    borderRadius: '4px', fontSize: '12px', cursor: 'pointer',
    marginTop: '4px', width: 'fit-content',
  },
  uploadBtn: {
    padding: '9px 16px', backgroundColor: '#1a1a2e',
    color: '#fff', borderRadius: '6px', fontSize: '13px',
    fontWeight: '600', cursor: 'pointer', textAlign: 'center',
    marginTop: 'auto', display: 'block',
  },
  placeholderRef: {
    backgroundColor: '#f8f9fa', borderRadius: '8px',
    padding: '16px', borderWidth: '1px', borderStyle: 'solid', borderColor: '#e0e0e0',
  },
  placeholderGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
    gap: '6px',
  },
  placeholderRow: {
    display: 'flex', alignItems: 'flex-start', gap: '10px',
    padding: '5px 0', borderBottom: '1px solid #ebebeb',
  },
  placeholderTag: {
    fontFamily: 'monospace', fontSize: '11px',
    color: '#1a3c5e', fontWeight: '700',
    whiteSpace: 'nowrap', minWidth: '200px',
  },
  placeholderDesc: { fontSize: '11px', color: '#666' },
}

export default AdminTenantDetail
