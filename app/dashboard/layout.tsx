'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  LayoutDashboard, 
  Users, 
  UserCheck,
  Building2, 
  ShoppingBag, 
  BarChart3, 
  Mail, 
  MessageSquare, 
  TrendingUp,
  Settings,
  LogOut, 
  Search,
  Bell,
  Menu, 
  X,
  Lightbulb
} from 'lucide-react'
import { canAccess, AdminRole } from '@/lib/roles'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [profile, setProfile] = useState<{ name: string; role: string; email: string } | null>(null)
  
  // Notifications
  const [notifications, setNotifications] = useState<any[]>([])
  const [showNotifications, setShowNotifications] = useState(false)
  
  // Search
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<{members: any[], associates: any[], finance: any[]}>({ members: [], associates: [], finance: [] })
  const [showSearch, setShowSearch] = useState(false)

  const pathname = usePathname()
  const router = useRouter()

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, section: 'dashboard' },
    { name: 'Members', path: '/dashboard/members', icon: Users, section: 'dashboard' },
    { name: 'Associates', path: '/dashboard/associates', icon: UserCheck, section: 'associates' },
    { name: 'Schools', path: '/dashboard/schools', icon: Building2, section: 'schools' },
    { name: 'Finance', path: '/dashboard/finance', icon: BarChart3, section: 'finance' },
    { name: 'Orders', path: '/dashboard/orders', icon: ShoppingBag, section: 'orders' },
    { name: 'IdeaNet', path: '/dashboard/ideanet', icon: Lightbulb, section: 'ideanet' },
    { name: 'Newsletter', path: '/dashboard/newsletter', icon: Mail, section: 'newsletter' },
    { name: 'Analytics', path: '/dashboard/analytics', icon: TrendingUp, section: 'analytics' },
    { name: 'Contact', path: '/dashboard/contact', icon: MessageSquare, section: 'contact' },
    { name: 'Settings', path: '/dashboard/settings', icon: Settings, section: 'dashboard', isBottom: true }
  ]

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        window.location.href = '/'
      } else {
        const userMetadata = session.user.user_metadata
        const userRole = userMetadata?.role || 'board_member'
        setProfile({
          name: userMetadata?.name || 'Admin Board',
          role: userRole,
          email: session.user.email || ''
        })

        const currentPath = window.location.pathname
        const matchedItem = navItems.find(item => currentPath === item.path || currentPath.startsWith(item.path + '/'))
        if (matchedItem && !canAccess(userRole as AdminRole, matchedItem.section)) {
          if (canAccess(userRole as AdminRole, 'dashboard')) {
            router.push('/dashboard')
          } else {
            const allowedItem = navItems.find(item => canAccess(userRole as AdminRole, item.section))
            if (allowedItem) {
              router.push(allowedItem.path)
            } else {
              await supabase.auth.signOut()
              window.location.href = '/'
            }
          }
        }

        setLoading(false)
        fetchNotifications()
      }
    }
    checkSession()
  }, [pathname])

  const fetchNotifications = async () => {
    try {
      const newNotifs = []
      
      // Associates pending
      const { count: assocCount } = await supabase.from('associate_members').select('*', { count: 'exact', head: true }).eq('status', 'pending')
      if (assocCount && assocCount > 0) newNotifs.push({ type: 'associates', text: `${assocCount} new associate applications`, link: '/dashboard/associates' })
      
      // Schools pending
      const { count: schoolCount } = await supabase.from('school_registrations').select('*', { count: 'exact', head: true }).eq('status', 'pending')
      if (schoolCount && schoolCount > 0) newNotifs.push({ type: 'schools', text: `${schoolCount} new school registrations`, link: '/dashboard/schools' })
      
      // Orders pending
      const { count: orderCount } = await supabase.from('product_orders').select('*', { count: 'exact', head: true }).eq('payment_status', 'pending')
      if (orderCount && orderCount > 0) newNotifs.push({ type: 'orders', text: `${orderCount} orders pending payment verification`, link: '/dashboard/orders' })
      
      // Unread contact
      const { count: msgCount } = await supabase.from('contact_messages').select('*', { count: 'exact', head: true }).eq('read', false)
      if (msgCount && msgCount > 0) newNotifs.push({ type: 'messages', text: `${msgCount} unread messages`, link: '/dashboard/contact' })
      
      // Finance missing receipts
      const { count: finCount } = await supabase.from('finance_ledger').select('*', { count: 'exact', head: true }).eq('type', 'expense').gt('amount', 5000).is('bill_attachment_url', null)
      if (finCount && finCount > 0) newNotifs.push({ type: 'finance', text: `${finCount} expense entries missing receipts`, link: '/dashboard/finance' })
      
      setNotifications(newNotifs)
    } catch (e) {
      console.error(e)
    }
  }

  // Search effect
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults({ members: [], associates: [], finance: [] })
      return
    }
    const timer = setTimeout(async () => {
      try {
        const { data: members } = await supabase.from('aisca_members').select('id, full_name, membership_number').ilike('full_name', `%${searchQuery}%`).limit(4)
        const { data: associates } = await supabase.from('associate_members').select('id, full_name, school').ilike('full_name', `%${searchQuery}%`).limit(4)
        const { data: finance } = await supabase.from('finance_ledger').select('id, description, amount').ilike('description', `%${searchQuery}%`).limit(4)
        
        setSearchResults({
          members: members || [],
          associates: associates || [],
          finance: finance || []
        })
      } catch (e) {
        console.error(e)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#F5F5F5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#6B6B6B', fontSize: '14px' }}>Loading...</p>
      </div>
    )
  }

  const formatRole = (role: string) => {
    return role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  }

  const topNavItems = navItems.filter(i => !i.isBottom)
  const bottomNavItems = navItems.filter(i => i.isBottom)

  const currentPageName = navItems.find(i => pathname === i.path || (pathname.startsWith(i.path) && i.path !== '/dashboard'))?.name || 'Dashboard'

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F5F5F5', color: '#111111' }}>
      
      <style jsx global>{`
        .nav-link:hover {
          background: #F5F5F5 !important;
        }
        .nav-link.active {
          background: #111111 !important;
          color: #ffffff !important;
        }
        .logout-btn:hover {
          background: #F5F5F5 !important;
        }
        @media (max-width: 1024px) {
          .mobile-close-btn { display: flex !important; }
          .admin-sidebar {
            left: -220px;
            transition: left 0.3s ease;
          }
          .admin-sidebar.open {
            left: 0 !important;
          }
          .admin-main-content {
            margin-left: 0 !important;
          }
        }
      `}</style>

      {/* Sidebar */}
      <div
        className={`admin-sidebar${sidebarOpen ? ' open' : ''}`}
        style={{
          width: '220px',
          position: 'fixed',
          top: 0,
          left: 0,
          height: '100vh',
          background: '#FFFFFF',
          borderRight: '1px solid #E8E8E8',
          zIndex: 999,
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div style={{ padding: '24px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <img src="/original-logo.png" alt="AISCA" style={{ width: '120px', filter: 'brightness(0)' }} />
          <button 
            onClick={() => setSidebarOpen(false)}
            className="mobile-close-btn"
            style={{ display: 'none', background: 'none', border: 'none', color: '#111111' }}
          >
            <X size={20} />
          </button>
        </div>

        <nav style={{ flex: 1, padding: '0 12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {topNavItems.filter(item => profile && canAccess(profile.role as AdminRole, item.section)).map(item => {
            const isActive = pathname === item.path || (pathname.startsWith(item.path) && item.path !== '/dashboard')
            const Icon = item.icon
            return (
              <Link
                key={item.path}
                href={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`nav-link ${isActive ? 'active' : ''}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px', padding: '0 12px', height: '40px',
                  borderRadius: '8px', color: isActive ? '#ffffff' : '#6B6B6B',
                  fontSize: '14px', fontWeight: isActive ? '500' : '500', textDecoration: 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <Icon size={18} />
                <span>{item.name}</span>
              </Link>
            )
          })}
        </nav>

        <div style={{ padding: '12px', borderTop: '1px solid #E8E8E8', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {bottomNavItems.filter(item => profile && canAccess(profile.role as AdminRole, item.section)).map(item => {
            const isActive = pathname === item.path
            const Icon = item.icon
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`nav-link ${isActive ? 'active' : ''}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px', padding: '0 12px', height: '40px',
                  borderRadius: '8px', color: isActive ? '#ffffff' : '#6B6B6B',
                  fontSize: '14px', fontWeight: '500', textDecoration: 'none'
                }}
              >
                <Icon size={18} />
                <span>{item.name}</span>
              </Link>
            )
          })}
          <button
            onClick={handleSignOut}
            className="logout-btn"
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '0 12px', height: '40px',
              borderRadius: '8px', background: 'transparent', border: 'none', color: '#EF4444',
              fontSize: '14px', fontWeight: '500', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s ease'
            }}
          >
            <LogOut size={18} />
            <span>Log out</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="admin-main-content" style={{ marginLeft: '220px', flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        
        {/* Top Header Bar */}
        <header style={{
          height: '64px', background: '#FFFFFF', borderBottom: '1px solid #E8E8E8',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px',
          position: 'sticky', top: 0, zIndex: 90
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button className="mobile-close-btn" onClick={() => setSidebarOpen(true)} style={{ display: 'none', background: 'none', border: 'none' }}>
              <Menu size={24} color="#111111" />
            </button>
            <h1 style={{ fontSize: '20px', fontWeight: '600', color: '#111111', margin: 0 }}>{currentPageName}</h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            {/* Search Bar */}
            <div style={{ position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', background: '#F5F5F5', borderRadius: '8px', padding: '0 12px', width: '280px', height: '36px' }}>
                <Search size={16} color="#6B6B6B" />
                <input 
                  type="text" 
                  placeholder="Search..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setShowSearch(true)}
                  onBlur={() => setTimeout(() => setShowSearch(false), 200)}
                  style={{ background: 'transparent', border: 'none', outline: 'none', marginLeft: '8px', fontSize: '14px', width: '100%', color: '#111111' }}
                />
              </div>
              
              {showSearch && searchQuery.length >= 2 && (
                <div style={{ position: 'absolute', top: '44px', left: 0, width: '100%', background: '#FFFFFF', border: '1px solid #E8E8E8', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', padding: '8px 0', zIndex: 100, maxHeight: '400px', overflowY: 'auto' }}>
                  {searchResults.members.length === 0 && searchResults.associates.length === 0 && searchResults.finance.length === 0 ? (
                    <div style={{ padding: '8px 16px', fontSize: '13px', color: '#6B6B6B' }}>No results found</div>
                  ) : (
                    <>
                      {searchResults.members.length > 0 && (
                        <div style={{ marginBottom: '8px' }}>
                          <div style={{ padding: '4px 16px', fontSize: '11px', textTransform: 'uppercase', color: '#6B6B6B', fontWeight: '600' }}>Members</div>
                          {searchResults.members.map(m => (
                            <Link key={m.id} href={`/dashboard/members`} style={{ display: 'block', padding: '8px 16px', fontSize: '13px', color: '#111111', textDecoration: 'none' }} className="nav-link">
                              {m.full_name} <span style={{ color: '#6B6B6B', fontSize: '11px' }}>({m.membership_number})</span>
                            </Link>
                          ))}
                        </div>
                      )}
                      {searchResults.associates.length > 0 && (
                        <div style={{ marginBottom: '8px' }}>
                          <div style={{ padding: '4px 16px', fontSize: '11px', textTransform: 'uppercase', color: '#6B6B6B', fontWeight: '600' }}>Associates</div>
                          {searchResults.associates.map(a => (
                            <Link key={a.id} href={`/dashboard/associates`} style={{ display: 'block', padding: '8px 16px', fontSize: '13px', color: '#111111', textDecoration: 'none' }} className="nav-link">
                              {a.full_name} <span style={{ color: '#6B6B6B', fontSize: '11px' }}>({a.school})</span>
                            </Link>
                          ))}
                        </div>
                      )}
                      {searchResults.finance.length > 0 && (
                        <div>
                          <div style={{ padding: '4px 16px', fontSize: '11px', textTransform: 'uppercase', color: '#6B6B6B', fontWeight: '600' }}>Finance</div>
                          {searchResults.finance.map(f => (
                            <Link key={f.id} href={`/dashboard/finance`} style={{ display: 'block', padding: '8px 16px', fontSize: '13px', color: '#111111', textDecoration: 'none' }} className="nav-link">
                              {f.description} <span style={{ color: '#6B6B6B', fontSize: '11px' }}>({f.amount})</span>
                            </Link>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Notification Bell */}
            <div style={{ position: 'relative' }}>
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                style={{ background: '#F5F5F5', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative' }}
              >
                <Bell size={18} color="#6B6B6B" />
                {notifications.length > 0 && (
                  <span style={{ position: 'absolute', top: 0, right: 0, background: '#EF4444', color: '#fff', fontSize: '10px', width: '16px', height: '16px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                    {notifications.length}
                  </span>
                )}
              </button>
              
              {showNotifications && (
                <div style={{ position: 'absolute', top: '44px', right: 0, width: '300px', background: '#FFFFFF', border: '1px solid #E8E8E8', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', zIndex: 100, overflow: 'hidden' }}>
                  <div style={{ padding: '16px', borderBottom: '1px solid #E8E8E8', fontWeight: '600', fontSize: '14px' }}>Notifications</div>
                  <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {notifications.length === 0 ? (
                      <div style={{ padding: '24px', textAlign: 'center', color: '#6B6B6B', fontSize: '13px' }}>No new notifications</div>
                    ) : (
                      notifications.map((n, i) => (
                        <Link key={i} href={n.link} onClick={() => setShowNotifications(false)} style={{ display: 'block', padding: '16px', borderBottom: '1px solid #F5F5F5', textDecoration: 'none', color: '#111111', fontSize: '13px' }} className="nav-link">
                          {n.text}
                        </Link>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Avatar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="hidden md:block text-right">
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#111111' }}>{profile?.name}</div>
                <div style={{ fontSize: '11px', color: '#6B6B6B', textTransform: 'capitalize' }}>{profile ? formatRole(profile.role) : ''}</div>
              </div>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#111111', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '600' }}>
                {profile?.name?.substring(0, 2).toUpperCase() || 'AD'}
              </div>
            </div>
          </div>
        </header>

        <main style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
            {children}
          </div>
        </main>
      </div>

      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 998 }} />
      )}
    </div>
  )
}
