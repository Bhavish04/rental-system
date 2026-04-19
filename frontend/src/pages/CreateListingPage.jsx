// src/pages/CreateListingPage.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from 'react-query'
import toast from 'react-hot-toast'
import { propertiesAPI } from '@/lib/api'
import { Home, Upload, MapPin, DollarSign, Grid, CheckCircle } from 'lucide-react'

const AMENITY_OPTIONS = [
  'wifi', 'parking', 'gym', 'swimming_pool', 'security',
  'power_backup', 'lift', 'air_conditioning', 'water_purifier', 'garden'
]

const PROPERTY_TYPES = ['apartment', 'villa', 'studio', 'pg', 'house']

export default function CreateListingPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    title: '',
    description: '',
    property_type: 'apartment',
    bedrooms: 2,
    bathrooms: 1,
    area_sqft: '',
    floor: '',
    building_age_years: '',
    address: '',
    city: '',
    neighbourhood: '',
    pincode: '',
    latitude: '',
    longitude: '',
    price_per_month: '',
    amenities: [],
  })

  const set = (key, value) => setForm(p => ({ ...p, [key]: value }))

  const createMutation = useMutation(
    (data) => propertiesAPI.create(data),
    {
      onSuccess: () => {
        toast.success('Property listed successfully!')
        qc.invalidateQueries('owner-listings')
        navigate('/owner')
      },
      onError: (e) => {
        toast.error(e?.response?.data?.detail || 'Failed to create listing')
      }
    }
  )

  const handleSubmit = () => {
    if (!form.title || !form.city || !form.price_per_month) {
      toast.error('Please fill all required fields')
      return
    }
    createMutation.mutate({
      ...form,
      bedrooms: Number(form.bedrooms),
      bathrooms: Number(form.bathrooms),
      area_sqft: form.area_sqft ? Number(form.area_sqft) : null,
      floor: form.floor ? Number(form.floor) : null,
      building_age_years: form.building_age_years ? Number(form.building_age_years) : null,
      price_per_month: Number(form.price_per_month),
      latitude: form.latitude ? Number(form.latitude) : null,
      longitude: form.longitude ? Number(form.longitude) : null,
    })
  }

  const steps = [
    { id: 1, label: 'Basic Info', icon: Home },
    { id: 2, label: 'Location', icon: MapPin },
    { id: 3, label: 'Pricing', icon: DollarSign },
    { id: 4, label: 'Amenities', icon: Grid },
  ]

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 pt-24 animate-fade-in">
      <h1 className="text-2xl font-bold font-display text-text1 mb-2">Create New Listing</h1>
      <p className="text-text3 text-sm mb-8">Fill in the details to list your property</p>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {steps.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2 flex-1">
            <button
              onClick={() => setStep(s.id)}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all
                ${step === s.id ? 'bg-accent text-white' : step > s.id ? 'bg-green/20 text-green' : 'bg-card text-text3'}`}
            >
              {step > s.id ? <CheckCircle size={14} /> : s.id}
            </button>
            <span className={`text-xs hidden sm:block ${step === s.id ? 'text-text1 font-medium' : 'text-text3'}`}>
              {s.label}
            </span>
            {i < steps.length - 1 && <div className={`flex-1 h-px ${step > s.id ? 'bg-green/30' : 'bg-border'}`} />}
          </div>
        ))}
      </div>

      {/* Step 1 - Basic Info */}
      {step === 1 && (
        <div className="card space-y-4 animate-fade-in">
          <h2 className="font-semibold text-text1 flex items-center gap-2"><Home size={16} className="text-accent" /> Basic Information</h2>

          <div>
            <label className="label">Property Title *</label>
            <input className="input" placeholder="e.g. Spacious 2BHK in Indiranagar"
              value={form.title} onChange={e => set('title', e.target.value)} />
          </div>

          <div>
            <label className="label">Description</label>
            <textarea className="input h-24 resize-none" placeholder="Describe your property..."
              value={form.description} onChange={e => set('description', e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Property Type *</label>
              <select className="input" value={form.property_type} onChange={e => set('property_type', e.target.value)}>
                {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Bedrooms *</label>
              <input type="number" min="1" max="10" className="input"
                value={form.bedrooms} onChange={e => set('bedrooms', e.target.value)} />
            </div>
            <div>
              <label className="label">Bathrooms *</label>
              <input type="number" min="1" max="10" className="input"
                value={form.bathrooms} onChange={e => set('bathrooms', e.target.value)} />
            </div>
            <div>
              <label className="label">Area (sq ft)</label>
              <input type="number" className="input" placeholder="e.g. 1100"
                value={form.area_sqft} onChange={e => set('area_sqft', e.target.value)} />
            </div>
            <div>
              <label className="label">Floor</label>
              <input type="number" className="input" placeholder="e.g. 3"
                value={form.floor} onChange={e => set('floor', e.target.value)} />
            </div>
            <div>
              <label className="label">Building Age (years)</label>
              <input type="number" className="input" placeholder="e.g. 5"
                value={form.building_age_years} onChange={e => set('building_age_years', e.target.value)} />
            </div>
          </div>

          <button onClick={() => setStep(2)} className="btn-primary w-full">Next: Location →</button>
        </div>
      )}

      {/* Step 2 - Location */}
      {step === 2 && (
        <div className="card space-y-4 animate-fade-in">
          <h2 className="font-semibold text-text1 flex items-center gap-2"><MapPin size={16} className="text-accent" /> Location Details</h2>

          <div>
            <label className="label">Full Address *</label>
            <input className="input" placeholder="e.g. 123 Main Street, Apt 4B"
              value={form.address} onChange={e => set('address', e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">City *</label>
              <input className="input" placeholder="e.g. Bengaluru"
                value={form.city} onChange={e => set('city', e.target.value)} />
            </div>
            <div>
              <label className="label">Neighbourhood *</label>
              <input className="input" placeholder="e.g. Indiranagar"
                value={form.neighbourhood} onChange={e => set('neighbourhood', e.target.value)} />
            </div>
            <div>
              <label className="label">Pincode</label>
              <input className="input" placeholder="e.g. 560038"
                value={form.pincode} onChange={e => set('pincode', e.target.value)} />
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="btn-ghost flex-1">← Back</button>
            <button onClick={() => setStep(3)} className="btn-primary flex-1">Next: Pricing →</button>
          </div>
        </div>
      )}

      {/* Step 3 - Pricing */}
      {step === 3 && (
        <div className="card space-y-4 animate-fade-in">
          <h2 className="font-semibold text-text1 flex items-center gap-2"><DollarSign size={16} className="text-accent" /> Pricing</h2>

          <div>
            <label className="label">Monthly Rent (₹) *</label>
            <input type="number" className="input text-xl font-bold" placeholder="e.g. 25000"
              value={form.price_per_month} onChange={e => set('price_per_month', e.target.value)} />
            <p className="text-text3 text-xs mt-1">Set a competitive price based on your neighbourhood</p>
          </div>

          {form.price_per_month && (
            <div className="bg-accent/5 border border-accent/20 rounded-xl p-4">
              <p className="text-text3 text-xs">Monthly Rent</p>
              <p className="text-2xl font-bold font-display text-accent">
                ₹{Number(form.price_per_month).toLocaleString('en-IN')}/mo
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => setStep(2)} className="btn-ghost flex-1">← Back</button>
            <button onClick={() => setStep(4)} className="btn-primary flex-1">Next: Amenities →</button>
          </div>
        </div>
      )}

      {/* Step 4 - Amenities */}
      {step === 4 && (
        <div className="card space-y-4 animate-fade-in">
          <h2 className="font-semibold text-text1 flex items-center gap-2"><Grid size={16} className="text-accent" /> Amenities</h2>
          <p className="text-text3 text-sm">Select all amenities available in your property</p>

          <div className="flex flex-wrap gap-2">
            {AMENITY_OPTIONS.map(a => (
              <button
                key={a}
                type="button"
                onClick={() => set('amenities', form.amenities.includes(a)
                  ? form.amenities.filter(x => x !== a)
                  : [...form.amenities, a]
                )}
                className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                  form.amenities.includes(a)
                    ? 'bg-accent/10 text-accent border-accent/40'
                    : 'border-border2 text-text3 hover:text-text2'
                }`}
              >
                {a.replace(/_/g, ' ')}
              </button>
            ))}
          </div>

          <div className="border-t border-border pt-4">
            <h3 className="text-text2 text-sm font-medium mb-2">Summary</h3>
            <div className="text-text3 text-xs space-y-1">
              <p>📍 {form.neighbourhood}, {form.city}</p>
              <p>🏠 {form.bedrooms}BHK {form.property_type} · {form.bathrooms} bath</p>
              <p>💰 ₹{Number(form.price_per_month).toLocaleString('en-IN')}/mo</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(3)} className="btn-ghost flex-1">← Back</button>
            <button
              onClick={handleSubmit}
              disabled={createMutation.isLoading}
              className="btn-primary flex-1"
            >
              {createMutation.isLoading ? 'Creating...' : '🚀 Create Listing'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
