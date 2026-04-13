// src/components/layout/Navbar.jsx
import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Home, Search, BarChart2, LayoutDashboard, Shield, Menu, X, LogOut, User } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  const navLinks = [
    { to: '/',        label: 'Home',     icon: Home },
    { to: '/search',  label: 'Search',   icon: Search },
    { to: '/analyser',label: 'Analyser', icon: BarChart2 },
  ]

  const isActive = (to) =>
    to === '/' ? pathname === '/' : pathname.startsWith(to)

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-bg/85 backdrop-blur-xl border-b border-border">
      <div className="max-w-7xl mx-auto px-5 h-16 flex items-center gap-0">

        {/* Logo */}
        <Link to="/" className="font-display text-xl font-bold text-text1 mr-8 flex-shrink-0">
          Rent<span className="text-accent">Smart</span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all
                ${isActive(to)
                  ? 'bg-card text-text1'
                  : 'text-text2 hover:text-text1 hover:bg-card/60'}`}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-3">
          {user ? (
            <>
              {/* Role-based dashboard link */}
              {user.role === 'client' && (
                <Link to="/dashboard" className="btn-ghost hidden md:inline-flex items-center gap-2">
                  <LayoutDashboard size={14} /> Dashboard
                </Link>
              )}
              {user.role === 'owner' && (
                <Link to="/owner" className="btn-ghost hidden md:inline-flex items-center gap-2">
                  <Home size={14} /> My Properties
                </Link>
              )}
              {user.role === 'admin' && (
                <Link to="/admin" className="btn-ghost hidden md:inline-flex items-center gap-2">
                  <Shield size={14} /> Admin
                </Link>
              )}

              {/* User pill */}
              <div className="hidden md:flex items-center gap-2 bg-card border border-border rounded-full pl-3 pr-1 py-1">
                <span className="text-text2 text-sm">{user.full_name.split(' ')[0]}</span>
                <button
                  onClick={logout}
                  className="p-1.5 rounded-full hover:bg-red/10 text-text3 hover:text-red transition-colors"
                  title="Logout"
                >
                  <LogOut size={14} />
                </button>
              </div>
            </>
          ) : (
            <>
              <Link to="/login"    className="btn-ghost hidden md:inline-flex">Log in</Link>
              <Link to="/register" className="btn-primary hidden md:inline-flex">Sign up</Link>
            </>
          )}

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 text-text2 hover:text-text1 transition-colors"
            onClick={() => setMenuOpen(v => !v)}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-border bg-bg2 px-5 py-4 flex flex-col gap-2 animate-fade-in">
          {navLinks.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-text2 hover:bg-card hover:text-text1 transition-colors"
            >
              <Icon size={16} /> {label}
            </Link>
          ))}
          {user ? (
            <>
              <Link to={user.role === 'admin' ? '/admin' : user.role === 'owner' ? '/owner' : '/dashboard'}
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-text2 hover:bg-card hover:text-text1 transition-colors">
                <LayoutDashboard size={16} /> Dashboard
              </Link>
              <button onClick={() => { logout(); setMenuOpen(false) }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-red hover:bg-red/10 transition-colors text-left">
                <LogOut size={16} /> Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login"    onClick={() => setMenuOpen(false)} className="btn-ghost w-full text-center mt-1">Log in</Link>
              <Link to="/register" onClick={() => setMenuOpen(false)} className="btn-primary w-full text-center">Sign up</Link>
            </>
          )}
        </div>
      )}
    </nav>
  )
}
