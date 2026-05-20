'use client'

import React, { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { canAccess, AdminRole } from '@/lib/roles'
import { 
  BarChart3, 
  Users, 
  GraduationCap, 
  ShoppingBag, 
  CircleDollarSign, 
  TrendingUp, 
  LogOut,
  Menu,
  X,
  Mail,
  MessageSquare
} from 'lucide-react'

const navigationItems = [
  { name: 'Overview', path: '/dashboard', section: 'dashboard', icon: BarChart3 },
  { name: 'Associates', path: '/dashboard/associates', section: 'associates', icon: Users },
  { name: 'Schools', path: '/dashboard/schools', section: 'schools', icon: GraduationCap },
  { name: 'Orders', path: '/dashboard/orders', section: 'orders', icon: ShoppingBag },
  { name: 'Finance Ledger', path: '/dashboard/finance', section: 'finance', icon: CircleDollarSign },
  { name: 'Analytics', path: '/dashboard/analytics', section: 'analytics', icon: TrendingUp },
  { name: 'Newsletter', path: '/dashboard/newsletter', section: 'newsletter', icon: Mail },
  { name: 'Contact Messages', path: '/dashboard/contact', section: 'contact', icon: MessageSquare },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [adminUser, setAdminUser] = useState<any>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    async function fetchAdminDetails() {
      try {
        const { data: { user }, error: authErr } = await supabase.auth.getUser()
        
        if (authErr || !user) {
          router.push('/')
          return
        }

        // Fetch custom role details
        const { data: profile, error: dbErr } = await supabase
          .from('admin_users')
          .select('*')
          .eq('email', user.email)
          .single()

        if (dbErr || !profile) {
          console.error("Admin profile verification failed:", dbErr?.message)
          await supabase.auth.signOut()
          router.push('/')
          return
        }

        setAdminUser(profile)
      } catch (err) {
        console.error("Auth initialization error:", err)
        router.push('/')
      } finally {
        setLoading(false)
      }
    }

    fetchAdminDetails()
  }, [router])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-t-2 border-r-2 border-[#d4af37] rounded-full animate-spin"></div>
          <span className="text-sm tracking-widest text-gray-500 uppercase">Verifying Board Credentials...</span>
        </div>
      </div>
    )
  }

  // Double security: check if current route is allowed for the user
  const currentItem = navigationItems.find(item => item.path === pathname)
  if (currentItem && adminUser && !canAccess(adminUser.role as AdminRole, currentItem.section)) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="text-red-500 text-5xl mb-4">⚠️</div>
        <h1 className="text-2xl font-bold uppercase tracking-wider mb-2">Access Denied</h1>
        <p className="text-gray-400 max-w-md text-sm mb-6">
          Your role as <span className="text-[#d4af37] font-semibold uppercase">{adminUser.role.replace('_', ' ')}</span> does not have permissions to access this department.
        </p>
        <button
          onClick={() => router.push('/dashboard')}
          className="px-6 py-2 bg-white text-black font-semibold rounded-full hover:bg-gray-200 transition-all text-xs"
        >
          Return to Overview
        </button>
      </div>
    )
  }

  const roleLabelMap: Record<AdminRole, string> = {
    chairman: 'Chairman',
    deputy_chairman: 'Deputy Chairman',
    cfo: 'Chief Financial Officer',
    marketing_manager: 'Marketing Manager',
    co_secretary: 'Co-Secretary'
  }

  const allowedNav = navigationItems.filter(item => 
    adminUser && canAccess(adminUser.role as AdminRole, item.section)
  )

  const sidebarContent = (
    <div className="h-full flex flex-col justify-between bg-[#0b0b0b] border-r border-white/5 p-6">
      <div>
        {/* Brand Name */}
        <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/5">
          <div>
            <h2 className="text-xl font-bold tracking-widest text-white">AI$CA</h2>
            <span className="text-[9px] tracking-[0.2em] text-gray-500 uppercase">Board Administration</span>
          </div>
          <button 
            className="md:hidden text-gray-400 hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        {/* Dynamic Sidebar Links */}
        <nav className="space-y-1">
          {allowedNav.map((item) => {
            const Icon = item.icon
            const active = pathname === item.path
            return (
              <a
                key={item.name}
                href={item.path}
                onClick={(e) => {
                  e.preventDefault()
                  router.push(item.path)
                  setSidebarOpen(false)
                }}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide uppercase transition-all duration-300 ${
                  active 
                    ? 'bg-white/5 border border-white/10 text-white shadow-[0_0_15px_rgba(255,255,255,0.02)]' 
                    : 'text-gray-500 hover:text-white hover:bg-white/[0.02]'
                }`}
              >
                <Icon size={16} className={active ? 'text-[#d4af37]' : 'text-gray-500'} />
                <span>{item.name}</span>
              </a>
            )
          })}
        </nav>
      </div>

      {/* User profile & Role Badge */}
      {adminUser && (
        <div className="pt-6 border-t border-white/5 flex flex-col gap-4">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-white tracking-wide truncate">{adminUser.full_name}</span>
            <span className="text-[10px] text-gray-500 truncate mb-2">{adminUser.email}</span>
            <div className="inline-flex self-start px-2 py-0.5 rounded border border-[#d4af37]/30 bg-[#d4af37]/5 text-[9px] font-bold text-[#d4af37] tracking-wider uppercase">
              {roleLabelMap[adminUser.role as AdminRole] || adminUser.role}
            </div>
          </div>

          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 text-xs font-semibold tracking-wider text-red-500 hover:text-red-400 transition-all uppercase"
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </div>
  )

  return (
    <div className="min-h-screen bg-[#050505] text-white flex font-sans">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:block w-[260px] flex-shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Drawer Container */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-[260px] transform transition-transform duration-300 md:hidden ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {sidebarContent}
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-x-hidden">
        {/* Mobile Header */}
        <header className="md:hidden h-16 border-b border-white/5 bg-[#0b0b0b] px-6 flex items-center justify-between z-30">
          <div>
            <h2 className="text-lg font-bold tracking-widest text-white">AI$CA</h2>
            <span className="text-[8px] tracking-[0.2em] text-gray-500 uppercase">Board Admin</span>
          </div>
          <button 
            onClick={() => setSidebarOpen(true)}
            className="text-gray-400 hover:text-white"
          >
            <Menu size={20} />
          </button>
        </header>

        {/* Child Views */}
        <main className="p-6 md:p-10 max-w-[1400px] w-full mx-auto relative z-10 flex-1">
          {children}
        </main>
      </div>
    </div>
  )
}
