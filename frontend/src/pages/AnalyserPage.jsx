// src/pages/AnalyserPage.jsx
import { useState } from 'react'
import { useQuery } from 'react-query'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts'
import { aiAPI } from '@/lib/api'
import { TrendingUp, TrendingDown, Minus, BarChart2, Search } from 'lucide-react'

const PROPERTY_TYPES = ['all', 'apartment', 'villa', 'studio', 'pg', 'house']

export default function AnalyserPage() {
  const [neighbourhood, setNeighbourhood] = useState('')
  const [query, setQuery] = useState(null)
  const [propertyType, setPropertyType] = useState('all')

  const { data: trend, isLoading, error } = useQuery(
    ['trend', query, propertyType],
    () => aiAPI.trend({
      neighbourhood: query,
      property_type: propertyType === 'all' ? undefined : propertyType,
    }).then(r => r.data),
    { enabled: !!query, staleTime: 300_000 }
  )

  const chartData = trend?.months?.map((m, i) => ({
    month: m,
    P25: trend.p25[i],
    Median: trend.median[i],
    P75: trend.p75[i],
  })) || []

  const TrendIcon = trend?.trend === 'rising' ? TrendingUp
    : trend?.trend === 'falling' ? TrendingDown : Minus
  const trendColor = trend?.trend === 'rising' ? 'text-green'
    : trend?.trend === 'falling' ? 'text-red' : 'text-text3'

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-card2 border border-border rounded-xl p-3 text-xs shadow-lg">
        <p className="text-text2 font-medium mb-2">{label}</p>
        {payload.map(p => (
          <div key={p.name} className="flex justify-between gap-4">
            <span style={{ color: p.color }}>{p.name}</span>
            <span className="text-text1 font-medium">₹{p.value?.toLocaleString('en-IN')}</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 pt-20 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <BarChart2 size={22} className="text-accent" />
          <h1 className="text-2xl font-bold font-display text-text1">Rental Analyser</h1>
        </div>
        <p className="text-text3 text-sm">
          12-month rent trends · P25 / Median / P75 bands · YoY change
        </p>
      </div>

      {/* Search Bar */}
      <div className="card mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text3" />
            <input
              className="input pl-9"
              placeholder="Enter neighbourhood (e.g. Indiranagar, Koramangala)..."
              value={neighbourhood}
              onChange={e => setNeighbourhood(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && setQuery(neighbourhood)}
            />
          </div>
          <select
            className="input sm:w-40"
            value={propertyType}
            onChange={e => setPropertyType(e.target.value)}
          >
            {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <button
            onClick={() => setQuery(neighbourhood)}
            disabled={!neighbourhood}
            className="btn-primary flex items-center gap-2 whitespace-nowrap"
          >
            <BarChart2 size={15} /> Analyse
          </button>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="card flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Error / No data */}
      {error && (
        <div className="card text-center py-12">
          <p className="text-red text-sm">No data found for "{query}"</p>
          <p className="text-text3 text-xs mt-1">Try a different neighbourhood name</p>
        </div>
      )}

      {/* Results */}
      {trend && !isLoading && !('error' in trend) && (
        <div className="space-y-6 animate-slide-up">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Median Rent', value: `₹${trend.median?.at(-1)?.toLocaleString('en-IN')}/mo`, color: 'text-accent' },
              { label: 'P25 (Budget)', value: `₹${trend.p25?.at(-1)?.toLocaleString('en-IN')}/mo`, color: 'text-teal' },
              { label: 'P75 (Premium)', value: `₹${trend.p75?.at(-1)?.toLocaleString('en-IN')}/mo`, color: 'text-blue' },
              { label: 'YoY Change', value: trend.yoy_change_pct != null ? `${trend.yoy_change_pct > 0 ? '+' : ''}${trend.yoy_change_pct}%` : '—', color: trendColor },
            ].map(s => (
              <div key={s.label} className="stat-card">
                <span className="text-text3 text-xs">{s.label}</span>
                <span className={`text-xl font-bold font-display ${s.color}`}>{s.value}</span>
              </div>
            ))}
          </div>

          {/* Trend Badge */}
          <div className="flex items-center gap-2">
            <span className={`flex items-center gap-1 text-sm font-medium ${trendColor}`}>
              <TrendIcon size={16} />
              {trend.neighbourhood} rents are{' '}
              <span className="capitalize">{trend.trend}</span>
            </span>
            <span className="text-text3 text-xs">
              · {trend.property_type !== 'all' ? trend.property_type : 'All types'}
            </span>
          </div>

          {/* Chart */}
          <div className="card">
            <h3 className="text-text1 font-semibold mb-1 text-sm">
              12-Month Rent Trend — {trend.neighbourhood}
            </h3>
            <p className="text-text3 text-xs mb-5">Monthly median with P25/P75 bands (INR/month)</p>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="month"
                  tick={{ fill: '#5c5c72', fontSize: 11 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.07)' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#5c5c72', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: 12, color: '#9a9aae' }}
                  iconType="circle"
                />
                <Line
                  type="monotone" dataKey="P25"
                  stroke="#6ec6c0" strokeWidth={2}
                  dot={false} strokeDasharray="4 4"
                />
                <Line
                  type="monotone" dataKey="Median"
                  stroke="#e8a87c" strokeWidth={2.5}
                  dot={{ fill: '#e8a87c', r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone" dataKey="P75"
                  stroke="#6fa3e0" strokeWidth={2}
                  dot={false} strokeDasharray="4 4"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Legend explanation */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'P25 (Budget range)', color: '#6ec6c0', desc: '25% of listings below this price' },
              { label: 'Median price',       color: '#e8a87c', desc: 'Middle of the market' },
              { label: 'P75 (Premium range)',color: '#6fa3e0', desc: '75% of listings below this price' },
            ].map(l => (
              <div key={l.label} className="card p-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-3 h-0.5 rounded" style={{ background: l.color }} />
                  <span className="text-xs font-medium text-text2">{l.label}</span>
                </div>
                <p className="text-text3 text-xs">{l.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Initial state */}
      {!query && (
        <div className="card text-center py-20">
          <BarChart2 size={48} className="mx-auto text-text3 mb-4" />
          <p className="text-text2 font-medium text-lg font-display">Enter a neighbourhood to analyse</p>
          <p className="text-text3 text-sm mt-1">
            Try "Indiranagar", "Koramangala", "Whitefield", "Bandra West"
          </p>
        </div>
      )}
    </div>
  )
}
