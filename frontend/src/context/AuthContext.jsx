// src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authAPI } from '@/lib/api'
import toast from 'react-hot-toast'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  // Rehydrate from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('user')
    if (stored) {
      try { setUser(JSON.parse(stored)) } catch {}
    }
    setLoading(false)
  }, [])

  const login = useCallback(async (email, password) => {
    const { data } = await authAPI.login({ email, password })
    localStorage.setItem('access_token',  data.access_token)
    localStorage.setItem('refresh_token', data.refresh_token)
    const u = { id: data.user_id, role: data.role, full_name: data.full_name, email }
    localStorage.setItem('user', JSON.stringify(u))
    setUser(u)
    return u
  }, [])

  const register = useCallback(async (payload) => {
    const { data } = await authAPI.register(payload)
    return data
  }, [])

  const logout = useCallback(() => {
    localStorage.clear()
    setUser(null)
    toast.success('Logged out')
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
