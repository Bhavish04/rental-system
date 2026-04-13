// src/pages/LoginPage.jsx
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate   = useNavigate()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [show,     setShow]     = useState(false)
  const [loading,  setLoading]  = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const user = await login(email, password)
      toast.success(`Welcome back, ${user.full_name.split(' ')[0]}!`)
      navigate(user.role === 'admin' ? '/admin' : user.role === 'owner' ? '/owner' : '/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="pt-20 min-h-screen flex items-center justify-center px-5">
      <div className="w-full max-w-sm animate-slide-up">

        <div className="text-center mb-8">
          <p className="font-display text-2xl font-bold text-text1 mb-1">
            Welcome back to <span className="text-accent">RentSmart</span>
          </p>
          <p className="text-text2 text-sm">Sign in to your account</p>
        </div>

        <div className="card space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input value={email} onChange={e => setEmail(e.target.value)}
                type="email" required placeholder="you@example.com" className="input" />
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input value={password} onChange={e => setPassword(e.target.value)}
                  type={show ? 'text' : 'password'} required placeholder="••••••••"
                  className="input pr-11" />
                <button type="button" onClick={() => setShow(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text3 hover:text-text2">
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="btn-primary w-full py-3 flex items-center justify-center gap-2">
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-text3 text-xs">
            Don't have an account?{' '}
            <Link to="/register" className="text-accent hover:underline">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
