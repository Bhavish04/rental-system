// src/components/property/PropertyCard.jsx
import { Link } from 'react-router-dom'
import { MapPin, Bed, Bath, Star, Heart, CheckCircle } from 'lucide-react'
import { useState } from 'react'

export default function PropertyCard({ property, compact = false }) {
  const [wishlisted, setWishlisted] = useState(false)

  const photo = property.photos?.[0]?.url ||
    `https://source.unsplash.com/400x260/?apartment,interior&sig=${property.id}`

  return (
    <div className="card group hover:border-border2 transition-all hover:-translate-y-0.5 hover:shadow-2xl p-0 overflow-hidden">
      {/* Photo */}
      <div className="relative overflow-hidden">
        <img
          src={photo}
          alt={property.title}
          className={`w-full object-cover transition-transform group-hover:scale-105 ${compact ? 'h-40' : 'h-52'}`}
          onError={e => { e.target.src = `https://placehold.co/400x260/1e1f28/5c5c72?text=RentSmart` }}
        />

        {/* Wishlist */}
        <button
          onClick={() => setWishlisted(v => !v)}
          className="absolute top-3 right-3 p-2 rounded-full bg-bg/70 backdrop-blur-sm transition-all hover:bg-bg"
        >
          <Heart size={14} fill={wishlisted ? '#e07070' : 'none'} color={wishlisted ? '#e07070' : '#9a9aae'} />
        </button>

        {/* Fair price badge */}
        {property.fair_price_badge && (
          <div className="absolute top-3 left-3 badge-fair">
            <CheckCircle size={10} /> Fair Price
          </div>
        )}

        {/* Property type pill */}
        <div className="absolute bottom-3 left-3 px-2.5 py-0.5 rounded-full bg-bg/80 backdrop-blur-sm text-text2 text-xs capitalize">
          {property.property_type}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-text1 font-semibold text-sm leading-tight line-clamp-1">
            {property.title}
          </h3>
          {property.avg_rating > 0 && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <Star size={11} fill="#e8a87c" color="#e8a87c" />
              <span className="text-accent text-xs font-medium">{property.avg_rating.toFixed(1)}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 text-text3 text-xs mb-3">
          <MapPin size={11} />
          <span>{property.neighbourhood || property.city}, {property.city}</span>
        </div>

        <div className="flex items-center gap-3 text-text2 text-xs mb-4">
          <span className="flex items-center gap-1"><Bed size={11} /> {property.bedrooms} Bed</span>
          <span className="flex items-center gap-1"><Bath size={11} /> {property.bathrooms} Bath</span>
          {property.area_sqft && <span>{property.area_sqft.toLocaleString()} sqft</span>}
        </div>

        <div className="flex items-center justify-between">
          <div>
            <span className="text-accent font-bold text-lg font-mono">
              ₹{property.price_per_month?.toLocaleString('en-IN')}
            </span>
            <span className="text-text3 text-xs">/month</span>
          </div>
          <Link
            to={`/property/${property.id}`}
            className="px-4 py-1.5 rounded-full bg-accent/10 border border-accent/30 text-accent text-xs font-medium
                       hover:bg-accent hover:text-bg transition-all"
          >
            View →
          </Link>
        </div>
      </div>
    </div>
  )
}
