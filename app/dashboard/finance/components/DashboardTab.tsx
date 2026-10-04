'use client'

import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { TrendingUp, TrendingDown, CircleDollarSign, Activity, ArrowUp, ArrowDown } from 'lucide-react'

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: '#FFFFFF', border: '1px solid #E5E5EA', padding: '12px', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
        <p style={{ fontSize: '13px', color: '#6E6E73', fontWeight: '600', marginBottom: '8px', textTransform: 'capitalize' }}>{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ fontSize: '13px', fontWeight: 'bold', color: entry.color, margin: '4px 0' }}>
            {entry.name}: <span style={{ color: '#1D1D1F' }}>LKR {entry.value.toLocaleString()}</span>
          </p>
        ))}
      </div>
    )
  }
  return null
}

export default function DashboardTab() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ totalIncome: 0, totalExpenses: 0, netBalance: 0 })
  const [chartData, setChartData] = useState<any[]>([])
  const [activities, setActivities] = useState<any[]>([])

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch all unadjusted ledger entries for aggregates and charts
        const { data: ledger } = await supabase.from('finance_ledger').select('type, amount, adjusted, created_at, date, description, category').eq('adjusted', false)
        
        let inc = 0
        let exp = 0
        const monthlyMap: Record<string, { income: number; expense: number }> = {}

        ledger?.forEach(entry => {
          const amt = Number(entry.amount || 0)
          if (entry.type === 'income') inc += amt
          else if (entry.type === 'expense') exp += amt

          // Group for chart (last 6 months)
          const d = new Date(entry.date)
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
          if (!monthlyMap[key]) monthlyMap[key] = { income: 0, expense: 0 }
          if (entry.type === 'income') monthlyMap[key].income += amt
          if (entry.type === 'expense') monthlyMap[key].expense += amt
        })

        setStats({ totalIncome: inc, totalExpenses: exp, netBalance: inc - exp })

        // Process Chart Data (Last 6 Months strictly)
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        const last6Months: any[] = []
        const now = new Date()
        for (let i = 5; i >= 0; i--) {
          const d = new Date()
          d.setMonth(now.getMonth() - i)
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
          last6Months.push({
            label: `${monthNames[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`,
            Income: monthlyMap[key]?.income || 0,
            Expenses: monthlyMap[key]?.expense || 0
          })
        }
        setChartData(last6Months)

        // Fetch all ledger for activity (including adjusted)
        const { data: recentLedger } = await supabase.from('finance_ledger').select('*').order('created_at', { ascending: false }).limit(10)
        setActivities(recentLedger || [])

      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
        <div style={{ width: '32px', height: '32px', border: '3px solid #E5E5EA', borderTopColor: '#1D1D1F', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Bank opening / re-correction note */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '16px 16px', borderRadius: '16px', background: '#FBF7EC', border: '1px solid #EBDFBD' }}>
        <span style={{ fontSize: '15px', lineHeight: 1 }}>🏦</span>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#1D1D1F', marginBottom: '4px' }}>
            Bank account opened · Opening balance Rs. 5,000
          </div>
          <div style={{ fontSize: '13px', color: '#6E6E73', lineHeight: 1.5 }}>
            The ledger has been re-corrected to real bank values from this point onward. All earlier entries are kept in Transactions for records but are excluded from the live balance.
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
        <div style={{ background: '#1D1D1F', border: '1px solid #1D1D1F', padding: '24px', borderRadius: '16px', color: '#FFFFFF' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '13px', color: '#6E6E73', fontWeight: '500' }}>Net Balance</span>
            <CircleDollarSign size={20} color="#FFFFFF" />
          </div>
          <h3 style={{ fontSize: '28px', fontWeight: '700', margin: '16px 0 0 0' }}>LKR {stats.netBalance.toLocaleString()}</h3>
        </div>
        
        <div style={{ background: '#FFFFFF', border: '1px solid #E5E5EA', padding: '24px', borderRadius: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '13px', color: '#6E6E73', fontWeight: '500' }}>Total Revenue</span>
            <TrendingUp size={20} color="#22C55E" />
          </div>
          <h3 style={{ fontSize: '28px', fontWeight: '700', color: '#1D1D1F', margin: '16px 0 0 0' }}>LKR {stats.totalIncome.toLocaleString()}</h3>
        </div>

        <div style={{ background: '#FFFFFF', border: '1px solid #E5E5EA', padding: '24px', borderRadius: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '13px', color: '#6E6E73', fontWeight: '500' }}>Total Expenses</span>
            <TrendingDown size={20} color="#EF4444" />
          </div>
          <h3 style={{ fontSize: '28px', fontWeight: '700', color: '#1D1D1F', margin: '16px 0 0 0' }}>LKR {stats.totalExpenses.toLocaleString()}</h3>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }} className="md:grid-cols-[60%_calc(40%-24px)]">
        {/* Chart */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E5E5EA', borderRadius: '16px', padding: '24px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#1D1D1F', margin: '0 0 24px 0' }}>Income vs Expenses (6 Months)</h3>
          <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F2F2F7" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6E6E73' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6E6E73' }} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#FBFBFD' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '13px', paddingTop: '20px' }} />
                <Bar dataKey="Income" fill="#1D1D1F" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="Expenses" fill="#D1D5DB" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E5E5EA', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#1D1D1F', margin: '0 0 24px 0' }}>Finance Activity Feed</h3>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {activities.length === 0 ? (
              <p style={{ color: '#6E6E73', fontSize: '13px', textAlign: 'center' }}>No recent activities.</p>
            ) : (
              activities.map(act => (
                <div key={act.id} style={{ display: 'flex', gap: '16px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#F5F5F7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Activity size={16} color="#1D1D1F" />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <p style={{ fontSize: '13px', fontWeight: '500', color: '#1D1D1F', margin: 0 }}>
                        {act.type === 'income' ? 'Income Logged' : 'Expense Logged'}
                      </p>
                      {act.adjusted && (
                        <span style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: '#C93400', background: 'rgba(245, 158, 11, 0.1)', padding: '2px 8px', borderRadius: '16px' }}>Adjusted</span>
                      )}
                    </div>
                    <p style={{ fontSize: '13px', color: '#6E6E73', margin: '0 0 4px 0' }}>{act.description} — <strong style={{ color: act.type === 'income' ? '#22C55E' : '#EF4444' }}>LKR {Number(act.amount).toLocaleString()}</strong></p>
                    <p style={{ fontSize: '11px', color: '#6E6E73', margin: 0 }}>{new Date(act.created_at).toLocaleString('en-LK')}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
