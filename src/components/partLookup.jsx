// partLookup.jsx — A part number input field with automatic lookup.
// When a user types a part number and either presses Enter or
// clicks the Search button, it fetches the part details from
// the database and fills them into the form automatically.
//
// Think of it like a barcode scanner —
// scan the code, details appear instantly.

import { useState } from 'react'
import { lookupPart } from '../services/api'

// This component receives one prop from its parent (the RFQ form):
// onPartFound — a function called when a part is successfully found.
//               the parent form uses this to receive the part data
//               and fill in description and specs fields.

function PartLookup({ onPartFound }) {

  // partNumber — what the user is typing in the input box
  const [partNumber, setPartNumber] = useState('')

  // status — tracks what is happening with the lookup
  // can be: 'idle', 'loading', 'found', 'notfound', 'error'
  const [status, setStatus] = useState('idle')

  // foundPart — stores the part object returned from the backend
  const [foundPart, setFoundPart] = useState(null)

  // ── Handle Lookup ─────────────────────────────
  // This runs when the user clicks Search or presses Enter.
  // It calls the backend and processes the response.
  const handleLookup = async () => {

    // Do nothing if the input is empty or just spaces
    if (!partNumber.trim()) return

    // Show loading state while waiting for backend
    setStatus('loading')
    setFoundPart(null)

    try {
      const response = await lookupPart(partNumber.trim())
      const part = response.data

      // Part was found — store it and update status
      setFoundPart(part)
      setStatus('found')

      // Pass the full part object up to the parent RFQ form
      // so it can fill in description, specs and unit fields
      onPartFound(part)

    } catch (err) {
      if (err.response && err.response.status === 404) {
        // 404 means the part number does not exist in the database
        setStatus('notfound')
      } else {
        // Any other error — network issue, server down etc.
        setStatus('error')
      }
      // Tell the parent form no part was found
      onPartFound(null)
    }
  }

  // ── Handle Enter Key ──────────────────────────
  // Allows the user to press Enter instead of clicking the button
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleLookup()
    }
  }

  // ── Handle Clear ──────────────────────────────
  // Resets everything back to the initial empty state
  const handleClear = () => {
    setPartNumber('')
    setStatus('idle')
    setFoundPart(null)
    // Tell the parent form to clear the part fields too
    onPartFound(null)
  }

  return (
    <div style={styles.container}>

      {/* Input row — text box + search button side by side */}
      <div style={styles.inputRow}>
        <input
          type="text"
          value={partNumber}
          onChange={(e) => {
            // Convert to uppercase automatically as user types
            // since all part numbers are stored in uppercase
            setPartNumber(e.target.value.toUpperCase())
            // Reset status when user starts typing a new number
            if (status !== 'idle') setStatus('idle')
          }}
          onKeyDown={handleKeyDown}
          placeholder="e.g. BRG-001"
          style={styles.input}
          // Disable input while a search is in progress
          disabled={status === 'loading'}
        />

        {/* Search button */}
        <button
          style={{
            ...styles.searchButton,
            // Grey out the button while loading
            opacity: status === 'loading' ? 0.7 : 1,
          }}
          onClick={handleLookup}
          disabled={status === 'loading'}
        >
          {status === 'loading' ? 'Searching...' : 'Search'}
        </button>

        {/* Clear button — only shown after a search has been done */}
        {status !== 'idle' && (
          <button style={styles.clearButton} onClick={handleClear}>
            Clear
          </button>
        )}
      </div>

      {/* ── Status Messages ───────────────────── */}

      {/* Part found — show a summary of what was found */}
      {status === 'found' && foundPart && (
        <div style={styles.successBox}>
          <p style={styles.successTitle}>✅ Part Found</p>

          {/* Description — show placeholder text if empty */}
          <p style={styles.detailRow}>
            <span style={styles.detailLabel}>Description:</span>
            <span>
              {foundPart.description || (
                <span style={styles.emptyNote}>No description on file</span>
              )}
            </span>
          </p>

          {/* Specifications — show placeholder text if empty */}
          <p style={styles.detailRow}>
            <span style={styles.detailLabel}>Specifications:</span>
            <span>
              {foundPart.specifications || (
                <span style={styles.emptyNote}>No specifications on file</span>
              )}
            </span>
          </p>

          {/* Unit */}
          <p style={styles.detailRow}>
            <span style={styles.detailLabel}>Unit:</span>
            <span>{foundPart.unit}</span>
          </p>
        </div>
      )}

      {/* Part not found — guide the user on what to do */}
      {status === 'notfound' && (
        <div style={styles.warningBox}>
          <p style={styles.warningTitle}>⚠️ Part Not Found</p>
          <p style={styles.warningText}>
            "{partNumber}" is not in the parts database.
            You can still continue — description and specs
            can be entered manually in the form below.
          </p>
        </div>
      )}

      {/* Error — something went wrong with the request */}
      {status === 'error' && (
        <div style={styles.errorBox}>
          <p>❌ Could not connect to the server. Please try again.</p>
        </div>
      )}

    </div>
  )
}

const styles = {
  container: {
    width: '100%',
  },
  inputRow: {
    display: 'flex',
    gap: '8px',         // Space between input and buttons
    alignItems: 'center',
  },
  input: {
    flex: 1,            // Takes up all available space in the row
    padding: '10px 12px',
    borderRadius: '6px',
    border: '1px solid #ddd',
    fontSize: '14px',
    boxSizing: 'border-box',
    letterSpacing: '0.5px', // Slightly spaced out — looks good for part numbers
  },
  searchButton: {
    padding: '10px 18px',
    backgroundColor: '#1a3c5e',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    whiteSpace: 'nowrap', // Prevents button text from wrapping
  },
  clearButton: {
    padding: '10px 14px',
    backgroundColor: 'transparent',
    color: '#888',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  successBox: {
    marginTop: '10px',
    padding: '14px',
    backgroundColor: '#f0fff4',   // Very light green background
    border: '1px solid #68d391',  // Green border
    borderRadius: '6px',
    lineHeight: '1.8',
  },
  successTitle: {
    fontWeight: '700',
    color: '#276749',
    marginBottom: '6px',
  },
  detailRow: {
    display: 'flex',
    gap: '8px',
    fontSize: '14px',
    color: '#333',
  },
  detailLabel: {
    fontWeight: '600',
    color: '#555',
    minWidth: '110px',  // Keeps labels aligned in a column
  },
  emptyNote: {
    color: '#aaa',
    fontStyle: 'italic',
    fontSize: '13px',
  },
  warningBox: {
    marginTop: '10px',
    padding: '14px',
    backgroundColor: '#fffbeb',   // Light yellow background
    border: '1px solid #f6ad55',  // Orange border
    borderRadius: '6px',
  },
  warningTitle: {
    fontWeight: '700',
    color: '#c05621',
    marginBottom: '4px',
  },
  warningText: {
    fontSize: '13px',
    color: '#7b341e',
    lineHeight: '1.6',
  },
  errorBox: {
    marginTop: '10px',
    padding: '14px',
    backgroundColor: '#fff5f5',   // Light red background
    border: '1px solid #fc8181',  // Red border
    borderRadius: '6px',
    fontSize: '14px',
    color: '#c53030',
  },
}

export default PartLookup