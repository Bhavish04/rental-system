// src/lib/api.js — Axios instance + all API functions

import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const api = axios.create({
  baseURL: `${BASE}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT token automatically
api.interceptors.request.use(config => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Auto-refresh on 401
api.interceptors.response.use(
  res => res,
  async err => {
    const orig = err.config
    if (err.response?.status === 401 && !orig._retry) {
      orig._retry = true
      try {
        const rt = localStorage.getItem('refresh_token')
        const { data } = await axios.post(`${BASE}/api/v1/auth/refresh`, { refresh_token: rt })
        localStorage.setItem('access_token', data.access_token)
        localStorage.setItem('refresh_token', data.refresh_token)
        orig.headers.Authorization = `Bearer ${data.access_token}`
        return api(orig)
      } catch {
        localStorage.clear()
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)

// ── Auth ──────────────────────────────────────────────────────────────────
export const authAPI = {
  register:   (data) => api.post('/auth/register', data),
  login:      (data) => api.post('/auth/login', data),
  verifyOtp:  (data) => api.post('/auth/verify-otp', data),
  refresh:    (data) => api.post('/auth/refresh', data),
}

// ── Properties ────────────────────────────────────────────────────────────
export const propertiesAPI = {
  search:     (params) => api.get('/properties/search', { params }),
  getById:    (id)     => api.get(`/properties/${id}`),
  create:     (data)   => api.post('/properties/', data),
  update:     (id, d)  => api.patch(`/properties/${id}`, d),
  myListings: ()       => api.get('/properties/owner/my'),
}

// ── Bookings ──────────────────────────────────────────────────────────────
export const bookingsAPI = {
  create:  (data)  => api.post('/bookings/', data),
  myList:  ()      => api.get('/bookings/my'),
  cancel:  (id, d) => api.post(`/bookings/${id}/cancel`, d),
}

// ── Reviews ───────────────────────────────────────────────────────────────
export const reviewsAPI = {
  create: (data)       => api.post('/reviews/', data),
  reply:  (id, reply)  => api.patch(`/reviews/${id}/reply`, { reply }),
}

// ── AI ────────────────────────────────────────────────────────────────────
export const aiAPI = {
  chat:         (data)   => api.post('/ai/chat', data),
  predictRent:  (data)   => api.post('/ai/predict-rent', data),
  trend:        (params) => api.get('/ai/trend', { params }),
  comparables:  (id)     => api.get(`/ai/comparables/${id}`),
}

// ── Admin ─────────────────────────────────────────────────────────────────
export const adminAPI = {
  reports:     (params)   => api.get('/admin/reports', { params }),
  leaderboard: (params)   => api.get('/admin/leaderboard', { params }),
  moderate:    (id)       => api.post(`/admin/moderate/${id}`),
  approve:     (id)       => api.post(`/admin/approve/${id}`),
  reject:      (id, data) => api.post(`/admin/reject/${id}`, data),
  pendingProperties: () => api.get('/admin/properties/pending'),
  users:       (page)     => api.get('/admin/users', { params: { page } }),
  suspend:     (id)       => api.post(`/admin/users/${id}/suspend`),
  unsuspend:   (id)       => api.post(`/admin/users/${id}/unsuspend`),
}
