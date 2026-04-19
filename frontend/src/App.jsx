// src/App.jsx
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import Navbar from '@/components/layout/Navbar'
import ChatWidget from '@/components/chat/ChatWidget'
import HomePage from '@/pages/HomePage'
import SearchPage from '@/pages/SearchPage'
import PropertyDetailPage from '@/pages/PropertyDetailPage'
import BookingPage from '@/pages/BookingPage'
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'
import DashboardPage from '@/pages/DashboardPage'
import OwnerDashboardPage from '@/pages/OwnerDashboardPage'
import CreateListingPage from '@/pages/CreateListingPage'
import AdminPage from '@/pages/AdminPage'
import AnalyserPage from '@/pages/AnalyserPage'
import NotFoundPage from '@/pages/NotFoundPage'

function PrivateRoute({ children, roles }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen bg-bg flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
  </div>
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role?.toLowerCase())) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <div className="min-h-screen bg-bg font-body">
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/property/:id" element={<PropertyDetailPage />} />
        <Route path="/analyser" element={<AnalyserPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/dashboard" element={
          <PrivateRoute roles={['client']}>
            <DashboardPage />
          </PrivateRoute>
        } />
        <Route path="/booking/:propertyId" element={
          <PrivateRoute roles={['client']}>
            <BookingPage />
          </PrivateRoute>
        } />
        <Route path="/owner" element={
          <PrivateRoute roles={['owner']}>
            <OwnerDashboardPage />
          </PrivateRoute>
        } />
        <Route path="/owner/new-listing" element={
          <PrivateRoute roles={['owner']}>
            <CreateListingPage />
          </PrivateRoute>
        } />
        <Route path="/admin" element={
          <PrivateRoute roles={['admin']}>
            <AdminPage />
          </PrivateRoute>
        } />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <ChatWidget />
    </div>
  )
}