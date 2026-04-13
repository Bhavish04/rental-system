// src/pages/NotFoundPage.jsx
import { Link } from 'react-router-dom'
import { Home } from 'lucide-react'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
      <p className="text-8xl font-display font-bold text-accent/20 mb-4">404</p>
      <h1 className="text-2xl font-display font-bold text-text1 mb-2">Page not found</h1>
      <p className="text-text3 text-sm mb-6">The page you're looking for doesn't exist.</p>
      <Link to="/" className="btn-primary flex items-center gap-2">
        <Home size={15} /> Back to Home
      </Link>
    </div>
  )
}
