// src/pages/HomePage.jsx
import { useQuery } from 'react-query'
import { Link } from 'react-router-dom'
import { Building2, Users, TrendingUp, Shield, Bot, BarChart2, Sparkles } from 'lucide-react'
import SearchBar from '@/components/property/SearchBar'
import PropertyCard from '@/components/property/PropertyCard'
import { propertiesAPI } from '@/lib/api'

const STATS = [
  { label: 'Properties Listed', value: '12,400+', icon: Building2 },
  { label: 'Happy Renters',      value: '8,200+',  icon: Users },
  { label: 'Cities Covered',    value: '24',       icon: TrendingUp },
  { label: 'AI-Verified',       value: '100%',     icon: Shield },
]

const FEATURES = [
  {
    icon: Bot,
    title: 'AI Chatbot Search',
    desc: 'Describe what you want in plain language — "2BHK near MG Road under 25k" — and get instant matches.',
    color: 'text-accent bg-accent/10',
  },
  {
    icon: BarChart2,
    title: 'ML Price Analyser',
    desc: 'Our XGBoost model predicts fair rent with P25/P75 confidence bands and 12-month trend charts.',
    color: 'text-teal bg-teal/10',
  },
  {
    icon: Sparkles,
    title: 'Fair Price Badge',
    desc: 'Listings priced below area median get a verified Fair Price badge — know you\'re not overpaying.',
    color: 'text-blue bg-blue/10',
  },
]

const CITIES = ['Bengaluru', 'Mumbai', 'Hyderabad', 'Delhi', 'Pune', 'Chennai', 'Gurgaon', 'Noida']

export default function HomePage() {
  const { data } = useQuery('featured', () =>
    propertiesAPI.search({ page: 1, page_size: 6 }).then(r => r.data), {
      staleTime: 60_000,
    }
  )

  return (
    <div className="pt-16">

      {/* Hero */}
      <section className="relative min-h-[88vh] flex flex-col items-center justify-center
                          text-center px-6 overflow-hidden">
        {/* Gradient blobs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[500px]
                          rounded-full bg-accent/5 blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px]
                          rounded-full bg-teal/4 blur-[80px]" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto animate-slide-up">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full
                          bg-accent/10 border border-accent/25 text-accent text-xs font-medium mb-7">
            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
            AI-Powered · Gemini + Pinecone RAG
          </div>

          <h1 className="font-display text-5xl md:text-7xl font-bold text-text1 leading-[1.05] mb-6">
            Find Your Perfect<br />
            <em className="text-accent not-italic">Rental Home</em>
          </h1>

          <p className="text-text2 text-lg md:text-xl max-w-xl mx-auto mb-10 font-light leading-relaxed">
            Just describe what you want — our AI finds, prices, and recommends
            the best rentals across India.
          </p>

          <SearchBar hero />

          {/* City quick links */}
          <div className="flex flex-wrap justify-center gap-2 mt-8">
            {CITIES.map(city => (
              <Link key={city} to={`/search?city=${city}`}
                className="px-3.5 py-1.5 rounded-full bg-card border border-border text-text2 text-xs
                           hover:border-border2 hover:text-text1 transition-all">
                {city}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section className="border-y border-border bg-bg2 py-10">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map(({ label, value, icon: Icon }) => (
            <div key={label} className="flex flex-col items-center text-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                <Icon size={18} className="text-accent" />
              </div>
              <p className="font-display text-2xl font-bold text-text1">{value}</p>
              <p className="text-text3 text-xs">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured listings */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-accent text-xs font-medium uppercase tracking-widest mb-1">Featured</p>
            <h2 className="section-title">Top Listings This Week</h2>
          </div>
          <Link to="/search" className="btn-ghost text-sm">View all →</Link>
        </div>

        {data?.results?.length ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {data.results.map(p => <PropertyCard key={p.id} property={p} />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="card h-72 animate-pulse">
                <div className="h-44 bg-bg3 rounded-xl mb-4" />
                <div className="h-4 bg-bg3 rounded w-3/4 mb-2" />
                <div className="h-3 bg-bg3 rounded w-1/2" />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* AI Features */}
      <section className="bg-bg2 border-y border-border py-16">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-teal text-xs font-medium uppercase tracking-widest mb-2">AI-First Platform</p>
            <h2 className="section-title text-3xl">Smarter Renting with AI</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {FEATURES.map(({ icon: Icon, title, desc, color }) => (
              <div key={title} className="card hover:border-border2 transition-all">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${color}`}>
                  <Icon size={20} />
                </div>
                <h3 className="text-text1 font-semibold text-sm mb-2">{title}</h3>
                <p className="text-text2 text-xs leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 text-center px-6">
        <div className="max-w-xl mx-auto">
          <h2 className="font-display text-3xl font-bold text-text1 mb-4">
            Own a property? <span className="text-accent">List it free.</span>
          </h2>
          <p className="text-text2 text-sm mb-8 leading-relaxed">
            Get AI-powered price recommendations, manage bookings, and earn more.
          </p>
          <Link to="/owner" className="btn-primary text-base px-8 py-3">
            List Your Property →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-bg2 py-10 px-6 text-center">
        <p className="font-display text-lg font-bold text-text1 mb-2">
          Rent<span className="text-accent">Smart</span>
        </p>
        <p className="text-text3 text-xs">
          © 2026 RentSmart · AI-Powered Rental Platform · Built with Gemini + Pinecone + XGBoost
        </p>
      </footer>
    </div>
  )
}
