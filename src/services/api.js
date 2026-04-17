// api.js — SourceHUB API client.
// All axios calls in one place. Token auto-attached. 401 → logout.
// Route structure:
//   /api/auth/*                  platform auth
//   /api/admin/*                 platform admin
//   /api/customers/*             platform shared (all tools)
//   /api/parts/*                 platform shared (all tools)
//   /api/quotex/quotations/*     QuoteX tool
//   /api/quotex/pdf/*            QuoteX tool
//   /api/quotex/analytics/*      QuoteX tool

import axios from 'axios'
import { PLATFORM } from '../config/platform'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

const api = axios.create({ baseURL: BASE_URL })

// ── Request Interceptor ───────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(PLATFORM.storageToken)
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  },
  (error) => Promise.reject(error)
)

// ── Response Interceptor ──────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(PLATFORM.storageToken)
      window.location.href = '/'
    }
    return Promise.reject(error)
  }
)

// ── Auth ──────────────────────────────────────
export const loginUser    = (data) => api.post('/api/auth/login', data)
export const registerUser = (data) => api.post('/api/auth/register', data)
export const getMe        = ()     => api.get('/api/auth/me')
export const forgotPassword = (data) => api.post('/api/auth/forgot-password', data)
export const changePassword = (data) => api.post('/api/auth/change-password', data)

// ── Parts — platform shared ───────────────────
export const importParts           = (formData)   => api.post('/api/parts/import', formData)
export const lookupPart            = (partNumber) => api.get(`/api/parts/${partNumber}`)
export const searchParts           = (query)      => api.get(`/api/parts/search?q=${query}`)
export const bulkUploadParts    = (formData)   => api.post('/api/parts/bulk-upload', formData)

export const getTenantPartsTemplate = (options = {}) => {
  if (options.headersOnly) {
    return api.get('/api/parts/tenant-template?headersOnly=true')
  }
  return api.get('/api/parts/tenant-template', { responseType: 'blob' })
}

// ── Customers — platform shared ───────────────
export const saveCustomer    = (data)  => api.post('/api/customers', data)
export const searchCustomers = (query) => api.get(`/api/customers/search?q=${query}`)
export const getAllCustomers  = ()     => api.get('/api/customers')

// ── QuoteX — Quotations ───────────────────────
export const createQuotation        = (data)     => api.post('/api/quotex/quotations', data)
export const getAllQuotations        = ()         => api.get('/api/quotex/quotations')
export const getQuotationById       = (id)       => api.get(`/api/quotex/quotations/${id}`)
export const getTrackerQuotations   = ()         => api.get('/api/quotex/quotations/tracker')
export const updateQuotationStatus  = (id, data) => api.patch(`/api/quotex/quotations/${id}/status`, data)
export const createQuotationVersion = (id, data) => api.post(`/api/quotex/quotations/${id}/version`, data)


// ── QuoteX — PDF ──────────────────────────────
export const downloadPdf = (id) =>
  api.get(`/api/quotex/pdf/${id}`, { responseType: 'blob' })

// ── QuoteX — Analytics ────────────────────────
export const getAnalytics = (params) =>
  api.get('/api/quotex/analytics', { params })

// ── Admin — platform ──────────────────────────
export const getAvailableTools       = ()         => api.get('/api/admin/tools')
export const getAdminStats           = ()         => api.get('/api/admin/stats')
export const getAllTenants            = ()         => api.get('/api/admin/tenants')
export const getTenant               = (id)       => api.get(`/api/admin/tenants/${id}`)
export const createTenant            = (data)     => api.post('/api/admin/tenants', data)
export const updateTenant            = (id, data) => api.put(`/api/admin/tenants/${id}`, data)
export const toggleTenant            = (id)       => api.patch(`/api/admin/tenants/${id}/toggle`)
export const uploadExcelTemplate     = (id, data) => api.post(`/api/admin/tenants/${id}/excel-template`, data)
export const uploadWordTemplate       = (id, data) => api.post(`/api/admin/tenants/${id}/word-template`, data)
export const downloadExcelTemplate   = (id)       => api.get(`/api/admin/tenants/${id}/excel-template`, { responseType: 'blob' })
export const downloadWordTemplate = (id)      => api.get(`/api/admin/tenants/${id}/word-template`, { responseType: 'blob' })
export const uploadTenantLogo        = (id, data) => api.post(`/api/admin/tenants/${id}/logo`, data)
export const createAdminUser         = (data)     => api.post('/api/admin/users', data)
export const getAdminUser            = (id)       => api.get(`/api/admin/users/${id}`)
export const updateAdminUser         = (id, data) => api.put(`/api/admin/users/${id}`, data)
export const resetUserPassword       = (id, data) => api.patch(`/api/admin/users/${id}/password`, data)
export const toggleAdminUser         = (id)       => api.patch(`/api/admin/users/${id}/toggle`)

// ── Platform Tools ────────────────────────────
export const getPlatformTools    = ()         => api.get('/api/admin/tools')
export const getAllPlatformTools  = ()         => api.get('/api/admin/tools')
export const createPlatformTool  = (data)     => api.post('/api/admin/tools', data)
export const updatePlatformTool  = (id, data) => api.put(`/api/admin/tools/${id}`, data)
export const uploadToolIcon      = (id, data) => api.post(`/api/admin/tools/${id}/icon`, data)
export const deletePlatformTool  = (id)       => api.delete(`/api/admin/tools/${id}`)
