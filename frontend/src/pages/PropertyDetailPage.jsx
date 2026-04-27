// src/pages/PropertyDetailPage.jsx
import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery } from 'react-query'
import { MapPin, Bed, Bath, Star, CheckCircle, Heart, Share2, ChevronLeft, Wifi,
         Car, Dumbbell, Shield, Zap, Droplets, Wind } from 'lucide-react'
import { propertiesAPI, dealsAPI } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'

const AMENITY_ICONS = {
  wifi: Wifi, parking: Car, gym: Dumbbell, security: Shield,
  power_backup: Zap, water_purifier: Droplets, air_conditioning: Wind,
}

function AmenityTag({ name }) {
  const Icon = AMENITY_ICONS[name] || CheckCircle
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-bg3 border border-border rounded-xl text-xs text-text2">
      <Icon size={12} className="text-accent" />
      <span className="capitalize">{name.replace(/_/g, ' ')}</span>
    </div>
  )
}

export default function PropertyDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [activePhoto, setActivePhoto] = useState(0)
  const [interested, setInterested] = useState(false)
  const [interestLoading, setInterestLoading] = useState(false)
  const [showBuyModal, setShowBuyModal] = useState(false)
  const [offerPrice, setOfferPrice] = useState('')
  const [buyLoading, setBuyLoading] = useState(false)
  const [buySuccess, setBuySuccess] = useState(null)

  const { data: property, isLoading } = useQuery(
    ['property', id],
    () => propertiesAPI.getById(id).then(r => r.data)
  )

  const handleInterest = async () => {
    setInterestLoading(true)
    try {
      await dealsAPI.markInterest(id)
      setInterested(true)
    } catch (e) {
      if (e.response?.status === 400) setInterested(true)
      else alert('Failed to mark interest')
    } finally { setInterestLoading(false) }
  }

  const handleBuyRequest = async () => {
    if (!offerPrice) return
    setBuyLoading(true)
    try {
      const { data } = await dealsAPI.requestToBuy(id, { offer_price: parseFloat(offerPrice) })
      setBuySuccess(data)
      setShowBuyModal(false)
    } catch (e) {
      alert(e.response?.data?.detail || 'Failed to send request')
    } finally { setBuyLoading(false) }
  }

  if (isLoading) return (
    <div className="pt-20 max-w-6xl mx-auto px-5 animate-pulse">
      <div className="h-96 bg-card rounded-2xl mb-6" />
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="h-8 bg-card rounded w-2/3" />
          <div className="h-4 bg-card rounded w-1/2" />
        </div>
        <div className="h-64 bg-card rounded-2xl" />
      </div>
    </div>
  )

  if (!property) return (
    <div className="pt-32 text-center">
      <p className="text-text1 text-lg">Property not found</p>
      <Link to="/search" className="btn-primary mt-4 inline-flex">Back to Search</Link>
    </div>
  )

  const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
  const photos = property.photos?.length
    ? property.photos.map(p => p.url.startsWith('http') ? p.url : `${BASE_URL}${p.url}`)
    : [`https://source.unsplash.com/800x500/?apartment&sig=${id}`]

  return (
    <>
      <div className="pt-20 pb-16">
        <div className="max-w-6xl mx-auto px-5">

          {/* Back */}
          <button onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-text2 text-sm hover:text-text1 mb-5 transition-colors">
            <ChevronLeft size={16} /> Back
          </button>

          {/* Photo gallery */}
          <div className="mb-8 rounded-2xl overflow-hidden">
            <div className="relative h-80 md:h-96 bg-bg3">
              <img src={photos[activePhoto]} alt={property.title}
                className="w-full h-full object-cover object-center"
                onError={e => e.target.src = 'https://placehold.co/800x400/1e1f28/5c5c72?text=RentSmart'} />
              {property.fair_price_badge && (
                <div className="absolute top-4 left-4 badge-fair text-sm px-3 py-1.5">
                  <CheckCircle size={13} /> Fair Price Verified
                </div>
              )}
            </div>
            {photos.length > 1 && (
              <div className="flex gap-2 p-3 bg-bg2 overflow-x-auto">
                {photos.map((ph, i) => (
                  <img key={i} src={ph} onClick={() => setActivePhoto(i)}
                    alt="" className={`h-16 w-24 object-cover object-center rounded-lg flex-shrink-0 cursor-pointer transition-all
                      ${activePhoto === i ? 'ring-2 ring-accent opacity-100' : 'opacity-60 hover:opacity-100'}`} />
                ))}
              </div>
            )}
          </div>

          <div className="grid lg:grid-cols-3 gap-8">

            {/* Left: details */}
            <div className="lg:col-span-2 space-y-7">

              {/* Title & meta */}
              <div>
                <div className="flex items-start justify-between gap-4 mb-3">
                  <h1 className="font-display text-2xl md:text-3xl font-bold text-text1 leading-tight">
                    {property.title}
                  </h1>
                  <div className="flex gap-2 flex-shrink-0">
                    <button className="p-2 rounded-xl bg-card border border-border text-text2 hover:text-text1 transition-colors">
                      <Heart size={16} />
                    </button>
                    <button className="p-2 rounded-xl bg-card border border-border text-text2 hover:text-text1 transition-colors">
                      <Share2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-text2 text-sm mb-4">
                  <MapPin size={14} className="text-accent" />
                  {property.address}, {property.city}
                </div>

                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <span className="flex items-center gap-1.5 text-text2">
                    <Bed size={15} className="text-accent" /> {property.bedrooms} Bedrooms
                  </span>
                  <span className="flex items-center gap-1.5 text-text2">
                    <Bath size={15} className="text-accent" /> {property.bathrooms} Bathrooms
                  </span>
                  {property.area_sqft && (
                    <span className="text-text2">{property.area_sqft.toLocaleString()} sqft</span>
                  )}
                  {property.floor && (
                    <span className="text-text2">Floor {property.floor}</span>
                  )}
                  {property.avg_rating > 0 && (
                    <span className="flex items-center gap-1">
                      <Star size={13} fill="#e8a87c" color="#e8a87c" />
                      <span className="text-accent font-medium">{property.avg_rating.toFixed(1)}</span>
                      <span className="text-text3">({property.total_reviews} reviews)</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Description */}
              {property.description && (
                <div>
                  <h3 className="text-text1 font-semibold mb-2">About this property</h3>
                  <p className="text-text2 text-sm leading-relaxed">{property.description}</p>
                </div>
              )}

              {/* Amenities */}
              {property.amenities?.length > 0 && (
                <div>
                  <h3 className="text-text1 font-semibold mb-3">Amenities</h3>
                  <div className="flex flex-wrap gap-2">
                    {property.amenities.map(a => <AmenityTag key={a} name={a} />)}
                  </div>
                </div>
              )}

              {/* AI Price insight */}
              {property.suggested_price && (
                <div className="card bg-teal/5 border-teal/20">
                  <p className="text-teal text-xs font-medium mb-1 uppercase tracking-wide">AI Price Analysis</p>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-text1 font-semibold">
                        Market median: ₹{property.suggested_price.toLocaleString('en-IN')}/month
                      </p>
                      <p className="text-text2 text-xs mt-0.5">
                        {property.fair_price_badge
                          ? '✅ This listing is priced at or below market'
                          : 'Priced above area median'}
                      </p>
                    </div>
                    <Link to={`/analyser?property=${property.id}`}
                      className="text-teal text-xs hover:underline flex-shrink-0">
                      Full analysis →
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Right: booking sidebar */}
            <div className="lg:sticky lg:top-24 h-fit">
              <div className="card space-y-4">
                <div>
                  <span className="font-display text-3xl font-bold text-accent">
                    ₹{property.price_per_month?.toLocaleString('en-IN')}
                  </span>
                  <span className="text-text3 text-sm">/month</span>
                </div>

                {property.fair_price_badge && (
                  <div className="badge-fair w-fit">
                    <CheckCircle size={12} /> Fair Price Verified
                  </div>
                )}

                <div className="divider my-2" />

                {user?.role === 'client' ? (
                  <div className="space-y-2">
                    {/* Interested button */}
                    <button onClick={handleInterest} disabled={interested || interestLoading}
                      className={`w-full py-3 rounded-xl text-sm font-medium transition
                        ${interested
                          ? 'bg-green-500/20 text-green-400 cursor-default border border-green-500/30'
                          : 'bg-bg3 border border-border text-text1 hover:border-accent hover:text-accent'}`}>
                      {interestLoading ? 'Saving...' : interested ? '✓ Interested' : "♡  I'm Interested"}
                    </button>

                    {/* Buy request button */}
                    {buySuccess ? (
                      <div className="bg-teal/10 border border-teal/20 rounded-xl p-3 text-center">
                        <p className="text-teal text-sm font-medium">✓ Request Sent!</p>
                        <p className="text-text3 text-xs mt-1">Waiting for owner approval</p>
                      </div>
                    ) : (
                      <button onClick={() => setShowBuyModal(true)}
                        className="btn-primary w-full text-sm py-3">
                        Request to Buy →
                      </button>
                    )}

                    <Link to={`/booking/${property.id}`}
                      className="btn-ghost w-full text-center block text-sm py-2">
                      Book / Rent instead
                    </Link>
                  </div>
                ) : user?.role === 'owner' || user?.role === 'admin' ? (
                  <p className="text-text3 text-sm text-center">Booking available for clients</p>
                ) : (
                  <div className="space-y-2">
                    <Link to="/register" className="btn-primary w-full text-center block text-sm py-3">
                      Sign up to Book
                    </Link>
                    <Link to="/login" className="btn-ghost w-full text-center block text-sm">
                      Log in
                    </Link>
                  </div>
                )}

                <div className="text-xs text-text3 text-center">No booking fee · Secure payment</div>

                {/* Mini stats */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="bg-bg3 rounded-xl p-3 text-center">
                    <p className="text-text1 font-bold text-lg">{property.bedrooms}</p>
                    <p className="text-text3 text-xs">Bedrooms</p>
                  </div>
                  <div className="bg-bg3 rounded-xl p-3 text-center">
                    <p className="text-text1 font-bold text-lg">{property.bathrooms}</p>
                    <p className="text-text3 text-xs">Bathrooms</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Buy Request Modal */}
      {showBuyModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-bg2 border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-text1 font-display text-xl font-bold mb-1">Request to Buy</h2>
            <p className="text-text2 text-sm mb-5">{property.title}</p>

            <label className="block text-text2 text-sm font-medium mb-1">
              Your Offer Price (₹)
            </label>
            <input
              type="number"
              value={offerPrice}
              onChange={e => setOfferPrice(e.target.value)}
              placeholder={property.price_per_month?.toString()}
              className="w-full bg-bg3 border border-border rounded-xl px-4 py-2.5 text-text1 text-sm mb-5 focus:outline-none focus:border-accent"
            />

            <div className="flex gap-3">
              <button onClick={() => setShowBuyModal(false)}
                className="flex-1 btn-ghost py-2.5 text-sm">
                Cancel
              </button>
              <button onClick={handleBuyRequest} disabled={buyLoading || !offerPrice}
                className="flex-1 btn-primary py-2.5 text-sm disabled:opacity-50">
                {buyLoading ? 'Sending...' : 'Send Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
