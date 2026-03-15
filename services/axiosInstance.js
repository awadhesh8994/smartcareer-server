import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

// ── Request interceptor: attach JWT token ─────────────────────────
api.interceptors.request.use(
  (config) => {
    try {
      const stored = localStorage.getItem('career-auth')
      if (stored) {
        const { state } = JSON.parse(stored)
        if (state?.token) config.headers.Authorization = `Bearer ${state.token}`
      }
    } catch {}
    return config
  },
  (error) => Promise.reject(error)
)

// ── Response interceptor: handle 401 ─────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('career-auth')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api