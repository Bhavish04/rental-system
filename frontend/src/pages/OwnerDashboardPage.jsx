// src/pages/OwnerDashboardPage.jsx
import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from 'react-query'
import { Link, useLocation } from 'react-router-dom'
import toast from 'react-hot-toast'
import { dealsAPI, propertiesAPI, aiAPI } from '@/lib/api'
import {
  Home, Plus, TrendingUp, Star, XCircle, BarChart2,
  Edit, Zap, Heart, MessageCircle, CheckCircle
} from 'lucide-react'

const STATUS_BADGE = {
  active:         'bg-green/10 text-green border-green/30',
  pending_review: 'bg-accent/10 text-accent border-accent/30',
  draft:          'bg-text3/10 text-text3 border-text3/20',
  rejected:       'bg-red/10 text-red border-red/30',
  inactive:       'bg-text3/10 text-text3 border-text3/20',
  pending:        'bg-accent/10 text-accent border-accent/30',
  sold:           'bg-blue/10 text-blue border-blue/30',
}

export default function OwnerDashboardPage() {
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState('listings')

  const [buyRequests, setBuyRequests] = useState([])
  const [interestCounts, setInterestCounts] = useState([])
  const [selectedPropertyLeads, setSelectedPropertyLeads] = useState(null)
  const [leads, setLeads] = useState([])
  const [leadsLoading, setLeadsLoading] = useState(false)
  const [contactLead, setContactLead] = useState(null)
  const [contactMessage, setContactMessage] = useState('')
  const [editingListing, setEditingListing] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [editLoading, setEditLoading] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
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

  useEffect(() => {
    dealsAPI.ownerRequests().then(r => setBuyRequests(r.data)).catch(() => {})
    dealsAPI.ownerInterestCounts().then(r => setInterestCounts(r.data)).catch(() => {})
  }, [])

  const stats = {
    total: listings.length,
    active: listings.filter(l => l.status === 'active').length,
    pending: listings.filter(l => l.status === 'pending_review' || l.status === 'pending').length,
    avgRating: listings.length
      ? (listings.reduce((s, l) => s + (l.avg_rating || 0), 0) / listings.length).toFixed(1)
      : '—',
  }

  const runAnalyser = async () => {
    if (!form.city || !form.neighbourhood) { toast.error('Please fill city and neighbourhood'); return }
    setAnalyserLoading(true)
    try {
      const { data } = await aiAPI.predictRent({
        ...form,
        bedrooms: Number(form.bedrooms), bathrooms: Number(form.bathrooms),
        area_sqft: form.area_sqft ? Number(form.area_sqft) : null,
        floor: form.floor ? Number(form.floor) : null,
        building_age_years: form.building_age_years ? Number(form.building_age_years) : null,
      })
      setAnalyserResult(data)
    } catch { toast.error('Analyser error — check your inputs') }
    finally { setAnalyserLoading(false) }
  }

  const viewLeads = async (propertyId, propertyTitle) => {
    setSelectedPropertyLeads(propertyTitle)
    setLeadsLoading(true)
    setActiveTab('interests')
    try {
      const { data } = await dealsAPI.getInterests(propertyId)
      setLeads(data)
    } catch { setLeads([]) }
    finally { setLeadsLoading(false) }
  }

  const tabs = [
    { id: 'listings',  label: 'My Listings',      icon: <Home size={15} /> },
    { id: 'requests',  label: 'Buy Requests',      icon: <CheckCircle size={15} /> },
    { id: 'interests', label: 'Interested Buyers', icon: <Heart size={15} /> },
    { id: 'analyser',  label: 'Price Analyser',    icon: <Zap size={15} /> },
    { id: 'earnings',  label: 'Earnings',          icon: <TrendingUp size={15} /> },
  ]

  const AMENITY_OPTIONS = ['wifi', 'parking', 'gym', 'swimming_pool', 'security',
    'power_backup', 'lift', 'air_conditioning', 'water_purifier', 'garden']

  return (
    <>
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
        <div className="flex flex-wrap gap-2 mb-6 border-b border-border pb-2">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all
                ${activeTab === t.id
                  ? 'bg-accent/10 text-accent border border-accent/30'
                  : 'text-text3 hover:text-text2'}`}>
              {t.icon} {t.label}
              {t.id === 'requests' && buyRequests.filter(r => r.status === 'requested').length > 0 && (
                <span className="ml-1 bg-accent text-bg text-xs px-1.5 py-0.5 rounded-full">
                  {buyRequests.filter(r => r.status === 'requested').length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── LISTINGS TAB ── */}
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
              <div key={l.id} className="card animate-fade-in">
                <div className="flex gap-4">
                  {/* Thumbnail */}
                  <div className="w-20 h-16 rounded-lg bg-bg3 shrink-0 flex items-center justify-center overflow-hidden">
                    {l.photos?.[0] ? (
                    <img 
                      src={l.photos[0].url.startsWith('http') ? l.photos[0].url : `http://localhost:8000${l.photos[0].url}`} 
                      alt={l.title} className="w-full h-full object-cover" />
                  ) : (
                      <Home size={20} className="text-text3" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
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
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`badge-status border text-xs ${STATUS_BADGE[l.status] || ''}`}>
                          {l.status?.replace('_', ' ')}
                        </span>
                        {(() => {
                          const ic = interestCounts.find(c => c.property_id === l.id)
                          return ic ? (
                            <button onClick={() => viewLeads(l.id, l.title)}
                              className="flex items-center gap-1 text-xs bg-accent/10 text-accent border border-accent/20 px-2 py-0.5 rounded-full hover:bg-accent/20 transition">
                              <Heart size={10} fill="currentColor" /> {ic.count} interested
                            </button>
                          ) : null
                        })()}
                      </div>
                    </div>

                    {/* Price + action buttons */}
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-3">
                        <span className="text-accent font-bold font-display">
                          ₹{l.price_per_month?.toLocaleString('en-IN')}/mo
                        </span>
                        {l.avg_rating > 0 && (
                          <span className="flex items-center gap-1 text-xs text-text3">
                            <Star size={11} className="text-accent fill-accent" />
                            {l.avg_rating.toFixed(1)} ({l.total_reviews})
                          </span>
                        )}
                        {l.fair_price_badge && (
                          <span className="badge-fair text-xs">✓ Fair Price</span>
                        )}
                      </div>

                      {/* View / Edit / Delete */}
                      <div className="flex items-center gap-1.5">
                        <Link to={`/property/${l.id}`}
                          className="text-xs text-text2 border border-border px-3 py-1.5 rounded-lg hover:border-accent hover:text-accent transition flex items-center gap-1">
                          <Home size={11} /> View
                        </Link>
                        <button
                          onClick={() => {
                            if (editingListing?.id === l.id) {
                              setEditingListing(null)
                            } else {
                              setEditingListing(l)
                              setEditForm({
                                title: l.title,
                                description: l.description || '',
                                price_per_month: l.price_per_month,
                                address: l.address,
                                city: l.city,
                                neighbourhood: l.neighbourhood,
                                bedrooms: l.bedrooms,
                                bathrooms: l.bathrooms,
                              })
                            }
                          }}
                          className={`text-xs px-3 py-1.5 rounded-lg border transition flex items-center gap-1
                            ${editingListing?.id === l.id
                              ? 'bg-accent/10 text-accent border-accent/30'
                              : 'text-text2 border-border hover:border-accent hover:text-accent'}`}>
                          <Edit size={11} /> {editingListing?.id === l.id ? 'Close' : 'Edit'}
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(l)}
                          className="text-xs text-red-400 border border-red-400/20 px-3 py-1.5 rounded-lg hover:bg-red-500/10 transition flex items-center gap-1">
                          <XCircle size={11} /> Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Inline Edit Panel */}
                {editingListing?.id === l.id && (
                  <div className="mt-4 pt-4 border-t border-border animate-fade-in">
                    <h3 className="text-text1 font-semibold text-sm mb-3 flex items-center gap-2">
                      <Edit size={14} className="text-accent" /> Edit Listing
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <label className="label">Title</label>
                        <input className="input text-sm" value={editForm.title}
                          onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))} />
                      </div>
                      <div className="col-span-2">
                        <label className="label">Description</label>
                        <textarea className="input text-sm resize-none h-20" value={editForm.description}
                          onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} />
                      </div>
                      <div>
                        <label className="label">Price/month (₹)</label>
                        <input type="number" className="input text-sm" value={editForm.price_per_month}
                          onChange={e => setEditForm(p => ({ ...p, price_per_month: Number(e.target.value) }))} />
                      </div>
                      <div>
                        <label className="label">City</label>
                        <input className="input text-sm" value={editForm.city}
                          onChange={e => setEditForm(p => ({ ...p, city: e.target.value }))} />
                      </div>
                      <div>
                        <label className="label">Neighbourhood</label>
                        <input className="input text-sm" value={editForm.neighbourhood}
                          onChange={e => setEditForm(p => ({ ...p, neighbourhood: e.target.value }))} />
                      </div>
                      <div>
                        <label className="label">Address</label>
                        <input className="input text-sm" value={editForm.address}
                          onChange={e => setEditForm(p => ({ ...p, address: e.target.value }))} />
                      </div>
                      <div>
                        <label className="label">Bedrooms</label>
                        <input type="number" className="input text-sm" value={editForm.bedrooms}
                          onChange={e => setEditForm(p => ({ ...p, bedrooms: Number(e.target.value) }))} />
                      </div>
                      <div>
                        <label className="label">Bathrooms</label>
                        <input type="number" className="input text-sm" value={editForm.bathrooms}
                          onChange={e => setEditForm(p => ({ ...p, bathrooms: Number(e.target.value) }))} />
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <button disabled={editLoading}
                        onClick={async () => {
                          setEditLoading(true)
                          try {
                            await propertiesAPI.update(l.id, editForm)
                            toast.success('Listing updated!')
                            setEditingListing(null)
                            qc.invalidateQueries('owner-listings')
                          } catch { toast.error('Failed to update') }
                          finally { setEditLoading(false) }
                        }}
                        className="btn-primary text-sm px-5 py-2 disabled:opacity-50">
                        {editLoading ? 'Saving...' : '✓ Save Changes'}
                      </button>
                      <button onClick={() => setEditingListing(null)} className="btn-ghost text-sm px-4 py-2">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── BUY REQUESTS TAB ── */}
        {activeTab === 'requests' && (
          <div className="space-y-3">
            {buyRequests.length === 0 && (
              <div className="card text-center py-16">
                <CheckCircle size={40} className="mx-auto text-text3 mb-3" />
                <p className="text-text2 font-medium">No buy requests yet</p>
                <p className="text-text3 text-sm">Requests from interested buyers will appear here</p>
              </div>
            )}
            {buyRequests.map(r => (
              <div key={r.id} className="card flex items-center justify-between gap-4 animate-fade-in">
                <div>
                  <p className="text-text1 font-semibold text-sm">{r.property_title}</p>
                  <p className="text-text2 text-xs mt-0.5">
                    Offer: <span className="text-accent font-bold">₹{r.offer_price?.toLocaleString('en-IN')}</span>
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
                  {r.status === 'requested' && (
                    <>
                      <button onClick={async () => {
                        try {
                          await dealsAPI.decide(r.id, 'approve')
                          setBuyRequests(prev => prev.map(x => x.id === r.id ? { ...x, status: 'payment_pending' } : x))
                          toast.success('Approved! Buyer can now pay.')
                        } catch { toast.error('Failed to approve') }
                      }} className="btn-primary text-xs px-3 py-1.5">Approve</button>
                      <button onClick={async () => {
                        try {
                          await dealsAPI.decide(r.id, 'reject')
                          setBuyRequests(prev => prev.map(x => x.id === r.id ? { ...x, status: 'rejected' } : x))
                          toast.success('Request rejected')
                        } catch { toast.error('Failed to reject') }
                      }} className="btn-ghost text-xs px-3 py-1.5 text-red-400 border-red-400/20 hover:bg-red-500/10">Reject</button>
                    </>
                  )}
                  {r.contract_url && (
                    <a href={`http://localhost:8000${r.contract_url}`} target="_blank" rel="noreferrer"
                      className="btn-ghost text-xs px-3 py-1.5">📄 Contract</a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── INTERESTED BUYERS TAB ── */}
        {activeTab === 'interests' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-text1 font-semibold">
                {selectedPropertyLeads ? `Interested in: ${selectedPropertyLeads}` : 'Interested Buyers'}
              </h2>
              <button onClick={() => setActiveTab('listings')} className="text-text3 text-sm hover:text-text2">
                ← Back to listings
              </button>
            </div>

            {leadsLoading && [...Array(3)].map((_, i) => (
              <div key={i} className="card animate-pulse h-16 bg-card2" />
            ))}

            {!leadsLoading && leads.length === 0 && (
              <div className="card text-center py-16">
                <Heart size={40} className="mx-auto text-text3 mb-3" />
                <p className="text-text2 font-medium">No interested buyers yet</p>
              </div>
            )}

            {!leadsLoading && leads.map(lead => (
              <div key={lead.buyer_id} className="card animate-fade-in">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent font-bold text-sm">
                      {lead.name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-text1 font-medium text-sm">{lead.name}</p>
                      <p className="text-text2 text-xs">{lead.email}</p>
                      <p className="text-text3 text-xs mt-0.5">
                        Interested {new Date(lead.interested_at).toLocaleDateString('en-IN')}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setContactLead(contactLead?.buyer_id === lead.buyer_id ? null : lead)
                      setContactMessage('')
                    }}
                    className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1.5">
                    <MessageCircle size={12} />
                    {contactLead?.buyer_id === lead.buyer_id ? 'Close' : 'Contact'}
                  </button>
                </div>

                {/* Inline contact panel */}
                {contactLead?.buyer_id === lead.buyer_id && (
                  <div className="mt-4 pt-4 border-t border-border animate-fade-in">
                    <p className="text-text3 text-xs mb-3">
                      Send a message to <span className="text-text1 font-medium">{lead.name}</span>
                    </p>
                    <div className="flex flex-col gap-1.5 mb-3">
                      {[
                        `Hi ${lead.name?.split(' ')[0]}, thanks for your interest in ${selectedPropertyLeads}! Would you like to schedule a visit?`,
                        `Hello! I'm the owner of ${selectedPropertyLeads}. Feel free to reach out for more details.`,
                        `Hi ${lead.name?.split(' ')[0]}, the property is still available. Let me know if you have any questions!`
                      ].map((msg, i) => (
                        <button key={i} onClick={() => setContactMessage(msg)}
                          className="text-xs border border-border text-text3 hover:text-text1 hover:border-accent px-3 py-2 rounded-lg transition text-left">
                          {msg.substring(0, 60)}...
                        </button>
                      ))}
                    </div>
                    <textarea value={contactMessage} onChange={e => setContactMessage(e.target.value)}
                      rows={3} placeholder="Type your message..."
                      className="input resize-none text-sm w-full mb-3" />
                    <div className="flex flex-wrap gap-2">
                      <a href={`https://mail.google.com/mail/?view=cm&to=${lead.email}&su=${encodeURIComponent(`Regarding ${selectedPropertyLeads}`)}&body=${encodeURIComponent(contactMessage)}`}
                        target="_blank" rel="noreferrer" className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5">
                        📧 Gmail
                      </a>
                      {lead.phone ? (
                        <a href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(contactMessage)}`}
                          target="_blank" rel="noreferrer"
                          className="btn-ghost text-xs px-4 py-2 flex items-center gap-1.5 text-green-400 border-green-400/20 hover:bg-green-500/10">
                          💬 WhatsApp
                        </a>
                      ) : (
                        <button disabled className="btn-ghost text-xs px-4 py-2 opacity-40 cursor-not-allowed">
                          💬 WhatsApp (no number)
                        </button>
                      )}
                      <button onClick={() => { navigator.clipboard.writeText(contactMessage); toast.success('Copied!') }}
                        className="btn-ghost text-xs px-4 py-2">📋 Copy</button>
                    </div>
                    <div className="mt-2 p-2 bg-bg3 rounded-lg flex items-center justify-between">
                      <div className="flex gap-4">
                        <span className="text-text3 text-xs">📧 {lead.email}</span>
                        {lead.phone && <span className="text-text3 text-xs">📱 {lead.phone}</span>}
                      </div>
                      <button onClick={() => { navigator.clipboard.writeText(lead.phone || lead.email); toast.success('Copied!') }}
                        className="text-accent text-xs hover:underline">Copy</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── PRICE ANALYSER TAB ── */}
        {activeTab === 'analyser' && (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="card space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Zap size={18} className="text-accent" />
                <h3 className="font-semibold text-text1">AI Price Recommendation</h3>
              </div>
              <p className="text-text3 text-xs -mt-2">Enter your property details to get an XGBoost ML price prediction</p>
              {[
                { key: 'city', label: 'City', placeholder: 'e.g. Bengaluru' },
                { key: 'neighbourhood', label: 'Neighbourhood', placeholder: 'e.g. Indiranagar' },
              ].map(f => (
                <div key={f.key}>
                  <label className="label">{f.label}</label>
                  <input className="input" placeholder={f.placeholder} value={form[f.key]}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Property Type</label>
                  <select className="input" value={form.property_type}
                    onChange={e => setForm(p => ({ ...p, property_type: e.target.value }))}>
                    {['apartment', 'villa', 'studio', 'pg', 'house'].map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                {[
                  { key: 'bedrooms', label: 'Bedrooms' },
                  { key: 'bathrooms', label: 'Bathrooms' },
                  { key: 'area_sqft', label: 'Area (sq ft)', placeholder: 'e.g. 1100' },
                  { key: 'floor', label: 'Floor', placeholder: 'e.g. 3' },
                  { key: 'building_age_years', label: 'Building Age (years)', placeholder: 'e.g. 5' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="label">{f.label}</label>
                    <input type="number" className="input" placeholder={f.placeholder} value={form[f.key]}
                      onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
                  </div>
                ))}
              </div>
              <div>
                <label className="label">Amenities</label>
                <div className="flex flex-wrap gap-2">
                  {AMENITY_OPTIONS.map(a => (
                    <button key={a} type="button"
                      onClick={() => setForm(p => ({
                        ...p,
                        amenities: p.amenities.includes(a) ? p.amenities.filter(x => x !== a) : [...p.amenities, a]
                      }))}
                      className={`px-2.5 py-1 rounded-full text-xs border transition-all
                        ${form.amenities.includes(a) ? 'bg-accent/10 text-accent border-accent/40' : 'border-border2 text-text3 hover:text-text2'}`}>
                      {a.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={runAnalyser} disabled={analyserLoading}
                className="btn-primary w-full flex items-center justify-center gap-2">
                {analyserLoading
                  ? <><span className="w-4 h-4 border-2 border-bg border-t-transparent rounded-full animate-spin" /> Analysing…</>
                  : <><Zap size={15} /> Get Price Recommendation</>}
              </button>
            </div>

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
                  <div className="card border-accent/30 bg-accent/5">
                    <p className="text-text3 text-xs mb-1">Suggested Monthly Rent</p>
                    <p className="text-4xl font-bold font-display text-accent">
                      ₹{analyserResult.suggested_price?.toLocaleString('en-IN')}
                    </p>
                    <p className="text-text3 text-xs mt-1">
                      Range: ₹{analyserResult.confidence_low?.toLocaleString('en-IN')} – ₹{analyserResult.confidence_high?.toLocaleString('en-IN')}
                    </p>
                  </div>
                  {analyserResult.shap_top_features && (
                    <div className="card">
                      <p className="text-text2 text-xs font-medium mb-3">Top Price Factors (SHAP)</p>
                      <div className="space-y-2">
                        {Object.entries(analyserResult.shap_top_features)
                          .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 5)
                          .map(([feat, val]) => (
                            <div key={feat} className="flex items-center gap-2">
                              <span className="text-text3 text-xs w-28 truncate capitalize">{feat.replace('_', ' ')}</span>
                              <div className="flex-1 h-1.5 bg-bg3 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${val > 0 ? 'bg-green' : 'bg-red'}`}
                                  style={{ width: `${Math.min(100, Math.abs(val) * 5)}%` }} />
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

        {/* ── EARNINGS TAB ── */}
        {activeTab === 'earnings' && (
          <div className="card text-center py-16">
            <TrendingUp size={40} className="mx-auto text-text3 mb-3" />
            <p className="text-text2 font-medium">Earnings dashboard coming soon</p>
            <p className="text-text3 text-sm">Track your revenue and request payouts</p>
          </div>
        )}
    {/* ── DELETE CONFIRM MODAL ── */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-bg2 border border-border rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-slide-up">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
              <XCircle size={24} className="text-red-400" />
            </div>
            <h3 className="text-text1 font-bold text-lg text-center mb-1">Delete Property</h3>
            <p className="text-text2 text-sm text-center mb-1">Are you sure you want to delete</p>
            <p className="text-accent font-semibold text-sm text-center mb-4">"{deleteConfirm.title}"?</p>
            <p className="text-text3 text-xs text-center mb-6">
              This will also remove all interests and requests. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 btn-ghost py-2.5 text-sm">
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    await propertiesAPI.delete(deleteConfirm.id)
                    toast.success('Property deleted')
                    qc.invalidateQueries('owner-listings')
                    setDeleteConfirm(null)
                  } catch { toast.error('Failed to delete') }
                }}
                className="flex-1 py-2.5 text-sm rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium transition">
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  )
}