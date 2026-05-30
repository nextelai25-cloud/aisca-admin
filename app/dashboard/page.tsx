'use client'

import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts'
import { 
  Users, 
  GraduationCap, 
  ShoppingBag, 
  CircleDollarSign, 
  Clock, 
  CalendarDays,
  User,
  Shield,
  Activity
} from 'lucide-react'

// Custom premium dark tooltip
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#121212] border border-white/10 p-3 rounded-lg shadow-xl">
        <p className="text-[10px] tracking-wider text-gray-500 uppercase mb-1">{label}</p>
        <p className="text-sm font-bold text-white">
          {payload[0].name}: <span className="text-[#d4af37]">{payload[0].value.toLocaleString()}</span>
        </p>
      </div>
    )
  }
  return null
}

export default function OverviewPage() {
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalMembers: 0,
    totalAssociates: 0,
    totalSchools: 0,
    totalOrders: 0,
    totalRevenue: 0,
    netBalance: 0,
    pendingApprovals: 0,
    monthRegistrations: 0
  })
  
  const [registrationChartData, setRegistrationChartData] = useState<any[]>([])
  const [productChartData, setProductChartData] = useState<any[]>([])
  const [activities, setActivities] = useState<any[]>([])

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

    async function fetchDashboardStats() {
      try {
        setLoading(true)

        // 0. Fetch Total Members data
        let totalMembers = 0
        try {
          const { count, error } = await supabase
            .from('aisca_members')
            .select('*', { count: 'exact', head: true })
          if (error) console.error("Members fetch error:", error)
          if (count !== null) totalMembers = count
        } catch (err) {
          console.error("Failed to query aisca_members:", err)
        }

        // 1. Fetch Associate Members data
        let associates: any[] = []
        try {
          const { data, error } = await supabase
            .from('associate_members')
            .select('created_at, status')
          if (error) console.error("Associates fetch error:", error)
          if (data) associates = data
        } catch (err) {
          console.error("Failed to query associate_members:", err)
        }

        // 2. Fetch School Registrations data
        let schools: any[] = []
        try {
          const { data, error } = await supabase
            .from('school_registrations')
            .select('created_at, status')
          if (error) console.error("Schools fetch error:", error)
          if (data) schools = data
        } catch (err) {
          console.error("Failed to query school_registrations:", err)
        }

        // 3. Fetch Product Orders data
        let orders: any[] = []
        try {
          const { data, error } = await supabase
            .from('product_orders')
            .select('created_at, total_amount, quantity, product_name')
          if (error) console.error("Orders fetch error:", error)
          if (data) orders = data
        } catch (err) {
          console.error("Failed to query product_orders:", err)
        }

        // 3.5 Fetch Net Balance from finance_ledger
        let netBalance = 0
        try {
          const { data, error } = await supabase
            .from('finance_ledger')
            .select('type, amount, adjusted')
          if (error) console.error("Finance fetch error:", error)
          if (data) {
            const totalIncome = data
              .filter(e => e.type === 'income' && !e.adjusted)
              .reduce((s, e) => s + Number(e.amount || 0), 0)
            const totalExpense = data
              .filter(e => e.type === 'expense' && !e.adjusted)
              .reduce((s, e) => s + Number(e.amount || 0), 0)
            netBalance = totalIncome - totalExpense
          }
        } catch (err) {
          console.error("Failed to query finance_ledger for netBalance:", err)
        }

        const safeAssocs = associates
        const safeSchools = schools
        const safeOrders = orders

        // Total Counts
        const totalAssociates = safeAssocs.length
        const totalSchools = safeSchools.length
        const totalOrders = safeOrders.length

        // Total Revenue calculation
        const totalRevenue = safeOrders.reduce((sum, ord) => sum + Number(ord.total_amount || 0), 0)

        // Pending Approvals count (both associates and schools)
        const pendingAssocs = safeAssocs.filter(m => m.status === 'pending').length
        const pendingSchools = safeSchools.filter(s => s.status === 'pending').length
        const pendingApprovals = pendingAssocs + pendingSchools

        // This Month's registrations
        const currentMonth = new Date().getMonth()
        const currentYear = new Date().getFullYear()
        
        const thisMonthAssocs = safeAssocs.filter(m => {
          const d = new Date(m.created_at)
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear
        }).length

        const thisMonthSchools = safeSchools.filter(s => {
          const d = new Date(s.created_at)
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear
        }).length

        const monthRegistrations = thisMonthAssocs + thisMonthSchools

        setStats({
          totalMembers,
          totalAssociates,
          totalSchools,
          totalOrders,
          totalRevenue,
          netBalance,
          pendingApprovals,
          monthRegistrations
        })

        // Chart 1: Registrations over time (last 30 days)
        const dayMap: Record<string, number> = {}
        const now = new Date()
        for (let i = 29; i >= 0; i--) {
          const d = new Date()
          d.setDate(now.getDate() - i)
          const dateString = d.toISOString().split('T')[0]
          dayMap[dateString] = 0
        }

        // Aggregate associate signups
        safeAssocs.forEach(m => {
          const day = new Date(m.created_at).toISOString().split('T')[0]
          if (dayMap[day] !== undefined) {
            dayMap[day] += 1
          }
        })

        // Aggregate school signups
        safeSchools.forEach(s => {
          const day = new Date(s.created_at).toISOString().split('T')[0]
          if (dayMap[day] !== undefined) {
            dayMap[day] += 1
          }
        })

        const registrationChart = Object.keys(dayMap).map(key => {
          const [, month, day] = key.split('-')
          return {
            date: `${month}/${day}`,
            "Sign-ups": dayMap[key]
          }
        })
        setRegistrationChartData(registrationChart)

        // Chart 2: Product distribution by quantity sold
        const productMap: Record<string, number> = {}
        safeOrders.forEach(ord => {
          const prodName = ord.product_name || 'Unknown Item'
          productMap[prodName] = (productMap[prodName] || 0) + Number(ord.quantity || 1)
        })

        const productChart = Object.keys(productMap).map(key => ({
          product: key,
          "Quantity": productMap[key]
        }))
        setProductChartData(productChart)

        // 4. Fetch Recent Activities (recent 5 from each)
        let recentAssocs: any[] = []
        try {
          const { data, error } = await supabase
            .from('associate_members')
            .select('id, full_name, created_at, status')
            .order('created_at', { ascending: false })
            .limit(5)
          if (!error && data) recentAssocs = data
        } catch (e) {
          console.error("Error fetching recent assocs:", e)
        }

        let recentSchools: any[] = []
        try {
          const { data, error } = await supabase
            .from('school_registrations')
            .select('id, school_name, created_at, status')
            .order('created_at', { ascending: false })
            .limit(5)
          if (!error && data) recentSchools = data
        } catch (e) {
          console.error("Error fetching recent schools:", e)
        }

        let recentOrders: any[] = []
        try {
          const { data, error } = await supabase
            .from('product_orders')
            .select('id, order_number, customer_name, product_name, total_amount, created_at')
            .order('created_at', { ascending: false })
            .limit(5)
          if (!error && data) recentOrders = data
        } catch (e) {
          console.error("Error fetching recent orders:", e)
        }

        let recentAudits: any[] = []
        try {
          const { data, error } = await supabase
            .from('audit_log')
            .select('id, action, target_name, performed_by, reason, performed_at')
            .order('performed_at', { ascending: false })
            .limit(5)
          if (!error && data) recentAudits = data
        } catch (e) {
          console.error("Error fetching recent audits:", e)
        }

        const assocActivities = recentAssocs.map(item => ({
          id: item.id,
          type: 'associate',
          title: 'New Associate Registration',
          description: `${item.full_name} registered as an associate member.`,
          timestamp: item.created_at,
          status: item.status
        }))

        const schoolActivities = recentSchools.map(item => ({
          id: item.id,
          type: 'school',
          title: 'New School Registration',
          description: `${item.school_name} registered as a school member.`,
          timestamp: item.created_at,
          status: item.status
        }))

        const orderActivities = recentOrders.map(item => ({
          id: item.id,
          type: 'order',
          title: `Merchandise Order #${item.order_number}`,
          description: `${item.customer_name} ordered ${item.product_name} (LKR ${Number(item.total_amount).toLocaleString()}).`,
          timestamp: item.created_at
        }))

        const auditActivities = recentAudits.map(item => ({
          id: item.id,
          type: 'audit',
          title: item.action.replace(/_/g, ' '),
          description: `${item.performed_by} performed: ${item.target_name || 'N/A'}${item.reason ? ` (${item.reason})` : ''}`,
          timestamp: item.performed_at
        }))

        const mergedActivities = [
          ...assocActivities,
          ...schoolActivities,
          ...orderActivities,
          ...auditActivities
        ]
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 10)

        setActivities(mergedActivities)

      } catch (err) {
        console.error("Dashboard error:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardStats()
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
    <div className="space-y-8 animate-fade-in dashboard-page">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-wider uppercase text-white">Board Dashboard</h1>
        <p className="text-xs text-gray-500 tracking-wide uppercase mt-1">Real-time Operations & Activity Overview</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 dashboard-stats-grid">
        {/* Stat 0: Total Members */}
        <div className="bg-[#0b0b0b] border border-white/5 p-6 rounded-2xl flex items-center gap-5 shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
          <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center text-teal-400">
            <span className="text-xl">👥</span>
          </div>
          <div>
            <span className="text-[10px] tracking-wider text-gray-500 uppercase">Total Members</span>
            <h3 className="text-2xl font-bold text-white mt-1">{stats.totalMembers.toLocaleString()}</h3>
          </div>
        </div>

        {/* Stat 1: Total Associates */}
        <div className="bg-[#0b0b0b] border border-white/5 p-6 rounded-2xl flex items-center gap-5 shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
          <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center text-[#d4af37]">
            <Users size={20} />
          </div>
          <div>
            <span className="text-[10px] tracking-wider text-gray-500 uppercase">Total Associates</span>
            <h3 className="text-2xl font-bold text-white mt-1">{stats.totalAssociates.toLocaleString()}</h3>
          </div>
        </div>

        {/* Stat 2: Total Schools */}
        <div className="bg-[#0b0b0b] border border-white/5 p-6 rounded-2xl flex items-center gap-5 shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
          <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center text-blue-400">
            <GraduationCap size={20} />
          </div>
          <div>
            <span className="text-[10px] tracking-wider text-gray-500 uppercase">Registered Schools</span>
            <h3 className="text-2xl font-bold text-white mt-1">{stats.totalSchools.toLocaleString()}</h3>
          </div>
        </div>

        {/* Stat 3: Total Orders */}
        <div className="bg-[#0b0b0b] border border-white/5 p-6 rounded-2xl flex items-center gap-5 shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
          <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center text-green-400">
            <ShoppingBag size={20} />
          </div>
          <div>
            <span className="text-[10px] tracking-wider text-gray-500 uppercase">Product Orders</span>
            <h3 className="text-2xl font-bold text-white mt-1">{stats.totalOrders.toLocaleString()}</h3>
          </div>
        </div>

        {/* Stat 4: Total Revenue */}
        <div className="bg-[#0b0b0b] border border-white/5 p-6 rounded-2xl flex items-center gap-5 shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
          <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center text-amber-500">
            <CircleDollarSign size={20} />
          </div>
          <div>
            <span className="text-[10px] tracking-wider text-gray-500 uppercase">Total Revenue</span>
            <h3 className="text-2xl font-bold text-white mt-1">LKR {stats.totalRevenue.toLocaleString()}</h3>
          </div>
        </div>

        {/* Stat 4.5: Net Balance */}
        <div className="bg-[#0b0b0b] border border-white/5 p-6 rounded-2xl flex items-center gap-5 shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
          <div className={`w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center ${stats.netBalance >= 0 ? 'text-[#d4af37]' : 'text-red-500'}`}>
            <CircleDollarSign size={20} />
          </div>
          <div>
            <span className="text-[10px] tracking-wider text-gray-500 uppercase">Net Balance</span>
            <h3 className={`text-2xl font-bold mt-1 ${stats.netBalance >= 0 ? 'text-white' : 'text-red-400'}`}>
              LKR {stats.netBalance.toLocaleString()}
            </h3>
          </div>
        </div>

        {/* Stat 5: Pending Approvals */}
        <div className="bg-[#0b0b0b] border border-white/5 p-6 rounded-2xl flex items-center gap-5 shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
          <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center text-red-400">
            <Clock size={20} />
          </div>
          <div>
            <span className="text-[10px] tracking-wider text-gray-500 uppercase">Pending Approvals</span>
            <h3 className="text-2xl font-bold text-white mt-1">{stats.pendingApprovals.toLocaleString()}</h3>
          </div>
        </div>

        {/* Stat 6: Month's Sign-ups */}
        <div className="bg-[#0b0b0b] border border-white/5 p-6 rounded-2xl flex items-center gap-5 shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
          <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center text-purple-400">
            <CalendarDays size={20} />
          </div>
          <div>
            <span className="text-[10px] tracking-wider text-gray-500 uppercase">This Month Sign-ups</span>
            <h3 className="text-2xl font-bold text-white mt-1">{stats.monthRegistrations.toLocaleString()}</h3>
          </div>
        </div>
      </div>

      {/* Visualizations Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 dashboard-charts-grid">
        {/* Registrations Timeline */}
        <div className="bg-[#0b0b0b] border border-white/5 p-6 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
          <div className="mb-4">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Registration Velocity</h4>
            <span className="text-[10px] text-gray-500 uppercase tracking-wide">Combined associate & school signups (Last 30 days)</span>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={registrationChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} />
                <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.05)', strokeWidth: 1 }} />
                <Line 
                  type="monotone" 
                  dataKey="Sign-ups" 
                  stroke="#d4af37" 
                  strokeWidth={2.5} 
                  dot={{ r: 3, fill: '#d4af37', strokeWidth: 0 }}
                  activeDot={{ r: 5, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Product Sales Distribution */}
        <div className="bg-[#0b0b0b] border border-white/5 p-6 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
          <div className="mb-4">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Merchandise Sales</h4>
            <span className="text-[10px] text-gray-500 uppercase tracking-wide">Quantity sold per catalog item</span>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={productChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="product" stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} />
                <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                <Bar 
                  dataKey="Quantity" 
                  fill="rgba(59, 130, 246, 0.85)" 
                  radius={[6, 6, 0, 0]}
                  maxBarSize={48}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Activity Timeline */}
      <div className="bg-[#0b0b0b] border border-white/5 p-6 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
        <div className="mb-6">
          <h4 className="text-sm font-bold text-white uppercase tracking-wider">Recent Operations Activity</h4>
          <span className="text-[10px] text-gray-500 uppercase tracking-wide">Merged activity feed across registrations, merchandise orders, and system logs</span>
        </div>
        
        {activities.length === 0 ? (
          <p className="text-xs text-gray-500 uppercase tracking-wider text-center py-6">No recent activity logged.</p>
        ) : (
          <div className="relative border-l border-white/5 ml-4 pl-6 space-y-6">
            {activities.map((act) => {
              // Icon selector
              let Icon = Activity
              let iconColor = 'text-purple-400'
              let iconBg = 'bg-purple-500/10 border-purple-500/20'

              if (act.type === 'associate') {
                Icon = User
                iconColor = 'text-amber-500'
                iconBg = 'bg-amber-500/10 border-amber-500/20'
              } else if (act.type === 'school') {
                Icon = GraduationCap
                iconColor = 'text-blue-400'
                iconBg = 'bg-blue-500/10 border-blue-500/20'
              } else if (act.type === 'order') {
                Icon = ShoppingBag
                iconColor = 'text-green-400'
                iconBg = 'bg-green-500/10 border-green-500/20'
              } else if (act.type === 'audit') {
                Icon = Shield
                iconColor = 'text-purple-400'
                iconBg = 'bg-purple-500/10 border-purple-500/20'
              }

              return (
                <div key={act.id} className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 bg-white/[0.01] border border-white/5 rounded-xl hover:bg-white/[0.02] transition-all">
                  {/* Timeline bullet dot wrapper */}
                  <span className={`absolute -left-[38px] top-4 sm:top-1/2 sm:-translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center border ${iconBg} ${iconColor}`}>
                    <Icon size={11} />
                  </span>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-white uppercase tracking-wide">
                        {act.title}
                      </span>
                      {act.status && (
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase border ${
                          act.status === 'approved' 
                            ? 'border-green-500/30 text-green-400 bg-green-500/5' 
                            : act.status === 'rejected'
                            ? 'border-red-500/30 text-red-400 bg-red-500/5'
                            : 'border-amber-500/30 text-amber-400 bg-amber-500/5'
                        }`}>
                          {act.status}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 leading-relaxed font-light">
                      {act.description}
                    </p>
                  </div>

                  <div className="text-[10px] text-gray-500 font-medium uppercase tracking-wider shrink-0">
                    {formatActivityTime(act.timestamp)}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
