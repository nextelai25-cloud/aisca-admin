'use client'

import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  BarChart, 
  Bar, 
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
  GraduationCap, 
  ShoppingBag, 
  CircleDollarSign, 
  Shield,
  Activity,
  ArrowUp,
  ArrowDown
} from 'lucide-react'
import Link from 'next/link'

// Custom minimal tooltip
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: '#FFFFFF', border: '1px solid #E8E8E8', padding: '12px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
        <p style={{ fontSize: '12px', color: '#6B6B6B', fontWeight: '600', marginBottom: '8px', textTransform: 'uppercase' }}>{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ fontSize: '14px', fontWeight: 'bold', color: entry.color, margin: '4px 0' }}>
            {entry.name}: <span style={{ color: '#111111' }}>LKR {entry.value.toLocaleString()}</span>
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
    netBalance: 0,
    netBalanceChange: 0, // % change
    totalIncome: 0,
    incomeChange: 0,
    totalExpenses: 0,
    expenseChange: 0,
    totalMembers: 0,
    membersChange: 0
  })
  
  const [chartData, setChartData] = useState<any[]>([])
  const [chartFilter, setChartFilter] = useState<'Month' | '6 Months' | 'Year'>('6 Months')
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

        // 1. Members
        const { data: members, error: membersErr } = await supabase.from('aisca_members').select('created_at')
        const totalMembers = members?.length || 0
        // Mock members change for now as we don't always have deep historical members
        const membersChange = 5.2

        // 2. Finance Ledger (Income / Expenses)
        const { data: ledger } = await supabase.from('finance_ledger').select('type, amount, adjusted, created_at').eq('adjusted', false)
        
        let totalIncome = 0
        let totalExpenses = 0
        let lastMonthIncome = 0
        let lastMonthExpenses = 0

        const now = new Date()
        const oneMonthAgo = new Date()
        oneMonthAgo.setMonth(now.getMonth() - 1)
        const twoMonthsAgo = new Date()
        twoMonthsAgo.setMonth(now.getMonth() - 2)

        ledger?.forEach(entry => {
          const amt = Number(entry.amount || 0)
          const date = new Date(entry.created_at)
          
          if (entry.type === 'income') {
            totalIncome += amt
            if (date >= oneMonthAgo) {
              // Current month
            } else if (date >= twoMonthsAgo && date < oneMonthAgo) {
              lastMonthIncome += amt
            }
          } else if (entry.type === 'expense') {
            totalExpenses += amt
            if (date >= oneMonthAgo) {
            } else if (date >= twoMonthsAgo && date < oneMonthAgo) {
              lastMonthExpenses += amt
            }
          }
        })

        const netBalance = totalIncome - totalExpenses
        const lastMonthNet = lastMonthIncome - lastMonthExpenses
        
        const netBalanceChange = lastMonthNet === 0 ? 100 : ((netBalance - lastMonthNet) / Math.abs(lastMonthNet)) * 100
        const incomeChange = lastMonthIncome === 0 ? 100 : ((totalIncome - lastMonthIncome) / lastMonthIncome) * 100
        const expenseChange = lastMonthExpenses === 0 ? 100 : ((totalExpenses - lastMonthExpenses) / lastMonthExpenses) * 100

        setStats({
          netBalance,
          netBalanceChange,
          totalIncome,
          incomeChange,
          totalExpenses,
          expenseChange,
          totalMembers,
          membersChange
        })

        // 3. Chart Data (Last 6 Months grouped)
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        const last6Months: any[] = []
        for (let i = 5; i >= 0; i--) {
          const d = new Date()
          d.setMonth(now.getMonth() - i)
          last6Months.push({
            label: `${monthNames[d.getMonth()]} ${d.getFullYear()}`,
            month: d.getMonth(),
            year: d.getFullYear(),
            Income: 0,
            Expenses: 0
          })
        }

        ledger?.forEach(entry => {
          const d = new Date(entry.created_at)
          const amt = Number(entry.amount || 0)
          const targetMonth = last6Months.find(m => m.month === d.getMonth() && m.year === d.getFullYear())
          if (targetMonth) {
            if (entry.type === 'income') targetMonth.Income += amt
            if (entry.type === 'expense') targetMonth.Expenses += amt
          }
        })

        setChartData(last6Months)

        // 4. Recent Activities
        let recentAssocs: any[] = []
        const { data: assocs } = await supabase.from('associate_members').select('id, full_name, created_at, status').order('created_at', { ascending: false }).limit(5)
        if (assocs) recentAssocs = assocs

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

        // 5. Recent Associates Table
        const { data: assocTableData } = await supabase
          .from('associate_members')
          .select('id, full_name, school, district, status, created_at')
          .order('created_at', { ascending: false })
          .limit(5)
        
        if (assocTableData) setRecentAssociates(assocTableData)

      } catch (err) {
        console.error("Dashboard error:", err)
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
        <div style={{ width: '32px', height: '32px', border: '3px solid #E8E8E8', borderTopColor: '#111111', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  const TrendBadge = ({ value }: { value: number }) => {
    const isPositive = value >= 0
    return (
      <span style={{ 
        display: 'inline-flex', alignItems: 'center', gap: '2px', padding: '4px 8px', borderRadius: '20px',
        fontSize: '11px', fontWeight: '600',
        background: isPositive ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
        color: isPositive ? '#22C55E' : '#EF4444'
      }}>
        {isPositive ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
        {Math.abs(value).toFixed(1)}%
      </span>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
        {/* Featured Card */}
        <div style={{ background: '#111111', color: '#FFFFFF', padding: '24px', borderRadius: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '140px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '13px', color: '#A3A3A3', fontWeight: '500' }}>Net Balance</span>
            <TrendBadge value={stats.netBalanceChange} />
          </div>
          <h3 style={{ fontSize: '32px', fontWeight: '700', margin: '8px 0 0 0' }}>
            LKR {stats.netBalance.toLocaleString()}
          </h3>
        </div>

        {/* Regular Cards */}
        {[
          { label: 'Total Income', value: `LKR ${stats.totalIncome.toLocaleString()}`, change: stats.incomeChange },
          { label: 'Total Expenses', value: `LKR ${stats.totalExpenses.toLocaleString()}`, change: stats.expenseChange },
          { label: 'Total Members', value: stats.totalMembers.toLocaleString(), change: stats.membersChange }
        ].map((stat, i) => (
          <div key={i} style={{ background: '#FFFFFF', border: '1px solid #E8E8E8', padding: '24px', borderRadius: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '140px', transition: 'box-shadow 0.2s', cursor: 'default' }}
            onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)'}
            onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '13px', color: '#6B6B6B', fontWeight: '500' }}>{stat.label}</span>
              <TrendBadge value={stat.change} />
            </div>
            <h3 style={{ fontSize: '32px', fontWeight: '700', color: '#111111', margin: '8px 0 0 0' }}>
              {stat.value}
            </h3>
          </div>
        ))}
      </div>

      {/* Middle Row: Chart & Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }} className="md:grid-cols-[60%_calc(40%-24px)]">
        
        {/* Chart */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E8E8E8', borderRadius: '12px', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111111', margin: 0 }}>Income vs Expenses</h3>
            
            {/* Filter Pills */}
            <div style={{ display: 'flex', gap: '4px', background: '#F5F5F5', padding: '4px', borderRadius: '24px' }}>
              {['Month', '6 Months', 'Year'].map(filter => (
                <button
                  key={filter}
                  onClick={() => setChartFilter(filter as any)}
                  style={{
                    padding: '4px 12px', border: 'none', borderRadius: '20px', fontSize: '12px', fontWeight: '500', cursor: 'pointer',
                    background: chartFilter === filter ? '#111111' : 'transparent',
                    color: chartFilter === filter ? '#FFFFFF' : '#6B6B6B',
                    transition: 'all 0.2s'
                  }}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>
          
          <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F0" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B6B6B' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B6B6B' }} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F9F9F9' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                <Bar dataKey="Income" fill="#111111" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="Expenses" fill="#D1D5DB" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Activity Feed */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E8E8E8', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111111', margin: '0 0 24px 0' }}>Recent Activity</h3>
          
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {activities.length === 0 ? (
              <p style={{ color: '#6B6B6B', fontSize: '14px', textAlign: 'center' }}>No recent activities.</p>
            ) : (
              activities.map(act => {
                let Icon = Activity
                if (act.type === 'associate') Icon = User
                if (act.type === 'school') Icon = GraduationCap
                if (act.type === 'audit') Icon = Shield

                return (
                  <div key={act.id} style={{ display: 'flex', gap: '16px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#F5F5F5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={16} color="#111111" />
                    </div>
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: '500', color: '#111111', margin: '0 0 4px 0' }}>{act.title}</p>
                      <p style={{ fontSize: '13px', color: '#6B6B6B', margin: '0 0 4px 0' }}>{act.description}</p>
                      <p style={{ fontSize: '11px', color: '#A3A3A3', margin: 0 }}>{formatActivityTime(act.timestamp)}</p>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row: Recent Associates Table */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E8E8E8', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ padding: '24px', borderBottom: '1px solid #F0F0F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111111', margin: 0 }}>Recent Associates</h3>
          <Link href="/dashboard/associates" style={{ fontSize: '13px', fontWeight: '500', color: '#111111', textDecoration: 'none' }}>
            View All →
          </Link>
        </div>
        
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F9F9F9' }}>
                {['Name', 'School', 'District', 'Status', 'Date'].map((th, i) => (
                  <th key={i} style={{ padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6B6B6B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {th}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentAssociates.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#6B6B6B', fontSize: '14px' }}>No associates found.</td>
                </tr>
              ) : (
                recentAssociates.map(assoc => (
                  <tr key={assoc.id} style={{ borderBottom: '1px solid #F0F0F0' }}>
                    <td style={{ padding: '16px 24px', fontSize: '14px', color: '#111111', fontWeight: '500' }}>{assoc.full_name}</td>
                    <td style={{ padding: '16px 24px', fontSize: '14px', color: '#6B6B6B' }}>{assoc.school}</td>
                    <td style={{ padding: '16px 24px', fontSize: '14px', color: '#6B6B6B' }}>{assoc.district}</td>
                    <td style={{ padding: '16px 24px' }}>
                      <span style={{ 
                        padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase',
                        background: assoc.status === 'approved' ? 'rgba(34, 197, 94, 0.1)' : assoc.status === 'rejected' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                        color: assoc.status === 'approved' ? '#22C55E' : assoc.status === 'rejected' ? '#EF4444' : '#F59E0B'
                      }}>
                        {assoc.status}
                      </span>
                    </td>
                    <td style={{ padding: '16px 24px', fontSize: '13px', color: '#6B6B6B' }}>
                      {new Date(assoc.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
