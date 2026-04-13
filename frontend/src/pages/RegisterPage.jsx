// src/pages/RegisterPage.jsx
import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { authAPI } from '@/lib/api'

export default function RegisterPage() {
  const { login }       = useAuth()
  const navigate        = useNavigate()
  const [sp]            = useSearchParams()
  const [step,  setStep]  = useState('register')   // register | otp
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    full_name: '', email: '', password: '', phone: '',
    role: sp.get('role') || 'client',
  })
  const [otp, setOtp] = useState('')

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleRegister = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await authAPI.register(form)
      toast.success('Account created! Check your email for OTP.')
      setStep('otp')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const handleOTP = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await authAPI.verifyOtp({ email: form.email, otp })
      toast.success('Email verified!')
      // Auto-login
      const user = await login(form.email, form.password)
      navigate(user.role === 'owner' ? '/owner' : '/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Invalid OTP')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="pt-20 min-h-screen flex items-center justify-center px-5">
      <div className="w-full max-w-sm animate-slide-up">

        <div className="text-center mb-8">
          <p className="font-display text-2xl font-bold text-text1 mb-1">
            Join <span className="text-accent">RentSmart</span>
          </p>
          <p className="text-text2 text-sm">
            {step === 'register' ? 'Create your account' : 'Enter the OTP sent to your email'}
          </p>
        </div>

        <div className="card">
          {step === 'register' ? (
            <form onSubmit={handleRegister} className="space-y-4">
              {/* Role toggle */}
              <div className="flex rounded-xl bg-bg3 p-1 gap-1">
                {['client', 'owner'].map(r => (
                  <button key={r} type="button"
                    onClick={() => setForm(f => ({ ...f, role: r }))}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all capitalize
                      ${form.role === r ? 'bg-accent text-bg' : 'text-text2 hover:text-text1'}`}>
                    {r === 'client' ? '🏠 Renter' : '🏢 Property Owner'}
                  </button>
                ))}
              </div>

              <div>
                <label className="label">Full Name</label>
                <input value={form.full_name} onChange={set('full_name')}
                  required placeholder="Aditya Nair" className="input" />
              </div>
              <div>
                <label className="label">Email</label>
                <input value={form.email} onChange={set('email')}
                  type="email" required placeholder="you@example.com" className="input" />
              </div>
              <div>
                <label className="label">Password</label>
                <input value={form.password} onChange={set('password')}
                  type="password" required minLength={8} placeholder="Min 8 characters" className="input" />
              </div>
              <div>
                <label className="label">Phone (optional)</label>
                <input value={form.phone} onChange={set('phone')}
                  placeholder="+91 98765 43210" className="input" />
              </div>

              <button type="submit" disabled={loading}
                className="btn-primary w-full py-3 flex items-center justify-center gap-2">
                {loading && <Loader2 size={16} className="animate-spin" />}
                {loading ? 'Creating account…' : 'Create Account'}
              </button>

              <p className="text-center text-text3 text-xs">
                Already have an account?{' '}
                <Link to="/login" className="text-accent hover:underline">Sign in</Link>
              </p>
            </form>
          ) : (
            <form onSubmit={handleOTP} className="space-y-4">
              <p className="text-text2 text-sm text-center">
                We sent a 6-digit OTP to <span className="text-text1">{form.email}</span>
              </p>
              <input value={otp} onChange={e => setOtp(e.target.value)}
                required maxLength={6} placeholder="Enter 6-digit OTP"
                className="input text-center text-2xl tracking-widest font-mono" />
              <button type="submit" disabled={loading || otp.length < 6}
                className="btn-primary w-full py-3 flex items-center justify-center gap-2">
                {loading && <Loader2 size={16} className="animate-spin" />}
                {loading ? 'Verifying…' : 'Verify & Continue'}
              </button>
              <button type="button" onClick={() => setStep('register')}
                className="text-text3 text-xs w-full text-center hover:text-text2">
                ← Back
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
