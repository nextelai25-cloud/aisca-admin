'use client'

import React, { useEffect, useState } from 'react'
import { getAnalytics } from './actions'
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts'
import { 
  TrendingUp, 
  Eye, 
  Fingerprint, 
  Globe, 
  Laptop, 
  Compass,
  MapPin
} from 'lucide-react'

// Custom tooltip styling
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#121212] border border-white/10 p-3 rounded-lg shadow-xl text-xs">
        <p className="text-[10px] tracking-wider text-gray-500 uppercase mb-1">{label}</p>
        <p className="font-bold text-white">
          {payload[0].name}: <span className="text-[#d4af37]">{payload[0].value.toLocaleString()}</span>
        </p>
      </div>
    )
  }
  return null
}

const PIE_COLORS = ['#d4af37', '#71717a', '#27272a']

export default function AnalyticsPage() {
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)

  // Dashboard Aggregates
  const [metrics, setMetrics] = useState({
    pageViews: 0,
    uniqueSessions: 0,
    countriesCount: 0,
    citiesCount: 0
  })

  // Recharts states
  const [timelineData, setTimelineData] = useState<any[]>([])
  const [topPagesData, setTopPagesData] = useState<any[]>([])
  const [deviceDataChart, setDeviceDataChart] = useState<any[]>([])
  
  // Lists
  const [referrersList, setReferrersList] = useState<any[]>([])
  const [geoList, setGeoList] = useState<any[]>([])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    async function fetchAnalytics() {
      try {
        setLoading(true)
        const { totalViews, sessions, pageData, deviceData, allData } = await getAnalytics()

        const safeData = allData || []

        const uniqueSessions = new Set(sessions?.map((s: any) => s.session_id)).size
        
        const countriesSet = new Set(safeData.map((d: any) => d.country).filter(Boolean))
        const countriesCount = countriesSet.size

        const citiesSet = new Set(safeData.map((d: any) => d.city).filter(Boolean))
        const citiesCount = citiesSet.size

        setMetrics({
          pageViews: totalViews,
          uniqueSessions,
          countriesCount,
          citiesCount
        })

        // Chart 1: Daily traffic over last 30 days
        const dayMap: Record<string, number> = {}
        const now = new Date()
        for (let i = 29; i >= 0; i--) {
          const d = new Date()
          d.setDate(now.getDate() - i)
          const dateString = d.toISOString().split('T')[0]
          dayMap[dateString] = 0
        }

        safeData.forEach((item: any) => {
          if (!item.created_at) return
          const day = new Date(item.created_at).toISOString().split('T')[0]
          if (dayMap[day] !== undefined) {
            dayMap[day] += 1
          }
        })

        const timeline = Object.keys(dayMap).map(key => {
          const [, month, day] = key.split('-')
          return {
            date: `${month}/${day}`,
            "Page Views": dayMap[key]
          }
        })
        setTimelineData(timeline)

        // Chart 2: Top Pages Visited (sorted Bar chart)
        const pageCounts: Record<string, number> = {}
        pageData?.forEach((row: any) => {
          const p = row.page || 'Unknown'
          pageCounts[p] = (pageCounts[p] || 0) + 1
        })
        const topPages = Object.entries(pageCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([page, count]) => ({ page, Views: count }))

        setTopPagesData(topPages)

        // Chart 3: Device breakdown
        const deviceCounts: Record<string, number> = {}
        deviceData?.forEach((row: any) => {
          if (row.device) deviceCounts[row.device] = (deviceCounts[row.device] || 0) + 1
        })

        const deviceChart = Object.keys(deviceCounts).map(key => ({
          name: key.toUpperCase(),
          value: deviceCounts[key]
        }))
        setDeviceDataChart(deviceChart)

        // Table 1: Referrers distribution
        const referrerMap: Record<string, number> = {}
        safeData.forEach((item: any) => {
          const ref = item.referrer || 'Direct'
          referrerMap[ref] = (referrerMap[ref] || 0) + 1
        })

        const referrers = Object.keys(referrerMap)
          .map(key => ({
            name: key,
            count: referrerMap[key],
            percent: totalViews > 0 ? ((referrerMap[key] / totalViews) * 100).toFixed(1) : '0'
          }))
          .sort((a, b) => b.count - a.count)

        setReferrersList(referrers)

        // Table 2: Geography breakdown
        const geoMap: Record<string, number> = {}
        safeData.forEach((item: any) => {
          if (item.country) {
            const label = item.city ? `${item.city}, ${item.country}` : item.country
            geoMap[label] = (geoMap[label] || 0) + 1
          }
        })

        const geo = Object.keys(geoMap)
          .map(key => ({
            location: key,
            views: geoMap[key]
          }))
          .sort((a, b) => b.views - a.views)
          .slice(0, 10) // Limit top 10

        setGeoList(geo)

      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [mounted])

  if (!mounted) return null

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-t-2 border-r-2 border-[#d4af37] rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-wider uppercase text-white">Marketing Analytics</h1>
        <p className="text-xs text-gray-500 tracking-wide uppercase mt-1">Privacy-preserving website usage telemetry</p>
      </div>

      {/* Analytics stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Page Views */}
        <div className="bg-[#0b0b0b] border border-white/5 p-6 rounded-2xl flex items-center gap-5 shadow-xl">
          <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center text-[#d4af37]">
            <Eye size={20} />
          </div>
          <div>
            <span className="text-[10px] tracking-wider text-gray-500 uppercase">Total Page Views</span>
            <h3 className="text-xl font-bold text-white mt-1">{metrics.pageViews.toLocaleString()}</h3>
          </div>
        </div>

        {/* Unique Sessions */}
        <div className="bg-[#0b0b0b] border border-white/5 p-6 rounded-2xl flex items-center gap-5 shadow-xl">
          <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center text-blue-400">
            <Fingerprint size={20} />
          </div>
          <div>
            <span className="text-[10px] tracking-wider text-gray-500 uppercase">Unique Sessions</span>
            <h3 className="text-xl font-bold text-white mt-1">{metrics.uniqueSessions.toLocaleString()}</h3>
          </div>
        </div>

        {/* Countries */}
        <div className="bg-[#0b0b0b] border border-white/5 p-6 rounded-2xl flex items-center gap-5 shadow-xl">
          <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center text-green-400">
            <Globe size={20} />
          </div>
          <div>
            <span className="text-[10px] tracking-wider text-gray-500 uppercase">Audience Countries</span>
            <h3 className="text-xl font-bold text-white mt-1">{metrics.countriesCount.toLocaleString()}</h3>
          </div>
        </div>

        {/* Cities */}
        <div className="bg-[#0b0b0b] border border-white/5 p-6 rounded-2xl flex items-center gap-5 shadow-xl">
          <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center text-purple-400">
            <MapPin size={20} />
          </div>
          <div>
            <span className="text-[10px] tracking-wider text-gray-500 uppercase">Audience Cities</span>
            <h3 className="text-xl font-bold text-white mt-1">{metrics.citiesCount.toLocaleString()}</h3>
          </div>
        </div>
      </div>

      {/* Primary Graphs Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timeline Chart */}
        <div className="lg:col-span-2 bg-[#0b0b0b] border border-white/5 p-6 rounded-2xl shadow-xl">
          <div className="mb-4">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Traffic Velocity</h4>
            <span className="text-[10px] text-gray-500 uppercase tracking-wide">Dynamic page hits timeline (Last 30 days)</span>
          </div>
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} />
                <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.05)' }} />
                <Line 
                  type="monotone" 
                  dataKey="Page Views" 
                  stroke="#d4af37" 
                  strokeWidth={2.5} 
                  dot={{ r: 3, fill: '#d4af37', strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Device breakdown PieChart */}
        <div className="bg-[#0b0b0b] border border-white/5 p-6 rounded-2xl shadow-xl flex flex-col justify-between">
          <div className="mb-4">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Firms / Form Factor</h4>
            <span className="text-[10px] text-gray-500 uppercase tracking-wide">Audience device distributions</span>
          </div>
          <div className="h-[180px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={deviceDataChart}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {deviceDataChart.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} stroke="rgba(0,0,0,0.5)" />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="mt-4 pt-4 border-t border-white/5 flex justify-center gap-6">
            {deviceDataChart.map((d, index) => (
              <div key={d.name} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}></div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  {d.name}: {d.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pages and Referrers breakdown Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Pages Horizontal Bar chart */}
        <div className="lg:col-span-1 bg-[#0b0b0b] border border-white/5 p-6 rounded-2xl shadow-xl">
          <div className="mb-4">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Top Pages</h4>
            <span className="text-[10px] text-gray-500 uppercase tracking-wide">Most frequently hit route URLs</span>
          </div>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topPagesData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis type="number" stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} />
                <YAxis dataKey="page" type="category" stroke="rgba(255,255,255,0.3)" fontSize={9} tickLine={false} width={80} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="Views" fill="#d4af37" radius={[0, 4, 4, 0]} maxBarSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Traffic Referrers Table */}
        <div className="bg-[#0b0b0b] border border-white/5 p-6 rounded-2xl shadow-xl flex flex-col justify-between">
          <div>
            <div className="mb-4">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Compass size={14} className="text-[#d4af37]" />
                <span>Traffic Referrers</span>
              </h4>
            </div>
            <div className="overflow-y-auto max-h-[220px]">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/5 text-gray-500 text-[9px] uppercase tracking-widest">
                    <th className="pb-2 font-semibold">Origin / Referrer</th>
                    <th className="pb-2 text-right font-semibold">Views</th>
                    <th className="pb-2 text-right font-semibold">Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {referrersList.map((ref) => (
                    <tr key={ref.name} className="hover:bg-white/[0.005]">
                      <td className="py-2 text-gray-300 font-semibold">{ref.name}</td>
                      <td className="py-2 text-right text-white font-bold">{ref.count}</td>
                      <td className="py-2 text-right text-gray-500 font-bold">{ref.percent}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Geographic footprint Table */}
        <div className="bg-[#0b0b0b] border border-white/5 p-6 rounded-2xl shadow-xl flex flex-col justify-between">
          <div>
            <div className="mb-4">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Laptop size={14} className="text-[#d4af37]" />
                <span>Geographic Footprint</span>
              </h4>
            </div>
            <div className="overflow-y-auto max-h-[220px]">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/5 text-gray-500 text-[9px] uppercase tracking-widest">
                    <th className="pb-2 font-semibold">Location (City, Country)</th>
                    <th className="pb-2 text-right font-semibold">Visits</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {geoList.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="py-4 text-center text-gray-500 uppercase tracking-wider text-[9px]">
                        No geo-logs mapped.
                      </td>
                    </tr>
                  ) : (
                    geoList.map((g) => (
                      <tr key={g.location} className="hover:bg-white/[0.005]">
                        <td className="py-2 text-gray-300 font-semibold">{g.location}</td>
                        <td className="py-2 text-right text-white font-bold">{g.views}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
