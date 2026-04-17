// partSearch.jsx — Part number input with autocomplete dropdown.
// If part exists in database — auto fills description and specs.
// If part does not exist — accepts the typed value as a new part
// without asking for confirmation. Seamless experience.

import { useState, useEffect, useRef } from 'react'
import { searchParts } from '../services/api'

function PartSearch({ onPartFound, index, initialValue }) {
  const [searchText, setSearchText]     = useState(initialValue || '')
  const [results, setResults]           = useState([])
  const [isOpen, setIsOpen]             = useState(false)
  const [isLoading, setIsLoading]       = useState(false)
  const [isConfirmed, setIsConfirmed]   = useState(!!initialValue)
  const containerRef                    = useRef(null)

  // If a value is passed in from a loaded RFQ (versioning)
  // mark it as confirmed immediately
  useEffect(() => {
    if (initialValue) {
      setSearchText(initialValue)
      setIsConfirmed(true)
    }
  }, [initialValue])

  // ── Search Effect — debounced 300ms ──────────
  useEffect(() => {
    if (searchText.trim().length < 1) {
      setResults([])
      setIsOpen(false)
      return
    }

    // Do not search if already confirmed
    if (isConfirmed) return

    const delay = setTimeout(async () => {
      setIsLoading(true)
      try {
        const response = await searchParts(searchText)
        setResults(response.data)
        setIsOpen(response.data.length > 0)
      } catch (err) {
        setResults([])
        console.error('Search failed:', err.message)
      } finally {
        setIsLoading(false)
      }
    }, 300)

    return () => clearTimeout(delay)
  }, [searchText, isConfirmed])

  // ── Close on outside click ────────────────────
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
        // If user typed something and clicked away without selecting
        // treat the typed value as the part number automatically
        if (searchText.trim() && !isConfirmed) {
          confirmPartNumber(searchText.trim().toUpperCase())
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [searchText, isConfirmed])

  // ── Confirm a part number ─────────────────────
  // Called when user selects from dropdown OR types and moves on
  const confirmPartNumber = (partNum, partData = null) => {
    setSearchText(partNum)
    setIsConfirmed(true)
    setIsOpen(false)
    setResults([])

    if (partData) {
      // Part found in database — pass full details
      onPartFound(index, {
        partNumber:     partData.partNumber,
        description:    partData.description    || '',
        specifications: partData.specifications || '',
        unit:           partData.unit           || 'Pieces',
      })
    } else {
      // Part not in database — just use the typed number
      // No confirmation needed — seamless
      onPartFound(index, {
        partNumber:     partNum,
        description:    '',
        specifications: '',
        unit:           'Pieces',
      })
    }
  }

  // ── Select from dropdown ──────────────────────
  const handleSelect = (part) => {
    confirmPartNumber(part.partNumber, part)
  }

  // ── Handle typing ─────────────────────────────
  const handleChange = (e) => {
    const val = e.target.value.toUpperCase()
    setSearchText(val)
    setIsConfirmed(false)
  }

  // ── Handle Enter key ──────────────────────────
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && searchText.trim()) {
      const match = results.find(
        r => r.partNumber === searchText.trim().toUpperCase()
      )
      confirmPartNumber(searchText.trim().toUpperCase(), match || null)
    }
  }

  // ── Clear ─────────────────────────────────────
  const handleClear = () => {
    setSearchText('')
    setIsConfirmed(false)
    setResults([])
    onPartFound(index, null)
  }

  return (
    <div style={styles.container} ref={containerRef}>
      <div style={styles.inputRow}>
        <input
          type="text"
          value={searchText}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (results.length > 0 && !isConfirmed) setIsOpen(true)
          }}
          placeholder="Type part number"
          style={{
            ...styles.input,
            borderColor: isConfirmed ? '#68d391' : '#ddd',
          }}
        />
        {isLoading && <span style={styles.spinner}>⏳</span>}
        {isConfirmed && searchText && (
          <button style={styles.clearBtn} onClick={handleClear}>✕</button>
        )}
      </div>

      {/* Dropdown results */}
      {isOpen && results.length > 0 && (
        <div style={styles.dropdown}>
          {results.map((part) => (
            <div
              key={part._id}
              style={styles.item}
              onClick={() => handleSelect(part)}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f4f8'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff'}
            >
              <span style={styles.partNum}>{part.partNumber}</span>
              <span style={styles.partDesc}>
                {part.description || 'No description'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const styles = {
  container:  { position: 'relative', width: '100%' },
  inputRow:   { position: 'relative', display: 'flex', alignItems: 'center' },
  input: {
    width: '100%', padding: '8px 28px 8px 10px',
    borderRadius: '6px', border: '1px solid #ddd',
    fontSize: '12px', boxSizing: 'border-box',
    textTransform: 'uppercase',
  },
  spinner:  { position: 'absolute', right: '24px', fontSize: '11px' },
  clearBtn: {
    position: 'absolute', right: '4px',
    background: 'none', border: 'none',
    color: '#aaa', cursor: 'pointer', fontSize: '12px',
  },
  dropdown: {
    position: 'absolute', top: '100%', left: 0, right: 0,
    backgroundColor: '#fff', border: '1px solid #ddd',
    borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    zIndex: 1000, maxHeight: '200px', overflowY: 'auto',
  },
  item: {
    padding: '8px 12px', cursor: 'pointer',
    display: 'flex', flexDirection: 'column', gap: '2px',
    borderBottom: '1px solid #f5f5f5', backgroundColor: '#fff',
  },
  partNum:  { fontSize: '12px', fontWeight: '700', color: '#1a3c5e' },
  partDesc: { fontSize: '11px', color: '#888' },
}

export default PartSearch