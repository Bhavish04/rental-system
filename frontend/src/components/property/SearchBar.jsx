// src/components/property/SearchBar.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, SlidersHorizontal, X } from 'lucide-react'

const PROPERTY_TYPES = ['apartment', 'villa', 'studio', 'pg', 'house']

export default function SearchBar({ hero = false, defaultValues = {}, onSearch }) {
  const navigate = useNavigate()
  const [query,    setQuery]    = useState(defaultValues.query || '')
  const [minPrice, setMinPrice] = useState(defaultValues.minPrice || '')
  const [maxPrice, setMaxPrice] = useState(defaultValues.maxPrice || '')
  const [beds,     setBeds]     = useState(defaultValues.bedrooms || '')
  const [type,     setType]     = useState(defaultValues.type || '')
  const [expanded, setExpanded] = useState(false)

  const handleSearch = (e) => {
    e?.preventDefault()
    const params = new URLSearchParams()
    if (query)    params.set('city', query)
    if (minPrice) params.set('min_price', minPrice)
    if (maxPrice) params.set('max_price', maxPrice)
    if (beds)     params.set('bedrooms', beds)
    if (type)     params.set('property_type', type)

    if (onSearch) {
      onSearch(Object.fromEntries(params))
    } else {
      navigate(`/search?${params.toString()}`)
    }
  }

  if (hero) {
    return (
      <form onSubmit={handleSearch} className="w-full max-w-2xl">
        <div className="flex items-center gap-3 bg-card border border-border2 rounded-2xl
                        px-5 py-2.5 shadow-2xl focus-within:border-accent/40 transition-all">
          <Search size={18} className="text-text3 flex-shrink-0" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="City, neighbourhood, or pincode…"
            className="flex-1 bg-transparent outline-none text-text1 text-base placeholder:text-text3"
          />
          <button type="submit" className="btn-primary text-sm px-5 py-2">
            Search
          </button>
        </div>
      </form>
    )
  }

  return (
    <form onSubmit={handleSearch} className="card p-4 space-y-3">
      {/* Main search row */}
      <div className="flex gap-2">
        <div className="flex-1 flex items-center gap-2 bg-bg3 border border-border2 rounded-xl px-4 py-2.5 focus-within:border-accent/40 transition-all">
          <Search size={14} className="text-text3 flex-shrink-0" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="City or neighbourhood…"
            className="flex-1 bg-transparent outline-none text-text1 text-sm placeholder:text-text3"
          />
          {query && <button type="button" onClick={() => setQuery('')}><X size={12} className="text-text3 hover:text-text2" /></button>}
        </div>
        <button type="button" onClick={() => setExpanded(v => !v)}
          className={`p-2.5 rounded-xl border transition-all ${expanded ? 'bg-accent/10 border-accent/30 text-accent' : 'border-border2 text-text2 hover:border-border2 hover:text-text1'}`}>
          <SlidersHorizontal size={16} />
        </button>
        <button type="submit" className="btn-primary px-5">Search</button>
      </div>

      {/* Expanded filters */}
      {expanded && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1 animate-fade-in">
          <div>
            <label className="label">Min Price (₹)</label>
            <input value={minPrice} onChange={e => setMinPrice(e.target.value)}
              placeholder="e.g. 10000" className="input" type="number" />
          </div>
          <div>
            <label className="label">Max Price (₹)</label>
            <input value={maxPrice} onChange={e => setMaxPrice(e.target.value)}
              placeholder="e.g. 50000" className="input" type="number" />
          </div>
          <div>
            <label className="label">Bedrooms</label>
            <select value={beds} onChange={e => setBeds(e.target.value)} className="input">
              <option value="">Any</option>
              {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} BHK</option>)}
            </select>
          </div>
          <div>
            <label className="label">Type</label>
            <select value={type} onChange={e => setType(e.target.value)} className="input">
              <option value="">Any</option>
              {PROPERTY_TYPES.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
            </select>
          </div>
        </div>
      )}
    </form>
  )
}
