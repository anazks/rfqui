// AuthContext.jsx — SourceHUB global authentication state.
// Storage keys and tool code fallbacks read from platform.js config.
// To rename: change platform.js only.

import { createContext, useContext, useState, useEffect } from 'react'
import { loginUser, getMe } from '../services/api'
import { PLATFORM, TOOLS } from '../config/platform'

const QUOTEX_CODE = TOOLS.quotex.code  // 'quotex'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {

  const [user,             setUser]             = useState(null)
  const [isLoading,        setIsLoading]        = useState(true)
  const [licenceWarning,   setLicenceWarning]   = useState(null)
  const [allPlatformTools, setAllPlatformTools] = useState([])

  // ── Restore session on app load ───────────────
  useEffect(() => {
    const restoreSession = async () => {
      const token = localStorage.getItem(PLATFORM.storageToken)
      if (!token) { setIsLoading(false); return }
      try {
        const response = await getMe()
        setUser(response.data.user)
        if (response.data.allPlatformTools) {
          setAllPlatformTools(response.data.allPlatformTools)
        }
      } catch {
        localStorage.removeItem(PLATFORM.storageToken)
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }
    restoreSession()
  }, [])

  // ── Login ─────────────────────────────────────
  const login = async (email, password) => {
    const response = await loginUser({ email, password })
    const { token, user, licenceWarning, redirectTo, allPlatformTools: tools } = response.data

    localStorage.setItem(PLATFORM.storageToken,    token)
    localStorage.setItem(PLATFORM.storageRedirect, redirectTo || '/tool-launcher')

    setUser(user)
    if (tools)          setAllPlatformTools(tools)
    if (licenceWarning) setLicenceWarning(licenceWarning)

    return { user, redirectTo: redirectTo || '/tool-launcher' }
  }

  // ── Logout ────────────────────────────────────
  const logout = () => {
    localStorage.removeItem(PLATFORM.storageToken)
    localStorage.removeItem(PLATFORM.storageRedirect)
    setUser(null)
    setLicenceWarning(null)
    setAllPlatformTools([])
  }

  // ── Role check ────────────────────────────────
  const hasRole = (...roles) => {
    if (!user) return false
    return roles.includes(user.role)
  }

  // ── Tool access check ─────────────────────────
  // Reads directly from user.toolAccess[] (DB object) — not JWT token.
  // This means licence changes by admin take effect immediately on
  // next page load without requiring re-login.
  const canAccessTool = (toolCode) => {
    if (!user) return false
    if (user.toolAccess && user.toolAccess.length > 0) {
      const now = new Date()
      return user.toolAccess.some(t =>
        t.toolCode === toolCode &&
        t.isActive !== false &&
        (!t.licenceExpiresAt || new Date(t.licenceExpiresAt) > now)
      )
    }
    if (user.activeTools && user.activeTools.length > 0) {
      return user.activeTools.includes(toolCode)
    }
    // Legacy fallback — default to quotex tool
    return toolCode === QUOTEX_CODE
  }

  // ── Per-tool feature check ────────────────────
  const canAccess = (feature, toolCode = QUOTEX_CODE) => {
    if (!user) return false

    const featureMap = {
      basic: [
        'create_quotation', 'view_own_tracker', 'download_pdf',
        'customer_master', 'part_lookup',
      ],
      pro: [
        'create_quotation', 'view_own_tracker', 'download_pdf',
        'customer_master', 'part_lookup', 'analytics',
        'versioning', 'team_tracker', 'excel_import', 'bulk_upload',
      ],
      enterprise: [
        'create_quotation', 'view_own_tracker', 'download_pdf',
        'customer_master', 'part_lookup', 'analytics',
        'versioning', 'team_tracker', 'excel_import', 'bulk_upload',
        'user_management', 'all_tenant_data', 'approval_workflow',
        'custom_pdf_template', 'custom_excel_template',
      ],
    }

    const getFeatures = (licence) => featureMap[licence] || featureMap['basic']

    // Check toolAccess[] first (per-tool licence)
    const toolEntry = user.toolAccess?.find(
      t => t.toolCode === toolCode && t.isActive
    )

    if (toolEntry) {
      if (toolEntry.licenceExpiresAt && new Date() > new Date(toolEntry.licenceExpiresAt)) {
        return getFeatures('basic').includes(feature)
      }
      return getFeatures(toolEntry.licence).includes(feature)
    }

    // Fallback to top-level legacy licence field
    if (toolCode === QUOTEX_CODE) {
      return getFeatures(user.licence || 'basic').includes(feature)
    }

    return false
  }

  const value = {
    user,
    isLoading,
    licenceWarning,
    allPlatformTools,
    login,
    logout,
    canAccess,
    canAccessTool,
    hasRole,
    isLoggedIn: !!user,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside an AuthProvider')
  return context
}
