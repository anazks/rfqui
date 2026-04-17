// unitSelect.jsx — A combo box for selecting or typing a unit.
// Shows common units in a dropdown but also allows
// the user to type any custom unit not in the list.

import { useState, useRef, useEffect, useCallback } from 'react'

const COMMON_UNITS = [
  'Pieces', 'Nos', 'Set', 'Pair',
  'Kg', 'g', 'mg', 'Ton', 'lb', 'oz',
  'Litre', 'mL', 'cm3', 'mm3',
  'mm', 'cm', 'm', 'km', 'inch', 'ft',
  'm2', 'cm2', 'mm2',
  'Box', 'Carton', 'Roll', 'Sheet',
  'Hour', 'Day', 'Month',
]

function UnitSelect({ value, onChange, index }) {
  const [isOpen,   setIsOpen]  = useState(false)
  const [filtered, setFiltered] = useState(COMMON_UNITS)
  const [dropPos,  setDropPos]  = useState({ top: 0, left: 0, width: 0 })
  const containerRef            = useRef(null)

  // Filter dropdown based on current value
  useEffect(() => {
    const query = (value || '').toLowerCase()
    setFiltered(
      query
        ? COMMON_UNITS.filter(u => u.toLowerCase().includes(query))
        : COMMON_UNITS
    )
  }, [value])

  // Recalculate dropdown position whenever it opens or window scrolls/resizes
  const recalcPos = useCallback(() => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    // Check if there is enough room below — if not, open upward
    const spaceBelow = window.innerHeight - rect.bottom
    const dropHeight = Math.min(filtered.length * 33, 180)
    const openUpward = spaceBelow < dropHeight + 8

    setDropPos({
      left:   rect.left,
      width:  rect.width,
      top:    openUpward ? rect.top - dropHeight - 2 : rect.bottom + 2,
    })
  }, [filtered.length])

  useEffect(() => {
    if (!isOpen) return
    recalcPos()
    window.addEventListener('scroll', recalcPos, true)
    window.addEventListener('resize', recalcPos)
    return () => {
      window.removeEventListener('scroll', recalcPos, true)
      window.removeEventListener('resize', recalcPos)
    }
  }, [isOpen, recalcPos])

  // Close on outside click
  useEffect(() => {
    const handleOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  const handleSelect = (unit) => {
    setIsOpen(false)
    onChange(index, 'unit', unit)
  }

  const handleInputChange = (e) => {
    setIsOpen(true)
    onChange(index, 'unit', e.target.value)
  }

  // Dropdown rendered via position:fixed so it escapes any overflow container
  const dropdownStyle = {
    ...styles.dropdown,
    position: 'fixed',
    top:      dropPos.top,
    left:     dropPos.left,
    width:    dropPos.width,
  }

  return (
    <div style={styles.container} ref={containerRef}>
      <input
        type="text"
        value={value ?? 'Pieces'}
        onChange={handleInputChange}
        onFocus={() => { setIsOpen(true); recalcPos() }}
        placeholder="Unit"
        style={styles.input}
      />

      {isOpen && filtered.length > 0 && (
        <div style={dropdownStyle}>
          {filtered.map((unit) => (
            <div
              key={unit}
              style={styles.item}
              onMouseDown={(e) => e.preventDefault()} // prevent blur before click
              onClick={() => handleSelect(unit)}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f4f8'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff'}
            >
              {unit}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const styles = {
  container: { position: 'relative', width: '100%' },
  input: {
    width: '100%', padding: '8px 10px',
    borderRadius: '6px', border: '1px solid #ddd',
    fontSize: '12px', boxSizing: 'border-box',
  },
  dropdown: {
    // position/top/left/width set dynamically in dropdownStyle above
    backgroundColor: '#fff', border: '1px solid #ddd',
    borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    zIndex: 9999, maxHeight: '180px', overflowY: 'auto',
  },
  item: {
    padding: '7px 12px', cursor: 'pointer',
    fontSize: '12px', color: '#333',
    borderBottom: '1px solid #f5f5f5',
    backgroundColor: '#fff',
  },
}

export default UnitSelect