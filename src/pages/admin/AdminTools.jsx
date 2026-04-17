// AdminTools.jsx — Super admin page to manage platform tools.
// Allows creating, editing, deleting tools.
// Tool icon uploaded as base64 image.
// Status: active | coming_soon | inactive

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
  active:      { label: 'Active',      color: '#2e7d32', bg: '#e8f5e9' },
  coming_soon: { label: 'Coming Soon', color: '#f57c00', bg: '#fff8e1' },
  inactive:    { label: 'Inactive',    color: '#666',    bg: '#f0f0f0' },
}

function AdminTools() {
  const [tools,     setTools]     = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState('')
  const [showForm,  setShowForm]  = useState(false)
  const [editTool,  setEditTool]  = useState(null)  // null = create, object = edit
  const [saving,    setSaving]    = useState(false)
  const [formError, setFormError] = useState('')
  const [deleteId,  setDeleteId]  = useState(null)

  const iconInputRef = useRef(null)

  const emptyForm = {
    code: '', name: '', description: '',
    iconEmoji: '🔧', status: 'active', route: '', sortOrder: 99,
  }
  const [form, setForm] = useState(emptyForm)
  const [iconFile, setIconFile] = useState(null)  // { base64, name, mimeType }

  // ── Load tools ────────────────────────────────
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

  // ── Open create form ──────────────────────────
  const openCreate = () => {
    setEditTool(null)
    setForm(emptyForm)
    setIconFile(null)
    setFormError('')
    setShowForm(true)
  }

  // ── Open edit form ────────────────────────────
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

  // ── Handle icon file select ───────────────────
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

  // ── Save (create or update) ───────────────────
  const handleSave = async () => {
    setFormError('')
    if (!form.code.trim() || !form.name.trim()) {
      return setFormError('Tool code and name are required')
    }

    setSaving(true)
    try {
      let savedTool

      if (editTool) {
        // Update
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
        // Create
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

      // Upload icon if selected
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

  // ── Delete ────────────────────────────────────
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

  // ── Render icon ───────────────────────────────
  const renderToolIcon = (tool, size = 32) => {
    if (tool.icon?.fileBase64) {
      return (
        <img
          src={`data:${tool.icon.mimeType || 'image/png'};base64,${tool.icon.fileBase64}`}
          alt={tool.name}
          style={{ width: size, height: size, objectFit: 'contain' }}
        />
      )
    }
    return <span style={{ fontSize: size * 0.8 }}>{tool.iconEmoji || '🔧'}</span>
  }

  return (
    <div>
      {/* Header */}
      <div style={s.header}>
        <div>
          <h2 style={s.title}>Platform Tools</h2>
          <p style={s.subtitle}>Manage the tools available to all tenants on the platform</p>
        </div>
        <button style={s.addBtn} onClick={openCreate}>+ Add Tool</button>
      </div>

      {error && <div style={s.errorBox}>{error}</div>}

      {loading && <div style={s.loading}>Loading tools...</div>}

      {/* Tools table */}
      {!loading && (
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr style={s.thead}>
                {['Icon', 'Code', 'Name', 'Description', 'Route', 'Status', 'Order', 'Actions'].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tools.length === 0 && (
                <tr key="empty">
                  <td colSpan={8} style={{ ...s.td, textAlign: 'center', color: '#aaa', padding: 40 }}>
                    No tools yet. Click "+ Add Tool" to create the first one.
                  </td>
                </tr>
              )}
              {tools.map(tool => {
                const st = STATUS_LABELS[tool.status] || STATUS_LABELS.active
                return (
                  <tr key={tool._id} style={s.tr}>
                    <td style={s.td}>
                      <div style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {renderToolIcon(tool, 32)}
                      </div>
                    </td>
                    <td style={s.td}>
                      <code style={s.code}>{tool.code}</code>
                    </td>
                    <td style={{ ...s.td, fontWeight: 600 }}>{tool.name}</td>
                    <td style={{ ...s.td, color: '#666', fontSize: 12, maxWidth: 200 }}>
                      {tool.description || '—'}
                    </td>
                    <td style={{ ...s.td, color: '#666', fontSize: 12 }}>
                      {tool.route || '—'}
                    </td>
                    <td style={s.td}>
                      <span style={{ ...s.badge, color: st.color, backgroundColor: st.bg }}>
                        {st.label}
                      </span>
                    </td>
                    <td style={{ ...s.td, textAlign: 'center' }}>{tool.sortOrder}</td>
                    <td style={s.td}>
                      <div style={{ display: 'flex', gap: 6 }}>
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
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <h3 style={s.modalTitle}>
              {editTool ? `Edit Tool — ${editTool.name}` : 'Add New Tool'}
            </h3>

            <div style={s.formGrid}>
              {/* Code — only editable on create */}
              <div style={s.field}>
                <label style={s.label}>Tool Code *</label>
                <input
                  style={{ ...s.input, backgroundColor: editTool ? '#f5f5f5' : '#fff' }}
                  value={form.code}
                  onChange={e => !editTool && setForm({ ...form, code: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                  placeholder="e.g. rfq, po, inv"
                  disabled={!!editTool}
                />
                {!editTool && (
                  <div style={s.hint}>Lowercase letters, numbers, underscores. Cannot be changed after creation.</div>
                )}
              </div>

              {/* Name */}
              <div style={s.field}>
                <label style={s.label}>Tool Name *</label>
                <input
                  style={s.input}
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. RFQ Tool"
                />
              </div>

              {/* Description */}
              <div style={{ ...s.field, gridColumn: '1 / -1' }}>
                <label style={s.label}>Description</label>
                <input
                  style={s.input}
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Short description shown on the tool launcher card"
                />
              </div>

              {/* Route */}
              <div style={s.field}>
                <label style={s.label}>Frontend Route</label>
                <input
                  style={s.input}
                  value={form.route}
                  onChange={e => setForm({ ...form, route: e.target.value })}
                  placeholder="e.g. /dashboard (leave blank if not built yet)"
                />
                <div style={s.hint}>The URL path to navigate to when user clicks this tool.</div>
              </div>

              {/* Sort Order */}
              <div style={s.field}>
                <label style={s.label}>Display Order</label>
                <input
                  style={s.input}
                  type="number"
                  min="1"
                  value={form.sortOrder}
                  onChange={e => setForm({ ...form, sortOrder: e.target.value })}
                />
                <div style={s.hint}>Lower numbers appear first on the launcher.</div>
              </div>

              {/* Status */}
              <div style={s.field}>
                <label style={s.label}>Status</label>
                <select
                  style={s.select}
                  value={form.status}
                  onChange={e => setForm({ ...form, status: e.target.value })}
                >
                  <option value="active">Active — fully built, clickable for users with access</option>
                  <option value="coming_soon">Coming Soon — visible but not clickable for anyone</option>
                  <option value="inactive">Inactive — hidden from launcher</option>
                </select>
              </div>

              {/* Icon emoji */}
              <div style={s.field}>
                <label style={s.label}>Emoji Icon (fallback)</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                  {EMOJI_OPTIONS.map(emoji => (
                    <button
                      key={emoji}
                      style={{
                        ...s.emojiBtn,
                        backgroundColor: form.iconEmoji === emoji ? '#1a3c5e' : '#f5f5f5',
                        color: form.iconEmoji === emoji ? '#fff' : '#333',
                      }}
                      onClick={() => setForm({ ...form, iconEmoji: emoji })}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Icon image upload */}
              <div style={{ ...s.field, gridColumn: '1 / -1' }}>
                <label style={s.label}>Icon Image (optional — overrides emoji)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {/* Preview */}
                  <div style={s.iconPreview}>
                    {iconFile ? (
                      <img
                        src={`data:${iconFile.mimeType};base64,${iconFile.base64}`}
                        alt="preview"
                        style={{ width: 40, height: 40, objectFit: 'contain' }}
                      />
                    ) : editTool?.icon?.fileBase64 ? (
                      <img
                        src={`data:${editTool.icon.mimeType};base64,${editTool.icon.fileBase64}`}
                        alt="current"
                        style={{ width: 40, height: 40, objectFit: 'contain' }}
                      />
                    ) : (
                      <span style={{ fontSize: 32 }}>{form.iconEmoji}</span>
                    )}
                  </div>
                  <input
                    ref={iconInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml,image/webp"
                    style={{ display: 'none' }}
                    onChange={handleIconSelect}
                  />
                  <button style={s.uploadBtn} onClick={() => iconInputRef.current?.click()}>
                    {iconFile ? '✅ Image selected' : '⬆ Upload Image'}
                  </button>
                  {iconFile && (
                    <button style={s.clearBtn} onClick={() => setIconFile(null)}>
                      ✕ Clear
                    </button>
                  )}
                  <span style={s.hint}>PNG, JPG, SVG or WebP</span>
                </div>
              </div>
            </div>

            {formError && <div style={s.errorBox}>{formError}</div>}

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button
                style={{ ...s.saveBtn, opacity: saving ? 0.7 : 1 }}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Saving...' : editTool ? 'Save Changes' : 'Create Tool'}
              </button>
              <button style={s.cancelBtn} onClick={() => setShowForm(false)} disabled={saving}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ── */}
      {deleteId && (
        <div style={s.overlay} onClick={() => setDeleteId(null)}>
          <div style={{ ...s.modal, maxWidth: 380 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ ...s.modalTitle, color: '#c62828' }}>⚠ Delete Tool</h3>
            <p style={{ color: '#555', marginBottom: 20 }}>
              This will permanently delete the tool from the platform.
              Users will no longer see it on the launcher.
              This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                style={{ ...s.saveBtn, backgroundColor: '#c62828' }}
                onClick={() => handleDelete(deleteId)}
              >
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
  header: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 24,
  },
  title:    { fontSize: 22, fontWeight: 700, color: '#1a3c5e', margin: '0 0 4px' },
  subtitle: { fontSize: 13, color: '#888', margin: 0 },
  addBtn: {
    padding: '9px 20px', backgroundColor: '#1a3c5e',
    color: '#fff', border: 'none', borderRadius: 6,
    fontSize: 14, fontWeight: 600, cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  errorBox: {
    padding: '12px 16px', backgroundColor: '#fff5f5',
    border: '1px solid #fc8181', borderRadius: 6,
    color: '#c53030', fontSize: 13, marginBottom: 16,
  },
  loading: { padding: 40, textAlign: 'center', color: '#888' },
  tableWrap: {
    backgroundColor: '#fff', borderRadius: 10,
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflowX: 'auto',
  },
  table:  { width: '100%', borderCollapse: 'collapse' },
  thead:  { backgroundColor: '#1a3c5e' },
  th: {
    padding: '12px 16px', textAlign: 'left',
    fontSize: 12, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap',
  },
  tr:     { borderBottom: '1px solid #f0f0f0' },
  td:     { padding: '12px 16px', fontSize: 13, color: '#333', verticalAlign: 'middle' },
  code: {
    backgroundColor: '#f0f4f8', padding: '2px 8px',
    borderRadius: 4, fontSize: 12, fontFamily: 'monospace', color: '#1a3c5e',
  },
  badge: {
    padding: '3px 10px', borderRadius: 12,
    fontSize: 11, fontWeight: 700,
  },
  editBtn: {
    padding: '5px 12px', backgroundColor: '#2e75b6',
    color: '#fff', border: 'none', borderRadius: 4,
    fontSize: 12, cursor: 'pointer',
  },
  deleteBtn: {
    padding: '5px 12px', backgroundColor: 'transparent',
    color: '#c62828', border: '1px solid #fc8181',
    borderRadius: 4, fontSize: 12, cursor: 'pointer',
  },
  overlay: {
    position: 'fixed', inset: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    zIndex: 9999, padding: 20,
  },
  modal: {
    backgroundColor: '#fff', borderRadius: 12,
    padding: 32, width: '100%', maxWidth: 640,
    boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
    maxHeight: '90vh', overflowY: 'auto',
  },
  modalTitle: { fontSize: 20, fontWeight: 700, color: '#1a3c5e', margin: '0 0 20px' },
  formGrid: {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px',
  },
  field:  { display: 'flex', flexDirection: 'column' },
  label:  { fontSize: 13, fontWeight: 600, color: '#444', marginBottom: 5 },
  hint:   { fontSize: 11, color: '#999', marginTop: 4 },
  input: {
    padding: '9px 12px', borderRadius: 6,
    border: '1px solid #ddd', fontSize: 13,
  },
  select: {
    padding: '9px 12px', borderRadius: 6,
    border: '1px solid #ddd', fontSize: 13, backgroundColor: '#fff',
  },
  emojiBtn: {
    width: 36, height: 36, fontSize: 18,
    border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  iconPreview: {
    width: 56, height: 56, border: '1px solid #ddd',
    borderRadius: 8, display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#f9f9f9',
  },
  uploadBtn: {
    padding: '7px 14px', backgroundColor: '#f0f4f8',
    border: '1px solid #2e75b6', color: '#2e75b6',
    borderRadius: 6, fontSize: 13, cursor: 'pointer',
  },
  clearBtn: {
    padding: '7px 10px', backgroundColor: 'transparent',
    border: '1px solid #ddd', color: '#999',
    borderRadius: 6, fontSize: 12, cursor: 'pointer',
  },
  saveBtn: {
    flex: 1, padding: 11,
    backgroundColor: '#1a3c5e', color: '#fff',
    border: 'none', borderRadius: 6,
    fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },
  cancelBtn: {
    flex: 1, padding: 11, backgroundColor: 'transparent',
    color: '#666', border: '1px solid #ddd',
    borderRadius: 6, fontSize: 14, cursor: 'pointer',
  },
}

export default AdminTools
