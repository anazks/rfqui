// NewQuotation.jsx — RFQ creation and revision form.

import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import PartSearch    from '../../components/partSearch'
import UnitSelect    from '../../components/unitSelect'
import CustomerSearch from '../../components/customerSearch'
import {
  createQuotation,
  createQuotationVersion,
  getTenantPartsTemplate,
  bulkUploadParts,
  downloadPdf,
} from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { TOOLS } from '../../config/platform'

// ── Constants ─────────────────────────────────
const CURRENCIES = [
  { code: 'INR', symbol: '₹',   name: 'Indian Rupee'     },
  { code: 'USD', symbol: '$',   name: 'US Dollar'        },
  { code: 'EUR', symbol: '€',   name: 'Euro'             },
  { code: 'GBP', symbol: '£',   name: 'British Pound'    },
  { code: 'AED', symbol: 'AED', name: 'UAE Dirham'       },
  { code: 'SGD', symbol: 'S$',  name: 'Singapore Dollar' },
]

const STANDARD_FIELDS = [
  'partnumber', 'description', 'specifications',
  'unit', 'quantity', 'unitprice', 'totalprice',
  'partno', 'partcode', 'itemno', 'itemnumber', 'itemcode',
  'desc', 'itemdescription', 'qty', 'price', 'rate', 'unitrate',
  'uom', 'spec', 'specs',
]

const EMPTY_PART = {
  partNumber: '', description: '', specifications: '',
  unit: 'Pieces', quantity: '', unitPrice: '', totalPrice: 0,
  customFields: {},
}

const DEFAULT_TERMS = `1. Prices are valid for 30 days from the date of this quotation.
2. Delivery timelines will be confirmed upon receipt of purchase order.
3. Payment terms: 30 days net from invoice date.
4. All prices are exclusive of applicable taxes.
5. Orders are subject to availability of stock.`

const COL_PX = {
  partNumber:     180,
  description:    220,
  specifications: 160,
  unit:           120,
  quantity:       100,
  unitPrice:      120,
  totalPrice:     120,
  extra:          120,
  remove:          50,
}

const buildGridTemplate = (extraCount) => {
  const base = [
    COL_PX.partNumber, COL_PX.description, COL_PX.specifications,
    COL_PX.unit, COL_PX.quantity, COL_PX.unitPrice, COL_PX.totalPrice,
  ].map(w => w + 'px').join(' ')
  const extras = Array(extraCount).fill(COL_PX.extra + 'px').join(' ')
  const remove = COL_PX.remove + 'px'
  return [base, extras, remove].filter(Boolean).join(' ')
}

