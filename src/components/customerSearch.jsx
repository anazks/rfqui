// CustomerSearch.jsx — A reusable customer search box with autocomplete.
// When a user types a company name, it searches the Customer Master
// and shows matching results in a dropdown.
// Selecting a result fills all customer details into the parent form.
//
// Think of it like a smart contact picker —
// type a name, pick from suggestions, details auto-fill.

import { useState, useEffect, useRef } from 'react'
import { searchCustomers } from '../services/api'

// This component receives two props from its parent (the  form):
// onSelect  — a function called when the user picks a customer
//             the parent form uses this to receive the selected customer data
// value     — the current text shown in the search box
//             controlled by the parent so the form can clear it if needed
function CustomerSearch({ onSelect, value }) {

  // results — the list of matching customers returned from the backend
  const [results, setResults]       = useState([])

  // searchText — what the user has typed in the search box
  const [searchText, setSearchText] = useState(value || '')

  // isOpen — controls whether the dropdown is visible or hidden
  const [isOpen, setIsOpen]         = useState(false)

  // isLoading — shows a loading indicator while waiting for backend response
  const [isLoading, setIsLoading]   = useState(false)

  // error — stores any error message if the search fails
  const [error, setError]           = useState('')

  // containerRef — a reference to the outer div so we can detect
  // when the user clicks outside the component to close the dropdown.
  // Think of it like knowing when a customer walks away from the counter.
  const containerRef = useRef(null)

  // ── Search Effect ─────────────────────────────
  // This runs every time searchText changes.
  // It waits 300ms after the user stops typing before calling the backend.
  // This is called "debouncing" — it prevents sending a new request
  // on every single keystroke which would overload the server.
  // Think of it like waiting for someone to finish speaking
  // before you respond instead of interrupting after every word.
  useEffect(() => {
    // If less than 2 characters typed, clear results and do nothing
    if (searchText.trim().length < 2) {
      setResults([])
      setIsOpen(false)
      return
    }

    // Set a 300ms delay before calling the backend
    const delay = setTimeout(async () => {
      setIsLoading(true)
      setError('')

      try {
        const response = await searchCustomers(searchText)
        setResults(response.data)
        // Only open dropdown if there are results to show
        setIsOpen(response.data.length > 0)
      } catch (err) {
        setError('Could not search customers'+ err.message)
        setIsOpen(false)
      } finally {
        // Always turn off loading indicator when done
        // whether the request succeeded or failed
        setIsLoading(false)
      }
    }, 300)

    // Cleanup — if the user types again before 300ms is up,
    // cancel the previous delayed request and start a new one.
    // This ensures only one request is made per "finished" typing pause.
    return () => clearTimeout(delay)

  }, [searchText]) // Re-run this effect whenever searchText changes

  // ── Outside Click Detection ───────────────────
  // When the user clicks anywhere outside this component,
  // close the dropdown. Same behaviour as any real search box.
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    // Attach the listener to the whole document
    document.addEventListener('mousedown', handleClickOutside)

    // Cleanup — remove the listener when this component is removed from screen
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // ── Handle Customer Selection ─────────────────
  // Runs when the user clicks on a customer in the dropdown.
  const handleSelect = (customer) => {
    // Show the selected company name in the search box
    setSearchText(customer.companyName)

    // Close the dropdown
    setIsOpen(false)

    // Pass the full customer object up to the parent form
    // so it can fill in all the other fields automatically
    onSelect(customer)
  }

  // ── Handle Manual Typing ──────────────────────
  // When the user clears the box or types something new,
  // notify the parent that no customer is selected anymore.
  const handleChange = (e) => {
    const value = e.target.value
    setSearchText(value)

    // If the box is cleared, tell the parent to reset customer fields
    if (value === '') {
      onSelect(null)
    }
  }

  return (
    // The ref here is what allows us to detect outside clicks
    <div style={styles.container} ref={containerRef}>

      {/* Search input box */}
      <div style={styles.inputWrapper}>
        <input
          type="text"
          value={searchText}
          onChange={handleChange}
          placeholder="Type company name to search..."
          style={styles.input}
          // Open dropdown again if user clicks back into the box
          // and there are already results loaded
          onFocus={() => results.length > 0 && setIsOpen(true)}
        />

        {/* Loading spinner — shown while waiting for backend response */}
        {isLoading && (
          <span style={styles.spinner}>⏳</span>
        )}
      </div>

      {/* Error message — shown if the search request fails */}
      {error && (
        <p style={styles.error}>{error}</p>
      )}

      {/* Dropdown results list */}
      {isOpen && results.length > 0 && (
        <div style={styles.dropdown}>
          {results.map((customer) => (
            <div
              key={customer._id}
              style={styles.dropdownItem}
              onClick={() => handleSelect(customer)}
              // Change background on hover using inline event handlers
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f4f8'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
            >
              {/* Company name — shown prominently */}
              <span style={styles.companyName}>
                {customer.companyName}
              </span>

              {/* Contact name and city — shown as smaller detail text */}
              <span style={styles.customerDetail}>
                {[customer.contactName, customer.city]
                  .filter(Boolean) // Remove empty values
                  .join(' · ')     // Join with a dot separator
                }
              </span>
            </div>
          ))}

          {/* Option to add as new customer if none match */}
          <div
            style={styles.addNewOption}
            onClick={() => {
              setIsOpen(false)
              // Pass a partial object so the form knows to treat
              // this as a new customer with just the typed name
              onSelect({ companyName: searchText, isNew: true })
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e8f4fd'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
          >
            + Add "{searchText}" as new customer
          </div>
        </div>
      )}

      {/* Show "no results" message with add option
          when search returned nothing */}
      {isOpen === false &&
       searchText.trim().length >= 2 &&
       results.length === 0 &&
       !isLoading && (
        <div style={styles.dropdown}>
          <div
            style={styles.addNewOption}
            onClick={() => {
              onSelect({ companyName: searchText, isNew: true })
            }}
          >
            + Add "{searchText}" as new customer
          </div>
        </div>
      )}

    </div>
  )
}

const styles = {
  container: {
    position: 'relative', // Needed so the dropdown positions itself
    width: '100%',        // relative to this container
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  input: {
    width: '100%',
    padding: '10px 36px 10px 12px', // Extra right padding for spinner
    borderRadius: '6px',
    border: '1px solid #ddd',
    fontSize: '14px',
    boxSizing: 'border-box',
  },
  spinner: {
    position: 'absolute',
    right: '10px',
    fontSize: '14px',
  },
  dropdown: {
    position: 'absolute',  // Floats over the page — does not push content down
    top: '100%',           // Appears just below the input box
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    border: '1px solid #ddd',
    borderRadius: '6px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    zIndex: 1000,          // Sits on top of everything else on the page
    maxHeight: '280px',
    overflowY: 'auto',     // Scrollable if more than fits in 280px
  },
  dropdownItem: {
    padding: '10px 14px',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #f0f0f0',
    transition: 'background-color 0.1s',
  },
  companyName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1a3c5e',
  },
  customerDetail: {
    fontSize: '12px',
    color: '#888',
  },
  addNewOption: {
    padding: '10px 14px',
    cursor: 'pointer',
    fontSize: '13px',
    color: '#2e75b6',
    fontWeight: '600',
    backgroundColor: '#f8f9fa',
  },
  error: {
    color: '#e74c3c',
    fontSize: '12px',
    marginTop: '4px',
  },
}

export default CustomerSearch