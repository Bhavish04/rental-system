// src/pages/BookingPage.jsx
import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from 'react-query'
import { Calendar, CreditCard, Loader2, ChevronLeft } from 'lucide-react'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import toast from 'react-hot-toast'
import { propertiesAPI, bookingsAPI } from '@/lib/api'
import { differenceInDays, addDays } from 'date-fns'

export default function BookingPage() {
  const { propertyId } = useParams()
  const navigate = useNavigate()
  const [checkIn,  setCheckIn]  = useState(addDays(new Date(), 1))
  const [checkOut, setCheckOut] = useState(addDays(new Date(), 31))
  const [loading,  setLoading]  = useState(false)

  const { data: property } = useQuery(
    ['property', propertyId],
    () => propertiesAPI.getById(propertyId).then(r => r.data)
  )

  const nights = differenceInDays(checkOut, checkIn)
  const dailyRate = property ? property.price_per_month / 30 : 0
  const total = Math.round(dailyRate * nights)

  const handleBook = async () => {
    if (nights <= 0) { toast.error('Check-out must be after check-in'); return }
    setLoading(true)
    try {
      const { data } = await bookingsAPI.create({
        property_id: propertyId,
        check_in: checkIn.toISOString(),
        check_out: checkOut.toISOString(),
        gateway: 'razorpay',
      })

      // Open Razorpay checkout
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: total * 100,
        currency: 'INR',
        name: 'RentSmart',
        description: property?.title,
        order_id: data.gateway_order_id,
        handler: () => {
          toast.success('Booking confirmed! 🎉')
          navigate('/dashboard')
        },
        prefill: { name: '', email: '', contact: '' },
        theme: { color: '#e8a87c' },
      }
      const rzp = new window.Razorpay(options)
      rzp.open()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Booking failed')
    } finally {
      setLoading(false)
    }
  }

  if (!property) return (
    <div className="pt-32 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="pt-20 pb-16 px-5 max-w-3xl mx-auto">
      <button onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-text2 text-sm hover:text-text1 mb-6 transition-colors">
        <ChevronLeft size={16} /> Back
      </button>

      <h1 className="font-display text-2xl font-bold text-text1 mb-2">Complete Your Booking</h1>
      <p className="text-text2 text-sm mb-8">{property.title} · {property.city}</p>

      <div className="grid md:grid-cols-2 gap-6">

        {/* Date selection */}
        <div className="card space-y-5">
          <h2 className="text-text1 font-semibold flex items-center gap-2">
            <Calendar size={16} className="text-accent" /> Select Dates
          </h2>
          <div>
            <label className="label">Check-in</label>
            <DatePicker
              selected={checkIn}
              onChange={d => setCheckIn(d)}
              minDate={addDays(new Date(), 1)}
              className="input w-full"
              dateFormat="dd MMM yyyy"
            />
          </div>
          <div>
            <label className="label">Check-out</label>
            <DatePicker
              selected={checkOut}
              onChange={d => setCheckOut(d)}
              minDate={addDays(checkIn, 1)}
              className="input w-full"
              dateFormat="dd MMM yyyy"
            />
          </div>
          {nights > 0 && (
            <div className="bg-accent/5 border border-accent/20 rounded-xl px-4 py-3 text-sm">
              <span className="text-text2">Duration: </span>
              <span className="text-text1 font-semibold">{nights} nights</span>
            </div>
          )}
        </div>

        {/* Price breakdown */}
        <div className="card space-y-4">
          <h2 className="text-text1 font-semibold flex items-center gap-2">
            <CreditCard size={16} className="text-accent" /> Price Breakdown
          </h2>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between text-text2">
              <span>₹{Math.round(dailyRate).toLocaleString('en-IN')}/night × {nights} nights</span>
              <span className="text-text1">₹{total.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-text2">
              <span>Platform fee</span>
              <span className="text-green">Free</span>
            </div>
            <div className="divider" />
            <div className="flex justify-between text-text1 font-bold text-base">
              <span>Total</span>
              <span className="text-accent font-display">₹{total.toLocaleString('en-IN')}</span>
            </div>
          </div>

          <button onClick={handleBook} disabled={loading || nights <= 0}
            className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-sm">
            {loading && <Loader2 size={16} className="animate-spin" />}
            {loading ? 'Processing…' : `Pay ₹${total.toLocaleString('en-IN')} →`}
          </button>

          <p className="text-text3 text-xs text-center">
            Secure payment via Razorpay · UPI · Cards · Net Banking
          </p>
        </div>
      </div>
    </div>
  )
}