function NewQuotation() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()

  // Revision detection
  const existingQuotation = location.state?.quotation || null
  const isRevision  = !!existingQuotation
  const latestVersionNumber = existingQuotation
    ? Math.max(
        existingQuotation.version || 1,
        ...(existingQuotation.allVersions?.map(v => v.version || 1) || [1])
      )
    : 1

  const [customer, setCustomer] = useState({
    customerId: '', companyName: '', contactName: '',
    email: '', phone: '', address: '', city: '', country: 'India',
  })

  const [parts, setParts] = useState([{ ...EMPTY_PART }])
  const [extraColumns, setExtraColumns] = useState([])
  const [terms,       setTerms]       = useState(DEFAULT_TERMS)
  const [attachments, setAttachments] = useState([])
  const [currency,    setCurrency]    = useState(CURRENCIES[0])

  const [isSubmitting,  setIsSubmitting]  = useState(false)
  const [submitError,   setSubmitError]   = useState('')
  const [submitSuccess, setSubmitSuccess] = useState(null)
  const [isBulkLoading, setIsBulkLoading] = useState(false)
  const [bulkMessage,   setBulkMessage]   = useState('')

  useEffect(() => {
    if (isRevision) return
    const loadTemplateHeaders = async () => {
      try {
        const response = await getTenantPartsTemplate({ headersOnly: true })
        const templateHeaders = response?.data?.templateHeaders || []
        const normalise = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
        const detectedExtra = templateHeaders.filter(
          header => !STANDARD_FIELDS.includes(normalise(header))
        )
        setExtraColumns(detectedExtra)
        setParts([{
          ...EMPTY_PART,
          customFields: Object.fromEntries(detectedExtra.map(col => [col, ''])),
        }])
      } catch (err) {
        console.error('[NewQuotation] Could not pre-load template headers:', err.message)
      }
    }
    loadTemplateHeaders()
  }, [isRevision])

  useEffect(() => {
    if (!existingQuotation) return
    setCustomer({
      customerId:  existingQuotation.customer?.customerId  || '',
      companyName: existingQuotation.customer?.companyName || '',
      contactName: existingQuotation.customer?.contactName || '',
      email:       existingQuotation.customer?.email       || '',
      phone:       existingQuotation.customer?.phone       || '',
      address:     existingQuotation.customer?.address     || '',
      city:        existingQuotation.customer?.city        || '',
      country:     existingQuotation.customer?.country     || 'India',
    })

    if (existingQuotation.parts?.length > 0) {
      const loadedParts = existingQuotation.parts.map(p => ({
        partNumber:     p.partNumber     || '',
        description:    p.description    || '',
        specifications: p.specifications || '',
        unit:           p.unit           || 'Pieces',
        quantity:       p.quantity       || '',
        unitPrice:      p.unitPrice      || '',
        totalPrice:     p.totalPrice     || 0,
        customFields:   p.customFields   || {},
      }))
      setParts(loadedParts)
      const existingCustomKeys = new Set()
      loadedParts.forEach(p => { Object.keys(p.customFields || {}).forEach(k => existingCustomKeys.add(k)) })
      if (existingCustomKeys.size > 0) setExtraColumns(Array.from(existingCustomKeys))
    }
    if (existingQuotation.termsAndConditions) setTerms(existingQuotation.termsAndConditions)
    if (existingQuotation.currency) {
      const found = CURRENCIES.find(c => c.code === existingQuotation.currency)
      if (found) setCurrency(found)
    }
  }, [existingQuotation])

  const handleCustomerSelect = (selected) => {
    if (!selected) {
      setCustomer({ customerId: '', companyName: '', contactName: '', email: '', phone: '', address: '', city: '', country: 'India' })
      return
    }
    setCustomer({
      customerId: selected._id, companyName: selected.companyName, contactName: selected.contactName, email: selected.email, phone: selected.phone, address: selected.address, city: selected.city, country: selected.country || 'India'
    })
  }

  const handleCustomerFieldChange = (field, value) => setCustomer(prev => ({ ...prev, [field]: value }))

  const handlePartFound = (index, part) => {
    setParts(prev => {
      const updated = [...prev]
      updated[index] = part ? {
        ...updated[index],
        partNumber:     part.partNumber,
        description:    part.description,
        specifications: part.specifications,
        unit:           part.unit || 'Pieces',
      } : { ...updated[index], partNumber: '', description: '', specifications: '', unit: 'Pieces' }
      return updated
    })
  }

  const handlePartChange = (index, field, value) => {
    setParts(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      if (field === 'quantity' || field === 'unitPrice') {
        const qty   = parseFloat(updated[index].quantity)  || 0
        const price = parseFloat(updated[index].unitPrice) || 0
        updated[index].totalPrice = qty * price
      }
      return updated
    })
  }

  const handleCustomFieldChange = (index, colName, value) => {
    setParts(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], customFields: { ...updated[index].customFields, [colName]: value } }
      return updated
    })
  }

  const addPartLine = () => {
    const emptyCustomFields = {}
    extraColumns.forEach(col => { emptyCustomFields[col] = '' })
    setParts(prev => [...prev, { ...EMPTY_PART, customFields: emptyCustomFields }])
  }

  const removePartLine = (index) => {
    if (parts.length === 1) return
    setParts(prev => prev.filter((_, i) => i !== index))
  }

  const grandTotal = parts.reduce((sum, p) => sum + (parseFloat(p.totalPrice) || 0), 0)

  const handleDownloadTemplate = async () => {
    try {
      const response = await getTenantPartsTemplate()
      const url  = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a'); link.href = url
      link.setAttribute('download', 'parts-template.xlsx')
      document.body.appendChild(link); link.click(); link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) { alert('Template download failed') }
  }

  const handleBulkUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return
    setIsBulkLoading(true); setBulkMessage('')
    try {
      const formData = new FormData(); formData.append('file', file)
      const response = await bulkUploadParts(formData)
      const { parts: returnedParts, headers: templateHeaders } = response.data
      const normalise = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
      const detectedExtra = (templateHeaders || []).filter(h => !STANDARD_FIELDS.includes(normalise(h)))
      if (detectedExtra.length > 0) setExtraColumns(detectedExtra)
      setParts(returnedParts.map(p => ({
        partNumber: p.partNumber, description: p.description, specifications: p.specifications,
        unit: p.unit || 'Pieces', quantity: p.quantity, unitPrice: p.unitPrice, totalPrice: p.totalPrice, customFields: p._customFields || {}
      })))
      setBulkMessage(`✅ Loaded ${returnedParts.length} parts.`)
    } catch (err) { setBulkMessage('❌ Upload failed.') } finally { setIsBulkLoading(false); e.target.value = '' }
  }

  const handleSubmit = async () => {
    setSubmitError('')
    if (!customer.companyName) return setSubmitError('Customer name is required')
    const hasValidPart = parts.some(p => (p.partNumber || p.description) && parseFloat(p.quantity) > 0 && parseFloat(p.unitPrice) > 0)
    if (!hasValidPart) return setSubmitError('Add at least one part with price and quantity')
    setIsSubmitting(true)
    try {
      const payload = { customer, parts, termsAndConditions: terms, currency: currency.code, currencySymbol: currency.symbol }
      const response = isRevision ? await createQuotationVersion(existingQuotation._id, payload) : await createQuotation({ ...payload, attachments: [] })
      setSubmitSuccess(response.data.quotation)
    } catch (err) { setSubmitError(err.response?.data?.message || 'Submission failed') } finally { setIsSubmitting(false) }
  }

  const resetForm = () => { window.location.reload() }

  const handleDownloadPdfResult = async () => {
    try {
      const response = await downloadPdf(submitSuccess._id)
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
      const link = document.createElement('a'); link.href = url
      link.setAttribute('download', `${submitSuccess.quoteNumber}.pdf`)
      document.body.appendChild(link); link.click(); link.remove(); window.URL.revokeObjectURL(url)
    } catch (err) { alert('PDF generation failed') }
  }

  if (submitSuccess) {
    return (
      <div className="gradient-bg" style={styles.container}>
        <div style={styles.successWrapper}>
          <div className="glass" style={styles.successCard}>
            <div style={styles.successIcon}>✨</div>
            <h2 style={styles.successHeader}>{isRevision ? 'Version Updated' : 'Quotation Issued'}</h2>
            <p style={styles.successQuoteNum}>{submitSuccess.quoteNumber}</p>
            <p style={{ color: 'var(--text-muted)', marginBottom: 32 }}>Sent to {submitSuccess.customer?.companyName}</p>
            <div style={styles.successActions}>
              <button style={styles.primaryButton} onClick={handleDownloadPdfResult}>Download PDF</button>
              <button style={styles.secondaryButton} onClick={() => navigate('/quotex/tracker')}>Return to Tracker</button>
              <button style={styles.textButton} onClick={resetForm}>Create Another</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="gradient-bg" style={styles.container}>
      {/* ── Navbar ── */}
      <header className="glass" style={styles.navbar}>
        <div style={styles.navContainer}>
          <div style={styles.navBrand}>
            <div style={styles.logoMini}>Q</div>
            <h2 style={styles.navTitle}>{isRevision ? 'Revision Mode' : 'New Quotation'}</h2>
          </div>
          <div style={styles.navInteractions}>
             <button style={styles.navLink} onClick={() => navigate('/quotex/tracker')}>Tracker</button>
             <button style={styles.logoutButton} onClick={() => { logout(); navigate('/') }}>Sign Out</button>
          </div>
        </div>
      </header>

      <main style={styles.content}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
           <h1 style={styles.heading}>{isRevision ? 'Update Quotation' : 'Craft New Offer'}</h1>
           <button style={styles.cancelBtn} onClick={() => navigate(-1)}>Cancel</button>
        </div>

        {/* ── Section 1: Customer ── */}
        <div className="glass" style={styles.section}>
          <div style={styles.sectionHeader}>
            <h3 style={styles.sectionTitle}>1. Client Portfolio</h3>
            <span style={styles.sectionBadge}>Required</span>
          </div>
          
          <div style={{ marginBottom: 24 }}>
            <label style={styles.label}>Lookup Existing Profile</label>
            <CustomerSearch onSelect={handleCustomerSelect} value={customer.companyName} />
          </div>

          <div style={styles.grid2}>
            <div style={styles.field}>
              <label style={styles.label}>Company Legal Name</label>
              <input style={styles.input} value={customer.companyName} onChange={e => handleCustomerFieldChange('companyName', e.target.value)} />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Concerned Person</label>
              <input style={styles.input} value={customer.contactName} onChange={e => handleCustomerFieldChange('contactName', e.target.value)} />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Email Address</label>
              <input style={styles.input} type="email" value={customer.email} onChange={e => handleCustomerFieldChange('email', e.target.value)} />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Contact Number</label>
              <input style={styles.input} value={customer.phone} onChange={e => handleCustomerFieldChange('phone', e.target.value)} />
            </div>
          </div>
        </div>

        {/* ── Section 2: Items ── */}
        <div className="glass" style={{ ...styles.section, padding: 0, overflow: 'hidden' }}>
          <div style={{ ...styles.sectionHeader, padding: '32px 32px 20px' }}>
            <h3 style={styles.sectionTitle}>2. Line Items & Valuation</h3>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <select style={styles.currencySelect} value={currency.code} onChange={e => setCurrency(CURRENCIES.find(c => c.code === e.target.value))}>
                {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>)}
              </select>
              <button style={styles.actionBtn} onClick={handleDownloadTemplate}>Template</button>
              <label style={styles.uploadLabel}>
                 {isBulkLoading ? '...' : 'Import'}
                 <input type="file" hidden onChange={handleBulkUpload} />
              </label>
            </div>
          </div>

          {bulkMessage && <div style={styles.bulkMsg}>{bulkMessage}</div>}

          <div style={styles.tableArea}>
            <div style={{ ...styles.tableHeader, gridTemplateColumns: buildGridTemplate(extraColumns.length) }}>
              {['Part Number', 'Description', 'Specs', 'Unit', 'Qty', 'Rate', 'Total'].map(h => <div key={h} style={styles.thCell}>{h}</div>)}
              {extraColumns.map(c => <div key={c} style={styles.thCell}>{c}</div>)}
              <div style={styles.thCell}></div>
            </div>

            {parts.map((p, i) => (
              <div key={i} style={{ ...styles.tableRow, gridTemplateColumns: buildGridTemplate(extraColumns.length) }}>
                <div style={styles.cell}><PartSearch index={i} onPartFound={handlePartFound} initialValue={p.partNumber} /></div>
                <div style={styles.cell}><input style={styles.cellInput} value={p.description} onChange={e => handlePartChange(i, 'description', e.target.value)} /></div>
                <div style={styles.cell}><input style={styles.cellInput} value={p.specifications} onChange={e => handlePartChange(i, 'specifications', e.target.value)} /></div>
                <div style={styles.cell}><UnitSelect value={p.unit} onChange={handlePartChange} index={i} /></div>
                <div style={styles.cell}><input style={styles.cellInput} type="number" value={p.quantity} onChange={e => handlePartChange(i, 'quantity', e.target.value)} /></div>
                <div style={styles.cell}><input style={styles.cellInput} type="number" value={p.unitPrice} onChange={e => handlePartChange(i, 'unitPrice', e.target.value)} /></div>
                <div style={styles.cell}><input style={{...styles.cellInput, fontWeight: 700}} value={p.totalPrice.toFixed(0)} readOnly /></div>
                {extraColumns.map(c => (
                  <div key={c} style={styles.cell}><input style={styles.cellInput} value={p.customFields?.[c] || ''} onChange={e => handleCustomFieldChange(i, c, e.target.value)} /></div>
                ))}
                <div style={styles.cell}><button style={styles.removeBtn} onClick={() => removePartLine(i)}>✕</button></div>
              </div>
            ))}
          </div>

          <div style={styles.tableFooter}>
             <button style={styles.addRowBtn} onClick={addPartLine}>+ Add Position</button>
             <div style={styles.totalBox}>
                <span style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 }}>Net Total</span>
                <span style={styles.totalValue}>{currency.symbol} {grandTotal.toLocaleString()}</span>
             </div>
          </div>
        </div>

        {/* ── Section 3: Terms ── */}
        <div className="glass" style={styles.section}>
          <h3 style={styles.sectionTitle}>3. Terms of Service</h3>
          <textarea style={styles.textarea} value={terms} onChange={e => setTerms(e.target.value)} rows={6} />
        </div>

        {submitError && <div style={styles.submitError}>{submitError}</div>}

        <div style={styles.formActions}>
          <button style={styles.primaryButton} onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Processing...' : (isRevision ? 'Finalise Revision' : 'Issue Quotation')}
          </button>
        </div>
      </main>
    </div>
  )
}

