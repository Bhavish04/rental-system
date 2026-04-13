// src/pages/SearchPage.jsx
import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from 'react-query'
import { MapPin, LayoutGrid, List } from 'lucide-react'
import SearchBar from '@/components/property/SearchBar'
import PropertyCard from '@/components/property/PropertyCard'
import { propertiesAPI } from '@/lib/api'

export default function SearchPage() {
  const [searchParams] = useSearchParams()
  const [filters, setFilters] = useState({
    city:          searchParams.get('city') || '',
    min_price:     searchParams.get('min_price') || '',
    max_price:     searchParams.get('max_price') || '',
    bedrooms:      searchParams.get('bedrooms') || '',
    property_type: searchParams.get('property_type') || '',
    page:          1,
    page_size:     18,
  })
  const [view, setView] = useState('grid')

  const { data, isLoading, isFetching } = useQuery(
    ['properties', filters],
    () => propertiesAPI.search(
      Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''))
    ).then(r => r.data),
    { keepPreviousData: true }
  )

  const handleSearch = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }))
  }

  const results = data?.results || []
  const total   = data?.total || 0

  return (
    <div className="pt-20 min-h-screen px-5 max-w-7xl mx-auto pb-16">

      {/* Search bar */}
      <div className="mb-6">
        <SearchBar
          defaultValues={{
            query:    filters.city,
            minPrice: filters.min_price,
            maxPrice: filters.max_price,
            bedrooms: filters.bedrooms,
            type:     filters.property_type,
          }}
          onSearch={handleSearch}
        />
      </div>

      {/* Results header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2 text-text2 text-sm">
          <MapPin size={14} className="text-accent" />
          {isLoading ? (
            <span>Searching…</span>
          ) : (
            <span>
              <span className="text-text1 font-semibold">{total}</span> properties
              {filters.city && <> in <span className="text-text1">{filters.city}</span></>}
            </span>
          )}
          {isFetching && !isLoading && (
            <span className="text-text3 text-xs ml-1">Updating…</span>
          )}
        </div>

        <div className="flex items-center gap-1 bg-card border border-border rounded-xl p-1">
          <button onClick={() => setView('grid')}
            className={`p-1.5 rounded-lg transition-all ${view === 'grid' ? 'bg-accent/10 text-accent' : 'text-text3 hover:text-text2'}`}>
            <LayoutGrid size={14} />
          </button>
          <button onClick={() => setView('list')}
            className={`p-1.5 rounded-lg transition-all ${view === 'list' ? 'bg-accent/10 text-accent' : 'text-text3 hover:text-text2'}`}>
            <List size={14} />
          </button>
        </div>
      </div>

      {/* Results grid */}
      {isLoading ? (
        <div className={`grid gap-5 ${view === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
          {[...Array(9)].map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-44 bg-bg3 rounded-xl mb-4" />
              <div className="h-4 bg-bg3 rounded w-3/4 mb-2" />
              <div className="h-3 bg-bg3 rounded w-1/2 mb-4" />
              <div className="h-8 bg-bg3 rounded" />
            </div>
          ))}
        </div>
      ) : results.length === 0 ? (
        <div className="text-center py-24">
          <p className="text-5xl mb-4">🏚</p>
          <p className="text-text1 font-semibold text-lg mb-2">No properties found</p>
          <p className="text-text2 text-sm">Try adjusting your filters or search a different city</p>
        </div>
      ) : (
        <>
          <div className={`grid gap-5 ${view === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 max-w-2xl'}`}>
            {results.map(p => <PropertyCard key={p.id} property={p} compact={view === 'list'} />)}
          </div>

          {/* Pagination */}
          {total > filters.page_size && (
            <div className="flex items-center justify-center gap-3 mt-10">
              <button
                onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}
                disabled={filters.page === 1}
                className="btn-ghost disabled:opacity-40"
              >← Prev</button>
              <span className="text-text2 text-sm">Page {filters.page}</span>
              <button
                onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}
                disabled={results.length < filters.page_size}
                className="btn-ghost disabled:opacity-40"
              >Next →</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
