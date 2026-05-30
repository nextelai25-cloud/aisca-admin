'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  LayoutDashboard, 
  Users, 
  GraduationCap, 
  ShoppingBag, 
  CircleDollarSign, 
  Mail, 
  MessageSquare, 
  BarChart3,
  Settings,
  LogOut, 
  Menu, 
  X 
} from 'lucide-react'
import { getUnreadContactMessagesCount } from './contact/actions'
import { canAccess, AdminRole } from '@/lib/roles'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [profile, setProfile] = useState<{ name: string; role: string; email: string } | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const pathname = usePathname()
  const router = useRouter()

  const navItems = [
    { name: 'Overview', path: '/dashboard', icon: LayoutDashboard, section: 'dashboard' },
    { name: 'Members Database', path: '/dashboard/members', icon: Users, section: 'dashboard' },
    { name: 'Associates Registry', path: '/dashboard/associates', icon: Users, section: 'associates' },
    { name: 'Schools Registry', path: '/dashboard/schools', icon: GraduationCap, section: 'schools' },
    { name: 'Product Orders', path: '/dashboard/orders', icon: ShoppingBag, section: 'orders' },
    { name: 'Finance Ledger', path: '/dashboard/finance', icon: CircleDollarSign, section: 'finance' },
    { name: 'Newsletter Hub', path: '/dashboard/newsletter', icon: Mail, section: 'newsletter' },
    { name: 'Contact Messages', path: '/dashboard/contact', icon: MessageSquare, badge: unreadCount, section: 'contact' },
    { name: 'Site Analytics', path: '/dashboard/analytics', icon: BarChart3, section: 'analytics' },
    { name: 'Settings', path: '/dashboard/settings', icon: Settings, section: 'dashboard' }
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

        // Enforce route permission checks dynamically
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
        
        // Fetch unread count
        const count = await getUnreadContactMessagesCount()
        setUnreadCount(count)
      }
    }
    checkSession()
  }, [pathname])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#080808',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', letterSpacing: '0.1em' }}>
            LOADING...
          </p>
        </div>
      </div>
    )
  }

  const formatRole = (role: string) => {
    return role
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase())
  }

  const sidebarContent = (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: '#0c0c0c',
      borderRight: '1px solid rgba(255,255,255,0.06)',
      boxSizing: 'border-box'
    }}>
      {/* Brand Header */}
      <div style={{
        padding: '24px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div>
          <img
            src="/original-logo.png"
            alt="AISCA"
            style={{ width: '100%', maxWidth: '140px', height: 'auto', objectFit: 'contain', marginBottom: '8px', display: 'block' }}
          />
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '9px', letterSpacing: '0.15em', margin: 0, textTransform: 'uppercase' }}>
            Operations Panel
          </p>
        </div>
        {/* Mobile Close Button */}
        <button 
          onClick={() => setSidebarOpen(false)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'rgba(255,255,255,0.4)',
            cursor: 'pointer',
            padding: '4px',
            display: 'none' // hidden on desktop via CSS wrapper
          }}
          className="mobile-close-btn"
        >
          <X size={18} />
        </button>
      </div>

      {/* Admin Profile Details */}
      {profile && (
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(255,255,255,0.01)'
        }}>
          <h4 style={{ color: 'rgba(255,255,255,0.9)', fontSize: '13px', fontWeight: '600', margin: '0 0 6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {profile.name}
          </h4>
          <span style={{
            display: 'inline-block',
            fontSize: '9px',
            fontWeight: '700',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#d4af37',
            background: 'rgba(212,175,55,0.08)',
            border: '1px solid rgba(212,175,55,0.2)',
            padding: '3px 8px',
            borderRadius: '4px'
          }}>
            {formatRole(profile.role)}
          </span>
        </div>
      )}

      {/* Navigation list */}
      <nav style={{
        flex: 1,
        padding: '24px 16px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px'
      }}>
        {navItems.filter(item => profile && canAccess(profile.role as AdminRole, item.section)).map(item => {
          const isActive = pathname === item.path
          const Icon = item.icon
          return (
            <Link
              key={item.path}
              href={item.path}
              onClick={() => setSidebarOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                borderRadius: '10px',
                color: isActive ? '#ffffff' : 'rgba(255,255,255,0.45)',
                background: isActive ? 'rgba(255,255,255,0.05)' : 'transparent',
                border: isActive ? '1px solid rgba(255,255,255,0.04)' : '1px solid transparent',
                fontSize: '13px',
                fontWeight: isActive ? '600' : '500',
                textDecoration: 'none',
                transition: 'all 0.15s ease'
              }}
              className="nav-link"
            >
              <Icon size={16} style={{ color: isActive ? '#d4af37' : 'inherit' }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <span>{item.name}</span>
                {item.badge ? (
                  <span style={{
                    background: '#ff4d4d',
                    color: '#ffffff',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    padding: '2px 6px',
                    borderRadius: '10px',
                    marginLeft: '8px'
                  }}>
                    {item.badge}
                  </span>
                ) : null}
              </div>
            </Link>
          )
        })}
      </nav>

      {/* Logout Row */}
      <div style={{
        padding: '16px',
        borderTop: '1px solid rgba(255,255,255,0.06)'
      }}>
        <button
          onClick={handleSignOut}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 16px',
            borderRadius: '10px',
            background: 'transparent',
            border: 'none',
            color: 'rgba(255,50,50,0.55)',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all 0.15s ease'
          }}
          className="logout-btn"
        >
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#080808', color: '#ffffff' }}>
      
      {/* 1. Global CSS Styles injected dynamically */}
      <style jsx global>{`
        .nav-link:hover {
          color: #ffffff !important;
          background: rgba(255,255,255,0.02) !important;
        }
        .logout-btn:hover {
          color: #ff4d4d !important;
          background: rgba(255,50,50,0.04) !important;
        }
        @media (max-width: 1024px) {
          .mobile-close-btn {
            display: flex !important;
          }
        }
      `}</style>

      {/* Mobile header */}
      <div
        className="admin-mobile-header"
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
          background: '#0a0a0a', borderBottom: '1px solid rgba(255,255,255,0.08)',
          padding: '12px 20px',
          alignItems: 'center', justifyContent: 'space-between',
          display: 'none' // overridden by CSS on mobile
        }}
      >
        <img src="https://aisca.lk/aisca-logo.webp" alt="AISCA" style={{ height: '32px', width: 'auto' }} />
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px', color: '#fff',
            width: '40px', height: '40px',
            cursor: 'pointer', fontSize: '18px',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
        >
          {sidebarOpen ? '×' : '☰'}
        </button>
      </div>

      {/* Overlay */}
      <div
        className={`admin-overlay ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(false)}
        style={{ display: sidebarOpen ? 'block' : 'none' }}
      />

      {/* Sidebar */}
      <div
        className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}
        style={{
          width: '240px',
          position: 'fixed',
          top: 0,
          bottom: 0,
          left: 0,
          zIndex: 999,
          height: '100vh',
          boxSizing: 'border-box'
        }}
      >
        {sidebarContent}
      </div>

      {/* Main Content Wrapper */}
      <div
        className="admin-main-content"
        style={{
          marginLeft: '240px',
          minHeight: '100vh',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0
        }}
      >
        {/* Add padding for mobile header */}
        <div style={{ paddingTop: '0' }} className="mobile-content-pad" />
        
        {/* Content Body Container */}
        <main style={{
          flex: 1,
          padding: '40px 24px 80px',
          overflowY: 'auto',
          boxSizing: 'border-box'
        }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
            {children}
          </div>
        </main>
      </div>

    </div>
  )
}