const styles = {
  container: { minHeight: '100vh' },
  navbar: { position: 'sticky', top: 0, zIndex: 100, borderBottom: '1px solid var(--card-border)' },
  navContainer: { maxWidth: 1400, margin: '0 auto', padding: '12px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  navBrand: { display: 'flex', alignItems: 'center', gap: 12 },
  logoMini: { width: 32, height: 32, backgroundColor: 'var(--accent)', color: '#fff', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: 18 },
  navTitle: { fontSize: 18, fontWeight: 800, color: 'var(--primary)', margin: 0 },
  navInteractions: { display: 'flex', gap: 16 },
  navLink: { background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14, fontWeight: 600 },
  logoutButton: { background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 14, fontWeight: 700 },
  content: { padding: '60px 40px', maxWidth: 1400, margin: '0 auto' },
  heading: { fontSize: 36, fontWeight: 800, color: 'var(--primary)', margin: 0 },
  cancelBtn: { padding: '8px 24px', borderRadius: 10, border: '1.5px solid var(--card-border)', background: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 600 },
  section: { padding: 32, borderRadius: 24, marginBottom: 32 },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  sectionTitle: { fontSize: 20, fontWeight: 800, color: 'var(--primary)', margin: 0 },
  sectionBadge: { fontSize: 10, textTransform: 'uppercase', fontWeight: 800, color: 'var(--accent)', backgroundColor: 'rgba(99, 102, 241, 0.1)', padding: '4px 10px', borderRadius: 6 },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 },
  field: { display: 'flex', flexDirection: 'column', gap: 8 },
  label: { fontSize: 12, fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { padding: '12px 16px', borderRadius: 12, border: '1.5px solid var(--card-border)', fontSize: 15, outline: 'none' },
  currencySelect: { padding: '8px', borderRadius: 10, border: '1.5px solid var(--card-border)', fontSize: 13, fontWeight: 600 },
  actionBtn: { padding: '8px 16px', borderRadius: 10, border: '1.5px solid var(--card-border)', background: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  uploadLabel: { padding: '8px 16px', borderRadius: 10, backgroundColor: 'var(--primary)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  bulkMsg: { padding: '12px 32px', borderBottom: '1px solid var(--card-border)', fontSize: 13, fontWeight: 600 },
  tableArea: { overflowX: 'auto' },
  tableHeader: { display: 'grid', backgroundColor: 'rgba(15, 23, 42, 0.03)', borderBottom: '1px solid var(--card-border)' },
  thCell: { padding: '16px 20px', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--primary)' },
  tableRow: { display: 'grid', borderBottom: '1px solid var(--card-border)', transition: 'background 0.2s' },
  cell: { padding: '12px 16px', display: 'flex', alignItems: 'center' },
  cellInput: { width: '100%', padding: '8px', border: 'none', background: 'none', fontSize: 14, outline: 'none' },
  removeBtn: { width: 28, height: 28, borderRadius: 8, border: 'none', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', cursor: 'pointer' },
  tableFooter: { padding: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(15, 23, 42, 0.02)' },
  addRowBtn: { padding: '10px 24px', borderRadius: 12, border: '1.5px solid var(--card-border)', background: '#fff', fontWeight: 700, cursor: 'pointer' },
  totalBox: { textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 4 },
  totalValue: { fontSize: 32, fontWeight: 800, color: 'var(--primary)', fontFamily: 'Outfit' },
  textarea: { width: '100%', padding: 20, borderRadius: 16, border: '1.5px solid var(--card-border)', fontSize: 15, lineHeight: 1.6, outline: 'none' },
  formActions: { display: 'flex', justifyContent: 'flex-end', marginTop: 16 },
  primaryButton: { padding: '16px 40px', borderRadius: 16, border: 'none', backgroundColor: 'var(--primary)', color: '#fff', fontSize: 16, fontWeight: 800, cursor: 'pointer', boxShadow: 'var(--shadow-md)' },
  submitError: { padding: 16, borderRadius: 12, backgroundColor: '#fff1f2', color: '#e11d48', fontWeight: 600, fontSize: 14, marginBottom: 24, textAlign: 'center' },
  successWrapper: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' },
  successCard: { padding: 60, borderRadius: 32, textAlign: 'center', maxWidth: 500, boxShadow: 'var(--shadow-lg)' },
  successIcon: { fontSize: 64, marginBottom: 24 },
  successHeader: { fontSize: 28, fontWeight: 800, color: 'var(--primary)', marginBottom: 8 },
  successQuoteNum: { fontSize: 24, fontWeight: 700, color: 'var(--accent)', marginBottom: 8 },
  successActions: { display: 'flex', flexDirection: 'column', gap: 16 },
  secondaryButton: { padding: '14px', borderRadius: 16, border: '2px solid var(--card-border)', background: 'none', fontWeight: 700, cursor: 'pointer' },
  textButton: { background: 'none', border: 'none', color: 'var(--text-muted)', fontWeight: 600, cursor: 'pointer' }
}

export default NewQuotation
