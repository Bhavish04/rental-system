// src/pages/OwnerDashboardPage.jsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { Link, useLocation } from 'react-router-dom'
import toast from 'react-hot-toast'
import { propertiesAPI, aiAPI } from '@/lib/api'
import {
  Home, Plus, TrendingUp, Star, Calendar,
  CheckCircle, Clock, XCircle, BarChart2, Edit, Zap
} from 'lucide-react'

const STATUS_BADGE = {
  active:         'bg-green/10 text-green border-green/30',
  pending_review: 'bg-accent/10 text-accent border-accent/30',
  draft:          'bg-text3/10 text-text3 border-text3/20',
  rejected:       'bg-red/10 text-red border-red/30',
  inactive:       'bg-text3/10 text-text3 border-text3/20',
}

export default function OwnerDashboardPage() {
  const qc = useQueryClient()
  const location = useLocation()
  const [activeTab, setActiveTab] = useState(location.pathname === '/owner/new-listing' ? 'listings' : 'listings')
  const [analyserOpen, setAnalyserOpen] = useState(false)
  const [analyserResult, setAnalyserResult] = useState(null)
  const [analyserLoading, setAnalyserLoading] = useState(false)
  const [form, setForm] = useState({
    city: '', neighbourhood: '', property_type: 'apartment',
    bedrooms: 2, bathrooms: 1, area_sqft: '', floor: '',
    building_age_years: '', amenities: [],
  })

  const { data: listings = [], isLoading } = useQuery(
    'owner-listings',
    () => propertiesAPI.myListings().then(r => r.data),
    { staleTime: 60_000 }
  )

  const stats = {
    total: listings.length,
    active: listings.filter(l => l.status === 'active').length,
    pending: listings.filter(l => l.status === 'pending_review').length,
    avgRating: listings.length
      ? (listings.reduce((s, l) => s + l.avg_rating, 0) / listings.length).toFixed(1)
      : '—',
  }

  const runAnalyser = async () => {
    if (!form.city || !form.neighbourhood) {
      toast.error('Please fill city and neighbourhood')
      return
    }
    setAnalyserLoading(true)
    try {
      const { data } = await aiAPI.predictRent({
        ...form,
        bedrooms: Number(form.bedrooms),
        bathrooms: Number(form.bathrooms),
        area_sqft: form.area_sqft ? Number(form.area_sqft) : null,
        floor: form.floor ? Number(form.floor) : null,
        building_age_years: form.building_age_years ? Number(form.building_age_years) : null,
      })
      setAnalyserResult(data)
    } catch (e) {
      toast.error('Analyser error — check your inputs')
    } finally {
      setAnalyserLoading(false)
    }
  }

  const tabs = [
    { id: 'listings',  label: 'My Listings',    icon: <Home size={15} /> },
    { id: 'analyser',  label: 'Price Analyser',  icon: <Zap size={15} /> },
    { id: 'earnings',  label: 'Earnings',        icon: <TrendingUp size={15} /> },
  ]

  const AMENITY_OPTIONS = ['wifi', 'parking', 'gym', 'swimming_pool', 'security',
    'power_backup', 'lift', 'air_conditioning', 'water_purifier', 'garden']

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 pt-20 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold font-display text-text1">Owner Dashboard</h1>
          <p className="text-text3 text-sm">Manage your properties and earnings</p>
        </div>
        <Link to="/owner/new-listing" className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add Listing
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Listings', value: stats.total,     color: 'text-accent' },
          { label: 'Active',         value: stats.active,    color: 'text-green' },
          { label: 'Pending Review', value: stats.pending,   color: 'text-accent' },
          { label: 'Avg Rating',     value: stats.avgRating, color: 'text-teal' },
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

      {/* Listings Tab */}
      {activeTab === 'listings' && (
        <div className="space-y-4">
          {isLoading && [...Array(3)].map((_, i) => (
            <div key={i} className="card animate-pulse h-24 bg-card2" />
          ))}

          {!isLoading && listings.length === 0 && (
            <div className="card text-center py-16">
              <Home size={40} className="mx-auto text-text3 mb-3" />
              <p className="text-text2 font-medium">No listings yet</p>
              <p className="text-text3 text-sm mb-4">Create your first property listing</p>
              <Link to="/owner/new-listing" className="btn-primary inline-flex gap-2">
                <Plus size={15} /> Create Listing
              </Link>
            </div>
          )}

          {listings.map(l => (
            <div key={l.id} className="card flex gap-4 animate-fade-in">
              <div className="w-20 h-16 rounded-lg bg-bg3 shrink-0 flex items-center justify-center overflow-hidden">
                {l.photos?.[0] ? (
                  <img src={l.photos[0].url} alt={l.title} className="w-full h-full object-cover" />
                ) : (
                  <Home size={20} className="text-text3" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Link to={`/property/${l.id}`}
                      className="font-semibold text-text1 hover:text-accent transition-colors text-sm">
                      {l.title}
                    </Link>
                    <p className="text-text3 text-xs mt-0.5">
                      {l.neighbourhood}, {l.city} · {l.bedrooms}BHK {l.property_type}
                    </p>
                  </div>
                  <span className={`badge-status border text-xs ${STATUS_BADGE[l.status] || ''}`}>
                    {l.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-2">
                  <span className="text-accent font-bold font-display">
                    ₹{l.price_per_month.toLocaleString('en-IN')}/mo
                  </span>
                  {l.avg_rating > 0 && (
                    <span className="flex items-center gap-1 text-xs text-text3">
                      <Star size={11} className="text-accent fill-accent" /> {l.avg_rating.toFixed(1)}
                      ({l.total_reviews})
                    </span>
                  )}
                  {l.fair_price_badge && (
                    <span className="badge-fair text-xs">✓ Fair Price</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Price Analyser Tab */}
      {activeTab === 'analyser' && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Input Form */}
          <div className="card space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap size={18} className="text-accent" />
              <h3 className="font-semibold text-text1">AI Price Recommendation</h3>
            </div>
            <p className="text-text3 text-xs -mt-2">
              Enter your property details to get an XGBoost ML price prediction
            </p>

            {[
              { key: 'city', label: 'City', placeholder: 'e.g. Bengaluru' },
              { key: 'neighbourhood', label: 'Neighbourhood', placeholder: 'e.g. Indiranagar' },
            ].map(f => (
              <div key={f.key}>
                <label className="label">{f.label}</label>
                <input
                  className="input"
                  placeholder={f.placeholder}
                  value={form[f.key]}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                />
              </div>
            ))}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Property Type</label>
                <select
                  className="input"
                  value={form.property_type}
                  onChange={e => setForm(p => ({ ...p, property_type: e.target.value }))}
                >
                  {['apartment', 'villa', 'studio', 'pg', 'house'].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Bedrooms</label>
                <input type="number" min="1" max="10" className="input"
                  value={form.bedrooms}
                  onChange={e => setForm(p => ({ ...p, bedrooms: e.target.value }))} />
              </div>
              <div>
                <label className="label">Bathrooms</label>
                <input type="number" min="1" max="10" className="input"
                  value={form.bathrooms}
                  onChange={e => setForm(p => ({ ...p, bathrooms: e.target.value }))} />
              </div>
              <div>
                <label className="label">Area (sq ft)</label>
                <input type="number" className="input" placeholder="e.g. 1100"
                  value={form.area_sqft}
                  onChange={e => setForm(p => ({ ...p, area_sqft: e.target.value }))} />
              </div>
              <div>
                <label className="label">Floor</label>
                <input type="number" className="input" placeholder="e.g. 3"
                  value={form.floor}
                  onChange={e => setForm(p => ({ ...p, floor: e.target.value }))} />
              </div>
              <div>
                <label className="label">Building Age (years)</label>
                <input type="number" className="input" placeholder="e.g. 5"
                  value={form.building_age_years}
                  onChange={e => setForm(p => ({ ...p, building_age_years: e.target.value }))} />
              </div>
            </div>

            {/* Amenities */}
            <div>
              <label className="label">Amenities</label>
              <div className="flex flex-wrap gap-2">
                {AMENITY_OPTIONS.map(a => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setForm(p => ({
                      ...p,
                      amenities: p.amenities.includes(a)
                        ? p.amenities.filter(x => x !== a)
                        : [...p.amenities, a],
                    }))}
                    className={`px-2.5 py-1 rounded-full text-xs border transition-all ${
                      form.amenities.includes(a)
                        ? 'bg-accent/10 text-accent border-accent/40'
                        : 'border-border2 text-text3 hover:text-text2'
                    }`}
                  >
                    {a.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={runAnalyser}
              disabled={analyserLoading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {analyserLoading ? (
                <><span className="w-4 h-4 border-2 border-bg border-t-transparent rounded-full animate-spin" /> Analysing…</>
              ) : (
                <><Zap size={15} /> Get Price Recommendation</>
              )}
            </button>
          </div>

          {/* Result */}
          <div>
            {!analyserResult && (
              <div className="card h-full flex flex-col items-center justify-center text-center py-16">
                <BarChart2 size={40} className="text-text3 mb-3" />
                <p className="text-text2 font-medium">Enter details to get AI price recommendation</p>
                <p className="text-text3 text-xs mt-1">Powered by XGBoost ML model</p>
              </div>
            )}

            {analyserResult && (
              <div className="space-y-4 animate-slide-up">
                {/* Suggested Price */}
                <div className="card border-accent/30 bg-accent/5">
                  <p className="text-text3 text-xs mb-1">Suggested Monthly Rent</p>
                  <p className="text-4xl font-bold font-display text-accent">
                    ₹{analyserResult.suggested_price.toLocaleString('en-IN')}
                  </p>
                  <p className="text-text3 text-xs mt-1">
                    Range: ₹{analyserResult.confidence_low.toLocaleString('en-IN')} –{' '}
                    ₹{analyserResult.confidence_high.toLocaleString('en-IN')}
                  </p>
                </div>

                {/* Price Range Bar */}
                <div className="card">
                  <p className="text-text2 text-xs font-medium mb-3">Confidence Band</p>
                  <div className="relative h-3 bg-bg3 rounded-full overflow-hidden">
                    <div
                      className="absolute h-full bg-accent/30 rounded-full"
                      style={{ left: '12%', right: '12%' }}
                    />
                    <div
                      className="absolute w-3 h-3 bg-accent rounded-full top-0 border-2 border-bg"
                      style={{ left: '50%', transform: 'translateX(-50%)' }}
                    />
                  </div>
                  <div className="flex justify-between text-text3 text-xs mt-1">
                    <span>₹{analyserResult.confidence_low.toLocaleString('en-IN')}</span>
                    <span className="text-accent font-medium">
                      ₹{analyserResult.suggested_price.toLocaleString('en-IN')}
                    </span>
                    <span>₹{analyserResult.confidence_high.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {/* SHAP Top Features */}
                {analyserResult.shap_top_features && (
                  <div className="card">
                    <p className="text-text2 text-xs font-medium mb-3">Top Price Factors (SHAP)</p>
                    <div className="space-y-2">
                      {Object.entries(analyserResult.shap_top_features)
                        .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
                        .slice(0, 5)
                        .map(([feat, val]) => (
                          <div key={feat} className="flex items-center gap-2">
                            <span className="text-text3 text-xs w-28 truncate capitalize">
                              {feat.replace('_', ' ')}
                            </span>
                            <div className="flex-1 h-1.5 bg-bg3 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${val > 0 ? 'bg-green' : 'bg-red'}`}
                                style={{ width: `${Math.min(100, Math.abs(val) * 5)}%` }}
                              />
                            </div>
                            <span className={`text-xs ${val > 0 ? 'text-green' : 'text-red'}`}>
                              {val > 0 ? '+' : ''}{val.toFixed(0)}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {analyserResult.note && (
                  <p className="text-text3 text-xs bg-bg3 rounded-lg p-3 border border-border">
                    ℹ️ {analyserResult.note}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Earnings Tab */}
      {activeTab === 'earnings' && (
        <div className="card text-center py-16">
          <TrendingUp size={40} className="mx-auto text-text3 mb-3" />
          <p className="text-text2 font-medium">Earnings dashboard coming soon</p>
          <p className="text-text3 text-sm">Track your revenue and request payouts</p>
        </div>
      )}
    </div>
  )
}
