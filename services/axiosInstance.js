import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL 
  || (import.meta.env.PROD ? 'https://smartcareer-api.onrender.com/api' : 'http://localhost:5000/api')

const api = axios.create({
  baseURL: API_URL,
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