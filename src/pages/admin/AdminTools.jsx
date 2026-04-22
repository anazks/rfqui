import { useState, useEffect, useRef } from 'react'
import {
  getAllPlatformTools,
  createPlatformTool,
  updatePlatformTool,
  uploadToolIcon,
  deletePlatformTool,
} from '../../services/api'

const EMOJI_OPTIONS = ['📋','🛒','📦','⚖️','📊','🔧','🏭','📁','💼','🔩','📐','🧾','📈','🗂️','⚙️']

const STATUS_LABELS = {
  active:      { label: 'Active',      color: '#2e7d32', bg: 'rgba(46, 125, 50, 0.1)' },
  coming_soon: { label: 'Coming Soon', color: '#f57c00', bg: 'rgba(245, 124, 0, 0.1)' },
  inactive:    { label: 'Inactive',    color: '#666',    bg: 'rgba(0, 0, 0, 0.05)' },
}

function AdminTools() {
  const [tools,     setTools]     = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState('')
  const [showForm,  setShowForm]  = useState(false)
  const [editTool,  setEditTool]  = useState(null)
  const [saving,    setSaving]    = useState(false)
  const [formError, setFormError] = useState('')
  const [deleteId,  setDeleteId]  = useState(null)

  const iconInputRef = useRef(null)

  const emptyForm = {
    code: '', name: '', description: '',
    iconEmoji: '🔧', status: 'active', route: '', sortOrder: 99,
  }
  const [form, setForm] = useState(emptyForm)
  const [iconFile, setIconFile] = useState(null)

  const loadTools = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await getAllPlatformTools()
      setTools(res.data.tools || [])
    } catch (err) {
      setError('Failed to load tools: ' + (err.response?.data?.message || err.message))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadTools() }, [])

  const openCreate = () => {
    setEditTool(null)
    setForm(emptyForm)
    setIconFile(null)
    setFormError('')
    setShowForm(true)
  }

  const openEdit = (tool) => {
    setEditTool(tool)
    setForm({
      code:        tool.code,
      name:        tool.name,
      description: tool.description || '',
      iconEmoji:   tool.iconEmoji   || '🔧',
      status:      tool.status      || 'active',
      route:       tool.route       || '',
      sortOrder:   tool.sortOrder   || 99,
    })
    setIconFile(null)
    setFormError('')
    setShowForm(true)
  }

  const handleIconSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setIconFile({
        base64:   reader.result.split(',')[1],
        name:     file.name,
        mimeType: file.type,
      })
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleSave = async () => {
    setFormError('')
    if (!form.code.trim() || !form.name.trim()) {
      return setFormError('Tool code and name are required')
    }

    setSaving(true)
    try {
      let savedTool

      if (editTool) {
        const res = await updatePlatformTool(editTool._id, {
          name:        form.name.trim(),
          description: form.description.trim(),
          iconEmoji:   form.iconEmoji,
          status:      form.status,
          route:       form.route.trim(),
          sortOrder:   Number(form.sortOrder) || 99,
        })
        savedTool = res.data.tool
      } else {
        const res = await createPlatformTool({
          code:        form.code.toLowerCase().trim(),
          name:        form.name.trim(),
          description: form.description.trim(),
          iconEmoji:   form.iconEmoji,
          status:      form.status,
          route:       form.route.trim(),
          sortOrder:   Number(form.sortOrder) || 99,
        })
        savedTool = res.data.tool
      }

      if (iconFile && savedTool?._id) {
        await uploadToolIcon(savedTool._id, {
          fileName:   iconFile.name,
          fileBase64: iconFile.base64,
          mimeType:   iconFile.mimeType,
        })
      }

      setShowForm(false)
      loadTools()
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to save tool')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    try {
      await deletePlatformTool(id)
      setDeleteId(null)
      loadTools()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete tool')
      setDeleteId(null)
    }
  }

  const renderToolIcon = (tool, size = 32) => {
    if (tool.icon?.fileBase64) {
      return (
        <img
          src={`data:${tool.icon.mimeType || 'image/png'};base64,${tool.icon.fileBase64}`}
          alt={tool.name}
          style={{ width: size * 0.8, height: size * 0.8, objectFit: 'contain' }}
        />
      )
    }
    return <span style={{ fontSize: size * 0.7 }}>{tool.iconEmoji || '🔧'}</span>
  }

  return (
    <div style={s.animFadeIn}>
      <div style={s.header}>
        <div>
          <h2 style={s.title}>Platform Tools</h2>
          <p style={s.subtitle}>Manage the tools available to all tenants on the platform</p>
        </div>
        <button className="premium-btn" style={s.addBtn} onClick={openCreate}>+ Add Tool</button>
      </div>

      {error && <div style={s.errorBox}>{error}</div>}
      {loading && <div style={s.loading}>Loading tools...</div>}

      {!loading && (
        <div className="glass" style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr style={s.theadRow}>
                {['Icon', 'Code', 'Name', 'Description', 'Route', 'Status', 'Order', 'Actions'].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tools.length === 0 && (
                <tr key="empty">
                  <td colSpan={8} style={{ ...s.td, textAlign: 'center', color: 'var(--text-muted)', padding: 30 }}>
                    No tools yet. Click "+ Add Tool" to create the first one.
                  </td>
                </tr>
              )}
              {tools.map(tool => {
                const st = STATUS_LABELS[tool.status] || STATUS_LABELS.active
                return (
                  <tr 
                    key={tool._id} 
                    style={s.tr}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.7)'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td style={s.td}>
                      <div style={s.iconWrapper}>
                        {renderToolIcon(tool, 26)}
                      </div>
                    </td>
                    <td style={s.td}>
                      <code style={s.code}>{tool.code}</code>
                    </td>
                    <td style={{ ...s.td, fontWeight: 700, color: 'var(--primary)' }}>{tool.name}</td>
                    <td style={{ ...s.td, color: 'var(--text-muted)', fontSize: 11, maxWidth: 160 }}>
                      {tool.description || '—'}
                    </td>
                    <td style={{ ...s.td, color: 'var(--text-muted)', fontSize: 11 }}>
                      {tool.route || '—'}
                    </td>
                    <td style={s.td}>
                      <span style={{ ...s.badge, color: st.color, backgroundColor: st.bg }}>
                        {st.label}
                      </span>
                    </td>
                    <td style={{ ...s.td, textAlign: 'center' }}>{tool.sortOrder}</td>
                    <td style={s.td}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button style={s.editBtn} onClick={() => openEdit(tool)}>Edit</button>
                        {tool.code !== 'rfq' && (
                          <button style={s.deleteBtn} onClick={() => setDeleteId(tool._id)}>
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Create / Edit Form Modal ── */}
      {showForm && (
        <div style={s.overlay} onClick={() => !saving && setShowForm(false)}>
          <div className="glass" style={s.modal} onClick={e => e.stopPropagation()}>
            <h3 style={s.modalTitle}>
              {editTool ? `Edit Tool — ${editTool.name}` : 'Add New Tool'}
            </h3>

            <div style={s.formGrid}>
              <div style={s.field}>
                <label style={s.label}>Tool Code *</label>
                <input
                  style={{ ...s.input, backgroundColor: editTool ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.7)' }}
                  value={form.code}
                  onChange={e => !editTool && setForm({ ...form, code: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                  placeholder="e.g. rfq, po, inv"
                  disabled={!!editTool}
                />
                {!editTool && (
                  <div style={s.hint}>Lowercase letters, numbers, underscores. Cannot be changed.</div>
                )}
              </div>

              <div style={s.field}>
                <label style={s.label}>Tool Name *</label>
                <input style={s.input} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. RFQ Tool" />
              </div>

              <div style={{ ...s.field, gridColumn: '1 / -1' }}>
                <label style={s.label}>Description</label>
                <input style={s.input} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Short description" />
              </div>

              <div style={s.field}>
                <label style={s.label}>Frontend Route</label>
                <input style={s.input} value={form.route} onChange={e => setForm({ ...form, route: e.target.value })} placeholder="e.g. /dashboard" />
              </div>

              <div style={s.field}>
                <label style={s.label}>Display Order</label>
                <input style={s.input} type="number" min="1" value={form.sortOrder} onChange={e => setForm({ ...form, sortOrder: e.target.value })} />
              </div>

              <div style={s.field}>
                <label style={s.label}>Status</label>
                <select style={s.select} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                  <option value="active">Active</option>
                  <option value="coming_soon">Coming Soon</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div style={s.field}>
                <label style={s.label}>Emoji Icon (fallback)</label>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                  {EMOJI_OPTIONS.map(emoji => (
                    <button
                      key={emoji}
                      style={{
                        ...s.emojiBtn,
                        backgroundColor: form.iconEmoji === emoji ? 'var(--primary)' : 'rgba(255,255,255,0.7)',
                        color: form.iconEmoji === emoji ? '#fff' : 'var(--text-main)',
                      }}
                      onClick={() => setForm({ ...form, iconEmoji: emoji })}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ ...s.field, gridColumn: '1 / -1' }}>
                <label style={s.label}>Icon Image (optional)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={s.iconPreview}>
                    {iconFile ? (
                      <img src={`data:${iconFile.mimeType};base64,${iconFile.base64}`} alt="preview" style={{ width: 24, height: 24, objectFit: 'contain' }} />
                    ) : editTool?.icon?.fileBase64 ? (
                      <img src={`data:${editTool.icon.mimeType};base64,${editTool.icon.fileBase64}`} alt="current" style={{ width: 24, height: 24, objectFit: 'contain' }} />
                    ) : (
                      <span style={{ fontSize: 20 }}>{form.iconEmoji}</span>
                    )}
                  </div>
                  <input ref={iconInputRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" style={{ display: 'none' }} onChange={handleIconSelect} />
                  <button style={s.uploadBtn} onClick={() => iconInputRef.current?.click()}>
                    {iconFile ? '✅ Selected' : '⬆ Upload Image'}
                  </button>
                  {iconFile && (
                    <button style={s.clearBtn} onClick={() => setIconFile(null)}>✕ Clear</button>
                  )}
                </div>
              </div>
            </div>

            {formError && <div style={s.errorBox}>{formError}</div>}

            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button className="premium-btn" style={{ flex: 1, padding: '10px 0', fontSize: '12px' }} onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : editTool ? 'Save Changes' : 'Create Tool'}
              </button>
              <button style={s.cancelBtn} onClick={() => setShowForm(false)} disabled={saving}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ── */}
      {deleteId && (
        <div style={s.overlay} onClick={() => setDeleteId(null)}>
          <div className="glass" style={{ ...s.modal, maxWidth: 320 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ ...s.modalTitle, color: '#c62828', fontSize: 18 }}>⚠ Delete Tool</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: 16, fontSize: 12 }}>
              This will permanently delete the tool. This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="premium-btn" style={{ flex: 1, padding: '8px 0', fontSize: '11px', background: 'linear-gradient(135deg, #c62828 0%, #b71c1c 100%)' }} onClick={() => handleDelete(deleteId)}>
                Delete
              </button>
              <button style={s.cancelBtn} onClick={() => setDeleteId(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const s = {
  animFadeIn: { animation: 'fadeIn 0.4s ease forwards' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title:    { fontSize: 24, fontWeight: 800, color: 'var(--primary)', margin: '0 0 2px', letterSpacing: '-0.5px' },
  subtitle: { fontSize: 12, color: 'var(--text-muted)', margin: 0 },
  addBtn: { padding: '8px 16px', width: 'auto', fontSize: 12 },
  errorBox: {
    padding: '10px 12px', backgroundColor: '#fff5f5', border: '1px solid #fc8181',
    borderRadius: 'var(--radius-sm)', color: '#c53030', fontSize: 11, marginBottom: 12,
  },
  loading: { padding: 30, textAlign: 'center', color: 'var(--text-muted)', fontWeight: '500', fontSize: 12 },
  tableWrap: { borderRadius: 'var(--radius-md)', overflowX: 'auto', padding: '0 16px 16px 16px' },
  table:  { width: '100%', borderCollapse: 'collapse', marginTop: 12 },
  theadRow: { borderBottom: '2px solid rgba(0,0,0,0.1)' },
  th: {
    padding: '8px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700,
    color: 'var(--text-muted)', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.5px'
  },
  tr:     { borderBottom: '1px solid rgba(0,0,0,0.05)', transition: 'var(--transition)' },
  td:     { padding: '10px 12px', fontSize: 12, color: 'var(--text-main)', verticalAlign: 'middle', fontWeight: 500 },
  iconWrapper: {
    width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(0,0,0,0.05)'
  },
  code: {
    backgroundColor: 'rgba(0,0,0,0.04)', padding: '3px 8px',
    borderRadius: 'var(--radius-full)', fontSize: 10, fontFamily: 'monospace', color: 'var(--primary)',
  },
  badge: {
    padding: '3px 8px', borderRadius: 'var(--radius-full)',
    fontSize: 9, fontWeight: 700, letterSpacing: '0.5px'
  },
  editBtn: {
    padding: '4px 10px', background: 'transparent',
    border: '1px solid var(--primary)', color: 'var(--primary)', borderRadius: 'var(--radius-sm)',
    fontSize: 10, fontWeight: 600, cursor: 'pointer', transition: 'var(--transition)'
  },
  deleteBtn: {
    padding: '4px 10px', background: 'transparent',
    border: '1px solid #fc8181', color: '#c62828', borderRadius: 'var(--radius-sm)',
    fontSize: 10, fontWeight: 600, cursor: 'pointer', transition: 'var(--transition)'
  },
  overlay: {
    position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(2px)',
    display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: 16,
  },
  modal: {
    borderRadius: 'var(--radius-md)', padding: 24, width: '100%', maxWidth: 500,
    boxShadow: 'var(--shadow-lg)', maxHeight: '90vh', overflowY: 'auto',
  },
  modalTitle: { fontSize: 18, fontWeight: 800, color: 'var(--primary)', margin: '0 0 16px', letterSpacing: '-0.5px' },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  field:  { display: 'flex', flexDirection: 'column' },
  label:  { fontSize: 11, fontWeight: 700, color: 'var(--text-main)', marginBottom: 4, letterSpacing: '0.5px' },
  hint:   { fontSize: 10, color: 'var(--text-muted)', marginTop: 4 },
  input: {
    padding: '8px 12px', borderRadius: 'var(--radius-sm)',
    border: '1px solid rgba(0,0,0,0.1)', fontSize: 12, backgroundColor: 'rgba(255,255,255,0.7)',
    transition: 'var(--transition)'
  },
  select: {
    padding: '8px 12px', borderRadius: 'var(--radius-sm)',
    border: '1px solid rgba(0,0,0,0.1)', fontSize: 12, backgroundColor: 'rgba(255,255,255,0.7)',
  },
  emojiBtn: {
    width: 28, height: 28, fontSize: 14,
    border: '1px solid rgba(0,0,0,0.1)', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'var(--transition)'
  },
  iconPreview: {
    width: 44, height: 44, border: '1px solid rgba(0,0,0,0.1)',
    borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  uploadBtn: {
    padding: '6px 12px', backgroundColor: 'transparent',
    border: '1px solid var(--primary)', color: 'var(--primary)', fontWeight: 600,
    borderRadius: 'var(--radius-sm)', fontSize: 11, cursor: 'pointer', transition: 'var(--transition)'
  },
  clearBtn: {
    padding: '6px 10px', backgroundColor: 'transparent',
    border: '1px solid rgba(0,0,0,0.1)', color: 'var(--text-muted)', fontWeight: 600,
    borderRadius: 'var(--radius-sm)', fontSize: 11, cursor: 'pointer',
  },
  cancelBtn: {
    flex: 1, padding: 10, background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(0,0,0,0.1)',
    color: 'var(--text-muted)', fontWeight: 600, borderRadius: 'var(--radius-sm)', fontSize: 12, cursor: 'pointer',
  },
}

export default AdminTools
