'use client'

import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
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
      <div className="bg-[#FBFBFD] border border-[#E5E5EA] p-3 rounded-control shadow-card text-body">
        <p className="text-caption tracking-[0.04em] text-[#6E6E73] uppercase mb-1">{label}</p>
        <p className="font-bold text-[#1D1D1F]">
          {payload[0].name}: <span className="text-[#8A6D1C]">{payload[0].value.toLocaleString()}</span>
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
 
        // 1. Total views
        const { count: views } = await supabase
          .from('site_analytics')
          .select('*', { count: 'exact', head: true })
 
        // 2. Unique sessions
        const { data: sessionData } = await supabase
          .from('site_analytics')
          .select('session_id')
        const unique = new Set(sessionData?.map(s => s.session_id) || []).size
 
        // 3. Geographic info
        const { data: geoData } = await supabase
          .from('site_analytics')
          .select('country, city')
        const countriesCount = new Set(geoData?.map(g => g.country).filter(Boolean) || []).size
        const citiesCount = new Set(geoData?.map(g => `${g.city}, ${g.country}`).filter(Boolean) || []).size
 
        setMetrics({
          pageViews: views || 0,
          uniqueSessions: unique,
          countriesCount,
          citiesCount
        })
 
        // 4. Traffic velocity — last 30 days
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        
        const { data: recentViews } = await supabase
          .from('site_analytics')
          .select('visited_at')
          .gte('visited_at', thirtyDaysAgo.toISOString())
          .order('visited_at', { ascending: true })
 
        // Group by date
        const dateCounts: Record<string, number> = {}
        const now = new Date()
        for (let i = 29; i >= 0; i--) {
          const d = new Date()
          d.setDate(now.getDate() - i)
          const dateString = d.toISOString().split('T')[0]
          dateCounts[dateString] = 0
        }
 
        recentViews?.forEach(v => {
          if (v.visited_at) {
            const date = v.visited_at.split('T')[0]
            if (dateCounts[date] !== undefined) {
              dateCounts[date] += 1
            }
          }
        })
        const chartData = Object.entries(dateCounts).map(([date, count]) => {
          const [, month, day] = date.split('-')
          return {
            date: `${month}/${day}`,
            "Page Views": count
          }
        })
        setTimelineData(chartData)
 
        // 5. Top pages
        const { data: pageRows } = await supabase
          .from('site_analytics')
          .select('page')
        const pageCounts: Record<string, number> = {}
        pageRows?.forEach(r => { 
          const p = r.page || 'Unknown'
          pageCounts[p] = (pageCounts[p] || 0) + 1 
        })
        const topPages = Object.entries(pageCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(([page, count]) => ({ page, Views: count }))
        setTopPagesData(topPages)
 
        // 6. Devices
        const { data: deviceRows } = await supabase
          .from('site_analytics')
          .select('device')
        const deviceCounts: Record<string, number> = {}
        deviceRows?.forEach(r => { if(r.device) deviceCounts[r.device] = (deviceCounts[r.device] || 0) + 1 })
        setDeviceDataChart(Object.entries(deviceCounts).map(([name, value]) => ({ name: name.toUpperCase(), value })))
 
        // 7. Referrers
        const { data: refRows } = await supabase
          .from('site_analytics')
          .select('referrer')
          .not('referrer', 'is', null)
        const refCounts: Record<string, number> = {}
        refRows?.forEach(r => { if(r.referrer) refCounts[r.referrer] = (refCounts[r.referrer] || 0) + 1 })
        const totalRef = refRows?.length || 1
        const referrers = Object.entries(refCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(([source, count]) => ({ 
            name: source, 
            count, 
            percent: ((count / totalRef) * 100).toFixed(1)
          }))
        setReferrersList(referrers)
 
        // 8. Geography Footprint list
        const geoMap: Record<string, number> = {}
        geoData?.forEach(item => {
          if (item.country) {
            const label = item.city ? `${item.city}, ${item.country}` : item.country
            geoMap[label] = (geoMap[label] || 0) + 1
          }
        })
        const geo = Object.entries(geoMap)
          .map(([location, viewsCount]) => ({ location, views: viewsCount }))
          .sort((a, b) => b.views - a.views)
          .slice(0, 10)
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
        <h1 className="text-large-title font-bold tracking-tight text-[#1D1D1F]">Marketing Analytics</h1>
        <p className="text-body text-[#6E6E73] mt-1">Privacy-preserving website usage telemetry</p>
      </div>

      {/* Analytics stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 analytics-stats-grid">
        {/* Total Page Views */}
        <div className="bg-[#FFFFFF] border border-[#E5E5EA] p-6 rounded-card flex items-center gap-5 shadow-card">
          <div className="w-12 h-12 bg-[#F5F5F7] rounded-control flex items-center justify-center text-[#8A6D1C]">
            <Eye size={20} />
          </div>
          <div>
            <span className="text-caption tracking-[0.04em] text-[#6E6E73] uppercase">Total Page Views</span>
            <h3 className="text-large-title font-semibold tabular-nums text-[#1D1D1F] mt-1">{metrics.pageViews.toLocaleString()}</h3>
          </div>
        </div>

        {/* Unique Sessions */}
        <div className="bg-[#FFFFFF] border border-[#E5E5EA] p-6 rounded-card flex items-center gap-5 shadow-card">
          <div className="w-12 h-12 bg-[#F5F5F7] rounded-control flex items-center justify-center text-blue-400">
            <Fingerprint size={20} />
          </div>
          <div>
            <span className="text-caption tracking-[0.04em] text-[#6E6E73] uppercase">Unique Sessions</span>
            <h3 className="text-large-title font-semibold tabular-nums text-[#1D1D1F] mt-1">{metrics.uniqueSessions.toLocaleString()}</h3>
          </div>
        </div>

        {/* Countries */}
        <div className="bg-[#FFFFFF] border border-[#E5E5EA] p-6 rounded-card flex items-center gap-5 shadow-card">
          <div className="w-12 h-12 bg-[#F5F5F7] rounded-control flex items-center justify-center text-green-400">
            <Globe size={20} />
          </div>
          <div>
            <span className="text-caption tracking-[0.04em] text-[#6E6E73] uppercase">Audience Countries</span>
            <h3 className="text-large-title font-semibold tabular-nums text-[#1D1D1F] mt-1">{metrics.countriesCount.toLocaleString()}</h3>
          </div>
        </div>

        {/* Cities */}
        <div className="bg-[#FFFFFF] border border-[#E5E5EA] p-6 rounded-card flex items-center gap-5 shadow-card">
          <div className="w-12 h-12 bg-[#F5F5F7] rounded-control flex items-center justify-center text-purple-400">
            <MapPin size={20} />
          </div>
          <div>
            <span className="text-caption tracking-[0.04em] text-[#6E6E73] uppercase">Audience Cities</span>
            <h3 className="text-large-title font-semibold tabular-nums text-[#1D1D1F] mt-1">{metrics.citiesCount.toLocaleString()}</h3>
          </div>
        </div>
      </div>

      {/* Primary Graphs Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 analytics-charts-grid">
        {/* Timeline Chart */}
        <div className="lg:col-span-2 bg-[#FFFFFF] border border-[#E5E5EA] p-6 rounded-card shadow-card">
          <div className="mb-4">
            <h4 className="text-body font-bold text-[#1D1D1F] ">Traffic Velocity</h4>
            <span className="text-caption text-[#6E6E73] uppercase tracking-[0.04em]">Dynamic page hits timeline (Last 30 days)</span>
          </div>
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#FFFFFF" />
                <XAxis dataKey="date" stroke="#6E6E73" fontSize={10} tickLine={false} />
                <YAxis stroke="#6E6E73" fontSize={10} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#F5F5F7' }} />
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
        <div className="bg-[#FFFFFF] border border-[#E5E5EA] p-6 rounded-card shadow-card flex flex-col justify-between">
          <div className="mb-4">
            <h4 className="text-body font-bold text-[#1D1D1F] ">Firms / Form Factor</h4>
            <span className="text-caption text-[#6E6E73] uppercase tracking-[0.04em]">Audience device distributions</span>
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
          <div className="mt-4 pt-4 border-t border-[#E5E5EA] flex justify-center gap-6">
            {deviceDataChart.map((d, index) => (
              <div key={d.name} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}></div>
                <span className="text-caption font-bold text-[#6E6E73] uppercase tracking-[0.04em]">
                  {d.name}: {d.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pages and Referrers breakdown Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 analytics-bottom-grid">
        {/* Top Pages Horizontal Bar chart */}
        <div className="lg:col-span-1 bg-[#FFFFFF] border border-[#E5E5EA] p-6 rounded-card shadow-card">
          <div className="mb-4">
            <h4 className="text-body font-bold text-[#1D1D1F] ">Top Pages</h4>
            <span className="text-caption text-[#6E6E73] uppercase tracking-[0.04em]">Most frequently hit route URLs</span>
          </div>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topPagesData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#FFFFFF" />
                <XAxis type="number" stroke="#6E6E73" fontSize={10} tickLine={false} />
                <YAxis dataKey="page" type="category" stroke="#6E6E73" fontSize={9} tickLine={false} width={80} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="Views" fill="#d4af37" radius={[0, 4, 4, 0]} maxBarSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Traffic Referrers Table */}
        <div className="bg-[#FFFFFF] border border-[#E5E5EA] p-6 rounded-card shadow-card flex flex-col justify-between">
          <div>
            <div className="mb-4">
              <h4 className="text-body font-bold text-[#1D1D1F] capitalize flex items-center gap-2">
                <Compass size={14} className="text-[#8A6D1C]" />
                <span>Traffic Referrers</span>
              </h4>
            </div>
            <div className="overflow-y-auto max-h-[220px]">
              <table className="w-full text-left text-body">
                <thead>
                  <tr className="border-b border-[#E5E5EA] text-[#6E6E73] text-caption uppercase tracking-[0.04em]">
                    <th className="pb-2 font-semibold">Origin / Referrer</th>
                    <th className="pb-2 text-right font-semibold">Views</th>
                    <th className="pb-2 text-right font-semibold">Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E5EA]">
                  {referrersList.map((ref) => (
                    <tr key={ref.name} className="hover:bg-[#FBFBFD]">
                      <td className="py-2 text-[#1D1D1F] font-semibold">{ref.name}</td>
                      <td className="py-2 text-right text-[#1D1D1F] font-bold">{ref.count}</td>
                      <td className="py-2 text-right text-[#6E6E73] font-bold">{ref.percent}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Geographic footprint Table */}
        <div className="bg-[#FFFFFF] border border-[#E5E5EA] p-6 rounded-card shadow-card flex flex-col justify-between">
          <div>
            <div className="mb-4">
              <h4 className="text-body font-bold text-[#1D1D1F] capitalize flex items-center gap-2">
                <Laptop size={14} className="text-[#8A6D1C]" />
                <span>Geographic Footprint</span>
              </h4>
            </div>
            <div className="overflow-y-auto max-h-[220px]">
              <table className="w-full text-left text-body">
                <thead>
                  <tr className="border-b border-[#E5E5EA] text-[#6E6E73] text-caption uppercase tracking-[0.04em]">
                    <th className="pb-2 font-semibold">Location (City, Country)</th>
                    <th className="pb-2 text-right font-semibold">Visits</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E5EA]">
                  {geoList.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="py-4 text-center text-[#6E6E73] uppercase tracking-[0.04em] text-caption">
                        No geo-logs mapped.
                      </td>
                    </tr>
                  ) : (
                    geoList.map((g) => (
                      <tr key={g.location} className="hover:bg-[#FBFBFD]">
                        <td className="py-2 text-[#1D1D1F] font-semibold">{g.location}</td>
                        <td className="py-2 text-right text-[#1D1D1F] font-bold">{g.views}</td>
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
