'use client'

import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  LineChart, 
  Line,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts'
import { 
  Users, 
  User,
  Eye, 
  Shield,
  Activity,
  ArrowRight,
  TrendingUp,
  Wallet
} from 'lucide-react'
import Link from 'next/link'

// Custom minimal tooltip for line chart
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: '#FFFFFF', border: '1px solid #E8E8E8', padding: '12px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
        <p style={{ fontSize: '12px', color: '#6B6B6B', fontWeight: '600', marginBottom: '8px', textTransform: 'uppercase' }}>{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ fontSize: '14px', fontWeight: 'bold', color: entry.color, margin: '4px 0' }}>
            {entry.name}: <span style={{ color: '#111111' }}>{entry.value.toLocaleString()}</span>
          </p>
        ))}
      </div>
    )
  }
  return null
}

export default function OverviewPage() {
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    fundBadge: 'Loading...',
    fundBalance: null as number | null,
    totalMembers: 0,
    totalPageViews: 0,
    approvedAssociates: 0
  })
  
  const [chartData, setChartData] = useState<any[]>([])
  const [activities, setActivities] = useState<any[]>([])
  const [recentAssociates, setRecentAssociates] = useState<any[]>([])

  const formatActivityTime = (isoString: string) => {
    try {
      const date = new Date(isoString)
      return date.toLocaleString('en-LK', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })
    } catch {
      return isoString
    }
  }

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    async function fetchDashboardData() {
      try {
        setLoading(true)

        // 1. Fetch Fund Status from Secure API Route
        let fundBadge = 'Error'
        let fundBalance = null
        try {
          const { data: { session } } = await supabase.auth.getSession()
          const token = session?.access_token

          const res = await fetch('/api/dashboard-kpis', {
            headers: token ? {
              'Authorization': `Bearer ${token}`
            } : {}
          })
          
          if (res.ok) {
            const data = await res.json()
            fundBadge = data.fundStatus?.badge || 'Unknown'
            fundBalance = data.fundStatus?.exact_balance ?? null
          }
        } catch (e) {
          console.error('Failed to fetch secure KPIs')
        }

        // 2. Fetch Total Members
        const { count: totalMembers } = await supabase.from('aisca_members').select('*', { count: 'exact', head: true })

        // 3. Fetch Total Page Views (Website Visitors)
        const { count: totalPageViews } = await supabase.from('site_analytics').select('*', { count: 'exact', head: true })

        // 4. Fetch Approved Associates
        const { count: approvedAssociates } = await supabase.from('associate_members').select('*', { count: 'exact', head: true }).eq('status', 'approved')

        setStats({
          fundBadge,
          fundBalance,
          totalMembers: totalMembers || 0,
          totalPageViews: totalPageViews || 0,
          approvedAssociates: approvedAssociates || 0
        })

        // 5. Chart Data: Organization Growth (Members + Traffic over 6 months)
        // For demonstration, we'll fetch historical members and traffic
        const now = new Date()
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        const last6Months: any[] = []
        for (let i = 5; i >= 0; i--) {
          const d = new Date()
          d.setMonth(now.getMonth() - i)
          last6Months.push({
            label: `${monthNames[d.getMonth()]}`,
            month: d.getMonth(),
            year: d.getFullYear(),
            "New Members": 0,
            "Page Views": 0
          })
        }

        const sixMonthsAgo = new Date()
        sixMonthsAgo.setMonth(now.getMonth() - 6)

        // Group members
        const { data: recentMembers } = await supabase.from('aisca_members').select('created_at').gte('created_at', sixMonthsAgo.toISOString())
        recentMembers?.forEach(m => {
          const d = new Date(m.created_at)
          const target = last6Months.find(x => x.month === d.getMonth() && x.year === d.getFullYear())
          if (target) target["New Members"]++
        })

        // Group traffic
        const { data: recentTraffic } = await supabase.from('site_analytics').select('visited_at').gte('visited_at', sixMonthsAgo.toISOString())
        recentTraffic?.forEach(v => {
          if (v.visited_at) {
            const d = new Date(v.visited_at)
            const target = last6Months.find(x => x.month === d.getMonth() && x.year === d.getFullYear())
            if (target) target["Page Views"]++
          }
        })

        setChartData(last6Months)

        // 6. Recent Activities
        let recentAssocs: any[] = []
        const { data: assocs } = await supabase.from('associate_members').select('id, full_name, created_at, status').order('created_at', { ascending: false }).limit(5)
        if (assocs) {
          recentAssocs = assocs
          setRecentAssociates(assocs)
        }

        let recentSchools: any[] = []
        const { data: schools } = await supabase.from('school_registrations').select('id, school_name, created_at, status').order('created_at', { ascending: false }).limit(5)
        if (schools) recentSchools = schools

        let recentAudits: any[] = []
        const { data: audits } = await supabase.from('audit_log').select('id, action, target_name, performed_by, reason, performed_at').order('performed_at', { ascending: false }).limit(5)
        if (audits) recentAudits = audits

        const assocActivities = recentAssocs.map(item => ({
          id: item.id, type: 'associate', title: 'Associate Registration', description: `${item.full_name} registered.`, timestamp: item.created_at
        }))
        const schoolActivities = recentSchools.map(item => ({
          id: item.id, type: 'school', title: 'School Registration', description: `${item.school_name} registered.`, timestamp: item.created_at
        }))
        const auditActivities = recentAudits.map(item => ({
          id: item.id, type: 'audit', title: item.action.replace(/_/g, ' '), description: `${item.performed_by} performed: ${item.target_name || 'N/A'}`, timestamp: item.performed_at
        }))

        const mergedActivities = [...assocActivities, ...schoolActivities, ...auditActivities]
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 10)
        
        setActivities(mergedActivities)

      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [mounted])

  if (!mounted) return null

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
        <div style={{ width: '32px', height: '32px', borderTop: '2px solid #111111', borderRight: '2px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  return (
    <div className="dashboard-page" style={{ display: 'flex', flexDirection: 'column', gap: '32px', padding: '32px', maxWidth: '1600px', margin: '0 auto' }}>
      
      <div className="admin-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid #E8E8E8', paddingBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', letterSpacing: '-0.02em', color: '#111111', margin: '0 0 8px 0' }}>Dashboard</h1>
          <p style={{ color: '#6B6B6B', fontSize: '14px', margin: 0 }}>Overview of AISCA organization metrics and activity.</p>
        </div>
      </div>

      {/* 4-Card KPI Row */}
      <div className="dashboard-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }}>
        
        {/* Card 1: Fund Status */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E8E8E8', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#F5F5F5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Wallet size={20} color="#111111" />
            </div>
            {stats.fundBalance !== null && (
              <span style={{ fontSize: '12px', fontWeight: '600', color: '#22C55E', background: 'rgba(34, 197, 94, 0.1)', padding: '4px 8px', borderRadius: '20px' }}>
                Executive View
              </span>
            )}
          </div>
          <div>
            <p style={{ fontSize: '12px', fontWeight: '600', color: '#6B6B6B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Fund Status</p>
            {stats.fundBalance !== null ? (
              <h2 style={{ fontSize: '28px', fontWeight: '700', color: '#111111', margin: 0 }}>
                LKR {stats.fundBalance.toLocaleString()}
              </h2>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: stats.fundBadge === 'Healthy' ? '#22C55E' : stats.fundBadge === 'Tight' ? '#F59E0B' : '#EF4444' }} />
                <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#111111', margin: 0 }}>
                  {stats.fundBadge}
                </h2>
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Total Members */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E8E8E8', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#F5F5F5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={20} color="#111111" />
          </div>
          <div>
            <p style={{ fontSize: '12px', fontWeight: '600', color: '#6B6B6B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Total Members</p>
            <h2 style={{ fontSize: '28px', fontWeight: '700', color: '#111111', margin: 0 }}>
              {stats.totalMembers.toLocaleString()}
            </h2>
          </div>
        </div>

        {/* Card 3: Website Visitors (Page Views) */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E8E8E8', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#F5F5F5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Eye size={20} color="#111111" />
          </div>
          <div>
            <p style={{ fontSize: '12px', fontWeight: '600', color: '#6B6B6B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Total Page Views</p>
            <h2 style={{ fontSize: '28px', fontWeight: '700', color: '#111111', margin: 0 }}>
              {stats.totalPageViews.toLocaleString()}
            </h2>
          </div>
        </div>

        {/* Card 4: Approved Associates */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E8E8E8', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#F5F5F5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={20} color="#111111" />
          </div>
          <div>
            <p style={{ fontSize: '12px', fontWeight: '600', color: '#6B6B6B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Approved Associates</p>
            <h2 style={{ fontSize: '28px', fontWeight: '700', color: '#111111', margin: 0 }}>
              {stats.approvedAssociates.toLocaleString()}
            </h2>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="dashboard-charts-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        
        {/* Organization Growth Chart */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E8E8E8', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#111111', margin: 0 }}>Organization Growth</h2>
            <div style={{ padding: '6px 12px', background: '#F5F5F5', borderRadius: '20px', fontSize: '12px', fontWeight: '600', color: '#6B6B6B' }}>
              Past 6 Months
            </div>
          </div>
          <div style={{ flex: 1, minHeight: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F0" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#A3A3A3' }} dy={10} />
                <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#A3A3A3' }} />
                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#A3A3A3' }} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F9F9F9' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                <Line yAxisId="left" type="monotone" dataKey="New Members" stroke="#111111" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                <Line yAxisId="right" type="monotone" dataKey="Page Views" stroke="#d4af37" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Associates */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E8E8E8', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#111111', margin: 0 }}>Recent Associates</h2>
            <Link href="/dashboard/associates" style={{ fontSize: '13px', color: '#6B6B6B', textDecoration: 'none', fontWeight: '500' }}>View All</Link>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
            {recentAssociates.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#A3A3A3', fontSize: '13px' }}>
                No recent associate registrations.
              </div>
            ) : (
              recentAssociates.map(assoc => (
                <div key={assoc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '16px', borderBottom: '1px solid #F5F5F5' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#F9F9F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <User size={16} color="#6B6B6B" />
                    </div>
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: '600', color: '#111111', margin: '0 0 2px 0' }}>{assoc.full_name}</p>
                      <p style={{ fontSize: '12px', color: '#A3A3A3', margin: 0 }}>{new Date(assoc.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <span style={{ 
                    padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase',
                    background: assoc.status === 'approved' ? 'rgba(34, 197, 94, 0.1)' : assoc.status === 'rejected' ? 'rgba(239, 68, 68, 0.1)' : '#F5F5F5',
                    color: assoc.status === 'approved' ? '#22C55E' : assoc.status === 'rejected' ? '#EF4444' : '#6B6B6B'
                  }}>
                    {assoc.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Full Width Activity Feed */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E8E8E8', borderRadius: '16px', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#111111', margin: 0 }}>System Activity Log</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#6B6B6B' }}>
            <Activity size={16} /> Live Feed
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          {activities.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#A3A3A3', fontSize: '14px' }}>
              No recent activity recorded.
            </div>
          ) : (
            activities.map((act, index) => (
              <div key={index} style={{ display: 'flex', gap: '20px', padding: '16px 0', borderBottom: index < activities.length - 1 ? '1px solid #F5F5F5' : 'none' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#F9F9F9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {act.type === 'associate' ? <User size={18} color="#111111" /> :
                   act.type === 'school' ? <TrendingUp size={18} color="#111111" /> :
                   <Shield size={18} color="#111111" />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#111111', margin: 0 }}>{act.title}</h4>
                    <span style={{ fontSize: '12px', color: '#A3A3A3' }}>{formatActivityTime(act.timestamp)}</span>
                  </div>
                  <p style={{ fontSize: '14px', color: '#6B6B6B', margin: 0, lineHeight: '1.5' }}>{act.description}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  )
}
