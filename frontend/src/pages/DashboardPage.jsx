// src/pages/DashboardPage.jsx
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { bookingsAPI, reviewsAPI, dealsAPI } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import {
  Calendar, MapPin, Star, XCircle, Clock,
  CheckCircle, AlertCircle, Home, Heart, Bell
} from 'lucide-react'
import { format } from 'date-fns'

const STATUS_STYLES = {
  confirmed:     'bg-green/10 text-green border-green/30',
  pending:       'bg-accent/10 text-accent border-accent/30',
  cancelled:     'bg-red/10 text-red border-red/30',
  completed:     'bg-blue/10 text-blue border-blue/30',
  auto_declined: 'bg-red/10 text-red border-red/30',
}

const STATUS_ICONS = {
  confirmed:     <CheckCircle size={13} />,
  pending:       <Clock size={13} />,
  cancelled:     <XCircle size={13} />,
  completed:     <CheckCircle size={13} />,
  auto_declined: <AlertCircle size={13} />,
}

export default function DashboardPage() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState('bookings')
  const [reviewModal, setReviewModal] = useState(null)
  const [reviewText, setReviewText] = useState('')
  const [reviewRating, setReviewRating] = useState(5)
  const [myRequests, setMyRequests] = useState([])
  const [payingTxn, setPayingTxn] = useState(null)
  useEffect(() => {
  const token = localStorage.getItem('access_token')
  fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/v1/deals/buyer/requests`, {
    headers: { Authorization: `Bearer ${token}` }
  }).then(r => r.json()).then(d => Array.isArray(d) && setMyRequests(d)).catch(() => {})
}, [])

  const { data: bookingsData, isLoading } = useQuery(
    'my-bookings',
    () => bookingsAPI.myList().then(r => r.data),
    { staleTime: 60_000 }
  )

  const cancelMutation = useMutation(
    ({ id, reason }) => bookingsAPI.cancel(id, { reason }),
    {
      onSuccess: () => {
        toast.success('Booking cancelled')
        qc.invalidateQueries('my-bookings')
      },
      onError: (e) => toast.error(e.response?.data?.detail || 'Cancel failed'),
    }
  )

  const reviewMutation = useMutation(
    (data) => reviewsAPI.create(data),
    {
      onSuccess: () => {
        toast.success('Review submitted!')
        setReviewModal(null)
        setReviewText('')
        setReviewRating(5)
        qc.invalidateQueries('my-bookings')
      },
      onError: () => toast.error('Could not submit review'),
    }
  )
const loadRazorpay = () => new Promise(resolve => {
  if (window.Razorpay) return resolve(true)
  const s = document.createElement('script')
  s.src = 'https://checkout.razorpay.com/v1/checkout.js'
  s.onload = () => resolve(true)
  s.onerror = () => resolve(false)
  document.body.appendChild(s)
})

const handlePayNow = async (txn) => {
  await loadRazorpay()
  const options = {
    key: 'rzp_test_ShIoLRyystW4Nk',
    amount: txn.offer_price * 100,
    currency: 'INR',
    name: 'RentSmart',
    description: `Purchase: ${txn.property_title}`,
    order_id: txn.razorpay_order_id,
    handler: async (response) => {
      try {
        await dealsAPI.verifyPayment(txn.id, {
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
        })
        toast.success('🎉 Payment successful! Contract generated.')
        setMyRequests(prev => prev.map(r =>
          r.id === txn.id ? { ...r, status: 'completed',
            contract_url: `/api/v1/deals/contract/${txn.id}` } : r))
      } catch {
        toast.error('Payment verification failed')
      }
    },
    theme: { color: '#e8a87c' },
  }
  const rzp = new window.Razorpay(options)
  rzp.open()
}
  const bookings = bookingsData || []
  const stats = {
    total: bookings.length,
    confirmed: bookings.filter(b => b.status === 'confirmed').length,
    completed: bookings.filter(b => b.status === 'completed').length,
    spent: bookings
      .filter(b => ['confirmed', 'completed'].includes(b.status))
      .reduce((s, b) => s + b.total_amount, 0),
  }

  const tabs = [
    { id: 'bookings', label: 'My Bookings', icon: <Calendar size={15} /> },
    { id: 'purchases', label: 'My Purchases',  icon: <CheckCircle size={15} /> },
    { id: 'wishlist', label: 'Wishlist',    icon: <Heart size={15} /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell size={15} /> },
  ]

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 pt-20 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent text-xl font-bold font-display">
          {user?.full_name?.[0]?.toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-bold font-display text-text1">
            Welcome back, {user?.full_name?.split(' ')[0]}
          </h1>
          <p className="text-text3 text-sm">{user?.email}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Bookings', value: stats.total,     color: 'text-accent' },
          { label: 'Confirmed',      value: stats.confirmed, color: 'text-green' },
          { label: 'Completed',      value: stats.completed, color: 'text-teal' },
          { label: 'Total Spent',    value: `₹${stats.spent.toLocaleString('en-IN')}`, color: 'text-blue' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <span className="text-text3 text-xs">{s.label}</span>
            <span className={`text-2xl font-bold font-display ${s.color}`}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-border pb-2">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all
              ${activeTab === t.id
                ? 'bg-accent/10 text-accent border border-accent/30'
                : 'text-text3 hover:text-text2'}`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Bookings Tab */}
      {activeTab === 'bookings' && (
        <div className="space-y-4">
          {isLoading && (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="card animate-pulse h-28 bg-card2" />
              ))}
            </div>
          )}

          {!isLoading && bookings.length === 0 && (
            <div className="card text-center py-16">
              <Home size={40} className="mx-auto text-text3 mb-3" />
              <p className="text-text2 font-medium">No bookings yet</p>
              <p className="text-text3 text-sm mb-4">Start exploring properties</p>
              <Link to="/search" className="btn-primary inline-flex">Browse Properties</Link>
            </div>
          )}

          {!isLoading && bookings.map(b => (
            <div key={b.id} className="card flex flex-col sm:flex-row gap-4 animate-fade-in">
              {/* Property thumbnail placeholder */}
              <div className="w-full sm:w-24 h-20 rounded-lg bg-bg3 flex items-center justify-center shrink-0">
                <Home size={24} className="text-text3" />
              </div>

              <div className="flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Link
                      to={`/property/${b.property_id}`}
                      className="font-semibold text-text1 hover:text-accent transition-colors"
                    >
                      View Property →
                    </Link>
                    <div className="flex items-center gap-3 text-text3 text-xs mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar size={11} />
                        {format(new Date(b.check_in), 'dd MMM yyyy')} →{' '}
                        {format(new Date(b.check_out), 'dd MMM yyyy')}
                      </span>
                      <span>· {b.total_nights} nights</span>
                    </div>
                  </div>
                  <span className={`badge-status border text-xs flex items-center gap-1 ${STATUS_STYLES[b.status] || ''}`}>
                    {STATUS_ICONS[b.status]} {b.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="flex items-center justify-between mt-3">
                  <span className="text-accent font-bold font-display text-lg">
                    ₹{b.total_amount.toLocaleString('en-IN')}
                  </span>
                  <div className="flex gap-2">
                    {b.status === 'completed' && (
                      <button
                        onClick={() => setReviewModal(b)}
                        className="btn-ghost text-xs py-1.5 px-3 flex items-center gap-1"
                      >
                        <Star size={12} /> Review
                      </button>
                    )}
                    {['pending', 'confirmed'].includes(b.status) && (
                      <button
                        onClick={() => {
                          if (window.confirm('Cancel this booking?')) {
                            cancelMutation.mutate({ id: b.id, reason: 'Client request' })
                          }
                        }}
                        className="btn-danger text-xs py-1.5 px-3 flex items-center gap-1"
                      >
                        <XCircle size={12} /> Cancel
                      </button>
                    )}
                  </div>
                </div>

                {b.refund_status && (
                  <p className="text-xs text-text3 mt-1">
                    Refund status: <span className="text-accent">{b.refund_status}</span>
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
{/* Purchases Tab */}
{activeTab === 'purchases' && (
  <div className="space-y-4">
    {myRequests.length === 0 && (
      <div className="card text-center py-16">
        <CheckCircle size={40} className="mx-auto text-text3 mb-3" />
        <p className="text-text2 font-medium">No purchase requests yet</p>
        <p className="text-text3 text-sm mb-4">Browse properties and click "Request to Buy"</p>
        <Link to="/search" className="btn-primary inline-flex">Browse Properties</Link>
      </div>
    )}
    {myRequests.map(r => (
      <div key={r.id} className="card flex items-center justify-between gap-4 animate-fade-in">
        <div>
          <p className="text-text1 font-semibold">{r.property_title}</p>
          <p className="text-text2 text-sm mt-0.5">
            Offer: <span className="text-accent font-bold">
              ₹{r.offer_price?.toLocaleString('en-IN')}
            </span>
          </p>
          <span className={`text-xs px-2 py-0.5 rounded-full mt-1.5 inline-block border
            ${r.status === 'requested'       ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
              r.status === 'payment_pending' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
              r.status === 'completed'       ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                               'bg-red-500/10 text-red-400 border-red-500/20'}`}>
            {r.status?.replace('_', ' ')}
          </span>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {r.status === 'payment_pending' && r.razorpay_order_id && (
            <button
              onClick={() => handlePayNow(r)}
              className="btn-primary text-sm px-4 py-2 flex items-center gap-1.5">
              💳 Pay Now
            </button>
          )}
          {r.status === 'completed' && r.contract_url && (
            <a href={`http://localhost:8000${r.contract_url}`}
              target="_blank" rel="noreferrer"
              className="btn-ghost text-sm px-4 py-2">
              📄 Download Contract
            </a>
          )}
          {r.status === 'requested' && (
            <span className="text-text3 text-xs">Waiting for owner...</span>
          )}
          {r.status === 'rejected' && (
            <span className="text-red-400 text-xs">Request rejected</span>
          )}
        </div>
      </div>
    ))}
  </div>
)}
      {/* Wishlist Tab */}
      {activeTab === 'wishlist' && (
        <div className="card text-center py-16">
          <Heart size={40} className="mx-auto text-text3 mb-3" />
          <p className="text-text2 font-medium">Your wishlist is empty</p>
          <p className="text-text3 text-sm mb-4">Save properties you love</p>
          <Link to="/search" className="btn-primary inline-flex">Explore Properties</Link>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="card text-center py-16">
          <Bell size={40} className="mx-auto text-text3 mb-3" />
          <p className="text-text2 font-medium">No notifications</p>
          <p className="text-text3 text-sm">You're all caught up!</p>
        </div>
      )}

      {/* Review Modal */}
      {reviewModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card2 border border-border rounded-2xl p-6 w-full max-w-md animate-slide-up">
            <h3 className="font-display font-bold text-xl text-text1 mb-1">Leave a Review</h3>
            <p className="text-text3 text-sm mb-5">Share your experience with other renters</p>

            {/* Star rating */}
            <div className="flex gap-1 mb-4">
              {[1, 2, 3, 4, 5].map(s => (
                <button
                  key={s}
                  onClick={() => setReviewRating(s)}
                  className={`text-2xl transition-transform hover:scale-110 ${
                    s <= reviewRating ? 'text-accent' : 'text-text3'
                  }`}
                >
                  ★
                </button>
              ))}
              <span className="ml-2 text-text2 text-sm self-center">{reviewRating}/5</span>
            </div>

            <textarea
              value={reviewText}
              onChange={e => setReviewText(e.target.value)}
              placeholder="Tell us about your stay..."
              className="input resize-none h-28 mb-4"
            />

            <div className="flex gap-3">
              <button onClick={() => setReviewModal(null)} className="btn-ghost flex-1">
                Cancel
              </button>
              <button
                onClick={() => reviewMutation.mutate({
                  booking_id: reviewModal.id,
                  rating: reviewRating,
                  body: reviewText,
                })}
                disabled={reviewMutation.isLoading}
                className="btn-primary flex-1"
              >
                {reviewMutation.isLoading ? 'Submitting…' : 'Submit Review'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
